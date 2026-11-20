/**
 * Near-Entry Sniper Filter + Daily Auto-Reset Trading Summary + Monthly P&L Report
 * Syncs with Backend API (/api/pnl/*) with automatic LocalStorage fallback.
 */
window.NeuralPnlManager = (function () {
  const LS_DAILY = 'neural_daily_pnl_v3';
  const LS_MONTHLY = 'neural_monthly_pnl_v3';

  let maxEntryDistancePct = 0.25;
  let hideFarDotsOnCanvas = true;

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  let dailySummary = {
    date: getTodayKey(),
    totalSignals: 0,
    wins: 0,
    losses: 0,
    buyCount: 0,
    sellCount: 0,
    realizedPnlPct: 0,
    trades: []
  };

  let monthlyReport = {
    month: getMonthKey(),
    days: {}
  };

  async function load() {
    // 1. Try Backend first
    try {
      const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/pnl/summary`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.dailySummary) dailySummary = data.dailySummary;
        if (data.ok && data.monthlyReport) monthlyReport = data.monthlyReport;
        persistLocalOnly();
        renderUI();
        return;
      }
    } catch (_) {}

    // 2. Fallback to LocalStorage
    try {
      const dRaw = localStorage.getItem(LS_DAILY);
      if (dRaw) {
        const parsed = JSON.parse(dRaw);
        if (parsed && parsed.date === getTodayKey()) dailySummary = parsed;
      }
      const mRaw = localStorage.getItem(LS_MONTHLY);
      if (mRaw) {
        const parsedM = JSON.parse(mRaw);
        if (parsedM && parsedM.month === getMonthKey()) monthlyReport = parsedM;
      }
    } catch (_) {}

    syncTodayIntoMonth();
    renderUI();
  }

  function persistLocalOnly() {
    try {
      localStorage.setItem(LS_DAILY, JSON.stringify(dailySummary));
      localStorage.setItem(LS_MONTHLY, JSON.stringify(monthlyReport));
    } catch (_) {}
  }

  async function save() {
    syncTodayIntoMonth();
    persistLocalOnly();
    try {
      await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/pnl/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailySummary, monthlyReport })
      });
    } catch (_) {}
  }

  function syncTodayIntoMonth() {
    const mKey = getMonthKey();
    if (monthlyReport.month !== mKey) {
      monthlyReport = { month: mKey, days: {} };
    }
    let floatingPct = 0;
    const nodesRef = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
    dailySummary.trades.filter(t => t.status === 'OPEN').forEach(tr => {
      const node = nodesRef.find(n => !n.isAnchor && n.asset && n.asset.symbol === tr.symbol);
      if (node && node.asset) {
        floatingPct += tr.isLong
          ? ((node.asset.price - tr.entryPrice) / tr.entryPrice) * 100
          : ((tr.entryPrice - node.asset.price) / tr.entryPrice) * 100;
      }
    });

    monthlyReport.days[dailySummary.date] = {
      trades: dailySummary.totalSignals,
      wins: dailySummary.wins,
      losses: dailySummary.losses,
      buyCount: dailySummary.buyCount,
      sellCount: dailySummary.sellCount,
      netPnlPct: +(dailySummary.realizedPnlPct + floatingPct).toFixed(2)
    };
  }

  function checkMidnightReset() {
    const today = getTodayKey();
    if (dailySummary.date !== today) {
      syncTodayIntoMonth();
      dailySummary = {
        date: today,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        buyCount: 0,
        sellCount: 0,
        realizedPnlPct: 0,
        trades: []
      };
      save();
      renderUI();
      if (window.showToast) window.showToast('Midnight Reset — Daily Summary archived to Monthly P&L!', '🌅');
    }

    const el = document.getElementById('daily-reset-countdown');
    if (el) {
      const now = new Date();
      const nextMid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const sec = Math.max(0, Math.floor((nextMid - now) / 1000));
      const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
      const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      el.textContent = `RESET ${hh}:${mm}:${ss}`;
    }
  }

  function getNodeProximity(node) {
    if (!node || !node.asset) return { entryRef: 0, distPct: 999, isNear: false };
    const price = Number(node.asset.price || 0);
    if (price <= 0) return { entryRef: 0, distPct: 999, isNear: false };

    if (!node.entryZoneAnchor || Math.abs(price - node.entryZoneAnchor) / price > 0.03) {
      const offset = ((node.index % 7) - 3) * 0.0007;
      node.entryZoneAnchor = price * (1 + offset);
    }

    const entryRef = node.lastSignal ? node.lastSignal.entryPrice : node.entryZoneAnchor;
    const distPct = (Math.abs(price - entryRef) / entryRef) * 100;
    return { entryRef, distPct, isNear: distPct <= maxEntryDistancePct };
  }

  function logTrade(trade) {
    checkMidnightReset();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dailySummary.totalSignals++;
    if (trade.isLong) dailySummary.buyCount++;
    else dailySummary.sellCount++;

    dailySummary.trades.unshift({
      id: Date.now(),
      symbol: trade.symbol,
      assetClass: trade.assetClass || 'CRYPTO',
      source: trade.source || 'SCANNER',
      isLong: !!trade.isLong,
      entryPrice: Number(trade.entryPrice),
      tp1Price: Number(trade.tp1Price),
      tp2Price: Number(trade.tp2Price),
      slPrice: Number(trade.slPrice),
      currentDistPct: Number(trade.entryDistancePct || 0),
      status: 'OPEN',
      pnlPct: 0,
      time: nowStr
    });

    save();
    renderUI();
  }

  function markTradeResult(tradeId, outcome) {
    const tr = dailySummary.trades.find(t => t.id === tradeId);
    if (!tr || tr.status !== 'OPEN') return;

    if (outcome === 'WIN') {
      tr.status = 'WIN';
      tr.pnlPct = tr.isLong
        ? +(((tr.tp1Price - tr.entryPrice) / tr.entryPrice) * 100).toFixed(2)
        : +(((tr.entryPrice - tr.tp1Price) / tr.entryPrice) * 100).toFixed(2);
      dailySummary.wins++;
    } else {
      tr.status = 'LOSS';
      tr.pnlPct = tr.isLong
        ? -Number(Math.abs(((tr.entryPrice - tr.slPrice) / tr.entryPrice) * 100).toFixed(2))
        : -Number(Math.abs(((tr.slPrice - tr.entryPrice) / tr.entryPrice) * 100).toFixed(2));
      dailySummary.losses++;
    }
    dailySummary.realizedPnlPct = +(dailySummary.realizedPnlPct + tr.pnlPct).toFixed(2);
    save();
    renderUI();
  }

  function evaluateNearEntriesAndOpenTrades() {
    const nodesRef = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getNodes() : [];
    const activeSigIdx = window.NeuralCanvasEngine ? window.NeuralCanvasEngine.getActiveSignaledIndex() : -1;

    let nearCount = 0;
    nodesRef.forEach(node => {
      if (node.isAnchor || !node.asset) return;
      const prox = getNodeProximity(node);
      node.entryDistPct = prox.distPct;
      node.isNearEntry = prox.isNear;

      if (node._origR === undefined && node.r > 0) node._origR = node.r;
      if (!node.isCore && node._origR !== undefined) {
        node.r = (hideFarDotsOnCanvas && !prox.isNear && node.index !== activeSigIdx) ? 0 : node._origR;
      }

      if (node.lastSignal && prox.distPct > maxEntryDistancePct * 1.6) {
        delete node.lastSignal;
      }
      if (prox.isNear) nearCount++;
    });

    const lbl = document.getElementById('near-entry-count-label');
    if (lbl) lbl.innerHTML = `<strong class="text-emerald-300">${nearCount} Coins</strong> near Entry (≤ ${maxEntryDistancePct}%)`;

    let changed = false;
    for (let i = dailySummary.trades.length - 1; i >= 0; i--) {
      const tr = dailySummary.trades[i];
      if (tr.status !== 'OPEN' || tr.source === 'TV_VISION') continue;

      const node = nodesRef.find(n => !n.isAnchor && n.asset && n.asset.symbol === tr.symbol);
      if (!node) continue;

      const liveP = node.asset.price;
      const distPct = (Math.abs(liveP - tr.entryPrice) / tr.entryPrice) * 100;

      if (tr.isLong) {
        if (liveP >= tr.tp1Price) {
          tr.status = 'WIN';
          tr.pnlPct = +(((tr.tp1Price - tr.entryPrice) / tr.entryPrice) * 100).toFixed(2);
          dailySummary.wins++;
          dailySummary.realizedPnlPct = +(dailySummary.realizedPnlPct + tr.pnlPct).toFixed(2);
          changed = true;
          continue;
        }
        if (liveP <= tr.slPrice) {
          tr.status = 'LOSS';
          tr.pnlPct = -Number((((tr.entryPrice - tr.slPrice) / tr.entryPrice) * 100).toFixed(2));
          dailySummary.losses++;
          dailySummary.realizedPnlPct = +(dailySummary.realizedPnlPct + tr.pnlPct).toFixed(2);
          changed = true;
          continue;
        }
      } else {
        if (liveP <= tr.tp1Price) {
          tr.status = 'WIN';
          tr.pnlPct = +(((tr.entryPrice - tr.tp1Price) / tr.entryPrice) * 100).toFixed(2);
          dailySummary.wins++;
          dailySummary.realizedPnlPct = +(dailySummary.realizedPnlPct + tr.pnlPct).toFixed(2);
          changed = true;
          continue;
        }
        if (liveP >= tr.slPrice) {
          tr.status = 'LOSS';
          tr.pnlPct = -Number((((tr.slPrice - tr.entryPrice) / tr.entryPrice) * 100).toFixed(2));
          dailySummary.losses++;
          dailySummary.realizedPnlPct = +(dailySummary.realizedPnlPct + tr.pnlPct).toFixed(2);
          changed = true;
          continue;
        }
      }

      tr.currentDistPct = distPct;
      if (distPct > maxEntryDistancePct * 1.5) {
        dailySummary.trades.splice(i, 1);
        dailySummary.totalSignals = Math.max(0, dailySummary.totalSignals - 1);
        if (tr.isLong) dailySummary.buyCount = Math.max(0, dailySummary.buyCount - 1);
        else dailySummary.sellCount = Math.max(0, dailySummary.sellCount - 1);
        changed = true;
      }
    }

    if (changed) save();
    else syncTodayIntoMonth();
    renderUI();
  }

  function renderUI() {
    const dateEl = document.getElementById('daily-summary-date');
    if (dateEl) dateEl.textContent = dailySummary.date;
    const mBadge = document.getElementById('ms-month-badge');
    if (mBadge) mBadge.textContent = monthlyReport.month;

    const openTrades = dailySummary.trades.filter(t => t.status === 'OPEN');
    const closed = dailySummary.wins + dailySummary.losses;
    const winRate = closed > 0 ? ((dailySummary.wins / closed) * 100).toFixed(1) : (dailySummary.totalSignals > 0 ? '100.0' : '0.0');

    const todayRec = monthlyReport.days[dailySummary.date] || { netPnlPct: dailySummary.realizedPnlPct };
    const netPct = Number(todayRec.netPnlPct || 0);
    const capital = parseFloat(document.getElementById('rr-capital')?.value || '100') || 100;
    const estUsd = capital * (netPct / 100);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('ds-total-trades', String(dailySummary.totalSignals));
    setText('ds-open-trades', `${openTrades.length} Near`);
    setText('ds-win-loss', `${dailySummary.wins}W / ${dailySummary.losses}L`);
    setText('ds-buy-sell', `${dailySummary.buyCount}B • ${dailySummary.sellCount}S`);
    setText('ds-win-rate', `${winRate}%`);

    const dPnlEl = document.getElementById('ds-net-pnl');
    if (dPnlEl) {
      dPnlEl.textContent = `${netPct >= 0 ? '+' : ''}${netPct.toFixed(2)}%`;
      dPnlEl.className = netPct >= 0 ? 'text-xs font-extrabold text-emerald-400 mt-0.5' : 'text-xs font-extrabold text-rose-400 mt-0.5';
    }
    setText('ds-net-usd', `${estUsd >= 0 ? '+' : '-'}$${Math.abs(estUsd).toFixed(2)}`);

    // Monthly P&L Aggregation
    const dayRows = Object.entries(monthlyReport.days || {}).sort((a, b) => b[0].localeCompare(a[0]));
    let mTrades = 0, mWins = 0, mLosses = 0, mNet = 0, mBest = 0;
    dayRows.forEach(([, s]) => {
      mTrades += Number(s.trades || 0);
      mWins += Number(s.wins || 0);
      mLosses += Number(s.losses || 0);
      const p = Number(s.netPnlPct || 0);
      mNet += p;
      if (p > mBest) mBest = p;
    });
    mNet = +mNet.toFixed(2);
    const mClosed = mWins + mLosses;
    const mWr = mClosed > 0 ? ((mWins / mClosed) * 100).toFixed(1) : (mTrades > 0 ? '100.0' : '0.0');
    const mUsd = capital * (mNet / 100);

    setText('ms-total-trades', String(mTrades));
    setText('ms-active-days', `${dayRows.length} Day(s)`);
    setText('ms-win-loss', `${mWins}W / ${mLosses}L`);
    setText('ms-win-rate', `${mWr}% WR`);
    setText('ms-best-day', `+${mBest.toFixed(2)}%`);
    const mPnlEl = document.getElementById('ms-net-pnl');
    if (mPnlEl) {
      mPnlEl.textContent = `${mNet >= 0 ? '+' : ''}${mNet.toFixed(2)}%`;
      mPnlEl.className = mNet >= 0 ? 'text-xs font-extrabold text-emerald-400 mt-0.5' : 'text-xs font-extrabold text-rose-400 mt-0.5';
    }
    setText('ms-net-usd', `${mUsd >= 0 ? '+' : '-'}$${Math.abs(mUsd).toFixed(2)}`);

    const msList = document.getElementById('ms-days-breakdown-list');
    if (msList) {
      msList.innerHTML = dayRows.map(([dateStr, s]) => {
        const p = Number(s.netPnlPct || 0);
        const u = capital * (p / 100);
        const pos = p >= 0;
        const barW = Math.min(100, Math.max(8, Math.abs(p) * 16));
        return `
          <div class="p-1.5 rounded-lg bg-slate-950/85 border border-cyan-500/20 space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-100">${dateStr}</span>
              <span class="text-cyan-300/75">${s.trades || 0} Tr (${s.wins || 0}W/${s.losses || 0}L)</span>
              <span class="font-extrabold ${pos ? 'text-emerald-300' : 'text-rose-300'}">
                ${pos ? '+' : ''}${p.toFixed(2)}% (${pos ? '+' : '-'}$${Math.abs(u).toFixed(2)})
              </span>
            </div>
            <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <div class="h-full ${pos ? 'bg-emerald-400' : 'bg-rose-400'}" style="width:${barW}%"></div>
            </div>
          </div>`;
      }).join('');
    }

    const logList = document.getElementById('ds-trades-log-list');
    if (logList) {
      if (!dailySummary.trades.length) {
        logList.innerHTML = `<div class="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-center text-cyan-200/60 text-[10px]">No trades logged today. Generate a signal or upload a TradingView chart!</div>`;
      } else {
        logList.innerHTML = dailySummary.trades.slice(0, 14).map(tr => {
          const sideTag = tr.isLong
            ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold text-[8px]">BUY</span>'
            : '<span class="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-400/40 font-bold text-[8px]">SELL</span>';
          const srcTag = tr.source === 'TV_VISION'
            ? '<span class="px-1 py-0.5 rounded bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 text-[7px] font-bold">TV AI</span>'
            : '';

          let statusHtml = '';
          if (tr.status === 'WIN') {
            statusHtml = `<span class="px-1.5 py-0.5 rounded bg-emerald-600/40 text-emerald-200 border border-emerald-400 font-bold text-[8px]">✅ +${tr.pnlPct}%</span>`;
          } else if (tr.status === 'LOSS') {
            statusHtml = `<span class="px-1.5 py-0.5 rounded bg-rose-600/40 text-rose-200 border border-rose-400 font-bold text-[8px]">🛑 ${tr.pnlPct}%</span>`;
          } else {
            statusHtml = `
              <button type="button" onclick="window.NeuralPnlManager.markTradeResult(${tr.id}, 'WIN')" class="px-1 py-0.5 rounded bg-emerald-500/25 hover:bg-emerald-500/50 text-emerald-200 border border-emerald-400/40 text-[8px] font-bold">TP ✓</button>
              <button type="button" onclick="window.NeuralPnlManager.markTradeResult(${tr.id}, 'LOSS')" class="px-1 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/50 text-rose-200 border border-rose-400/40 text-[8px] font-bold">SL ✕</button>`;
          }

          return `
            <div class="p-2 rounded-lg bg-slate-950/90 border border-cyan-500/25 flex items-center justify-between gap-1.5">
              <div class="flex items-center gap-1 min-w-0">
                ${sideTag}${srcTag}
                <span class="font-bold text-white truncate">${tr.symbol}</span>
                <span class="text-cyan-300/70 text-[9px]">@${window.formatPrice(tr.entryPrice)}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${statusHtml}
                <span class="text-[8px] text-cyan-200/50">${tr.time}</span>
              </div>
            </div>`;
        }).join('');
      }
    }
  }

  function wireControls() {
    const sel = document.getElementById('near-entry-threshold-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        maxEntryDistancePct = parseFloat(e.target.value) || 0.25;
        evaluateNearEntriesAndOpenTrades();
        if (window.showToast) window.showToast(`Near-Entry Filter: ≤ ${maxEntryDistancePct.toFixed(2)}%`, '🎯');
      });
    }

    const chk = document.getElementById('hide-far-dots-checkbox');
    if (chk) {
      chk.addEventListener('change', (e) => {
        hideFarDotsOnCanvas = !!e.target.checked;
        evaluateNearEntriesAndOpenTrades();
      });
    }

    const resetDayBtn = document.getElementById('manual-reset-daily-btn');
    if (resetDayBtn) {
      resetDayBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dailySummary = {
          date: getTodayKey(), totalSignals: 0, wins: 0, losses: 0,
          buyCount: 0, sellCount: 0, realizedPnlPct: 0, trades: []
        };
        await save();
        try { await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/pnl/reset-day`, { method: 'POST' }); } catch (_) {}
        renderUI();
        if (window.showToast) window.showToast('Daily Trading Summary Reset!', '🗑️');
      });
    }

    const resetMonthBtn = document.getElementById('ms-reset-month-btn');
    if (resetMonthBtn) {
      resetMonthBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        monthlyReport = { month: getMonthKey(), days: {} };
        await save();
        try { await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/pnl/reset-month`, { method: 'POST' }); } catch (_) {}
        renderUI();
        if (window.showToast) window.showToast('Monthly P&L Report Cleared!', '🗑️');
      });
    }

    // Individual Sub-Tab Minimize Toggles under PnL Report
    document.querySelectorAll('[data-subtab-toggle]').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = document.getElementById(header.getAttribute('data-subtab-toggle'));
        const arrow = header.querySelector('.subtab-arrow');
        if (target) {
          const isHidden = target.classList.toggle('hidden');
          if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
        }
      });
    });

    // Master Minimize / Expand All Sub-Tabs Button
    let allMin = false;
    const minAllBtn = document.getElementById('pnl-collapse-all-subtabs-btn');
    if (minAllBtn) {
      minAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        allMin = !allMin;
        ['subtab-near-filter', 'subtab-daily-pnl', 'subtab-monthly-pnl', 'subtab-trade-log'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.toggle('hidden', allMin);
        });
        document.querySelectorAll('#daily-trading-summary-widget .subtab-arrow').forEach(a => {
          a.textContent = allMin ? '▲' : '▼';
        });
        minAllBtn.textContent = allMin ? 'EXPAND SUB-TABS' : 'MINIMIZE SUB-TABS';
      });
    }
  }

  return {
    load,
    wireControls,
    checkMidnightReset,
    evaluateNearEntriesAndOpenTrades,
    getNodeProximity,
    logTrade,
    markTradeResult,
    getMaxEntryDistancePct: () => maxEntryDistancePct
  };
})();
