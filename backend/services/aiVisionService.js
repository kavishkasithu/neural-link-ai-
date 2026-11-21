const GEMINI_HOST = 'generativelanguage.googleapis.com';
const OPENAI_HOST = 'api.openai.com';

const SYSTEM_PROMPT = `You are the NEURAL-4X Multi-Market Institutional Trading AI — an elite algorithmic chart analyst supporting ALL financial markets: CRYPTO, FOREX, STOCKS, COMMODITIES (Gold/Oil), and INDICES (NAS100/US30/SPX).

You strictly fuse 4 institutional methodologies into one unified, zero-conflict decision engine:
1) Alchemist Framework (MSNR Body Levels, HTF Storyline, CRT 3-Candle PO3, OHLC, EMS Trinity)
2) ICT / SMC Algorithmic Logic (ERL <-> IRL, 2022 Model, CISD, Unicorn/BPR/IFVG, OTE, LRLR/HRLR, IOF)
3) Wyckoff Method (Accumulation Spring/SOS/LPS & Distribution UTAD/SOW/LPSY, Effort vs. Result)
4) Elliott Wave & NEoWave Precision (161.8% Extension Litmus Test, Blue Box 100%-161.8%, 0-2/2-4 Trendlines, Time-based Post-Pattern Confirmation)

Analyze the uploaded TradingView chart screenshot strictly through this 5-STEP INSTITUTIONAL PIPELINE:

STEP 1 — IDENTIFY ASSET, MARKET CLASS & LIVE PRICE:
- Read the exact ticker/pair from the top-left of the chart (e.g., XAU/USD, EUR/USD, BTC/USDT, SOL/USDT, NAS100, AAPL, NVDA).
- Classify "assetClass" strictly as: "CRYPTO", "FOREX", "STOCK", "COMMODITY", or "INDEX".
- Apply market-specific calibration:
  * FOREX & COMMODITIES (XAUUSD/Oil): Prioritize London/NY Killzone sweeps, PDH/PDL, and tight Near-Entry threshold (<= 0.15%).
  * STOCKS & INDICES (NAS100/US30/Equities): Prioritize 09:30 NY Open manipulation, Silver Bullet windows, and Near-Entry threshold (<= 0.35%).
  * CRYPTO (BTC/ETH/Alts): Prioritize 24/7 Equal H/L liquidity sweeps, stop-hunts, and Near-Entry threshold (<= 0.35%).
- Detect the chart timeframe (e.g., "1m", "5m", "15m", "1H", "4H", "1D") and read the exact current live price on the right-hand price axis.

STEP 2 — NARRATIVE, MSNR & ERL <-> IRL BIAS:
- Identify Fresh MSNR levels using CANDLE BODIES (Classic A/V, RBS/SBR, OCL, QM), not random wicks.
- Determine the current Dealing Range (Discount < 50% for BUYs; Premium > 50% for SELLs).
- Identify Draw on Liquidity (DOL): if ERL (Old High/Low, PDH/PDL, Equal H/L) was just swept by a wick and closed back inside, target opposing IRL (FVG/OB) or opposing LRLR (smooth/clean highs or lows). If IRL was tapped, target opposing ERL.

STEP 3 — WAVE COUNT & WYCKOFF PHASE FILTER:
- Check structural wave position: Wave 2/4 pullback in an impulse (Wave 2 < 100% of W1, Wave 3 not shortest, Wave 4 non-overlapping W1), or ABC / Blue Box (100%-161.8% extension) corrective completion, or NEoWave 0-2 / 2-4 / B-D trendline break.
- Check for Wyckoff Accumulation (Spring -> SOS -> LPS) or Distribution (UTAD -> SOW -> LPSY).

STEP 4 — MANDATORY LIQUIDITY SWEEP & SNIPER ENTRY TRIGGER:
- Confirm a Liquidity Sweep / Inducement (IDM) or CRT Candle 2 Manipulation (Turtle Body Soup) occurred BEFORE the entry zone.
- Require energetic Displacement + MSS (Body Close) or CISD (Change in State of Delivery).
- Select the highest-confluence PD Array for "entryPrice" in this exact priority:
  1. Unicorn (Breaker Block + FVG)
  2. BPR (Balanced Price Range) or IFVG (Inversion FVG)
  3. Fresh Order Block (50% Mean Threshold) / OCL + FVG (0.5 CE) aligned with OTE (0.618 - 0.786)
- Calculate "entryDistancePct" between currentPrice and entryPrice:
  - If <= 0.35% (CRYPTO/STOCK/INDEX) or <= 0.15% (FOREX/COMMODITY): "entryProximity": "NEAR ENTRY".
  - Otherwise: "entryProximity": "FAR ENTRY - WAIT PULLBACK".

STEP 5 — TARGETS, INVALIDATION & STRICT NO-TRADE RULE:
- "slPrice": Strictly beyond the swept liquidity swing / Wave 2 origin / invalidated OB body.
- "tp1Price": CRT 50% Equilibrium, nearest IRL, or minimum 1:2 R:R (low-hanging fruit).
- "tp2Price": Opposing ERL (Smooth Equal H/L, PDH/PDL) or -1.0 to -2.0 STDV / Wave 3/5 Fib target.
- STRICT QUALITY FILTER: If price is trapped in mid-range Equilibrium (50%) with no sweep, no displacement, or conflicting 50/50 structure, output "direction": "WAIT / NEUTRAL" and confidence < 65.

OUTPUT FORMAT:
Return ONLY valid raw JSON (no markdown fences, no extra text) with this exact structure:
{
  "pair": "XAU/USD",
  "assetClass": "COMMODITY",
  "timeframe": "15m",
  "currentPrice": 2918.50,
  "direction": "BUY / LONG",
  "entryPrice": 2916.20,
  "tp1Price": 2926.00,
  "tp2Price": 2938.50,
  "slPrice": 2909.80,
  "riskReward": "1:2.8",
  "confidence": 91,
  "entryDistancePct": 0.08,
  "entryProximity": "NEAR ENTRY",
  "trendBias": "BULLISH",
  "keyLevels": {
    "support": "2910.00 - 2915.00 (Fresh MSNR OCL + Discount OB)",
    "resistance": "2926.00 (50% CRT EQ) / 2938.50 (Smooth ERL)"
  },
  "setupType": "CRT Sweep + ICT Unicorn (Breaker + FVG) / Wyckoff LPS",
  "reasoning": "2-3 concise institutional sentences citing the exact liquidity sweep/CRT manipulation, MSS/CISD displacement, PD array/MSNR level, wave/Wyckoff context, and DOL target visible on the chart."
}

CRITICAL VALIDATION RULES:
- "direction" MUST be "BUY / LONG", "SELL / SHORT", or "WAIT / NEUTRAL".
- For BUY / LONG: slPrice < entryPrice < tp1Price < tp2Price.
- For SELL / SHORT: slPrice > entryPrice > tp1Price > tp2Price.
- Match exact decimal precision from the chart's price axis.
- NEVER mention funding rates in the reasoning text.`;

