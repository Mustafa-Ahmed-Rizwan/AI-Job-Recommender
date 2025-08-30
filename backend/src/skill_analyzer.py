# backend/src/skill_analyzer.py
import json
import re   
from typing import Dict, List, Any, Tuple
from urllib import response
from backend.src.helper import ask_with_fallback  # Your LLM manager


class SkillGapAnalyzer:
    def __init__(self):
        self.analysis_prompt_template = """
You are an expert career advisor and technical recruiter. Analyze the following resume and job requirements to identify skill gaps and provide recommendations.

RESUME INFORMATION:
Skills: {resume_skills}
Experience: {resume_experience}
Education: {resume_education}
Projects: {resume_projects}

JOB REQUIREMENTS:
Title: {job_title}
Company: {job_company}
Description: {job_description}
Location: {job_location}

ANALYSIS INSTRUCTIONS:
1. Compare the resume skills with skills mentioned or implied in the job description
2. Look for programming languages, frameworks, tools, methodologies in the job description
3. Identify both exact matches and closely related skills like NoSQl databases->mongodb,cassandra,etc like this
4. Consider years of experience requirements
5. Look for soft skills and technical competencies

Please provide ONLY a valid JSON response in exactly this format:
{{
    "skill_gap_analysis": {{
        "matching_skills": ["skills that appear in both resume and job requirements"],
        "missing_skills": ["skills clearly mentioned in job but not in resume"],
        "skill_level_gaps": ["skills where experience level differs"],
        "transferable_skills": ["resume skills that could apply to this job"]
    }},
    "recommendations": {{
        "priority_skills_to_learn": ["top 3-5 most critical missing skills"],
        "learning_resources": ["specific learning suggestions"],
        "project_suggestions": ["project ideas to build missing skills"],
        "timeline_estimate": "realistic timeframe like '2-4 months'"
    }},
    "job_match_assessment": {{
        "overall_match_percentage": "numeric percentage like 75",
        "strengths": ["candidate's advantages for this role"],
        "concerns": ["potential weaknesses or gaps"],
        "interview_preparation_tips": ["specific interview advice"]
    }}
}}

Return only valid JSON without any markdown, explanations, or code blocks.
"""

    def analyze_resume_vs_jobs(self, resume_info: Dict[str, Any], jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze resume against multiple jobs and return detailed skill gap analysis"""
        analyses = []
        
        for job in jobs:
            try:
                analysis = self._analyze_single_job_match(resume_info, job)
                analysis['job_info'] = {
                    'title': job.get('title', ''),
                    'company': job.get('company_name', ''),
                    'location': job.get('location', ''),
                    'apply_link': job.get('apply_link', ''),
                    'similarity_score': job.get('similarity_score', 0)
                }
                analyses.append(analysis)
            except Exception as e:
                # If analysis fails for one job, continue with others
                print(f"Failed to analyze job {job.get('title', 'Unknown')}: {str(e)}")
                fallback_analysis = self._create_fallback_analysis(resume_info, job, str(e))
                fallback_analysis['job_info'] = {
                    'title': job.get('title', ''),
                    'company': job.get('company_name', ''),
                    'location': job.get('location', ''),
                    'apply_link': job.get('apply_link', ''),
                    'similarity_score': job.get('similarity_score', 0)
                }
                analyses.append(fallback_analysis)
                continue

        
        return analyses
    def suggest_job_keywords(self, resume_info: Dict[str, Any]) -> List[str]:
        """Generate job keyword suggestions based on resume"""
        
        prompt = f"""
    Based on this resume information, suggest 4 specific job titles/keywords that would be most relevant for job searching.

    RESUME SKILLS: {', '.join(resume_info.get('extracted_skills', []))}
    EXPERIENCE: {resume_info['sections'].get('experience', 'Not specified')[:500]}
    EDUCATION: {resume_info['sections'].get('education', 'Not specified')[:300]}
    PROJECTS: {resume_info['sections'].get('projects', 'Not specified')[:400]}

    Return ONLY a JSON array of 4 job titles/keywords, nothing else:
    ["Job Title 1", "Job Title 2", "Job Title 3", "Job Title 4"]
    """
        
        try:
            response = ask_with_fallback(prompt, max_tokens=200, temperature=0.3)
            # Clean and parse response
            response_str = str(response).strip()
            if response_str.startswith("content='"):
                start = response_str.find("content='") + len("content='")
                content = ""
                i = start
                while i < len(response_str) and response_str[i] != "'":
                    content += response_str[i]
                    i += 1
                response_str = content
            
            import json
            suggestions = json.loads(response_str)
            return suggestions if isinstance(suggestions, list) else []
        except Exception as e:
            print(f"Error in suggest_job_keywords: {e}")
            # Fallback suggestions based on skills
            skills = resume_info.get('extracted_skills', [])
            if any('python' in skill.lower() for skill in skills):
                return ["Python Developer", "Software Engineer", "Data Analyst", "Backend Developer"]
            elif any('java' in skill.lower() for skill in skills):
                return ["Java Developer", "Software Engineer", "Full Stack Developer", "Backend Developer"]
            else:
                return ["Software Developer", "IT Specialist", "Technical Analyst", "Software Engineer"]
    
    def _analyze_single_job_match(self, resume_info: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze resume against a single job posting"""
        
        # Prepare the prompt
        prompt = self.analysis_prompt_template.format(
            resume_skills=", ".join(resume_info.get('extracted_skills', [])),
            resume_experience=resume_info['sections'].get('experience', 'Not specified'),
            resume_education=resume_info['sections'].get('education', 'Not specified'),
            resume_projects=resume_info['sections'].get('projects', 'Not specified'),
            job_title=job.get('title', 'Unknown'),
            job_company=job.get('company_name', 'Unknown'),
            job_description=job.get('description', 'No description available'),
            job_location=job.get('location', 'Unknown')
        )
        
        # Get analysis from LLM
        try:
            response = ask_with_fallback(prompt, max_tokens=2000, temperature=0.3)
            
            # Add debug logging
            print(f"=== LLM Response Debug ===")
            print(f"Raw response type: {type(response)}")
            print(f"Raw response length: {len(str(response))}")
            print(f"First 200 chars: {str(response)[:200]}")
            print("========================")
    
            # Clean the response - handle different response formats
            cleaned_response = self._extract_json_from_response(response)
            
            # Try to parse JSON response
            try:
                analysis = json.loads(cleaned_response)
                return analysis
            except json.JSONDecodeError as e:
                print(f"JSON parsing error after cleaning: {e}")
                print(f"Cleaned response: {cleaned_response[:500]}...")
                
                # Try regex extraction as fallback
                json_match = self._extract_json_with_regex(str(response))
                if json_match:
                    try:
                        analysis = json.loads(json_match)
                        return analysis
                    except json.JSONDecodeError:
                        pass
                
                # If all fails, return fallback
                raise ValueError(f"Could not extract valid JSON from LLM response. Error: {e}")
                     
        except Exception as e:
            # Return a basic analysis if LLM fails
            return self._create_fallback_analysis(resume_info, job, str(e))
    
    def _extract_json_from_response(self, response) -> str:
        """Extract JSON content from various response formats"""
        # Convert to string if needed
        response_str = str(response)
        
        # Handle LangChain response format: content='...'
        if response_str.startswith("content='"):
            # Extract content between content=' and the last '
            start = response_str.find("content='") + len("content='")
            # Find the matching quote, accounting for escaped quotes
            content = ""
            i = start
            while i < len(response_str):
                if response_str[i] == "'" and (i == 0 or response_str[i-1] != "\\"):
                    break
                content += response_str[i]
                i += 1
            response_str = content
        
        # Remove any remaining wrapper patterns
        patterns_to_remove = [
            r'^[^{]*(\{.*\})[^}]*$',  # Extract JSON from surrounding text
            r'```json\s*(\{.*\})\s*```',  # Remove markdown code blocks
            r'```\s*(\{.*\})\s*```',  # Remove code blocks without json tag
        ]
        
        for pattern in patterns_to_remove:
            match = re.search(pattern, response_str, re.DOTALL)
            if match:
                response_str = match.group(1)
                break
        
        # Clean up common issues
        response_str = response_str.strip()
        
        # Handle escaped quotes and other escape sequences
        response_str = response_str.replace("\\'", "'")
        response_str = response_str.replace('\\"', '"')
        response_str = response_str.replace('\\n', '\n')
        response_str = response_str.replace('\\t', '\t')
        
        return response_str
    
    def _extract_json_with_regex(self, text: str) -> str:
        """Extract JSON using regex patterns as fallback"""
        # Try different JSON extraction patterns
        json_patterns = [
            r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}',  # Simple nested braces
            r'(\{(?:[^{}]|(?R))*\})',  # Recursive pattern (if supported)
            r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # Alternative nested pattern
        ]
        
        for pattern in json_patterns:
            try:
                matches = re.findall(pattern, text, re.DOTALL)
                if matches:
                    # Try to parse each match
                    for match in matches:
                        try:
                            # Quick validation by attempting to parse
                            json.loads(match)
                            return match
                        except json.JSONDecodeError:
                            continue
            except re.error:
                continue  # Skip patterns that cause regex errors
        
        return ""
    
    def _create_fallback_analysis(self, resume_info: Dict[str, Any], job: Dict[str, Any], error: str) -> Dict[str, Any]:
        """Create a basic analysis when LLM analysis fails"""
        resume_skills = set([skill.lower() for skill in resume_info.get('extracted_skills', [])])
        job_text = (job.get('description', '') + ' ' + job.get('title', '')).lower()
        
        # Basic skill matching
        common_skills = ['python', 'java', 'javascript', 'react', 'sql', 'aws', 'docker']
        matching_skills = [skill for skill in resume_info.get('extracted_skills', []) 
                          if skill.lower() in job_text]
        
        return {
            "skill_gap_analysis": {
                "matching_skills": matching_skills,
                "missing_skills": ["Analysis failed - manual review needed"],
                "skill_level_gaps": ["Analysis failed - manual review needed"],
                "transferable_skills": resume_info.get('extracted_skills', [])[:3]
            },
            "recommendations": {
                "priority_skills_to_learn": ["Review job description manually"],
                "learning_resources": ["Coursera", "Udemy", "LinkedIn Learning"],
                "project_suggestions": ["Build portfolio projects"],
                "timeline_estimate": "Review needed"
            },
            "job_match_assessment": {
                "overall_match_percentage": "Unable to calculate",
                "strengths": ["Experience in relevant field"],
                "concerns": ["Analysis system error"],
                "interview_preparation_tips": ["Research the company", "Prepare STAR examples"]
            },
            "career_advice": {
                "application_readiness": "needs_review",
                "cover_letter_focus": ["Highlight relevant experience"],
                "networking_suggestions": ["LinkedIn connections"],
                "alternative_roles": ["Similar positions in the field"]
            },
            "analysis_error": error
        }
    
    def generate_overall_report(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate an overall report from multiple job analyses"""
        if not analyses:
            return {"error": "No successful analyses to generate report"}
        
        # Aggregate data
        all_missing_skills = []
        all_matching_skills = []
        match_percentages = []
        
        for analysis in analyses:
            skill_gap = analysis.get('skill_gap_analysis', {})
            all_missing_skills.extend(skill_gap.get('missing_skills', []))
            all_matching_skills.extend(skill_gap.get('matching_skills', []))
            
            # Extract match percentage if available
            match_pct = analysis.get('job_match_assessment', {}).get('overall_match_percentage', '')
            if isinstance(match_pct, str) and '%' in match_pct:
                try:
                    match_percentages.append(int(match_pct.replace('%', '')))
                except ValueError:
                    pass
            elif isinstance(match_pct, (int, float)):
                match_percentages.append(int(match_pct))
        
        # Find most common missing skills
        from collections import Counter
        missing_skills_count = Counter(all_missing_skills)
        most_common_missing = missing_skills_count.most_common(10)
        
        matching_skills_count = Counter(all_matching_skills)
        most_common_matching = matching_skills_count.most_common(10)
        
        # Calculate average match percentage
        avg_match = sum(match_percentages) / len(match_percentages) if match_percentages else 0
        
        return {
            "summary": {
                "total_jobs_analyzed": len(analyses),
                "average_match_percentage": f"{avg_match:.1f}%",
                "most_common_missing_skills": [skill for skill, count in most_common_missing],
                "strongest_skills": [skill for skill, count in most_common_matching]
            },
            "recommendations": {
                "top_skills_to_develop": [skill for skill, count in most_common_missing[:5]],
                "career_readiness": "good" if avg_match > 70 else "needs_improvement" if avg_match > 50 else "significant_gaps",
                "next_steps": self._generate_next_steps(most_common_missing[:5], avg_match)
            },
            "job_analyses": analyses
        }
    
    def _generate_next_steps(self, top_missing_skills: List[Tuple[str, int]], avg_match: float) -> List[str]:
        """Generate actionable next steps based on analysis"""
        steps = []
        
        if avg_match < 50:
            steps.append("Focus on building foundational skills before applying to these positions")
        elif avg_match < 70:
            steps.append("Develop 2-3 key missing skills to improve job readiness")
        else:
            steps.append("You're well-positioned for these roles - consider applying!")
        
        if top_missing_skills:
            steps.append(f"Priority learning areas: {', '.join([skill[0] for skill in top_missing_skills[:3]])}")
        
        steps.extend([
            "Build portfolio projects demonstrating new skills",
            "Update resume to highlight relevant experience",
            "Practice behavioral interviews using STAR method",
            "Network with professionals in your target companies"
        ])
        
        return steps