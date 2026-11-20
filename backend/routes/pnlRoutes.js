const express = require('express');
const router = express.Router();
const { readDb, writeDb, getTodayKey, getMonthKey } = require('../services/dbService');

// GET /api/pnl/summary
router.get('/summary', (req, res) => {
  const db = readDb();
  res.json({
    ok: true,
    dailySummary: db.dailySummary,
    monthlyReport: db.monthlyReport
  });
});

// PUT /api/pnl/sync
router.put('/sync', (req, res) => {
  const db = readDb();
  if (req.body.dailySummary) {
    db.dailySummary = req.body.dailySummary;
  }
  if (req.body.monthlyReport) {
    db.monthlyReport = req.body.monthlyReport;
  }
  writeDb(db);
  res.json({ ok: true, dailySummary: db.dailySummary, monthlyReport: db.monthlyReport });
});

// POST /api/pnl/reset-day
router.post('/reset-day', (req, res) => {
  const db = readDb();
  db.dailySummary = {
    date: getTodayKey(),
    totalSignals: 0,
    wins: 0,
    losses: 0,
    buyCount: 0,
    sellCount: 0,
    realizedPnlPct: 0,
    trades: []
  };
  db.monthlyReport.days[getTodayKey()] = {
    trades: 0, wins: 0, losses: 0, buyCount: 0, sellCount: 0, netPnlPct: 0
  };
  writeDb(db);
  res.json({ ok: true, dailySummary: db.dailySummary, monthlyReport: db.monthlyReport });
});

// POST /api/pnl/reset-month
router.post('/reset-month', (req, res) => {
  const db = readDb();
  db.monthlyReport = {
    month: getMonthKey(),
    days: {}
  };
  writeDb(db);
  res.json({ ok: true, monthlyReport: db.monthlyReport });
});

module.exports = router;
