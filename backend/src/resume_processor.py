# backend/src/resume_processor.py
import os
import re
import json
from typing import Dict, List, Any
import PyPDF2
import docx
# from sentence_transformers import SentenceTransformer
from langchain_huggingface import HuggingFaceEndpointEmbeddings
import pinecone
from pinecone import Pinecone
import numpy as np
from dotenv import load_dotenv
import hashlib

load_dotenv()

class ResumeProcessor:
    def __init__(self):
        hf_token = os.getenv("HF_API_TOKEN")
        if not hf_token:
            raise ValueError("HF_API_TOKEN not found in .env")
        self.model = HuggingFaceEndpointEmbeddings(
           model="sentence-transformers/all-MiniLM-L6-v2",
            huggingfacehub_api_token=hf_token
        )

        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        
        # Create or connect to index
        index_name = "job-recommender"
        if index_name not in self.pc.list_indexes().names():
            self.pc.create_index(
                name=index_name,
                dimension=384,  # all-MiniLM-L6-v2 dimension
                metric='cosine'
            )
        self.index = self.pc.Index(index_name)
    
    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extract text from uploaded PDF file"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            raise Exception(f"Error reading PDF: {str(e)}")
    
    def extract_text_from_docx(self, docx_file) -> str:
        """Extract text from uploaded DOCX file"""
        try:
            doc = docx.Document(docx_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            raise Exception(f"Error reading DOCX: {str(e)}")
    
    def extract_resume_info(self, resume_text: str) -> Dict[str, Any]:
        """Extract structured information from resume text"""
        
        # Basic regex patterns for extraction
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        # Extract basic info
        emails = re.findall(email_pattern, resume_text)
        phones = re.findall(phone_pattern, resume_text)
        
        # Extract sections (simple approach)
        sections = {
            'education': self._extract_section(resume_text, ['education', 'academic', 'qualification']),
            'experience': self._extract_section(resume_text, ['experience', 'work', 'employment', 'career']),
            'skills': self._extract_section(resume_text, ['skills', 'technical skills', 'competencies']),
            'projects': self._extract_section(resume_text, ['projects', 'personal projects'])
        }
        
        # Extract skills more specifically
        skills = self._extract_skills(resume_text)
        
        return {
            'raw_text': resume_text,
            'email': emails[0] if emails else None,
            'phone': phones[0] if phones else None,
            'sections': sections,
            'extracted_skills': skills,
            'summary': self._generate_summary(resume_text)
        }
    
    def _extract_section(self, text: str, keywords: List[str]) -> str:
        """Extract text sections based on keywords"""
        lines = text.split('\n')
        section_content = []
        in_section = False
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if this line starts a relevant section
            if any(keyword in line_lower for keyword in keywords):
                in_section = True
                section_content.append(line)
                continue
            
            # Check if we've moved to a different section
            section_indicators = ['education', 'experience', 'skills', 'projects', 'summary', 'objective']
            if in_section and any(indicator in line_lower for indicator in section_indicators):
                if not any(keyword in line_lower for keyword in keywords):
                    break
            
            if in_section and line.strip():
                section_content.append(line)
        
        return '\n'.join(section_content)
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills directly from the skills section of resume"""
        # Get the skills section
        skills_section = self._extract_section(text, ['skills', 'technical skills', 'competencies', 'core competencies'])
        
        if not skills_section.strip():
            return []
        
        # Clean and parse skills from the section
        skills = []
        lines = skills_section.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.lower().startswith(('skills', 'technical skills', 'competencies')):
                continue
            
            # Remove common prefixes and bullet points
            line = re.sub(r'^[â€¢\-\*\+]\s*', '', line)
            line = re.sub(r'^\d+\.\s*', '', line)
            
            # Split by common delimiters
            if any(delimiter in line for delimiter in [',', '|', 'â€¢', ';']):
                # Split by delimiters
                parts = re.split(r'[,|â€¢;]+', line)
                for part in parts:
                    skill = part.strip()
                    if skill and len(skill) > 1:
                        skills.append(skill)
            else:
                # If no delimiters, treat the whole line as a skill
                if len(line) > 1:
                    skills.append(line)
        
        # Clean up and deduplicate
        cleaned_skills = []
        for skill in skills:
            skill = skill.strip().title()
            if skill and skill not in cleaned_skills and len(skill) > 1:
                cleaned_skills.append(skill)
        
        return cleaned_skills
    
    def _generate_summary(self, text: str) -> str:
        """Generate a brief summary of the resume"""
        lines = text.split('\n')
        first_50_words = ' '.join(text.split()[:50])
        return first_50_words + "..." if len(text.split()) > 50 else first_50_words
    
    def create_resume_embedding(self, resume_info: Dict[str, Any]) -> np.ndarray:
        """Create vector embedding for resume"""
        # Combine key information for embedding
        text_for_embedding = f"""
        Skills: {', '.join(resume_info.get('extracted_skills', []))}
        Experience: {resume_info['sections'].get('experience', '')}
        Education: {resume_info['sections'].get('education', '')}
        Projects: {resume_info['sections'].get('projects', '')}
        Summary: {resume_info.get('summary', '')}
        """
        
        embedding = list(self.model.embed_query(text_for_embedding.strip()))


        return embedding
    
    def create_job_embedding(self, job_data: Dict[str, Any]) -> np.ndarray:
        """Create vector embedding for job posting"""
        # Combine job information for embedding
        text_for_embedding = f"""
        Title: {job_data.get('title', '')}
        Company: {job_data.get('company_name', '')}
        Description: {job_data.get('description', '')}
        Requirements: {job_data.get('requirements', '')}
        Location: {job_data.get('location', '')}
        """
        
        embedding = list(self.model.embed_query(text_for_embedding.strip()))


        return embedding
    
    def store_resume_in_pinecone(self, resume_info: Dict[str, Any], user_id: str):
        """Store resume embedding in Pinecone"""
        embedding = self.create_resume_embedding(resume_info)
        
        # Create unique ID for resume
        resume_id = f"resume_{user_id}_{hashlib.md5(resume_info['raw_text'][:100].encode()).hexdigest()[:8]}"
        
        # Store in Pinecone
        try:
            upsert_response = self.index.upsert(vectors=[{
                'id': resume_id,
                'values': embedding,
                'metadata': {
                    'type': 'resume',
                    'user_id': user_id,
                    'skills': resume_info.get('extracted_skills', []),
                    'email': resume_info.get('email', ''),
                    'summary': resume_info.get('summary', '')[:500]  # Limit summary length
                }
            }])
            print(f"Resume upserted successfully: {resume_id}")
        except Exception as e:
            print(f"Error upserting resume: {e}")
            raise
        
        return resume_id
    
    def store_jobs_in_pinecone(self, jobs: List[Dict[str, Any]], query_id: str):
        """Store job embeddings in Pinecone"""
        job_ids = []
        vectors = []
        
        for i, job in enumerate(jobs):
            embedding = self.create_job_embedding(job)
            job_id = f"job_{query_id}_{i}_{hashlib.md5(str(job).encode()).hexdigest()[:8]}"
            job_ids.append(job_id)
            
            # Normalize metadata keys: include both company and company_name to avoid mismatch
            metadata = {
                'type': 'job',
                'query_id': query_id,
                'title': job.get('title', '') or job.get('job_title', ''),
                'company': job.get('company_name') or job.get('company') or '',
                'company_name': job.get('company_name') or job.get('company') or '',
                'location': job.get('location', ''),
                'apply_link': job.get('apply_link') or (job.get('detected_extensions') or {}).get('apply_link') or '',
                'description': job.get('description', '') or "",
            }
            
            vectors.append({
                'id': job_id,
                'values': embedding,
                'metadata': metadata
            })
            # Debug print per job
            print(f"Preparing upsert vector: id={job_id}, title={metadata['title']}, company={metadata['company']}, apply_link={metadata['apply_link']}")
        
        # Batch upsert to Pinecone
        try:
            upsert_response = self.index.upsert(vectors=vectors)
            print(f"Jobs upserted successfully: {len(job_ids)} jobs")
            return job_ids
        except Exception as e:
            print(f"Error upserting jobs: {e}")
            raise

        
        
    
    def find_similar_jobs(self, resume_id: str, top_k: int = 10, query_id: str = None) -> list:
        """
        Find jobs similar to the resume.
        If query_id is provided, restrict search to that specific job batch.
        """
        # Fetch resume vector (defensive)
        try:
            resume_vector = self.index.fetch(ids=[resume_id])
            if isinstance(resume_vector, dict) and 'vectors' in resume_vector:
                vectors_data = resume_vector['vectors']
            elif hasattr(resume_vector, 'vectors'):
                vectors_data = resume_vector.vectors
            else:
                raise ValueError(f"Unexpected resume_vector format: {type(resume_vector)}")

            if not vectors_data or resume_id not in vectors_data:
                raise ValueError("Resume not found in index")
            resume_embedding = vectors_data[resume_id]['values']
        except Exception as e:
            print(f"Error fetching resume vector: {e}")
            raise

        # Build filter: always filter by type=job; optionally by query_id to restrict to the just-upserted batch
        filter_dict = {'type': 'job'}
        if query_id:
            filter_dict['query_id'] = query_id
        print(f"Querying index with filter: {filter_dict} top_k request: {max(10, top_k * 2)}")

        # Query (request extra results to allow light dedupe if needed)
        results = self.index.query(
            vector=resume_embedding,
            filter=filter_dict,
            top_k=max(10, top_k * 2),
            include_metadata=True
        )

        # Normalize result extraction
        matches = []
        if isinstance(results, dict):
            matches = results.get('matches', []) or []
        elif hasattr(results, 'matches'):
            matches = results.matches or []
        print(f"Total matches returned by index query: {len(matches)}")

        similar_jobs = []
        seen_ids = set()  # dedupe by match id (not by metadata tuple)
        for m_idx, match in enumerate(matches):
            # Extract id, score, metadata defensively
            if isinstance(match, dict):
                match_id = match.get('id')
                score = match.get('score') or match.get('distance')
                metadata = match.get('metadata', {}) or {}
            else:
                match_id = getattr(match, 'id', None)
                score = getattr(match, 'score', None)
                metadata = getattr(match, 'metadata', {}) or {}

            # Skip if we've already added this exact vector id
            if match_id in seen_ids:
                print(f"Skipping duplicate match id: {match_id}")
                continue
            seen_ids.add(match_id)

            # Normalize metadata fields
            title = metadata.get('title') or metadata.get('job_title') or ""
            company = metadata.get('company') or metadata.get('company_name') or ""
            location = metadata.get('location') or ""
            apply_link = (metadata.get('apply_link') or metadata.get('apply_url') or metadata.get('share_link') or "")

            job_info = {
                'title': title,
                'company': company,
                'location': location,
                'apply_link': apply_link,
                'description': metadata.get('description', ''),
                'similarity_score': score,
                'job_id': match_id
            }

            print(f"Adding similar job (match #{m_idx+1}): id={match_id}, title={title}, company={company}, apply_link_present={bool(apply_link)}")
            similar_jobs.append(job_info)

            if len(similar_jobs) >= top_k:
                break

        print(f"Total unique similar jobs returned: {len(similar_jobs)}")
        return similar_jobs
