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

# Import your existing modules
from src.resume_processor import ResumeProcessor
from src.skill_analyzer import SkillGapAnalyzer
from src.job_api import fetch_jobs

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
    allow_origins=["http://localhost:8501", "http://localhost:3000"],  # Add your frontend URLs
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

# In-memory storage for session data (in production, use Redis or database)
session_storage = {}

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

@app.post("/upload-resume", response_model=ResumeProcessResponse)
async def upload_resume(file: UploadFile = File(...)):
    """Upload and process resume file"""
    if not resume_processor:
        raise HTTPException(status_code=500, detail="Resume processor not initialized")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        # Read file content
        content = await file.read()
        
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
        
        # Generate user ID and store resume
        user_id = str(uuid.uuid4())
        resume_id = resume_processor.store_resume_in_pinecone(resume_info, user_id)
        
        # Store in session (in production, use proper session management)
        session_storage[user_id] = {
            "resume_info": resume_info,
            "resume_id": resume_id,
            "created_at": datetime.now().isoformat()
        }
        
        return ResumeProcessResponse(
            resume_id=resume_id,
            resume_info=resume_info,
            message="Resume processed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@app.post("/search-jobs", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest):
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
async def get_similar_jobs(resume_id: str, query_id: str, top_k: int = 10):
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
async def analyze_skills(request: SkillAnalysisRequest):
    """Perform skill gap analysis"""
    if not skill_analyzer:
        raise HTTPException(status_code=500, detail="Skill analyzer not initialized")
    
    # Find resume info from session storage
    resume_info = None
    for user_id, session_data in session_storage.items():
        if session_data.get("resume_id") == request.resume_id:
            resume_info = session_data.get("resume_info")
            break
    
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

@app.get("/session/{user_id}")
async def get_session_data(user_id: str):
    """Get session data for a user"""
    if user_id not in session_storage:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_data": session_storage[user_id],
        "message": "Session data retrieved successfully"
    }

@app.delete("/session/{user_id}")
async def clear_session(user_id: str):
    """Clear session data for a user"""
    if user_id in session_storage:
        del session_storage[user_id]
    
    return {"message": "Session cleared successfully"}

# Background task example for heavy processing
@app.post("/analyze-skills-async/{resume_id}")
async def analyze_skills_async(resume_id: str, background_tasks: BackgroundTasks, jobs: List[Dict[str, Any]]):
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
async def suggest_jobs(request: dict):
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