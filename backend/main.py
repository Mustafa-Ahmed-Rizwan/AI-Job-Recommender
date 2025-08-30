# backend/main.py - FastAPI Backend
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uuid
import json
from datetime import datetime
import asyncio
import logging

# Import your existing modules
from backend.src.resume_processor import ResumeProcessor
from backend.src.skill_analyzer import SkillGapAnalyzer
from backend.src.job_api import fetch_jobs
from backend.middleware.auth import get_current_user, get_verified_user

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Job Recommender API",
    description="Backend API for AI-powered job recommendations and skill gap analysis",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processors globally
resume_processor = None
skill_analyzer = None

CITIES = {
    "Pakistan": ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Hyderabad", "Peshawar", "Quetta", "Sialkot"],
    "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"],
    "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"]
}

@app.on_event("startup")
async def startup_event():
    """Initialize processors on startup"""
    global resume_processor, skill_analyzer
    try:
        resume_processor = ResumeProcessor()
        skill_analyzer = SkillGapAnalyzer()
        logger.info("Processors initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize processors: {e}")
        raise e

# Pydantic models for request/response
class JobSearchRequest(BaseModel):
    job_query: str
    location: str = "Pakistan"
    num_jobs: int = 20

class JobSearchResponse(BaseModel):
    jobs: List[Dict[str, Any]]
    total_count: int
    query_id: str

class ResumeProcessResponse(BaseModel):
    resume_id: str
    resume_info: Dict[str, Any]
    message: str

class SkillAnalysisRequest(BaseModel):
    resume_id: str
    jobs: List[Dict[str, Any]]

class SkillAnalysisResponse(BaseModel):
    analyses: List[Dict[str, Any]]
    message: str

class ReportRequest(BaseModel):
    analyses: List[Dict[str, Any]]

class ReportResponse(BaseModel):
    report: Dict[str, Any]
    message: str

class UserProfileResponse(BaseModel):
    success: bool
    profile: Optional[Dict[str, Any]] = None
    message: str

class ResumeHistoryResponse(BaseModel):
    success: bool
    resumes: Optional[List[Dict[str, Any]]] = None
    message: str

# Enhanced in-memory storage with user-specific data
session_storage = {}
user_resumes = {}

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Job Recommender API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "processors_initialized": resume_processor is not None and skill_analyzer is not None,
        "timestamp": datetime.now().isoformat()
    }

# ---------------- Public Routes ---------------- #

@app.get("/cities/{country}")
async def get_cities(country: str):
    """Get cities for a given country"""
    cities = CITIES.get(country, [])
    return {"cities": cities, "country": country}

# ---------------- Protected Routes ---------------- #

