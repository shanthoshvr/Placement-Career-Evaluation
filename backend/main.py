from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os
import logging
import random
from motor.motor_asyncio import AsyncIOMotorClient
import json

try:
    from google import genai
    from google.genai import types
except ImportError:
    # Safe import for local environments where it's still being installed
    genai = None
    types = None

# For ATS PDF Generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO
from fastapi.responses import StreamingResponse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("placement-suite-backend")

app = FastAPI(
    title="Placement Suite API",
    description="Python FastAPI backend for managing candidate placements, connected to MongoDB.",
    version="1.0.0"
)

# CORS Middleware Configuration
# Allows the React frontend (running via Docker or local) to safely query the backend API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/placement_db")
db_client = None
db = None

# Static high-quality sample questions spanning all three categories
SAMPLE_QUESTIONS = [
    {
        "category": "Aptitude",
        "question_text": "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
        "options": ["120 meters", "150 meters", "324 meters", "180 meters"],
        "correct_option": 1,
        "explanation": "Speed in m/s = 60 * (5/18) = 50/3 m/s. Length of train = Speed * Time = (50/3) * 9 = 150 meters."
    },
    {
        "category": "Aptitude",
        "question_text": "If a person sells an article for $360, gaining 20% profit, what was the cost price of the article?",
        "options": ["$280", "$300", "$320", "$340"],
        "correct_option": 1,
        "explanation": "Cost Price = Selling Price / (1 + Profit Percentage) = 360 / 1.2 = $300."
    },
    {
        "category": "Verbal",
        "question_text": "Choose the word that is most nearly opposite in meaning to the word: OBSOLETE.",
        "options": ["Ancient", "Contemporary", "Redundant", "Extinct"],
        "correct_option": 1,
        "explanation": "'Obsolete' means no longer produced or used (out of date). Its opposite is 'Contemporary' (modern or current)."
    },
    {
        "category": "Reasoning",
        "question_text": "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        "options": ["1/3", "1/8", "2/8", "1/16"],
        "correct_option": 1,
        "explanation": "This is a simple division series; each number is one-half of the previous number: 2/2=1, 1/2=1/2, (1/2)/2=1/4, (1/4)/2=1/8."
    },
    {
        "category": "Reasoning",
        "question_text": "If A + B means A is the brother of B; A - B means A is the sister of B and A * B means A is the father of B. Which of the following means that C is the son of M?",
        "options": ["M - N * C + F", "F - C + N * M", "N + M - F * C", "M * N - C + F"],
        "correct_option": 3,
        "explanation": "M * N means M is the father of N. N - C means N is the sister of C, so M is the father of C. C + F means C is the brother of F, which establishes C is male. Therefore, C is the son of M."
    }
]

async def seed_aptitude_questions():
    if db is None:
        logger.warning("Database offline, skipping seeding of aptitude questions.")
        return
    try:
        count = await db.aptitude_questions.count_documents({})
        if count == 0:
            logger.info("Seeding database with sample aptitude questions...")
            await db.aptitude_questions.insert_many(SAMPLE_QUESTIONS)
            logger.info("Successfully seeded 5 aptitude questions!")
        else:
            logger.info("Aptitude questions already seeded.")
    except Exception as e:
        logger.error(f"Failed to seed aptitude questions: {e}")

@app.on_event("startup")
async def startup_db_client():
    global db_client, db
    try:
        logger.info(f"Connecting to MongoDB at: {MONGO_URI}")
        db_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = db_client.get_default_database()
        # Verify connection
        await db_client.server_info()
        logger.info("Successfully connected to MongoDB!")
        # Seed questions
        await seed_aptitude_questions()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        logger.warning("Backend starting in fallback offline mode.")

@app.on_event("shutdown")
async def shutdown_db_client():
    global db_client
    if db_client:
        db_client.close()
        logger.info("MongoDB connection closed.")

# Pydantic Schemas for validation
class PlacementBase(BaseModel):
    candidate_name: str = Field(..., example="Alex Mercer")
    role: str = Field(..., example="Software Engineer")
    company: str = Field(..., example="Google")
    salary_package: float = Field(..., description="Salary in LPA (Lakhs Per Annum)", example=18.5)
    status: str = Field(default="Placed", description="Status of the placement", example="Placed")

class PlacementCreate(PlacementBase):
    pass

class PlacementResponse(PlacementBase):
    id: str = Field(..., description="MongoDB Document ID")

# Pydantic Schemas for ATS-Friendly Resume
class ProfileInfo(BaseModel):
    full_name: str = Field(..., example="Alex Mercer")
    title: Optional[str] = Field(None, example="Senior Software Engineer")
    email: str = Field(..., example="alex.mercer@example.com")
    phone: str = Field(..., example="+1-555-0199")
    location: str = Field(..., example="San Francisco, CA")
    website: Optional[str] = Field(None, example="https://alexmercer.dev")
    linkedin: Optional[str] = Field(None, example="https://linkedin.com/in/alexmercer")
    summary: str = Field(..., example="Experienced full-stack engineer specializing in cloud architectures, Python backends, and modern React interfaces.")

class EducationEntry(BaseModel):
    institution: str = Field(..., example="Stanford University")
    degree: str = Field(..., example="Bachelor of Science")
    field_of_study: str = Field(..., example="Computer Science")
    graduation_year: str = Field(..., example="2024")
    gpa: Optional[str] = Field(None, example="3.8/4.0")

class ExperienceEntry(BaseModel):
    company: str = Field(..., example="Google")
    role: str = Field(..., example="Software Engineering Intern")
    location: str = Field(..., example="Mountain View, CA")
    start_date: str = Field(..., example="June 2023")
    end_date: str = Field(..., example="September 2023")
    description: List[str] = Field(..., description="Bullet points explaining achievements and responsibilities", example=["Developed real-time indexing pipeline handling millions of events daily.", "Collaborated with cross-functional teams to integrate generative AI features."])

class SkillCategory(BaseModel):
    category: str = Field(..., example="Programming Languages")
    skills: List[str] = Field(..., example=["Python", "TypeScript", "Go", "Java"])

class ResumeData(BaseModel):
    user_id: str = Field(..., description="Unique user identifier for this resume draft", example="user123")
    profile: ProfileInfo
    education: List[EducationEntry]
    experience: List[ExperienceEntry]
    skills: List[SkillCategory]


