require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb, isMongoConnected } = require('./services/dbService');
const authRoutes = require('./routes/authRoutes');
const visionRoutes = require('./routes/visionRoutes');
const marketRoutes = require('./routes/marketRoutes');
const pnlRoutes = require('./routes/pnlRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure MongoDB connects cleanly on Vercel Serverless cold starts & reuses warm connections
let dbInitPromise = null;
app.use(async (req, res, next) => {
  try {
    if (!dbInitPromise) {
      dbInitPromise = initDb().catch((err) => {
        dbInitPromise = null;
        throw err;
      });
    }
    await dbInitPromise;
  } catch (err) {
    console.error('DB init middleware warning:', err.message);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Neural Trading AI Backend (Vercel)',
    database: isMongoConnected() ? 'mongodb_atlas' : 'local_json_fallback',
    visionReady: Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') ||
      (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here')
    ),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/pnl', pnlRoutes);

// Root status route
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Neural Trading AI Backend is Live on Vercel!' });
});

// Run listen() only when running locally (not on Vercel Serverless)
if (!process.env.VERCEL) {
  const frontendDir = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendDir));
  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`⚡ Neural Trading AI Backend running on port ${PORT}`);
    });
  });
}

module.exports = app;
