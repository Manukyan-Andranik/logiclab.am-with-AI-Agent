# LogicLab - FastAPI + React

Modernized LogicLab educational platform with FastAPI backend and React + TypeScript frontend.

## Project Structure

```
new_logiclab.am/
├── app/                    # FastAPI Backend
│   ├── api/
│   │   ├── endpoints/      # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── courses.py
│   │   │   ├── instructors.py
│   │   │   ├── students.py
│   │   │   ├── registrations.py
│   │   │   ├── materials.py
│   │   │   ├── projects.py
│   │   │   ├── success_stories.py
│   │   │   ├── visits.py
│   │   │   ├── contact_messages.py
│   │   │   ├── certificates.py
│   │   │   └── enrollments.py
│   │   └── deps.py         # Auth dependencies
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── email.py
│   │   └── security.py
│   ├── models/
│   │   └── models.py       # SQLAlchemy models
│   ├── schemas/
│   │   └── schemas.py      # Pydantic schemas
│   └── main.py             # FastAPI application
├── frontend_hin/           # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
└── .env                    # Environment variables
```

## Running the Application

### Backend (FastAPI)

1. **Create virtual environment and install dependencies:**
   ```bash
   cd new_logiclab.am
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables** - Create/update `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/logiclab
   SECRET_KEY=your-secret-key
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASSWORD=your-password
   SMTP_FROM_EMAIL=noreply@logiclab.am
   SMTP_FROM_NAME=LogicLab
   ```

3. **Run the backend:**
   ```bash
   python -m app.main
   # Or: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Backend runs at: http://localhost:8000  
   API docs: http://localhost:8000/api/docs

### Frontend (React)

1. **Install dependencies and run:**
   ```bash
   cd frontend_hin
   npm install
   npm run dev
   ```
   Frontend runs at: http://localhost:5173 (or 3000)

2. **Configure API URL** - Create `frontend_hin/.env`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

## Migration Summary

### Fixes Applied

**Backend:**
- Fixed contact form endpoint to accept JSON body (Pydantic `ContactFormBody`) instead of query params
- Enhanced admin dashboard to return course-level registration stats (pending, confirmed, rejected, completed counts per course)
- Added `joinedload` for Course.instructors in dashboard query

**Frontend:**
- Removed erroneous vitest import from `api.ts`
- Fixed contact form API path (`/contact` instead of `/api/contact` to avoid double `/api`)
- Fixed `getProjectsByCourse` to use correct endpoint `/projects/by-course/{id}`
- Replaced mock dashboard data with real API call to `/admin/dashboard`
- Fixed AdminDashboard to use response directly (not `response.data`)
- Fixed Register form: safe handling of `course_id`, validation before submit, support for `course_id` in URL params
- Fixed Header nav link for projects (`/projects` instead of `/projects`)
- Added CORS origins for Vite dev server (port 5173)

### New Pages & Routes

- **Instructors** - Public page at `/instructors` (parity with logiclab.am)
- **ML Project Detail** - Project detail page at `/projects/:id`
- **Register with course** - Route `/register/:courseId` for direct course registration
- **Admin ML Projects** - Admin page at `/admin/projects` for listing projects

### Architecture Notes

- **Backend:** Uses SQLAlchemy + PostgreSQL (different from logiclab.am's MongoDB). JWT authentication.
- **Data model:** Courses, Instructors, Students, Registrations, Projects (SQL) vs. MongoDB collections.
- **Auth:** Email/password + JWT (vs. API key in logiclab.am). Admin and Student roles supported.