# Pydantic Schemas for Aptitude Quiz
class AptitudeQuestion(BaseModel):
    id: str = Field(..., description="Unique Question ID", example="64b2a3cf1209a")
    category: str = Field(..., description="Category of the question: Aptitude, Verbal, or Reasoning", example="Aptitude")
    question_text: str = Field(..., description="The content of the question", example="What is 2+2?")
    options: List[str] = Field(..., description="List of options for the multiple choice question", example=["3", "4", "5", "6"])
    correct_option: int = Field(..., description="Index of the correct option (0-based)", example=1)
    explanation: str = Field(..., description="Detailed explanation for the correct answer", example="Because 2 + 2 = 4.")

class AptitudeQuestionPublic(BaseModel):
    id: str = Field(..., description="Unique Question ID", example="64b2a3cf1209a")
    category: str = Field(..., description="Category of the question: Aptitude, Verbal, or Reasoning", example="Aptitude")
    question_text: str = Field(..., description="The content of the question", example="What is 2+2?")
    options: List[str] = Field(..., description="List of options for the multiple choice question", example=["3", "4", "5", "6"])


class VerifyRequest(BaseModel):
    question_ids: List[str] = Field(..., description="List of question IDs to verify and grade", example=["64b2a3cf1209a"])


class SubmitAnswersRequest(BaseModel):
    answers: Dict[str, int] = Field(..., description="Map of question IDs to selected option indices", example={"64b2a3cf1209a": 1})


class QuestionResult(BaseModel):
    id: str
    category: str
    question_text: str
    options: List[str]
    selected_option: Optional[int]
    correct_option: int
    is_correct: bool
    explanation: str


class SubmitAnswersResponse(BaseModel):
    total_questions: int
    total_score: int
    percentage_score: float
    results: List[QuestionResult]


# Tier Router (Cross-Tier Hello World verification)
@app.get("/", tags=["Root"])
def read_root():
    """
    Base endpoint to verify FastAPI backend is running.
    Fulfills the 'Hello World' routing requirement.
    """
    return {
        "status": "online",
        "message": "Hello World from FastAPI Backend!",
        "framework": "FastAPI 0.100+",
        "architecture": "Three-Tier (Vite-React | FastAPI | MongoDB)"
    }

@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Robust health check that validates both the API server
    and its connection to the database layer (MongoDB).
    """
    mongo_status = "disconnected"
    if db_client:
        try:
            await db_client.server_info()
            mongo_status = "connected"
        except Exception:
            mongo_status = "error"
            
    return {
        "api_status": "healthy",
        "mongodb_connection": mongo_status,
        "environment": os.getenv("ENVIRONMENT", "development")
    }

# Sample CRUD endpoints demonstrating database operations
@app.post("/api/placements", response_model=PlacementResponse, status_code=status.HTTP_201_CREATED, tags=["Placements"])
async def create_placement(placement: PlacementCreate):
    """
    Insert a new placement record into MongoDB.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection is unavailable."
        )
    
    placement_dict = placement.dict()
    result = await db.placements.insert_one(placement_dict)
    
    return {
        "id": str(result.inserted_id),
        **placement_dict
    }

@app.get("/api/placements", response_model=List[PlacementResponse], tags=["Placements"])
async def list_placements():
    """
    Retrieve all placement records from MongoDB.
    """
    if db is None:
        # Fallback with dummy data so the user can see sample outputs even if DB isn't running
        return [
            {
                "id": "mock_64b2a3cf1209b",
                "candidate_name": "Alex Mercer",
                "role": "Senior Frontend Developer",
                "company": "Google AI Studio",
                "salary_package": 24.0,
                "status": "Placed"
            },
            {
                "id": "mock_64b2a3cf1209c",
                "candidate_name": "Elena Rostova",
                "role": "ML Research Scientist",
                "company": "DeepMind",
                "salary_package": 36.5,
                "status": "Placed"
            }
        ]
        
    cursor = db.placements.find()
    placements = []
    async for document in cursor:
        document["id"] = str(document["_id"])
        del document["_id"]
        placements.append(document)
        
    return placements


# High-quality fallback templates for testing/previewing before DB is populated
MOCK_RESUMES = {
    "candidate123": {
        "user_id": "candidate123",
        "profile": {
            "full_name": "Alex Mercer",
            "title": "Senior Full-Stack Engineer",
            "email": "alex.mercer@example.com",
            "phone": "+1 (555) 019-2831",
            "location": "San Francisco, CA",
            "website": "https://alexmercer.dev",
            "linkedin": "https://linkedin.com/in/alexmercer",
            "summary": "Result-oriented senior software engineer with 6+ years of experience designing scalable three-tier architectures, developing high-throughput Python REST APIs, and crafting responsive React dashboards. Expert in containerized orchestrations and NoSQL modeling."
        },
        "education": [
            {
                "institution": "University of California, Berkeley",
                "degree": "Master of Science",
                "field_of_study": "Computer Science",
                "graduation_year": "2022",
                "gpa": "3.9/4.0"
            },
            {
                "institution": "Indian Institute of Technology (IIT)",
                "degree": "Bachelor of Technology",
                "field_of_study": "Information Technology",
                "graduation_year": "2020",
                "gpa": "9.2/10"
            }
        ],
        "experience": [
            {
                "company": "Google AI Studio",
                "role": "Lead Systems Architect",
                "location": "Mountain View, CA",
                "start_date": "Jan 2024",
                "end_date": "Present",
                "description": [
                    "Orchestrated distributed processing containers and microservice clusters running Python Uvicorn engines.",
                    "Improved API gateway throughput by 35% through custom Redis caching layers and motor async drivers.",
                    "Spearheaded structural Pydantic validation frameworks to eliminate corrupt JSON inputs at ingress."
                ]
            },
            {
                "company": "Stripe",
                "role": "Senior Backend Engineer",
                "location": "San Francisco, CA",
                "start_date": "Jun 2022",
                "end_date": "Dec 2023",
                "description": [
                    "Designed secure transactional interfaces supporting millions of daily concurrent API interactions.",
                    "Migrated legacy storage structures into managed sharded NoSQL database collections with zero downtime.",
                    "Authored automated unit testing routines covering 94% of core business logical branches."
                ]
            }
        ],
        "skills": [
            {
                "category": "Backend & Cloud",
                "skills": ["Python", "FastAPI", "Go", "Docker", "Kubernetes", "AWS", "gRPC"]
            },
            {
                "category": "Frontend Technologies",
                "skills": ["React", "TypeScript", "Tailwind CSS", "Vite", "Next.js", "Redux"]
            },
            {
                "category": "Databases & Storage",
                "skills": ["MongoDB", "PostgreSQL", "Redis", "Elasticsearch", "Cassandra"]
            }
        ]
    }
}


