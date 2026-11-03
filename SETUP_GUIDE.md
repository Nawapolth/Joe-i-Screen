# Joe-iMed: Medical Screening System

A modern medical screening application with a secure backend API architecture.

## Project Structure

```
joe-imed/
├── frontend/                    # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx             # Main application component
│   │   ├── api.js              # API client utilities (calls backend)
│   │   ├── main.jsx
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── backend/                     # Express.js API server
│   ├── server.js               # Main backend server
│   ├── package.json
│   ├── .env.example            # Configuration template
│   ├── README.md               # Backend documentation
│   └── .gitignore
│
└── supabase/                    # Supabase cloud functions
    ├── config.toml
    └── functions/
```

## Quick Start

### Prerequisites
- Node.js 16+ installed
- OpenRouter API key (get free one at https://openrouter.ai)

### Step 1: Frontend Setup

```bash
# Install frontend dependencies
npm install

# Copy environment template
cp .env.example .env

# The frontend will call: http://localhost:5000/api/screen
# (API key is managed securely on backend)
```

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install backend dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Edit .env and add your OpenRouter API key:
# OPENROUTER_KEY=sk_your_actual_key_here
```

### Step 3: Start Both Services

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🏥 Medical Screening Backend is running on http://localhost:5000
📡 API endpoint: POST http://localhost:5000/api/screen
✅ CORS enabled for: http://localhost:5173
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Architecture

### Data Flow

```
Frontend (React)
    ↓
    API Request to /api/screen
    ↓
Backend (Express)
    ├─ Validates request
    ├─ Adds system prompt
    ├─ Calls OpenRouter API with secure key
    └─ Parses & validates JSON response
    ↓
Frontend (React)
    ├─ Receives structured JSON
    ├─ If question_mode: Show follow-up questions
    └─ If result_mode: Show diagnosis recommendation
```

### Security

✅ **API Keys Protected** - OpenRouter key stored only on backend in `.env`
✅ **No Frontend Secrets** - Frontend has no direct access to paid APIs
✅ **CORS Controlled** - Only your frontend can make requests
✅ **Input Validation** - All requests validated before API calls
✅ **Error Handling** - Sensitive errors logged server-side only

### Response Modes

The AI can respond in two modes:

**Question Mode** (need more information)
```json
{
  "mode": "question_mode",
  "questions": [
    "When did symptoms start?",
    "Any existing conditions?",
    "Current medications?"
  ]
}
```

**Result Mode** (sufficient information for diagnosis)
```json
{
  "mode": "result_mode",
  "risk_level": "High|Medium|Low",
  "recommended_specialty": "Cardiologist, General Practitioner, etc.",
  "summary": "Clinical assessment summary",
  "urgency_score": 1-10,
  "next_steps": ["step 1", "step 2", "step 3"]
}
```

## Frontend Features

- **Patient Intake Form** - Multi-step form for patient information
- **AI Analysis** - Real-time medical screening via backend API
- **Patient Dashboard** - View and manage patient records
- **Theme Toggle** - Light/dark mode support
- **Supabase Integration** - Optional patient data storage

## Backend Features

- **Secure Screening Endpoint** - `/api/screen` with input validation
- **Prompt Engineering** - Strict system prompt for JSON-only responses
- **Error Handling** - Comprehensive error responses with logging
- **CORS Support** - Configured for frontend communication
- **Health Check** - `GET /health` endpoint for monitoring

## Environment Variables

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

### Backend (`backend/.env`)
```
OPENROUTER_KEY=sk_your_openrouter_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## Common Tasks

### Test Backend Health
```bash
curl http://localhost:5000/health
```

### Test Screening Endpoint
```bash
curl -X POST http://localhost:5000/api/screen \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Patient with fever and cough"}'
```

### Update Patient with AI Result
The frontend stores AI results in Supabase alongside patient data when submitting the intake form.

### Check Backend Logs
Backend logs all API calls and errors. Watch the backend terminal for:
- Request details
- OpenRouter responses
- Parsing results
- Any errors

## Troubleshooting

### "Cannot connect to backend"
1. Ensure backend is running: `npm run dev` in `backend/` folder
2. Check backend is on correct port: `curl http://localhost:5000/health`
3. Verify `VITE_API_BASE_URL` in frontend `.env` matches backend URL

### "OPENROUTER_KEY not set"
1. Check `backend/.env` file exists
2. Verify `OPENROUTER_KEY=sk_...` is present
3. Restart backend server after modifying `.env`
4. Check for typos in key

### "Invalid JSON response"
1. Backend automatically strips markdown code blocks
2. Check backend logs for raw API response
3. Verify OpenRouter API key is valid
4. Try a simpler prompt for testing

### CORS errors in browser console
1. Check `FRONTEND_URL` in `backend/.env` matches your frontend URL
2. Verify backend is running and accessible
3. Try accessing `http://localhost:5000/health` directly in browser

## Development Workflow

1. **Make frontend changes** → Hot reload automatically in browser
2. **Make backend changes** → Server auto-restarts with `npm run dev`
3. **Check logs** → Both frontend (console) and backend (terminal) logs are important
4. **Test API** → Use curl or Postman to test backend endpoints
5. **Debug JSON** → Backend logs raw responses, frontend shows formatted results

## Deployment

### Frontend
- Deploy to Vercel, Netlify, or similar
- Update `VITE_API_BASE_URL` to production backend URL

### Backend
- Deploy to Railway, Render, Heroku, or similar
- Set environment variables on hosting platform
- Update `FRONTEND_URL` to production frontend URL
- Enable HTTPS for all connections

## Next Steps

1. ✅ Set up backend with your OpenRouter API key
2. ✅ Start both frontend and backend servers
3. ✅ Test the screening endpoint from frontend
4. ✅ Verify patient data is being saved to Supabase
5. 🔄 Customize system prompt for your medical domain
6. 🔄 Add more response fields as needed
7. 🔄 Deploy to production

## Support

For issues or questions:
1. Check the backend `README.md` for backend-specific help
2. Review error messages in browser console (frontend)
3. Check terminal logs (backend)
4. Verify all environment variables are set correctly
5. Test with curl: `curl http://localhost:5000/health`

---

**Last Updated:** 2026-07-21
**Version:** 1.0.0
