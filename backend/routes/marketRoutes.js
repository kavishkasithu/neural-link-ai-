const express = require('express');
const router = express.Router();

// ---------------- LIVE BINANCE FUTURES SCAN (PRICE + 24H CHANGE + FUNDING RATE) ----------------
router.get('/binance-scan', async (req, res) => {
  try {
    const [tickerResp, fundingResp] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/ticker/24hr'),
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex')
    ]);

    if (!tickerResp.ok || !fundingResp.ok) {
      return res.json({ ok: false, pairs: [] });
    }

    const tickers = await tickerResp.json();
    const fundings = await fundingResp.json();

    const fundingMap = {};
    if (Array.isArray(fundings)) {
      fundings.forEach(f => {
        fundingMap[f.symbol] = parseFloat(f.lastFundingRate) || 0;
      });
    }

    const pairs = (Array.isArray(tickers) ? tickers : [])
      .filter(t => t.symbol && t.symbol.endsWith('USDT'))
      .map(t => ({
        binanceSymbol: t.symbol,
        price: parseFloat(t.lastPrice) || 0,
        change: parseFloat(t.priceChangePercent) || 0,
        fundingRate: fundingMap[t.symbol] ?? 0
      }));

    return res.json({ ok: true, pairs });
  } catch (err) {
    return res.json({ ok: false, pairs: [], error: err.message });
  }
});

// ---------------- LIVE KLINES PROXY ----------------
router.get('/klines', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const interval = String(req.query.interval || '15m');
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit, 10) || 60));

    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    const resp = await fetch(url);
    if (!resp.ok) return res.json({ ok: false, klines: [] });

    const raw = await resp.json();
    const klines = raw.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
    }));

    return res.json({ ok: true, klines });
  } catch (err) {
    return res.json({ ok: false, klines: [], error: err.message });
  }
});

// ---------------- LIVE RSS NEWS FEED (CRYPTO + FOREX + STOCKS — ZERO API KEY) ----------------
let cachedRssNews = { ts: 0, items: [] };

const RSS_SOURCES = [
  { name: 'COINTELEGRAPH', url: 'https://cointelegraph.com/rss' },
  { name: 'FOREXLIVE',     url: 'https://www.forexlive.com/feed/news' },
  { name: 'YAHOO FINANCE', url: 'https://finance.yahoo.com/news/rssindex' }
];

function detectSentiment(title = '') {
  const t = title.toLowerCase();
  const bull = ['surge', 'rally', 'bull', 'soar', 'jump', 'gain', 'high', 'breakout', 'buy', 'etf', 'approval', 'growth', 'record', 'up', 'rise'];
  const bear = ['crash', 'drop', 'bear', 'plunge', 'fall', 'dump', 'sell', 'hack', 'sec', 'lawsuit', 'fear', 'recession', 'down', 'slump', 'cut'];
  const bScore = bull.filter(w => t.includes(w)).length;
  const sScore = bear.filter(w => t.includes(w)).length;
  if (bScore > sScore) return 'BULLISH';
  if (sScore > bScore) return 'BEARISH';
  return 'NEUTRAL';
}

function parseRssItems(xml, sourceName) {
  const items = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of matches.slice(0, 4)) {
    const rawTitle = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const title = rawTitle
      .replace(/<!\[CDATA\[\vert{}\]\]>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    const link = ((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '').trim();
    if (title) {
      items.push({ source: sourceName, title, link, sentiment: detectSentiment(title) });
    }
  }
  return items;
}

router.get('/news', async (req, res) => {
  try {
    if (Date.now() - cachedRssNews.ts < 5 * 60 * 1000 && cachedRssNews.items.length > 0) {
      return res.json({ ok: true, news: cachedRssNews.items });
    }

    const results = await Promise.allSettled(
      RSS_SOURCES.map(async (src) => {
        const resp = await fetch(src.url, { headers: { 'User-Agent': 'NeuralTradingAI/1.0' } });
        if (!resp.ok) return [];
        const xml = await resp.text();
        return parseRssItems(xml, src.name);
      })
    );

    const combined = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .slice(0, 12);

    if (combined.length > 0) {
      cachedRssNews = { ts: Date.now(), items: combined };
    }
    return res.json({ ok: true, news: cachedRssNews.items });
  } catch (_) {
    return res.json({ ok: true, news: cachedRssNews.items || [] });
  }
});

module.exports = router;