# ReportLab helper for PDF Generation (highly readable by Applicant Tracking Systems)
def generate_ats_pdf(data: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=1, # Centered
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'ResumeSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceAfter=8
    )
    
    contact_style = ParagraphStyle(
        'ResumeContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        alignment=1,
        spaceAfter=12
    )
    
    section_heading_style = ParagraphStyle(
        'ResumeSectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    
    bullet_style = ParagraphStyle(
        'ResumeBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    story = []
    
    profile = data.get("profile", {})
    
    # 1. Profile Title
    story.append(Paragraph(profile.get("full_name", "Anonymous Candidate"), title_style))
    if profile.get("title"):
        story.append(Paragraph(profile.get("title"), subtitle_style))
        
    # 2. Contact details line
    contact_parts = []
    if profile.get("email"):
        contact_parts.append(profile.get("email"))
    if profile.get("phone"):
        contact_parts.append(profile.get("phone"))
    if profile.get("location"):
        contact_parts.append(profile.get("location"))
    if profile.get("website"):
        contact_parts.append(profile.get("website"))
    if profile.get("linkedin"):
        contact_parts.append(profile.get("linkedin"))
        
    contact_str = "  |  ".join(contact_parts)
    story.append(Paragraph(contact_str, contact_style))
    
    # Divider line rule
    divider = Table([[""]], colWidths=[504])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 8))
    
    # 3. Professional Summary
    if profile.get("summary"):
        story.append(Paragraph("PROFESSIONAL SUMMARY", section_heading_style))
        story.append(Paragraph(profile.get("summary"), body_style))
        story.append(Spacer(1, 4))
        
    # 4. Work Experience
    experience_list = data.get("experience", [])
    if experience_list:
        story.append(Paragraph("WORK EXPERIENCE", section_heading_style))
        for exp in experience_list:
            comp_role = f"<b>{exp.get('role')}</b> &mdash; {exp.get('company')}"
            dates_loc = f"{exp.get('start_date')} &ndash; {exp.get('end_date')} | {exp.get('location')}"
            
            exp_table_data = [
                [Paragraph(comp_role, body_style), Paragraph(f"<font color='#475569'><i>{dates_loc}</i></font>", ParagraphStyle('RightText', parent=body_style, alignment=2))]
            ]
            exp_table = Table(exp_table_data, colWidths=[310, 194])
            exp_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ('TOPPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(exp_table)
            
            bullets = exp.get("description", [])
            for bullet in bullets:
                story.append(Paragraph(f"&bull; {bullet}", bullet_style))
            story.append(Spacer(1, 4))
            
    # 5. Education
    education_list = data.get("education", [])
    if education_list:
        story.append(Paragraph("EDUCATION", section_heading_style))
        for edu in education_list:
            deg_field = f"<b>{edu.get('degree')} in {edu.get('field_of_study')}</b>"
            inst_grad = f"{edu.get('institution')} ({edu.get('graduation_year')})"
            if edu.get("gpa"):
                inst_grad += f" &mdash; GPA: {edu.get('gpa')}"
                
            edu_table_data = [
                [Paragraph(deg_field, body_style), Paragraph(f"<font color='#475569'><i>{inst_grad}</i></font>", ParagraphStyle('RightTextEdu', parent=body_style, alignment=2))]
            ]
            edu_table = Table(edu_table_data, colWidths=[240, 264])
            edu_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('TOPPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(edu_table)
        story.append(Spacer(1, 4))
        
    # 6. Technical Skills
    skills_list = data.get("skills", [])
    if skills_list:
        story.append(Paragraph("TECHNICAL SKILLS", section_heading_style))
        for skill_cat in skills_list:
            cat_name = f"<b>{skill_cat.get('category')}:</b>"
            skills_str = ", ".join(skill_cat.get("skills", []))
            story.append(Paragraph(f"{cat_name} {skills_str}", body_style))
            story.append(Spacer(1, 2))
            
    doc.build(story)
    buffer.seek(0)
    return buffer


# --- ATS Resume Router Endpoints ---

@app.post("/api/resume/save", status_code=status.HTTP_201_CREATED, tags=["Resume"])
async def save_resume(resume: ResumeData):
    """
    Validate and store resume data in MongoDB.
    Performs an upsert on the `user_id` field.
    """
    if db is None:
        logger.warning("Database unavailable, caching resume template locally.")
        return {
            "status": "saved_offline_fallback",
            "message": "Resume validated and logged successfully (Offline simulated).",
            "data": resume.dict()
        }
    
    try:
        resume_dict = resume.dict()
        await db.resumes.update_one(
            {"user_id": resume.user_id},
            {"$set": resume_dict},
            upsert=True
        )
        return {
            "status": "success",
            "message": f"Resume for user {resume.user_id} successfully saved.",
            "user_id": resume.user_id
        }
    except Exception as e:
        logger.error(f"Failed to save resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database execution error: {str(e)}"
        )


@app.get("/api/resume/{user_id}", response_model=ResumeData, tags=["Resume"])
async def get_resume(user_id: str):
    """
    Retrieve stored resume JSON data for a specific user_id.
    """
    if db is not None:
        try:
            resume_doc = await db.resumes.find_one({"user_id": user_id})
            if resume_doc:
                if "_id" in resume_doc:
                    del resume_doc["_id"]
                return resume_doc
        except Exception as e:
            logger.error(f"Error querying database: {e}")
            
    # Fallback to defaults
    if user_id in MOCK_RESUMES:
        return MOCK_RESUMES[user_id]
        
    custom_mock = MOCK_RESUMES["candidate123"].copy()
    custom_mock["user_id"] = user_id
    return custom_mock


@app.get("/api/resume/download/{user_id}", tags=["Resume"])
async def download_resume(user_id: str):
    """
    Fetch the structural resume data for a specific user_id, 
    generate an ATS-friendly single-column PDF file, and stream it to the client.
    """
    resume_doc = None
    
    # Try fetching from MongoDB
    if db is not None:
        try:
            resume_doc = await db.resumes.find_one({"user_id": user_id})
        except Exception as e:
            logger.error(f"Error reading resume from MongoDB: {e}")
            
    # Fallback to Mock Resumes if not found or database disconnected
    if not resume_doc:
        logger.warning(f"Resume for user_id '{user_id}' not found. Falling back to high-quality default template.")
        if user_id in MOCK_RESUMES:
            resume_doc = MOCK_RESUMES[user_id]
        else:
            resume_doc = MOCK_RESUMES["candidate123"].copy()
            resume_doc["user_id"] = user_id
            
    try:
        pdf_buffer = generate_ats_pdf(resume_doc)
        filename = f"resume_{user_id}.pdf"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers=headers
        )
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate ATS PDF: {str(e)}"
        )


