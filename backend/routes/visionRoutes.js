const express = require('express');
const multer = require('multer');
const router = express.Router();
const { analyzeTradingViewChart } = require('../services/aiVisionService');
const { readDb, writeDb } = require('../services/dbService');

// Store uploaded TradingView chart screenshot in memory (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP) are allowed.'));
    }
  }
});

/**
 * POST /api/vision/analyze-chart
 * Accepts either multipart/form-data ("chartImage" file) OR JSON { imageBase64, mimeType }
 * Returns recognized Forex / Crypto / Stock / Commodity / Index signal
 */
router.post('/analyze-chart', upload.single('chartImage'), async (req, res) => {
  try {
    let base64Data = '';
    let mimeType = 'image/png';

    if (req.file && req.file.buffer) {
      base64Data = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/png';
    } else if (req.body && req.body.imageBase64) {
      const raw = String(req.body.imageBase64);
      const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = raw;
        mimeType = req.body.mimeType || 'image/png';
      }
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Please upload or paste a TradingView chart screenshot.'
      });
    }

    const userContext = {
      marketHint: req.body.marketHint || 'AUTO DETECT',
      tradeStyle: req.body.tradeStyle || 'Intraday Sniper',
      maxEntryDistPct: parseFloat(req.body.maxEntryDistPct || '0.25')
    };

    const signal = await analyzeTradingViewChart(base64Data, mimeType, userContext);

    // Save recent vision scan history in backend DB
    const db = readDb();
    db.chartHistory = db.chartHistory || [];
    db.chartHistory.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...signal
    });
    db.chartHistory = db.chartHistory.slice(0, 30);
    writeDb(db);

    return res.json({ ok: true, signal });
  } catch (err) {
    console.error('[Vision Route Error]', err.message);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to analyze TradingView chart image.'
    });
  }
});

// GET /api/vision/history
router.get('/history', (req, res) => {
  const db = readDb();
  res.json({ ok: true, history: db.chartHistory || [] });
});

module.exports = router;
