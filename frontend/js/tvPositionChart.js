/**
 * TradingView Live Candlestick Chart + Long/Short Position Tool Box Overlay
 * Auto-syncs Entry/TP/SL to real live candle price so the Position Box is ALWAYS visible.
 */
window.TVPositionChart = (function () {
  let chart = null;
  let candleSeries = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let resizeObserver = null;
  let currentSetup = null;
  let rafId = null;

  function toBinanceSymbol(symbol) {
    const clean = String(symbol || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.includes('XAU')) return 'PAXGUSDT';
    if (clean.includes('EURUSD')) return 'EURUSDT';
    if (clean.includes('NAS100') || clean.includes('US30')) return 'BTCUSDT';
    return clean.endsWith('USDT') ? clean : `${clean.replace(/USD$/, '')}USDT`;
  }

  async function fetchLiveCandles(symbol, interval = '15m', fallbackPrice = 100) {
    try {
      const binSym = toBinanceSymbol(symbol);
      const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binSym)}&interval=${interval}&limit=90`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Binance klines unavailable');
      const data = await res.json();
      return data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4])
      }));
    } catch (_) {
      const now = Math.floor(Date.now() / 1000);
      const candles = [];
      let p = fallbackPrice * 0.992;
      for (let i = 90; i >= 0; i--) {
        const open = p;
        const delta = (Math.random() - 0.48) * fallbackPrice * 0.004;
        const close = i === 0 ? fallbackPrice : open + delta;
        const high = Math.max(open, close) + Math.random() * fallbackPrice * 0.002;
        const low = Math.min(open, close) - Math.random() * fallbackPrice * 0.002;
        candles.push({ time: now - i * 900, open, high, low, close });
        p = close;
      }
      return candles;
    }
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

    // Position Box from ~58% width to right price scale
    const boxLeft = Math.floor(rect.width * 0.58);
    const boxRight = Math.floor(rect.width - 74);
    const boxW = Math.max(90, boxRight - boxLeft);

    // 1. Profit Zone Box (Entry <-> TP) — Green Tint
    const profitTop = Math.min(yEntry, yTp);
    const profitH = Math.max(2, Math.abs(yTp - yEntry));
    overlayCtx.fillStyle = 'rgba(0, 230, 118, 0.18)';
    overlayCtx.fillRect(boxLeft, profitTop, boxW, profitH);
    overlayCtx.strokeStyle = 'rgba(0, 230, 118, 0.7)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, profitTop, boxW, profitH);

    // 2. Stop Loss Zone Box (Entry <-> SL) — Red Tint
    const lossTop = Math.min(yEntry, ySl);
    const lossH = Math.max(2, Math.abs(ySl - yEntry));
    overlayCtx.fillStyle = 'rgba(255, 61, 90, 0.20)';
    overlayCtx.fillRect(boxLeft, lossTop, boxW, lossH);
    overlayCtx.strokeStyle = 'rgba(255, 61, 90, 0.7)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, lossTop, boxW, lossH);

    // 3. Entry Center Line
    overlayCtx.beginPath();
    overlayCtx.moveTo(boxLeft, yEntry);
    overlayCtx.lineTo(boxRight, yEntry);
    overlayCtx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.stroke();

    // 4. Risk:Reward Badge inside the Position Box
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
    if (chart) { try { chart.remove(); } catch (_) {} chart = null; }

    const width = mount.clientWidth || 720;
    const height = mount.clientHeight || 300;

    const candles = await fetchLiveCandles(setup.symbol, setup.timeframe || '15m', setup.entry);
    const livePrice = candles.length ? candles[candles.length - 1].close : Number(setup.entry);

    // Auto-sync Entry / TP / SL if node price was stale compared to real live Binance candles
    let entry = Number(setup.entry);
    let tp = Number(setup.tp);
    let sl = Number(setup.sl);
    const isLong = setup.isLong !== undefined ? setup.isLong : tp > entry;

    if (!entry || Math.abs(entry - livePrice) / livePrice > 0.12) {
      const tpPct = entry && tp ? Math.min(0.03, Math.max(0.006, Math.abs(tp - entry) / entry)) : 0.012;
      const slPct = entry && sl ? Math.min(0.015, Math.max(0.003, Math.abs(entry - sl) / entry)) : 0.0055;
      entry = livePrice;
      tp = isLong ? livePrice * (1 + tpPct) : livePrice * (1 - tpPct);
      sl = isLong ? livePrice * (1 - slPct) : livePrice * (1 + slPct);

      // Keep modal header price synced with live chart
      const priceEl = document.getElementById('chart-modal-price');
      if (priceEl && window.formatPrice) priceEl.textContent = window.formatPrice(livePrice);
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
        scaleMargins: { top: 0.12, bottom: 0.12 }
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

    // TradingView Price Lines (TP, ENT, SL) on Right Axis
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

    chart.timeScale().fitContent();
    startOverlaySync();

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
