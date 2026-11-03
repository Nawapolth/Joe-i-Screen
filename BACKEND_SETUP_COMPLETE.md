# Backend & Frontend Integration Complete ✅

## What Was Implemented

### ✅ Backend Setup (`backend/` folder)
- **Express.js server** with proper configuration
- **Secure API endpoint** `/api/screen` that:
  - Accepts patient information via prompt
  - Securely forwards to OpenRouter (key never exposed)
  - Validates and parses JSON responses
  - Returns structured data in two modes: question_mode or result_mode
- **System prompt** that forces AI to respond with valid JSON only
- **CORS configured** for frontend communication
- **Error handling** for all failure cases
- **Health check endpoint** for monitoring

### ✅ Frontend Updates (`src/api.js`)
- New **API client utility** (`callScreeningAPI`) for backend communication
- **Prompt formatter** (`formatPatientPrompt`) to structure patient data
- **Updated `callAI` function** that calls backend instead of direct OpenRouter
- **Removed VITE_OPENROUTER_KEY requirement** from frontend

### ✅ Documentation
- **SETUP_GUIDE.md** - Complete project setup and architecture
- **backend/README.md** - Backend-specific documentation
- **.env files** - Configuration templates for both frontend and backend

---

## Quick Start (Next Steps)

### 1. Add Your OpenRouter API Key

Edit `backend/.env` and replace the placeholder:

```
OPENROUTER_KEY=sk_your_actual_key_here
```

Get your free key at: https://openrouter.ai/keys

### 2. Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Expected output:
```
🏥 Medical Screening Backend is running on http://localhost:5000
📡 API endpoint: POST http://localhost:5000/api/screen
✅ CORS enabled for: http://localhost:5173
```

### 3. Start Frontend (Terminal 2)

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Test the Integration

1. Fill in the patient intake form
2. Select symptoms
3. Click "วิเคราะห์ด้วย AI"
4. Backend will securely analyze and return results

---

## File Structure

```
joe-imed/
├── backend/                          # NEW: Express backend
│   ├── server.js                    # Main server with /api/screen endpoint
│   ├── package.json                 # Dependencies: express, cors, dotenv
│   ├── .env                         # Configuration (add your API key here)
│   ├── .env.example                 # Template
│   ├── README.md                    # Backend documentation
│   └── node_modules/               # Installed packages
│
├── src/
│   ├── App.jsx                      # UPDATED: Now uses backend API
│   ├── api.js                       # NEW: Backend API client utility
│   ├── main.jsx
│   ├── index.css
│   ├── App.css
│   └── assets/
│
├── public/
├── supabase/
├── package.json
├── vite.config.js
├── eslint.config.js
├── .env.example                     # Updated (no more VITE_OPENROUTER_KEY needed)
├── SETUP_GUIDE.md                   # NEW: Complete setup documentation
└── README.md
```

---

## API Integration Summary

### Frontend (`src/api.js`)
```javascript
import { callScreeningAPI, formatPatientPrompt } from "./api";

// Format patient data into prompt
const prompt = formatPatientPrompt(patientData);

// Call backend (no API key needed on frontend)
const result = await callScreeningAPI(prompt);

// Result has two modes:
if (result.mode === "question_mode") {
  // Show follow-up questions
}
if (result.mode === "result_mode") {
  // Show diagnosis recommendation
}
```

### Backend (`backend/server.js`)
```javascript
POST /api/screen
├─ Receives: { prompt: "patient info..." }
├─ Adds system prompt (forces JSON response)
├─ Calls OpenRouter with secure API key
├─ Parses AI response as JSON
└─ Returns: { mode, questions/results, next_steps }
```

---

## Security Features

🔒 **API Key Protection**
- OpenRouter key stored only in `backend/.env`
- Frontend never has access to paid APIs
- All requests proxied through backend

🔒 **CORS Security**
- Only `http://localhost:5173` can make requests
- Change `FRONTEND_URL` in `.env` for production

🔒 **Input Validation**
- Backend validates all incoming requests
- Sanitizes data before sending to OpenRouter
- Validates JSON responses

🔒 **Error Handling**
- Sensitive errors logged server-side only
- Frontend receives generic error messages
- No API key exposure in error responses

---

## Response Examples

### Question Mode (Need More Info)
```json
{
  "mode": "question_mode",
  "questions": [
    "When did these symptoms start?",
    "Any recent travel or exposures?",
    "Are you currently on any medications?"
  ]
}
```

### Result Mode (Ready for Recommendation)
```json
{
  "mode": "result_mode",
  "risk_level": "High",
  "recommended_specialty": "Cardiologist",
  "summary": "Patient presents with chest pain and shortness of breath",
  "urgency_score": 8,
  "next_steps": [
    "Immediate ECG",
    "Troponin and CK-MB blood tests",
    "Chest X-ray",
    "Cardiology referral"
  ]
}
```

---

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Screening Endpoint
```bash
curl -X POST http://localhost:5000/api/screen \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Patient with fever and cough"}'
```

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

Note: `VITE_OPENROUTER_KEY` is no longer needed!

### Backend (`backend/.env`)
```
OPENROUTER_KEY=sk_your_openrouter_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to backend" | Make sure backend is running with `npm run dev` in `backend/` folder |
| "OPENROUTER_KEY not set" | Edit `backend/.env` and add your API key |
| CORS errors | Verify `FRONTEND_URL` in `backend/.env` matches your frontend URL |
| "Invalid JSON response" | Check backend logs, verify API key is valid |
| Port already in use | Change `PORT` in `backend/.env` to a different port |

---

## Next Steps

1. ✅ Add your OpenRouter API key to `backend/.env`
2. ✅ Start both backend and frontend servers
3. ✅ Test the intake form with AI analysis
4. ✅ Verify patient data is saved to Supabase
5. 🔄 Customize the system prompt for your medical domain
6. 🔄 Add more fields to the response structure if needed
7. 🔄 Deploy backend to production (Railway, Render, Vercel, etc.)
8. 🔄 Update `FRONTEND_URL` and `VITE_API_BASE_URL` for production

---

## Files Changed/Created

### Created
- `backend/server.js` - Express server with /api/screen endpoint
- `backend/package.json` - Backend dependencies
- `backend/.env` - Backend configuration
- `backend/.env.example` - Backend configuration template
- `backend/.gitignore` - Backend git ignore rules
- `backend/README.md` - Backend documentation
- `src/api.js` - Frontend API client utility
- `SETUP_GUIDE.md` - Project setup guide

### Modified
- `src/App.jsx` - Updated to import and use new API client
- `.env.example` - Updated (removed VITE_OPENROUTER_KEY)

---

## Verification

✅ Backend created with `/api/screen` endpoint
✅ Frontend API client created in `src/api.js`
✅ App.jsx updated to use backend instead of direct API calls
✅ No frontend API keys needed anymore
✅ Dependencies installed (`npm install` in backend/)
✅ Frontend builds successfully
✅ Documentation created

Ready to start development! 🚀
