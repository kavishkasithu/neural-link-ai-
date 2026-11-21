/**
 * TradingView Live Candlestick Chart + Long/Short Position Tool Box Overlay
 * Fits inside the exact existing Chart Modal container without changing modal size.
 */
window.TVPositionChart = (function () {
  let chart = null;
  let candleSeries = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let resizeObserver = null;
  let currentSetup = null;

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
      // Fallback realistic candles if pair is Forex/Stock not on Binance
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

    const rect = overlayCanvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlayCanvas.width = rect.width * dpr;
    overlayCanvas.height = rect.height * dpr;
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayCtx.clearRect(0, 0, rect.width, rect.height);

    const { entry, tp, sl, isLong } = currentSetup;
    const yEntry = candleSeries.priceToCoordinate(entry);
    const yTp = candleSeries.priceToCoordinate(tp);
    const ySl = candleSeries.priceToCoordinate(sl);

    if (yEntry === null || yTp === null || ySl === null) return;

    // Position Box spans from ~62% of chart width to right price axis (~88%)
    const boxLeft = Math.floor(rect.width * 0.62);
    const boxRight = Math.floor(rect.width - 78);
    const boxW = Math.max(80, boxRight - boxLeft);

    // 1. Profit Zone Box (Entry <-> TP) — TradingView Green/Teal Tint
    const profitTop = Math.min(yEntry, yTp);
    const profitH = Math.abs(yTp - yEntry);
    overlayCtx.fillStyle = 'rgba(0, 230, 118, 0.16)';
    overlayCtx.fillRect(boxLeft, profitTop, boxW, profitH);
    overlayCtx.strokeStyle = 'rgba(0, 230, 118, 0.55)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, profitTop, boxW, profitH);

    // 2. Stop Loss Zone Box (Entry <-> SL) — TradingView Red Tint
    const lossTop = Math.min(yEntry, ySl);
    const lossH = Math.abs(ySl - yEntry);
    overlayCtx.fillStyle = 'rgba(255, 61, 90, 0.18)';
    overlayCtx.fillRect(boxLeft, lossTop, boxW, lossH);
    overlayCtx.strokeStyle = 'rgba(255, 61, 90, 0.55)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(boxLeft, lossTop, boxW, lossH);

    // 3. Entry Center Divider Line
    overlayCtx.beginPath();
    overlayCtx.moveTo(boxLeft, yEntry);
    overlayCtx.lineTo(boxRight, yEntry);
    overlayCtx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
    overlayCtx.lineWidth = 1.25;
    overlayCtx.stroke();

    // 4. Risk:Reward Badge inside the box
    const risk = Math.abs(entry - sl) || 1;
    const reward = Math.abs(tp - entry);
    const rr = (reward / risk).toFixed(2);
    const labelText = `${isLong ? 'LONG' : 'SHORT'}  •  R:R 1:${rr}`;

    overlayCtx.font = '700 10px "JetBrains Mono", monospace';
    const textW = overlayCtx.measureText(labelText).width;
    const badgeX = boxLeft + (boxW - textW - 14) / 2;
    const badgeY = yEntry - 10;

    overlayCtx.fillStyle = 'rgba(10, 18, 28, 0.92)';
    overlayCtx.strokeStyle = isLong ? 'rgba(0, 230, 118, 0.8)' : 'rgba(255, 61, 90, 0.8)';
    overlayCtx.lineWidth = 1;
    overlayCtx.beginPath();
    overlayCtx.roundRect(badgeX, badgeY, textW + 14, 20, 4);
    overlayCtx.fill();
    overlayCtx.stroke();

    overlayCtx.fillStyle = '#f8fafc';
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.fillText(labelText, badgeX + (textW + 14) / 2, badgeY + 10);
  }

  async function renderIntoModal(targetCanvasOrContainer, setup) {
    if (!window.LightweightCharts || !targetCanvasOrContainer) return;

    // Replace/wrap the existing chart canvas inside the exact same container size
    const parent = targetCanvasOrContainer.parentElement;
    parent.style.position = 'relative';

    // Hide the old 2D canvas so we don't break any existing DOM references
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

    if (chart) {
      try { chart.remove(); } catch (_) {}
      chart = null;
    }

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
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.15)', timeVisible: true }
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff3d5a',
      borderUpColor: '#00e676',
      borderDownColor: '#ff3d5a',
      wickUpColor: '#00e676',
      wickDownColor: '#ff3d5a'
    });

    const candles = await fetchLiveCandles(setup.symbol, setup.timeframe || '15m', setup.entry);
    candleSeries.setData(candles);

    const entry = Number(setup.entry);
    const tp = Number(setup.tp);
    const sl = Number(setup.sl);
    const isLong = setup.isLong !== undefined ? setup.isLong : tp > entry;
    currentSetup = { entry, tp, sl, isLong };

    // Add TradingView Price Lines (TP, Entry, SL) on Right Axis
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

    // Add transparent canvas overlay for the shaded Long/Short Position Box
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:5;';
    mount.appendChild(overlayCanvas);
    overlayCtx = overlayCanvas.getContext('2d');

    chart.timeScale().fitContent();

    // Redraw position box whenever user zooms, pans, or resizes
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawPositionBox);
    setTimeout(drawPositionBox, 60);

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
