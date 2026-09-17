# Instagram Carousel Automation Agent (V1)

A personal automation system that enables users to upload multiple images, preview & reorder them, normalize them to 9:16 aspect ratio, upload them to S3-compatible public object storage (Cloudflare R2), and trigger a pre-configured Make.com scenario to publish a single Instagram Business Carousel post.

## System Architecture

```text
User
  ↓
Web UI (React / Vite / TypeScript / Tailwind CSS)
  ↓
Hermes Backend (FastAPI / SQLite)
  ↓
Object Storage (Cloudflare R2)
  ↓
Make.com Publishing Webhook
  ↓
Instagram Business API (ONE Carousel Post)
```

---

## Directory Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── api/               # API route handlers
│   │   ├── config/            # Centralized settings (Pydantic)
│   │   ├── database/          # SQLite models & repositories
│   │   ├── images/            # Image validation & 9:16 processing
│   │   ├── storage/           # Storage abstraction (R2/S3)
│   │   ├── publishing/        # Make.com scenario client
│   │   ├── jobs/              # Job state machine & manager
│   │   └── utils/             # Logging & helpers
│   ├── tests/                 # Backend automated tests
│   └── requirements.txt
├── frontend/                  # React + Vite + TypeScript frontend
├── data/                      # Local SQLite databases & temporary data
├── logs/                      # Application logs
├── scripts/                   # Deployment and maintenance scripts
├── .env.example               # Environment variables template
└── README.md
```

---

## Getting Started (Local Development)

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

The API health check will be available at:
`http://127.0.0.1:8000/api/health`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend UI will be running at:
`http://localhost:5173`

---

## V1 Roadmap & Current Status

- [x] **Phase A — Project Foundation** (FastAPI, SQLite, React/Vite, Health Endpoint, UI layout)
- [ ] **Phase B — Image Upload** (Client drag & drop, client validation, preview, reordering)
- [ ] **Phase C — Backend Validation** (MIME, readability, dimension checks)
- [ ] **Phase D — 9:16 Processing** (EXIF orientation, center crop, resizing)
- [ ] **Phase E — R2 Storage** (S3-compatible upload, public URL generation)
- [ ] **Phase F — Job/Database System** (SQLite state machine, idempotency, fingerprinting)
- [ ] **Phase G — Make Integration** (Webhook payload dispatch, verification)
- [ ] **Phase H — Instagram Publishing** (Carousel execution confirmation)
- [ ] **Phase I — Error Handling & Cleanup** (URL verification, retry policy, cleanup)
- [ ] **Phase J — AWS Deployment** (Ubuntu EC2, systemd, Nginx, HTTPS)
