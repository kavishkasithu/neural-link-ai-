/**
 * NEURAL CANVAS ENGINE — Exact Organic Multi-Strand Cortex from neural.html
 * Includes: 14 Main Hubs, 52 Coin Dots, 20 Off-Screen Anchors, 11-Strand Bezier Nerve Bundles,
 * 150 Fine Mesh Fibers, Sprouting Dendrites, Synaptic Pulses, Ripples & Dynamic RGB/Green/Red Glow.
 */
(function () {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let nodes = [];
  let connections = [];
  let fineMeshFibers = [];
  let freeDendrites = [];
  let pulses = [];
  let ripples = [];
  let cascadeQueue = [];

  let clock = 0;
  let waveTime = 0;
  let autoCascadeTimer = 0;
  let reticleAngle = 0;

  // 'rgb' | 'green_buy' | 'red_sell'
  let neuralColorMode = 'rgb';
  let selectedNodeIndex = 0;
  let activeSignaledNodeIndex = -1;
  let hoveredNodeIndex = -1;

  const autoTuner = {
    tendrilRichness: 9.8,
    pulseSpeed: 2.35,
    waveFlow: 1.85,
    bloomIntensity: 0.86
  };

  const mouse = {
    x: width * 0.5,
    y: height * 0.5,
    active: false,
    radius: 260
  };

  let seed = 108;
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function getNeuralColor(phaseOffset = 0, alpha = 1, lightness = 58) {
    if (neuralColorMode === 'red_sell' || neuralColorMode === 'red') {
      const redHue = 348 + Math.sin(clock * 6 + phaseOffset) * 5;
      return `hsla(${redHue}, 100%, ${lightness}%, ${alpha})`;
    }
    if (neuralColorMode === 'green_buy' || neuralColorMode === 'green') {
      const greenHue = 148 + Math.sin(clock * 6 + phaseOffset) * 6;
      return `hsla(${greenHue}, 100%, ${lightness}%, ${alpha})`;
    }
    const rgbHue = (clock * 38 + phaseOffset * 55) % 360;
    return `hsla(${rgbHue}, 96%, ${lightness}%, ${alpha})`;
  }

  function createFiberBundle(indexA, indexB, strandCount, isCoreBridge) {
    const connIndex = connections.length;
    const strands = [];

    for (let s = 0; s < strandCount; s++) {
      const isPrimary = s === 0;
      const spread = isPrimary ? 12 : 22 + s * 9;
      strands.push({
        isPrimary,
        strandRank: s,
        perpOffset1: (rand() - 0.5) * spread * 2.1,
        perpOffset2: (rand() - 0.5) * spread * 2.1,
        waveAmp: 6 + rand() * 14,
        waveFreq: 0.55 + rand() * 0.85,
        phase: rand() * Math.PI * 2,
        lineWidth: isPrimary ? (isCoreBridge ? 2.35 : 1.5) : 0.45 + rand() * 0.85,
        alpha: isPrimary ? (isCoreBridge ? 0.88 : 0.68) : 0.14 + rand() * 0.28
      });
    }

    connections.push({ a: indexA, b: indexB, strands, isCoreBridge });
    nodes[indexA].neighbors.push({ nodeIndex: indexB, connIndex, reverse: false });
    nodes[indexB].neighbors.push({ nodeIndex: indexA, connIndex, reverse: true });
  }

  function buildNeuralTopology(existingMainAssets, existingSmallAssets) {
    seed = 108;
    const prevNodes = nodes;
    nodes = [];
    connections = [];
    fineMeshFibers = [];
    freeDendrites = [];
    pulses = [];
    cascadeQueue = [];

    const hubCoords = [
      { nx: 0.16, ny: 0.28, r: 15 },
      { nx: 0.30, ny: 0.22, r: 14 },
      { nx: 0.24, ny: 0.52, r: 15 },
      { nx: 0.42, ny: 0.36, r: 14 },
      { nx: 0.38, ny: 0.66, r: 13 },
      { nx: 0.54, ny: 0.25, r: 14 },
      { nx: 0.56, ny: 0.54, r: 15 },
      { nx: 0.48, ny: 0.78, r: 13 },
      { nx: 0.70, ny: 0.32, r: 14 },
      { nx: 0.68, ny: 0.64, r: 14 },
      { nx: 0.82, ny: 0.24, r: 13 },
      { nx: 0.84, ny: 0.50, r: 15 },
      { nx: 0.78, ny: 0.76, r: 13 },
      { nx: 0.91, ny: 0.64, r: 13 }
    ];

    const fallbackMain = existingMainAssets || window.MAIN_HUB_ASSETS || [
      { symbol: 'BTC/USDT', name: 'Bitcoin Perpetual Core', price: 78428.95, change: 1.28, fundingRate: -0.0145 },
      { symbol: 'XAU/USD', name: 'Spot Gold', price: 2918.40, change: 1.34, fundingRate: -0.0185 },
      { symbol: 'ETH/USDT', name: 'Ethereum', price: 2145.80, change: 2.15, fundingRate: -0.0212 },
      { symbol: 'SOL/USDT', name: 'Solana', price: 142.60, change: 4.14, fundingRate: 0.0285 },
      { symbol: 'BNB/USDT', name: 'Binance Coin', price: 598.30, change: 1.42, fundingRate: -0.0190 },
      { symbol: 'XRP/USDT', name: 'Ripple', price: 2.24, change: 3.65, fundingRate: 0.0315 },
      { symbol: 'EUR/USD', name: 'Euro / USD', price: 1.0482, change: 0.34, fundingRate: -0.0125 },
      { symbol: 'NAS100', name: 'Nasdaq 100', price: 21845.00, change: 1.15, fundingRate: 0.0230 },
      { symbol: 'US30', name: 'Dow Jones 30', price: 44390.00, change: 0.78, fundingRate: -0.0168 },
      { symbol: 'ADA/USDT', name: 'Cardano', price: 0.742, change: 2.18, fundingRate: 0.0264 },
      { symbol: 'AVAX/USDT', name: 'Avalanche', price: 22.85, change: 2.45, fundingRate: -0.0255 },
      { symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.214, change: 5.40, fundingRate: 0.0345 },
      { symbol: 'LINK/USDT', name: 'Chainlink', price: 15.92, change: 3.10, fundingRate: -0.0292 },
      { symbol: 'DOT/USDT', name: 'Polkadot', price: 4.86, change: 2.74, fundingRate: -0.0228 }
    ];

    const fallbackSmall = existingSmallAssets || window.SMALL_COIN_ASSETS || [];
    const smallCount = fallbackSmall.length > 0 ? fallbackSmall.length : 52;

    // 1. 14 Main Hubs
    hubCoords.forEach((hc, idx) => {
      const prev = prevNodes[idx];
      const baseAsset = prev?.asset || { ...fallbackMain[idx % fallbackMain.length] };
      nodes.push({
        index: nodes.length,
        id: `NEURAL-HUB-${String(idx + 1).padStart(2, '0')}`,
        x: hc.nx * width,
        y: hc.ny * height,
        baseX: hc.nx * width,
        baseY: hc.ny * height,
        r: hc.r,
        _origR: hc.r,
        isCore: true,
        isRelay: false,
        isAnchor: false,
        asset: baseAsset,
        aiBrain: prev?.aiBrain || 'All 3 AI Consensus',
        lastSignal: prev?.lastSignal,
        phase: rand() * Math.PI * 2,
        speed: 0.55 + rand() * 0.45,
        driftX: 10 + rand() * 14,
        driftY: 10 + rand() * 14,
        pulseEnergy: 0,
        neighbors: []
      });
    });

    // 2. 52 Small Coin Dots (18 Relay + 34 Satellite)
    for (let i = 0; i < smallCount; i++) {
      const isRelay = i < 18;
      const prev = prevNodes[14 + i];
      const baseAsset =
        prev?.asset ||
        (fallbackSmall[i]
          ? { ...fallbackSmall[i] }
          : { symbol: `COIN${i + 1}/USDT`, name: `Altcoin Node ${i + 1}`, price: 1.0, change: 1.2, fundingRate: -0.01 });

      const nx = 0.08 + rand() * 0.84;
      const ny = 0.12 + rand() * 0.78;
      const rVal = isRelay ? 6.2 + rand() * 2.2 : 4.2 + rand() * 2.0;

      nodes.push({
        index: nodes.length,
        id: `SMALL-COIN-${String(i + 1).padStart(2, '0')}`,
        x: nx * width,
        y: ny * height,
        baseX: nx * width,
        baseY: ny * height,
        r: rVal,
        _origR: rVal,
        isCore: false,
        isRelay,
        isAnchor: false,
        asset: baseAsset,
        aiBrain: prev?.aiBrain || 'All 3 AI Consensus',
        lastSignal: prev?.lastSignal,
        phase: rand() * Math.PI * 2,
        speed: 0.65 + rand() * 0.65,
        driftX: 8 + rand() * 12,
        driftY: 8 + rand() * 12,
        pulseEnergy: 0,
        neighbors: []
      });
    }

    // 3. 20 Off-Screen Boundary Anchors for Seamless Edge Tendrils
    for (let i = 0; i < 20; i++) {
      const edge = i % 4;
      let ax = 0, ay = 0;
      if (edge === 0) { ax = -90; ay = rand() * height; }
      else if (edge === 1) { ax = width + 90; ay = rand() * height; }
      else if (edge === 2) { ax = rand() * width; ay = -90; }
      else { ax = rand() * width; ay = height + 90; }

      nodes.push({
        index: nodes.length,
        id: `ANCHOR-${i}`,
        x: ax,
        y: ay,
        baseX: ax,
        baseY: ay,
        r: 0,
        isCore: false,
        isRelay: false,
        isAnchor: true,
        phase: rand() * Math.PI * 2,
        speed: 0.3,
        driftX: 4,
        driftY: 4,
        pulseEnergy: 0,
        neighbors: []
      });
    }

    // 4. Connect Primary Hubs with 11-Strand Nerve Bundles
    const coreBridges = [
      [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [3, 6],
      [4, 6], [4, 7], [5, 8], [6, 8], [6, 9], [7, 9], [8, 10],
      [8, 11], [9, 11], [9, 12], [10, 11], [11, 13], [12, 13],
      [1, 5], [0, 4], [5, 10], [7, 12]
    ];
    coreBridges.forEach(([a, b]) => createFiberBundle(a, b, 11, true));

    // 5. Connect Small Coin Dots & Anchors to Nearest Hubs
    for (let i = 14; i < nodes.length; i++) {
      const n = nodes[i];
      const dists = [];
      for (let j = 0; j < 14; j++) {
        const h = nodes[j];
        dists.push({ idx: j, d: Math.hypot(n.baseX - h.baseX, n.baseY - h.baseY) });
      }
      dists.sort((a, b) => a.d - b.d);
      const linkCount = n.isAnchor ? 2 : n.isRelay ? 3 : 2;
      for (let k = 0; k < linkCount; k++) {
        createFiberBundle(i, dists[k].idx, n.isRelay ? 7 : 5, false);
      }
    }

    // 6. 150 Delicate Background Mesh Filaments
    for (let i = 0; i < 150; i++) {
      const hubIndex = Math.floor(rand() * 14);
      const hub = nodes[hubIndex];
      const angle = rand() * Math.PI * 2;
      const dist = 120 + rand() * (Math.max(width, height) * 0.45);
      fineMeshFibers.push({
        hubIndex,
        tetherToHub: rand() > 0.25,
        startX: hub.baseX + Math.cos(angle) * dist,
        startY: hub.baseY + Math.sin(angle) * dist,
        endX: hub.baseX + (rand() - 0.5) * 160,
        endY: hub.baseY + (rand() - 0.5) * 160,
        cp1xOff: (rand() - 0.5) * 140,
        cp1yOff: (rand() - 0.5) * 140,
        cp2xOff: (rand() - 0.5) * 140,
        cp2yOff: (rand() - 0.5) * 140,
        lineWidth: 0.35 + rand() * 0.75,
        alpha: 0.08 + rand() * 0.18,
        phase: rand() * Math.PI * 2,
        speed: 0.4 + rand() * 0.7,
        rank: Math.floor(rand() * 12)
      });
    }

    // 7. Free-Floating Sprouting Dendrites
    for (let i = 0; i < 14; i++) {
      const count = 5 + Math.floor(rand() * 4);
      for (let k = 0; k < count; k++) {
        freeDendrites.push({
          hubIndex: i,
          angle: rand() * Math.PI * 2,
          length: 55 + rand() * 130,
          curve1: (rand() - 0.5) * 55,
          curve2: (rand() - 0.5) * 55,
          lineWidth: 0.45 + rand() * 0.85,
          alpha: 0.14 + rand() * 0.24,
          phase: rand() * Math.PI * 2,
          speed: 0.6 + rand() * 0.8
        });
      }
    }

    window.nodes = nodes;
  }

  function getAnimatedControlPoints(nodeA, nodeB, strand, t) {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const wave1 = Math.sin(t * strand.waveFreq + strand.phase) * strand.waveAmp * autoTuner.waveFlow;
    const wave2 = Math.cos(t * strand.waveFreq * 0.9 + strand.phase) * strand.waveAmp * autoTuner.waveFlow;

    let cp1x = nodeA.x + dx * 0.33 + nx * (strand.perpOffset1 + wave1);
    let cp1y = nodeA.y + dy * 0.33 + ny * (strand.perpOffset1 + wave1);
    let cp2x = nodeA.x + dx * 0.66 + nx * (strand.perpOffset2 + wave2);
    let cp2y = nodeA.y + dy * 0.66 + ny * (strand.perpOffset2 + wave2);

    if (mouse.active) {
      const midX = (cp1x + cp2x) * 0.5;
      const midY = (cp1y + cp2y) * 0.5;
      const md = Math.hypot(midX - mouse.x, midY - mouse.y);
      if (md < mouse.radius && md > 1) {
        const push = (1 - md / mouse.radius) * 28;
        const pushX = ((midX - mouse.x) / md) * push;
        const pushY = ((midY - mouse.y) / md) * push;
        cp1x += pushX;
        cp1y += pushY;
        cp2x += pushX;
        cp2y += pushY;
      }
    }

    return { cp1x, cp1y, cp2x, cp2y };
  }

  function evalBezier(t, p0x, p0y, cp1x, cp1y, cp2x, cp2y, p3x, p3y) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    return {
      x: uu * u * p0x + 3 * uu * t * cp1x + 3 * u * tt * cp2x + tt * t * p3x,
      y: uu * u * p0y + 3 * uu * t * cp1y + 3 * u * tt * cp2y + tt * t * p3y
    };
  }

  function spawnPulse(connIndexOverride, reverseOverride, isHighPriority = false) {
    if (!connections.length || pulses.length > 140) return;
    const connIndex = connIndexOverride !== undefined ? connIndexOverride : Math.floor(Math.random() * connections.length);
    const conn = connections[connIndex];
    if (!conn) return;

    pulses.push({
      connIndex,
      strandIndex: Math.floor(Math.random() * Math.min(3, conn.strands.length)),
      t: 0,
      reverse: reverseOverride !== undefined ? reverseOverride : Math.random() < 0.5,
      baseSpeed: (0.0055 + Math.random() * 0.0065) * (isHighPriority ? 1.35 : 1),
      radius: isHighPriority ? 2.6 : 1.5 + Math.random() * 1.2,
      hueOffset: Math.random() * Math.PI * 2
    });
  }

  function triggerAutonomousCascade(startHubIdx) {
    if (!nodes.length) return;
    const rootIdx = startHubIdx !== undefined ? startHubIdx : Math.floor(Math.random() * 14);
    const rootNode = nodes[rootIdx];
    if (!rootNode) return;

    rootNode.pulseEnergy = 1.4;
    ripples.push({
      x: rootNode.x,
      y: rootNode.y,
      r: rootNode.r || 8,
      maxR: 135,
      alpha: 0.72,
      phase: rootNode.phase
    });

    rootNode.neighbors.forEach((nb, i) => {
      spawnPulse(nb.connIndex, nb.reverse, true);
      cascadeQueue.push({ nodeIndex: nb.nodeIndex, delay: 8 + i * 4 });
    });
  }

  function triggerSynapticBurst(cx, cy) {
    ripples.push({
      x: cx,
      y: cy,
      r: 6,
      maxR: 180,
      alpha: 0.85,
      phase: Math.random() * Math.PI * 2
    });
    nodes.forEach(node => {
      if (node.isAnchor) return;
      const d = Math.hypot(node.x - cx, node.y - cy);
      if (d < 260) {
        node.pulseEnergy = Math.min(1.5, node.pulseEnergy + (1 - d / 260) * 1.1);
        node.neighbors.forEach(nb => {
          if (Math.random() < 0.65) spawnPulse(nb.connIndex, nb.reverse, true);
        });
      }
    });
  }

  function updateAutomatedTuner(dt) {
    clock += dt;
    reticleAngle += dt * (neuralColorMode !== 'rgb' ? 3.2 : 1.5);

    const richnessWave = 0.5 + 0.5 * (Math.sin(clock * 0.42) * 0.65 + Math.cos(clock * 0.19 + 1.2) * 0.35);
    autoTuner.tendrilRichness = 7.5 + richnessWave * 4.5;

    const speedBoost = neuralColorMode !== 'rgb' ? 0.45 : 0;
    const speedWave = 0.5 + 0.5 * (Math.sin(clock * 0.55 + 0.8) * 0.6 + Math.sin(clock * 1.15) * 0.4);
    autoTuner.pulseSpeed = Math.min(3.0, 1.55 + speedWave * 1.45 + speedBoost);

    const flowWave = 0.5 + 0.5 * (Math.cos(clock * 0.36 + 2.1) * 0.7 + Math.sin(clock * 0.78) * 0.3);
    autoTuner.waveFlow = 1.25 + flowWave * 1.2;

    const bloomWave = 0.5 + 0.5 * (Math.sin(clock * 0.64 + 0.4) * 0.55 + Math.cos(clock * 1.32) * 0.45);
    autoTuner.bloomIntensity = 0.68 + bloomWave * 0.32;

    waveTime += dt * 0.95 * autoTuner.waveFlow;
  }

  function animate() {
    const dt = 0.016;
    updateAutomatedTuner(dt);

    const bloom = autoTuner.bloomIntensity;
    const richness = autoTuner.tendrilRichness;
    const isRed = neuralColorMode === 'red_sell' || neuralColorMode === 'red';
    const isGreen = neuralColorMode === 'green_buy' || neuralColorMode === 'green';

    autoCascadeTimer += dt * autoTuner.pulseSpeed;
    if (autoCascadeTimer > 2.2) {
      autoCascadeTimer = 0;
      triggerAutonomousCascade();
    }

    for (let i = cascadeQueue.length - 1; i >= 0; i--) {
      const item = cascadeQueue[i];
      item.delay--;
      if (item.delay <= 0) {
        const n = nodes[item.nodeIndex];
        if (n && !n.isAnchor) {
          n.pulseEnergy = Math.min(1.4, n.pulseEnergy + 0.68);
          n.neighbors.forEach(nb => {
            if (Math.random() < 0.45) spawnPulse(nb.connIndex, nb.reverse, false);
          });
        }
        cascadeQueue.splice(i, 1);
      }
    }

    // 1. Background Radial Illumination (Exact neural.html glow)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = isRed ? '#090103' : isGreen ? '#010905' : '#010508';
    ctx.fillRect(0, 0, width, height);

    const bgGlow1 = ctx.createRadialGradient(
      width * 0.48, height * 0.48, 10,
      width * 0.48, height * 0.48, Math.max(width, height) * 0.75
    );
    if (isRed) {
      bgGlow1.addColorStop(0, `rgba(115, 4, 22, ${0.88 * bloom})`);
      bgGlow1.addColorStop(0.5, `rgba(54, 2, 12, ${0.62 * bloom})`);
      bgGlow1.addColorStop(1, 'rgba(9, 1, 3, 0)');
    } else if (isGreen) {
      bgGlow1.addColorStop(0, `rgba(4, 105, 58, ${0.88 * bloom})`);
      bgGlow1.addColorStop(0.5, `rgba(2, 48, 26, ${0.62 * bloom})`);
      bgGlow1.addColorStop(1, 'rgba(1, 9, 5, 0)');
    } else {
      const bgHue = (clock * 25) % 360;
      bgGlow1.addColorStop(0, `hsla(${bgHue}, 85%, 14%, ${0.78 * bloom})`);
      bgGlow1.addColorStop(0.5, `hsla(${(bgHue + 60) % 360}, 80%, 9%, ${0.52 * bloom})`);
      bgGlow1.addColorStop(1, 'rgba(1, 5, 8, 0)');
    }
    ctx.fillStyle = bgGlow1;
    ctx.fillRect(0, 0, width, height);

    // 2. Update Floating Node Positions
    const driftMult = 0.75 + autoTuner.waveFlow * 0.28;
    nodes.forEach(node => {
      node.x = node.baseX + Math.sin(waveTime * node.speed + node.phase) * node.driftX * driftMult;
      node.y = node.baseY + Math.cos(waveTime * node.speed * 0.85 + node.phase) * node.driftY * driftMult;

      if (mouse.active && !node.isAnchor) {
        const dist = Math.hypot(mouse.x - node.x, mouse.y - node.y);
        if (dist < 210) {
          node.pulseEnergy = Math.max(node.pulseEnergy, (1 - dist / 210) * 0.85);
        }
      }
      if (node.pulseEnergy > 0) node.pulseEnergy = Math.max(0, node.pulseEnergy - 0.016);
    });

    ctx.globalCompositeOperation = 'lighter';

    // 3. Free-Floating Sprouting Dendrites
    freeDendrites.forEach(d => {
      const hub = nodes[d.hubIndex];
      if (!hub) return;
      const sway = Math.sin(waveTime * d.speed + d.phase) * 0.18 * autoTuner.waveFlow;
      const endX = hub.x + Math.cos(d.angle + sway) * d.length;
      const endY = hub.y + Math.sin(d.angle + sway) * d.length;
      const cp1x = hub.x + (endX - hub.x) * 0.35 + d.curve1 * Math.sin(waveTime * 0.6 + d.phase);
      const cp1y = hub.y + (endY - hub.y) * 0.35 + d.curve1 * Math.cos(waveTime * 0.6 + d.phase);
      const cp2x = hub.x + (endX - hub.x) * 0.7 + d.curve2 * Math.cos(waveTime * 0.5 + d.phase);
      const cp2y = hub.y + (endY - hub.y) * 0.7 + d.curve2 * Math.sin(waveTime * 0.5 + d.phase);

      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = getNeuralColor(d.phase, d.alpha * bloom, 56);
      ctx.lineWidth = d.lineWidth;
      ctx.stroke();
    });

    // 4. 150 Background Mesh Filaments
    fineMeshFibers.forEach(f => {
      const rankFactor = Math.max(0.2, Math.min(1, richness - f.rank * 0.45));
      const hub = nodes[f.hubIndex];
      const ex = f.tetherToHub && hub ? hub.x : f.endX;
      const ey = f.tetherToHub && hub ? hub.y : f.endY;
      const wave = Math.sin(waveTime * f.speed + f.phase) * 14 * autoTuner.waveFlow;
      const cp1x = f.startX + (ex - f.startX) * 0.33 + f.cp1xOff + wave;
      const cp1y = f.startY + (ey - f.startY) * 0.33 + f.cp1yOff - wave * 0.6;
      const cp2x = f.startX + (ex - f.startX) * 0.66 + f.cp2xOff - wave;
      const cp2y = f.startY + (ey - f.startY) * 0.66 + f.cp2yOff + wave * 0.6;

      ctx.beginPath();
      ctx.moveTo(f.startX, f.startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
      ctx.strokeStyle = getNeuralColor(f.phase, f.alpha * rankFactor * bloom, 55);
      ctx.lineWidth = f.lineWidth;
      ctx.stroke();
    });

    // 5. Multi-Strand Curved Bezier Nerve Bundles
    connections.forEach(conn => {
      const nodeA = nodes[conn.a];
      const nodeB = nodes[conn.b];
      if (!nodeA || !nodeB) return;
      const energyBoost = (nodeA.pulseEnergy + nodeB.pulseEnergy) * 0.3;

      conn.strands.forEach(strand => {
        const strandVisibility = strand.isPrimary ? 1.0 : Math.max(0, Math.min(1, richness - strand.strandRank + 0.5));
        if (strandVisibility <= 0.02) return;

        const { cp1x, cp1y, cp2x, cp2y } = getAnimatedControlPoints(nodeA, nodeB, strand, waveTime);

        if (strand.isPrimary) {
          ctx.beginPath();
          ctx.moveTo(nodeA.x, nodeA.y);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nodeB.x, nodeB.y);
          ctx.strokeStyle = getNeuralColor(nodeA.phase, (0.22 + energyBoost * 0.28) * bloom, 54);
          ctx.lineWidth = strand.lineWidth * (3.1 + bloom * 0.7);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nodeB.x, nodeB.y);
        const alpha = Math.min(1, (strand.alpha + energyBoost * 0.32) * strandVisibility * bloom);
        ctx.strokeStyle = getNeuralColor(nodeA.phase + strand.strandRank * 0.2, alpha, strand.isPrimary ? 66 : 56);
        ctx.lineWidth = strand.lineWidth;
        ctx.stroke();
      });
    });

    // 6. Traveling Synaptic Action-Potential Pulses
    const spawnChance = 0.25 * autoTuner.pulseSpeed;
    if (Math.random() < spawnChance) spawnPulse();
    if (Math.random() < spawnChance - 0.32) spawnPulse();

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.baseSpeed * autoTuner.pulseSpeed;
      const conn = connections[p.connIndex];
      if (!conn) { pulses.splice(i, 1); continue; }

      const targetNode = p.reverse ? nodes[conn.a] : nodes[conn.b];
      if (p.t >= 1) {
        if (targetNode && !targetNode.isAnchor) targetNode.pulseEnergy = Math.min(1.4, targetNode.pulseEnergy + 0.55);
        pulses.splice(i, 1);
        continue;
      }

      const strand = conn.strands[p.strandIndex] || conn.strands[0];
      const { cp1x, cp1y, cp2x, cp2y } = getAnimatedControlPoints(nodes[conn.a], nodes[conn.b], strand, waveTime);
      const evalT = p.reverse ? 1 - p.t : p.t;
      const pos = evalBezier(evalT, nodes[conn.a].x, nodes[conn.a].y, cp1x, cp1y, cp2x, cp2y, nodes[conn.b].x, nodes[conn.b].y);

      const pRadius = p.radius * (3.9 + bloom * 1.2);
      const pGrad = ctx.createRadialGradient(pos.x, pos.y, 0.5, pos.x, pos.y, pRadius);
      pGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * bloom})`);
      pGrad.addColorStop(0.38, getNeuralColor(p.hueOffset, 0.85 * bloom, 62));
      pGrad.addColorStop(1, getNeuralColor(p.hueOffset, 0, 50));

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = pGrad;
      ctx.fill();
    }

    // 7. Nodes + Halos + Rotating Reticle + Ticker Pills
    nodes.forEach((node, idx) => {
      if (node.isAnchor || node.r <= 0) return;

      const isSelected = idx === selectedNodeIndex;
      const isSignaled = idx === activeSignaledNodeIndex;
      const isHovered = idx === hoveredNodeIndex;
      const energy = node.pulseEnergy + (isSelected ? 0.45 : 0) + (isSignaled ? 0.65 : 0) + (isHovered ? 0.3 : 0);
      const r = (node.r + (isSignaled && !node.isCore ? 6 : 0)) * (1 + Math.min(0.5, energy * 0.14));

      const haloR = r * (node.isCore || isSignaled ? 3.6 : node.isRelay ? 2.8 : 2.5) * (0.85 + bloom * 0.25);
      const haloGrad = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, haloR);
      haloGrad.addColorStop(0, getNeuralColor(node.phase, (0.48 + energy * 0.35) * bloom, 60));
      haloGrad.addColorStop(0.5, getNeuralColor(node.phase + 0.5, (0.18 + energy * 0.16) * bloom, 52));
      haloGrad.addColorStop(1, getNeuralColor(node.phase, 0, 45));

      ctx.beginPath();
      ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = getNeuralColor(node.phase, 0.96, energy > 0.4 ? 72 : 60);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 + energy * 0.38) * bloom})`;
      ctx.fill();

      if (isSelected || isSignaled || isHovered) {
        const retRadius = r + (isSignaled ? 15 : isSelected ? 11 : 8);
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(isSelected || isSignaled ? reticleAngle : -reticleAngle * 0.5);
        ctx.strokeStyle = isRed ? 'rgba(255, 40, 70, 0.98)' : isGreen ? 'rgba(0, 255, 136, 0.98)' : getNeuralColor(node.phase, 0.95, 72);
        ctx.lineWidth = isSignaled ? 2.6 : isSelected ? 2.0 : 1.4;
        for (let seg = 0; seg < 4; seg++) {
          ctx.beginPath();
          ctx.arc(0, 0, retRadius, seg * (Math.PI / 2) + 0.22, (seg + 1) * (Math.PI / 2) - 0.22);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (node.asset && (node.isCore || isSelected || isSignaled || isHovered)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = `${node.isCore || isSignaled ? '700 10.5px' : '600 9.5px'} "JetBrains Mono", monospace`;
        const sigTag = isSignaled && node.lastSignal ? ` • ${node.lastSignal.isLong ? 'BUY' : 'SELL'}` : '';
        const label = `${node.asset.symbol}${sigTag}`;
        const textW = ctx.measureText(label).width;
        const pillX = node.x - textW / 2 - 6;
        const pillY = node.y + r + 7;

        ctx.fillStyle = isRed ? 'rgba(40, 3, 10, 0.92)' : isGreen ? 'rgba(2, 36, 20, 0.92)' : 'rgba(2, 12, 20, 0.86)';
        ctx.strokeStyle = isRed ? 'rgba(255, 45, 75, 0.9)' : isGreen ? 'rgba(0, 255, 136, 0.9)' : getNeuralColor(node.phase, 0.7, 62);
        ctx.lineWidth = isSignaled ? 1.6 : 1;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, textW + 12, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isRed ? '#ffd6dc' : isGreen ? '#d1fae5' : '#e6fcff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, pillY + 8);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
    });

    // 8. Synaptic Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.r += 7.8 * (0.7 + autoTuner.pulseSpeed * 0.2);
      rip.alpha *= 0.94;
      if (rip.alpha <= 0.015 || rip.r >= rip.maxR) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = getNeuralColor(rip.phase || 0, rip.alpha, 64);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNeuralTopology();
  }

  function findNodeAtScreenPos(px, py) {
    if (activeSignaledNodeIndex !== -1 && nodes[activeSignaledNodeIndex]) {
      const sigNode = nodes[activeSignaledNodeIndex];
      if (Math.hypot(px - sigNode.x, py - sigNode.y) <= Math.max(sigNode.r * 2.8, 32)) {
        return activeSignaledNodeIndex;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.isAnchor || n.r <= 0) continue;
      if (Math.hypot(px - n.x, py - n.y) <= Math.max(n.r * 1.85, 15)) return i;
    }
    return -1;
  }

  canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    hoveredNodeIndex = findNodeAtScreenPos(e.clientX, e.clientY);
    canvas.style.cursor = hoveredNodeIndex !== -1 ? 'pointer' : 'crosshair';
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.active = false;
    hoveredNodeIndex = -1;
  });

  canvas.addEventListener('mousedown', e => {
    const idx = findNodeAtScreenPos(e.clientX, e.clientY);
    if (idx !== -1) {
      selectedNodeIndex = idx;
      triggerAutonomousCascade(idx);
      if (typeof window.onNeuralNodeClick === 'function') window.onNeuralNodeClick(idx, nodes[idx]);
    } else {
      triggerSynapticBurst(e.clientX, e.clientY);
    }
  });

  window.addEventListener('resize', resizeCanvas);

  // Public API for app.js & pnlManager.js
  window.NeuralCanvas = {
    init: resizeCanvas,
    resize: resizeCanvas,
    setMode: mode => { neuralColorMode = mode || 'rgb'; },
    setColorMode: mode => { neuralColorMode = mode || 'rgb'; },
    setSelectedNode: idx => { selectedNodeIndex = idx; },
    setSignaledNode: idx => { activeSignaledNodeIndex = idx; },
    triggerCascade: triggerAutonomousCascade,
    triggerBurst: triggerSynapticBurst,
    getNodes: () => nodes,
    findNodeAt: findNodeAtScreenPos
  };

  window.triggerAutonomousCascade = triggerAutonomousCascade;
  window.triggerSynapticBurst = triggerSynapticBurst;

  resizeCanvas();
  animate();
})();
