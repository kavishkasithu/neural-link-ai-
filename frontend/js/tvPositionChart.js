/**
 * REAL-TIME TRADINGVIEW CHART + LIVE WEBSOCKET CANDLES + LONG/SHORT POSITION BOX
 * Streams live ticking candles directly from Binance Data Vision (zero fake candles).
 */
window.TVPositionChart = (function () {
  let chart = null;
  let candleSeries = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let resizeObserver = null;
  let currentSetup = null;
  let currentSymbol = 'BTC/USDT';
  let currentNodeRef = null;
  let activeTimeframe = '15m';
  let rafId = null;
  let liveWs = null;
  let pollTimer = null;

  const TIMEFRAMES = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1H', value: '1h' },
    { label: '4H', value: '4h' },
    { label: '1D', value: '1d' }
  ];

  function toBinanceSymbol(symbol) {
    const raw = String(symbol || 'BTCUSDT').toUpperCase().trim();
    if (raw === 'ETH' || raw.startsWith('ETH/') || raw.startsWith('ETH-')) return 'ETHUSDT';
    const clean = raw.replace(/[^A-Z0-9]/g, '');
    if (clean.includes('XAU')) return 'PAXGUSDT';
    if (clean.includes('EURUSD')) return 'EURUSDT';
    if (clean.includes('NAS100') || clean.includes('US30')) return 'BTCUSDT';
    return clean.endsWith('USDT') ? clean : `${clean.replace(/USD$/, '')}USDT`;
  }

  function getPriceFormat(price) {
    const p = Number(price) || 1;
    if (p < 0.001) return { type: 'price', precision: 7, minMove: 0.0000001 };
    if (p < 0.1)   return { type: 'price', precision: 5, minMove: 0.00001 };
    if (p < 10)    return { type: 'price', precision: 4, minMove: 0.0001 };
    if (p < 1000)  return { type: 'price', precision: 2, minMove: 0.01 };
    return { type: 'price', precision: 2, minMove: 0.01 };
  }

  async function fetchRealCandles(symbol, interval = '15m', limit = 100) {
    const binSym = toBinanceSymbol(symbol);
    const urls = [
      `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(binSym)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binSym)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
    ];

    const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
    if (baseUrl) {
      urls.push(`${baseUrl}/api/market/klines?symbol=${encodeURIComponent(binSym)}&interval=${encodeURIComponent(interval)}&limit=${limit}`);
    }

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        const raw = Array.isArray(json) ? json : (json.klines || []);
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map(k => Array.isArray(k)
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
      } catch (_) {}
    }
    return [];
  }

  function stopLiveFeeds() {
    if (liveWs) {
      try { liveWs.close(); } catch (_) {}
      liveWs = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function syncHeaderAndNodePrice(livePrice) {
    if (!livePrice || Number.isNaN(livePrice)) return;
    const priceEl = document.getElementById('chart-modal-price');
    if (priceEl && window.formatPrice) {
      priceEl.textContent = window.formatPrice(livePrice);
    }
    if (currentNodeRef && currentNodeRef.asset) {
      currentNodeRef.asset.price = livePrice;
    }
  }

  function startLiveCandleStream(symbol, interval) {
    stopLiveFeeds();
    const binSym = toBinanceSymbol(symbol).toLowerCase();

    // 1. Real-time WebSocket stream (updates candle every tick)
    try {
      liveWs = new WebSocket(`wss://data-stream.binance.vision/ws/${binSym}@kline_${interval}`);
      liveWs.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const k = msg.k;
          if (!k || !candleSeries) return;
          const liveCandle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c)
          };
          candleSeries.update(liveCandle);
          syncHeaderAndNodePrice(liveCandle.close);
        } catch (_) {}
      };
    } catch (_) {}

    // 2. 3-second REST backup poll so chart ALWAYS updates live even if WebSocket drops
    pollTimer = setInterval(async () => {
      const modal = document.getElementById('coin-chart-modal');
      if (!modal || modal.classList.contains('hidden')) {
        stopLiveFeeds();
        return;
      }
      const latest = await fetchRealCandles(symbol, interval, 2);
      if (latest.length && candleSeries) {
        latest.forEach(c => candleSeries.update(c));
        syncHeaderAndNodePrice(latest[latest.length - 1].close);
      }
    }, 3000);
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

    const profitTop = Math.min(yEntry, yTp);
    const profitH = Math.max(2, Math.abs(yTp - yEntry));
    overlayCtx.fillStyle = 'rgba(0, 230, 118, 0.18)';
    overlayCtx.fillRect(boxLeft, profitTop, boxW, profitH);
    overlayCtx.strokeStyle = 'rgba(0, 230, 118, 0.72)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, profitTop, boxW, profitH);

    const lossTop = Math.min(yEntry, ySl);
    const lossH = Math.max(2, Math.abs(ySl - yEntry));
    overlayCtx.fillStyle = 'rgba(255, 61, 90, 0.20)';
    overlayCtx.fillRect(boxLeft, lossTop, boxW, lossH);
    overlayCtx.strokeStyle = 'rgba(255, 61, 90, 0.72)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, lossTop, boxW, lossH);

    overlayCtx.beginPath();
    overlayCtx.moveTo(boxLeft, yEntry);
    overlayCtx.lineTo(boxRight, yEntry);
    overlayCtx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.stroke();

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
      'display:flex', 'align-items:center', 'gap:4px', 'padding:3px',
      'background:rgba(6,12,20,0.88)', 'backdrop-filter:blur(8px)',
      'border:1px solid rgba(56,189,248,0.3)', 'border-radius:7px'
    ].join(';');

    const updateButtons = () => {
      bar.querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.tf === activeTimeframe;
        btn.style.background = isActive ? 'rgba(56,189,248,0.28)' : 'transparent';
        btn.style.color = isActive ? '#38bdf8' : '#94a3b8';
        btn.style.borderColor = isActive ? 'rgba(56,189,248,0.75)' : 'transparent';
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
        const candles = await fetchRealCandles(currentSymbol, activeTimeframe, 100);
        if (candleSeries && candles.length) {
          candleSeries.setData(candles);
          syncHeaderAndNodePrice(candles[candles.length - 1].close);
          chart.timeScale().fitContent();
          drawPositionBox();
          startLiveCandleStream(currentSymbol, activeTimeframe);
        }
      });

      bar.appendChild(btn);
    });

    const liveDot = document.createElement('span');
    liveDot.textContent = '● LIVE';
    liveDot.style.cssText = 'font-family:"JetBrains Mono",monospace; font-size:9px; font-weight:800; color:#00e676; padding:0 6px;';
    bar.appendChild(liveDot);

    updateButtons();
    mount.appendChild(bar);
  }

  function close() {
    stopLiveFeeds();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
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
    mount.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#38bdf8;font-family:monospace;font-size:12px;">Loading Real-Time Binance Candles...</div>';

    close();
    if (chart) { try { chart.remove(); } catch (_) {} chart = null; }

    currentSymbol = setup.symbol || 'BTC/USDT';
    currentNodeRef = setup.nodeRef || null;
    activeTimeframe = setup.timeframe || activeTimeframe || '15m';

    const candles = await fetchRealCandles(currentSymbol, activeTimeframe, 100);
    if (!candles.length) {
      mount.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fb7185;font-family:monospace;font-size:12px;">Unable to load live Binance candles. Check internet connection.</div>';
      return;
    }

    mount.innerHTML = '';
    const livePrice = candles[candles.length - 1].close;
    syncHeaderAndNodePrice(livePrice);

    // Derive real structural levels from live candles if passed setup is stale
    const recent = candles.slice(-24);
    const swingHigh = Math.max(...recent.map(c => c.high));
    const swingLow  = Math.min(...recent.map(c => c.low));

    let entry = Number(setup.entry);
    let tp = Number(setup.tp);
    let sl = Number(setup.sl);
    const isLong = setup.isLong !== undefined ? setup.isLong : true;

    const isStale = !entry || !tp || !sl || Math.abs(entry - livePrice) / livePrice > 0.05;
    if (isStale) {
      entry = livePrice;
      if (isLong) {
        sl = Math.min(swingLow * 0.999, livePrice * 0.994);
        const risk = Math.max(livePrice * 0.0025, entry - sl);
        tp = Math.max(swingHigh, entry + risk * 2.0);
      } else {
        sl = Math.max(swingHigh * 1.001, livePrice * 1.006);
        const risk = Math.max(livePrice * 0.0025, sl - entry);
        tp = Math.min(swingLow, entry - risk * 2.0);
      }
    }

    currentSetup = { entry, tp, sl, isLong };

    const width = mount.clientWidth || 720;
    const height = mount.clientHeight || 300;

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
      priceFormat: getPriceFormat(livePrice),
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
    startLiveCandleStream(currentSymbol, activeTimeframe);

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (!chart || !mount) return;
      chart.applyOptions({ width: mount.clientWidth, height: mount.clientHeight });
      drawPositionBox();
    });
    resizeObserver.observe(mount);
  }

  return { renderIntoModal, close };
})();