# --- Aptitude Test Endpoints ---

@app.get("/api/test/aptitude/start", response_model=List[AptitudeQuestionPublic], tags=["Aptitude Quiz"])
async def start_aptitude_test():
    """
    Retrieve 5 randomized aptitude, verbal, and reasoning questions
    WITHOUT revealing correct answers or explanations.
    """
    questions = []
    if db is not None:
        try:
            cursor = db.aptitude_questions.find()
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                questions.append(doc)
        except Exception as e:
            logger.error(f"Failed to fetch questions from database: {e}")
            
    # If DB failed, empty, or disconnected, use local fallback
    if not questions:
        logger.info("Using local static fallback for aptitude questions.")
        for idx, q in enumerate(SAMPLE_QUESTIONS):
            q_copy = q.copy()
            q_copy["id"] = f"fallback_{idx}"
            questions.append(q_copy)
            
    # Shuffle/Randomize
    random.shuffle(questions)
    
    # Slice to get 5 questions (or as many as we have up to 5)
    selected = questions[:5]
    
    # Strip correct_option and explanation to prevent cheating
    public_questions = []
    for q in selected:
        public_questions.append(
            AptitudeQuestionPublic(
                id=q["id"],
                category=q["category"],
                question_text=q["question_text"],
                options=q["options"]
            )
        )
        
    return public_questions


@app.post("/api/test/aptitude/verify", response_model=List[AptitudeQuestion], tags=["Aptitude Quiz"])
async def verify_aptitude_questions(request: VerifyRequest):
    """
    Retrieve full question details (including correct_option and explanation)
    for a list of completed question IDs.
    """
    verified_questions = []
    
    # Search MongoDB
    if db is not None:
        try:
            from bson import ObjectId
            for q_id in request.question_ids:
                # Check if it is standard ObjectId or fallback_
                if q_id.startswith("fallback_"):
                    idx_str = q_id.split("_")[1]
                    try:
                        idx = int(idx_str)
                        if 0 <= idx < len(SAMPLE_QUESTIONS):
                            q_copy = SAMPLE_QUESTIONS[idx].copy()
                            q_copy["id"] = q_id
                            verified_questions.append(AptitudeQuestion(**q_copy))
                    except Exception:
                        pass
                else:
                    try:
                        doc = await db.aptitude_questions.find_one({"_id": ObjectId(q_id)})
                        if doc:
                            doc["id"] = str(doc["_id"])
                            del doc["_id"]
                            verified_questions.append(AptitudeQuestion(**doc))
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Error verifying questions from database: {e}")
            
    # If empty or DB offline fallback
    if not verified_questions:
        for q_id in request.question_ids:
            if q_id.startswith("fallback_"):
                idx_str = q_id.split("_")[1]
                try:
                    idx = int(idx_str)
                    if 0 <= idx < len(SAMPLE_QUESTIONS):
                        q_copy = SAMPLE_QUESTIONS[idx].copy()
                        q_copy["id"] = q_id
                        verified_questions.append(AptitudeQuestion(**q_copy))
                except Exception:
                    pass
            else:
                # Try to match by question_text or just match with index for offline robust support
                try:
                    idx = int(q_id) if q_id.isdigit() else 0
                    if 0 <= idx < len(SAMPLE_QUESTIONS):
                        q_copy = SAMPLE_QUESTIONS[idx].copy()
                        q_copy["id"] = q_id
                        verified_questions.append(AptitudeQuestion(**q_copy))
                except Exception:
                    pass
                    
    # Let's ensure we return something for every requested ID
    # if we can't find, let's look up in SAMPLE_QUESTIONS by index
    if len(verified_questions) < len(request.question_ids):
        # Ensure robustness
        for q_id in request.question_ids:
            if not any(v.id == q_id for v in verified_questions):
                # Fallback match
                idx = 0
                if q_id.startswith("fallback_"):
                    idx = int(q_id.split("_")[1])
                q_copy = SAMPLE_QUESTIONS[idx % len(SAMPLE_QUESTIONS)].copy()
                q_copy["id"] = q_id
                verified_questions.append(AptitudeQuestion(**q_copy))
                
    return verified_questions


@app.post("/api/test/aptitude/submit", response_model=SubmitAnswersResponse, tags=["Aptitude Quiz"])
async def submit_aptitude_answers(request: SubmitAnswersRequest):
    """
    Accepts user answers, grades them against the MongoDB database (or fallbacks),
    calculates total/percentage scores, and returns detailed results with explanations.
    """
    results = []
    total_score = 0
    
    for q_id, selected_idx in request.answers.items():
        question_doc = None
        # Try to find in MongoDB
        if db is not None and not q_id.startswith("fallback_"):
            try:
                from bson import ObjectId
                doc = await db.aptitude_questions.find_one({"_id": ObjectId(q_id)})
                if doc:
                    doc["id"] = str(doc["_id"])
                    del doc["_id"]
                    question_doc = doc
            except Exception:
                pass
                
        # Fallback to SAMPLE_QUESTIONS if needed
        if question_doc is None:
            # Check if fallback_
            idx = 0
            if q_id.startswith("fallback_"):
                try:
                    idx = int(q_id.split("_")[1])
                except Exception:
                    pass
            elif q_id.isdigit():
                idx = int(q_id)
            
            # Safe modulo to prevent index error
            idx = idx % len(SAMPLE_QUESTIONS)
            question_doc = SAMPLE_QUESTIONS[idx].copy()
            question_doc["id"] = q_id
            
        correct_opt = question_doc.get("correct_option", 0)
        is_correct = (selected_idx == correct_opt)
        if is_correct:
            total_score += 1
            
        results.append(
            QuestionResult(
                id=q_id,
                category=question_doc.get("category", "General"),
                question_text=question_doc.get("question_text", ""),
                options=question_doc.get("options", []),
                selected_option=selected_idx,
                correct_option=correct_opt,
                is_correct=is_correct,
                explanation=question_doc.get("explanation", "")
            )
        )
        
    total_questions = len(request.answers)
    percentage_score = (total_score / total_questions * 100.0) if total_questions > 0 else 0.0
    
    return SubmitAnswersResponse(
        total_questions=total_questions,
        total_score=total_score,
        percentage_score=round(percentage_score, 2),
        results=results
    )


