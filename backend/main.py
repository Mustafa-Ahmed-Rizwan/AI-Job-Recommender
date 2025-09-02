# main.py - FastAPI Backend
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uuid
import json
from datetime import datetime
import asyncio
import logging
import firebase_admin
from firebase_admin import credentials, firestore

# Import your existing modules
from backend.src.resume_processor import ResumeProcessor
from backend.src.skill_analyzer import SkillGapAnalyzer
from backend.src.job_api import fetch_jobs
from backend.middleware.auth import get_current_user, get_verified_user
from fastapi import Depends

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
    allow_origins=["http://localhost:3000"],  # Add your frontend URLs
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
        
        # Initialize Firebase Admin SDK (if not already done in auth.py)
        if not firebase_admin._apps:
            # This will use the same credentials as your auth.py
            pass  # Firebase already initialized in auth.py
            
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



# API Endpoints
def get_firebase_db():
    """Get Firestore database instance"""
    return firestore.client()

def save_user_profile_to_firebase(user_id: str, profile_data: dict):
    """Save user profile data to Firebase"""
    try:
        db = get_firebase_db()
        doc_ref = db.collection('user_profiles').document(user_id)
        doc_ref.set(profile_data, merge=True)
        logger.info(f"Profile saved to Firebase for user: {user_id}")
    except Exception as e:
        logger.error(f"Error saving profile to Firebase: {e}")
        raise

def get_user_profile_from_firebase(user_id: str) -> dict:
    """Get user profile data from Firebase"""
    try:
        db = get_firebase_db()
        doc_ref = db.collection('user_profiles').document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return {}
    except Exception as e:
        logger.error(f"Error getting profile from Firebase: {e}")
        return {}

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
    """Upload and process resume file"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        # Read file content
        content = await file.read()
        logger.info("File read complete")
        
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
        
        # Generate user ID and store resume
        user_id = current_user["uid"]
        resume_id = resume_processor.store_resume_in_pinecone(resume_info, user_id)
        logger.info("Stored in Pinecone")
        
        # Save to Firebase instead of session_storage
        profile_data = {
            "uid": user_id,
            "email": current_user.get("email"),
            "has_resume": True,
            "resume_info": resume_info,
            "resume_id": resume_id,
            "last_updated": datetime.now().isoformat(),
            "filename": file.filename
        }
        save_user_profile_to_firebase(user_id, profile_data)
        
        return ResumeProcessResponse(
            resume_id=resume_id,
            resume_info=resume_info,
            message="Resume processed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

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
        query_id = f"query_{uuid.uuid4()}_{int(datetime.now().timestamp())}"
        job_ids = resume_processor.store_jobs_in_pinecone(jobs, query_id)
        
        logger.info(f"Found and stored {len(jobs)} jobs with query_id: {query_id}")
        
        return JobSearchResponse(
            jobs=jobs,
            total_count=len(jobs),
            query_id=query_id
        )
        
    except Exception as e:
        logger.error(f"Error searching jobs: {str(e)}")
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
    
    try:
        similar_jobs = resume_processor.find_similar_jobs(resume_id, top_k, query_id)
        
        return {
            "similar_jobs": similar_jobs,
            "total_count": len(similar_jobs),
            "message": f"Found {len(similar_jobs)} similar jobs"
        }
        
    except Exception as e:
        logger.error(f"Error finding similar jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding similar jobs: {str(e)}")

@app.post("/analyze-skills", response_model=SkillAnalysisResponse)
async def analyze_skills(
    request: SkillAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """Perform skill gap analysis"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    user_id = current_user["uid"]
    
    # Get resume info from Firebase instead of session_storage
    profile_data = get_user_profile_from_firebase(user_id)
    resume_info = profile_data.get("resume_info")
    
    if not resume_info:
        raise HTTPException(status_code=404, detail="Resume not found. Please upload resume first.")
    
    try:
        # Analyze top 5 jobs to save time/costs
        jobs_to_analyze = request.jobs[:5]
        analyses = skill_analyzer.analyze_resume_vs_jobs(resume_info, jobs_to_analyze)
        
        logger.info(f"Completed skill gap analysis for {len(analyses)} jobs")
        
        return SkillAnalysisResponse(
            analyses=analyses,
            message=f"Analysis completed for {len(analyses)} jobs"
        )
        
    except Exception as e:
        logger.error(f"Error during skill analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during skill analysis: {str(e)}")
