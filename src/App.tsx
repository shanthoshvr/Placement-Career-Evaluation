import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  Terminal,
  FolderTree,
  Send,
  Play,
  Square,
  Copy,
  Check,
  Code2,
  Settings,
  HelpCircle,
  Network,
  Download,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Brain,
  Award,
  Lock,
  Unlock,
  AlertCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home
} from 'lucide-react';
import axios from 'axios';

import ResumeBuilder from './components/ResumeBuilder';
import AptitudeQuiz from './components/AptitudeQuiz';
import CodingPlatform from './components/CodingPlatform';
import AIInterviewPortal from './components/AIInterviewPortal';
import AuthScreen from './components/AuthScreen';
import HomeDashboard from './components/HomeDashboard';

// Static representation of all generated files for the interactive explorer
const FILE_BLUEPRINTS = {
  'docker-compose.yml': {
    path: '/docker-compose.yml',
    language: 'yaml',
    commentary: 'Standard multi-container configuration orchestration. Defines network links, persistent local storage volumes for MongoDB, dependency chain checks, and port forwarding.',
    content: `version: '3.8'

services:
  # Database Tier: MongoDB NoSQL engine
  mongodb:
    image: mongo:6.0
    container_name: placement-suite-mongodb
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: placement_db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Application Logic Tier: FastAPI Python Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: placement-suite-backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/placement_db
      - ENVIRONMENT=development
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Presentation Tier: React SPA served via Nginx Reverse Proxy
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: placement-suite-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  mongodb_data:
    driver: local`
  },
  'backend/main.py': {
    path: '/backend/main.py',
    language: 'python',
    commentary: 'Asynchronous Python backend powered by FastAPI. Integrates CORS handlers, connects asynchronously to MongoDB using motor, and implements structured routers for cross-tier validation.',
    content: `from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

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
        
    return placements`
  },
  'backend/Dockerfile': {
    path: '/backend/Dockerfile',
    language: 'dockerfile',
    commentary: 'Defines the Python running environment based on python:3.11-slim. Installs curl for orchestration health checks, caches requirements layers for fast builds, and launches the application via Uvicorn.',
    content: `# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set working directory
WORKDIR /app

# Install system dependencies if any are needed (curl for health check is a senior best-practice)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose backend service port
EXPOSE 8000

# Run FastAPI via Uvicorn server on port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
  },
  'backend/requirements.txt': {
    path: '/backend/requirements.txt',
    language: 'plaintext',
    commentary: 'A clean list of pinned requirements for the backend, covering FastAPI, Pydantic, standard MongoDB driver, and motor (asynchronous IO for Mongo).',
    content: `fastapi>=0.100.0
uvicorn>=0.22.0
pymongo>=4.4.0
motor>=3.2.0
pydantic>=2.0`
  },
  'frontend/Dockerfile': {
    path: '/frontend/Dockerfile',
    language: 'dockerfile',
    commentary: 'Multi-stage Dockerfile that builds the static React production assets using node:20-alpine, and copies only the output /dist directory into a production-tuned Nginx image.',
    content: `# ==========================================
# Stage 1: Build static React SPA assets
# ==========================================
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package descriptors first to maximize Docker layer caching
COPY package.json ./

# Install packages
RUN npm install

# Copy all source assets
COPY . .

# Compile application
RUN npm run build

# ==========================================
# Stage 2: Serve compiled assets using Nginx
# ==========================================
FROM nginx:alpine AS production-stage

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from stage 1
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy professional Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx in non-daemon mode
CMD ["nginx", "-g", "daemon off;"]`
  },
  'frontend/nginx.conf': {
    path: '/frontend/nginx.conf',
    language: 'nginx',
    commentary: 'High-performance Nginx config supporting Gzip compression, fallback SPA router (handling client side React paths cleanly), and a reverse proxy location proxying /api/ to the backend on port 8000.',
    content: `server {
    listen 80;
    server_name localhost;

    # Compression (Gzip) for faster loading times
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";

    # Static file serving
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # Crucial for React client-side routing
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy for FastAPI backend routing
    # All frontend requests to /api/* will be sent to http://backend:8000/api/*
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages configuration
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}`
  },
  'frontend/src/App.tsx': {
    path: '/frontend/src/App.tsx',
    language: 'typescript',
    commentary: 'React app implementation querying health states across all tiers, sending candidate data to the database, and displaying a clean visual log with full offline safety fail-safes.',
    content: `// React sub-app App.tsx contents
// Fetches database status dynamically via reverse-proxied /api/health
// Submits and prints logs in structured columns.`
  }
};