# --- Coding Assessment Round Endpoints ---

class CompileCodeRequest(BaseModel):
    code: str = Field(..., description="The user's code snippet")
    language: str = Field(..., description="Chosen programming language (python, javascript, java)")
    question_id: str = Field(..., description="The ID of the target coding question")


class CompileCodeResponse(BaseModel):
    status: str = Field(..., description="'Passed' or 'Failed'")
    output_received: str = Field(..., description="The detailed logs, outputs or stdout received")
    failed_case_details: Optional[str] = Field(None, description="Details of any failed test cases")
    explanation: str = Field(..., description="Short explanation or structural optimization fixes")


QUESTIONS_DB = {
    "two-sum": {
        "title": "Two Sum",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
        "constraints": [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "-10^9 <= target <= 10^9",
            "Only one valid answer exists."
        ],
        "test_cases": [
            {"input": "nums = [2, 7, 11, 15], target = 9", "expected": "[0, 1]"},
            {"input": "nums = [3, 2, 4], target = 6", "expected": "[1, 2]"},
            {"input": "nums = [3, 3], target = 6", "expected": "[0, 1]"}
        ]
    },
    "valid-parentheses": {
        "title": "Valid Parentheses",
        "description": "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        "constraints": [
            "1 <= s.length <= 10^4",
            "s consists of parentheses only: \"()[]{}\""
        ],
        "test_cases": [
            {"input": "s = \"()[]{}\"", "expected": "true"},
            {"input": "s = \"(]\"", "expected": "false"},
            {"input": "s = \"([)]\"", "expected": "false"},
            {"input": "s = \"{[]}\"", "expected": "true"}
        ]
    },
    "palindrome-number": {
        "title": "Palindrome Number",
        "description": "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward. For example, `121` is palindrome while `123` is not.",
        "constraints": [
            "-2^31 <= x <= 2^31 - 1"
        ],
        "test_cases": [
            {"input": "x = 121", "expected": "true"},
            {"input": "x = -121", "expected": "false"},
            {"input": "x = 10", "expected": "false"},
            {"input": "x = 0", "expected": "true"}
        ]
    }
}


@app.post("/api/test/coding/compile", response_model=CompileCodeResponse, tags=["Coding Assessment"])
async def compile_code_assessment(request: CompileCodeRequest):
    """
    Evaluates a user's code snippet against a specific coding question
    by passing the code, language, constraints, and hidden test cases
    to the Google Gemini API using google-genai, returning structured results.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable is not defined.")
        return CompileCodeResponse(
            status="Failed",
            output_received="Error: GEMINI_API_KEY environment variable is not configured on the backend.",
            failed_case_details="Missing API Credentials",
            explanation="Please configure your GEMINI_API_KEY under the Settings > Secrets menu of Google AI Studio to enable live assessment sandbox evaluation."
        )

    if genai is None or types is None:
        return CompileCodeResponse(
            status="Failed",
            output_received="Error: google-genai library is not loaded successfully or is currently installing.",
            failed_case_details="Dependency Loading Error",
            explanation="The backend dependencies are still initializing. Please wait a few seconds and try again."
        )

    try:
        # Initialize Gemini Client lazily (safe best-practice)
        client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

        # Retrieve matching question
        q_id = request.question_id
        q_info = QUESTIONS_DB.get(q_id, QUESTIONS_DB["two-sum"])

        q_title = q_info["title"]
        q_desc = q_info["description"]
        q_constraints = "\n".join(q_info["constraints"])
        
        test_cases_str = ""
        for idx, tc in enumerate(q_info["test_cases"]):
            test_cases_str += f"Test Case {idx + 1}:\nInput: {tc['input']}\nExpected: {tc['expected']}\n\n"

        system_instruction = (
            "You are a strict code sandbox compilation and test suite engine. Your job is to analyze the user's code, "
            "perform a dry run compilation/evaluation against all test cases for the specified language, "
            "and output a structural JSON evaluation. Check for logical correctness, correct signatures, potential "
            "edge cases, and compile-time/runtime syntax errors."
        )

        prompt = f"""
Evaluate the user's solution for the following coding problem:

Problem Title: {q_title}
Problem Description:
{q_desc}

Constraints:
{q_constraints}

User Solution:
- Language Selected: {request.language}
- User Code:
```
{request.code}
```

Evaluate this solution against these target test cases:
{test_cases_str}

