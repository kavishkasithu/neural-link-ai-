const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_APPROVED_USERS = [
  { name: 'Trader 01', username: 'trader01', email: 'trader01', password: 'user@101', status: 'approved', createdAt: 1730000001000 },
  { name: 'Trader 02', username: 'trader02', email: 'trader02', password: 'user@202', status: 'approved', createdAt: 1730000002000 },
  { name: 'Trader 03', username: 'trader03', email: 'trader03', password: 'user@303', status: 'approved', createdAt: 1730000003000 },
  { name: 'Trader 04', username: 'trader04', email: 'trader04', password: 'user@404', status: 'approved', createdAt: 1730000004000 },
  { name: 'Trader 05', username: 'trader05', email: 'trader05', password: 'user@505', status: 'approved', createdAt: 1730000005000 },
  { name: 'Kaviya FX 01', username: 'kaviya01', email: 'kaviya01', password: 'kavi@111', status: 'approved', createdAt: 1730000006000 },
  { name: 'Kaviya FX 02', username: 'kaviya02', email: 'kaviya02', password: 'kavi@222', status: 'approved', createdAt: 1730000007000 },
  { name: 'Neural VIP 01', username: 'neural01', email: 'neural01', password: 'vip@707', status: 'approved', createdAt: 1730000008000 },
  { name: 'Neural VIP 02', username: 'neural02', email: 'neural02', password: 'vip@808', status: 'approved', createdAt: 1730000009000 },
  { name: 'Alpha Trader', username: 'alpha01', email: 'alpha01', password: 'alpha@909', status: 'approved', createdAt: 1730000010000 }
];

let mongoCollection = null;
let cachedDb = null;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDefaultDb() {
  return {
    users: [...DEFAULT_APPROVED_USERS],
    dailySummary: {
      date: getTodayKey(),
      totalSignals: 0,
      wins: 0,
      losses: 0,
      buyCount: 0,
      sellCount: 0,
      realizedPnlPct: 0,
      trades: []
    },
    monthlyReport: {
      month: getMonthKey(),
      days: {}
    },
    chartHistory: []
  };
}

function isMongoConnected() {
  return Boolean(mongoCollection);
}

async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (uri && uri.startsWith('mongodb')) {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db(process.env.MONGODB_DB_NAME || 'neural_trading');
      mongoCollection = db.collection('app_state');

      const doc = await mongoCollection.findOne({ _id: 'main_state' });
      if (doc) {
        const { _id, ...rest } = doc;
        cachedDb = rest;
      } else {
        cachedDb = getDefaultDb();
        await mongoCollection.replaceOne(
          { _id: 'main_state' },
          { _id: 'main_state', ...cachedDb },
          { upsert: true }
        );
      }
      console.log('✅ Connected to MongoDB Atlas successfully!');
      return;
    } catch (err) {
      console.error('⚠️ MongoDB Atlas connection failed, falling back to local JSON:', err.message);
      mongoCollection = null;
    }
  }

  // Local JSON fallback when running offline without MONGODB_URI
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    try {
      cachedDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (_) {
      cachedDb = getDefaultDb();
    }
  } else {
    cachedDb = getDefaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(cachedDb, null, 2), 'utf-8');
  }
}

function readDb() {
  if (!cachedDb) cachedDb = getDefaultDb();

  const today = getTodayKey();
  const month = getMonthKey();
  let changed = false;

  // Midnight auto-reset for daily summary while archiving into monthlyReport
  if (!cachedDb.dailySummary || cachedDb.dailySummary.date !== today) {
    if (cachedDb.dailySummary && cachedDb.dailySummary.date && cachedDb.monthlyReport) {
      cachedDb.monthlyReport.days[cachedDb.dailySummary.date] = {
        trades: cachedDb.dailySummary.totalSignals || 0,
        wins: cachedDb.dailySummary.wins || 0,
        losses: cachedDb.dailySummary.losses || 0,
        buyCount: cachedDb.dailySummary.buyCount || 0,
        sellCount: cachedDb.dailySummary.sellCount || 0,
        netPnlPct: Number(cachedDb.dailySummary.realizedPnlPct || 0)
      };
    }
    cachedDb.dailySummary = getDefaultDb().dailySummary;
    changed = true;
  }

  if (!cachedDb.monthlyReport || cachedDb.monthlyReport.month !== month) {
    cachedDb.monthlyReport = { month, days: {} };
    changed = true;
  }

  if (changed) writeDb(cachedDb);
  return cachedDb;
}

function writeDb(data) {
  cachedDb = data;
  if (mongoCollection) {
    mongoCollection
      .replaceOne({ _id: 'main_state' }, { _id: 'main_state', ...data }, { upsert: true })
      .catch(err => console.error('MongoDB sync error:', err.message));
  } else {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }
}

module.exports = {
  initDb,
  isMongoConnected,
  readDb,
  writeDb,
  getTodayKey,
  getMonthKey,
  DEFAULT_APPROVED_USERS
};
