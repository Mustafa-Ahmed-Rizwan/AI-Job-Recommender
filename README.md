# AI Job Recommender

A full-stack application that provides AI-powered job recommendations and skill gap analysis by comparing your resume with job market requirements.

## Features

### Core Functionality

- **Resume Processing**: Upload and parse PDF/DOCX resumes to extract skills, experience, and education
- **Job Search**: Search for jobs across multiple platforms (LinkedIn, Indeed, Glassdoor, etc.)
- **AI-Powered Matching**: Vector-based similarity matching between resumes and job postings
- **Skill Gap Analysis**: Detailed analysis of missing vs. existing skills for each job
- **Personalized Recommendations**: Actionable learning paths and project suggestions
- **Comprehensive Reporting**: Exportable reports with metrics and career guidance

### Technical Features

- **Multi-LLM Support**: Fallback system with Groq and OpenRouter providers
- **Real-time Vector Search**: Pinecone integration for semantic matching
- **Authentication**: Firebase Auth with secure token verification
- **File Processing**: Support for PDF and DOCX resume formats
- **Responsive Design**: Mobile-friendly React interface with Tailwind CSS

## Architecture

### Frontend (React + Vite + TypeScript)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Lucide React icons
- **Authentication**: Firebase Authentication
- **State Management**: Custom React hooks
- **API Integration**: Axios-based service layer
- **Build Tool**: Vite for fast development and optimized builds

### Backend (FastAPI + Python)

- **Framework**: FastAPI with async/await support
- **AI/ML**: LangChain integration with multiple LLM providers
- **Vector Database**: Pinecone for semantic search
- **Job Data**: SerpAPI integration for job listings
- **Authentication**: Firebase Admin SDK for token verification
- **File Processing**: PyPDF2 and python-docx for resume parsing

## Installation

### Prerequisites

- Node.js 16+ and npm
- Python 3.9+
- [uv](https://github.com/astral-sh/uv) - Fast Python package installer and resolver
- Firebase project with Authentication and Firestore enabled
- Pinecone account and API key
- SerpAPI account and API key
- Groq and/or OpenRouter API keys

### Environment Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Mustafa-Ahmed-Rizwan/AI-Job-Helper.git
cd ai-job-recommender
```

#### 2. Backend Setup with uv

```bash
cd backend

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment with uv
uv venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies with uv sync
uv sync
```

**Note**: `uv sync` automatically installs all dependencies from your `pyproject.toml` or `requirements.txt` file. If you're using a `requirements.txt` file, you can also use `uv pip install -r requirements.txt`.

#### 3. Frontend Setup

```bash
cd frontend
npm install
```

### Environment Variables

#### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT_KEY=json_string

# AI Services
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
HF_API_TOKEN=your_huggingface_token

# Databases
PINECONE_API_KEY=your_pinecone_api_key

# Job Search
SERPAPI_API_KEY=your_serpapi_api_key

# LLM Configuration
LLM_TEMPERATURE=0.5
LLM_MAX_TOKENS=1024
```

#### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable **Authentication** → Email/Password sign-in method
4. Enable **Firestore Database** → Start in production mode
5. Get your config from Project Settings → Web App
6. Download service account key for backend from Project Settings → Service Accounts

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resumes/{resumeId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Usage

### Development Mode

#### Start Backend Server

```bash
cd backend
# Make sure virtual environment is activated
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

#### Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## API Endpoints

### Authentication Required

- `POST /upload-resume` - Process resume file
- `POST /search-jobs` - Search for jobs
- `GET /similar-jobs/{resume_id}` - Get job matches
- `POST /analyze-skills` - Perform skill gap analysis
- `POST /generate-report` - Generate comprehensive report
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user resume
- `DELETE /user/resume` - Delete user resume

### Public Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /cities/{country}` - Get cities by country
- `POST /suggest-jobs` - Get job suggestions

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **HTTP Client**: Axios
- **State Management**: Custom React Hooks

### Backend

- **Framework**: FastAPI
- **Package Manager**: uv (fast Python package installer)
- **AI/ML**: LangChain, HuggingFace, multiple LLM providers
- **Vector Database**: Pinecone
- **Job Search**: SerpAPI
- **File Processing**: PyPDF2, python-docx
- **Authentication**: Firebase Admin SDK
- **Database**: Firestore (via Firebase)

### External Services

- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Vector Database**: Pinecone
- **Job Search**: SerpAPI (Google Jobs)
- **LLM Providers**: Groq, OpenRouter, HuggingFace

## Project Structure

```
ai-job-recommender/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/            # Authentication components
│   │   │   ├── Jobs/            # Job search and results
│   │   │   ├── Analysis/        # Skill gap analysis
│   │   │   ├── Report/          # Report generation
│   │   │   ├── Layout/          # Header, progress, etc.
│   │   │   ├── Modals/          # Profile, update resume
│   │   │   ├── Resume/          # Resume upload and display
│   │   │   └── Shared/          # Toast, common components
│   │   ├── config/
│   │   │   └── firebase.ts      # Firebase configuration
│   │   ├── services/
│   │   │   ├── authService.ts   # Authentication logic
│   │   │   └── resumeService.ts # Resume data management
│   │   ├── utils/
│   │   │   ├── api.ts           # API client
│   │   │   └── helpers.ts       # Utility functions
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript definitions
│   │   ├── hooks/
│   │   │   └── useAppState.ts   # State management hook
│   │   ├── App.tsx              # Main application component
│   │   ├── main.tsx             # Application entry point
│   │   └── style.css            # Global styles
│   ├── index.html               # HTML template
│   ├── package.json             # Node.js dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── tailwind.config.js       # Tailwind configuration
│   └── tsconfig.json            # TypeScript configuration
├── backend/
│   ├── src/
│   │   ├── resume_processor.py  # Resume parsing and processing
│   │   ├── skill_analyzer.py    # Skill gap analysis
│   │   ├── job_api.py           # Job search integration
│   │   └── helper.py            # LLM management utilities
│   ├── middleware/
│   │   └── auth.py              # Authentication middleware
│   ├── main.py                  # FastAPI application
│   ├── pyproject.toml           # Python project configuration (for uv)
│   ├── requirements.txt         # Python dependencies (fallback)
│   └── .venv/                   # Virtual environment (created by uv)
├── .gitignore
└── README.md
```

## Development Tips

### Working with uv

```bash
# Add new dependencies
uv add package_name

# Add development dependencies
uv add --dev package_name

# Update dependencies
uv sync --upgrade

# Remove dependencies
uv remove package_name

# Show installed packages
uv pip list
```

### Common Commands

#### Backend Development

```bash
cd backend
source .venv/bin/activate  # Activate virtual environment
uv sync                    # Install/update dependencies
uvicorn main:app --reload  # Start development server
```

#### Frontend Development

```bash
cd frontend
npm install                # Install dependencies
npm run dev               # Start development server
npm run build             # Build for production
npm run preview           # Preview production build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FastAPI team for the excellent web framework
- React team for the powerful UI library
- LangChain team for the LLM integration tools
- Firebase team for authentication and database services
- Pinecone for vector database capabilities
- SerpAPI for job search functionality
- Astral team for the lightning-fast uv package manager
- Tailwind CSS team for the utility-first CSS framework

## Support

For issues, questions, or contributions, please open an issue on GitHub or contact the maintainers.