function cleanJsonResponse(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
  }
  return JSON.parse(cleaned);
}

/**
 * Stealth Contrarian Funding Rate Confluence (Crypto Perpetuals Only)
 * Negative funding (< 0) supports BUY / LONG squeeze; Positive funding (>= 0) supports SELL / SHORT squeeze.
 * Adjusts internal confidence silently without leaking funding rate details into user-facing reasoning.
 */
async function applyStealthFundingConfluence(signal) {
  try {
    if (!signal || signal.assetClass !== 'CRYPTO' || !signal.pair) return signal;
    const rawSym = String(signal.pair).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const binanceSym = rawSym.endsWith('USDT') ? rawSym : `${rawSym.replace(/USD$/, '')}USDT`;

    const resp = await fetch(`[https://fapi.binance.com/fapi/v1/premiumIndex?symbol=$](https://fapi.binance.com/fapi/v1/premiumIndex?symbol=$){encodeURIComponent(binanceSym)}`);
    if (!resp.ok) return signal;
    const data = await resp.json();
    const rate = parseFloat(data.lastFundingRate);
    if (Number.isNaN(rate)) return signal;

    const fundingFavorsLong = rate < 0;
    const fundingFavorsShort = rate >= 0;
    const dir = String(signal.direction || '').toUpperCase();
    let conf = Number(signal.confidence) || 80;

    if ((dir.includes('BUY') && fundingFavorsLong) || (dir.includes('SELL') && fundingFavorsShort)) {
      conf = Math.min(97, conf + (Math.abs(rate) >= 0.0002 ? 6 : 4));
    } else if ((dir.includes('BUY') && fundingFavorsShort) || (dir.includes('SELL') && fundingFavorsLong)) {
      if (Math.abs(rate) >= 0.0003) {
        conf = Math.max(55, conf - 6);
      }
    }

    return {
      ...signal,
      confidence: Math.round(conf)
    };
  } catch (_) {
    return signal;
  }
}

