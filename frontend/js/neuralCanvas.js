/**
 * Interactive RGB / Green-BUY / Red-SELL Neural Cortex Canvas Engine
 */
window.NeuralCanvasEngine = (function () {
  const MAIN_HUB_ASSETS = [
    { symbol: 'BTC/USDT', binanceSymbol: 'BTCUSDT', name: 'Bitcoin Perpetual Core', price: 78428.95, change: 1.28, fundingRate: -0.0145 },
    { symbol: 'XAU/USD',  binanceSymbol: 'PAXGUSDT', name: 'Spot Gold vs US Dollar', price: 2918.40, change: 1.34, fundingRate: -0.0185 },
    { symbol: 'ETH/USDT', binanceSymbol: 'ETHUSDT', name: 'Ethereum Smart Soma', price: 2145.80, change: 2.15, fundingRate: -0.0212 },
    { symbol: 'SOL/USDT', binanceSymbol: 'SOLUSDT', name: 'Solana High-Speed Hub', price: 142.60, change: 4.14, fundingRate: 0.0285 },
    { symbol: 'BNB/USDT', binanceSymbol: 'BNBUSDT', name: 'Binance Chain Core', price: 598.30, change: 1.42, fundingRate: -0.0190 },
    { symbol: 'XRP/USDT', binanceSymbol: 'XRPUSDT', name: 'Ripple Liquidity Hub', price: 2.24, change: 3.65, fundingRate: 0.0315 },
    { symbol: 'EUR/USD',  binanceSymbol: 'EURUSDT', name: 'Euro / US Dollar FX', price: 1.0482, change: 0.34, fundingRate: -0.0125 },
    { symbol: 'NAS100',   binanceSymbol: 'BTCUSDT', name: 'Nasdaq 100 Tech Index', price: 21845.00, change: 1.15, fundingRate: 0.0230 },
    { symbol: 'US30',     binanceSymbol: 'ETHUSDT', name: 'Dow Jones 30 Wall St', price: 44390.00, change: 0.78, fundingRate: -0.0168 },
    { symbol: 'ADA/USDT', binanceSymbol: 'ADAUSDT', name: 'Cardano Consensus Hub', price: 0.742, change: 2.18, fundingRate: 0.0264 },
    { symbol: 'AVAX/USDT',binanceSymbol: 'AVAXUSDT',name: 'Avalanche Subnet Hub', price: 22.85, change: 2.45, fundingRate: -0.0255 },
    { symbol: 'DOGE/USDT',binanceSymbol: 'DOGEUSDT',name: 'Dogecoin Momentum Hub', price: 0.214, change: 5.40, fundingRate: 0.0345 },
    { symbol: 'LINK/USDT',binanceSymbol: 'LINKUSDT',name: 'Chainlink Oracle Hub', price: 15.92, change: 3.10, fundingRate: -0.0292 },
    { symbol: 'DOT/USDT', binanceSymbol: 'DOTUSDT', name: 'Polkadot Relay Hub', price: 4.86, change: 2.74, fundingRate: -0.0228 }
  ];

  const SMALL_COIN_ASSETS = [
    { symbol: 'PEPE/USDT', binanceSymbol: '1000PEPEUSDT', name: 'Pepe Meme Synapse', price: 0.0000094, change: 8.90, fundingRate: 0.0420 },
    { symbol: 'WIF/USDT',  binanceSymbol: 'WIFUSDT',  name: 'dogwifhat Solana Node', price: 0.642, change: 11.20, fundingRate: -0.0385 },
    { symbol: 'SUI/USDT',  binanceSymbol: 'SUIUSDT',  name: 'Sui Move Network', price: 2.92, change: 6.80, fundingRate: -0.0340 },
    { symbol: 'FET/USDT',  binanceSymbol: 'FETUSDT',  name: 'Artificial Superintelligence', price: 0.745, change: 9.30, fundingRate: -0.0415 },
    { symbol: 'RENDER/USDT',binanceSymbol:'RENDERUSDT',name: 'Render GPU Mesh', price: 4.18, change: 5.75, fundingRate: -0.0288 },
    { symbol: 'INJ/USDT',  binanceSymbol: 'INJUSDT',  name: 'Injective DeFi Relay', price: 14.20, change: 4.20, fundingRate: 0.0275 },
    { symbol: 'ARB/USDT',  binanceSymbol: 'ARBUSDT',  name: 'Arbitrum L2 Rollup', price: 0.445, change: 2.60, fundingRate: -0.0260 },
    { symbol: 'TAO/USDT',  binanceSymbol: 'TAOUSDT',  name: 'Bittensor AI', price: 362.00, change: 9.65, fundingRate: -0.0460 },
    { symbol: 'ONDO/USDT', binanceSymbol: 'ONDOUSDT', name: 'Ondo RWA Treasury', price: 1.16, change: 7.80, fundingRate: 0.0320 },
    { symbol: 'JUP/USDT',  binanceSymbol: 'JUPUSDT',  name: 'Jupiter Solana', price: 0.785, change: 5.90, fundingRate: -0.0315 },
    { symbol: 'SEI/USDT',  binanceSymbol: 'SEIUSDT',  name: 'Sei Orderbook', price: 0.234, change: 5.20, fundingRate: -0.0245 },
    { symbol: 'TIA/USDT',  binanceSymbol: 'TIAUSDT',  name: 'Celestia Modular', price: 3.08, change: 4.85, fundingRate: -0.0510 },
    { symbol: 'APT/USDT',  binanceSymbol: 'APTUSDT',  name: 'Aptos Move', price: 5.95, change: 3.90, fundingRate: -0.0325 },
    { symbol: 'NEAR/USDT', binanceSymbol: 'NEARUSDT', name: 'NEAR AI Sharding', price: 3.28, change: 5.60, fundingRate: -0.0305 },
    { symbol: 'OP/USDT',   binanceSymbol: 'OPUSDT',   name: 'Optimism Superchain', price: 1.08, change: 3.15, fundingRate: -0.0295 },
    { symbol: 'PENDLE/USDT',binanceSymbol:'PENDLEUSDT',name:'Pendle Yield', price: 3.34, change: 8.15, fundingRate: -0.0390 },
    { symbol: 'ENA/USDT',  binanceSymbol: 'ENAUSDT',  name: 'Ethena Synthetic', price: 0.442, change: 6.75, fundingRate: 0.0445 },
    { symbol: 'WLD/USDT',  binanceSymbol: 'WLDUSDT',  name: 'Worldcoin AI', price: 1.19, change: 8.60, fundingRate: -0.0435 },
    { symbol: 'ZRO/USDT',  binanceSymbol: 'ZROUSDT',  name: 'LayerZero Omnichain', price: 2.92, change: 6.15, fundingRate: -0.0395 },
    { symbol: 'IO/USDT',   binanceSymbol: 'IOUSDT',   name: 'io.net GPU', price: 1.38, change: 9.10, fundingRate: 0.0390 }
  ];

  let canvas, ctx, width = window.innerWidth, height = window.innerHeight;
  let nodes = [], connections = [], pulses = [], ripples = [];
  let clock = 0, waveTime = 0, reticleAngle = 0;
  let neuralColorMode = 'rgb';
  let revertTimer = null, countdownTimer = null;
  let selectedNodeIndex = 0, activeSignaledNodeIndex = -1, hoveredNodeIndex = -1;
  const mouse = { x: width * 0.5, y: height * 0.5, active: false };

  let seed = 108;
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function getNeuralColor(phaseOffset = 0, alpha = 1, lightness = 58) {
    if (neuralColorMode === 'red_sell') return `hsla(${348 + Math.sin(clock * 6 + phaseOffset) * 5}, 100%, ${lightness}%, ${alpha})`;
    if (neuralColorMode === 'green_buy') return `hsla(${148 + Math.sin(clock * 6 + phaseOffset) * 6}, 100%, ${lightness}%, ${alpha})`;
    return `hsla(${(clock * 38 + phaseOffset * 55) % 360}, 96%, ${lightness}%, ${alpha})`;
  }

  function buildTopology() {
    seed = 108;
    nodes = [];
    connections = [];
    pulses = [];

    const hubCoords = [
      { nx: 0.16, ny: 0.28, r: 14 }, { nx: 0.30, ny: 0.22, r: 13 }, { nx: 0.24, ny: 0.52, r: 14 },
      { nx: 0.42, ny: 0.36, r: 13 }, { nx: 0.38, ny: 0.66, r: 12 }, { nx: 0.54, ny: 0.25, r: 13 },
      { nx: 0.56, ny: 0.54, r: 14 }, { nx: 0.48, ny: 0.78, r: 12 }, { nx: 0.70, ny: 0.32, r: 13 },
      { nx: 0.68, ny: 0.64, r: 13 }, { nx: 0.82, ny: 0.24, r: 12 }, { nx: 0.84, ny: 0.50, r: 14 },
      { nx: 0.78, ny: 0.76, r: 12 }, { nx: 0.91, ny: 0.64, r: 12 }
    ];

    hubCoords.forEach((hc, idx) => {
      nodes.push({
        index: nodes.length,
        id: `NEURAL-HUB-${String(idx + 1).padStart(2, '0')}`,
        x: hc.nx * width, y: hc.ny * height,
        baseX: hc.nx * width, baseY: hc.ny * height,
        r: hc.r, _origR: hc.r, isCore: true, isAnchor: false,
        asset: { ...MAIN_HUB_ASSETS[idx % MAIN_HUB_ASSETS.length] },
        phase: rand() * Math.PI * 2,
        speed: 0.55 + rand() * 0.45,
        driftX: 10 + rand() * 12, driftY: 10 + rand() * 12,
        pulseEnergy: 0
      });
    });

    SMALL_COIN_ASSETS.forEach((asset, i) => {
      const r = 5 + rand() * 2.5;
      const nx = 0.10 + rand() * 0.80;
      const ny = 0.14 + rand() * 0.74;
      nodes.push({
        index: nodes.length,
        id: `SMALL-COIN-${String(i + 1).padStart(2, '0')}`,
        x: nx * width, y: ny * height,
        baseX: nx * width, baseY: ny * height,
        r, _origR: r, isCore: false, isAnchor: false,
        asset: { ...asset },
        phase: rand() * Math.PI * 2,
        speed: 0.65 + rand() * 0.6,
        driftX: 8 + rand() * 10, driftY: 8 + rand() * 10,
        pulseEnergy: 0
      });
    });

    const bridges = [
      [0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[3,6],[4,6],[4,7],[5,8],
      [6,8],[6,9],[7,9],[8,10],[8,11],[9,11],[9,12],[10,11],[11,13],[12,13]
    ];
    bridges.forEach(([a, b]) => connections.push({ a, b, isCore: true, curve: (rand() - 0.5) * 44 }));

    for (let i = 14; i < nodes.length; i++) {
      let nearest = 0, bestD = Infinity;
      for (let j = 0; j < 14; j++) {
        const d = Math.hypot(nodes[i].baseX - nodes[j].baseX, nodes[i].baseY - nodes[j].baseY);
        if (d < bestD) { bestD = d; nearest = j; }
      }
      connections.push({ a: i, b: nearest, isCore: false, curve: (rand() - 0.5) * 32 });
    }
  }

  function setNeuralColorMode(mode, bannerData = null) {
    neuralColorMode = mode;
    clearTimeout(revertTimer);
    clearInterval(countdownTimer);

    const hudCard = document.getElementById('hud-cortex-card');
    const hudTitle = document.getElementById('hud-mode-title');
    const hudBadge = document.getElementById('hud-color-badge');
    const banner = document.getElementById('signal-alert-banner');
    const bannerInner = document.getElementById('signal-alert-inner');
    const termCard = document.getElementById('asset-terminal-card');
    const countdownPill = document.getElementById('banner-countdown-pill');

    if (hudCard) hudCard.classList.remove('neural-card-red', 'neural-card-green');
    if (termCard) termCard.classList.remove('neural-card-red', 'neural-card-green');
    if (bannerInner) bannerInner.classList.remove('neural-card-red', 'red-alert-glow', 'neural-card-green', 'green-alert-glow');

    if (mode === 'green_buy' || mode === 'red_sell') {
      const isBuy = mode === 'green_buy';
      const cls = isBuy ? 'neural-card-green' : 'neural-card-red';
      if (hudCard) hudCard.classList.add(cls);
      if (termCard) termCard.classList.add(cls);
      if (bannerInner) bannerInner.classList.add(cls, isBuy ? 'green-alert-glow' : 'red-alert-glow');
      if (hudTitle) hudTitle.textContent = isBuy ? 'NEURAL BUY SIGNAL (GREEN)' : 'NEURAL SELL SIGNAL (RED)';

      if (bannerData) {
        const t = document.getElementById('banner-title-text');
        const s = document.getElementById('banner-signal-side');
        const sum = document.getElementById('banner-signal-summary');
        if (t) t.textContent = `${bannerData.symbol} — AI ${isBuy ? 'BUY' : 'SELL'} SIGNAL`;
        if (s) s.textContent = `${bannerData.direction} (${bannerData.confidence || 92}%)`;
        if (sum) sum.textContent = `${bannerData.symbol} @ ${window.formatPrice(bannerData.entryPrice)} • TP1: ${window.formatPrice(bannerData.tp1Price)} • SL: ${window.formatPrice(bannerData.slPrice)}`;
      }
      if (banner) banner.classList.remove('hidden');

      let sec = 10;
      if (countdownPill) countdownPill.textContent = `RGB IN ${sec}s`;
      if (hudBadge) hudBadge.textContent = `${isBuy ? 'BUY' : 'SELL'} • ${sec}s`;

      countdownTimer = setInterval(() => {
        sec = Math.max(0, sec - 1);
        if (countdownPill) countdownPill.textContent = `RGB IN ${sec}s`;
        if (hudBadge) hudBadge.textContent = `${isBuy ? 'BUY' : 'SELL'} • ${sec}s`;
      }, 1000);

      revertTimer = setTimeout(() => {
        setNeuralColorMode('rgb');
        if (window.showToast) window.showToast('Restored RGB Neural Mode', '🌈');
      }, 10000);
    } else {
      if (hudTitle) hudTitle.textContent = 'RGB NEURAL CORTEX';
      if (hudBadge) hudBadge.textContent = 'RGB SPECTRUM';
      if (banner) banner.classList.add('hidden');
    }
  }

  function triggerBurst(cx, cy) {
    ripples.push({ x: cx, y: cy, r: 8, maxR: 170, alpha: 0.85, phase: Math.random() * 6 });
    nodes.forEach(n => {
      if (n.r > 0 && Math.hypot(n.x - cx, n.y - cy) < 250) {
        n.pulseEnergy = Math.min(1.5, n.pulseEnergy + 0.9);
      }
    });
  }

  function findNodeAt(px, py) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.r <= 0) continue;
      if (Math.hypot(px - n.x, py - n.y) <= Math.max(n.r * 1.9, 16)) return i;
    }
    return -1;
  }

  function animate() {
    clock += 0.016;
    waveTime += 0.022;
    reticleAngle += 0.03;

    const isRed = neuralColorMode === 'red_sell';
    const isGreen = neuralColorMode === 'green_buy';

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = isRed ? '#090103' : (isGreen ? '#010905' : '#010508');
    ctx.fillRect(0, 0, width, height);

    const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    if (isRed) {
      bg.addColorStop(0, 'rgba(115, 4, 22, 0.72)');
      bg.addColorStop(1, 'rgba(9, 1, 3, 0)');
    } else if (isGreen) {
      bg.addColorStop(0, 'rgba(4, 105, 58, 0.72)');
      bg.addColorStop(1, 'rgba(1, 9, 5, 0)');
    } else {
      const h = (clock * 24) % 360;
      bg.addColorStop(0, `hsla(${h}, 85%, 14%, 0.68)`);
      bg.addColorStop(1, 'rgba(1, 5, 8, 0)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    nodes.forEach(n => {
      n.x = n.baseX + Math.sin(waveTime * n.speed + n.phase) * n.driftX;
      n.y = n.baseY + Math.cos(waveTime * n.speed * 0.85 + n.phase) * n.driftY;
      if (n.pulseEnergy > 0) n.pulseEnergy = Math.max(0, n.pulseEnergy - 0.016);
    });

    ctx.globalCompositeOperation = 'lighter';

    // Draw Connections
    connections.forEach(c => {
      const a = nodes[c.a], b = nodes[c.b];
      if (!a || !b || a.r <= 0 || b.r <= 0) return;
      const mx = (a.x + b.x) * 0.5 + Math.sin(waveTime + a.phase) * c.curve;
      const my = (a.y + b.y) * 0.5 + Math.cos(waveTime + b.phase) * c.curve;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = getNeuralColor(a.phase, c.isCore ? 0.58 : 0.34, 60);
      ctx.lineWidth = c.isCore ? 1.8 : 0.9;
      ctx.stroke();
    });

    // Spawn & Draw Pulses
    if (Math.random() < 0.28 && connections.length && pulses.length < 70) {
      const cIdx = Math.floor(Math.random() * connections.length);
      pulses.push({ cIdx, t: 0, speed: 0.012 + Math.random() * 0.012, phase: Math.random() * 6 });
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.speed;
      const c = connections[p.cIdx];
      if (!c || p.t >= 1) { pulses.splice(i, 1); continue; }
      const a = nodes[c.a], b = nodes[c.b];
      if (!a || !b || a.r <= 0 || b.r <= 0) { pulses.splice(i, 1); continue; }
      const mx = (a.x + b.x) * 0.5 + Math.sin(waveTime + a.phase) * c.curve;
      const my = (a.y + b.y) * 0.5 + Math.cos(waveTime + b.phase) * c.curve;
      const u = 1 - p.t;
      const px = u * u * a.x + 2 * u * p.t * mx + p.t * p.t * b.x;
      const py = u * u * a.y + 2 * u * p.t * my + p.t * p.t * b.y;
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = getNeuralColor(p.phase, 0.95, 72);
      ctx.fill();
    }

    // Draw Nodes
    nodes.forEach((n, idx) => {
      if (n.r <= 0) return;
      const isSel = idx === selectedNodeIndex;
      const isSig = idx === activeSignaledNodeIndex;
      const isHov = idx === hoveredNodeIndex;
      const r = n.r * (1 + Math.min(0.45, n.pulseEnergy * 0.15));

      const grad = ctx.createRadialGradient(n.x, n.y, r * 0.2, n.x, n.y, r * 3.2);
      grad.addColorStop(0, getNeuralColor(n.phase, 0.72, 62));
      grad.addColorStop(1, getNeuralColor(n.phase, 0, 45));
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = getNeuralColor(n.phase, 0.96, 65);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();

      if (isSel || isSig || isHov) {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(reticleAngle);
        ctx.strokeStyle = isRed ? '#ff2a4d' : (isGreen ? '#00ff88' : getNeuralColor(n.phase, 0.95, 72));
        ctx.lineWidth = isSig ? 2.4 : 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, r + 10, 0, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();
      }

      if (n.asset && (n.isCore || isSel || isSig || isHov)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const label = n.asset.symbol;
        const tw = ctx.measureText(label).width;
        const px = n.x - tw / 2 - 5;
        const py = n.y + r + 7;
        ctx.fillStyle = 'rgba(2, 12, 20, 0.86)';
        ctx.strokeStyle = getNeuralColor(n.phase, 0.7, 62);
        ctx.beginPath();
        ctx.roundRect(px, py, tw + 10, 15, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e6fcff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, n.x, py + 7.5);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
    });

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.r += 7.5;
      rip.alpha *= 0.93;
      if (rip.alpha < 0.02 || rip.r > rip.maxR) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = getNeuralColor(rip.phase, rip.alpha, 64);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    requestAnimationFrame(animate);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildTopology();
  }

  function init(onNodeClick) {
    canvas = document.getElementById('neural-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      hoveredNodeIndex = findNodeAt(e.clientX, e.clientY);
      canvas.style.cursor = hoveredNodeIndex !== -1 ? 'pointer' : 'crosshair';
    });

    canvas.addEventListener('mousedown', (e) => {
      const idx = findNodeAt(e.clientX, e.clientY);
      if (idx !== -1) {
        selectedNodeIndex = idx;
        triggerBurst(nodes[idx].x, nodes[idx].y);
        if (onNodeClick) onNodeClick(idx);
      } else {
        triggerBurst(e.clientX, e.clientY);
      }
    });

    animate();
  }

  return {
    init,
    getNodes: () => nodes,
    getSelectedIndex: () => selectedNodeIndex,
    setSelectedIndex: (i) => { selectedNodeIndex = i; },
    getActiveSignaledIndex: () => activeSignaledNodeIndex,
    setActiveSignaledIndex: (i) => { activeSignaledNodeIndex = i; },
    setNeuralColorMode,
    triggerBurst
  };
})();
