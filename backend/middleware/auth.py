# backend/middleware/auth.py
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
import json
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    if not firebase_admin._apps:
        cred = None

        # 1. Check for file in project root
        if os.path.exists("firebase-service-account.json"):
            cred = credentials.Certificate("firebase-service-account.json")
            logger.info("Using Firebase credentials from firebase-service-account.json")

        # 2. Check for path set in environment variable
        elif os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"):
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                logger.info(f"Using Firebase credentials from {service_account_path}")
            else:
                raise Exception(f"Service account file not found at {service_account_path}")

        # 3. Check for JSON string stored in env
        elif os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
            service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
            service_account_info = json.loads(service_account_key)
            cred = credentials.Certificate(service_account_info)
            logger.info("Using Firebase credentials from environment variable")

        else:
            raise Exception(
                "Firebase credentials not found. Please provide one of:\n"
                "- firebase-service-account.json in root\n"
                "- FIREBASE_SERVICE_ACCOUNT_PATH environment variable\n"
                "- FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
            )

        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")

# Initialize Firebase when module is imported
try:
    initialize_firebase()
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {e}")
    raise e

security = HTTPBearer()

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify Firebase ID token and return user information
    """
    try:
        # Extract the token from Bearer authorization
        token = credentials.credentials
        
        # Verify the token with Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        
        user_info = {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "firebase_claims": decoded_token.get("firebase", {}),
            "auth_time": decoded_token.get("auth_time"),
            "token": decoded_token
        }
        
        logger.info(f"Successfully verified token for user: {user_info['uid']}")
        return user_info
        
    except auth.ExpiredIdTokenError:
        logger.warning("Expired token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        logger.warning("Invalid token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.RevokedIdTokenError:
        logger.warning("Revoked token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(user_data: Dict[str, Any] = Depends(verify_firebase_token)) -> Dict[str, Any]:
    """
    Get current authenticated user data with enhanced information
    """
    return {
        "id": user_data["uid"],  # For backward compatibility
        "uid": user_data["uid"],
        "email": user_data["email"],
        "email_verified": user_data["email_verified"],
        "name": user_data.get("name"),
        "picture": user_data.get("picture"),
        "auth_time": user_data.get("auth_time"),
        "token_data": user_data["token"]
    }

# Optional: Create a dependency for verified email users only
async def get_verified_user(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get current user but require email verification
    """
    if not user_data.get("email_verified", False):
        logger.warning(f"Unverified user attempted access: {user_data.get('email')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this resource."
        )
    return user_data

# Optional: Create a dependency for admin users
async def get_admin_user(user_data: Dict[str, Any] = Depends(get_verified_user)) -> Dict[str, Any]:
    """
    Get current user but require admin privileges
    """
    try:
        # Check if user has admin custom claims
        firebase_claims = user_data.get("token_data", {}).get("firebase", {})
        custom_claims = firebase_claims.get("identities", {})
        
        # You can implement your admin logic here
        # For now, we'll check if user email is in admin list (you should store this securely)
        admin_emails = os.getenv("ADMIN_EMAILS", "").split(",")
        
        if user_data.get("email") not in admin_emails:
            logger.warning(f"Non-admin user attempted admin access: {user_data.get('email')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required."
            )
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking admin privileges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unable to verify admin privileges."
        )

# Utility function to get user from token without raising exceptions
async def get_user_if_authenticated(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """
    Get user information if token is provided and valid, otherwise return None
    This is useful for optional authentication endpoints
    """
    if not credentials:
        return None
    
    try:
        return await verify_firebase_token(credentials)
    except HTTPException:
        return None
    except Exception:
        return None

# Enhanced user context function
async def get_user_context(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get enhanced user context including Firebase custom claims and metadata
    """
    try:
        # Get additional user data from Firebase Auth
        firebase_user = auth.get_user(user_data["uid"])
        
        return {
            **user_data,
            "created_at": firebase_user.user_metadata.creation_timestamp if firebase_user.user_metadata else None,
            "last_sign_in": firebase_user.user_metadata.last_sign_in_timestamp if firebase_user.user_metadata else None,
            "custom_claims": firebase_user.custom_claims or {},
            "disabled": firebase_user.disabled,
            "provider_data": [
                {
                    "provider_id": provider.provider_id,
                    "uid": provider.uid,
                    "email": provider.email,
                    "display_name": provider.display_name
                }
                for provider in firebase_user.provider_data
            ]
        }
    except Exception as e:
        logger.error(f"Error getting user context: {str(e)}")
        # Return basic user data if enhanced context fails
        return user_data

# Rate limiting decorator (basic implementation)
class RateLimiter:
    def __init__(self, max_requests: int = 100, window_minutes: int = 60):
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        self.requests = {}
    
    def is_allowed(self, user_id: str) -> bool:
        import time
        current_time = time.time()
        window_start = current_time - (self.window_minutes * 60)
        
        if user_id not in self.requests:
            self.requests[user_id] = []
        
        # Clean old requests
        self.requests[user_id] = [
            req_time for req_time in self.requests[user_id] 
            if req_time > window_start
        ]
        
        # Check if under limit
        if len(self.requests[user_id]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[user_id].append(current_time)
        return True

# Global rate limiter instance
rate_limiter = RateLimiter()

async def check_rate_limit(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Check if user is within rate limits
    """
    user_id = user_data["uid"]
    
    if not rate_limiter.is_allowed(user_id):
        logger.warning(f"Rate limit exceeded for user: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    return user_data

# Error response helper
def create_auth_error_response(detail: str, status_code: int = 401) -> HTTPException:
    """
    Create consistent authentication error responses
    """
    return HTTPException(
        status_code=status_code,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"} if status_code == 401 else None
    )