from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
import re
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Update the current directory path
current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(current_dir, 'models')

# Initialize models with new path
model = SentenceTransformer('all-MiniLM-L6-v2')

# Skill categories
SKILL_CATEGORIES = {
    "Computer Science & IT": [
        "C++", "JavaScript", "Node.js", "Python", "PyTorch", "TensorFlow", "React",
        "AWS", "APIs", "Systems", "Infrastructure", "Integration", "Analytics", "BI",
        "Data", "Deep Learning", "Machine Learning", "NLP", "Intelligence", "Algorithms",
        "SQL", "Tableau", "Software", "Automation", "SCADA", "PLC", "RTOS", "ROS",
        "FPGA", "Microcontrollers", "Digital Systems", "Workflows"
    ],
    "Healthcare & Life Sciences": [
        "Healthcare", "Medical", "Patient Care", "Clinical Trials", "EHR", "Telehealth",
        "Pharmacy", "Health Records", "Biochemistry", "Drug Development", "Fermentation",
        "FDA", "CDISC", "GCP", "HIPAA", "Quality Management", "Medical Devices",
        "Research", "Digital Health"
    ],
    "Management & Business": [
        "Finance", "Investment", "Portfolio Management", "Trading", "Budgeting",
        "Forecasting", "Risk Management", "Strategic Planning", "Leadership",
        "Business Development", "Project Management", "Agile", "Scrum", "Supply Chain",
        "Operations", "Marketing", "Sales", "Customer Relations"
    ],
    "Engineering & Industrial": [
        "Aerodynamics", "Structural Engineering", "Mechanical Engineering",
        "Electrical Engineering", "Circuit Design", "Signal Processing",
        "Power Systems", "Manufacturing", "Process Engineering", "Industrial Design",
        "CAD", "AutoCAD", "SolidWorks", "3D Modeling", "Robotics"
    ],
    "Science & Research": [
        "Mathematics", "Statistics", "R", "Data Analysis", "Research Methods",
        "Scientific Writing", "Laboratory Techniques", "Experimental Design",
        "Physics", "Chemistry", "Biology", "Environmental Science"
    ]
}

# Expanded job roles with categorized skills
JOB_ROLES = {
    "Full Stack Developer": {
        "category": "Computer Science & IT",
        "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Python", "AWS", "APIs", "SQL"]
    },
    "Data Scientist": {
        "category": "Computer Science & IT",
        "skills": ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow", "Data Analysis"]
    },
    "Healthcare Software Engineer": {
        "category": "Healthcare & Life Sciences",
        "skills": ["Python", "Healthcare", "EHR", "HIPAA", "APIs", "Medical Systems"]
    },
    "Business Analyst": {
        "category": "Management & Business",
        "skills": ["Data Analysis", "SQL", "Business Intelligence", "Project Management", "Reporting"]
    },
    "Robotics Engineer": {
        "category": "Engineering & Industrial",
        "skills": ["ROS", "Python", "C++", "Robotics", "Control Systems", "Sensors"]
    },
    "Research Scientist": {
        "category": "Science & Research",
        "skills": ["Python", "R", "Statistics", "Research Methods", "Data Analysis", "Scientific Writing"]
    }
}

class SkillsInput(BaseModel):
    skills: List[str]

def clean_skills(skills: List[str]) -> List[str]:
    """Clean and standardize skill names"""
    return [re.sub(r'[^\w\s]', '', skill).lower().strip() for skill in skills]

@app.post("/career-recommendations")
async def get_recommendations(skills_input: SkillsInput):
    try:
        if not skills_input.skills:
            raise HTTPException(status_code=400, detail="No skills provided")

        user_skills = clean_skills(skills_input.skills)
        user_skills_set = set(user_skills)
        user_skills_text = " ".join(user_skills)
        user_embedding = model.encode(user_skills_text)
        
        recommendations = []
        for job_role, details in JOB_ROLES.items():
            job_skills_text = " ".join(details["skills"])
            job_embedding = model.encode(job_skills_text)
            
            similarity = np.dot(user_embedding, job_embedding) / (
                np.linalg.norm(user_embedding) * np.linalg.norm(job_embedding)
            )
            similarity_score = float(similarity * 100)
            
            missing_skills = set(details["skills"]) - user_skills_set
            
            recommendations.append({
                'job_role': job_role,
                'category': details["category"],
                'similarity_score': similarity_score,
                'missing_skills': ', '.join(sorted(missing_skills)) if missing_skills else 'None'
            })
        
        recommendations.sort(key=lambda x: x['similarity_score'], reverse=True)
        return recommendations[:10]

    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/available-skills")
async def get_available_skills():
    """Return list of all available skills by category"""
    try:
        return {
            "categories": SKILL_CATEGORIES,
            "all_skills": sorted(set(
                skill for skills in SKILL_CATEGORIES.values() for skill in skills
            ))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/job-categories")
async def get_job_categories():
    """Return all job categories and their roles"""
    try:
        categories = {}
        for role, details in JOB_ROLES.items():
            category = details["category"]
            if category not in categories:
                categories[category] = []
            categories[category].append(role)
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app", 
        host="127.0.0.1", 
        port=5002, 
        reload=True,
        workers=1
    ) 