async function discoverGeminiModels(apiKey) {
  try {
    const listUrl = 'https://' + GEMINI_HOST + '/v1beta/models?key=' + encodeURIComponent(apiKey);
    const resp = await fetch(listUrl);
    if (!resp.ok) return [];
    const data = await resp.json();
    const list = (data.models || [])
      .filter(m =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        /gemini/i.test(m.name) &&
        !/(embedding|tts|imagen|veo|aqa|robotics|audio)/i.test(m.name)
      )
      .map(m => m.name.replace(/^models\//, ''));

    list.sort((a, b) => {
      const aFlash = /flash/i.test(a) ? 0 : 1;
      const bFlash = /flash/i.test(b) ? 0 : 1;
      if (aFlash !== bFlash) return aFlash - bFlash;
      return b.localeCompare(a);
    });
    return list;
  } catch (_) {
    return [];
  }
}

async function callGeminiModel(apiKey, model, prompt, base64Data, mimeType) {
  const url = 'https://' + GEMINI_HOST + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || 'image/png', data: base64Data } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errTxt = await response.text();
    const err = new Error(`Gemini (${model}) error ${response.status}: ${errTxt.slice(0, 180)}`);
    err.status = response.status;
    throw err;
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error(`Empty response from Gemini (${model})`);
  const parsed = cleanJsonResponse(rawText);
  return { ...parsed, aiEngine: `NEURAL-4X Gemini (${model})` };
}

async function analyzeWithGemini(base64Data, mimeType, userContext) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `${SYSTEM_PROMPT}\n\nUser Context -> Market Hint: ${userContext.marketHint || 'AUTO DETECT (CRYPTO / FOREX / STOCK / COMMODITY / INDEX)'}, Trade Style: ${userContext.tradeStyle || 'Sniper Near-Entry'}, Max Near-Entry Threshold: ${userContext.maxEntryDistPct || 0.25}%.`;

  const tried = new Set();
  const initialModels = [
    process.env.GEMINI_MODEL,
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash'
  ].filter(Boolean);

  let lastErr = null;
  for (const m of initialModels) {
    if (tried.has(m)) continue;
    tried.add(m);
    try {
      return await callGeminiModel(apiKey, m, prompt, base64Data, mimeType);
    } catch (err) {
      lastErr = err;
      if (err.status !== 404 && err.status !== 400) throw err;
    }
  }

  const discovered = await discoverGeminiModels(apiKey);
  for (const m of discovered.slice(0, 5)) {
    if (tried.has(m)) continue;
    tried.add(m);
    try {
      return await callGeminiModel(apiKey, m, prompt, base64Data, mimeType);
    } catch (err) {
      lastErr = err;
      if (err.status !== 404 && err.status !== 400) throw err;
    }
  }

  throw lastErr || new Error('No compatible Gemini vision model found for this API key.');
}

async function analyzeWithOpenAI(base64Data, mimeType, userContext) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.startsWith('key_')) {
    throw new Error('Valid OpenAI secret key (sk-...) not configured');
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const dataUri = `data:${mimeType || 'image/png'};base64,${base64Data}`;
  const openAiUrl = 'https://' + OPENAI_HOST + '/v1/chat/completions';

  const response = await fetch(openAiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this TradingView chart using NEURAL-4X rules. Market hint: ${userContext.marketHint || 'AUTO DETECT'}, Trade style: ${userContext.tradeStyle || 'Sniper Near-Entry'}, Near-Entry threshold: ${userContext.maxEntryDistPct || 0.25}%.`
            },
            { type: 'image_url', image_url: { url: dataUri, detail: 'high' } }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`OpenAI Vision API error (${response.status}): ${errTxt.slice(0, 180)}`);
  }

  const json = await response.json();
  const rawText = json?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenAI Vision');
  const parsed = cleanJsonResponse(rawText);
  return { ...parsed, aiEngine: `NEURAL-4X OpenAI (${model})` };
}

async function analyzeTradingViewChart(base64Data, mimeType, userContext = {}) {
  const errors = [];
  let result = null;

  try {
    result = await analyzeWithGemini(base64Data, mimeType, userContext);
  } catch (err) {
    errors.push(err.message);
  }

  if (!result) {
    try {
      result = await analyzeWithOpenAI(base64Data, mimeType, userContext);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (!result) {
    throw new Error(`Vision AI failed: ${errors.join(' | ')}`);
  }

  return await applyStealthFundingConfluence(result);
}

module.exports = { analyzeTradingViewChart };
