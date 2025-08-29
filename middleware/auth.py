# backend/middleware/auth.py
from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import json
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with multiple credential sources"""
    if not firebase_admin._apps:
        cred = None
        
        try:
            # 1. Check for service account file in project root
            if os.path.exists("firebase-service-account.json"):
                logger.info("Using Firebase credentials from firebase-service-account.json")
                cred = credentials.Certificate("firebase-service-account.json")

            # 2. Check for path in environment variable
            elif os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"):
                service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
                if os.path.exists(service_account_path):
                    logger.info(f"Using Firebase credentials from {service_account_path}")
                    cred = credentials.Certificate(service_account_path)
                else:
                    raise Exception(f"Service account file not found at {service_account_path}")

            # 3. Check for JSON string in environment variable
            elif os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
                logger.info("Using Firebase credentials from environment variable")
                service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
                service_account_info = json.loads(service_account_key)
                cred = credentials.Certificate(service_account_info)

            # 4. Try default Application Default Credentials (for deployed environments)
            else:
                logger.info("Attempting to use Application Default Credentials")
                try:
                    cred = credentials.ApplicationDefault()
                except Exception as e:
                    raise Exception(
                        "Firebase credentials not found. Please provide one of:\n"
                        "- firebase-service-account.json in project root\n"
                        "- FIREBASE_SERVICE_ACCOUNT_PATH environment variable\n"
                        "- FIREBASE_SERVICE_ACCOUNT_KEY environment variable\n"
                        f"Error details: {str(e)}"
                    )

            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            raise

# Initialize Firebase when module is imported
try:
    initialize_firebase()
except Exception as e:
    logger.error(f"Firebase initialization failed: {e}")
    # In development, you might want to continue without Firebase
    # In production, this should probably fail hard

security = HTTPBearer(auto_error=False)  # auto_error=False allows optional auth

def get_firestore_db():
    """Get Firestore database instance"""
    try:
        return firestore.client()
    except Exception as e:
        logger.error(f"Failed to get Firestore client: {e}")
        return None

async def verify_firebase_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token and return user information.
    Returns None if no token provided or token is invalid.
    """
    if not credentials:
        return None
        
    try:
        # Extract the token from Bearer authorization
        token = credentials.credentials
        
        # Verify the token with Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        
        user_data = {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "firebase_token": decoded_token
        }
        
        logger.info(f"Successfully verified token for user: {user_data['uid']}")
        return user_data
        
    except auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        logger.warning("Invalid Firebase ID token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.UserDisabledError:
        logger.warning("Disabled user attempted to authenticate")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account has been disabled.",
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
    Get current authenticated user data.
    Raises 401 if no user is authenticated.
    """
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_data

async def get_verified_user(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get current user but require email verification.
    Raises 403 if email is not verified.
    """
    if not user_data.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this resource."
        )
    return user_data

async def get_optional_user(user_data: Optional[Dict[str, Any]] = Depends(verify_firebase_token)) -> Optional[Dict[str, Any]]:
    """
    Get current user data if authenticated, otherwise return None.
    Does not raise exceptions for unauthenticated requests.
    """
    return user_data

# Firestore helper functions for user management
async def create_user_profile(uid: str, email: str, display_name: str = None) -> bool:
    """Create user profile in Firestore"""
    try:
        db = get_firestore_db()
        if not db:
            return False
            
        user_profile = {
            "uid": uid,
            "email": email,
            "displayName": display_name or "",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "lastLogin": firestore.SERVER_TIMESTAMP,
            "profileCompleted": False,
            "resumeId": None,
            "resumeInfo": None
        }
        
        db.collection("users").document(uid).set(user_profile)
        logger.info(f"Created user profile for: {uid}")
        return True
        
    except Exception as e:
        logger.error(f"Error creating user profile: {e}")
        return False

async def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    """Get user profile from Firestore"""
    try:
        db = get_firestore_db()
        if not db:
            return None
            
        doc_ref = db.collection("users").document(uid)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
        
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return None

async def update_user_profile(uid: str, updates: Dict[str, Any]) -> bool:
    """Update user profile in Firestore"""
    try:
        db = get_firestore_db()
        if not db:
            return False
            
        # Add lastUpdated timestamp
        updates["lastUpdated"] = firestore.SERVER_TIMESTAMP
        
        db.collection("users").document(uid).update(updates)
        logger.info(f"Updated user profile for: {uid}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return False

async def update_last_login(uid: str) -> bool:
    """Update user's last login timestamp"""
    try:
        return await update_user_profile(uid, {"lastLogin": firestore.SERVER_TIMESTAMP})
    except Exception as e:
        logger.error(f"Error updating last login: {e}")
        return False

# Role-based access control (if needed later)
ADMIN_ROLES = ["admin", "super_admin"]
MODERATOR_ROLES = ["moderator"] + ADMIN_ROLES

async def require_role(required_roles: list, user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require user to have specific role(s)"""
    user_profile = await get_user_profile(user_data["uid"])
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    user_role = user_profile.get("role", "user")
    
    if user_role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {required_roles}"
        )
    
    return user_data

async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require admin role"""
    return await require_role(ADMIN_ROLES, user_data)

async def require_moderator(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require moderator role or higher"""
    return await require_role(MODERATOR_ROLES, user_data)

# Rate limiting helper (basic implementation)
from collections import defaultdict
import time

# Simple in-memory rate limiter (use Redis in production)
rate_limit_store = defaultdict(list)

async def rate_limit_check(
    request: Request,
    limit: int = 100,  # requests
    window: int = 3600,  # seconds (1 hour)
    user_data: Optional[Dict[str, Any]] = Depends(get_optional_user)
) -> bool:
    """Basic rate limiting by IP or user"""
    # Use user ID if authenticated, otherwise use IP
    identifier = user_data["uid"] if user_data else request.client.host
    current_time = time.time()
    
    # Clean old entries
    rate_limit_store[identifier] = [
        timestamp for timestamp in rate_limit_store[identifier]
        if current_time - timestamp < window
    ]
    
    # Check if limit exceeded
    if len(rate_limit_store[identifier]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {limit} requests per {window} seconds."
        )
    
    # Add current request
    rate_limit_store[identifier].append(current_time)
    return True

# Custom exception handlers for auth errors
def setup_auth_exception_handlers(app):
    """Setup custom exception handlers for authentication errors"""
    
    @app.exception_handler(HTTPException)
    async def auth_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code == 401:
            return {
                "error": "Authentication required",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        elif exc.status_code == 403:
            return {
                "error": "Access forbidden",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        raise exc