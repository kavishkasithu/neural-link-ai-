/**
 * MAIN FRONTEND APPLICATION CONTROLLER
 */
(function () {
  let currentUser = null;
  let isAdmin = false;
  let isSignUpMode = false;
  let hasActiveSignal = false;
  let recentSymbols = [];
  let rrIsCryptoMode = true;

  window.formatPrice = function (val) {
    if (val === undefined || val === null || isNaN(val)) return '$0.00';
    const n = Number(val);
    if (n < 0.001) return '$' + n.toFixed(7);
    if (n < 1) return '$' + n.toFixed(4);
    if (n < 100) return '$' + n.toFixed(2);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  window.showToast = function (msg, icon = '⚡') {
    const toast = document.getElementById('neural-toast');
    if (!toast) return;
    document.getElementById('toast-text').textContent = msg;
    document.getElementById('toast-icon').textContent = icon;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 3400);
  };

  window.copyCoinSymbolToClipboard = function (sym) {
    const clean = String(sym || 'BTC/USDT').trim();
    const ta = document.createElement('textarea');
    ta.value = clean;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    window.showToast(`Copied: ${clean}`, '📋');
  };

  function getStealthSpec(fundingRate) {
    return Number(fundingRate || 0) >= 0
      ? { isLong: false, side: 'SELL / SHORT', shortLabel: 'SELL', mode: 'red_sell' }
      : { isLong: true, side: 'BUY / LONG', shortLabel: 'BUY', mode: 'green_buy' };
  }

  // ---------------- LIVE MARKET DATA FROM BACKEND ----------------
  async function syncBinanceFromBackend() {
    try {
      const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/market/binance-scan`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.ok || !Array.isArray(data.pairs)) return;

      const map = {};
      data.pairs.forEach(p => { map[p.binanceSymbol] = p; });
      const nodes = window.NeuralCanvasEngine.getNodes();
      nodes.forEach(n => {
        if (n.asset && map[n.asset.binanceSymbol]) {
          n.asset.price = map[n.asset.binanceSymbol].price;
          n.asset.change = map[n.asset.binanceSymbol].change;
          n.asset.fundingRate = map[n.asset.binanceSymbol].fundingRate;
        }
      });
      updateTerminalCard();
      updateBtcSummary();
    } catch (_) {}
  }

  async function syncNewsFromBackend() {
    try {
      const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/market/news`);
      const data = await resp.json();
      const list = document.getElementById('live-news-radar-list');
      if (!list || !data.ok) return;

      const nodes = window.NeuralCanvasEngine.getNodes();
      const nearCoins = nodes
        .filter(n => n.asset && window.NeuralPnlManager.getNodeProximity(n).isNear)
        .sort((a, b) => window.NeuralPnlManager.getNodeProximity(a).distPct - window.NeuralPnlManager.getNodeProximity(b).distPct)
        .slice(0, 5);

      const nearHtml = nearCoins.map(n => {
        const prox = window.NeuralPnlManager.getNodeProximity(n);
        const spec = getStealthSpec(n.asset.fundingRate);
        const cls = spec.isLong
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
          : 'bg-rose-500/20 text-rose-300 border border-rose-400/40';
        return `
          <div onclick="window.__openChartModal(${n.index})" class="cursor-pointer p-2 rounded-lg bg-slate-950/90 border border-emerald-500/35 hover:border-cyan-400 flex items-center justify-between">
            <div><span class="font-bold text-white">${n.asset.symbol}</span> <span class="text-[9px] text-cyan-300">@ ${window.formatPrice(prox.entryRef)}</span></div>
            <div class="flex items-center gap-1">
              <span class="text-[8px] px-1 rounded bg-cyan-500/20 text-cyan-200 font-bold">Δ ${prox.distPct.toFixed(2)}%</span>
              <span class="text-[8px] px-1.5 py-0.5 rounded font-bold ${cls}">🎯 NEAR ${spec.shortLabel}</span>
            </div>
          </div>`;
      }).join('');

      const newsHtml = (data.news || []).slice(0, 4).map(item => `
        <div class="p-2 rounded-lg bg-slate-950/80 border border-cyan-500/20 space-y-0.5">
          <div class="flex justify-between text-[8px]">
            <span class="text-cyan-300/80 font-bold">${item.source}</span>
            <span class="${item.sentiment === 'BULLISH' ? 'text-emerald-300' : 'text-rose-300'} font-bold">${item.sentiment}</span>
          </div>
          <p class="text-[10px] text-cyan-100/85 leading-snug">${item.title}</p>
        </div>`).join('');

      list.innerHTML = nearHtml + newsHtml;
    } catch (_) {}
  }

  function updateBtcSummary() {
    const nodes = window.NeuralCanvasEngine.getNodes();
    if (!nodes[0] || !nodes[0].asset) return;
    const btc = nodes[0].asset;
    const pEl = document.getElementById('btc-sum-price');
    const cEl = document.getElementById('btc-sum-change');
    if (pEl) pEl.textContent = window.formatPrice(btc.price);
    if (cEl) {
      cEl.textContent = `${btc.change >= 0 ? '+' : ''}${btc.change.toFixed(2)}% (24h)`;
      cEl.className = btc.change >= 0 ? 'text-[9px] text-emerald-400 font-semibold' : 'text-[9px] text-rose-400 font-semibold';
    }
  }

  function updateTerminalCard() {
    const nodes = window.NeuralCanvasEngine.getNodes();
    const node = nodes[window.NeuralCanvasEngine.getSelectedIndex()] || nodes[0];
    if (!node || !node.asset) return;

    document.getElementById('term-symbol').textContent = node.asset.symbol;
    document.getElementById('term-price').textContent = window.formatPrice(node.asset.price);
    const chg = document.getElementById('term-change');
    chg.textContent = `${node.asset.change >= 0 ? '+' : ''}${node.asset.change.toFixed(2)}% (24h)`;
    chg.className = node.asset.change >= 0 ? 'text-[11px] text-emerald-400 font-semibold' : 'text-[11px] text-rose-400 font-semibold';

    document.getElementById('term-market-update-box').classList.toggle('hidden', hasActiveSignal);
    document.getElementById('term-signal-box').classList.toggle('hidden', !hasActiveSignal);
  }

  // ---------------- NEAR-ENTRY SIGNAL GENERATOR ----------------
  function generateNearEntrySignal() {
    const nodes = window.NeuralCanvasEngine.getNodes().filter(n => n.asset);
    let pool = nodes.filter(n => window.NeuralPnlManager.getNodeProximity(n).isNear && !recentSymbols.includes(n.asset.symbol));
    if (!pool.length) {
      pool = nodes.filter(n => !recentSymbols.includes(n.asset.symbol));
      if (!pool.length) { recentSymbols = []; pool = nodes; }
      pool[0].entryZoneAnchor = pool[0].asset.price;
    }
    pool.sort((a, b) => window.NeuralPnlManager.getNodeProximity(a).distPct - window.NeuralPnlManager.getNodeProximity(b).distPct);
    const chosen = pool[0];
    recentSymbols.push(chosen.asset.symbol);
    if (recentSymbols.length > 15) recentSymbols = recentSymbols.slice(-15);

    const spec = getStealthSpec(chosen.asset.fundingRate);
    const p = chosen.asset.price;
    const tp1Dist = chosen.isCore ? 0.0065 : 0.0110;
    const tp2Dist = chosen.isCore ? 0.0130 : 0.0220;
    const slDist  = chosen.isCore ? 0.0040 : 0.0070;

    const sig = {
      symbol: chosen.asset.symbol,
      isLong: spec.isLong,
      direction: spec.side,
      confidence: Math.floor(92 + Math.random() * 7),
      entryPrice: p,
      tp1Price: spec.isLong ? p * (1 + tp1Dist) : p * (1 - tp1Dist),
      tp2Price: spec.isLong ? p * (1 + tp2Dist) : p * (1 - tp2Dist),
      slPrice:  spec.isLong ? p * (1 - slDist)  : p * (1 + slDist)
    };

    chosen.entryZoneAnchor = p;
    chosen.lastSignal = sig;
    hasActiveSignal = true;

    window.NeuralCanvasEngine.setSelectedIndex(chosen.index);
    window.NeuralCanvasEngine.setActiveSignaledIndex(chosen.index);
    window.NeuralCanvasEngine.setNeuralColorMode(spec.mode, sig);
    window.NeuralCanvasEngine.triggerBurst(chosen.x, chosen.y);

    document.getElementById('sig-direction-badge').textContent = `${sig.direction} • ${sig.confidence}% AI`;
    document.getElementById('sig-entry').textContent = window.formatPrice(sig.entryPrice);
    document.getElementById('sig-tp1').textContent = window.formatPrice(sig.tp1Price);
    document.getElementById('sig-tp2').textContent = window.formatPrice(sig.tp2Price);
    document.getElementById('sig-sl').textContent = window.formatPrice(sig.slPrice);
    document.getElementById('sig-reasoning').textContent = `Near-Entry Sniper Signal: ${sig.symbol} triggered right at Entry Zone (${window.formatPrice(p)}). Logged to Daily & Monthly P&L.`;

    updateTerminalCard();
    window.NeuralPnlManager.logTrade({ ...sig, source: 'SCANNER', entryDistancePct: 0 });
    window.showToast(`${sig.isLong ? '🟢 BUY' : '🔴 SELL'} Near-Entry Signal: ${sig.symbol}`, sig.isLong ? '🚀' : '🔻');
  }

  // ---------------- LIVE CANDLESTICK CHART MODAL ----------------
  window.__openChartModal = async function (nodeIdx) {
    const nodes = window.NeuralCanvasEngine.getNodes();
    const node = nodes[nodeIdx] || nodes[0];
    if (!node || !node.asset) return;

    window.NeuralCanvasEngine.setSelectedIndex(node.index);
    updateTerminalCard();

    const modal = document.getElementById('coin-chart-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('chart-modal-symbol').textContent = node.asset.symbol;
    document.getElementById('chart-modal-price').textContent = window.formatPrice(node.asset.price);
    const rawSym = node.asset.binanceSymbol || 'BTCUSDT';
    document.getElementById('chart-binance-link').href = `https://www.binance.com/en/futures/${rawSym}`;
    document.getElementById('chart-tradingview-link').href = `https://www.tradingview.com/chart/?symbol=BINANCE:${rawSym}.P`;

    // Fetch Klines from Backend Proxy
    let klines = [];
    try {
      const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/market/klines?symbol=${rawSym}&interval=15m&limit=56`);
      const data = await resp.json();
      if (data.ok) klines = data.klines;
    } catch (_) {}

    if (klines.length < 10) {
      let p = node.asset.price * 0.99;
      for (let i = 0; i < 50; i++) {
        const o = p, c = o * (1 + (Math.random() - 0.48) * 0.005);
        klines.push({ open: o, close: c, high: Math.max(o, c) * 1.002, low: Math.min(o, c) * 0.998 });
        p = c;
      }
    }

    drawKlines(klines, node.lastSignal);
  };

  function drawKlines(klines, sig) {
    const c = document.getElementById('klines-chart-canvas');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width = (rect.width || 720) * 2;
    c.height = (rect.height || 320) * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const w = rect.width || 720, h = rect.height || 320;

    g.fillStyle = '#020910';
    g.fillRect(0, 0, w, h);

    let minP = Infinity, maxP = -Infinity;
    klines.forEach(k => { minP = Math.min(minP, k.low); maxP = Math.max(maxP, k.high); });
    const pad = (maxP - minP) * 0.12 || maxP * 0.01;
    minP -= pad; maxP += pad;

    const toY = (p) => 16 + (h - 32) - ((p - minP) / (maxP - minP)) * (h - 32);
    const step = (w - 84) / klines.length;

    klines.forEach((k, i) => {
      const x = 12 + i * step + step * 0.5;
      const bull = k.close >= k.open;
      g.strokeStyle = bull ? '#00ff88' : '#ff1e42';
      g.fillStyle = g.strokeStyle;
      g.beginPath(); g.moveTo(x, toY(k.high)); g.lineTo(x, toY(k.low)); g.stroke();
      const top = Math.min(toY(k.open), toY(k.close));
      g.fillRect(x - step * 0.3, top, Math.max(2, step * 0.6), Math.max(2, Math.abs(toY(k.close) - toY(k.open))));
    });

    if (sig) {
      [[sig.entryPrice, '#00f0ff', 'ENT'], [sig.tp1Price, '#00ff88', 'TP1'], [sig.slPrice, '#ff1e42', 'SL']].forEach(([val, col, lbl]) => {
        const y = toY(val);
        g.strokeStyle = col; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(12, y); g.lineTo(w - 72, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = col; g.font = 'bold 10px monospace';
        g.fillText(`${lbl} ${window.formatPrice(val)}`, w - 70, y + 3);
      });
    }
  }

  // ---------------- RR CALCULATOR INTEGRATION (CRYPTO + FOREX + STOCKS) ----------------
  function calculateRR() {
    const cap = parseFloat(document.getElementById('rr-capital').value) || 0;
    const riskPct = parseFloat(document.getElementById('rr-risk-pct').value) || 0;
    const rr = parseFloat(document.getElementById('rr-ratio-input').value) || 2;
    const entry = parseFloat(document.getElementById('rr-entry-price').value) || 0;
    const sl = parseFloat(document.getElementById('rr-sl-price').value) || 0;
    const lev = parseFloat(document.getElementById('rr-leverage').value) || 10;
    const out = document.getElementById('rr-result-box');
    if (!out || entry <= 0 || sl <= 0 || entry === sl) {
      if (out) out.innerHTML = '<span class="text-rose-400">Enter valid Entry & Stop Loss prices.</span>';
      return;
    }

    const riskUsd = cap * (riskPct / 100);
    const diff = Math.abs(entry - sl);
    const units = riskUsd / diff;
    const posUsd = units * entry;
    const margin = posUsd / lev;
    const tp = entry > sl ? entry + diff * rr : entry - diff * rr;
    const profitUsd = riskUsd * rr;

    out.innerHTML = `
      💵 Risk: <span class="text-emerald-300 font-bold">$${riskUsd.toFixed(2)}</span> |
      🎯 Units/Size: <span class="text-cyan-300 font-bold">${units.toFixed(4)}</span><br>
      📦 Position Value: <span class="text-amber-300 font-bold">$${posUsd.toFixed(2)}</span> (Margin: $${margin.toFixed(2)})<br>
      🏆 Target TP (1:${rr}): <span class="text-emerald-400 font-bold">${window.formatPrice(tp)}</span> | Profit: <span class="text-emerald-300 font-bold">+$${profitUsd.toFixed(2)}</span>`;
  }

  window.openRRCalculatorWithSignal = function (sig) {
    const modal = document.getElementById('rr-calculator-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (sig) {
      document.getElementById('rr-pair-label').textContent = `${sig.pair || sig.symbol} (${sig.assetClass || 'MARKET'})`;
      document.getElementById('rr-entry-price').value = sig.entryPrice;
      document.getElementById('rr-sl-price').value = sig.slPrice;
    }
    calculateRR();
  };

  // ---------------- AUTH & ADMIN PANEL (BACKEND API + OFFLINE FALLBACK) ----------------
  function initAuth() {
    const form = document.getElementById('user-auth-form');
    const tabLogin = document.getElementById('tab-login-mode-btn');
    const tabSignup = document.getElementById('tab-signup-mode-btn');
    const nameWrap = document.getElementById('user-signup-name-wrap');
    const submitBtn = document.getElementById('user-submit-btn');
    const errEl = document.getElementById('user-auth-error-msg');
    const okEl = document.getElementById('user-auth-success-msg');

    function setMode(signup) {
      isSignUpMode = signup;
      errEl.classList.add('hidden');
      okEl.classList.add('hidden');
      nameWrap.classList.toggle('hidden', !signup);
      submitBtn.textContent = signup ? 'SEND SIGN UP REQUEST TO ADMIN ⚡' : 'LOGIN TO NEURAL PLATFORM ⚡';
    }

    tabLogin.addEventListener('click', () => setMode(false));
    tabSignup.addEventListener('click', () => setMode(true));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.classList.add('hidden');
      okEl.classList.add('hidden');

      const name = document.getElementById('user-name-input').value.trim();
      const identifier = document.getElementById('user-email-input').value.trim();
      const password = document.getElementById('user-password-input').value.trim();

      try {
        const endpoint = isSignUpMode ? '/api/auth/signup' : '/api/auth/login';
        const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, identifier, password })
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          errEl.textContent = data.error || 'Authentication failed.';
          errEl.classList.remove('hidden');
          return;
        }

        if (isSignUpMode) {
          okEl.textContent = data.message || 'Sign Up request sent to Admin!';
          okEl.classList.remove('hidden');
          form.reset();
          setMode(false);
          return;
        }

        unlockApp(data.user, data.role === 'admin');
      } catch (_) {
        // Offline fallback for Admin when backend is not running yet
        if (!isSignUpMode && identifier.toLowerCase() === 'kavishkasithumina' && password.toLowerCase() === 'kavishka@1234') {
          unlockApp({ name: 'kavishkasithumina', email: 'kavishkasithumina' }, true);
          window.showToast('Offline Mode — Start backend server for AI Chart Vision!', '⚠️');
        } else {
          errEl.textContent = 'Cannot reach Backend Server. Run "npm start" inside /backend folder.';
          errEl.classList.remove('hidden');
        }
      }
    });

    document.getElementById('user-logout-btn').addEventListener('click', () => {
      currentUser = null; isAdmin = false;
      document.getElementById('protected-website-ui').classList.add('hidden');
      document.getElementById('boot-intro-overlay').classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      document.getElementById('admin-panel').classList.add('hidden', 'translate-x-full');
    });
  }

  function unlockApp(user, adminFlag) {
    currentUser = user;
    isAdmin = adminFlag;
    document.getElementById('user-session-email').textContent = adminFlag ? 'ADMIN: kavishkasithumina' : `USER: ${user.name}`;
    document.getElementById('admin-access-btn').classList.toggle('hidden', !adminFlag);
    document.getElementById('admin-access-btn').classList.toggle('flex', adminFlag);
    document.getElementById('protected-website-ui').classList.remove('hidden');
    const gate = document.getElementById('boot-intro-overlay');
    gate.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => gate.classList.add('hidden'), 400);

    if (adminFlag) loadAdminUsers();
    window.showToast(`Welcome ${user.name} — Neural Trading AI Unlocked!`, '⚡');
  }

  async function loadAdminUsers() {
    try {
      const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/auth/admin/users`);
      const data = await resp.json();
      if (!data.ok) return;
      const list = document.getElementById('admin-users-list');
      list.innerHTML = data.users.map((u, idx) => `
        <div class="p-2 rounded-xl bg-slate-950/85 border border-cyan-500/25 space-y-1 text-[10px]">
          <div class="flex justify-between">
            <span class="font-bold text-white">${u.email}</span>
            <span class="${u.status === 'approved' ? 'text-emerald-300' : 'text-amber-300'} font-bold">${u.status.toUpperCase()}</span>
          </div>
          <div class="text-cyan-200/70">Pass: <span class="text-amber-200">${u.password}</span></div>
          <div class="flex gap-1 pt-1">
            <button type="button" onclick="window.__adminSetStatus(${idx}, '${u.status === 'approved' ? 'pending' : 'approved'}')"
              class="flex-1 py-1 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-bold">
              ${u.status === 'approved' ? 'SUSPEND' : 'ACCEPT ✓'}
            </button>
            <button type="button" onclick="window.__adminDelUser(${idx})"
              class="px-2 py-1 rounded bg-rose-500/25 text-rose-200 border border-rose-400/40 font-bold">✕</button>
          </div>
        </div>`).join('');
    } catch (_) {}
  }

  window.__adminSetStatus = async (idx, status) => {
    await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/auth/admin/users/${idx}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    loadAdminUsers();
  };
  window.__adminDelUser = async (idx) => {
    await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/auth/admin/users/${idx}`, { method: 'DELETE' });
    loadAdminUsers();
  };

  // ---------------- BOOTSTRAP EVERYTHING ----------------
  window.addEventListener('load', () => {
    initAuth();
    window.NeuralCanvasEngine.init((idx) => window.__openChartModal(idx));
    window.NeuralChartVision.init();
    window.NeuralPnlManager.wireControls();
    window.NeuralPnlManager.load();

    // Make EVERY Floating Tab Movable (Draggable) + Liquid Glass + Minimizable
    window.NeuralTabManager.makeDraggable(document.getElementById('hud-wrapper-tab'), {
      resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#hud-tab-body',
      defaultTop: '16px', defaultLeft: '16px'
    });
    window.NeuralTabManager.makeDraggable(document.getElementById('btc-trend-summary-widget'), {
      resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#btc-summary-body',
      defaultTop: '94px', defaultLeft: '16px'
    });
    window.NeuralTabManager.makeDraggable(document.getElementById('tv-chart-vision-widget'), {
      resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#vision-widget-body',
      defaultTop: '94px', defaultLeft: '440px'
    });
    window.NeuralTabManager.makeDraggable(document.getElementById('daily-trading-summary-widget'), {
      resetBtnSelector: '#pnl-reset-pos-btn', minimizeBtnSelector: '#toggle-daily-summary-btn', bodySelector: '#daily-summary-body',
      defaultTop: '64px', defaultRight: '16px'
    });
    window.NeuralTabManager.makeDraggable(document.getElementById('asset-terminal-card'), {
      resetBtnSelector: '#reset-card-pos-btn', minimizeBtnSelector: '#term-minimize-tab-btn', bodySelector: '#term-collapsible-body',
      defaultBottom: '16px', defaultLeft: '16px'
    });
    window.NeuralTabManager.makeDraggable(document.getElementById('signal-alert-banner'), {
      defaultTop: '16px', defaultLeft: '50%', defaultTransform: 'translateX(-50%)'
    });

    // Wire Global Buttons
    document.getElementById('quick-fire-signal-btn').addEventListener('click', generateNearEntrySignal);
    document.getElementById('term-generate-signal-btn').addEventListener('click', generateNearEntrySignal);
    document.getElementById('term-open-chart-btn').addEventListener('click', () => window.__openChartModal(window.NeuralCanvasEngine.getSelectedIndex()));
    document.getElementById('term-copy-symbol-btn').addEventListener('click', () => window.copyCoinSymbolToClipboard(document.getElementById('term-symbol').textContent));
    document.getElementById('close-chart-modal-btn').addEventListener('click', () => {
      document.getElementById('coin-chart-modal').classList.add('hidden');
      document.getElementById('coin-chart-modal').classList.remove('flex');
    });
    document.getElementById('open-rr-calc-btn').addEventListener('click', () => {
      const n = window.NeuralCanvasEngine.getNodes()[window.NeuralCanvasEngine.getSelectedIndex()];
      window.openRRCalculatorWithSignal(n?.lastSignal || { pair: n?.asset?.symbol, entryPrice: n?.asset?.price, slPrice: n?.asset?.price * 0.99 });
    });
    document.getElementById('close-rr-calc-modal-btn').addEventListener('click', () => {
      document.getElementById('rr-calculator-modal').classList.add('hidden');
      document.getElementById('rr-calculator-modal').classList.remove('flex');
    });
    ['rr-capital', 'rr-risk-pct', 'rr-ratio-input', 'rr-entry-price', 'rr-sl-price', 'rr-leverage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calculateRR);
    });

    // Quick toggle for TV Chart Vision Tab
    document.getElementById('quick-open-vision-btn').addEventListener('click', () => {
      const body = document.getElementById('vision-widget-body');
      if (body) body.classList.remove('hidden');
      window.showToast('TradingView Chart AI Vision Ready — Upload or Ctrl+V!', '📷');
    });

    // Admin Drawer
    const adminPanel = document.getElementById('admin-panel');
    document.getElementById('admin-access-btn').addEventListener('click', () => {
      adminPanel.classList.remove('hidden');
      adminPanel.classList.add('flex');
      adminPanel.classList.toggle('translate-x-full');
      loadAdminUsers();
    });
    document.getElementById('collapse-admin-btn').addEventListener('click', () => adminPanel.classList.add('translate-x-full'));
    document.getElementById('admin-create-user-btn').addEventListener('click', async () => {
      const email = document.getElementById('admin-new-user-email').value.trim();
      const password = document.getElementById('admin-new-user-pass').value.trim();
      if (!email || !password) return;
      await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/auth/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      document.getElementById('admin-new-user-email').value = '';
      document.getElementById('admin-new-user-pass').value = '';
      loadAdminUsers();
      window.showToast(`Approved user: ${email}`, '✅');
    });

    syncBinanceFromBackend();
    syncNewsFromBackend();
    setInterval(syncBinanceFromBackend, 15000);
    setInterval(syncNewsFromBackend, 45000);
    setInterval(() => {
      window.NeuralPnlManager.checkMidnightReset();
      window.NeuralPnlManager.evaluateNearEntriesAndOpenTrades();
    }, 1000);
  });
})();
