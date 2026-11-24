/**
 * REAL-TIME TRADINGVIEW CHART + LONG/SHORT POSITION OVERLAY
 * Uses real Binance klines & live price sync (no random fake spikes).
 */
window.TVPositionChart = (function () {
  let chart = null;
  let candleSeries = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let resizeObserver = null;
  let currentSetup = null;
  let currentSymbol = 'BTC/USDT';
  let activeTimeframe = '15m';
  let rafId = null;
  let livePriceTimer = null;

  const TIMEFRAMES = [
    { label: '1m', value: '1m', sec: 60 },
    { label: '5m', value: '5m', sec: 300 },
    { label: '15m', value: '15m', sec: 900 },
    { label: '1H', value: '1h', sec: 3600 },
    { label: '4H', value: '4h', sec: 14400 },
    { label: '1D', value: '1d', sec: 86400 }
  ];

  function toBinanceSymbol(symbol) {
    const clean = String(symbol || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.includes('XAU')) return 'PAXGUSDT';
    if (clean.includes('EURUSD')) return 'EURUSDT';
    if (clean.includes('NAS100') || clean.includes('US30')) return 'BTCUSDT';
    if (clean === 'ETH' || clean === 'ETHUSD') return 'ETHUSDT';
    return clean.endsWith('USDT') ? clean : `${clean.replace(/USD$/, '')}USDT`;
  }

  async function fetchRealCandles(symbol, interval = '15m', anchorPrice = null) {
    const binSym = toBinanceSymbol(symbol);
    try {
      const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
      const proxyUrl = baseUrl
        ? `${baseUrl}/api/market/klines?symbol=${encodeURIComponent(binSym)}&interval=${encodeURIComponent(interval)}&limit=90`
        : `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binSym)}&interval=${encodeURIComponent(interval)}&limit=90`;

      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.klines || []);
        if (Array.isArray(list) && list.length >= 10) {
          return list.map(k => Array.isArray(k)
            ? {
                time: Math.floor(k[0] / 1000),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4])
              }
            : {
                time: Number(k.time),
                open: Number(k.open),
                high: Number(k.high),
                low: Number(k.low),
                close: Number(k.close)
              }
          );
        }
      }
    } catch (_) {}

    // Deterministic smooth fallback anchored to real live price (no random spike)
    const tfObj = TIMEFRAMES.find(t => t.value === interval) || TIMEFRAMES[2];
    const now = Math.floor(Date.now() / 1000);
    const endPrice = Number(anchorPrice) > 0 ? Number(anchorPrice) : 100;
    const candles = [];
    let p = endPrice * 0.995;
    const step = (endPrice - p) / 89;

    for (let i = 89; i >= 0; i--) {
      const wave = Math.sin((89 - i) * 0.25) * (endPrice * 0.0012);
      const open = i === 89 ? p : candles[candles.length - 1].close;
      const close = i === 0 ? endPrice : open + step + wave;
      const high = Math.max(open, close) + endPrice * 0.0006;
      const low = Math.min(open, close) - endPrice * 0.0006;
      candles.push({ time: now - i * tfObj.sec, open, high, low, close });
    }
    return candles;
  }

  async function fetchRealTickerPrice(symbol) {
    const binSym = toBinanceSymbol(symbol);
    try {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(binSym)}`);
      if (res.ok) {
        const d = await res.json();
        const price = parseFloat(d.price);
        if (!Number.isNaN(price) && price > 0) return price;
      }
    } catch (_) {}
    return null;
  }

  function drawPositionBox() {
    if (!overlayCanvas || !overlayCtx || !chart || !candleSeries || !currentSetup) return;

    const parent = overlayCanvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (overlayCanvas.width !== Math.round(rect.width * dpr) || overlayCanvas.height !== Math.round(rect.height * dpr)) {
      overlayCanvas.width = Math.round(rect.width * dpr);
      overlayCanvas.height = Math.round(rect.height * dpr);
    }
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayCtx.clearRect(0, 0, rect.width, rect.height);

    const { entry, tp, sl, isLong } = currentSetup;
    const yEntry = candleSeries.priceToCoordinate(entry);
    const yTp = candleSeries.priceToCoordinate(tp);
    const ySl = candleSeries.priceToCoordinate(sl);

    if (yEntry === null || yTp === null || ySl === null) return;

    const boxLeft = Math.floor(rect.width * 0.58);
    const boxRight = Math.floor(rect.width - 74);
    const boxW = Math.max(90, boxRight - boxLeft);

    // Profit Zone Box (Entry <-> TP)
    const profitTop = Math.min(yEntry, yTp);
    const profitH = Math.max(2, Math.abs(yTp - yEntry));
    overlayCtx.fillStyle = 'rgba(0, 230, 118, 0.18)';
    overlayCtx.fillRect(boxLeft, profitTop, boxW, profitH);
    overlayCtx.strokeStyle = 'rgba(0, 230, 118, 0.72)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, profitTop, boxW, profitH);

    // Stop Loss Zone Box (Entry <-> SL)
    const lossTop = Math.min(yEntry, ySl);
    const lossH = Math.max(2, Math.abs(ySl - yEntry));
    overlayCtx.fillStyle = 'rgba(255, 61, 90, 0.20)';
    overlayCtx.fillRect(boxLeft, lossTop, boxW, lossH);
    overlayCtx.strokeStyle = 'rgba(255, 61, 90, 0.72)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, lossTop, boxW, lossH);

    // Entry Line
    overlayCtx.beginPath();
    overlayCtx.moveTo(boxLeft, yEntry);
    overlayCtx.lineTo(boxRight, yEntry);
    overlayCtx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.stroke();

    // R:R Badge
    const risk = Math.abs(entry - sl) || 1;
    const reward = Math.abs(tp - entry);
    const rr = (reward / risk).toFixed(2);
    const labelText = `${isLong ? 'LONG' : 'SHORT'}  •  R:R 1:${rr}`;

    overlayCtx.font = '700 10px "JetBrains Mono", monospace';
    const textW = overlayCtx.measureText(labelText).width;
    const badgeW = textW + 14;
    const badgeX = boxLeft + (boxW - badgeW) / 2;
    const badgeY = yEntry - 10;

    overlayCtx.fillStyle = 'rgba(6, 12, 20, 0.94)';
    overlayCtx.strokeStyle = isLong ? 'rgba(0, 230, 118, 0.9)' : 'rgba(255, 61, 90, 0.9)';
    overlayCtx.lineWidth = 1;
    overlayCtx.beginPath();
    overlayCtx.roundRect(badgeX, badgeY, badgeW, 20, 4);
    overlayCtx.fill();
    overlayCtx.stroke();

    overlayCtx.fillStyle = '#f8fafc';
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.fillText(labelText, badgeX + badgeW / 2, badgeY + 10);
  }

  function startOverlaySync() {
    if (rafId) cancelAnimationFrame(rafId);
    const loop = () => {
      if (!chart || !overlayCanvas || !document.body.contains(overlayCanvas)) return;
      drawPositionBox();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function createTimeframeBar(mount) {
    const bar = document.createElement('div');
    bar.style.cssText = [
      'position:absolute', 'top:8px', 'left:8px', 'z-index:10',
      'display:flex', 'gap:4px', 'padding:3px',
      'background:rgba(6,12,20,0.85)', 'backdrop-filter:blur(8px)',
      'border:1px solid rgba(56,189,248,0.28)', 'border-radius:7px'
    ].join(';');

    const updateButtons = () => {
      bar.querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.tf === activeTimeframe;
        btn.style.background = isActive ? 'rgba(56,189,248,0.28)' : 'transparent';
        btn.style.color = isActive ? '#38bdf8' : '#94a3b8';
        btn.style.borderColor = isActive ? 'rgba(56,189,248,0.7)' : 'transparent';
      });
    };

    TIMEFRAMES.forEach(tf => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = tf.label;
      btn.dataset.tf = tf.value;
      btn.style.cssText = [
        'font-family:"JetBrains Mono",monospace', 'font-size:10px', 'font-weight:700',
        'padding:3px 7px', 'border-radius:5px', 'cursor:pointer',
        'border:1px solid transparent', 'transition:all 0.15s ease'
      ].join(';');

      btn.addEventListener('click', async () => {
        if (activeTimeframe === tf.value || !candleSeries) return;
        activeTimeframe = tf.value;
        updateButtons();
        const candles = await fetchRealCandles(currentSymbol, activeTimeframe, currentSetup?.entry);
        if (candleSeries && candles.length) {
          candleSeries.setData(candles);
          chart.timeScale().fitContent();
          drawPositionBox();
        }
      });

      bar.appendChild(btn);
    });

    updateButtons();
    mount.appendChild(bar);
  }

  function startRealTimePricePolling(symbol) {
    if (livePriceTimer) clearInterval(livePriceTimer);
    livePriceTimer = setInterval(async () => {
      const modal = document.getElementById('coin-chart-modal');
      if (!modal || modal.classList.contains('hidden')) {
        clearInterval(livePriceTimer);
        return;
      }
      const liveP = await fetchRealTickerPrice(symbol);
      if (liveP && candleSeries) {
        const priceEl = document.getElementById('chart-modal-price');
        if (priceEl && window.formatPrice) priceEl.textContent = window.formatPrice(liveP);
      }
    }, 5000);
  }

  async function renderIntoModal(targetCanvasOrContainer, setup) {
    if (!window.LightweightCharts || !targetCanvasOrContainer) return;

    const parent = targetCanvasOrContainer.parentElement;
    parent.style.position = 'relative';

    if (targetCanvasOrContainer.tagName === 'CANVAS') {
      targetCanvasOrContainer.style.display = 'none';
    }

    let mount = parent.querySelector('#tv-position-mount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'tv-position-mount';
      mount.style.cssText = 'width:100%; height:100%; min-height:280px; position:relative; border-radius:10px; overflow:hidden;';
      parent.appendChild(mount);
    }
    mount.innerHTML = '';

    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (livePriceTimer) { clearInterval(livePriceTimer); livePriceTimer = null; }
    if (chart) { try { chart.remove(); } catch (_) {} chart = null; }

    currentSymbol = setup.symbol || 'BTC/USDT';
    activeTimeframe = setup.timeframe || activeTimeframe || '15m';

    const width = mount.clientWidth || 720;
    const height = mount.clientHeight || 300;

    const realTicker = await fetchRealTickerPrice(currentSymbol);
    const candles = await fetchRealCandles(currentSymbol, activeTimeframe, realTicker || setup.entry);
    const livePrice = realTicker || (candles.length ? candles[candles.length - 1].close : Number(setup.entry));

    const priceEl = document.getElementById('chart-modal-price');
    if (priceEl && window.formatPrice && livePrice > 0) {
      priceEl.textContent = window.formatPrice(livePrice);
    }

    let entry = Number(setup.entry) > 0 ? Number(setup.entry) : livePrice;
    let tp = Number(setup.tp) > 0 ? Number(setup.tp) : null;
    let sl = Number(setup.sl) > 0 ? Number(setup.sl) : null;
    const isLong = setup.isLong !== undefined ? setup.isLong : (tp ? tp > livePrice : true);

    // Keep Entry/TP/SL anchored to real live price
    if (!tp || !sl || Math.abs(entry - livePrice) / livePrice > 0.08) {
      entry = livePrice;
      tp = isLong ? livePrice * 1.015 : livePrice * 0.985;
      sl = isLong ? livePrice * 0.994 : livePrice * 1.006;
    }

    currentSetup = { entry, tp, sl, isLong };

    chart = window.LightweightCharts.createChart(mount, {
      width,
      height,
      layout: {
        background: { type: 'solid', color: '#060c14' },
        textColor: '#94a3b8',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)' }
      },
      crosshair: { mode: window.LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.15)',
        scaleMargins: { top: 0.14, bottom: 0.12 }
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.15)',
        timeVisible: true,
        rightOffset: 14
      }
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff3d5a',
      borderUpColor: '#00e676',
      borderDownColor: '#ff3d5a',
      wickUpColor: '#00e676',
      wickDownColor: '#ff3d5a',
      autoscaleInfoProvider: (original) => {
        const res = original();
        if (res && res.priceRange) {
          res.priceRange.minValue = Math.min(res.priceRange.minValue, sl, entry, tp);
          res.priceRange.maxValue = Math.max(res.priceRange.maxValue, sl, entry, tp);
        }
        return res;
      }
    });

    candleSeries.setData(candles);

    candleSeries.createPriceLine({
      price: tp,
      color: '#00e676',
      lineWidth: 1,
      lineStyle: window.LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'TP'
    });
    candleSeries.createPriceLine({
      price: entry,
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: window.LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: 'ENT'
    });
    candleSeries.createPriceLine({
      price: sl,
      color: '#ff3d5a',
      lineWidth: 1,
      lineStyle: window.LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'SL'
    });

    overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:5;';
    mount.appendChild(overlayCanvas);
    overlayCtx = overlayCanvas.getContext('2d');

    createTimeframeBar(mount);

    chart.timeScale().fitContent();
    startOverlaySync();
    startRealTimePricePolling(currentSymbol);

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (!chart || !mount) return;
      chart.applyOptions({ width: mount.clientWidth, height: mount.clientHeight });
      drawPositionBox();
    });
    resizeObserver.observe(mount);
  }

  return { renderIntoModal };
})();
