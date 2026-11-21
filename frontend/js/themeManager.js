/**
 * ADMIN-ONLY THEME STUDIO (10 THEMES + CRYPTO BUBBLES PHYSICS ENGINE)
 * Visible strictly to Admin (inside #admin-panel AND via Admin-only floating 🎨 THEMES button).
 */
window.NeuralThemeManager = (function () {
  const STORAGE_KEY = 'neural_ai_active_theme';
  let activeTheme = localStorage.getItem(STORAGE_KEY) || 'neural_default';
  let bubbleCanvas = null;
  let bubbleCtx = null;
  let bubbleRaf = null;
  let bubbles = [];
  let hoveredIdx = -1;

  const THEMES = [
    {
      id: 'neural_default',
      name: '🧠 Neural Cortex',
      desc: 'Default Organic Network',
      isBubbles: false,
      css: ''
    },
    {
      id: 'crypto_bubbles',
      name: '🫧 Crypto Bubbles',
      desc: 'Live Floating Physics Bubbles',
      isBubbles: true,
      css: `
        body[data-neural-theme="crypto_bubbles"] { background: radial-gradient(circle at 50% 35%, #071320 0%, #02060c 100%) !important; }
      `
    },
    {
      id: 'cyberpunk_neon',
      name: '⚡ Cyberpunk Neon',
      desc: 'Magenta & Cyan Neon Glass',
      isBubbles: false,
      css: `
        body[data-neural-theme="cyberpunk_neon"] { background: radial-gradient(circle at 20% 20%, #240538 0%, #06020f 70%) !important; }
        body[data-neural-theme="cyberpunk_neon"] [id$="-widget"],
        body[data-neural-theme="cyberpunk_neon"] #asset-terminal-card,
        body[data-neural-theme="cyberpunk_neon"] #hud-wrapper-tab {
          border-color: rgba(236, 72, 153, 0.6) !important;
          box-shadow: 0 0 24px rgba(236, 72, 153, 0.25), inset 0 0 14px rgba(34, 211, 238, 0.14) !important;
        }
      `
    },
    {
      id: 'obsidian_gold',
      name: '👑 Obsidian Gold',
      desc: 'Institutional Black & Gold',
      isBubbles: false,
      css: `
        body[data-neural-theme="obsidian_gold"] { background: radial-gradient(circle at 50% 20%, #211805 0%, #050402 75%) !important; }
        body[data-neural-theme="obsidian_gold"] [id$="-widget"],
        body[data-neural-theme="obsidian_gold"] #asset-terminal-card,
        body[data-neural-theme="obsidian_gold"] #hud-wrapper-tab {
          border-color: rgba(245, 158, 11, 0.6) !important;
          box-shadow: 0 0 26px rgba(245, 158, 11, 0.22), inset 0 0 12px rgba(251, 191, 36, 0.1) !important;
        }
      `
    },
    {
      id: 'matrix_terminal',
      name: '💚 Matrix Terminal',
      desc: 'Emerald Quant Terminal',
      isBubbles: false,
      css: `
        body[data-neural-theme="matrix_terminal"] { background: radial-gradient(circle at 50% 50%, #022110 0%, #010804 80%) !important; }
        body[data-neural-theme="matrix_terminal"] [id$="-widget"],
        body[data-neural-theme="matrix_terminal"] #asset-terminal-card,
        body[data-neural-theme="matrix_terminal"] #hud-wrapper-tab {
          border-color: rgba(16, 185, 129, 0.6) !important;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.24) !important;
        }
      `
    },
    {
      id: 'liquid_aurora',
      name: '🌌 Liquid Aurora',
      desc: 'Violet & Teal Northern Glow',
      isBubbles: false,
      css: `
        body[data-neural-theme="liquid_aurora"] { background: linear-gradient(135deg, #071b2e 0%, #1a0a33 50%, #042420 100%) !important; }
        body[data-neural-theme="liquid_aurora"] [id$="-widget"],
        body[data-neural-theme="liquid_aurora"] #asset-terminal-card,
        body[data-neural-theme="liquid_aurora"] #hud-wrapper-tab {
          border-color: rgba(139, 92, 246, 0.6) !important;
          box-shadow: 0 0 28px rgba(45, 212, 191, 0.22), inset 0 0 14px rgba(139, 92, 246, 0.15) !important;
        }
      `
    },
    {
      id: 'crimson_inferno',
      name: '🌋 Crimson Inferno',
      desc: 'Blood Red & Lava Dark',
      isBubbles: false,
      css: `
        body[data-neural-theme="crimson_inferno"] { background: radial-gradient(circle at 50% 30%, #2b060d 0%, #080203 78%) !important; }
        body[data-neural-theme="crimson_inferno"] [id$="-widget"],
        body[data-neural-theme="crimson_inferno"] #asset-terminal-card,
        body[data-neural-theme="crimson_inferno"] #hud-wrapper-tab {
          border-color: rgba(244, 63, 94, 0.65) !important;
          box-shadow: 0 0 26px rgba(244, 63, 94, 0.25), inset 0 0 12px rgba(251, 146, 60, 0.12) !important;
        }
      `
    },
    {
      id: 'arctic_frost',
      name: '❄️ Arctic Frost',
      desc: 'Icy Glacier Liquid Glass',
      isBubbles: false,
      css: `
        body[data-neural-theme="arctic_frost"] { background: radial-gradient(circle at 50% 20%, #0a2538 0%, #030b14 80%) !important; }
        body[data-neural-theme="arctic_frost"] [id$="-widget"],
        body[data-neural-theme="arctic_frost"] #asset-terminal-card,
        body[data-neural-theme="arctic_frost"] #hud-wrapper-tab {
          border-color: rgba(125, 211, 252, 0.65) !important;
          box-shadow: 0 0 26px rgba(56, 189, 248, 0.25), inset 0 0 16px rgba(224, 242, 254, 0.12) !important;
        }
      `
    },
    {
      id: 'synthwave_80s',
      name: '🌆 Synthwave 80s',
      desc: 'Retro Sunset Purple & Orange',
      isBubbles: false,
      css: `
        body[data-neural-theme="synthwave_80s"] { background: linear-gradient(160deg, #1b0736 0%, #2d0b38 55%, #2b1008 100%) !important; }
        body[data-neural-theme="synthwave_80s"] [id$="-widget"],
        body[data-neural-theme="synthwave_80s"] #asset-terminal-card,
        body[data-neural-theme="synthwave_80s"] #hud-wrapper-tab {
          border-color: rgba(251, 146, 60, 0.6) !important;
          box-shadow: 0 0 24px rgba(192, 38, 211, 0.25), inset 0 0 14px rgba(251, 146, 60, 0.12) !important;
        }
      `
    },
    {
      id: 'diamond_rgb',
      name: '💎 Diamond RGB',
      desc: 'Animated RGB Liquid Glow',
      isBubbles: false,
      css: `
        @keyframes neuralRgbBorder {
          0%   { border-color: rgba(34, 211, 238, 0.75); box-shadow: 0 0 22px rgba(34, 211, 238, 0.28); }
          33%  { border-color: rgba(168, 85, 247, 0.75); box-shadow: 0 0 22px rgba(168, 85, 247, 0.28); }
          66%  { border-color: rgba(16, 185, 129, 0.75); box-shadow: 0 0 22px rgba(16, 185, 129, 0.28); }
          100% { border-color: rgba(34, 211, 238, 0.75); box-shadow: 0 0 22px rgba(34, 211, 238, 0.28); }
        }
        body[data-neural-theme="diamond_rgb"] { background: radial-gradient(circle at 50% 40%, #0d1326 0%, #03050a 80%) !important; }
        body[data-neural-theme="diamond_rgb"] [id$="-widget"],
        body[data-neural-theme="diamond_rgb"] #asset-terminal-card,
        body[data-neural-theme="diamond_rgb"] #hud-wrapper-tab {
          animation: neuralRgbBorder 5s linear infinite !important;
        }
      `
    }
  ];

  function injectThemeStyles() {
    if (document.getElementById('neural-dynamic-themes-css')) return;
    const style = document.createElement('style');
    style.id = 'neural-dynamic-themes-css';
    style.textContent = THEMES.map(t => t.css).join('\n');
    document.head.appendChild(style);
  }

  // ---------------- CRYPTO BUBBLES PHYSICS ENGINE ----------------
  function initBubblesData(w, h) {
    const nodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes().filter(n => n.asset) : [];
    bubbles = nodes.map((n) => {
      const chg = Number(n.asset.change || 0);
      const r = Math.max(30, Math.min(72, 34 + Math.abs(chg) * 3.8 + (n.isCore ? 8 : 0)));
      return {
        nodeIdx: n.index,
        asset: n.asset,
        x: 100 + Math.random() * Math.max(200, w - 200),
        y: 100 + Math.random() * Math.max(200, h - 200),
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        r,
        targetR: r,
        phase: Math.random() * Math.PI * 2
      };
    });
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
        hoveredIdx = -1;
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          if (Math.hypot(mx - b.x, my - b.y) <= b.r) {
            hoveredIdx = i;
            break;
          }
        }
        bubbleCanvas.style.cursor = hoveredIdx !== -1 ? 'pointer' : 'default';
      });

      bubbleCanvas.addEventListener('click', () => {
        if (hoveredIdx !== -1 && bubbles[hoveredIdx] && window.__openChartModal) {
          window.__openChartModal(bubbles[hoveredIdx].nodeIdx);
        }
      });
    }

    bubbleCanvas.style.display = 'block';
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      bubbleCanvas.width = window.innerWidth * dpr;
      bubbleCanvas.height = window.innerHeight * dpr;
      bubbleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    initBubblesData(window.innerWidth, window.innerHeight);

    const render = () => {
      if (activeTheme !== 'crypto_bubbles') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      bubbleCtx.clearRect(0, 0, w, h);

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const chg = Number(b.asset.change || 0);
        b.targetR = Math.max(30, Math.min(74, 34 + Math.abs(chg) * 3.8 + (b.nodeIdx < 12 ? 7 : 0)));
        b.r += (b.targetR - b.r) * 0.05;
        b.phase += 0.015;

        b.x += b.vx + Math.sin(b.phase) * 0.15;
        b.y += b.vy + Math.cos(b.phase) * 0.15;

        if (b.x - b.r < 12) { b.x = b.r + 12; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > w - 12) { b.x = w - b.r - 12; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 72) { b.y = b.r + 72; b.vy = Math.abs(b.vy); }
        if (b.y + b.r > h - 18) { b.y = h - b.r - 18; b.vy = -Math.abs(b.vy); }

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
        const isHover = idx === hoveredIdx;
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

        if (r >= 46 && window.formatPrice) {
          bubbleCtx.font = `600 ${Math.max(8, Math.floor(r * 0.16))}px "JetBrains Mono", monospace`;
          bubbleCtx.fillStyle = 'rgba(226, 232, 240, 0.82)';
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

  // ---------------- APPLY THEME ----------------
  function applyTheme(themeId, silent = false) {
    const found = THEMES.find(t => t.id === themeId) || THEMES[0];
    activeTheme = found.id;
    localStorage.setItem(STORAGE_KEY, activeTheme);
    document.body.setAttribute('data-neural-theme', activeTheme);

    if (found.isBubbles) {
      startCryptoBubbles();
    } else {
      stopCryptoBubbles();
    }

    document.querySelectorAll('.admin-theme-btn').forEach(btn => {
      const active = btn.dataset.themeId === activeTheme;
      btn.style.borderColor = active ? '#22d3ee' : 'rgba(56, 189, 248, 0.25)';
      btn.style.background = active ? 'rgba(34, 211, 238, 0.22)' : 'rgba(15, 23, 42, 0.88)';
    });

    if (!silent && window.showToast) {
      window.showToast(`Theme Switched: ${found.name}`, '🎨');
    }
  }

  function buildThemeGridHtml() {
    return THEMES.map(t => `
      <button type="button" data-theme-id="${t.id}" class="admin-theme-btn"
        style="text-align:left; padding:8px; border-radius:8px; border:1px solid rgba(56,189,248,0.25); background:rgba(15,23,42,0.88); cursor:pointer; transition:all 0.15s ease;">
        <div style="font-size:11px; font-weight:700; color:#ffffff;">${t.name}</div>
        <div style="font-size:9px; color:rgba(186,230,253,0.75); margin-top:2px;">${t.desc}</div>
      </button>
    `).join('');
  }

  function wireThemeButtons(container) {
    container.querySelectorAll('.admin-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeId));
    });
  }

  // ---------------- ADMIN-ONLY FLOATING BUTTON + POPUP MODAL ----------------
  function createAdminFloatingStudio() {
    if (document.getElementById('admin-floating-theme-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'admin-floating-theme-btn';
    btn.type = 'button';
    btn.textContent = '🎨 THEMES';
    btn.style.cssText = [
      'position:fixed', 'bottom:18px', 'right:18px', 'z-index:9990',
      'display:none', 'align-items:center', 'gap:6px',
      'padding:9px 14px', 'border-radius:999px',
      'background:rgba(8,18,32,0.92)', 'backdrop-filter:blur(12px)',
      'border:1px solid rgba(34,211,238,0.65)', 'color:#67e8f9',
      'font-family:"JetBrains Mono",monospace', 'font-size:11px', 'font-weight:800',
      'box-shadow:0 0 20px rgba(34,211,238,0.35)', 'cursor:pointer'
    ].join(';');
    document.body.appendChild(btn);

    const modal = document.createElement('div');
    modal.id = 'admin-theme-studio-modal';
    modal.style.cssText = [
      'position:fixed', 'bottom:64px', 'right:18px', 'z-index:9995',
      'width:320px', 'max-height:75vh', 'overflow-y:auto',
      'display:none', 'padding:14px', 'border-radius:14px',
      'background:rgba(5,12,24,0.96)', 'backdrop-filter:blur(16px)',
      'border:1px solid rgba(34,211,238,0.55)',
      'box-shadow:0 12px 40px rgba(0,0,0,0.75)'
    ].join(';');

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:11px; font-weight:800; color:#67e8f9; letter-spacing:0.06em;">🎨 ADMIN THEME STUDIO (10)</span>
        <button type="button" id="close-theme-studio-btn" style="background:none; border:none; color:#fb7185; font-weight:800; cursor:pointer; font-size:14px;">✕</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        ${buildThemeGridHtml()}
      </div>
    `;
    document.body.appendChild(modal);
    wireThemeButtons(modal);

    btn.addEventListener('click', () => {
      modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
      applyTheme(activeTheme, true);
    });
    modal.querySelector('#close-theme-studio-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Show ONLY when Admin is logged in (#admin-access-btn is visible)
    const syncAdminVisibility = () => {
      const adminBtn = document.getElementById('admin-access-btn');
      const isAdminVisible = adminBtn && !adminBtn.classList.contains('hidden');
      btn.style.display = isAdminVisible ? 'flex' : 'none';
      if (!isAdminVisible) modal.style.display = 'none';
    };
    setInterval(syncAdminVisibility, 1000);
    syncAdminVisibility();
  }

  // ---------------- ALSO INJECT INSIDE ADMIN PANEL ----------------
  function injectInsideAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-theme-switcher-box')) return;

    const box = document.createElement('div');
    box.id = 'admin-theme-switcher-box';
    box.style.cssText = 'padding:10px; border-radius:12px; background:rgba(2,6,23,0.92); border:1px solid rgba(34,211,238,0.4); margin-bottom:10px;';
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:10px; font-weight:800; color:#67e8f9;">🎨 ADMIN THEMES (10)</span>
        <span style="font-size:8px; padding:2px 6px; border-radius:4px; background:rgba(245,158,11,0.2); color:#fcd34d; font-weight:700;">ADMIN ONLY</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        ${buildThemeGridHtml()}
      </div>
    `;

    const usersList = document.getElementById('admin-users-list');
    if (usersList && usersList.parentElement) {
      usersList.parentElement.insertBefore(box, usersList);
    } else {
      adminPanel.appendChild(box);
    }
    wireThemeButtons(box);
  }

  window.addEventListener('load', () => {
    injectThemeStyles();
    createAdminFloatingStudio();
    injectInsideAdminPanel();
    setTimeout(() => applyTheme(activeTheme, true), 450);
  });

  return { applyTheme, getActiveTheme: () => activeTheme };
})();
