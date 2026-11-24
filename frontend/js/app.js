/**
 * MAIN FRONTEND APPLICATION CONTROLLER
 * Includes: True Real-Time Binance Vision Prices, 15m Structure Signals,
 * Pro Admin Command Center, 10 Full-Transform Trading Themes, and Crypto Bubbles Engine.
 */
(function () {
  let currentUser = null;
  let isAdmin = false;
  let isSignUpMode = false;
  let hasActiveSignal = false;
  let recentSymbols = [];
  let autoSignalTimer = null;

  const THEME_STORAGE_KEY = 'neural_ai_active_theme';
  const SETTINGS_STORAGE_KEY = 'neural_admin_global_settings';

  const DEFAULT_ADMIN_SETTINGS = {
    announcement: '',
    announcementType: 'gold',
    minConfidence: 75,
    rrMode: 'balanced',
    directionFilter: 'both',
    signalsPaused: false,
    autoSignalSec: 0,
    defaultLeverage: 10,
    glassOpacity: 88,
    showFloatingThemeBtn: true
  };

  function loadAdminSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
      return { ...DEFAULT_ADMIN_SETTINGS, ...saved };
    } catch (_) {
      return { ...DEFAULT_ADMIN_SETTINGS };
    }
  }

  function saveAdminSettings(patch) {
    const merged = { ...loadAdminSettings(), ...patch };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    window.NEURAL_ADMIN_SETTINGS = merged;
    applyAdminVisualSettings(merged);
    setupAutoSignalTimer(merged.autoSignalSec);
    return merged;
  }

  window.NEURAL_ADMIN_SETTINGS = loadAdminSettings();

  const on = (id, ev, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  };

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
    const textEl = document.getElementById('toast-text');
    const iconEl = document.getElementById('toast-icon');
    if (textEl) textEl.textContent = msg;
    if (iconEl) iconEl.textContent = icon;
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

  function normalizeSymbolKey(asset) {
    if (!asset) return '';
    if (asset.binanceSymbol) return String(asset.binanceSymbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const clean = String(asset.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return clean.endsWith('USDT') ? clean : `${clean.replace(/USD$/, '')}USDT`;
  }

  // =========================================================================
  // 10 PRO FULL-TRANSFORM TRADING THEMES + CRYPTO BUBBLES ENGINE
  // =========================================================================
  let activeTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'neural_default';
  let bubbleCanvas = null;
  let bubbleCtx = null;
  let bubbleRaf = null;
  let bubbles = [];
  let hoveredBubbleIdx = -1;

  const THEMES = [
    {
      id: 'neural_default',
      name: '🧠 Neural Cortex',
      desc: 'Default Cyan Glass',
      badge: '#22d3ee',
      isBubbles: false,
      css: `
        body[data-neural-theme="neural_default"] #neural-canvas { filter: none !important; }
      `
    },
    {
      id: 'crypto_bubbles',
      name: '🫧 Crypto Bubbles',
      desc: 'Live 3D Physics',
      badge: '#34d399',
      isBubbles: true,
      css: `
        body[data-neural-theme="crypto_bubbles"] {
          background: radial-gradient(circle at 50% 35%, #07192b 0%, #02060c 100%) !important;
        }
      `
    },
    {
      id: 'bloomberg_pro',
      name: '🟧 Bloomberg Pro',
      desc: 'Amber Desk Terminal',
      badge: '#ff8c00',
      isBubbles: false,
      css: `
        body[data-neural-theme="bloomberg_pro"] {
          background-color: #050505 !important;
          background-image:
            linear-gradient(rgba(255, 140, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 140, 0, 0.05) 1px, transparent 1px) !important;
          background-size: 32px 32px !important;
        }
        body[data-neural-theme="bloomberg_pro"] #neural-canvas {
          filter: hue-rotate(175deg) saturate(1.85) brightness(0.9) !important;
        }
        body[data-neural-theme="bloomberg_pro"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="bloomberg_pro"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="bloomberg_pro"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="bloomberg_pro"] #coin-chart-modal > div,
        body[data-neural-theme="bloomberg_pro"] #rr-calculator-modal > div {
          background: rgba(10, 10, 10, var(--neural-glass-alpha, 0.94)) !important;
          border: 1px solid rgba(255, 140, 0, 0.65) !important;
          border-radius: 6px !important;
          box-shadow: 0 0 24px rgba(255, 140, 0, 0.16) !important;
        }
        body[data-neural-theme="bloomberg_pro"] #protected-website-ui [class*="text-cyan"] {
          color: #ffb347 !important;
        }
        body[data-neural-theme="bloomberg_pro"] #protected-website-ui [class*="border-cyan"] {
          border-color: rgba(255, 140, 0, 0.45) !important;
        }
        body[data-neural-theme="bloomberg_pro"] #quick-fire-signal-btn,
        body[data-neural-theme="bloomberg_pro"] #term-generate-signal-btn {
          background: linear-gradient(90deg, #ff7b00, #ffb700) !important;
          color: #050505 !important;
          font-weight: 900 !important;
        }
      `
    },
    {
      id: 'tradingview_dark',
      name: '📊 TradingView Dark',
      desc: 'Authentic TV Slate',
      badge: '#2962ff',
      isBubbles: false,
      css: `
        body[data-neural-theme="tradingview_dark"] {
          background: #131722 !important;
        }
        body[data-neural-theme="tradingview_dark"] #neural-canvas {
          filter: hue-rotate(25deg) saturate(1.15) brightness(0.75) !important;
        }
        body[data-neural-theme="tradingview_dark"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="tradingview_dark"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="tradingview_dark"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="tradingview_dark"] #coin-chart-modal > div,
        body[data-neural-theme="tradingview_dark"] #rr-calculator-modal > div {
          background: rgba(30, 34, 45, var(--neural-glass-alpha, 0.94)) !important;
          border: 1px solid #2a2e39 !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55) !important;
        }
        body[data-neural-theme="tradingview_dark"] #protected-website-ui [class*="text-cyan"] {
          color: #5b9cf6 !important;
        }
        body[data-neural-theme="tradingview_dark"] #quick-fire-signal-btn,
        body[data-neural-theme="tradingview_dark"] #term-generate-signal-btn {
          background: #2962ff !important;
          color: #ffffff !important;
          border-color: #2962ff !important;
        }
      `
    },
    {
      id: 'apple_frost_light',
      name: '☀️ VisionOS Light',
      desc: 'Clean Bright Glass',
      badge: '#38bdf8',
      isBubbles: false,
      css: `
        body[data-neural-theme="apple_frost_light"] {
          background: linear-gradient(135deg, #e2ecf7 0%, #f4f7fb 50%, #dce8f5 100%) !important;
          color: #0f172a !important;
        }
        body[data-neural-theme="apple_frost_light"] #neural-canvas {
          filter: invert(0.92) hue-rotate(180deg) saturate(1.4) opacity(0.38) !important;
        }
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="apple_frost_light"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="apple_frost_light"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(255, 255, 255, 0.80) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(15, 23, 42, 0.14) !important;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12) !important;
          color: #0f172a !important;
        }
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [id$="-widget"] *,
        body[data-neural-theme="apple_frost_light"] #protected-website-ui #asset-terminal-card *,
        body[data-neural-theme="apple_frost_light"] #protected-website-ui #hud-wrapper-tab * {
          color: #0f172a !important;
        }
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [class*="bg-slate-950"],
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [class*="bg-slate-900"] {
          background: rgba(241, 245, 249, 0.92) !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
        }
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [class*="text-emerald"] {
          color: #059669 !important;
        }
        body[data-neural-theme="apple_frost_light"] #protected-website-ui [class*="text-rose"] {
          color: #e11d48 !important;
        }
      `
    },
    {
      id: 'phantom_oled',
      name: '🖤 Phantom OLED',
      desc: 'Pure Black & Silver',
      badge: '#e2e8f0',
      isBubbles: false,
      css: `
        body[data-neural-theme="phantom_oled"] {
          background: #000000 !important;
        }
        body[data-neural-theme="phantom_oled"] #neural-canvas {
          filter: grayscale(1) contrast(1.25) brightness(0.75) !important;
        }
        body[data-neural-theme="phantom_oled"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="phantom_oled"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="phantom_oled"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="phantom_oled"] #coin-chart-modal > div,
        body[data-neural-theme="phantom_oled"] #rr-calculator-modal > div {
          background: rgba(8, 8, 10, var(--neural-glass-alpha, 0.94)) !important;
          border: 1px solid rgba(255, 255, 255, 0.24) !important;
          box-shadow: 0 0 24px rgba(255, 255, 255, 0.06) !important;
        }
        body[data-neural-theme="phantom_oled"] #protected-website-ui [class*="text-cyan"] {
          color: #e2e8f0 !important;
        }
        body[data-neural-theme="phantom_oled"] #protected-website-ui [class*="border-cyan"] {
          border-color: rgba(255, 255, 255, 0.22) !important;
        }
      `
    },
    {
      id: 'wallst_quant',
      name: '🏛️ Wall St. Quant',
      desc: 'Obsidian & Emerald',
      badge: '#10b981',
      isBubbles: false,
      css: `
        body[data-neural-theme="wallst_quant"] {
          background-color: #020b07 !important;
          background-image:
            radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 60%),
            linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px) !important;
          background-size: 100% 100%, 40px 40px, 40px 40px !important;
        }
        body[data-neural-theme="wallst_quant"] #neural-canvas {
          filter: hue-rotate(-45deg) saturate(1.6) brightness(0.92) !important;
        }
        body[data-neural-theme="wallst_quant"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="wallst_quant"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="wallst_quant"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="wallst_quant"] #coin-chart-modal > div {
          background: rgba(3, 20, 13, var(--neural-glass-alpha, 0.9)) !important;
          border: 1px solid rgba(16, 185, 129, 0.6) !important;
          box-shadow: 0 0 26px rgba(16, 185, 129, 0.20) !important;
        }
        body[data-neural-theme="wallst_quant"] #protected-website-ui [class*="text-cyan"] {
          color: #6ee7b7 !important;
        }
      `
    },
    {
      id: 'tokyo_drift',
      name: '⛩️ Tokyo Drift',
      desc: 'Cyber Pink & Indigo',
      badge: '#f43f5e',
      isBubbles: false,
      css: `
        body[data-neural-theme="tokyo_drift"] {
          background-color: #090314 !important;
          background-image:
            radial-gradient(circle at 18% 18%, rgba(236, 72, 153, 0.28) 0%, transparent 48%),
            radial-gradient(circle at 82% 82%, rgba(34, 211, 238, 0.22) 0%, transparent 50%),
            linear-gradient(rgba(236, 72, 153, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px) !important;
          background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px !important;
        }
        body[data-neural-theme="tokyo_drift"] #neural-canvas {
          filter: hue-rotate(108deg) saturate(2.1) brightness(1.05) !important;
        }
        body[data-neural-theme="tokyo_drift"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="tokyo_drift"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="tokyo_drift"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="tokyo_drift"] #coin-chart-modal > div {
          background: rgba(18, 6, 34, var(--neural-glass-alpha, 0.88)) !important;
          border: 1px solid rgba(236, 72, 153, 0.72) !important;
          box-shadow: 0 0 28px rgba(236, 72, 153, 0.26), inset 0 0 14px rgba(34, 211, 238, 0.14) !important;
        }
        body[data-neural-theme="tokyo_drift"] #protected-website-ui [class*="text-cyan"] {
          color: #f9a8d4 !important;
        }
      `
    },
    {
      id: 'dubai_gold',
      name: '👑 Dubai Gold',
      desc: 'Luxury Black & Gold',
      badge: '#fbbf24',
      isBubbles: false,
      css: `
        body[data-neural-theme="dubai_gold"] {
          background: radial-gradient(circle at 50% 15%, #2b1e06 0%, #090703 65%, #030201 100%) !important;
        }
        body[data-neural-theme="dubai_gold"] #neural-canvas {
          filter: hue-rotate(192deg) saturate(1.75) brightness(0.95) !important;
        }
        body[data-neural-theme="dubai_gold"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="dubai_gold"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="dubai_gold"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="dubai_gold"] #coin-chart-modal > div {
          background: rgba(20, 15, 5, var(--neural-glass-alpha, 0.90)) !important;
          border: 1px solid rgba(251, 191, 36, 0.68) !important;
          box-shadow: 0 0 28px rgba(245, 158, 11, 0.24), inset 0 0 12px rgba(253, 224, 71, 0.10) !important;
        }
        body[data-neural-theme="dubai_gold"] #protected-website-ui [class*="text-cyan"] {
          color: #fde68a !important;
        }
        body[data-neural-theme="dubai_gold"] #protected-website-ui [class*="border-cyan"] {
          border-color: rgba(251, 191, 36, 0.45) !important;
        }
      `
    },
    {
      id: 'eclipse_crimson',
      name: '🌋 Eclipse Crimson',
      desc: 'Volcanic Dark Red',
      badge: '#ef4444',
      isBubbles: false,
      css: `
        body[data-neural-theme="eclipse_crimson"] {
          background: radial-gradient(circle at 50% 25%, #380710 0%, #0c0204 70%, #040102 100%) !important;
        }
        body[data-neural-theme="eclipse_crimson"] #neural-canvas {
          filter: hue-rotate(148deg) saturate(2.2) brightness(0.92) !important;
        }
        body[data-neural-theme="eclipse_crimson"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="eclipse_crimson"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="eclipse_crimson"] #protected-website-ui #hud-wrapper-tab,
        body[data-neural-theme="eclipse_crimson"] #coin-chart-modal > div {
          background: rgba(26, 5, 9, var(--neural-glass-alpha, 0.90)) !important;
          border: 1px solid rgba(239, 68, 68, 0.72) !important;
          box-shadow: 0 0 28px rgba(239, 68, 68, 0.28), inset 0 0 12px rgba(251, 146, 60, 0.12) !important;
        }
        body[data-neural-theme="eclipse_crimson"] #protected-website-ui [class*="text-cyan"] {
          color: #fca5a5 !important;
        }
        body[data-neural-theme="eclipse_crimson"] #protected-website-ui [class*="border-cyan"] {
          border-color: rgba(239, 68, 68, 0.45) !important;
        }
      `
    }
  ];

  function injectThemeCss() {
    let style = document.getElementById('neural-builtin-themes-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'neural-builtin-themes-css';
      document.head.appendChild(style);
    }
    style.textContent = THEMES.map(t => t.css).join('\n');
  }

  function startCryptoBubbles() {
    const neuralCanvas = document.getElementById('neural-canvas');
    if (neuralCanvas) neuralCanvas.style.opacity = '0.06';

    if (!bubbleCanvas) {
      bubbleCanvas = document.createElement('canvas');
      bubbleCanvas.id = 'crypto-bubbles-canvas';
      bubbleCanvas.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; z-index:2; cursor:pointer;';
      document.body.appendChild(bubbleCanvas);
      bubbleCtx = bubbleCanvas.getContext('2d');

      bubbleCanvas.addEventListener('mousemove', (e) => {
        const rect = bubbleCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        hoveredBubbleIdx = -1;
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          if (Math.hypot(mx - b.x, my - b.y) <= b.r) { hoveredBubbleIdx = i; break; }
        }
        bubbleCanvas.style.cursor = hoveredBubbleIdx !== -1 ? 'pointer' : 'default';
      });

      bubbleCanvas.addEventListener('click', () => {
        if (hoveredBubbleIdx !== -1 && bubbles[hoveredBubbleIdx] && window.__openChartModal) {
          window.__openChartModal(bubbles[hoveredBubbleIdx].nodeIdx);
        }
      });
    }

    bubbleCanvas.style.display = 'block';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bubbleCanvas.width = window.innerWidth * dpr;
    bubbleCanvas.height = window.innerHeight * dpr;
    bubbleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes().filter(n => n.asset) : [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    bubbles = nodes.map(n => {
      const chg = Number(n.asset.change || 0);
      const r = Math.max(30, Math.min(72, 34 + Math.abs(chg) * 3.8 + (n.isCore ? 8 : 0)));
      return {
        nodeIdx: n.index,
        asset: n.asset,
        x: 110 + Math.random() * Math.max(220, w - 220),
        y: 110 + Math.random() * Math.max(220, h - 220),
        vx: (Math.random() - 0.5) * 0.85,
        vy: (Math.random() - 0.5) * 0.85,
        r, targetR: r, phase: Math.random() * Math.PI * 2
      };
    });

    const render = () => {
      if (activeTheme !== 'crypto_bubbles') return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      bubbleCtx.clearRect(0, 0, vw, vh);

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const chg = Number(b.asset.change || 0);
        b.targetR = Math.max(30, Math.min(74, 34 + Math.abs(chg) * 3.8 + (b.nodeIdx < 12 ? 7 : 0)));
        b.r += (b.targetR - b.r) * 0.05;
        b.phase += 0.015;
        b.x += b.vx + Math.sin(b.phase) * 0.14;
        b.y += b.vy + Math.cos(b.phase) * 0.14;

        if (b.x - b.r < 12) { b.x = b.r + 12; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > vw - 12) { b.x = vw - b.r - 12; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 72) { b.y = b.r + 72; b.vy = Math.abs(b.vy); }
        if (b.y + b.r > vh - 18) { b.y = vh - b.r - 18; b.vy = -Math.abs(b.vy); }

        for (let j = i + 1; j < bubbles.length; j++) {
          const o = bubbles[j];
          const dx = o.x - b.x;
          const dy = o.y - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = b.r + o.r + 6;
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.03;
            const nx = dx / dist;
            const ny = dy / dist;
            b.x -= nx * overlap; b.y -= ny * overlap;
            o.x += nx * overlap; o.y += ny * overlap;
          }
        }
      }

      bubbles.forEach((b, idx) => {
        const chg = Number(b.asset.change || 0);
        const isPos = chg >= 0;
        const isHover = idx === hoveredBubbleIdx;
        const r = isHover ? b.r * 1.08 : b.r;

        const grad = bubbleCtx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
        if (isPos) {
          grad.addColorStop(0, 'rgba(52, 211, 153, 0.55)');
          grad.addColorStop(0.65, 'rgba(16, 185, 129, 0.24)');
          grad.addColorStop(1, 'rgba(5, 150, 105, 0.72)');
        } else {
          grad.addColorStop(0, 'rgba(251, 113, 133, 0.55)');
          grad.addColorStop(0.65, 'rgba(244, 63, 94, 0.24)');
          grad.addColorStop(1, 'rgba(225, 29, 72, 0.72)');
        }

        bubbleCtx.beginPath();
        bubbleCtx.arc(b.x, b.y, r, 0, Math.PI * 2);
        bubbleCtx.fillStyle = grad;
        bubbleCtx.fill();
        bubbleCtx.lineWidth = isHover ? 2.5 : 1.5;
        bubbleCtx.strokeStyle = isPos ? 'rgba(52, 211, 153, 0.95)' : 'rgba(251, 113, 133, 0.95)';
        bubbleCtx.stroke();

        const shortSym = String(b.asset.symbol || '').replace('/USDT', '').replace('/USD', '');
        bubbleCtx.fillStyle = '#ffffff';
        bubbleCtx.textAlign = 'center';
        bubbleCtx.textBaseline = 'middle';
        bubbleCtx.font = `800 ${Math.max(10, Math.floor(r * 0.28))}px "JetBrains Mono", sans-serif`;
        bubbleCtx.fillText(shortSym, b.x, b.y - r * 0.16);

        bubbleCtx.font = `700 ${Math.max(9, Math.floor(r * 0.22))}px "JetBrains Mono", monospace`;
        bubbleCtx.fillStyle = isPos ? '#a7f3d0' : '#fecdd3';
        bubbleCtx.fillText(`${isPos ? '+' : ''}${chg.toFixed(2)}%`, b.x, b.y + r * 0.18);

        if (r >= 46) {
          bubbleCtx.font = `600 ${Math.max(8, Math.floor(r * 0.16))}px "JetBrains Mono", monospace`;
          bubbleCtx.fillStyle = 'rgba(226, 232, 240, 0.84)';
          bubbleCtx.fillText(window.formatPrice(b.asset.price), b.x, b.y + r * 0.45);
        }
      });

      bubbleRaf = requestAnimationFrame(render);
    };

    if (bubbleRaf) cancelAnimationFrame(bubbleRaf);
    bubbleRaf = requestAnimationFrame(render);
  }

  function stopCryptoBubbles() {
    if (bubbleRaf) { cancelAnimationFrame(bubbleRaf); bubbleRaf = null; }
    if (bubbleCanvas) bubbleCanvas.style.display = 'none';
    const neuralCanvas = document.getElementById('neural-canvas');
    if (neuralCanvas) neuralCanvas.style.opacity = '1';
  }

  function applyTheme(themeId, silent = false) {
    const found = THEMES.find(t => t.id === themeId) || THEMES[0];
    activeTheme = found.id;
    localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    document.body.setAttribute('data-neural-theme', activeTheme);

    if (found.isBubbles) startCryptoBubbles();
    else stopCryptoBubbles();

    document.querySelectorAll('.neural-theme-choice-btn').forEach(btn => {
      const isAct = btn.dataset.themeId === activeTheme;
      btn.style.borderColor = isAct ? found.badge : 'rgba(148,163,184,0.28)';
      btn.style.background = isAct ? 'rgba(30,41,59,0.98)' : 'rgba(15,23,42,0.82)';
      btn.style.boxShadow = isAct ? `0 0 12px ${found.badge}55` : 'none';
    });

    const lbl = document.getElementById('admin-hub-active-theme');
    if (lbl) lbl.textContent = found.name;

    if (!silent) window.showToast(`Theme Applied: ${found.name}`, '🎨');
  }

  window.NeuralThemeManager = { applyTheme, getActiveTheme: () => activeTheme };

  // =========================================================================
  // BROADCAST BANNER & VISUAL ADMIN SETTINGS
  // =========================================================================
  function renderBroadcastBanner(message, type = 'gold') {
    let banner = document.getElementById('neural-admin-broadcast-banner');
    const clean = String(message || '').trim();
    if (!clean) {
      if (banner) banner.remove();
      return;
    }

    const styles = {
      gold:  { border: 'rgba(251,191,36,0.75)', color: '#fef08a', bg: 'linear-gradient(90deg, rgba(24,18,5,0.96), rgba(40,26,6,0.96))', icon: '📢' },
      red:   { border: 'rgba(244,63,94,0.85)',  color: '#fecdd3', bg: 'linear-gradient(90deg, rgba(40,6,14,0.96), rgba(60,8,20,0.96))', icon: '🚨' },
      green: { border: 'rgba(16,185,129,0.8)',  color: '#a7f3d0', bg: 'linear-gradient(90deg, rgba(4,30,18,0.96), rgba(6,45,28,0.96))', icon: '🟢' },
      cyan:  { border: 'rgba(34,211,238,0.8)',  color: '#cffafe', bg: 'linear-gradient(90deg, rgba(6,24,38,0.96), rgba(8,36,52,0.96))', icon: '⚡' }
    };
    const st = styles[type] || styles.gold;

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'neural-admin-broadcast-banner';
      document.body.appendChild(banner);
    }
    banner.style.cssText = [
      'position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9980', 'max-width:90vw', 'padding:7px 16px', 'border-radius:999px',
      `background:${st.bg}`, `border:1px solid ${st.border}`, `color:${st.color}`,
      'font-family:"JetBrains Mono",monospace', 'font-size:11px', 'font-weight:800',
      'box-shadow:0 6px 24px rgba(0,0,0,0.65)', 'backdrop-filter:blur(10px)',
      'display:flex', 'align-items:center', 'gap:8px'
    ].join(';');
    banner.innerHTML = `<span>${st.icon}</span><span>${clean.replace(/</g, '&lt;')}</span>`;
  }

  function applyAdminVisualSettings(s) {
    document.documentElement.style.setProperty('--neural-glass-alpha', ((Number(s.glassOpacity) || 88) / 100).toFixed(2));
    renderBroadcastBanner(s.announcement, s.announcementType);
    const levEl = document.getElementById('rr-leverage');
    if (levEl && s.defaultLeverage) levEl.value = s.defaultLeverage;
    const floatBtn = document.getElementById('admin-quick-theme-pill');
    if (floatBtn) {
      floatBtn.style.display = (isAdmin && s.showFloatingThemeBtn) ? 'flex' : 'none';
    }
  }

  function setupAutoSignalTimer(sec) {
    if (autoSignalTimer) { clearInterval(autoSignalTimer); autoSignalTimer = null; }
    const s = Number(sec) || 0;
    if (s >= 60) {
      autoSignalTimer = setInterval(() => {
        if (!window.NEURAL_ADMIN_SETTINGS?.signalsPaused && currentUser) {
          generateNearEntrySignal();
        }
      }, s * 1000);
    }
  }

  // =========================================================================
  // UNIFIED ADMIN COMMAND CENTER (INJECTED DIRECTLY INSIDE #admin-panel)
  // =========================================================================
  function mountAdminCommandCenter() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel) return;

    ['admin-theme-switcher-box', 'admin-themes-section', 'admin-pro-controls-box'].forEach(oldId => {
      const el = document.getElementById(oldId);
      if (el) el.remove();
    });

    adminPanel.style.overflowY = 'auto';

    if (document.getElementById('admin-pro-hub')) return;

    const s = loadAdminSettings();
    const hub = document.createElement('div');
    hub.id = 'admin-pro-hub';
    hub.style.cssText = [
      'flex-shrink:0', 'width:100%', 'display:block', 'margin:8px 0 12px 0',
      'padding:10px', 'border-radius:12px',
      'background:rgba(2, 6, 23, 0.96)',
      'border:1px solid rgba(34, 211, 238, 0.5)',
      'box-shadow:0 0 18px rgba(34, 211, 238, 0.14)',
      'font-family:"JetBrains Mono", monospace'
    ].join(';');

    hub.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:10px; font-weight:800; color:#67e8f9; letter-spacing:0.05em;">👑 ADMIN COMMAND CENTER</span>
        <span id="admin-hub-api-status" style="font-size:9px; font-weight:800; color:#34d399;">● LIVE</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; margin-bottom:10px;">
        <button type="button" class="admin-hub-tab-btn" data-tab="themes"
          style="padding:6px 4px; border-radius:7px; font-size:9px; font-weight:800; cursor:pointer; border:1px solid #22d3ee; background:rgba(34,211,238,0.22); color:#ecfeff;">🎨 THEMES</button>
        <button type="button" class="admin-hub-tab-btn" data-tab="signals"
          style="padding:6px 4px; border-radius:7px; font-size:9px; font-weight:800; cursor:pointer; border:1px solid rgba(148,163,184,0.25); background:rgba(15,23,42,0.85); color:#94a3b8;">🎯 SIGNALS</button>
        <button type="button" class="admin-hub-tab-btn" data-tab="system"
          style="padding:6px 4px; border-radius:7px; font-size:9px; font-weight:800; cursor:pointer; border:1px solid rgba(148,163,184,0.25); background:rgba(15,23,42,0.85); color:#94a3b8;">📢 SYSTEM</button>
      </div>

      <!-- TAB 1: PRO THEMES (10) -->
      <div id="admin-hub-pane-themes" style="display:block;">
        <div style="font-size:9px; color:#94a3b8; margin-bottom:6px;">
          Active Theme: <span id="admin-hub-active-theme" style="color:#34d399; font-weight:800;">-</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
          ${THEMES.map(t => `
            <button type="button" class="neural-theme-choice-btn" data-theme-id="${t.id}"
              style="text-align:left; padding:7px; border-radius:8px; border:1px solid rgba(148,163,184,0.28); background:rgba(15,23,42,0.82); cursor:pointer;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:3px;">
                <span style="font-size:9.5px; font-weight:800; color:#ffffff;">${t.name}</span>
                <span style="width:7px; height:7px; border-radius:999px; background:${t.badge}; flex-shrink:0;"></span>
              </div>
              <div style="font-size:8px; color:#94a3b8; margin-top:2px;">${t.desc}</div>
            </button>
          `).join('')}
        </div>

        <div style="padding-top:8px; border-top:1px solid rgba(56,189,248,0.18); display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#cbd5e1;">
            <span>🪟 Panel Opacity</span>
            <span id="admin-glass-opacity-val" style="color:#38bdf8; font-weight:800;">${s.glassOpacity}%</span>
          </div>
          <input id="admin-glass-opacity-slider" type="range" min="45" max="98" value="${s.glassOpacity}" style="width:100%; accent-color:#22d3ee;" />

          <label style="display:flex; align-items:center; justify-content:space-between; font-size:9px; color:#cbd5e1; cursor:pointer;">
            <span>Show Floating 🎨 Button</span>
            <input id="admin-float-btn-toggle" type="checkbox" ${s.showFloatingThemeBtn ? 'checked' : ''} style="accent-color:#22d3ee;" />
          </label>
        </div>
      </div>

      <!-- TAB 2: SIGNALS ENGINE -->
      <div id="admin-hub-pane-signals" style="display:none; flex-direction:column; gap:8px;">
        <button id="admin-sig-pause-btn" type="button"
          style="width:100%; padding:7px; border-radius:8px; font-size:9.5px; font-weight:800; cursor:pointer; border:1px solid ${s.signalsPaused ? 'rgba(244,63,94,0.7)' : 'rgba(16,185,129,0.65)'}; background:${s.signalsPaused ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}; color:${s.signalsPaused ? '#fda4af' : '#6ee7b7'};">
          ${s.signalsPaused ? '⏸️ SIGNALS PAUSED (RESUME)' : '▶️ SIGNALS ACTIVE (PAUSE)'}
        </button>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:9px; color:#94a3b8;">🧭 DIRECTION FILTER</span>
          <select id="admin-dir-filter" style="padding:4px 6px; border-radius:6px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:9px; font-weight:700;">
            <option value="both" ${s.directionFilter === 'both' ? 'selected' : ''}>BOTH (LONG + SHORT)</option>
            <option value="long_only" ${s.directionFilter === 'long_only' ? 'selected' : ''}>LONG ONLY 🟢</option>
            <option value="short_only" ${s.directionFilter === 'short_only' ? 'selected' : ''}>SHORT ONLY 🔴</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:9px; color:#94a3b8;">⚖️ R:R TARGET MODE</span>
          <select id="admin-rr-mode" style="padding:4px 6px; border-radius:6px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:9px; font-weight:700;">
            <option value="conservative" ${s.rrMode === 'conservative' ? 'selected' : ''}>Conservative (1:1.8)</option>
            <option value="balanced" ${s.rrMode === 'balanced' ? 'selected' : ''}>Balanced (1:2.8)</option>
            <option value="sniper" ${s.rrMode === 'sniper' ? 'selected' : ''}>Sniper Max (1:4.2)</option>
          </select>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; margin-bottom:2px;">
            <span>🎯 MIN AI CONFIDENCE</span>
            <span id="admin-min-conf-val" style="color:#34d399; font-weight:800;">${s.minConfidence}%</span>
          </div>
          <input id="admin-min-conf-slider" type="range" min="60" max="95" step="5" value="${s.minConfidence}" style="width:100%; accent-color:#22d3ee;" />
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:9px; color:#94a3b8;">⏱️ AUTO-SIGNAL RADAR</span>
          <select id="admin-auto-sig" style="padding:4px 6px; border-radius:6px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:9px; font-weight:700;">
            <option value="0" ${Number(s.autoSignalSec) === 0 ? 'selected' : ''}>Manual Only</option>
            <option value="60" ${Number(s.autoSignalSec) === 60 ? 'selected' : ''}>Every 1 Min</option>
            <option value="180" ${Number(s.autoSignalSec) === 180 ? 'selected' : ''}>Every 3 Min</option>
            <option value="300" ${Number(s.autoSignalSec) === 300 ? 'selected' : ''}>Every 5 Min</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:9px; color:#94a3b8;">⚡ DEFAULT LEVERAGE</span>
          <select id="admin-def-lev" style="padding:4px 6px; border-radius:6px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:9px; font-weight:700;">
            <option value="5" ${Number(s.defaultLeverage) === 5 ? 'selected' : ''}>5x Safe</option>
            <option value="10" ${Number(s.defaultLeverage) === 10 ? 'selected' : ''}>10x Standard</option>
            <option value="20" ${Number(s.defaultLeverage) === 20 ? 'selected' : ''}>20x Pro</option>
            <option value="50" ${Number(s.defaultLeverage) === 50 ? 'selected' : ''}>50x High Risk</option>
          </select>
        </div>

        <button id="admin-force-signal-btn" type="button"
          style="width:100%; padding:8px; border-radius:8px; background:rgba(34,211,238,0.22); border:1px solid rgba(34,211,238,0.7); color:#ecfeff; font-size:10px; font-weight:800; cursor:pointer;">
          ⚡ FIRE LIVE SIGNAL NOW
        </button>
      </div>

      <!-- TAB 3: SYSTEM & BROADCAST -->
      <div id="admin-hub-pane-system" style="display:none; flex-direction:column; gap:8px;">
        <div style="display:flex; flex-direction:column; gap:5px;">
          <span style="font-size:9px; color:#94a3b8; font-weight:700;">📢 GLOBAL ANNOUNCEMENT BANNER</span>
          <input id="admin-bc-input" type="text" placeholder="e.g. FOMC News in 10m — Trade Safe!"
            value="${String(s.announcement || '').replace(/"/g, '&quot;')}"
            style="width:100%; padding:6px 8px; border-radius:7px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:10px; outline:none;" />
          <div style="display:flex; gap:5px;">
            <select id="admin-bc-type" style="flex:1; padding:5px; border-radius:7px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:9px;">
              <option value="gold" ${s.announcementType === 'gold' ? 'selected' : ''}>🟡 Gold Alert</option>
              <option value="red" ${s.announcementType === 'red' ? 'selected' : ''}>🔴 Red Danger</option>
              <option value="green" ${s.announcementType === 'green' ? 'selected' : ''}>🟢 Green Bullish</option>
              <option value="cyan" ${s.announcementType === 'cyan' ? 'selected' : ''}>🔵 Cyan Info</option>
            </select>
            <button id="admin-bc-set-btn" type="button" style="padding:5px 10px; border-radius:7px; background:rgba(245,158,11,0.25); border:1px solid rgba(251,191,36,0.7); color:#fef08a; font-size:9px; font-weight:800; cursor:pointer;">SET</button>
            <button id="admin-bc-clear-btn" type="button" style="padding:5px 8px; border-radius:7px; background:rgba(244,63,94,0.22); border:1px solid rgba(244,63,94,0.6); color:#fda4af; font-size:9px; font-weight:800; cursor:pointer;">✕</button>
          </div>
        </div>

        <div style="padding:7px; border-radius:8px; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.22); font-size:9px; color:#cbd5e1; display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; justify-content:space-between;"><span>Live Feed:</span><span id="admin-sys-feed-stat" style="color:#34d399; font-weight:800;">BINANCE VISION</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Tracked Assets:</span><span id="admin-sys-coin-count" style="color:#38bdf8; font-weight:800;">-</span></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button id="admin-sys-sync-btn" type="button" style="padding:7px; border-radius:8px; background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.55); color:#6ee7b7; font-size:9px; font-weight:800; cursor:pointer;">🔄 FORCE SYNC</button>
          <button id="admin-sys-reset-tabs-btn" type="button" style="padding:7px; border-radius:8px; background:rgba(56,189,248,0.18); border:1px solid rgba(56,189,248,0.5); color:#7dd3fc; font-size:9px; font-weight:800; cursor:pointer;">📐 RESET TABS</button>
          <button id="admin-sys-export-btn" type="button" style="padding:7px; border-radius:8px; background:rgba(168,85,247,0.2); border:1px solid rgba(168,85,247,0.55); color:#d8b4fe; font-size:9px; font-weight:800; cursor:pointer;">💾 EXPORT JSON</button>
          <button id="admin-sys-clear-pnl-btn" type="button" style="padding:7px; border-radius:8px; background:rgba(244,63,94,0.2); border:1px solid rgba(244,63,94,0.55); color:#fda4af; font-size:9px; font-weight:800; cursor:pointer;">🗑️ RESET P&L</button>
        </div>
      </div>
    `;

    const headerRow = adminPanel.firstElementChild;
    if (headerRow && headerRow.nextElementSibling) {
      adminPanel.insertBefore(hub, headerRow.nextElementSibling);
    } else {
      adminPanel.appendChild(hub);
    }

    const panes = {
      themes:  hub.querySelector('#admin-hub-pane-themes'),
      signals: hub.querySelector('#admin-hub-pane-signals'),
      system:  hub.querySelector('#admin-hub-pane-system')
    };
    hub.querySelectorAll('.admin-hub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        Object.entries(panes).forEach(([k, el]) => {
          if (el) el.style.display = k === target ? (k === 'themes' ? 'block' : 'flex') : 'none';
        });
        hub.querySelectorAll('.admin-hub-tab-btn').forEach(b => {
          const act = b.dataset.tab === target;
          b.style.borderColor = act ? '#22d3ee' : 'rgba(148,163,184,0.25)';
          b.style.background = act ? 'rgba(34,211,238,0.22)' : 'rgba(15,23,42,0.85)';
          b.style.color = act ? '#ecfeff' : '#94a3b8';
        });
      });
    });

    hub.querySelectorAll('.neural-theme-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeId));
    });

    const glassSlider = hub.querySelector('#admin-glass-opacity-slider');
    const glassVal = hub.querySelector('#admin-glass-opacity-val');
    glassSlider.addEventListener('input', () => {
      glassVal.textContent = `${glassSlider.value}%`;
      saveAdminSettings({ glassOpacity: Number(glassSlider.value) });
    });

    hub.querySelector('#admin-float-btn-toggle').addEventListener('change', (e) => {
      saveAdminSettings({ showFloatingThemeBtn: e.target.checked });
    });

    const pauseBtn = hub.querySelector('#admin-sig-pause-btn');
    pauseBtn.addEventListener('click', () => {
      const nextPaused = !loadAdminSettings().signalsPaused;
      saveAdminSettings({ signalsPaused: nextPaused });
      pauseBtn.textContent = nextPaused ? '⏸️ SIGNALS PAUSED (RESUME)' : '▶️ SIGNALS ACTIVE (PAUSE)';
      pauseBtn.style.borderColor = nextPaused ? 'rgba(244,63,94,0.7)' : 'rgba(16,185,129,0.65)';
      pauseBtn.style.background = nextPaused ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)';
      pauseBtn.style.color = nextPaused ? '#fda4af' : '#6ee7b7';
      window.showToast(nextPaused ? 'Signals Paused by Admin' : 'Signals Resumed!', nextPaused ? '⏸️' : '▶️');
    });

    hub.querySelector('#admin-dir-filter').addEventListener('change', (e) => {
      saveAdminSettings({ directionFilter: e.target.value });
      window.showToast(`Direction Filter: ${e.target.value.replace('_', ' ').toUpperCase()}`, '🧭');
    });

    hub.querySelector('#admin-rr-mode').addEventListener('change', (e) => {
      saveAdminSettings({ rrMode: e.target.value });
      window.showToast(`R:R Mode: ${e.target.value.toUpperCase()}`, '⚖️');
    });

    const confSlider = hub.querySelector('#admin-min-conf-slider');
    const confVal = hub.querySelector('#admin-min-conf-val');
    confSlider.addEventListener('input', () => {
      confVal.textContent = `${confSlider.value}%`;
      saveAdminSettings({ minConfidence: Number(confSlider.value) });
    });

    hub.querySelector('#admin-auto-sig').addEventListener('change', (e) => {
      const sec = Number(e.target.value);
      saveAdminSettings({ autoSignalSec: sec });
      window.showToast(sec > 0 ? `Auto-Signal Radar: Every ${sec / 60}m` : 'Auto-Signal Radar: OFF', '⏱️');
    });

    hub.querySelector('#admin-def-lev').addEventListener('change', (e) => {
      saveAdminSettings({ defaultLeverage: Number(e.target.value) });
      window.showToast(`Default Leverage set to ${e.target.value}x`, '⚡');
    });

    hub.querySelector('#admin-force-signal-btn').addEventListener('click', () => generateNearEntrySignal());

    const bcInput = hub.querySelector('#admin-bc-input');
    const bcType = hub.querySelector('#admin-bc-type');
    hub.querySelector('#admin-bc-set-btn').addEventListener('click', () => {
      saveAdminSettings({ announcement: bcInput.value.trim(), announcementType: bcType.value });
      window.showToast('Global Broadcast Updated!', '📢');
    });
    hub.querySelector('#admin-bc-clear-btn').addEventListener('click', () => {
      bcInput.value = '';
      saveAdminSettings({ announcement: '' });
      window.showToast('Broadcast Cleared', '🧹');
    });

    hub.querySelector('#admin-sys-sync-btn').addEventListener('click', async () => {
      await Promise.all([syncLivePrices(), syncNewsFromBackend()]);
      window.showToast('Live Binance Prices & RSS News Synced!', '🔄');
    });

    hub.querySelector('#admin-sys-reset-tabs-btn').addEventListener('click', () => {
      document.querySelectorAll('.tab-reset-pos-btn, #pnl-reset-pos-btn, #reset-card-pos-btn').forEach(b => b.click());
      window.showToast('All Floating Tabs Reset!', '📐');
    });

    hub.querySelector('#admin-sys-export-btn').addEventListener('click', () => {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          try { dump[k] = JSON.parse(localStorage.getItem(k)); }
          catch (_) { dump[k] = localStorage.getItem(k); }
        }
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neural-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.showToast('Admin JSON Backup Exported!', '💾');
    });

    hub.querySelector('#admin-sys-clear-pnl-btn').addEventListener('click', () => {
      Object.keys(localStorage).forEach(k => {
        if (/pnl|trade/i.test(k)) localStorage.removeItem(k);
      });
      if (window.NeuralPnlManager?.load) window.NeuralPnlManager.load();
      window.showToast('Trade Logs & P&L Reset!', '🗑️');
    });

    if (!document.getElementById('admin-quick-theme-pill')) {
      const pill = document.createElement('button');
      pill.id = 'admin-quick-theme-pill';
      pill.type = 'button';
      pill.textContent = '🎨 THEMES';
      pill.style.cssText = [
        'position:fixed', 'bottom:18px', 'right:18px', 'z-index:9990',
        'display:none', 'align-items:center', 'gap:6px',
        'padding:9px 14px', 'border-radius:999px',
        'background:rgba(6,16,30,0.94)', 'backdrop-filter:blur(12px)',
        'border:1px solid rgba(34,211,238,0.75)', 'color:#67e8f9',
        'font-family:"JetBrains Mono",monospace', 'font-size:11px', 'font-weight:800',
        'box-shadow:0 0 22px rgba(34,211,238,0.35)', 'cursor:pointer'
      ].join(';');
      pill.addEventListener('click', () => {
        adminPanel.classList.remove('hidden', 'translate-x-full');
        adminPanel.classList.add('flex');
        const themeTabBtn = hub.querySelector('.admin-hub-tab-btn[data-tab="themes"]');
        if (themeTabBtn) themeTabBtn.click();
      });
      document.body.appendChild(pill);
    }

    applyTheme(activeTheme, true);
    applyAdminVisualSettings(s);
  }

  // ---------------- LIVE REAL-TIME PRICE SYNC ----------------
  async function syncLivePrices() {
    const priceMap = {};
    const fundingMap = {};

    try {
      const resp = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr');
      if (resp.ok) {
        const list = await resp.json();
        if (Array.isArray(list)) {
          list.forEach(t => {
            if (t.symbol && t.symbol.endsWith('USDT')) {
              priceMap[t.symbol] = {
                price: parseFloat(t.lastPrice) || 0,
                change: parseFloat(t.priceChangePercent) || 0
              };
            }
          });
        }
      }
    } catch (_) {}

    try {
      const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
      const resp = await fetch(`${baseUrl}/api/market/binance-scan`);
      const badge = document.getElementById('admin-hub-api-status');
      if (resp.ok) {
        if (badge) { badge.textContent = '● API ONLINE'; badge.style.color = '#34d399'; }
        const data = await resp.json();
        if (data.ok && Array.isArray(data.pairs)) {
          data.pairs.forEach(p => {
            if (p.fundingRate !== undefined) fundingMap[p.binanceSymbol] = p.fundingRate;
            if (!priceMap[p.binanceSymbol] && p.price > 0) {
              priceMap[p.binanceSymbol] = { price: p.price, change: p.change };
            }
          });
        }
      } else if (badge) {
        badge.textContent = '● DIRECT MODE';
        badge.style.color = '#fbbf24';
      }
    } catch (_) {
      const badge = document.getElementById('admin-hub-api-status');
      if (badge) { badge.textContent = '● DIRECT MODE'; badge.style.color = '#fbbf24'; }
    }

    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
    const countEl = document.getElementById('admin-sys-coin-count');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.asset).length} PAIRS`;

    nodes.forEach(n => {
      if (!n.asset) return;
      const key = normalizeSymbolKey(n.asset);
      if (priceMap[key] && priceMap[key].price > 0) {
        n.asset.price = priceMap[key].price;
        n.asset.change = priceMap[key].change;
      }
      if (fundingMap[key] !== undefined) {
        n.asset.fundingRate = fundingMap[key];
      }
    });

    updateTerminalCard();
    updateBtcSummary();
  }

  async function syncNewsFromBackend() {
    try {
      const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
      const resp = await fetch(`${baseUrl}/api/market/news`);
      const data = await resp.json();
      const list = document.getElementById('live-news-radar-list');
      if (!list || !data.ok) return;

      const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
      const nearCoins = nodes
        .filter(n => n.asset && window.NeuralPnlManager?.getNodeProximity(n).isNear)
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
            <div><span class="font-bold text-white">${n.asset.symbol}</span> <span class="text-[9px] text-cyan-300">@ ${window.formatPrice(n.asset.price)}</span></div>
            <div class="flex items-center gap-1">
              <span class="text-[8px] px-1 rounded bg-cyan-500/20 text-cyan-200 font-bold">Δ ${prox.distPct.toFixed(2)}%</span>
              <span class="text-[8px] px-1.5 py-0.5 rounded font-bold ${cls}">🎯 NEAR ${spec.shortLabel}</span>
            </div>
          </div>`;
      }).join('');

      const newsHtml = (data.news || []).slice(0, 6).map(item => `
        <div class="p-2 rounded-lg bg-slate-950/80 border border-cyan-500/20 space-y-0.5">
          <div class="flex justify-between text-[8px]">
            <span class="text-cyan-300/80 font-bold">${item.source}</span>
            <span class="${item.sentiment === 'BULLISH' ? 'text-emerald-300' : item.sentiment === 'BEARISH' ? 'text-rose-300' : 'text-amber-300'} font-bold">${item.sentiment}</span>
          </div>
          <p class="text-[10px] text-cyan-100/85 leading-snug">${item.title}</p>
        </div>`).join('');

      list.innerHTML = nearHtml + newsHtml;
    } catch (_) {}
  }

  function updateBtcSummary() {
    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
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
    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
    const node = nodes[window.NeuralCanvasEngine?.getSelectedIndex?.() || 0] || nodes[0];
    if (!node || !node.asset) return;

    const symEl = document.getElementById('term-symbol');
    const pEl = document.getElementById('term-price');
    const chg = document.getElementById('term-change');
    if (symEl) symEl.textContent = node.asset.symbol;
    if (pEl) pEl.textContent = window.formatPrice(node.asset.price);
    if (chg) {
      chg.textContent = `${node.asset.change >= 0 ? '+' : ''}${node.asset.change.toFixed(2)}% (24h)`;
      chg.className = node.asset.change >= 0 ? 'text-[11px] text-emerald-400 font-semibold' : 'text-[11px] text-rose-400 font-semibold';
    }

    document.getElementById('term-market-update-box')?.classList.toggle('hidden', hasActiveSignal);
    document.getElementById('term-signal-box')?.classList.toggle('hidden', !hasActiveSignal);
  }

  // ---------------- REAL-TIME 15M MARKET STRUCTURE SIGNAL ENGINE ----------------
  async function generateNearEntrySignal() {
    const settings = loadAdminSettings();
    if (settings.signalsPaused) {
      window.showToast('Signals are Paused by Admin', '⏸️');
      return;
    }

    const nodes = (window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : []).filter(n => n.asset);
    if (!nodes.length) return;

    let pool = nodes.filter(n => !recentSymbols.includes(n.asset.symbol));
    if (!pool.length) { recentSymbols = []; pool = nodes; }
    const chosen = pool[0];
    recentSymbols.push(chosen.asset.symbol);
    if (recentSymbols.length > 15) recentSymbols = recentSymbols.slice(-15);

    const binSym = normalizeSymbolKey(chosen.asset) || 'BTCUSDT';
    let klines = [];

    try {
      const resp = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(binSym)}&interval=15m&limit=40`);
      if (resp.ok) {
        const raw = await resp.json();
        if (Array.isArray(raw) && raw.length >= 10) {
          klines = raw.map(k => ({
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4])
          }));
        }
      }
    } catch (_) {}

    if (!klines.length) {
      window.showToast('Live candle data unavailable — try again', '⚠️');
      return;
    }

    const livePrice = klines[klines.length - 1].close;
    chosen.asset.price = livePrice;

    const recent = klines.slice(-24);
    const swingHigh = Math.max(...recent.map(k => k.high));
    const swingLow  = Math.min(...recent.map(k => k.low));
    const midRange  = (swingHigh + swingLow) / 2;

    let isLong = livePrice < midRange;
    if (settings.directionFilter === 'long_only') isLong = true;
    if (settings.directionFilter === 'short_only') isLong = false;

    const spec = isLong
      ? { isLong: true, side: 'BUY / LONG', mode: 'green_buy' }
      : { isLong: false, side: 'SELL / SHORT', mode: 'red_sell' };

    const rrMult = settings.rrMode === 'conservative' ? { tp1: 1.4, tp2: 1.8 }
      : settings.rrMode === 'sniper' ? { tp1: 2.5, tp2: 4.2 }
      : { tp1: 1.8, tp2: 2.8 };

    const entryPrice = livePrice;
    let slPrice, tp1Price, tp2Price;

    if (isLong) {
      slPrice = Math.min(swingLow * 0.999, livePrice * 0.994);
      const risk = Math.max(livePrice * 0.0025, entryPrice - slPrice);
      tp1Price = entryPrice + risk * rrMult.tp1;
      tp2Price = Math.max(swingHigh * 0.999, entryPrice + risk * rrMult.tp2);
    } else {
      slPrice = Math.max(swingHigh * 1.001, livePrice * 1.006);
      const risk = Math.max(livePrice * 0.0025, slPrice - entryPrice);
      tp1Price = entryPrice - risk * rrMult.tp1;
      tp2Price = Math.min(swingLow * 1.001, entryPrice - risk * rrMult.tp2);
    }

    const distFromEq = Math.abs(livePrice - midRange) / (swingHigh - swingLow || 1);
    const confidence = Math.max(Number(settings.minConfidence) || 75, Math.min(96, Math.round(78 + distFromEq * 30)));

    const sig = {
      symbol: chosen.asset.symbol,
      isLong,
      direction: spec.side,
      confidence,
      entryPrice,
      tp1Price,
      tp2Price,
      slPrice
    };

    chosen.entryZoneAnchor = entryPrice;
    chosen.lastSignal = sig;
    hasActiveSignal = true;

    window.NeuralCanvasEngine.setSelectedIndex(chosen.index);
    window.NeuralCanvasEngine.setActiveSignaledIndex(chosen.index);
    window.NeuralCanvasEngine.setNeuralColorMode(spec.mode, sig);
    window.NeuralCanvasEngine.triggerBurst(chosen.x, chosen.y);

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('sig-direction-badge', `${sig.direction} • ${sig.confidence}% LIVE`);
    setText('sig-entry', window.formatPrice(sig.entryPrice));
    setText('sig-tp1', window.formatPrice(sig.tp1Price));
    setText('sig-tp2', window.formatPrice(sig.tp2Price));
    setText('sig-sl', window.formatPrice(sig.slPrice));
    setText('sig-reasoning', `Real-Time 15m ${isLong ? 'Discount' : 'Premium'} Signal (${settings.rrMode.toUpperCase()}) on ${sig.symbol} @ ${window.formatPrice(entryPrice)}.`);

    updateTerminalCard();
    window.NeuralPnlManager?.logTrade({ ...sig, source: 'REALTIME_15M', entryDistancePct: 0 });
    window.showToast(`${isLong ? '🟢 BUY' : '🔴 SELL'} Live Signal: ${sig.symbol} @ ${window.formatPrice(entryPrice)}`, isLong ? '🚀' : '🔻');
  }

  // ---------------- LIVE TRADINGVIEW CHART MODAL ----------------
  window.__openChartModal = async function (nodeIdx) {
    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
    const node = nodes[nodeIdx] || nodes[0];
    if (!node || !node.asset) return;

    window.NeuralCanvasEngine.setSelectedIndex(node.index);
    updateTerminalCard();

    const modal = document.getElementById('coin-chart-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    const symEl = document.getElementById('chart-modal-symbol');
    const pEl = document.getElementById('chart-modal-price');
    if (symEl) symEl.textContent = node.asset.symbol;
    if (pEl) pEl.textContent = window.formatPrice(node.asset.price);

    const rawSym = normalizeSymbolKey(node.asset) || 'BTCUSDT';
    const bLink = document.getElementById('chart-binance-link');
    const tvLink = document.getElementById('chart-tradingview-link');
    if (bLink) bLink.href = `https://www.binance.com/en/futures/${rawSym}`;
    if (tvLink) tvLink.href = `https://www.tradingview.com/chart/?symbol=BINANCE:${rawSym}.P`;

    const sig = node.lastSignal || {};
    const canvasEl = document.getElementById('klines-chart-canvas');
    if (window.TVPositionChart && canvasEl) {
      await window.TVPositionChart.renderIntoModal(canvasEl, {
        symbol: node.asset.symbol,
        nodeRef: node,
        timeframe: '15m',
        entry: sig.entryPrice,
        tp: sig.tp1Price,
        sl: sig.slPrice,
        isLong: sig.isLong !== undefined ? sig.isLong : getStealthSpec(node.asset.fundingRate).isLong
      });
    }
  };

  // ---------------- RR CALCULATOR ----------------
  function calculateRR() {
    const cap = parseFloat(document.getElementById('rr-capital')?.value) || 0;
    const riskPct = parseFloat(document.getElementById('rr-risk-pct')?.value) || 0;
    const rr = parseFloat(document.getElementById('rr-ratio-input')?.value) || 2;
    const entry = parseFloat(document.getElementById('rr-entry-price')?.value) || 0;
    const sl = parseFloat(document.getElementById('rr-sl-price')?.value) || 0;
    const lev = parseFloat(document.getElementById('rr-leverage')?.value) || loadAdminSettings().defaultLeverage || 10;
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
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (sig) {
      const lbl = document.getElementById('rr-pair-label');
      const ent = document.getElementById('rr-entry-price');
      const slEl = document.getElementById('rr-sl-price');
      if (lbl) lbl.textContent = `${sig.pair || sig.symbol} (${sig.assetClass || 'MARKET'})`;
      if (ent) ent.value = sig.entryPrice;
      if (slEl) slEl.value = sig.slPrice;
    }
    calculateRR();
  };

  // ---------------- AUTH & ADMIN PANEL ----------------
  function initAuth() {
    const form = document.getElementById('user-auth-form');
    const nameWrap = document.getElementById('user-signup-name-wrap');
    const submitBtn = document.getElementById('user-submit-btn');
    const errEl = document.getElementById('user-auth-error-msg');
    const okEl = document.getElementById('user-auth-success-msg');

    function setMode(signup) {
      isSignUpMode = signup;
      errEl?.classList.add('hidden');
      okEl?.classList.add('hidden');
      nameWrap?.classList.toggle('hidden', !signup);
      if (submitBtn) submitBtn.textContent = signup ? 'SEND SIGN UP REQUEST TO ADMIN ⚡' : 'LOGIN TO NEURAL PLATFORM ⚡';
    }

    on('tab-login-mode-btn', 'click', () => setMode(false));
    on('tab-signup-mode-btn', 'click', () => setMode(true));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl?.classList.add('hidden');
        okEl?.classList.add('hidden');

        const name = (document.getElementById('user-name-input')?.value || '').trim();
        const identifier = (document.getElementById('user-email-input')?.value || '').trim();
        const password = (document.getElementById('user-password-input')?.value || '').trim();

        try {
          const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
          const endpoint = isSignUpMode ? '/api/auth/signup' : '/api/auth/login';
          const resp = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, identifier, password })
          });
          const data = await resp.json();

          if (!resp.ok || !data.ok) {
            if (errEl) { errEl.textContent = data.error || 'Authentication failed.'; errEl.classList.remove('hidden'); }
            return;
          }

          if (isSignUpMode) {
            if (okEl) { okEl.textContent = data.message || 'Sign Up request sent to Admin!'; okEl.classList.remove('hidden'); }
            form.reset();
            setMode(false);
            return;
          }

          unlockApp(data.user, data.role === 'admin');
        } catch (_) {
          if (!isSignUpMode && identifier.toLowerCase() === 'kavishkasithumina' && password.toLowerCase() === 'kavishka@1234') {
            unlockApp({ name: 'kavishkasithumina', email: 'kavishkasithumina' }, true);
            window.showToast('Direct Mode — Live Binance Prices Active!', '⚡');
          } else if (errEl) {
            errEl.textContent = 'Cannot reach Backend Server.';
            errEl.classList.remove('hidden');
          }
        }
      });
    }

    on('user-logout-btn', 'click', () => {
      currentUser = null;
      isAdmin = false;
      document.getElementById('protected-website-ui')?.classList.add('hidden');
      document.getElementById('boot-intro-overlay')?.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      document.getElementById('admin-panel')?.classList.add('hidden', 'translate-x-full');
      const pill = document.getElementById('admin-quick-theme-pill');
      if (pill) pill.style.display = 'none';
    });
  }

  function unlockApp(user, adminFlag) {
    currentUser = user;
    isAdmin = adminFlag;
    const sessEl = document.getElementById('user-session-email');
    if (sessEl) sessEl.textContent = adminFlag ? 'ADMIN: kavishkasithumina' : `USER: ${user.name}`;
    const adminBtn = document.getElementById('admin-access-btn');
    if (adminBtn) {
      adminBtn.classList.toggle('hidden', !adminFlag);
      adminBtn.classList.toggle('flex', adminFlag);
    }
    document.getElementById('protected-website-ui')?.classList.remove('hidden');
    const gate = document.getElementById('boot-intro-overlay');
    if (gate) {
      gate.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => gate.classList.add('hidden'), 400);
    }

    if (adminFlag) {
      mountAdminCommandCenter();
      loadAdminUsers();
    }
    applyAdminVisualSettings(loadAdminSettings());
    syncLivePrices();
    window.showToast(`Welcome ${user.name} — Live Market Synced!`, '⚡');
  }

  async function loadAdminUsers() {
    try {
      const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
      const resp = await fetch(`${baseUrl}/api/auth/admin/users`);
      const data = await resp.json();
      if (!data.ok) return;
      const list = document.getElementById('admin-users-list');
      if (!list) return;
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
    const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
    await fetch(`${baseUrl}/api/auth/admin/users/${idx}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    loadAdminUsers();
  };

  window.__adminDelUser = async (idx) => {
    const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
    await fetch(`${baseUrl}/api/auth/admin/users/${idx}`, { method: 'DELETE' });
    loadAdminUsers();
  };

  // ---------------- BOOTSTRAP EVERYTHING ----------------
  window.addEventListener('load', () => {
    injectThemeCss();
    initAuth();

    try { window.NeuralCanvasEngine?.init((idx) => window.__openChartModal(idx)); } catch (_) {}
    try { window.NeuralChartVision?.init(); } catch (_) {}
    try { window.NeuralPnlManager?.wireControls(); window.NeuralPnlManager?.load(); } catch (_) {}

    const drag = (id, opts) => {
      const el = document.getElementById(id);
      if (el && window.NeuralTabManager?.makeDraggable) window.NeuralTabManager.makeDraggable(el, opts);
    };
    drag('hud-wrapper-tab', { resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#hud-tab-body', defaultTop: '16px', defaultLeft: '16px' });
    drag('btc-trend-summary-widget', { resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#btc-summary-body', defaultTop: '94px', defaultLeft: '16px' });
    drag('tv-chart-vision-widget', { resetBtnSelector: '.tab-reset-pos-btn', minimizeBtnSelector: '.tab-minimize-btn', bodySelector: '#vision-widget-body', defaultTop: '94px', defaultLeft: '440px' });
    drag('daily-trading-summary-widget', { resetBtnSelector: '#pnl-reset-pos-btn', minimizeBtnSelector: '#toggle-daily-summary-btn', bodySelector: '#daily-summary-body', defaultTop: '64px', defaultRight: '16px' });
    drag('asset-terminal-card', { resetBtnSelector: '#reset-card-pos-btn', minimizeBtnSelector: '#term-minimize-tab-btn', bodySelector: '#term-collapsible-body', defaultBottom: '16px', defaultLeft: '16px' });
    drag('signal-alert-banner', { defaultTop: '16px', defaultLeft: '50%', defaultTransform: 'translateX(-50%)' });

    on('quick-fire-signal-btn', 'click', generateNearEntrySignal);
    on('term-generate-signal-btn', 'click', generateNearEntrySignal);
    on('term-open-chart-btn', 'click', () => window.__openChartModal(window.NeuralCanvasEngine?.getSelectedIndex?.() || 0));
    on('term-copy-symbol-btn', 'click', () => window.copyCoinSymbolToClipboard(document.getElementById('term-symbol')?.textContent));
    on('close-chart-modal-btn', 'click', () => {
      window.TVPositionChart?.close?.();
      document.getElementById('coin-chart-modal')?.classList.add('hidden');
      document.getElementById('coin-chart-modal')?.classList.remove('flex');
    });
    on('open-rr-calc-btn', 'click', () => {
      const n = window.NeuralCanvasEngine?.getNodes?.()[window.NeuralCanvasEngine?.getSelectedIndex?.() || 0];
      window.openRRCalculatorWithSignal(n?.lastSignal || { pair: n?.asset?.symbol, entryPrice: n?.asset?.price, slPrice: (n?.asset?.price || 100) * 0.99 });
    });
    on('close-rr-calc-modal-btn', 'click', () => {
      document.getElementById('rr-calculator-modal')?.classList.add('hidden');
      document.getElementById('rr-calculator-modal')?.classList.remove('flex');
    });
    ['rr-capital', 'rr-risk-pct', 'rr-ratio-input', 'rr-entry-price', 'rr-sl-price', 'rr-leverage'].forEach(id => {
      on(id, 'input', calculateRR);
    });
    on('quick-open-vision-btn', 'click', () => {
      document.getElementById('vision-widget-body')?.classList.remove('hidden');
      window.showToast('TradingView Chart AI Vision Ready — Upload or Ctrl+V!', '📷');
    });

    const adminPanel = document.getElementById('admin-panel');
    on('admin-access-btn', 'click', () => {
      if (!adminPanel) return;
      mountAdminCommandCenter();
      adminPanel.classList.remove('hidden');
      adminPanel.classList.add('flex');
      adminPanel.classList.toggle('translate-x-full');
      loadAdminUsers();
    });
    on('collapse-admin-btn', 'click', () => adminPanel?.classList.add('translate-x-full'));
    on('admin-create-user-btn', 'click', async () => {
      const emailEl = document.getElementById('admin-new-user-email');
      const passEl = document.getElementById('admin-new-user-pass');
      const email = (emailEl?.value || '').trim();
      const password = (passEl?.value || '').trim();
      if (!email || !password) return;
      const baseUrl = window.NEURAL_CONFIG?.API_BASE_URL || '';
      await fetch(`${baseUrl}/api/auth/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      if (emailEl) emailEl.value = '';
      if (passEl) passEl.value = '';
      loadAdminUsers();
      window.showToast(`Approved user: ${email}`, '✅');
    });

    applyTheme(activeTheme, true);
    applyAdminVisualSettings(loadAdminSettings());
    setupAutoSignalTimer(loadAdminSettings().autoSignalSec);

    syncLivePrices();
    syncNewsFromBackend();
    setInterval(syncLivePrices, 5000);
    setInterval(syncNewsFromBackend, 45000);
    setInterval(() => {
      try {
        window.NeuralPnlManager?.checkMidnightReset();
        window.NeuralPnlManager?.evaluateNearEntriesAndOpenTrades();
      } catch (_) {}
    }, 1000);
  });
})();
