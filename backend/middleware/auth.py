# backend/middleware/auth.py
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
import json
from typing import Optional

# Initialize Firebase Admin SDK
def initialize_firebase():
    if not firebase_admin._apps:
        cred = None

        # 1. Check for file in project root
        if os.path.exists("firebase-service-account.json"):
            cred = credentials.Certificate("firebase-service-account.json")

        # 2. Check for path set in environment variable
        elif os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"):
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
            else:
                raise Exception(f"Service account file not found at {service_account_path}")

        # 3. Check for JSON string stored in env
        elif os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
            service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
            service_account_info = json.loads(service_account_key)
            cred = credentials.Certificate(service_account_info)

        else:
            raise Exception(
                "Firebase credentials not found. Please provide one of:\n"
                "- firebase-service-account.json in root\n"
                "- FIREBASE_SERVICE_ACCOUNT_PATH environment variable\n"
                "- FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
            )

        firebase_admin.initialize_app(cred)


# Initialize Firebase when module is imported
initialize_firebase()

security = HTTPBearer()

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Firebase ID token and return user information
    """
    try:
        # Extract the token from Bearer authorization
        token = credentials.credentials
        
        # Verify the token with Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "token": decoded_token
        }
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(user_data: dict = Depends(verify_firebase_token)) -> dict:
    """
    Get current authenticated user data
    """
    return user_data

# Optional: Create a dependency for verified email users only
async def get_verified_user(user_data: dict = Depends(get_current_user)) -> dict:
    """
    Get current user but require email verification
    """
    if not user_data.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this resource."
        )
    return user_data