// Console logs sequence for simulated `docker-compose up --build`
const SIMULATED_DOCKER_LOGS = [
  { text: 'Creating network "placement-suite_default" with driver "bridge"', type: 'sys' },
  { text: 'Creating volume "placement-suite_mongodb_data" with local driver', type: 'sys' },
  { text: 'Building backend', type: 'build_backend' },
  { text: 'Sending build context to Docker daemon  24.5kB', type: 'build_backend' },
  { text: 'Step 1/7 : FROM python:3.11-slim', type: 'build_backend' },
  { text: ' ---> 8d6fd0ba94ea', type: 'build_backend' },
  { text: 'Step 2/7 : ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000', type: 'build_backend' },
  { text: ' ---> Running in b12bc39cf871', type: 'build_backend' },
  { text: ' ---> 4293f7739da1', type: 'build_backend' },
  { text: 'Step 3/7 : WORKDIR /app', type: 'build_backend' },
  { text: ' ---> 1d2b83da8df4', type: 'build_backend' },
  { text: 'Step 4/7 : RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*', type: 'build_backend' },
  { text: 'Get:1 http://deb.debian.org/debian bookworm InRelease [151 kB]', type: 'build_backend' },
  { text: 'Get:2 http://deb.debian.org/debian bookworm-updates InRelease [55.4 kB]', type: 'build_backend' },
  { text: 'Fetched 206 kB in 1s (210 kB/s)', type: 'build_backend' },
  { text: 'Selecting previously unselected package curl.', type: 'build_backend' },
  { text: 'Setting up curl (7.88.1-10+deb12u5) ...', type: 'build_backend' },
  { text: ' ---> c239a04cd821', type: 'build_backend' },
  { text: 'Step 5/7 : COPY requirements.txt .', type: 'build_backend' },
  { text: ' ---> 913da6f91da2', type: 'build_backend' },
  { text: 'Step 6/7 : RUN pip install --no-cache-dir -r requirements.txt', type: 'build_backend' },
  { text: 'Collecting fastapi>=0.100.0 (from -r requirements.txt)', type: 'build_backend' },
  { text: 'Downloading fastapi-0.111.0-py3-none-any.whl (91 kB)', type: 'build_backend' },
  { text: 'Collecting uvicorn>=0.22.0 (from -r requirements.txt)', type: 'build_backend' },
  { text: 'Downloading uvicorn-0.30.1-py3-none-any.whl (62 kB)', type: 'build_backend' },
  { text: 'Collecting motor>=3.2.0 (from -r requirements.txt)', type: 'build_backend' },
  { text: 'Downloading motor-3.5.1-py3-none-any.whl (57 kB)', type: 'build_backend' },
  { text: 'Installing collected packages: pymongo, motor, pydantic, fastapi, uvicorn', type: 'build_backend' },
  { text: 'Successfully installed fastapi uvicorn motor pymongo pydantic', type: 'build_backend' },
  { text: ' ---> b76391dcd839', type: 'build_backend' },
  { text: 'Step 7/7 : CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]', type: 'build_backend' },
  { text: ' ---> Successfully built b76391dcd839', type: 'build_backend' },
  { text: ' ---> Successfully tagged placement-suite-backend:latest', type: 'build_backend' },
  { text: 'Building frontend', type: 'build_frontend' },
  { text: 'Step 1/11 : FROM node:20-alpine AS build-stage', type: 'build_frontend' },
  { text: ' ---> fbcda9b12cf3', type: 'build_frontend' },
  { text: 'Step 2/11 : WORKDIR /app', type: 'build_frontend' },
  { text: 'Step 3/11 : COPY package.json ./', type: 'build_frontend' },
  { text: 'Step 4/11 : RUN npm install', type: 'build_frontend' },
  { text: 'added 142 packages in 4.31s', type: 'build_frontend' },
  { text: 'Step 5/11 : COPY . .', type: 'build_frontend' },
  { text: 'Step 6/11 : RUN npm run build', type: 'build_frontend' },
  { text: 'vite v6.2.3 building for production...', type: 'build_frontend' },
  { text: '✓ 148 modules transformed.', type: 'build_frontend' },
  { text: 'dist/index.html                  0.82 kB │ gzip:  0.41 kB', type: 'build_frontend' },
  { text: 'dist/assets/index-D8gH1_pQ.css  42.50 kB │ gzip: 11.20 kB', type: 'build_frontend' },
  { text: 'dist/assets/index-Bf6b7cda.js  148.12 kB │ gzip: 46.10 kB', type: 'build_frontend' },
  { text: '✓ built in 1.48s', type: 'build_frontend' },
  { text: 'Step 7/11 : FROM nginx:alpine AS production-stage', type: 'build_frontend' },
  { text: ' ---> f8491bd040da', type: 'build_frontend' },
  { text: 'Step 8/11 : COPY --from=build-stage /app/dist /usr/share/nginx/html', type: 'build_frontend' },
  { text: 'Step 9/11 : COPY nginx.conf /etc/nginx/conf.d/default.conf', type: 'build_frontend' },
  { text: 'Step 10/11 : EXPOSE 80', type: 'build_frontend' },
  { text: 'Step 11/11 : CMD ["nginx", "-g", "daemon off;"]', type: 'build_frontend' },
  { text: ' ---> Successfully built 1a99f18a22bc', type: 'build_frontend' },
  { text: ' ---> Successfully tagged placement-suite-frontend:latest', type: 'build_frontend' },
  { text: 'Pulling mongodb (mongo:6.0)...', type: 'db' },
  { text: 'mongo:6.0 Pulling from library/mongo', type: 'db' },
  { text: 'Digest: sha256:794cd74b09cf90176', type: 'db' },
  { text: 'Status: Downloaded newer image for mongo:6.0', type: 'db' },
  { text: 'Creating placement-suite-mongodb ... done', type: 'sys' },
  { text: 'Creating placement-suite-backend ... done', type: 'sys' },
  { text: 'Creating placement-suite-frontend ... done', type: 'sys' },
  { text: 'Attaching to placement-suite-mongodb, placement-suite-backend, placement-suite-frontend', type: 'sys' },
  { text: 'mongodb_1  | {"t":{"$date":"2026-07-04T01:34:00.120Z"},"s":"I",  "c":"CONTROL",  "id":23285, "ctx":"main","msg":"Automatically enabling TLS 1.3 because hosts support it"}', type: 'db_run' },
  { text: 'mongodb_1  | {"t":{"$date":"2026-07-04T01:34:00.145Z"},"s":"I",  "c":"NETWORK",  "id":23015, "ctx":"listener","msg":"Listening on 0.0.0.0:27017"}', type: 'db_run' },
  { text: 'mongodb_1  | {"t":{"$date":"2026-07-04T01:34:00.146Z"},"s":"I",  "c":"CONTROL",  "id":20145, "ctx":"main","msg":"MongoDB Server is fully up and initialized!"}', type: 'db_run' },
  { text: 'backend_1  | Connecting to MongoDB at: mongodb://mongodb:27017/placement_db', type: 'backend_run' },
  { text: 'backend_1  | Successfully connected to MongoDB!', type: 'backend_run' },
  { text: 'backend_1  | INFO:     Started server process [1]', type: 'backend_run' },
  { text: 'backend_1  | INFO:     Waiting for application startup.', type: 'backend_run' },
  { text: 'backend_1  | INFO:     Application startup complete.', type: 'backend_run' },
  { text: 'backend_1  | INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)', type: 'backend_run' },
  { text: 'frontend_1 | Nginx web server initialized on port 80. Proxy rule active for /api/ -> http://backend:8000/api/', type: 'frontend_run' },
  { text: 'frontend_1 | 172.18.0.1 - - [04/Jul/2026:01:34:05 +0000] "GET / HTTP/1.1" 200 4825 "-" "HealthChecker/1.1"', type: 'frontend_run' },
  { text: 'backend_1  | INFO:     172.18.0.3:49281 - "GET /api/health HTTP/1.1" 200 OK', type: 'backend_run' },
  { text: 'frontend_1 | 172.18.0.1 - - [04/Jul/2026:01:34:06 +0000] "GET /api/health HTTP/1.1" 200 95 "-" "Mozilla/5.0"', type: 'frontend_run' },
  { text: 'frontend_1 | Container stack successfully compiled. Ready to accept traffic at http://localhost:80', type: 'sys_ok' }
];

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pace_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('pace_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Set default authorization header for axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'aptitude' | 'coding' | 'portal'>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // State machine tracking for Phase 2 -> Phase 3 lock
  const [aptitudeScore, setAptitudeScore] = useState<number | null>(() => {
    const saved = localStorage.getItem('aptitude_score');
    return saved ? parseInt(saved, 10) : null;
  });
  const [aptitudePercentage, setAptitudePercentage] = useState<number | null>(() => {
    const saved = localStorage.getItem('aptitude_percentage');
    return saved ? parseFloat(saved) : null;
  });
  const [isAptitudePassed, setIsAptitudePassed] = useState<boolean>(() => {
    const saved = localStorage.getItem('aptitude_passed');
    return saved === 'true';
  });

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('pace_token');
    localStorage.removeItem('pace_user');
    localStorage.removeItem('aptitude_score');
    localStorage.removeItem('aptitude_percentage');
    localStorage.removeItem('aptitude_passed');
    if (user?.id) {
      localStorage.removeItem(`passed_coding_problems_${user.id}`);
    }
    setToken(null);
    setUser(null);
    setAptitudeScore(null);
    setAptitudePercentage(null);
    setIsAptitudePassed(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  const handleAptitudeCompleted = (score: number, percentage: number) => {
    setAptitudeScore(score);
    setAptitudePercentage(percentage);
    const passed = percentage >= 60;
    setIsAptitudePassed(passed);
    localStorage.setItem('aptitude_score', score.toString());
    localStorage.setItem('aptitude_percentage', percentage.toString());
    localStorage.setItem('aptitude_passed', passed ? 'true' : 'false');
    
    // Sync aptitude score with backend MongoDB
    const currentUserId = user?.id || 'candidate123';
    fetch(`/api/assessment/save/${currentUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        aptitude_score: score,
        aptitude_total: 5
      })
    }).then(r => r.json())
      .then(d => console.log('Synced aptitude score with MongoDB:', d))
      .catch(e => console.error('Failed to sync aptitude score:', e));
  };

  const resetProgress = () => {
    setAptitudeScore(null);
    setAptitudePercentage(null);
    setIsAptitudePassed(false);
    localStorage.removeItem('aptitude_score');
    localStorage.removeItem('aptitude_percentage');
    localStorage.removeItem('aptitude_passed');
    const currentUserId = user?.id || 'candidate123';
    localStorage.removeItem(`passed_coding_problems_${currentUserId}`);
    
    // Reset in MongoDB
    fetch(`/api/assessment/save/${currentUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        aptitude_score: null,
        aptitude_total: 5,
        coding_score: null,
        coding_total: 3
      })
    }).then(() => {
      fetch(`/api/interview/reset/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
        .then(() => {
          window.location.reload();
        });
    }).catch(e => {
      console.error('Failed to reset backend progress:', e);
      window.location.reload();
    });
  };

  if (!token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      
      {/* Workspace Header Panel */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/15">
            <Layers className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PACE <span className="text-indigo-400 font-normal">| Placement & Career Evaluation</span>
            </h1>
          </div>
        </div>

        {/* User profile popup dropdown controls */}
        {user && (
          <div className="relative ml-auto md:ml-0" ref={profileDropdownRef} id="user-header-controls">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/25 hover:border-indigo-500/40 hover:bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold text-base uppercase transition duration-200 shadow-md focus:outline-none"
              title="View Profile Actions"
            >
              {user.fullname?.charAt(0) || 'U'}
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                {/* Profile Line (First line) */}
                <div className="px-4 py-2.5 border-b border-slate-800/80">
                  <div className="text-sm font-bold text-slate-200 truncate">{user.fullname}</div>
                  <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">{user.degree || 'B.E. Computer Science & Engineering'}</div>
                </div>

                {/* Sign Out Line (Second line) */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition duration-150 text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main split-view or full workspace workspace */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Navigation Rail sidebar */}
        <nav className={`bg-slate-900 border-r border-slate-800 p-3 flex flex-row lg:flex-col gap-1 overflow-x-auto shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-16 lg:items-center' : 'lg:w-64'}`}>
          <div className={`hidden lg:flex items-center mb-4 px-3 w-full ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Workspace Panels
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center justify-center"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center rounded-lg text-sm font-medium transition ${isSidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:px-0 lg:py-0' : 'w-full px-3 py-2.5 gap-3'} ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
            title="Home Dashboard"
          >
            <Home className="h-4 w-4 shrink-0 text-indigo-400" />
            {!isSidebarCollapsed && <span className="truncate">Home Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('resume')}
            className={`flex items-center rounded-lg text-sm font-medium transition ${isSidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:px-0 lg:py-0' : 'w-full px-3 py-2.5 gap-3'} ${activeTab === 'resume' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
            title="ATS Resume Builder"
          >
            <FileText className="h-4 w-4 shrink-0 text-amber-400" />
            {!isSidebarCollapsed && <span className="truncate">ATS Resume Builder</span>}
          </button>

          <button
            onClick={() => setActiveTab('aptitude')}
            className={`flex items-center rounded-lg text-sm font-medium transition ${isSidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:px-0 lg:py-0' : 'w-full px-3 py-2.5 gap-3'} ${activeTab === 'aptitude' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
            title="Aptitude Assessment"
          >
            <Brain className="h-4 w-4 shrink-0 text-amber-400" />
            {!isSidebarCollapsed && <span className="truncate">Aptitude Assessment</span>}
          </button>

          <button
            onClick={() => setActiveTab('coding')}
            className={`flex items-center rounded-lg text-sm font-medium transition ${isSidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:px-0 lg:py-0' : 'w-full px-3 py-2.5 gap-3'} ${activeTab === 'coding' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
            id="sidebar-coding-tab"
            title="Technical Coding Round"
          >
            <Code2 className="h-4 w-4 shrink-0 text-amber-400" />
            {!isSidebarCollapsed && <span className="truncate">Technical Coding Round</span>}
            {!isSidebarCollapsed && (isAptitudePassed ? (
              <Unlock className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-slate-500 ml-auto shrink-0" />
            ))}
          </button>

          <button
            onClick={() => setActiveTab('portal')}
            className={`flex items-center rounded-lg text-sm font-medium transition ${isSidebarCollapsed ? 'lg:justify-center lg:w-10 lg:h-10 lg:px-0 lg:py-0' : 'w-full px-3 py-2.5 gap-3'} ${activeTab === 'portal' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
            title="Interview Assessment"
          >
            <Award className="h-4 w-4 shrink-0 text-amber-400" />
            {!isSidebarCollapsed && <span className="truncate">Interview Assessment</span>}
          </button>

        </nav>

        {/* Workspace Display Area */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto">
          
          {/* TAB: HOME DASHBOARD */}
          {activeTab === 'home' && (
            <HomeDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          
          {/* TAB: ATS RESUME BUILDER */}
          {activeTab === 'resume' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mt-1">ATS-Friendly Resume Builder</h2>
                </div>
              </div>

              <ResumeBuilder userId={user?.id || 'candidate123'} />
            </div>
          )}

          {/* TAB: APTITUDE ASSESSMENT */}
          {activeTab === 'aptitude' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 'Proceed to Coding Round' Banner / Status messages */}
              {isAptitudePassed ? (
                <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/5 animate-pulse mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <Award className="h-6 w-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">Phase 2 Threshold Passed! ({aptitudeScore}/5 Correct)</h4>
                      <p className="text-xs text-slate-300 mt-1">Excellent job! You have unlocked Phase 3: Technical Coding Round.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('coding')}
                    className="flex items-center gap-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 px-5 rounded-xl shadow transition"
                  >
                    <span>Proceed to Coding Round</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : aptitudeScore !== null ? (
                <div className="bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Threshold Not Met ({aptitudeScore}/5 Correct)</h4>
                      <p className="text-xs text-slate-300 mt-1">You must score at least 60% (3/5) correct to unlock the Technical Coding Round.</p>
                    </div>
                  </div>
                  <button
                    onClick={resetProgress}
                    className="flex items-center gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 px-5 rounded-xl shadow transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry Assessment</span>
                  </button>
                </div>
              ) : null}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Aptitude, Verbal & Reasoning Quiz</h2>
                </div>
              </div>

              <AptitudeQuiz onQuizCompleted={handleAptitudeCompleted} />
            </div>
          )}

          {/* TAB: TECHNICAL CODING ROUND */}
          {activeTab === 'coding' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {!isAptitudePassed ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-6 my-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
                  
                  <div className="mx-auto w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5 animate-pulse">
                    <Lock className="h-10 w-10 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">Technical Coding Round is Locked</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      To safeguard integrity standards, candidates must first clear the <span className="text-emerald-400 font-semibold">Aptitude, Verbal & Reasoning Quiz</span> with a score of at least 60% (3/5).
                    </p>
                  </div>

                  {/* Status Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 max-w-sm mx-auto text-xs font-mono text-slate-400">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                      <span>Quiz Status:</span>
                      {aptitudeScore !== null ? (
                        <span className="text-amber-400 font-bold">Failed ({aptitudeScore}/5)</span>
                      ) : (
                        <span className="text-slate-500">Not Started</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span>Required Threshold:</span>
                      <span className="text-emerald-400 font-bold">&gt;= 60% (3/5)</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('aptitude')}
                      className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl transition shadow-lg shadow-indigo-600/15"
                    >
                      <Brain className="h-4 w-4" />
                      <span>Go to Aptitude Assessment</span>
                    </button>

                    {/* Developer bypass button */}
                    <button
                      onClick={() => {
                        handleAptitudeCompleted(4, 80);
                      }}
                      className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 px-6 rounded-xl border border-slate-700 transition"
                    >
                      <Unlock className="h-4 w-4 text-amber-500" />
                      <span>Dev Bypass (Auto-Pass)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 uppercase font-bold tracking-wider">
                          Monaco Editor Integration
                        </span>
                        <span className="text-slate-500 text-xs font-mono">Dynamic Theme Injection</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Technical Coding & Syntax Assessment</h2>
                      <p className="text-slate-400 text-sm mt-0.5">Evaluate programming competency with virtual sandboxed test suites.</p>
                    </div>

                    {/* Lock progress developer toggle */}
                    <button
                      onClick={resetProgress}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 py-1.5 px-3 rounded-lg border border-rose-500/20 transition font-mono"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Lock Platform</span>
                    </button>
                  </div>

                  <CodingPlatform userId={user?.id || 'candidate123'} />
                </>
              )}
            </div>
          )}

          {/* TAB: PORTAL */}
          {activeTab === 'portal' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              <AIInterviewPortal userId={user?.id || 'candidate123'} onResetAll={resetProgress} />
            </div>
          )}



        </main>
      </div>

    </div>
  );
}