@app.post("/generate-report", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """Generate comprehensive report from analyses"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    if not request.analyses:
        raise HTTPException(status_code=400, detail="No analyses provided")
    
    try:
        overall_report = skill_analyzer.generate_overall_report(request.analyses)
        
        if 'error' in overall_report:
            raise HTTPException(status_code=500, detail=overall_report['error'])
        
        return ReportResponse(
            report=overall_report,
            message="Report generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")





# Background task example for heavy processing
@app.post("/analyze-skills-async/{resume_id}")
async def analyze_skills_async(
    resume_id: str,
    background_tasks: BackgroundTasks,
    jobs: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Start skill analysis as background task"""
    task_id = str(uuid.uuid4())
    
    def run_analysis():
        # This would run in background
        # You could store results in database or cache
        pass
    
    background_tasks.add_task(run_analysis)
    
    return {
        "task_id": task_id,
        "message": "Analysis started in background",
        "status": "processing"
    }
@app.get("/cities/{country}")
async def get_cities(country: str):
    """Get cities for a given country"""
    cities = CITIES.get(country, [])
    return {"cities": cities, "country": country}

@app.post("/suggest-jobs")
async def suggest_jobs(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Generate job suggestions based on resume"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    resume_info = request.get('resume_info')
    if not resume_info:
        raise HTTPException(status_code=400, detail="Resume info required")
    
    try:
        suggestions = skill_analyzer.suggest_job_keywords(resume_info)
        return {"suggestions": suggestions, "message": "Job suggestions generated"}
    except Exception as e:
        logger.error(f"Error generating job suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")

# main.py - Add these new endpoints after the existing ones

@app.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile from Firebase"""
    user_id = current_user["uid"]
    
    try:
        # Get profile from Firebase instead of session_storage
        profile_data = get_user_profile_from_firebase(user_id)
        
        # Set defaults if no profile exists
        if not profile_data:
            profile_data = {
                "uid": user_id,
                "email": current_user.get("email"),
                "has_resume": False,
                "resume_info": None,
                "resume_id": None,
                "last_updated": None
            }
        
        return {
            "success": True,
            "profile": profile_data
        }
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting profile: {str(e)}")

@app.put("/user/profile")
async def update_user_profile(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Update user resume"""
    user_id = current_user["uid"]
    
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        # Process the new resume (same logic as upload)
        content = await file.read()
        from io import BytesIO
        file_obj = BytesIO(content)
        file_obj.name = file.filename
        
        if file.content_type == "application/pdf":
            resume_text = resume_processor.extract_text_from_pdf(file_obj)
        else:
            resume_text = resume_processor.extract_text_from_docx(file_obj)
        
        resume_info = resume_processor.extract_resume_info(resume_text)
        resume_id = resume_processor.store_resume_in_pinecone(resume_info, user_id)
        
        # Update Firebase instead of session_storage
        profile_data = {
            "uid": user_id,
            "email": current_user.get("email"),
            "has_resume": True,
            "resume_info": resume_info,
            "resume_id": resume_id,
            "last_updated": datetime.now().isoformat(),
            "filename": file.filename
        }
        save_user_profile_to_firebase(user_id, profile_data)
        
        return {
            "success": True,
            "resume_id": resume_id,
            "resume_info": resume_info,
            "message": "Resume updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating resume: {str(e)}")

@app.delete("/user/resume")
async def delete_user_resume(current_user: dict = Depends(get_current_user)):
    """Delete user resume"""
    user_id = current_user["uid"]
    
    try:
        # Update Firebase profile instead of session_storage
        profile_data = {
            "has_resume": False,
            "resume_info": None,
            "resume_id": None,
            "last_updated": datetime.now().isoformat()
        }
        save_user_profile_to_firebase(user_id, profile_data)
        
        return {
            "success": True,
            "message": "Resume deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting resume: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting resume: {str(e)}")

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