@app.post("/upload-resume", response_model=ResumeProcessResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and process resume file for profile completion"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        user_uid = current_user["uid"]
        
        # Read file content
        content = await file.read()
        logger.info(f"File read complete for user: {user_uid}")
        
        # Create a file-like object for processing
        from io import BytesIO
        file_obj = BytesIO(content)
        file_obj.name = file.filename
        
        # Extract text based on file type
        if file.content_type == "application/pdf":
            resume_text = resume_processor.extract_text_from_pdf(file_obj)
        else:
            resume_text = resume_processor.extract_text_from_docx(file_obj)
        
        # Process resume
        resume_info = resume_processor.extract_resume_info(resume_text)
        logger.info(f"Resume info extracted for user: {user_uid}")
        
        # Generate resume ID and store in Pinecone
        resume_id = resume_processor.store_resume_in_pinecone(resume_info, user_uid)
        logger.info(f"Stored in Pinecone with ID: {resume_id}")
        
        # Store in session with user-specific data
        if user_uid not in session_storage:
            session_storage[user_uid] = {}
        
        session_storage[user_uid].update({
            "resume_info": resume_info,
            "resume_id": resume_id,
            "filename": file.filename,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        
        # Also store in user_resumes for history
        if user_uid not in user_resumes:
            user_resumes[user_uid] = []
        
        # Remove old resume if exists (user can only have one active resume)
        user_resumes[user_uid] = [{
            "resume_id": resume_id,
            "filename": file.filename,
            "resume_info": resume_info,
            "uploaded_at": datetime.now().isoformat()
        }]
        
        return ResumeProcessResponse(
            resume_id=resume_id,
            resume_info=resume_info,
            message="Resume processed and profile completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing resume for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@app.get("/user/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile including resume information"""
    user_uid = current_user["uid"]
    
    try:
        # Check if user has session data
        user_session = session_storage.get(user_uid, {})
        user_resume_history = user_resumes.get(user_uid, [])
        
        if not user_session and not user_resume_history:
            return UserProfileResponse(
                success=True,
                profile=None,
                message="No profile data found. Please complete your profile."
            )
        
        profile_data = {
            "user_info": {
                "uid": user_uid,
                "email": current_user.get("email"),
                "email_verified": current_user.get("email_verified", False)
            },
            "resume_info": user_session.get("resume_info"),
            "resume_id": user_session.get("resume_id"),
            "filename": user_session.get("filename"),
            "profile_completed": bool(user_session.get("resume_info")),
            "last_updated": user_session.get("updated_at"),
            "resume_history": user_resume_history
        }
        
        return UserProfileResponse(
            success=True,
            profile=profile_data,
            message="Profile retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return UserProfileResponse(
            success=False,
            message=f"Error retrieving profile: {str(e)}"
        )

@app.get("/user/resumes", response_model=ResumeHistoryResponse)
async def get_user_resumes(current_user: dict = Depends(get_current_user)):
    """Get user's resume history"""
    user_uid = current_user["uid"]
    
    try:
        user_resume_history = user_resumes.get(user_uid, [])
        
        return ResumeHistoryResponse(
            success=True,
            resumes=user_resume_history,
            message=f"Found {len(user_resume_history)} resumes"
        )
        
    except Exception as e:
        logger.error(f"Error getting user resumes: {str(e)}")
        return ResumeHistoryResponse(
            success=False,
            message=f"Error retrieving resumes: {str(e)}"
        )

@app.delete("/user/resume/{resume_id}")
async def delete_user_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete user's resume"""
    user_uid = current_user["uid"]
    
    try:
        # Clear from session storage
        if user_uid in session_storage:
            if session_storage[user_uid].get("resume_id") == resume_id:
                del session_storage[user_uid]
        
        # Clear from user resumes
        if user_uid in user_resumes:
            user_resumes[user_uid] = [
                resume for resume in user_resumes[user_uid] 
                if resume.get("resume_id") != resume_id
            ]
        
        # In a real implementation, you would also delete from Pinecone
        # resume_processor.delete_resume_from_pinecone(resume_id)
        
        return {
            "success": True,
            "message": "Resume deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting resume: {str(e)}")
        return {
            "success": False,
            "message": f"Error deleting resume: {str(e)}"
        }

@app.post("/search-jobs", response_model=JobSearchResponse)
async def search_jobs(
    request: JobSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for jobs based on query"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    user_uid = current_user["uid"]
    
    # Check if user has completed profile
    if user_uid not in session_storage or not session_storage[user_uid].get("resume_info"):
        raise HTTPException(status_code=400, detail="Please complete your profile by uploading a resume first")
    
    try:
        # Fetch jobs
        jobs = fetch_jobs(request.job_query, request.location, request.num_jobs)
        
        if not jobs:
            return JobSearchResponse(
                jobs=[],
                total_count=0,
                query_id=""
            )
        
        # Generate query ID and store jobs in Pinecone
        query_id = f"query_{user_uid}_{int(datetime.now().timestamp())}"
        job_ids = resume_processor.store_jobs_in_pinecone(jobs, query_id)
        
        # Store query info in user session
        session_storage[user_uid]["last_search"] = {
            "query": request.job_query,
            "location": request.location,
            "query_id": query_id,
            "jobs_count": len(jobs),
            "searched_at": datetime.now().isoformat()
        }
        
        logger.info(f"Found and stored {len(jobs)} jobs with query_id: {query_id} for user: {user_uid}")
        
        return JobSearchResponse(
            jobs=jobs,
            total_count=len(jobs),
            query_id=query_id
        )
        
    except Exception as e:
        logger.error(f"Error searching jobs for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching jobs: {str(e)}")

@app.get("/similar-jobs/{resume_id}")
async def get_similar_jobs(
    resume_id: str,
    query_id: str,
    top_k: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get jobs similar to resume"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    user_uid = current_user["uid"]
    
    # Verify user owns this resume
    user_session = session_storage.get(user_uid, {})
    if user_session.get("resume_id") != resume_id:
        raise HTTPException(status_code=403, detail="Access denied: Resume does not belong to current user")
    
    try:
        similar_jobs = resume_processor.find_similar_jobs(resume_id, top_k, query_id)
        
        # Store similar jobs in session for analysis
        session_storage[user_uid]["similar_jobs"] = {
            "jobs": similar_jobs,
            "query_id": query_id,
            "retrieved_at": datetime.now().isoformat()
        }
        
        return {
            "similar_jobs": similar_jobs,
            "total_count": len(similar_jobs),
            "message": f"Found {len(similar_jobs)} similar jobs"
        }
        
    except Exception as e:
        logger.error(f"Error finding similar jobs for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding similar jobs: {str(e)}")

@app.post("/analyze-skills", response_model=SkillAnalysisResponse)
async def analyze_skills(
    request: SkillAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """Perform skill gap analysis"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    user_uid = current_user["uid"]
    
    # Find resume info from session storage
    user_session = session_storage.get(user_uid, {})
    resume_info = user_session.get("resume_info")
    
    if not resume_info:
        raise HTTPException(status_code=404, detail="Resume not found. Please complete your profile first.")
    
    # Verify user owns this resume
    if user_session.get("resume_id") != request.resume_id:
        raise HTTPException(status_code=403, detail="Access denied: Resume does not belong to current user")
    
    try:
        # Analyze top 5 jobs to save time/costs
        jobs_to_analyze = request.jobs[:5]
        analyses = skill_analyzer.analyze_resume_vs_jobs(resume_info, jobs_to_analyze)
        
        # Store analyses in session
        session_storage[user_uid]["analyses"] = {
            "results": analyses,
            "analyzed_at": datetime.now().isoformat()
        }
        
        logger.info(f"Completed skill gap analysis for {len(analyses)} jobs for user: {user_uid}")
        
        return SkillAnalysisResponse(
            analyses=analyses,
            message=f"Analysis completed for {len(analyses)} jobs"
        )
        
    except Exception as e:
        logger.error(f"Error during skill analysis for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during skill analysis: {str(e)}")

@app.post("/generate-report", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate comprehensive report from analyses"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    if not request.analyses:
        raise HTTPException(status_code=400, detail="No analyses provided")
    
    user_uid = current_user["uid"]
    
    try:
        overall_report = skill_analyzer.generate_overall_report(request.analyses)
        
        if 'error' in overall_report:
            raise HTTPException(status_code=500, detail=overall_report['error'])
        
        # Store report in session
        if user_uid in session_storage:
            session_storage[user_uid]["report"] = {
                "data": overall_report,
                "generated_at": datetime.now().isoformat()
            }
        
        return ReportResponse(
            report=overall_report,
            message="Report generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating report for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.post("/suggest-jobs")
async def suggest_jobs(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Generate job suggestions based on resume"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    user_uid = current_user["uid"]
    resume_info = request.get('resume_info')
    
    # If no resume_info provided, get from session
    if not resume_info:
        user_session = session_storage.get(user_uid, {})
        resume_info = user_session.get("resume_info")
    
    if not resume_info:
        raise HTTPException(status_code=400, detail="Resume info required. Please complete your profile first.")
    
    try:
        suggestions = skill_analyzer.suggest_job_keywords(resume_info)
        return {"suggestions": suggestions, "message": "Job suggestions generated"}
    except Exception as e:
        logger.error(f"Error generating job suggestions for user {user_uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")

@app.get("/session/{user_id}")
async def get_session_data(current_user: dict = Depends(get_current_user)):
    """Get session data for the current user"""
    user_uid = current_user["uid"]
    
    if user_uid not in session_storage:
        return {
            "session_data": None,
            "message": "No session data found"
        }
    
    return {
        "session_data": session_storage[user_uid],
        "message": "Session data retrieved successfully"
    }

@app.delete("/session/{user_id}")
async def clear_session(current_user: dict = Depends(get_current_user)):
    """Clear session data for the current user"""
    user_uid = current_user["uid"]
    
    if user_uid in session_storage:
        del session_storage[user_uid]
    
    if user_uid in user_resumes:
        del user_resumes[user_uid]
    
    return {"message": "Session cleared successfully"}

# Background task for heavy processing
@app.post("/analyze-skills-async/{resume_id}")
async def analyze_skills_async(
    resume_id: str,
    background_tasks: BackgroundTasks,
    jobs: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Start skill analysis as background task"""
    user_uid = current_user["uid"]
    
    # Verify user owns this resume
    user_session = session_storage.get(user_uid, {})
    if user_session.get("resume_id") != resume_id:
        raise HTTPException(status_code=403, detail="Access denied: Resume does not belong to current user")
    
    task_id = str(uuid.uuid4())
    
    def run_analysis():
        try:
            # Store task status
            if user_uid not in session_storage:
                session_storage[user_uid] = {}
            
            session_storage[user_uid][f"task_{task_id}"] = {
                "status": "processing",
                "started_at": datetime.now().isoformat()
            }
            
            # Run actual analysis (this would be implemented)
            # analyses = skill_analyzer.analyze_resume_vs_jobs(resume_info, jobs)
            
            # Update task status
            session_storage[user_uid][f"task_{task_id}"] = {
                "status": "completed",
                "started_at": session_storage[user_uid][f"task_{task_id}"]["started_at"],
                "completed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            # Update task status with error
            if user_uid in session_storage:
                session_storage[user_uid][f"task_{task_id}"] = {
                    "status": "failed",
                    "error": str(e),
                    "failed_at": datetime.now().isoformat()
                }
    
    background_tasks.add_task(run_analysis)
    
    return {
        "task_id": task_id,
        "message": "Analysis started in background",
        "status": "processing"
    }

@app.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get background task status"""
    user_uid = current_user["uid"]
    
    user_session = session_storage.get(user_uid, {})
    task_data = user_session.get(f"task_{task_id}")
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        "status": task_data.get("status", "unknown"),
        "data": task_data
    }

# User management endpoints
@app.post("/user/profile")
async def update_user_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    user_uid = current_user["uid"]
    
    try:
        # Update session storage
        if user_uid not in session_storage:
            session_storage[user_uid] = {}
        
        session_storage[user_uid].update({
            "profile_data": profile_data,
            "profile_updated_at": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "message": "Profile updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating profile for user {user_uid}: {str(e)}")
        return {
            "success": False,
            "message": f"Error updating profile: {str(e)}"
        }

# Admin endpoints (for debugging/monitoring)
@app.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_verified_user)):
    """Get system statistics (admin only)"""
    return {
        "total_users": len(session_storage),
        "total_resumes": sum(len(resumes) for resumes in user_resumes.values()),
        "active_sessions": len(session_storage),
        "system_health": {
            "resume_processor": resume_processor is not None,
            "skill_analyzer": skill_analyzer is not None
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Resource not found", "detail": str(exc)}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {"error": "Internal server error", "detail": str(exc)}

@app.exception_handler(403)
async def forbidden_handler(request, exc):
    return {"error": "Access forbidden", "detail": str(exc)}

@app.exception_handler(401)
async def unauthorized_handler(request, exc):
    return {"error": "Unauthorized", "detail": "Please sign in to access this resource"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)