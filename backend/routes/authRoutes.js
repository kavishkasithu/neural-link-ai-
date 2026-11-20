const express = require('express');
const router = express.Router();
const { readDb, writeDb } = require('../services/dbService');

const ADMIN_USER = (process.env.ADMIN_USERNAME || 'kavishkasithumina').toLowerCase();
const ADMIN_PASS = (process.env.ADMIN_PASSWORD || 'kavishka@1234').toLowerCase();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '').trim();
  const normId = identifier.toLowerCase();

  if (!normId || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required.' });
  }

  // Admin Check
  const isAdmin =
    ((normId === ADMIN_USER || normId === 'kavishka sithumina') && password.toLowerCase() === ADMIN_PASS) ||
    (normId === 'kaviyafx' && password.toLowerCase() === 'kaviyafx1234');

  if (isAdmin) {
    const db = readDb();
    const pendingCount = db.users.filter(u => u.status !== 'approved').length;
    return res.json({
      ok: true,
      role: 'admin',
      user: { name: 'kavishkasithumina', email: 'kavishkasithumina', role: 'admin' },
      pendingCount
    });
  }

  // Standard User Check
  const db = readDb();
  const matches = db.users.filter(u => {
    const uEmail = String(u.email || '').toLowerCase();
    const uUser = String(u.username || '').toLowerCase();
    const uName = String(u.name || '').toLowerCase();
    return uEmail === normId || uUser === normId || uName === normId;
  });

  if (!matches.length) {
    return res.status(401).json({ ok: false, error: `Username "${identifier}" not found. Click SIGN UP to request access.` });
  }

  const matched = matches.find(u => u.password === password || u.password.toLowerCase() === password.toLowerCase());
  if (!matched) {
    return res.status(401).json({ ok: false, error: `Incorrect password for "${identifier}".` });
  }

  if (matched.status !== 'approved') {
    return res.status(403).json({
      ok: false,
      pending: true,
      error: `Account "${matched.email}" is pending Admin approval.`
    });
  }

  return res.json({
    ok: true,
    role: 'user',
    user: { name: matched.name || matched.email, email: matched.email, role: 'user' }
  });
});

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const name = String(req.body.name || '').trim();
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ ok: false, error: 'Username/Email and password are required.' });
  }

  const db = readDb();
  const normId = identifier.toLowerCase();
  const idx = db.users.findIndex(
    u => String(u.email || '').toLowerCase() === normId || String(u.username || '').toLowerCase() === normId
  );

  const displayName = name || identifier.split('@')[0];
  if (idx !== -1) {
    db.users[idx].name = displayName;
    db.users[idx].password = password;
    if (db.users[idx].status !== 'approved') db.users[idx].status = 'pending';
  } else {
    db.users.unshift({
      name: displayName,
      username: identifier,
      email: identifier,
      password,
      status: 'pending',
      createdAt: Date.now()
    });
  }

  writeDb(db);
  return res.json({ ok: true, message: `Sign Up request sent to Admin Panel for ${identifier}.` });
});

// ADMIN ROUTES: List / Add / Approve / Suspend / Delete Users
router.get('/admin/users', (req, res) => {
  const db = readDb();
  res.json({ ok: true, users: db.users });
});

router.post('/admin/users', (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '').trim();
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required.' });
  }
  const db = readDb();
  const idx = db.users.findIndex(u => String(u.email || '').toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    db.users[idx].password = password;
    db.users[idx].status = 'approved';
  } else {
    db.users.unshift({
      name: email.split('@')[0],
      username: email,
      email,
      password,
      status: 'approved',
      createdAt: Date.now()
    });
  }
  writeDb(db);
  res.json({ ok: true, users: db.users });
});

router.patch('/admin/users/:index/status', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const status = req.body.status === 'approved' ? 'approved' : 'pending';
  const db = readDb();
  if (!db.users[idx]) return res.status(404).json({ ok: false, error: 'User not found' });
  db.users[idx].status = status;
  writeDb(db);
  res.json({ ok: true, users: db.users });
});

router.delete('/admin/users/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const db = readDb();
  if (!db.users[idx]) return res.status(404).json({ ok: false, error: 'User not found' });
  db.users.splice(idx, 1);
  writeDb(db);
  res.json({ ok: true, users: db.users });
});

router.delete('/admin/users', (req, res) => {
  const db = readDb();
  db.users = [];
  writeDb(db);
  res.json({ ok: true, users: [] });
});

module.exports = router;
