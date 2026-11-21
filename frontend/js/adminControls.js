/**
 * ADMIN COMMAND CENTER — PRO CONTROLS MODULE
 * Auto-injects Broadcast Banner, Signal Engine Tuning, System Status & Quick Actions into #admin-panel.
 */
window.NeuralAdminControls = (function () {
  const SETTINGS_KEY = 'neural_admin_global_settings';

  const defaultSettings = {
    announcement: '',
    minConfidence: 75,
    rrMode: 'balanced', // conservative | balanced | sniper
    signalsPaused: false
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...defaultSettings, ...saved };
    } catch (_) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(next) {
    const merged = { ...loadSettings(), ...next };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    window.NEURAL_ADMIN_SETTINGS = merged;
    renderBroadcastBanner(merged.announcement);
    return merged;
  }

  // ---------------- GLOBAL ANNOUNCEMENT BANNER ----------------
  function renderBroadcastBanner(message) {
    let banner = document.getElementById('neural-admin-broadcast-banner');
    const cleanMsg = String(message || '').trim();

    if (!cleanMsg) {
      if (banner) banner.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'neural-admin-broadcast-banner';
      banner.style.cssText = [
        'position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:9980', 'max-width:90vw', 'padding:7px 16px', 'border-radius:999px',
        'background:linear-gradient(90deg, rgba(8,20,38,0.95), rgba(30,10,48,0.95))',
        'border:1px solid rgba(251,191,36,0.65)', 'color:#fef08a',
        'font-family:"JetBrains Mono",monospace', 'font-size:11px', 'font-weight:700',
        'box-shadow:0 0 22px rgba(251,191,36,0.28)', 'backdrop-filter:blur(10px)',
        'display:flex', 'align-items:center', 'gap:8px'
      ].join(';');
      document.body.appendChild(banner);
    }

    banner.innerHTML = `<span>📢</span><span>${cleanMsg.replace(/</g, '&lt;')}</span>`;
  }

  // ---------------- LIVE BACKEND HEALTH CHECK ----------------
  async function checkBackendHealth(statusEl) {
    if (!statusEl) return;
    try {
      const base = window.NEURAL_CONFIG?.API_BASE_URL || '';
      const resp = await fetch(`${base}/api/market/news`);
      if (resp.ok) {
        statusEl.textContent = '● ONLINE';
        statusEl.style.color = '#34d399';
      } else {
        statusEl.textContent = '● DEGRADED';
        statusEl.style.color = '#fbbf24';
      }
    } catch (_) {
      statusEl.textContent = '● OFFLINE';
      statusEl.style.color = '#fb7185';
    }
  }

  // ---------------- EXPORT TRADE LOGS ----------------
  function exportTradeLogs() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /neural|pnl|trade/i.test(k)) {
        try { data[k] = JSON.parse(localStorage.getItem(k)); }
        catch (_) { data[k] = localStorage.getItem(k); }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural-trading-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('Trade Logs & Settings Exported!', '💾');
  }

  // ---------------- INJECT CONTROLS INTO #admin-panel ----------------
  function injectAdminControls() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-pro-controls-box')) return;

    const settings = loadSettings();
    window.NEURAL_ADMIN_SETTINGS = settings;

    const box = document.createElement('div');
    box.id = 'admin-pro-controls-box';
    box.style.cssText = 'padding:10px; border-radius:12px; background:rgba(2,6,23,0.92); border:1px solid rgba(56,189,248,0.38); margin-bottom:10px; display:flex; flex-direction:column; gap:10px; font-family:"JetBrains Mono",monospace;';

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:10px; font-weight:800; color:#67e8f9;">⚙️ ADMIN COMMAND CENTER</span>
        <span id="admin-api-health-badge" style="font-size:9px; font-weight:800; color:#fbbf24;">● CHECKING</span>
      </div>

      <!-- 1. Global Broadcast Announcement -->
      <div style="display:flex; flex-direction:column; gap:5px;">
        <label style="font-size:9px; color:#94a3b8; font-weight:700;">📢 GLOBAL ANNOUNCEMENT BANNER</label>
        <div style="display:flex; gap:5px;">
          <input id="admin-broadcast-input" type="text" placeholder="e.g. FOMC in 15m — Trade Safe!"
            value="${settings.announcement.replace(/"/g, '&quot;')}"
            style="flex:1; padding:6px 8px; border-radius:7px; background:#0f172a; border:1px solid rgba(56,189,248,0.3); color:#f8fafc; font-size:10px; outline:none;" />
          <button id="admin-broadcast-set-btn" type="button"
            style="padding:6px 9px; border-radius:7px; background:rgba(245,158,11,0.22); border:1px solid rgba(251,191,36,0.6); color:#fde68a; font-size:9px; font-weight:800; cursor:pointer;">SET</button>
          <button id="admin-broadcast-clear-btn" type="button"
            style="padding:6px 8px; border-radius:7px; background:rgba(244,63,94,0.2); border:1px solid rgba(244,63,94,0.5); color:#fda4af; font-size:9px; font-weight:800; cursor:pointer;">✕</button>
        </div>
      </div>

      <!-- 2. Signal Engine Controls -->
      <div style="display:flex; flex-direction:column; gap:6px; padding-top:6px; border-top:1px solid rgba(56,189,248,0.18);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:9px; color:#94a3b8; font-weight:700;">🎯 MIN AI CONFIDENCE</span>
          <span id="admin-conf-val" style="font-size:10px; color:#34d399; font-weight:800;">${settings.minConfidence}%</span>
        </div>
        <input id="admin-conf-slider" type="range" min="60" max="95" step="5" value="${settings.minConfidence}"
          style="width:100%; accent-color:#22d3ee; cursor:pointer;" />

        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:2px;">
          <span style="font-size:9px; color:#94a3b8; font-weight:700;">⚖️ R:R MODE</span>
          <select id="admin-rr-mode-select"
            style="padding:4px 8px; border-radius:6px; background:#0f172a; border:1px solid rgba(56,189,248,0.35); color:#e2e8f0; font-size:9px; font-weight:700;">
            <option value="conservative" ${settings.rrMode === 'conservative' ? 'selected' : ''}>Conservative (1:2)</option>
            <option value="balanced" ${settings.rrMode === 'balanced' ? 'selected' : ''}>Balanced (1:3)</option>
            <option value="sniper" ${settings.rrMode === 'sniper' ? 'selected' : ''}>Sniper Max (1:4+)</option>
          </select>
        </div>

        <button id="admin-toggle-signals-btn" type="button"
          style="margin-top:2px; width:100%; padding:7px; border-radius:8px; font-size:10px; font-weight:800; cursor:pointer; border:1px solid ${settings.signalsPaused ? 'rgba(244,63,94,0.6)' : 'rgba(16,185,129,0.55)'}; background:${settings.signalsPaused ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.18)'}; color:${settings.signalsPaused ? '#fda4af' : '#6ee7b7'};">
          ${settings.signalsPaused ? '⏸️ SIGNALS PAUSED (CLICK TO RESUME)' : '▶️ SIGNALS ACTIVE (CLICK TO PAUSE)'}
        </button>
      </div>

      <!-- 3. Quick System Actions -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; padding-top:6px; border-top:1px solid rgba(56,189,248,0.18);">
        <button id="admin-reset-tabs-btn" type="button"
          style="padding:7px; border-radius:8px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.4); color:#7dd3fc; font-size:9px; font-weight:800; cursor:pointer;">
          🔄 RESET ALL TABS
        </button>
        <button id="admin-export-logs-btn" type="button"
          style="padding:7px; border-radius:8px; background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.45); color:#d8b4fe; font-size:9px; font-weight:800; cursor:pointer;">
          💾 EXPORT LOGS
        </button>
      </div>
    `;

    // Insert right inside Admin Panel
    const usersList = document.getElementById('admin-users-list');
    if (usersList && usersList.parentElement) {
      usersList.parentElement.insertBefore(box, usersList);
    } else {
      adminPanel.appendChild(box);
    }

    // Wire events
    const healthBadge = box.querySelector('#admin-api-health-badge');
    checkBackendHealth(healthBadge);
    setInterval(() => checkBackendHealth(healthBadge), 30000);

    const bInput = box.querySelector('#admin-broadcast-input');
    box.querySelector('#admin-broadcast-set-btn').addEventListener('click', () => {
      saveSettings({ announcement: bInput.value.trim() });
      if (window.showToast) window.showToast('Broadcast Banner Updated!', '📢');
    });
    box.querySelector('#admin-broadcast-clear-btn').addEventListener('click', () => {
      bInput.value = '';
      saveSettings({ announcement: '' });
      if (window.showToast) window.showToast('Broadcast Banner Cleared', '🧹');
    });

    const slider = box.querySelector('#admin-conf-slider');
    const confVal = box.querySelector('#admin-conf-val');
    slider.addEventListener('input', () => {
      confVal.textContent = `${slider.value}%`;
      saveSettings({ minConfidence: Number(slider.value) });
    });

    const rrSelect = box.querySelector('#admin-rr-mode-select');
    rrSelect.addEventListener('change', () => {
      saveSettings({ rrMode: rrSelect.value });
      if (window.showToast) window.showToast(`R:R Mode: ${rrSelect.value.toUpperCase()}`, '⚖️');
    });

    const pauseBtn = box.querySelector('#admin-toggle-signals-btn');
    pauseBtn.addEventListener('click', () => {
      const cur = loadSettings();
      const nextPaused = !cur.signalsPaused;
      saveSettings({ signalsPaused: nextPaused });
      pauseBtn.textContent = nextPaused ? '⏸️ SIGNALS PAUSED (CLICK TO RESUME)' : '▶️ SIGNALS ACTIVE (CLICK TO PAUSE)';
      pauseBtn.style.borderColor = nextPaused ? 'rgba(244,63,94,0.6)' : 'rgba(16,185,129,0.55)';
      pauseBtn.style.background = nextPaused ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.18)';
      pauseBtn.style.color = nextPaused ? '#fda4af' : '#6ee7b7';
      if (window.showToast) window.showToast(nextPaused ? 'Signals Paused by Admin' : 'Signals Resumed!', nextPaused ? '⏸️' : '▶️');
    });

    box.querySelector('#admin-reset-tabs-btn').addEventListener('click', () => {
      document.querySelectorAll('.tab-reset-pos-btn, #pnl-reset-pos-btn, #reset-card-pos-btn').forEach(b => b.click());
      if (window.showToast) window.showToast('All Floating Tabs Reset to Default!', '🔄');
    });

    box.querySelector('#admin-export-logs-btn').addEventListener('click', exportTradeLogs);

    renderBroadcastBanner(settings.announcement);
  }

  window.addEventListener('load', () => {
    setTimeout(injectAdminControls, 300);
  });

  return { loadSettings, saveSettings };
})();
