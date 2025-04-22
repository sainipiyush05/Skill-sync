from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import joblib
import numpy as np
import os
import json
import logging

# Import routes
from routes import leetcode, codechef, hackerrank  # Add this line

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("skillsync_api")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Update paths
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
models_dir = os.path.join(current_dir, 'Models')

# Define job categories and skills
JOB_CATEGORIES = {
    "Software Development": ["Python", "JavaScript", "Java", "C++", "React", "Node.js"],
    "Data Science": ["Python", "R", "Machine Learning", "SQL", "Statistics"],
    "Cloud Computing": ["AWS", "Azure", "Docker", "Kubernetes"],
    "Cybersecurity": ["Network Security", "Cryptography", "Security Tools"],
    "DevOps": ["CI/CD", "Docker", "Kubernetes", "Jenkins"],
    "Web Development": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    "Mobile Development": ["Android", "iOS", "React Native", "Flutter"],
    "Database": ["SQL", "MongoDB", "PostgreSQL", "Redis"],
    "AI/ML": ["Python", "TensorFlow", "PyTorch", "NLP"],
    "System Design": ["Architecture", "Scalability", "System Design Patterns"]
}

# Load the job data
try:
    print(f"Looking for job data in: {models_dir}")
    job_data_path = os.path.join(models_dir, 'processed_job_data.pkl')
    print(f"Loading job data from: {job_data_path}")
    job_data = joblib.load(job_data_path)
    print("Job data loaded successfully")
except Exception as e:
    print(f"Error loading job data: {e}")
    # Initialize with default data if loading fails
    job_data = {
        category: {
            "skills": skills,
            "description": f"This is a {category} role",
            "category": category
        } for category, skills in JOB_CATEGORIES.items()
    }

class SkillsInput(BaseModel):
    skills: List[str]

def clean_skills(skills: List[str]) -> List[str]:
    """Clean and standardize skill names"""
    return [skill.lower().strip() for skill in skills]

@app.post("/career-recommendations")
async def get_recommendations(skills_input: SkillsInput):
    try:
        if not skills_input.skills:
            raise HTTPException(status_code=400, detail="No skills provided")

        # Clean and prepare input skills
        user_skills = clean_skills(skills_input.skills)
        
        recommendations = []
        for job_title, job_info in job_data.items():
            # Calculate skill match percentage
            required_skills = set([skill.lower() for skill in job_info['skills']])  # Convert to lowercase
            user_skills_set = set([skill.lower() for skill in user_skills])  # Convert to lowercase
            
            # Calculate similarity based on skill overlap
            common_skills = required_skills.intersection(user_skills_set)
            
            # Calculate match percentage based on both required and user skills
            total_unique_skills = len(required_skills.union(user_skills_set))
            if total_unique_skills > 0:
                similarity_score = (len(common_skills) / total_unique_skills) * 100
            else:
                similarity_score = 0
            
            # Find missing skills
            missing_skills = required_skills - user_skills_set
            
            # Get job description
            job_description = job_info.get('description', 
                f"This role requires expertise in {', '.join(required_skills)}")
            
            # Create recommendation object
            recommendations.append({
                'title': job_title,
                'category': job_info['category'],
                'match': round(similarity_score, 2),
                'description': job_description,
                'missing_skills': sorted(list(missing_skills)),
                'skills': sorted(list(common_skills))  # Only include matched skills
            })
        
        # Sort recommendations by similarity score
        recommendations.sort(key=lambda x: x['match'], reverse=True)
        
        # Print debug information
        print(f"User skills: {user_skills}")
        print(f"First recommendation match: {recommendations[0]['match']}%")
        
        # Return top 10 recommendations
        return recommendations[:10]

    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/available-skills")
async def get_available_skills():
    """Return list of all available skills from the job data"""
    try:
        all_skills = set()
        categories = {}
        
        for job_title, job_info in job_data.items():
            category = job_info['category']
            if category not in categories:
                categories[category] = set()
            
            job_skills = set(job_info['skills'])
            categories[category].update(job_skills)
            all_skills.update(job_skills)
        
        return {
            "categories": {
                category: sorted(list(skills))
                for category, skills in categories.items()
            },
            "all_skills": sorted(list(all_skills))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/job-categories")
async def get_job_categories():
    """Return all job categories and their roles"""
    try:
        categories = {}
        for job_title, job_info in job_data.items():
            category = job_info['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(job_title)
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include coding stats routers
app.include_router(leetcode.router)
app.include_router(codechef.router)
app.include_router(hackerrank.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5002, reload=True) 