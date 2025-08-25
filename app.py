# app.py - Updated Streamlit Frontend
import streamlit as st
import requests
import json
import uuid
import time
from typing import Dict, List, Any
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime
import io

# FastAPI Backend URL
API_BASE_URL = "http://localhost:8000"  # Change this to your backend URL

# Page configuration
st.set_page_config(
    page_title="AI Job Recommender",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS (same as before)
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #1e3d59;
        text-align: center;
        margin-bottom: 2rem;
    }
    .skill-tag {
        display: inline-block;
        background-color: #e3f2fd;
        color: #1976d2;
        padding: 0.25rem 0.75rem;
        margin: 0.25rem;
        border-radius: 20px;
        font-size: 0.875rem;
        border: 1px solid #bbdefb;
    }
    .job-card {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 1rem;
        margin: 1rem 0;
        background-color: #f8f9fa;
    }
    .match-score {
        font-size: 1.2rem;
        font-weight: bold;
        color: #28a745;
    }
    .sidebar-info {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'resume_processed' not in st.session_state:
    st.session_state.resume_processed = False
if 'resume_info' not in st.session_state:
    st.session_state.resume_info = None
if 'resume_id' not in st.session_state:
    st.session_state.resume_id = None
if 'jobs_fetched' not in st.session_state:
    st.session_state.jobs_fetched = False
if 'jobs_data' not in st.session_state:
    st.session_state.jobs_data = None
if 'job_analyses' not in st.session_state:
    st.session_state.job_analyses = None
if 'user_id' not in st.session_state:
    st.session_state.user_id = str(uuid.uuid4())
if 'query_id' not in st.session_state:
    st.session_state.query_id = None

# API Helper Functions
def check_api_health():
    """Check if the FastAPI backend is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def upload_resume_to_api(uploaded_file):
    """Upload resume to FastAPI backend"""
    try:
        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
        response = requests.post(f"{API_BASE_URL}/upload-resume", files=files)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

def search_jobs_api(job_query, location, num_jobs):
    """Search jobs using FastAPI backend"""
    try:
        payload = {
            "job_query": job_query,
            "location": location,
            "num_jobs": num_jobs
        }
        response = requests.post(f"{API_BASE_URL}/search-jobs", json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

def get_similar_jobs_api(resume_id, query_id, top_k=10):
    """Get similar jobs using FastAPI backend"""
    try:
        params = {"query_id": query_id, "top_k": top_k}
        response = requests.get(f"{API_BASE_URL}/similar-jobs/{resume_id}", params=params)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

def analyze_skills_api(resume_id, jobs):
    """Analyze skills using FastAPI backend"""
    try:
        payload = {
            "resume_id": resume_id,
            "jobs": jobs
        }
        response = requests.post(f"{API_BASE_URL}/analyze-skills", json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

def generate_report_api(analyses):
    """Generate report using FastAPI backend"""
    try:
        payload = {"analyses": analyses}
        response = requests.post(f"{API_BASE_URL}/generate-report", json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

def main():
    st.markdown('<h1 class="main-header">🎯 AI Job Recommender</h1>', unsafe_allow_html=True)
    
    # Check API health
    if not check_api_health():
        st.error("❌ Backend API is not running. Please start the FastAPI server.")
        st.info("Run: `uvicorn main:app --reload` to start the backend server")
        return
    else:
        st.success("✅ Backend API is running")
    
    # Sidebar
    with st.sidebar:
        st.markdown('<div class="sidebar-info">', unsafe_allow_html=True)
        st.markdown("### 📋 How it works:")
        st.markdown("""
        1. **Upload Resume**: PDF or DOCX format
        2. **Enter Job Query**: Your target position
        3. **Get Analysis**: AI-powered skill gap analysis
        4. **View Recommendations**: Personalized learning path
        """)
        st.markdown('</div>', unsafe_allow_html=True)
        
        # API Status
        st.markdown("### 🔗 API Status")
        if check_api_health():
            st.success("Backend Connected")
        else:
            st.error("Backend Disconnected")
        
        # Reset button
        if st.button("🔄 Start New Analysis"):
            for key in list(st.session_state.keys()):
                if key != 'user_id':
                    del st.session_state[key]
            st.rerun()
    
    # Main content
    tab1, tab2, tab3, tab4 = st.tabs(["📄 Upload Resume", "🔍 Find Jobs", "📊 Analysis", "📋 Report"])
    
    with tab1:
        handle_resume_upload()
    
    with tab2:
        handle_job_search()
    
    with tab3:
        handle_skill_analysis()
    
    with tab4:
        handle_report_generation()

def handle_resume_upload():
    st.header("📄 Upload Your Resume")
    
    uploaded_file = st.file_uploader(
        "Choose your resume file",
        type=['pdf', 'docx'],
        help="Upload your resume in PDF or DOCX format"
    )
    
    if uploaded_file is not None:
        try:
            with st.spinner("Processing your resume..."):
                # Upload to API
                result = upload_resume_to_api(uploaded_file)
                
                if result:
                    # Update session state
                    st.session_state.resume_info = result['resume_info']
                    st.session_state.resume_id = result['resume_id']
                    st.session_state.resume_processed = True
                    
                    st.success("✅ Resume processed successfully!")
                else:
                    return
                
        except Exception as e:
            st.error(f"Error processing resume: {str(e)}")
            return
    
    # Display resume information if processed
    if st.session_state.resume_processed and st.session_state.resume_info:
        display_resume_info(st.session_state.resume_info)

def display_resume_info(resume_info):
    st.subheader("🔍 Extracted Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Contact Information:**")
        if resume_info.get('email'):
            st.write(f"📧 {resume_info['email']}")
        if resume_info.get('phone'):
            st.write(f"📞 {resume_info['phone']}")
    
    with col2:
        st.markdown("**Summary:**")
        st.write(resume_info.get('summary', 'No summary available'))
    
    # Display skills
    if resume_info.get('extracted_skills'):
        st.markdown("**🔧 Technical Skills:**")
        skills_html = ""
        for skill in resume_info['extracted_skills']:
            skills_html += f'<span class="skill-tag">{skill}</span>'
        st.markdown(skills_html, unsafe_allow_html=True)
    
    # Display sections in expandable areas
    sections = resume_info.get('sections', {})
    
    if sections.get('experience'):
        with st.expander("💼 Work Experience"):
            st.text(sections['experience'])
    
    if sections.get('education'):
        with st.expander("🎓 Education"):
            st.text(sections['education'])
    
    if sections.get('projects'):
        with st.expander("🛠️ Projects"):
            st.text(sections['projects'])

def handle_job_search():
    st.header("🔍 Find Relevant Jobs")
    
    if not st.session_state.resume_processed:
        st.warning("⚠️ Please upload and process your resume first!")
        return
    
    col1, col2, col3 = st.columns([3, 2, 1])
    
    with col1:
        job_query = st.text_input(
            "Job Title/Keywords",
            placeholder="e.g., Software Engineer, Data Scientist, Product Manager",
            help="Enter the job title or keywords for positions you're interested in"
        )
    
    with col2:
        location = st.text_input(
            "Location",
            value="Pakistan",
            help="Enter the location where you want to search for jobs"
        )
    
    with col3:
        num_jobs = st.number_input(
            "Number of Jobs",
            min_value=5,
            max_value=50,
            value=20,
            help="How many jobs to fetch and analyze"
        )
    
    if st.button("🔎 Search Jobs", type="primary"):
        if not job_query.strip():
            st.error("Please enter a job title or keywords!")
            return
        
        try:
            with st.spinner("Fetching jobs from multiple sources..."):
                # Search jobs using API
                search_result = search_jobs_api(job_query, location, num_jobs)
                
                if not search_result or not search_result['jobs']:
                    st.warning("No jobs found for your query. Try different keywords or location.")
                    return
                
                jobs = search_result['jobs']
                query_id = search_result['query_id']
                
                st.success(f"✅ Found {len(jobs)} jobs!")
                
                # Get similar jobs
                with st.spinner("Finding jobs similar to your profile..."):
                    similar_result = get_similar_jobs_api(
                        st.session_state.resume_id, 
                        query_id, 
                        top_k=len(jobs)
                    )
                
                if similar_result:
                    # Store in session state
                    st.session_state.jobs_data = similar_result['similar_jobs']
                    st.session_state.jobs_fetched = True
                    st.session_state.job_query = job_query
                    st.session_state.query_id = query_id
                
        except Exception as e:
            st.error(f"Error fetching jobs: {str(e)}")
            return
    
    # Display jobs if fetched
    if st.session_state.jobs_fetched and st.session_state.jobs_data:
        display_jobs(st.session_state.jobs_data)

def display_jobs(jobs):
    st.subheader(f"🔎 Found {len(jobs)} Matching Jobs")
    
    # Sort jobs by similarity score (defensive)
    jobs_sorted = sorted(jobs, key=lambda x: float(x.get('similarity_score', 0) or 0), reverse=True)
    
    for i, job in enumerate(jobs_sorted[:10]):  # Show top 10 jobs
        with st.container():
            st.markdown(f'<div class="job-card">', unsafe_allow_html=True)
            
            col1, col2, col3 = st.columns([3, 1, 1])
            
            with col1:
                st.markdown(f"**{job.get('title', 'Unknown Title')}**")
                company_display = job.get('company') or job.get('company_name') or 'Unknown Company'
                st.markdown(f"🏢 {company_display}")
                st.markdown(f"📍 {job.get('location', 'Unknown Location')}")
                
                if job.get('description'):
                    with st.expander("View Description"):
                        st.write(job.get('description', ''))
            
            with col2:
                similarity = job.get('similarity_score', 0) or 0
                try:
                    sim_float = float(similarity)
                except Exception:
                    sim_float = 0.0
                st.markdown(f'<div class="match-score">Match: {sim_float:.1%}</div>', unsafe_allow_html=True)
                
                # Color-coded match indicator
                if sim_float > 0.8:
                    st.success("✅ Excellent Match")
                elif sim_float > 0.6:
                    st.warning("⚠️ Good Match")
                else:
                    st.info("ℹ️ Potential Match")
            
            with col3:
                apply_link = job.get('apply_link', '')
                
                if apply_link and isinstance(apply_link, str) and apply_link.startswith("http"):
                    try:
                        st.link_button("Apply Now", apply_link, use_container_width=True)
                    except Exception:
                        st.markdown(f"[Apply Now]({apply_link})")
                else:
                    st.write("No link available")
    
            st.markdown('</div>', unsafe_allow_html=True)
            st.divider()

def handle_skill_analysis():
    st.header("📊 Skill Gap Analysis")
    
    if not st.session_state.resume_processed:
        st.warning("⚠️ Please upload and process your resume first!")
        return
    
    if not st.session_state.jobs_fetched:
        st.warning("⚠️ Please search for jobs first!")
        return
    
    if st.button("🔬 Start Analysis", type="primary"):
        try:
            with st.spinner("Analyzing skill gaps using AI... This may take a few moments."):
                # Perform skill gap analysis using API
                analysis_result = analyze_skills_api(
                    st.session_state.resume_id,
                    st.session_state.jobs_data[:5]  # Analyze top 5 jobs
                )
                
                if analysis_result:
                    st.session_state.job_analyses = analysis_result['analyses']
                    st.success("✅ Analysis completed!")
                
        except Exception as e:
            st.error(f"Error during analysis: {str(e)}")
            return
    
    # Display analysis results
    if st.session_state.job_analyses:
        display_analysis_results(st.session_state.job_analyses)

def display_analysis_results(analyses):
    st.subheader("🎯 Skill Gap Analysis Results")
    
    # Create tabs for each analyzed job
    if len(analyses) > 1:
        tab_names = [f"Job {i+1}: {analysis['job_info']['title'][:20]}..." 
                    for i, analysis in enumerate(analyses)]
        tabs = st.tabs(tab_names)
        
        for tab, analysis in zip(tabs, analyses):
            with tab:
                display_single_analysis(analysis)
    else:
        display_single_analysis(analyses[0])

def display_single_analysis(analysis):
    job_info = analysis.get('job_info', {})
    
    # Job header
    st.markdown(f"### {job_info.get('title', 'Unknown Position')}")
    st.markdown(f"**Company:** {job_info.get('company', 'Unknown')}")
    st.markdown(f"**Location:** {job_info.get('location', 'Unknown')}")
    
    if 'analysis_error' in analysis:
        st.error(f"Analysis failed: {analysis['analysis_error']}")
        return
    
    # Overall match assessment
    job_match = analysis.get('job_match_assessment', {})
    if job_match.get('overall_match_percentage'):
        match_pct = job_match['overall_match_percentage']
        st.metric("Overall Match", match_pct)
    
    # Create columns for different sections
    col1, col2 = st.columns(2)
    
    with col1:
        # Skill gaps
        skill_gap = analysis.get('skill_gap_analysis', {})
        
        st.markdown("#### ✅ Matching Skills")
        matching_skills = skill_gap.get('matching_skills', [])
        if matching_skills:
            for skill in matching_skills:
                st.markdown(f"• {skill}")
        else:
            st.write("No matching skills identified")
        
        st.markdown("#### ❌ Missing Skills")
        missing_skills = skill_gap.get('missing_skills', [])
        if missing_skills:
            for skill in missing_skills:
                st.markdown(f"• {skill}")
        else:
            st.write("No missing skills identified")
    
    with col2:
        # Recommendations
        recommendations = analysis.get('recommendations', {})
        
        st.markdown("#### 🎯 Priority Skills to Learn")
        priority_skills = recommendations.get('priority_skills_to_learn', [])
        if priority_skills:
            for skill in priority_skills:
                st.markdown(f"• {skill}")
        
        st.markdown("#### ⏰ Timeline")
        timeline = recommendations.get('timeline_estimate', 'Not specified')
        st.write(timeline)
    
    # Expandable sections
    with st.expander("💪 Strengths & Concerns"):
        if job_match.get('strengths'):
            st.markdown("**Strengths:**")
            for strength in job_match['strengths']:
                st.markdown(f"• {strength}")
        
        if job_match.get('concerns'):
            st.markdown("**Concerns:**")
            for concern in job_match['concerns']:
                st.markdown(f"• {concern}")
    
    with st.expander("📚 Learning Resources"):
        resources = recommendations.get('learning_resources', [])
        if resources:
            for resource in resources:
                st.markdown(f"• {resource}")
    
    with st.expander("🛠️ Project Suggestions"):
        projects = recommendations.get('project_suggestions', [])
        if projects:
            for project in projects:
                st.markdown(f"• {project}")
    
    with st.expander("💼 Career Advice"):
        career_advice = analysis.get('career_advice', {})
        
        if career_advice.get('application_readiness'):
            st.markdown(f"**Application Readiness:** {career_advice['application_readiness']}")
        
        if career_advice.get('cover_letter_focus'):
            st.markdown("**Cover Letter Focus:**")
            for point in career_advice['cover_letter_focus']:
                st.markdown(f"• {point}")
        
        if career_advice.get('alternative_roles'):
            st.markdown("**Alternative Roles:**")
            for role in career_advice['alternative_roles']:
                st.markdown(f"• {role}")

def handle_report_generation():
    st.header("📋 Comprehensive Report")
    
    if not st.session_state.job_analyses:
        st.warning("⚠️ Please complete the skill gap analysis first!")
        return
    
    try:
        with st.spinner("Generating comprehensive report..."):
            # Generate overall report using API
            report_result = generate_report_api(st.session_state.job_analyses)
            
            if not report_result:
                return
            
            overall_report = report_result['report']
        
        # Display summary metrics
        summary = overall_report.get('summary', {})
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Jobs Analyzed", summary.get('total_jobs_analyzed', 0))
        with col2:
            st.metric("Avg Match", summary.get('average_match_percentage', '0%'))
        with col3:
            readiness = overall_report.get('recommendations', {}).get('career_readiness', 'unknown')
            readiness_display = {
                'good': '🟢 Good',
                'needs_improvement': '🟡 Needs Work',
                'significant_gaps': '🔴 Major Gaps',
                'unknown': '❓ Unknown'
            }
            st.metric("Career Readiness", readiness_display.get(readiness, readiness))
        with col4:
            st.metric("Missing Skills", len(summary.get('most_common_missing_skills', [])))
        
        # Skills visualization
        st.subheader("📊 Skills Analysis")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Missing skills chart
            missing_skills = summary.get('most_common_missing_skills', [])[:10]
            if missing_skills:
                fig = px.bar(
                    x=list(range(len(missing_skills))),
                    y=missing_skills,
                    title="Most Common Missing Skills",
                    labels={'x': 'Frequency Rank', 'y': 'Skills'}
                )
                fig.update_layout(showlegend=False)
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Strongest skills chart
            strong_skills = summary.get('strongest_skills', [])[:10]
            if strong_skills:
                fig = px.bar(
                    x=list(range(len(strong_skills))),
                    y=strong_skills,
                    title="Your Strongest Skills",
                    labels={'x': 'Frequency Rank', 'y': 'Skills'},
                    color_discrete_sequence=['#28a745']
                )
                fig.update_layout(showlegend=False)
                st.plotly_chart(fig, use_container_width=True)
        
        # Action plan
        st.subheader("🎯 Recommended Action Plan")
        recommendations = overall_report.get('recommendations', {})
        
        if recommendations.get('next_steps'):
            for i, step in enumerate(recommendations['next_steps'], 1):
                st.markdown(f"**{i}.** {step}")
        
        # Top skills to develop
        if recommendations.get('top_skills_to_develop'):
            st.subheader("📈 Priority Learning Areas")
            skills_to_develop = recommendations['top_skills_to_develop']
            
            # Create a simple progress tracking interface
            st.markdown("Track your learning progress:")
            for skill in skills_to_develop:
                progress = st.slider(f"{skill}", 0, 100, 0, key=f"progress_{skill}")
                if progress > 0:
                    st.write(f"Progress: {progress}%")
        
        # Export functionality
        st.subheader("💾 Export Report")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📄 Download Report (JSON)"):
                report_json = json.dumps(overall_report, indent=2)
                st.download_button(
                    label="Download JSON",
                    data=report_json,
                    file_name=f"job_analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json"
                )
        
        with col2:
            if st.button("📊 Download Summary (CSV)"):
                # Create a simple CSV summary
                import io
                output = io.StringIO()
                
                # Write summary data
                output.write("Metric,Value\n")
                output.write(f"Jobs Analyzed,{summary.get('total_jobs_analyzed', 0)}\n")
                output.write(f"Average Match,{summary.get('average_match_percentage', '0%')}\n")
                output.write(f"Career Readiness,{readiness}\n")
                
                output.write("\nMissing Skills\n")
                for skill in missing_skills:
                    output.write(f"{skill}\n")
                
                csv_data = output.getvalue()
                st.download_button(
                    label="Download CSV",
                    data=csv_data,
                    file_name=f"job_analysis_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv"
                )
        
    except Exception as e:
        st.error(f"Error generating report: {str(e)}")

if __name__ == "__main__":
    main()