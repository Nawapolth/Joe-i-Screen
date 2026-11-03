# 🏥 Joe-iMed Backend Integration — Quick Reference

## 🚀 Start Here

### 1. Add Your OpenRouter API Key
```bash
# Edit this file and add your key
backend/.env
```

Get free key: https://openrouter.ai/keys

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Frontend (New Terminal)
```bash
npm run dev
```

**Done!** Open http://localhost:5173

---

## 📁 New Files Created

| File | Purpose |
|------|---------|
| `backend/server.js` | Express server with `/api/screen` endpoint |
| `backend/package.json` | Dependencies: express, cors, dotenv |
| `backend/.env` | **← Add your API key here** |
| `backend/.env.example` | Configuration template |
| `backend/README.md` | Backend documentation |
| `src/api.js` | Frontend API client utility |
| `SETUP_GUIDE.md` | Complete setup documentation |
| `BACKEND_SETUP_COMPLETE.md` | Integration summary |

---

## 🔧 Configuration

### `backend/.env` (Create manually)
```
OPENROUTER_KEY=sk_your_openrouter_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### `frontend/.env` (Optional)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:5000/health
```

### Medical Screening
```bash
POST http://localhost:5000/api/screen
Content-Type: application/json

{
  "prompt": "Patient information and symptoms here..."
}
```

---

## 🎯 Response Examples

### Question Mode (Need More Info)
```json
{
  "mode": "question_mode",
  "questions": [
    "When did symptoms start?",
    "Any recent travel?",
    "Current medications?"
  ]
}
```

### Result Mode (Ready for Recommendation)
```json
{
  "mode": "result_mode",
  "risk_level": "High",
  "recommended_specialty": "Cardiologist",
  "summary": "Clinical findings...",
  "urgency_score": 8,
  "next_steps": ["ECG", "Blood tests", "Referral"]
}
```

---

## 🔒 Security Features

✅ API key stored only on backend
✅ Frontend never touches OpenRouter
✅ CORS restricted to frontend URL
✅ Input validation on all requests
✅ Error handling prevents key exposure

---

## 🧪 Quick Test

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

### Test 2: Screening Endpoint
```bash
curl -X POST http://localhost:5000/api/screen \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Patient with fever and cough"}'
```

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Cannot connect to backend" | Backend not running: `npm run dev` in `backend/` |
| "OPENROUTER_KEY not set" | Edit `backend/.env` and add your key |
| CORS errors | Check `FRONTEND_URL` in `backend/.env` |
| Port already in use | Change `PORT` in `backend/.env` |
| Frontend can't find api.js | Restart dev server after creating `src/api.js` |

---

## 📚 Documentation

- **SETUP_GUIDE.md** — Full setup and architecture
- **backend/README.md** — Backend-specific details
- **BACKEND_SETUP_COMPLETE.md** — Integration checklist

---

## ✅ Verification Checklist

- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] `backend/.env` created with your OpenRouter API key
- [ ] Backend starts without errors (`npm run dev` in backend/)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] `src/api.js` exists and is imported in App.jsx
- [ ] Frontend can call `http://localhost:5000/api/screen`
- [ ] Test health check: `curl http://localhost:5000/health`

---

## 🎓 Architecture Overview

```
Patient Form (Frontend)
    ↓
callScreeningAPI() in src/api.js
    ↓
POST /api/screen (Backend)
    ↓
Add System Prompt → Call OpenRouter
    ↓
Parse JSON Response
    ↓
Return { mode, questions/results } (Frontend)
    ↓
Display Recommendations
```

---

## 📞 Support

1. Check backend logs in terminal
2. Check browser console (F12)
3. Review error messages
4. Test health endpoint
5. Verify API key in `.env`

---

**Last Updated:** 2026-07-21
**Status:** ✅ Ready to Start
