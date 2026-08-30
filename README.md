# 🎓 ScholarAI — Agentic AI Scholarship Advisor & Verification Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-Automated_RPA-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5/3.6_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Brevo](https://img.shields.io/badge/Email-Brevo_Transactional-0B996F?style=for-the-badge&logo=sendinblue&logoColor=white)](https://www.brevo.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL_/_SQLite-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

**ScholarAI** is an autonomous multi-agent AI scholarship advisory, automated certificate verification, and real-time educational assistant platform. It pairs rule-based engines, computer vision OCR, stateful supervisor orchestrators, live visible Playwright browser automation for web verification, transactional notifications via Brevo, and Retrieval-Augmented Generation (RAG) powered by Google Gemini to help students discover verified funding, evaluate eligibility across 16 strict criteria, audit document authenticity, and manage applications seamlessly.

---

## 📑 Table of Contents
- [✨ Key Accomplishments & Features](#-key-accomplishments--features)
- [🏛️ System Architecture Diagram](#️-system-architecture-diagram)
- [📂 Detailed Folder & File Architecture](#-detailed-folder--file-architecture)
- [🤖 Multi-Agent Ecosystem & Lifecycle](#-multi-agent-ecosystem--lifecycle)
- [🌐 Visible Google RPA Online Verification Engine](#-visible-google-rpa-online-verification-engine)
- [🔍 OCR & Name-Matching Normalization Engine](#-ocr--name-matching-normalization-engine)
- [📜 Automated Certificate Generator & 1-Click AutoFill](#-automated-certificate-generator--1-click-autofill)
- [🧭 AI Agent Autopilot Guide & State Machine](#-ai-agent-autopilot-guide--state-machine)
- [📬 Brevo Transactional Email Integration](#-brevo-transactional-email-integration)
- [⚙️ Start-to-End Application Lifecycle](#️-start-to-end-application-lifecycle)
- [🛠️ Technologies & Dependencies](#️-technologies--dependencies)
- [🚀 Installation & Setup Guide](#-installation--setup-guide)
- [📡 API Endpoints Reference](#-api-endpoints-reference)
- [🛡️ Anti-Hallucination & Grounding Safeguards](#️-anti-hallucination--grounding-safeguards)

---

## ✨ Key Accomplishments & Features

1. **Intelligent Multi-Agent Orchestration**:
   - 8 specialized autonomous agents coordinated by a centralized **Supervisor Agent** executing profile validation, OCR extraction, fraud/mismatch detection, 16-parameter scholarship matching, online RPA verification, and conversational RAG.
2. **Visible Google RPA Online Verification Engine**:
   - Uses Playwright to launch a live, visible Google Chrome window on the user's desktop (`headless=False`), sequentially typing dynamic questions tailored to the scholarship's criteria (CGPA, Course, Income limit, Category, Domicile, and Portal Deadlines), scrolling results, extracting live web snippets, and corroborating against MySQL database records with audit logging into `Scholarship_Verification.xlsx`.
3. **Strict 16-Parameter Eligibility Engine**:
   - Evaluates CGPA, 10th/12th percentages, family income ceiling, category/caste, native state, degree, department, first-generation graduate status, sports quota, NCC, NSS, disability, minority status, and active arrears history.
4. **Automated Document OCR & Fuzzy Cross-Auditing**:
   - Auto-detects local Tesseract OCR binaries on Windows (`C:\Program Files\Tesseract-OCR\tesseract.exe`).
   - Implements compact string comparison, token set permutations, and fuzzy similarity matching ($\ge 75\%$) to reliably handle OCR variations (e.g. matching `"Anbu g"` with `"ANBUG"`).
5. **Interactive Comparison Wizard & Decoupled Verification**:
   - Frontend and backend modal displays full side-by-side comparison tables between student profile variables and OCR extracted credentials, enabling instant 1-click submission when all checks match.
6. **Automated Certificate Generator with 1-Click Profile AutoFill**:
   - Interactive generator producing authentic government-styled Aadhaar Cards, Tahsildar Income Certificates, Community Certificates, College Bonafides, and Marksheets pre-filled directly from the user's database profile and downloadable as high-resolution PNGs via `html2canvas`.
7. **Secure Authentication & Google OAuth 2.0**:
   - Dual-mode authentication supporting traditional JWT email/password login as well as Google OAuth 2.0 with automatic profile provisioning.
8. **Brevo Transactional Email Notifications**:
   - Asynchronous background email delivery for instant application receipts, status updates, and committee decisions bound securely to verified user emails.
9. **Admin Review & Monitoring Console**:
   - Role-based admin access (`admin@scholarship.com` / `Admin@123`) providing platform analytics, real-time student registry management, application reviews, document audits, and instant status approvals/rejections.

---

## 🏛️ System Architecture Diagram

```mermaid
flowchart TD
    User([Student / User]) <-->|HTTPS / REST API| UI[React 18 + Vite Frontend]
    UI <-->|JWT Authenticated Requests| API[FastAPI Backend Server]

    subgraph Backend Core
        API --> Auth[JWT Auth & Google OAuth 2.0]
        API --> DB[(MySQL / SQLite Database)]
        API --> Supervisor[Supervisor Agent Orchestrator]
        API --> EmailService[Brevo Transactional Email Service]
    end

    subgraph Agentic AI Ecosystem
        Supervisor --> ProfileAgent[Profile Validation Agent]
        Supervisor --> Matching[Scholarship Matching Engine]
        Supervisor --> OCR[OCR Agent - Tesseract]
        Supervisor --> Audit[Verification Agent]
        Supervisor --> GoogleRPA[Visible Google RPA Agent - Playwright]
        Supervisor --> RAG[RAG & Web Grounding Engine]
        
        Matching -->|16 Strict Parameters| DB
        OCR -->|Extracted JSON| Audit
        Audit -->|Fuzzy / Compact Cross-Check| DB
        GoogleRPA -->|Visible Chrome Searches| Web[Google / Official Portals]
        GoogleRPA -->|Comparison Matrix| DB
        GoogleRPA -->|Audit Trail Log| ExcelFile[Scholarship_Verification.xlsx]
        RAG --> LLM[Google Gemini 3.5/3.6 Flash]
    end

    EmailService -->|SMTP/API| Brevo[Brevo Mail Servers]
    Brevo -->|Delivered| UserInbox([Student Email Inbox])
```

---

## 📂 Detailed Folder & File Architecture

```
newbeg/
├── backend/
│   ├── app/
│   │   ├── agent/                                # Autonomous Multi-Agent AI Subsystem
│   │   │   ├── classifier_agent.py               # Document type classification agent
│   │   │   ├── document_agent.py                 # Resolves required documents per scholarship
│   │   │   ├── google_verification_agent.py      # Visible Playwright RPA Google search & comparison engine
│   │   │   ├── matching_agent.py                 # 16-parameter scholarship matching & scoring engine
│   │   │   ├── ocr_agent.py                      # Tesseract OCR engine with image preprocessing
│   │   │   ├── profile_agent.py                  # Profile completeness and range validation
│   │   │   ├── rag_agent.py                      # RAG grounding, web search router & Gemini synthesis
│   │   │   ├── recommendation_agent.py           # Personalized application advice & roadmap generator
│   │   │   ├── supervisor.py                     # Central state machine orchestrator & task scheduler
│   │   │   └── verification_agent.py             # Cross-auditing logic with compact/fuzzy name matching
│   │   │
│   │   ├── services/
│   │   │   └── email_service.py                  # Brevo transactional email delivery service
│   │   │
│   │   ├── auth.py                               # JWT token creation, OAuth handling & bcrypt hashing
│   │   ├── crud.py                               # Database CRUD operations for profiles, docs, and apps
│   │   ├── database.py                           # SQLAlchemy engine & session maker
│   │   ├── main.py                               # FastAPI REST routes, admin auto-seeding & event handlers
│   │   ├── models.py                             # Database models (User, Profile, Document, Application, etc.)
│   │   └── schemas.py                            # Pydantic validation schemas
│   │
│   ├── .env                                      # Backend secrets (API keys, Database URLs)
│   ├── requirements.txt                          # Python package dependencies
│   └── Scholarship_Verification.xlsx             # Live Excel audit log generated by Google RPA Agent
│
├── src/                                          # React Frontend Application
│   ├── assets/                                   # Logos, background textures & media assets
│   ├── components/                               # Reusable Glassmorphism UI Components
│   │   ├── AdaptiveRpaVerificationModal.jsx      # Modal showing live Google RPA steps & comparison matrix
│   │   ├── AutopilotGuide.jsx                    # Dynamic 12-stage workflow guide banner
│   │   ├── GlassCard.jsx                         # Glassmorphic card container with gradient borders
│   │   ├── Navbar.jsx                            # Navigation bar with notification center & user pill
│   │   ├── Sidebar.jsx                           # Dashboard navigation sidebar
│   │   └── Toast.jsx                             # Notification toast provider
│   │
│   ├── context/
│   │   └── AuthContext.jsx                       # Authentication state & JWT session management
│   │
│   ├── pages/                                    # Application Views & Pages
│   │   ├── admin/                                # Admin Console
│   │   │   └── AdminDashboardPage.jsx            # Admin monitoring, analytics, and application approval console
│   │   │
│   │   ├── auth/                                 # Authentication Pages
│   │   │   ├── LoginPage.jsx                     # Traditional & Google OAuth login
│   │   │   └── RegisterPage.jsx                  # Student registration portal
│   │   │
│   │   └── dashboard/                            # Student Portal Pages
│   │       ├── ApplicationsPage.jsx              # Application history, tracking & status timeline
│   │       ├── CertificateGeneratorPage.jsx      # 1-Click Certificate Generator & Profile AutoFill
│   │       ├── ChatAdvisorPage.jsx               # AI Scholarship Counselor chat interface
│   │       ├── DocumentsPage.jsx                 # Document repository, upload & OCR review modals
│   │       ├── JourneyPage.jsx                   # End-to-end interactive scholarship application roadmap
│   │       ├── ProfilePage.jsx                   # 16-parameter student profile editor
│   │       ├── RecommendationsPage.jsx           # Scholarship recommendations, Google RPA trigger & Apply wizard
│   │       └── StudentDashboardPage.jsx          # Overview dashboard with analytics & live suggestions
│   │
│   ├── services/
│   │   └── api.js                                # Central Axios client with auth interceptors
│   │
│   ├── App.jsx                                   # React Router routes & authentication guards
│   ├── index.css                                 # Tailwind CSS styling, keyframe animations & themes
│   └── main.jsx                                  # React 18 DOM mount entrypoint
│
├── package.json                                  # NPM dependencies and build scripts
├── vite.config.js                                # Vite bundler configuration
└── README.md                                     # Comprehensive platform documentation
```

---

## 🤖 Multi-Agent Ecosystem & Lifecycle

| Agent | File | Primary Responsibility |
| :--- | :--- | :--- |
| **Supervisor Agent** | `supervisor.py` | Central state machine orchestrating workflow transitions, task sequencing, and decision logs. |
| **Profile Agent** | `profile_agent.py` | Validates profile completeness, numerical ranges, and missing mandatory fields. |
| **Matching Agent** | `matching_agent.py` | Evaluates candidates across 16 academic, demographic, and quota parameters. |
| **OCR Agent** | `ocr_agent.py` | Extracts structured text from certificates using Tesseract OCR & image preprocessing. |
| **Verification Agent** | `verification_agent.py` | Cross-audits extracted OCR text against user profile database records using compact & fuzzy rules. |
| **Google Verification Agent** | `google_verification_agent.py` | Dynamically executes visible Google searches, compiles comparison matrix, and logs audit records to Excel. |
| **RAG Agent** | `rag_agent.py` | Semantic knowledge retrieval, real-time web search grounding, and Gemini prompt synthesis. |
| **Required Document Agent** | `document_agent.py` | Manages per-scholarship document checklists and verification tracking. |

---

## 🌐 Visible Google RPA Online Verification Engine

When the student clicks **"Verify on Google"** on any scholarship card:
1. **Desktop Chrome Launch**: Playwright launches Chromium visibly on the desktop with `--start-maximized`.
2. **Requirements-Driven Dynamic Searches**:
   - **Query 1 (Identity & Portal)**: `"[Scholarship Name]" [Provider] eligibility criteria official application 2026`
   - **Query 2 (Academic Merit)**: `"[Scholarship Name]" minimum CGPA [Value] eligibility 2026`
   - **Query 3 (Course & Quota)**: `"[Scholarship Name]" [Degree] [Department] [Category] criteria`
   - **Query 4 (Financial Limit)**: `"[Scholarship Name]" annual family income below ₹[Value] income certificate`
   - **Query 5 (Official Deadline)**: `"[Scholarship Name]" application last date deadline status site:scholarships.gov.in OR site:buddy4study.com`
3. **Realistic Human Automation**: Types queries with character key delays (`delay=15ms`), presses Enter, scrolls the search results, and captures domain links.
4. **Corroboration Matrix**: Compares MySQL database parameters against online extracted criteria and returns compatibility statuses (`PASS`, `FLAG`, `ACTIVE`).
5. **Excel Audit Logging**: Writes every query, source URL, and timestamp into `backend/Scholarship_Verification.xlsx`.

---

## 🔍 OCR & Name-Matching Normalization Engine

To resolve common OCR misreadings, spacing variations, and formatting anomalies across official IDs:
- **Compact Normalization**: Strips spaces and special characters: `"Anbu g"` $\to$ `"anbug"` == `"ANBUG"` $\to$ `"anbug"` ✅
- **Token Permutation Matching**: Matches reordered names (e.g. `"Anbu G"` $\to$ `{"anbu", "g"}` == `"G. Anbu"` $\to$ `{"g", "anbu"}`).
- **Fuzzy Ratio Matching**: Employs Levenshtein Sequence Matcher ($\ge 75\%$) for minor OCR character substitutions.
- **Frontend Decoupled Validation**: Evaluates comparison rows directly to instantly clear verification warnings and enable immediate application submission.

---

## 📜 Automated Certificate Generator & 1-Click AutoFill

Located under `/dashboard/certificates`:
- **Supported Documents**:
  - **Aadhaar Identity Card**: Includes authentic Government of India header, photo placeholder, Aadhaar number, and QR code.
  - **Tahsildar Income Certificate**: Official Revenue Department layout with certified annual income and issue seal.
  - **Community / Caste Certificate**: Formal state format with caste classification (BC/MBC/SC/ST/OBC/General).
  - **College Bonafide Certificate**: Academic institution header with degree, roll number, and department.
  - **Semester Grade Sheet / Transcript**: Tabular mark breakdown with verified CGPA and credit tally.
- **1-Click Profile AutoFill**: Reads the active student profile from the database to populate all certificate fields with zero manual typing.
- **Instant High-Res Export**: Uses `html2canvas` to render and download crisp `.png` certificates ready for upload into the verification pipeline.

---

## 🧭 AI Agent Autopilot Guide & State Machine

The dashboard features the **Autopilot Guide** banner directly synchronized with the backend `AgentWorkflowState`:

| Stage | Guide Title | Action Button | Target Route |
| :--- | :--- | :--- | :--- |
| `NOT_STARTED` | Start Your Scholarship Journey | Complete Profile → | `/dashboard/profile` |
| `PROFILE_INCOMPLETE` | Complete Your Student Profile | Complete Profile → | `/dashboard/profile` |
| `PROFILE_READY` | Profile Ready — Finding Scholarships | Find Scholarships → | `/dashboard/recommendations` |
| `MATCHING` | Finding Scholarships for You | View Matches → | `/dashboard/recommendations` |
| `MATCHING_COMPLETED` | Scholarship Matches Found | View Matches → | `/dashboard/recommendations` |
| `DOCUMENTS_MISSING` | Upload Your Documents | Upload Documents → | `/dashboard/documents` |
| `CORRECTION_REQUIRED` | Resolve Verification Issues | Review Issues → | `/dashboard/documents` |
| `APPLICATION_READY` | Application Package Ready! | Submit Final Confirmation → | `/dashboard/journey` |
| `SUBMITTED` | Application Submitted | Track Application → | `/dashboard/applications` |
| `COMPLETED` | Scholarship Journey Complete | View Application → | `/dashboard/applications` |

---

## 📬 Brevo Transactional Email Integration

All user notifications are dispatched securely via Brevo's Transactional Email API:
```text
Student Submits Application
        ↓
Backend Verifies User ID & Fetches Email
        ↓
FastAPI Background Task triggers Brevo API
        ↓
Official Receipt Delivered to Student's Registered Email
```

---

## ⚙️ Start-to-End Application Lifecycle

```
[1. Registration / OAuth] ──> [2. Complete 16-Field Profile] ──> [3. 16-Criteria Matching Engine]
                                                                              │
[6. Real-Time Tracking] <── [5. Brevo Email & Submit] <── [4. Google RPA & OCR Verification]
```

---

## 🛠️ Technologies & Dependencies

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** (Glassmorphic dark/light design system)
- **Lucide React** (Icons)
- **React Router v6** (Navigation)
- **Axios** (API requests with JWT interceptors)
- **html2canvas** (Client-side certificate rendering & PNG export)

### Backend
- **Python 3.11+** & **FastAPI**
- **Playwright** (Visible Chrome RPA browser automation)
- **Tesseract OCR** (`pytesseract`, Pillow, `pdfplumber`, `pypdf`)
- **SQLAlchemy** (ORM with MySQL & SQLite support)
- **OpenPyXL** (Excel audit trail logging)
- **Passlib & PyJWT** (Password hashing & authentication)

### External Services
- **Google Gemini API** (`gemini-3.5-flash`, `gemini-3.6-flash`)
- **Brevo Transactional API** (Automated email delivery)

---

## 🚀 Installation & Setup Guide

### 1. Backend Setup
```bash
cd newbeg/backend
python -m venv venv

# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies & Playwright browser
pip install -r requirements.txt
playwright install chromium
```

Configure `backend/.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/scholarship_db
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@domain.com
BREVO_SENDER_NAME="ScholarAI Platform"
```

Run backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd newbeg
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Default Admin Credentials
| Email | Password | Role |
| :--- | :--- | :--- |
| `admin@scholarship.com` | `Admin@123` | Platform Administrator |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register new student account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT token | Public |
| `GET` | `/api/v1/auth/google/login` | Initiate Google OAuth 2.0 flow | Public |
| `GET` | `/api/v1/profile` | Get current student profile | JWT |
| `PUT` | `/api/v1/profile` | Update 16-parameter student profile | JWT |
| `POST` | `/api/v1/documents/upload` | Upload certificate & run Tesseract OCR | JWT |
| `GET` | `/api/v1/scholarships/matching` | Execute 16-parameter matching engine | JWT |
| `POST` | `/api/v1/agent/verify-scholarship` | Trigger visible Playwright Google RPA search | JWT |
| `POST` | `/api/v1/agent/run` | Execute full multi-agent verification pipeline | JWT |
| `POST` | `/api/v1/applications/{id}` | Submit scholarship application & send email | JWT |
| `GET` | `/api/v1/admin/analytics` | Get admin overview statistics & counts | Admin |
| `PUT` | `/api/v1/admin/applications/{id}/status`| Approve or reject student applications | Admin |

---

## 🛡️ Anti-Hallucination & Grounding Safeguards

1. **Deterministic Rule Precedence**: Eligibility is calculated using strict mathematical inequalities on verified database fields, preventing ungrounded LLM decisions.
2. **Real-Time Live Web Verification**: Online verification checks active government portals (`scholarships.gov.in`, `aicte-india.org`) with timestamped citations.
3. **Audit Trail Accountability**: Every automated Google search is recorded with source URLs in `Scholarship_Verification.xlsx`.
4. **Transparent Verification Feedback**: Visual comparison tables explicitly highlight match/mismatch discrepancies to the student before submission.

---

## 👥 Authors & Academic Review
- **Platform**: ScholarAI — Agentic AI Scholarship Advisor & Verification Platform
- **Domain**: Agentic AI, Autonomous RPA, Computer Vision OCR, Educational Automation
