/**
 * ADMIN-ONLY THEME MANAGER (10 THEMES + CRYPTO BUBBLES PHYSICS ENGINE)
 * Directly renders a visible "THEMES" section inside #admin-panel for Admin users.
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
    { id: 'neural_default', name: '🧠 Neural Cortex', desc: 'Default Network', badge: '#22d3ee', isBubbles: false, css: '' },
    {
      id: 'crypto_bubbles',
      name: '🫧 Crypto Bubbles',
      desc: 'Live Bubbles',
      badge: '#34d399',
      isBubbles: true,
      css: `body[data-neural-theme="crypto_bubbles"] { background: radial-gradient(circle at 50% 35%, #07192b 0%, #02060c 100%) !important; }`
    },
    {
      id: 'cyberpunk_neon',
      name: '⚡ Cyberpunk Neon',
      desc: 'Magenta & Cyan',
      badge: '#f472b6',
      isBubbles: false,
      css: `
        body[data-neural-theme="cyberpunk_neon"] { background: radial-gradient(circle at 20% 20%, #2e0647 0%, #070212 72%) !important; }
        body[data-neural-theme="cyberpunk_neon"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="cyberpunk_neon"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="cyberpunk_neon"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(20, 6, 36, 0.86) !important;
          border-color: rgba(236, 72, 153, 0.75) !important;
          box-shadow: 0 0 24px rgba(236, 72, 153, 0.3) !important;
        }
      `
    },
    {
      id: 'obsidian_gold',
      name: '👑 Obsidian Gold',
      desc: 'Black & Gold',
      badge: '#fbbf24',
      isBubbles: false,
      css: `
        body[data-neural-theme="obsidian_gold"] { background: radial-gradient(circle at 50% 20%, #2b1e05 0%, #060401 75%) !important; }
        body[data-neural-theme="obsidian_gold"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="obsidian_gold"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="obsidian_gold"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(24, 17, 4, 0.88) !important;
          border-color: rgba(245, 158, 11, 0.75) !important;
          box-shadow: 0 0 24px rgba(245, 158, 11, 0.28) !important;
        }
      `
    },
    {
      id: 'matrix_terminal',
      name: '💚 Matrix Terminal',
      desc: 'Emerald Quant',
      badge: '#10b981',
      isBubbles: false,
      css: `
        body[data-neural-theme="matrix_terminal"] { background: radial-gradient(circle at 50% 50%, #032b15 0%, #010905 80%) !important; }
        body[data-neural-theme="matrix_terminal"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="matrix_terminal"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="matrix_terminal"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(3, 24, 12, 0.88) !important;
          border-color: rgba(16, 185, 129, 0.75) !important;
          box-shadow: 0 0 22px rgba(16, 185, 129, 0.28) !important;
        }
      `
    },
    {
      id: 'liquid_aurora',
      name: '🌌 Liquid Aurora',
      desc: 'Violet & Teal',
      badge: '#a78bfa',
      isBubbles: false,
      css: `
        body[data-neural-theme="liquid_aurora"] { background: linear-gradient(135deg, #09223b 0%, #220c42 52%, #052e29 100%) !important; }
        body[data-neural-theme="liquid_aurora"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="liquid_aurora"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="liquid_aurora"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(12, 14, 36, 0.86) !important;
          border-color: rgba(139, 92, 246, 0.72) !important;
          box-shadow: 0 0 26px rgba(45, 212, 191, 0.24) !important;
        }
      `
    },
    {
      id: 'crimson_inferno',
      name: '🌋 Crimson Inferno',
      desc: 'Blood Red & Lava',
      badge: '#fb7185',
      isBubbles: false,
      css: `
        body[data-neural-theme="crimson_inferno"] { background: radial-gradient(circle at 50% 30%, #3b0711 0%, #090204 78%) !important; }
        body[data-neural-theme="crimson_inferno"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="crimson_inferno"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="crimson_inferno"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(28, 5, 10, 0.88) !important;
          border-color: rgba(244, 63, 94, 0.78) !important;
          box-shadow: 0 0 24px rgba(244, 63, 94, 0.3) !important;
        }
      `
    },
    {
      id: 'arctic_frost',
      name: '❄️ Arctic Frost',
      desc: 'Glacier Blue',
      badge: '#7dd3fc',
      isBubbles: false,
      css: `
        body[data-neural-theme="arctic_frost"] { background: radial-gradient(circle at 50% 20%, #0d324d 0%, #040e1a 80%) !important; }
        body[data-neural-theme="arctic_frost"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="arctic_frost"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="arctic_frost"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(7, 24, 42, 0.86) !important;
          border-color: rgba(125, 211, 252, 0.78) !important;
          box-shadow: 0 0 24px rgba(56, 189, 248, 0.28) !important;
        }
      `
    },
    {
      id: 'synthwave_80s',
      name: '🌆 Synthwave 80s',
      desc: 'Sunset Retro',
      badge: '#fb923c',
      isBubbles: false,
      css: `
        body[data-neural-theme="synthwave_80s"] { background: linear-gradient(160deg, #240947 0%, #3d0e4c 52%, #3b150a 100%) !important; }
        body[data-neural-theme="synthwave_80s"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="synthwave_80s"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="synthwave_80s"] #protected-website-ui #hud-wrapper-tab {
          background: rgba(26, 8, 38, 0.88) !important;
          border-color: rgba(251, 146, 60, 0.72) !important;
          box-shadow: 0 0 24px rgba(192, 38, 211, 0.28) !important;
        }
      `
    },
    {
      id: 'diamond_rgb',
      name: '💎 Diamond RGB',
      desc: 'Animated RGB',
      badge: '#e879f9',
      isBubbles: false,
      css: `
        @keyframes neuralRgbBorder {
          0%   { border-color: rgba(34, 211, 238, 0.88); box-shadow: 0 0 22px rgba(34, 211, 238, 0.34); }
          33%  { border-color: rgba(192, 132, 252, 0.88); box-shadow: 0 0 22px rgba(192, 132, 252, 0.34); }
          66%  { border-color: rgba(52, 211, 153, 0.88); box-shadow: 0 0 22px rgba(52, 211, 153, 0.34); }
          100% { border-color: rgba(34, 211, 238, 0.88); box-shadow: 0 0 22px rgba(34, 211, 238, 0.34); }
        }
        body[data-neural-theme="diamond_rgb"] { background: radial-gradient(circle at 50% 40%, #121b36 0%, #03050a 80%) !important; }
        body[data-neural-theme="diamond_rgb"] #protected-website-ui [id$="-widget"],
        body[data-neural-theme="diamond_rgb"] #protected-website-ui #asset-terminal-card,
        body[data-neural-theme="diamond_rgb"] #protected-website-ui #hud-wrapper-tab {
          animation: neuralRgbBorder 4.5s linear infinite !important;
        }
      `
    }
  ];

  function injectThemeStyles() {
    let style = document.getElementById('neural-dynamic-themes-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'neural-dynamic-themes-css';
      document.head.appendChild(style);
    }
    style.textContent = THEMES.map(t => t.css).join('\n');
  }

  function initBubblesData(w, h) {
    const rawNodes = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes().filter(n => n.asset) : [];
    bubbles = rawNodes.map((n) => {
      const chg = Number(n.asset.change || 0);
      const r = Math.max(30, Math.min(72, 34 + Math.abs(chg) * 3.8 + (n.isCore ? 8 : 0)));
      return {
        nodeIdx: n.index,
        asset: n.asset,
        x: 110 + Math.random() * Math.max(220, w - 220),
        y: 110 + Math.random() * Math.max(220, h - 220),
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
      btn.style.borderColor = active ? found.badge : 'rgba(148, 163, 184, 0.25)';
      btn.style.background = active ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.85)';
      btn.style.boxShadow = active ? `0 0 10px ${found.badge}44` : 'none';
    });

    if (!silent && window.showToast) {
      window.showToast(`Theme: ${found.name}`, '🎨');
    }
  }

  // Always renders a clean "THEMES" section directly inside #admin-panel
  function mountThemesSectionInAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel) return;

    adminPanel.style.overflowY = 'auto';

    let section = document.getElementById('admin-themes-section');
    if (!section) {
      section = document.createElement('section');
      section.id = 'admin-themes-section';
      section.style.cssText = [
        'display:block', 'visibility:visible', 'opacity:1',
        'margin:10px 0', 'padding:10px', 'border-radius:12px',
        'background:rgba(2, 6, 23, 0.95)',
        'border:1px solid rgba(34, 211, 238, 0.45)',
        'font-family:"JetBrains Mono", monospace'
      ].join(';');

      section.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <h3 style="margin:0; font-size:11px; font-weight:800; color:#67e8f9; letter-spacing:0.06em;">THEMES</h3>
          <span style="font-size:8px; padding:2px 6px; border-radius:4px; background:rgba(245,158,11,0.2); color:#fcd34d; font-weight:700;">ADMIN</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          ${THEMES.map(t => `
            <button type="button" data-theme-id="${t.id}" class="admin-theme-btn"
              style="display:block; text-align:left; padding:7px 8px; border-radius:8px; border:1px solid rgba(148,163,184,0.25); background:rgba(15,23,42,0.85); cursor:pointer;">
              <div style="font-size:10px; font-weight:800; color:#ffffff;">${t.name}</div>
              <div style="font-size:8px; color:#94a3b8; margin-top:2px;">${t.desc}</div>
            </button>
          `).join('')}
        </div>
      `;

      // Place right after header / near top of #admin-panel so it's immediately visible
      const firstChild = adminPanel.firstElementChild;
      if (firstChild && firstChild.nextElementSibling) {
        adminPanel.insertBefore(section, firstChild.nextElementSibling);
      } else {
        adminPanel.prepend(section);
      }

      section.querySelectorAll('.admin-theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.themeId));
      });
    }

    section.style.display = 'block';
  }

  window.addEventListener('load', () => {
    injectThemeStyles();
    mountThemesSectionInAdminPanel();
    setInterval(mountThemesSectionInAdminPanel, 1500);
    setTimeout(() => applyTheme(activeTheme, true), 400);
  });

  return { applyTheme, getActiveTheme: () => activeTheme, mountThemesSectionInAdminPanel };
})();