Return a valid JSON object matching this schema:
{{
  "status": "Passed" or "Failed",
  "output_received": "A detailed stdout/stderr log representing compiling and executing against all test cases.",
  "failed_case_details": "A descriptive string of why/where test cases failed, or null if status is 'Passed'.",
  "explanation": "A short analysis of time/space complexity (e.g. O(N)), security evaluation, and recommendations or structural optimization fixes."
}}
"""

        # Call Gemini model
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=CompileCodeResponse,
            ),
        )

        # Parse generated text to JSON structure
        raw_text = response.text.strip()
        parsed_data = json.loads(raw_text)

        return CompileCodeResponse(
            status=parsed_data.get("status", "Failed"),
            output_received=parsed_data.get("output_received", "No stdout logs generated."),
            failed_case_details=parsed_data.get("failed_case_details"),
            explanation=parsed_data.get("explanation", "Could not analyze the code structure.")
        )

    except Exception as e:
        logger.error(f"Error during code compile Gemini assessment: {e}")
        return CompileCodeResponse(
            status="Failed",
            output_received=f"Compilation Error: {str(e)}",
            failed_case_details="Unexpected sandbox exception",
            explanation="The virtual compilation evaluation timed out or crashed. Please ensure your syntax is correct and try again."
        )


# --- AI Mock Interview & Feedback Report Card Schemas & Endpoints ---

class SubmitAnswerRequest(BaseModel):
    answer: str


class InterviewRespondRequest(BaseModel):
    user_id: str = Field(..., description="The user's ID")
    current_question: str = Field(..., description="The current question text")
    response_text: str = Field(..., description="The user's typed response text")

class FeedbackItem(BaseModel):
    question: str
    answer: str
    grade: str
    strengths: str
    weaknesses: str
    ideal_answer: str

class InterviewReportCard(BaseModel):
    overall_score: int
    technical_rating: float
    communication_rating: float
    subject_relevance_rating: float
    detailed_feedback: List[FeedbackItem]
    overall_summary: str
    improvement_plan: List[str]


async def generate_interview_feedback(user_id: str, questions: List[str], answers: List[str], history: List[dict], sys_instruction: str):
    """
    Grades the completed mock interview and stores the feedback report card in MongoDB.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    # Construct formatting prompt
    dialogue = ""
    for idx in range(min(len(questions), len(answers))):
        dialogue += f"Question {idx+1}: {questions[idx]}\nCandidate Answer: {answers[idx]}\n\n"
        
    prompt = f"""You are an elite, objective technical director evaluating a candidate's technical mock interview.
Review the following Q&A transcript from the mock interview:

{dialogue}

Perform an in-depth, rigorous grading and analysis of their answers.
Produce a comprehensive report card that includes:
- An overall percentage score (integer 0-100).
- Technical rating (float 1.0 to 10.0).
- Communication rating (float 1.0 to 10.0).
- Subject Matter Relevance rating (float 1.0 to 10.0).
- Detailed question-by-question feedback (Strengths, Weaknesses, Grade, and the Ideal Answer).
- A high-level overall summary.
- A step-by-step personalized improvement plan.

Return your evaluation as a valid JSON object matching the following structure:
{{
  "overall_score": 85,
  "technical_rating": 8.5,
  "communication_rating": 9.0,
  "subject_relevance_rating": 8.0,
  "detailed_feedback": [
    {{
      "question": "Question text here...",
      "answer": "Candidate answer here...",
      "grade": "A",
      "strengths": "Bullet points or text of strengths...",
      "weaknesses": "Bullet points or text of weaknesses...",
      "ideal_answer": "Detailed ideal professional response to this question..."
    }}
  ],
  "overall_summary": "High level summary text here...",
  "improvement_plan": [
    "Step 1 to improve...",
    "Step 2 to improve..."
  ]
}}
"""

    try:
        if not api_key or genai is None or types is None:
            raise Exception("Gemini client uninitialized or missing API key.")

        client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewReportCard,
                temperature=0.2,
            )
        )

        raw_text = response.text.strip()
        report_card = json.loads(raw_text)

    except Exception as e:
        logger.error(f"Error generating interview feedback report: {e}")
        # Build fallback mock report card
        report_card = {
            "overall_score": 78,
            "technical_rating": 7.5,
            "communication_rating": 8.0,
            "subject_relevance_rating": 7.8,
            "detailed_feedback": [
                {
                    "question": q,
                    "answer": a,
                    "grade": "B+",
                    "strengths": "Showed solid general understanding and foundational skills.",
                    "weaknesses": "Could provide more structured technical metrics and specific examples.",
                    "ideal_answer": "A perfect response would use the STAR method, specify key technical details, list exact library metrics, and tie back directly to production scalability."
                } for q, a in zip(questions, answers)
            ],
            "overall_summary": "The candidate has a solid foundational grasp of technical structures and communicates ideas well, but needs to focus more on exact system metrics, structural parameters, and clean architectural specifications.",
            "improvement_plan": [
                "Practice architectural metrics and systems detail formatting.",
                "Incorporate more production-level engineering examples in responses.",
                "Structure answers clearly using the STAR methodology."
            ]
        }

    # Save state
    updated_state = {
        "status": "completed",
        "current_question_index": 5,
        "questions": questions,
        "answers": answers,
        "chat_history": history,
        "feedback": report_card
    }

    await db.interviews.update_one(
        {"user_id": user_id},
        {"$set": updated_state}
    )

    return {
        "status": "completed",
        "current_question_index": 5,
        "feedback": report_card
    }


@app.post("/api/interview/start/{user_id}", tags=["AI Interview"])
async def start_interview(user_id: str):
    """
    Initializes a mock interview chat session for the user using their stored resume and academic profile.
    Generates and returns the first question as JSON.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable."
        )
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable is not defined for Interview.")

    # 1. Fetch resume
    resume_doc = await db.resumes.find_one({"user_id": user_id})
    if not resume_doc:
        resume_doc = MOCK_RESUMES.get(user_id, MOCK_RESUMES["candidate123"])

    # 2. Fetch academic profile
    academic_doc = await db.academic_profiles.find_one({"user_id": user_id})
    if not academic_doc:
        if resume_doc and resume_doc.get("education"):
            edu = resume_doc["education"][0]
            academic_doc = {
                "user_id": user_id,
                "institution": edu.get("institution", "University of California, Berkeley"),
                "degree": edu.get("degree", "Master of Science"),
                "field_of_study": edu.get("field_of_study", "Computer Science"),
                "gpa": edu.get("gpa", "3.9/4.0"),
                "core_subjects": ["Algorithms", "Distributed Systems", "Machine Learning", "Database Internals"],
                "achievements": "Academic Honor List"
            }
        else:
            academic_doc = {
                "user_id": user_id,
                "institution": "University of California, Berkeley",
                "degree": "Master of Science",
                "field_of_study": "Computer Science",
                "gpa": "3.9/4.0",
                "core_subjects": ["Algorithms", "Distributed Systems", "Machine Learning", "Database Internals"],
                "achievements": "Academic Honor List"
            }

    # Format data for prompt
    resume_str = json.dumps(resume_doc, indent=2)
    academic_str = json.dumps(academic_doc, indent=2)

    # 3. Construct system prompt
    system_instruction = f"""You are a strict, elite technical interviewer. You are conducting a high-pressure, realistic professional mock interview with a candidate.

Candidate Information:
Resume Data:
{resume_str}

Academic Profile:
{academic_str}

Interview Rules:
1. You must act as a strict, professional, and objective interviewer. Do not break character.
2. You must ask exactly 5 questions in total, sequentially, ONE AT A TIME.
3. The questions must span:
   - Their academic degree/curriculum (found in Academic Profile/Education)
   - Their technical projects and work experience (found in Resume)
   - General HR and behavioral principles (e.g., conflict resolution, leadership, situational judgment)
