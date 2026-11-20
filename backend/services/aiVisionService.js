/**
 * AI Vision Chart Analysis Service
 * Analyzes TradingView chart screenshots for ANY market:
 *   - Forex (EUR/USD, GBP/JPY, USD/CAD, etc.)
 *   - Crypto (BTC/USDT, ETH/USDT, SOL/USDT, memecoins, etc.)
 *   - Stocks (AAPL, TSLA, NVDA, MSFT, etc.)
 *   - Commodities & Indices (XAU/USD Gold, NAS100, US30, SPX500, etc.)
 *
 * Uses Google Gemini Vision as primary engine and OpenAI GPT-4o Vision as fallback.
 */

const SYSTEM_PROMPT = `You are an elite institutional Price Action & Smart Money Concepts (SMC) chart analyst.
Analyze the uploaded TradingView chart screenshot carefully.

STEP 1 — IDENTIFY ASSET & CONTEXT:
- Read the exact ticker/pair name from the top-left of the TradingView chart (e.g., XAUUSD, EURUSD, BTCUSDT, NVDA, NAS100, GBPJPY).
- Classify "assetClass" strictly as one of: "FOREX", "CRYPTO", "STOCK", "COMMODITY", or "INDEX".
- Detect the chart timeframe (e.g., "1m", "5m", "15m", "1H", "4H", "1D").
- Read the current live price (highlighted on the right-hand price axis).

STEP 2 — TECHNICAL & SMC ANALYSIS:
- Identify market structure (BOS / CHoCH, trend direction, swing highs/lows).
- Identify nearest high-probability Order Block (OB), Fair Value Gap (FVG), Liquidity Sweep, or Key Support/Resistance zone.
- Check distance between current live price and optimal entry price ("entryDistancePct").
- If entry is very close to current price (<= 0.35% for crypto/stocks or <= 0.15% for forex), mark "entryProximity": "NEAR ENTRY". Otherwise mark "entryProximity": "FAR ENTRY - WAIT PULLBACK".

STEP 3 — GENERATE ACTIONABLE SIGNAL:
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
  "riskReward": "1:2.5",
  "confidence": 89,
  "entryDistancePct": 0.08,
  "entryProximity": "NEAR ENTRY",
  "trendBias": "BULLISH",
  "keyLevels": {
    "support": "2910.00 - 2915.00",
    "resistance": "2926.00 - 2940.00"
  },
  "setupType": "Bullish FVG + Liquidity Sweep",
  "reasoning": "Concise 2-sentence institutional explanation of why this setup is valid based on the chart candles and price axis."
}

IMPORTANT RULES:
- "direction" must be "BUY / LONG", "SELL / SHORT", or "WAIT / NEUTRAL".
- Ensure logical price ordering:
  * For BUY / LONG: slPrice < entryPrice < tp1Price < tp2Price.
  * For SELL / SHORT: slPrice > entryPrice > tp1Price > tp2Price.
- Use exact decimal precision matching the asset's price axis visible in the screenshot.
- Never mention funding rates.`;

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

async function analyzeWithGemini(base64Data, mimeType, userContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `${SYSTEM_PROMPT}\n\nUser Hints -> Market Type: ${userContext.marketHint || 'AUTO DETECT'}, Style: ${userContext.tradeStyle || 'Intraday Sniper'}, Max Near-Entry Threshold: ${userContext.maxEntryDistPct || 0.25}%.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'image/png',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`Gemini Vision API error (${response.status}): ${errTxt.slice(0, 200)}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini Vision');

  const parsed = cleanJsonResponse(rawText);
  return { ...parsed, aiEngine: `Google Gemini (${model})` };
}

async function analyzeWithOpenAI(base64Data, mimeType, userContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY not configured');
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const dataUri = `data:${mimeType || 'image/png'};base64,${base64Data}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this TradingView chart. Market hint: ${userContext.marketHint || 'AUTO DETECT'}, Trade style: ${userContext.tradeStyle || 'Intraday Sniper'}, Near-Entry threshold: ${userContext.maxEntryDistPct || 0.25}%.`
            },
            {
              type: 'image_url',
              image_url: { url: dataUri, detail: 'high' }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`OpenAI Vision API error (${response.status}): ${errTxt.slice(0, 200)}`);
  }

  const json = await response.json();
  const rawText = json?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenAI Vision');

  const parsed = cleanJsonResponse(rawText);
  return { ...parsed, aiEngine: `OpenAI Vision (${model})` };
}

/**
 * Main Vision Entrypoint: Tries Gemini -> Falls back to OpenAI -> Clear error if no keys set
 */
async function analyzeTradingViewChart(base64Data, mimeType, userContext = {}) {
  const errors = [];

  try {
    return await analyzeWithGemini(base64Data, mimeType, userContext);
  } catch (err) {
    errors.push(err.message);
  }

  try {
    return await analyzeWithOpenAI(base64Data, mimeType, userContext);
  } catch (err) {
    errors.push(err.message);
  }

  throw new Error(
    `No active Vision AI key configured on backend (.env). Details: ${errors.join(' | ')}`
  );
}

module.exports = { analyzeTradingViewChart };
