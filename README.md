# AI Job Recemmonder

A full-stack application that provides AI-powered job recommendations and skill gap analysis by comparing your resume with job market requirements.

## 🌟 Features

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
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 🏗️ Architecture

### Frontend (Vite + TypeScript)
- **Framework**: Modern React-like SPA with vanilla TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Firebase Authentication
- **State Management**: Custom application state management
- **API Integration**: Axios-based service layer

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async/await support
- **AI/ML**: LangChain integration with multiple LLM providers
- **Vector Database**: Pinecone for semantic search
- **Job Data**: SerpAPI integration for job listings
- **Authentication**: Firebase Admin SDK for token verification
- **File Processing**: PyPDF2 and python-docx for resume parsing

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- [uv](https://github.com/astral-sh/uv) - Fast Python package installer and resolver
- Firebase project with Authentication enabled
- Pinecone account and API key
- SerpAPI account and API key
- Groq and/or OpenRouter API keys

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mustafa-Ahmed-Rizwan/AI-Job-Helper.git
   cd ai-job-recommender
   ```

2. **Backend Setup with uv**
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

   > **Note**: `uv sync` automatically installs all dependencies from your `pyproject.toml` or `requirements.txt` file. If you're using a `requirements.txt` file, you can also use `uv pip install -r requirements.txt`.

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

### Environment Variables

Create `.env` files in both frontend and backend directories:

#### Backend (.env)
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
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🚀 Usage

### Development

1. **Start Backend Server**
   ```bash
   cd backend
   # Make sure virtual environment is activated
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔧 API Endpoints

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

## 🛠️ Technology Stack

### Frontend
- **Framework**: Vite + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Authentication**: Firebase Auth
- **HTTP Client**: Axios
- **Build Tool**: Vite

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
- **Vector Database**: Pinecone
- **Job Search**: SerpAPI (Google Jobs)
- **LLM Providers**: Groq, OpenRouter, HuggingFace
- **Storage**: Firebase Storage (optional)

## 📁 Project Structure

```
ai-job-recommender/
├── frontend/
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── services/           # API services
│   │   ├── types/              # TypeScript definitions
│   │   ├── utils/              # Helper functions
│   │   └── main.ts             # Application entry point
│   ├── index.html              # Main HTML file
│   ├── package.json            # Node.js dependencies
│   └── style.css               # Global styles
├── backend/
│   ├── src/
│   │   ├── resume_processor.py # Resume parsing and processing
│   │   ├── skill_analyzer.py   # Skill gap analysis
│   │   ├── job_api.py          # Job search integration
│   │   └── helper.py           # LLM management utilities
│   ├── middleware/
│   │   └── auth.py             # Authentication middleware
│   ├── main.py                 # FastAPI application
│   ├── pyproject.toml          # Python project configuration (for uv)
│   ├── requirements.txt        # Python dependencies (fallback)
│   └── .venv/                  # Virtual environment (created by uv)
├── .gitignore
└── README.md
```

## 🔧 Development Tips

### Working with uv
- **Add new dependencies**: `uv add package_name`
- **Add development dependencies**: `uv add --dev package_name`
- **Update dependencies**: `uv sync --upgrade`
- **Remove dependencies**: `uv remove package_name`
- **Show installed packages**: `uv pip list`

### Common Commands
```bash
# Backend development
cd backend
source .venv/bin/activate  # Activate virtual environment
uv sync                    # Install/update dependencies
uvicorn main:app --reload  # Start development server

# Frontend development
cd frontend
npm install                # Install dependencies
npm run dev               # Start development server
npm run build             # Build for production
```

## 🐛 Troubleshooting

### Common Issues
1. **Virtual Environment Issues**
   - Make sure uv is installed: `uv --version`
   - Recreate virtual environment: `rm -rf .venv && uv venv && uv sync`

2. **Dependency Issues**
   - Update dependencies: `uv sync --upgrade`
   - Clear cache: `uv cache clean`

3. **API Connection Issues**
   - Verify all environment variables are set
   - Check API key validity
   - Ensure backend server is running on correct port

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI team for the excellent web framework
- LangChain team for the LLM integration tools
- Firebase team for authentication and database services
- Pinecone for vector database capabilities
- SerpAPI for job search functionality
- Astral team for the lightning-fast uv package manager


