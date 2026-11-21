/**
 * ADMIN-ONLY THEME & CRYPTO BUBBLES INTERFACE ENGINE
 * Injects theme controls strictly inside #admin-panel (hidden from regular users).
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
      desc: 'Default Organic Neural Network',
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
        body[data-neural-theme="cyberpunk_neon"] { background: radial-gradient(circle at 20% 20%, #1c052b 0%, #05020d 70%) !important; }
        body[data-neural-theme="cyberpunk_neon"] .glass-panel,
        body[data-neural-theme="cyberpunk_neon"] [id$="-widget"],
        body[data-neural-theme="cyberpunk_neon"] #asset-terminal-card,
        body[data-neural-theme="cyberpunk_neon"] #hud-wrapper-tab {
          border-color: rgba(236, 72, 153, 0.55) !important;
          box-shadow: 0 0 24px rgba(236, 72, 153, 0.22), inset 0 0 14px rgba(34, 211, 238, 0.12) !important;
        }
      `
    },
    {
      id: 'obsidian_gold',
      name: '👑 Obsidian Gold',
      desc: 'Institutional Black & Gold',
      isBubbles: false,
      css: `
        body[data-neural-theme="obsidian_gold"] { background: radial-gradient(circle at 50% 20%, #1a1406 0%, #050402 75%) !important; }
        body[data-neural-theme="obsidian_gold"] .glass-panel,
        body[data-neural-theme="obsidian_gold"] [id$="-widget"],
        body[data-neural-theme="obsidian_gold"] #asset-terminal-card,
        body[data-neural-theme="obsidian_gold"] #hud-wrapper-tab {
          border-color: rgba(245, 158, 11, 0.55) !important;
          box-shadow: 0 0 26px rgba(245, 158, 11, 0.18), inset 0 0 12px rgba(251, 191, 36, 0.08) !important;
        }
      `
    },
    {
      id: 'matrix_terminal',
      name: '💚 Matrix Terminal',
      desc: 'Emerald Quant Terminal',
      isBubbles: false,
      css: `
        body[data-neural-theme="matrix_terminal"] { background: radial-gradient(circle at 50% 50%, #021a0d 0%, #010804 80%) !important; }
        body[data-neural-theme="matrix_terminal"] .glass-panel,
        body[data-neural-theme="matrix_terminal"] [id$="-widget"],
        body[data-neural-theme="matrix_terminal"] #asset-terminal-card,
        body[data-neural-theme="matrix_terminal"] #hud-wrapper-tab {
          border-color: rgba(16, 185, 129, 0.55) !important;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.20) !important;
        }
      `
    },
    {
      id: 'liquid_aurora',
      name: '🌌 Liquid Aurora',
      desc: 'Violet & Teal Northern Glow',
      isBubbles: false,
      css: `
        body[data-neural-theme="liquid_aurora"] { background: linear-gradient(135deg, #071626 0%, #140826 50%, #041c1a 100%) !important; }
        body[data-neural-theme="liquid_aurora"] .glass-panel,
        body[data-neural-theme="liquid_aurora"] [id$="-widget"],
        body[data-neural-theme="liquid_aurora"] #asset-terminal-card,
        body[data-neural-theme="liquid_aurora"] #hud-wrapper-tab {
          border-color: rgba(139, 92, 246, 0.55) !important;
          box-shadow: 0 0 28px rgba(45, 212, 191, 0.18), inset 0 0 14px rgba(139, 92, 246, 0.12) !important;
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
    bubbles = nodes.map((n, i) => {
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
    if (neuralCanvas) neuralCanvas.style.opacity = '0.08';

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

      // Update physics & soft collisions
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const chg = Number(b.asset.change || 0);
        b.targetR = Math.max(30, Math.min(74, 34 + Math.abs(chg) * 3.8 + (b.nodeIdx < 12 ? 7 : 0)));
        b.r += (b.targetR - b.r) * 0.05;
        b.phase += 0.015;

        b.x += b.vx + Math.sin(b.phase) * 0.15;
        b.y += b.vy + Math.cos(b.phase) * 0.15;

        // Keep inside viewport bounds
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

      // Draw glossy Crypto Bubbles
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

        // Symbol & % text
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

    // Highlight active button inside Admin Panel
    document.querySelectorAll('.admin-theme-btn').forEach(btn => {
      const active = btn.dataset.themeId === activeTheme;
      btn.style.borderColor = active ? '#22d3ee' : 'rgba(56, 189, 248, 0.25)';
      btn.style.background = active ? 'rgba(34, 211, 238, 0.20)' : 'rgba(15, 23, 42, 0.85)';
    });

    if (!silent && window.showToast) {
      window.showToast(`Theme Switched: ${found.name}`, '🎨');
    }
  }

  // ---------------- INJECT ADMIN-ONLY THEME SWITCHER ----------------
  function injectAdminThemeControls() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-theme-switcher-box')) return;

    const box = document.createElement('div');
    box.id = 'admin-theme-switcher-box';
    box.className = 'p-3 rounded-xl bg-slate-950/90 border border-cyan-500/35 space-y-2 mb-3';
    box.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold tracking-wider text-cyan-300 uppercase">🎨 Admin Theme & Interface</span>
        <span class="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">ADMIN ONLY</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        ${THEMES.map(t => `
          <button type="button" data-theme-id="${t.id}" class="admin-theme-btn text-left p-2 rounded-lg border transition-all hover:border-cyan-400">
            <div class="text-[10px] font-bold text-white">${t.name}</div>
            <div class="text-[8px] text-cyan-200/70 leading-tight">${t.desc}</div>
          </button>
        `).join('')}
      </div>
    `;

    // Insert right inside admin panel body (before user list)
    const usersList = document.getElementById('admin-users-list');
    if (usersList && usersList.parentElement) {
      usersList.parentElement.insertBefore(box, usersList);
    } else {
      adminPanel.appendChild(box);
    }

    box.querySelectorAll('.admin-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeId));
    });
  }

  window.addEventListener('load', () => {
    injectThemeStyles();
    injectAdminThemeControls();
    setTimeout(() => applyTheme(activeTheme, true), 450);
  });

  return { applyTheme, getActiveTheme: () => activeTheme };
})();
