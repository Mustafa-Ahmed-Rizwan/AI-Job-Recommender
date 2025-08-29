# main.py - FastAPI Backend with Firebase Authentication
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
from src.resume_processor import ResumeProcessor
from src.skill_analyzer import SkillGapAnalyzer
from src.job_api import fetch_jobs
from middleware.auth import get_current_user, get_verified_user

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
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
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

class SuggestJobsRequest(BaseModel):
    resume_info: Dict[str, Any]

# User profile storage (maps user_uid to resume data)
user_resume_storage = {}

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

# ---------------- Protected Routes ---------------- #

@app.post("/upload-resume", response_model=ResumeProcessResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and process resume file - stores per authenticated user"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        # Read file content
        content = await file.read()
        logger.info(f"Processing resume for user: {current_user['uid']}")
        
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
        logger.info("Resume info extracted")
        
        # Store resume with user's UID for persistence
        user_uid = current_user['uid']
        resume_id = resume_processor.store_resume_in_pinecone(resume_info, user_uid)
        logger.info(f"Stored in Pinecone with resume_id: {resume_id}")
        
        # Store in user-specific storage for this session
        user_resume_storage[user_uid] = {
            "resume_info": resume_info,
            "resume_id": resume_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        return ResumeProcessResponse(
            resume_id=resume_id,
            resume_info=resume_info,
            message="Resume processed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing resume for user {current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@app.get("/user-resume")
async def get_user_resume(current_user: dict = Depends(get_current_user)):
    """Get current user's resume information"""
    user_uid = current_user['uid']
    
    if user_uid not in user_resume_storage:
        raise HTTPException(status_code=404, detail="No resume found for user")
    
    user_data = user_resume_storage[user_uid]
    return {
        "resume_id": user_data["resume_id"],
        "resume_info": user_data["resume_info"],
        "created_at": user_data["created_at"],
        "updated_at": user_data["updated_at"],
        "message": "Resume data retrieved successfully"
    }

@app.delete("/user-resume")
async def delete_user_resume(current_user: dict = Depends(get_current_user)):
    """Delete current user's resume"""
    user_uid = current_user['uid']
    
    if user_uid in user_resume_storage:
        # TODO: Also delete from Pinecone in production
        del user_resume_storage[user_uid]
        logger.info(f"Deleted resume for user: {user_uid}")
    
    return {"message": "Resume deleted successfully"}

@app.post("/search-jobs", response_model=JobSearchResponse)
async def search_jobs(
    request: JobSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for jobs based on query"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
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
        user_uid = current_user['uid']
        query_id = f"query_{user_uid}_{uuid.uuid4()}_{int(datetime.now().timestamp())}"
        job_ids = resume_processor.store_jobs_in_pinecone(jobs, query_id)
        
        logger.info(f"Found and stored {len(jobs)} jobs with query_id: {query_id} for user: {user_uid}")
        
        return JobSearchResponse(
            jobs=jobs,
            total_count=len(jobs),
            query_id=query_id
        )
        
    except Exception as e:
        logger.error(f"Error searching jobs for user {current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching jobs: {str(e)}")

@app.get("/similar-jobs/{resume_id}")
async def get_similar_jobs(
    resume_id: str,
    query_id: str,
    top_k: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get jobs similar to user's resume"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    # Verify user owns this resume
    user_uid = current_user['uid']
    if user_uid not in user_resume_storage or user_resume_storage[user_uid]["resume_id"] != resume_id:
        raise HTTPException(status_code=403, detail="Access denied: Resume does not belong to current user")
    
    try:
        similar_jobs = resume_processor.find_similar_jobs(resume_id, top_k, query_id)
        
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
    """Perform skill gap analysis for authenticated user"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    # Get user's resume info
    user_uid = current_user['uid']
    if user_uid not in user_resume_storage:
        raise HTTPException(status_code=404, detail="No resume found. Please upload resume first.")
    
    user_data = user_resume_storage[user_uid]
    if user_data["resume_id"] != request.resume_id:
        raise HTTPException(status_code=403, detail="Access denied: Resume does not belong to current user")
    
    resume_info = user_data["resume_info"]
    
    try:
        # Analyze top 5 jobs to save time/costs
        # Analyze all jobs
        jobs_to_analyze = request.jobs
        analyses = skill_analyzer.analyze_resume_vs_jobs(resume_info, jobs_to_analyze)
        
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
    
    try:
        overall_report = skill_analyzer.generate_overall_report(request.analyses)
        
        if 'error' in overall_report:
            raise HTTPException(status_code=500, detail=overall_report['error'])
        
        logger.info(f"Generated report for user: {current_user['uid']}")
        
        return ReportResponse(
            report=overall_report,
            message="Report generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating report for user {current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.get("/cities/{country}")
async def get_cities(country: str):
    """Get cities for a given country - public endpoint"""
    cities = CITIES.get(country, [])
    return {"cities": cities, "country": country}

@app.post("/suggest-jobs")
async def suggest_jobs(
    request: SuggestJobsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate job suggestions based on user's resume"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    try:
        suggestions = skill_analyzer.suggest_job_keywords(request.resume_info)
        logger.info(f"Generated job suggestions for user: {current_user['uid']}")
        return {"suggestions": suggestions, "message": "Job suggestions generated"}
    except Exception as e:
        logger.error(f"Error generating job suggestions for user {current_user['uid']}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")

@app.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile information"""
    user_uid = current_user['uid']
    
    # Check if user has resume
    has_resume = user_uid in user_resume_storage
    resume_data = user_resume_storage.get(user_uid, {})
    
    return {
        "uid": user_uid,
        "email": current_user.get("email"),
        "email_verified": current_user.get("email_verified", False),
        "has_resume": has_resume,
        "resume_id": resume_data.get("resume_id"),
        "profile_completed": has_resume,
        "last_updated": resume_data.get("updated_at"),
        "message": "User profile retrieved successfully"
    }

# Background task example for heavy processing
@app.post("/analyze-skills-async")
async def analyze_skills_async(
    background_tasks: BackgroundTasks,
    request: SkillAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start skill analysis as background task"""
    task_id = str(uuid.uuid4())
    user_uid = current_user['uid']
    
    def run_analysis():
        # This would run in background
        logger.info(f"Starting background analysis for user: {user_uid}, task: {task_id}")
        # You could store results in database or cache
        pass
    
    background_tasks.add_task(run_analysis)
    
    return {
        "task_id": task_id,
        "message": "Analysis started in background",
        "status": "processing"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Resource not found", "detail": str(exc)}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {"error": "Internal server error", "detail": str(exc)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)