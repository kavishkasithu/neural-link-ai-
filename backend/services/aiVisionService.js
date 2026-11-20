const GEMINI_HOST = 'generativelanguage.googleapis.com';
const OPENAI_HOST = 'api.openai.com';

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
- For BUY / LONG: slPrice < entryPrice < tp1Price < tp2Price.
- For SELL / SHORT: slPrice > entryPrice > tp1Price > tp2Price.
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
        temperature: 0.2,
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
  return { ...parsed, aiEngine: `Google Gemini (${model})` };
}

async function analyzeWithGemini(base64Data, mimeType, userContext) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `${SYSTEM_PROMPT}\n\nUser Hints -> Market Type: ${userContext.marketHint || 'AUTO DETECT'}, Style: ${userContext.tradeStyle || 'Intraday Sniper'}, Max Near-Entry Threshold: ${userContext.maxEntryDistPct || 0.25}%.`;

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
  return { ...parsed, aiEngine: `OpenAI Vision (${model})` };
}

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
  throw new Error(`Vision AI failed: ${errors.join(' | ')}`);
}

module.exports = { analyzeTradingViewChart };