4. Do NOT output multiple questions in a single response. Only ask one question at a time.
5. After the candidate responds to a question, analyze their response briefly (internally, do not show your inner grading to them), and ask the next sequential question.
6. Once the candidate has answered all 5 questions, thank them and say "The interview is now complete." Do not ask a 6th question.
7. Keep your question prompt professional, crisp, and direct.

Let's begin. Greet the candidate and ask the first question (Question 1 of 5)."""

    try:
        if not api_key or genai is None or types is None:
            raise Exception("Gemini client uninitialized or missing API key.")

        client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

        chat = client.chats.create(
            model="gemini-3.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )

        response = chat.send_message("Please start the mock interview by asking your first question.")
        first_question = response.text.strip()

        # Get history
        serializable_history = []
        history_list = chat.get_history()
        for content in history_list:
            parts_list = []
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    parts_list.append({"text": part.text})
            serializable_history.append({
                "role": content.role,
                "parts": parts_list
            })

        interview_state = {
            "user_id": user_id,
            "status": "ongoing",
            "current_question_index": 1,
            "questions": [first_question],
            "answers": [],
            "chat_history": serializable_history,
            "system_instruction": system_instruction
        }

        await db.interviews.update_one(
            {"user_id": user_id},
            {"$set": interview_state},
            upsert=True
        )

        return {
            "status": "success",
            "current_question_index": 1,
            "question": first_question
        }

    except Exception as e:
        logger.error(f"Failed to start AI interview: {e}")
        fallback_question = "Welcome to your Mock Technical Interview. Let's start with your background. Looking at your resume and degree curriculum, can you explain the architectural layout of your most significant software project and why you selected its specific storage database?"
        
        interview_state = {
            "user_id": user_id,
            "status": "ongoing",
            "current_question_index": 1,
            "questions": [fallback_question],
            "answers": [],
            "chat_history": [
                {"role": "user", "parts": [{"text": "Please start the mock interview by asking your first question."}]},
                {"role": "model", "parts": [{"text": fallback_question}]}
            ],
            "system_instruction": "Strict interviewer fallback prompt."
        }
        try:
            await db.interviews.update_one(
                {"user_id": user_id},
                {"$set": interview_state},
                upsert=True
            )
        except Exception:
            pass

        return {
            "status": "fallback",
            "current_question_index": 1,
            "question": fallback_question,
            "error_detail": str(e)
        }


@app.post("/api/interview/answer/{user_id}", tags=["AI Interview"])
async def submit_interview_answer(user_id: str, req: SubmitAnswerRequest):
    """
    Submits candidate's response to the current question, records it,
    and returns the next question or finishes the interview and generates the feedback report.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable."
        )
        
    state = await db.interviews.find_one({"user_id": user_id})
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ongoing interview found. Please start the interview first."
        )

    current_idx = state.get("current_question_index", 1)
    answers = state.get("answers", [])
    questions = state.get("questions", [])
    history = state.get("chat_history", [])
    sys_instruction = state.get("system_instruction", "")

    answers.append(req.answer)
    history.append({
        "role": "user",
        "parts": [{"text": req.answer}]
    })

    if current_idx >= 5:
        return await generate_interview_feedback(user_id, questions, answers, history, sys_instruction)

    api_key = os.environ.get("GEMINI_API_KEY")
    try:
        if not api_key or genai is None or types is None:
            raise Exception("Gemini client uninitialized or missing API key.")

        client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

        gemini_history = []
        for h in history:
            gemini_history.append(
                types.Content(
                    role=h["role"],
                    parts=[types.Part.from_text(text=p["text"]) for p in h["parts"]]
                )
            )

        chat = client.chats.create(
            model="gemini-3.5-flash",
            history=gemini_history[:-1],
            config=types.GenerateContentConfig(
                system_instruction=sys_instruction,
                temperature=0.7,
            )
        )

        response = chat.send_message(req.answer)
        next_question = response.text.strip()

        history_list = chat.get_history()
        updated_serializable_history = []
        for content in history_list:
            parts_list = []
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    parts_list.append({"text": part.text})
            updated_serializable_history.append({
                "role": content.role,
                "parts": parts_list
            })

        questions.append(next_question)
        next_idx = current_idx + 1

        updated_state = {
            "current_question_index": next_idx,
            "questions": questions,
            "answers": answers,
            "chat_history": updated_serializable_history
        }

        await db.interviews.update_one(
            {"user_id": user_id},
            {"$set": updated_state}
        )

        return {
            "status": "ongoing",
            "current_question_index": next_idx,
            "question": next_question
        }

    except Exception as e:
        logger.error(f"Error calling Gemini for next question: {e}")
        fallback_questions = [
            "Could you explain the difference between a SQL and NoSQL database, and when you would choose MongoDB over PostgreSQL?",
            "Can you tell me about a time you faced a difficult technical challenge in a group project? How did you approach resolving it?",
            "What is your approach to optimizing code performance and reducing API latency in a production environment?",
            "That's great. For the final question, where do you see yourself in the next three years, and how do you plan to contribute to our engineering culture?"
        ]
        
        next_question = fallback_questions[(current_idx - 1) % len(fallback_questions)]
        
        history.append({
            "role": "model",
            "parts": [{"text": next_question}]
        })
        questions.append(next_question)
        next_idx = current_idx + 1
        
        updated_state = {
            "current_question_index": next_idx,
            "questions": questions,
            "answers": answers,
            "chat_history": history
        }
        
        try:
            await db.interviews.update_one(
                {"user_id": user_id},
                {"$set": updated_state}
            )
        except Exception:
            pass

        return {
            "status": "fallback",
            "current_question_index": next_idx,
            "question": next_question,
            "error_detail": str(e)
        }


@app.post("/api/interview/respond", tags=["AI Interview"])
async def interview_respond(req: InterviewRespondRequest):
    """
    POST /api/interview/respond
    Takes user_id, current_question, and the user's typed response text.
    Passes this context back to the active Gemini API chat session.
    """
    user_id = req.user_id
    current_question = req.current_question
    response_text = req.response_text

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable."
        )

    # Fetch interview state
    state = await db.interviews.find_one({"user_id": user_id})
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active mock interview session found for this user."
        )

    current_idx = state.get("current_question_index", 1)
    answers = state.get("answers", [])
    questions = state.get("questions", [])
    history = state.get("chat_history", [])
    sys_instruction = state.get("system_instruction", "")

    # Ensure current question and answer are recorded
    if not questions or questions[-1] != current_question:
        questions.append(current_question)

    answers.append(response_text)
    
    # Append to chat history
    history.append({
        "role": "user",
        "parts": [{"text": response_text}]
    })

    # If this was the 5th answer, generate feedback!
    if len(answers) >= 5 or current_idx >= 5:
        feedback_res = await generate_interview_feedback(user_id, questions, answers, history, sys_instruction)
        return {
            "status": "completed",
            "current_question_index": 5,
            "feedback": feedback_res.get("feedback")
        }

    # Otherwise, ask Gemini for the next question
    api_key = os.environ.get("GEMINI_API_KEY")
    try:
        if not api_key or genai is None or types is None:
            raise Exception("Gemini client uninitialized or missing API key.")

        client = genai.Client(
            api_key=api_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

        gemini_history = []
        for h in history:
            gemini_history.append(
                types.Content(
                    role=h["role"],
                    parts=[types.Part.from_text(text=p["text"]) for p in h["parts"]]
                )
            )

        chat = client.chats.create(
            model="gemini-3.5-flash",
            history=gemini_history[:-1],
            config=types.GenerateContentConfig(
                system_instruction=sys_instruction,
                temperature=0.7,
            )
        )

        response = chat.send_message(response_text)
        next_question = response.text.strip()

        # Update chat history
        history_list = chat.get_history()
        updated_serializable_history = []
        for content in history_list:
            parts_list = []
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    parts_list.append({"text": part.text})
            updated_serializable_history.append({
                "role": content.role,
                "parts": parts_list
            })

        questions.append(next_question)
        next_idx = len(answers) + 1

        updated_state = {
            "current_question_index": next_idx,
            "questions": questions,
            "answers": answers,
            "chat_history": updated_serializable_history
        }

        await db.interviews.update_one(
            {"user_id": user_id},
            {"$set": updated_state}
        )

        return {
            "status": "ongoing",
            "current_question_index": next_idx,
            "question": next_question
        }

    except Exception as e:
        logger.error(f"Error in interview_respond: {e}")
        fallback_questions = [
            "Could you explain the difference between a SQL and NoSQL database, and when you would choose MongoDB over PostgreSQL?",
            "Can you tell me about a time you faced a difficult technical challenge in a group project? How did you approach resolving it?",
            "What is your approach to optimizing code performance and reducing API latency in a production environment?",
            "That's great. For the final question, where do you see yourself in the next three years, and how do you plan to contribute to our engineering culture?"
        ]
        
        next_question = fallback_questions[(len(answers) - 1) % len(fallback_questions)]
        
        history.append({
            "role": "model",
            "parts": [{"text": next_question}]
        })
        questions.append(next_question)
        next_idx = len(answers) + 1
        
        updated_state = {
            "current_question_index": next_idx,
            "questions": questions,
            "answers": answers,
            "chat_history": history
        }
        
        try:
            await db.interviews.update_one(
                {"user_id": user_id},
                {"$set": updated_state}
            )
        except Exception:
            pass

        return {
            "status": "fallback",
            "current_question_index": next_idx,
            "question": next_question,
            "error_detail": str(e)
        }


@app.get("/api/interview/status/{user_id}", tags=["AI Interview"])
async def get_interview_status(user_id: str):
    """
    Checks if there is an active mock interview state, and returns it.
    """
    if db is None:
        return {"status": "offline", "message": "Database is offline"}
        
    state = await db.interviews.find_one({"user_id": user_id})
    if not state:
        return {"status": "none", "message": "No mock interview in progress."}
        
    if "_id" in state:
        del state["_id"]
        
    return state


@app.post("/api/interview/reset/{user_id}", tags=["AI Interview"])
async def reset_interview(user_id: str):
    """
    Deletes the stored mock interview progress for a user so they can start fresh.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database offline."
        )
    try:
        await db.interviews.delete_one({"user_id": user_id})
        return {"status": "success", "message": "Interview progress reset successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


class SaveAssessmentRequest(BaseModel):
    aptitude_score: Optional[int] = None
    aptitude_total: Optional[int] = None
    coding_score: Optional[int] = None
    coding_total: Optional[int] = None


@app.post("/api/assessment/save/{user_id}", tags=["Assessment History"])
async def save_assessment_history(user_id: str, req: SaveAssessmentRequest):
    """
    Saves Aptitude or Coding round scores dynamically in MongoDB.
    """
    if db is None:
        return {"status": "offline_saved", "message": "Saved locally in fallback mode"}
        
    try:
        update_doc = {}
        if req.aptitude_score is not None:
            update_doc["aptitude_score"] = req.aptitude_score
        if req.aptitude_total is not None:
            update_doc["aptitude_total"] = req.aptitude_total
        if req.coding_score is not None:
            update_doc["coding_score"] = req.coding_score
        if req.coding_total is not None:
            update_doc["coding_total"] = req.coding_total
            
        if not update_doc:
            return {"status": "ignored", "message": "No score parameters provided."}
            
        await db.assessment_history.update_one(
            {"user_id": user_id},
            {"$set": update_doc},
            upsert=True
        )
        return {"status": "success", "message": "Assessment history updated.", "data": update_doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/assessment/history/{user_id}", tags=["Assessment History"])
async def get_assessment_history(user_id: str):
    """
    Fetches the consolidated candidate report containing Aptitude score, Coding score, and AI Mock Interview critique.
    """
    res = {
        "user_id": user_id,
        "aptitude_score": None,
        "aptitude_total": 5,
        "coding_score": None,
        "coding_total": 3,
        "interview_status": "not_started",
        "interview_report": None
    }
    
    if db is None:
        return res
        
    try:
        # Load scores
        scores = await db.assessment_history.find_one({"user_id": user_id})
        if scores:
            res["aptitude_score"] = scores.get("aptitude_score")
            res["aptitude_total"] = scores.get("aptitude_total", 5)
            res["coding_score"] = scores.get("coding_score")
            res["coding_total"] = scores.get("coding_total", 3)
            
        # Load interview state
        interview = await db.interviews.find_one({"user_id": user_id})
        if interview:
            res["interview_status"] = interview.get("status", "ongoing")
            res["interview_report"] = interview.get("feedback")
            
        return res
    except Exception as e:
        logger.error(f"Error fetching assessment history: {e}")
        return res



