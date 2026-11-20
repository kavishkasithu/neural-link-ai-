/**
 * TradingView Chart Screenshot AI Vision Module
 * Supports: File Upload, Drag & Drop, and direct Ctrl+V Clipboard Screenshot Paste
 * Sends image to Backend POST /api/vision/analyze-chart -> Recognizes Forex / Crypto / Stock / Gold / Indices -> Generates Signal
 */
window.NeuralChartVision = (function () {
  let selectedFile = null;
  let lastVisionSignal = null;

  function init() {
    const dropzone = document.getElementById('vision-dropzone');
    const fileInput = document.getElementById('vision-file-input');
    const previewWrap = document.getElementById('vision-preview-wrap');
    const previewImg = document.getElementById('vision-preview-img');
    const clearImgBtn = document.getElementById('vision-clear-img-btn');
    const analyzeBtn = document.getElementById('vision-analyze-btn');
    const logPnlBtn = document.getElementById('vision-log-pnl-btn');
    const sendRrBtn = document.getElementById('vision-send-rr-btn');
    const copyPairBtn = document.getElementById('vision-copy-pair-btn');

    if (!dropzone || !fileInput) return;

    function handleImageFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        if (window.showToast) window.showToast('Please select a valid chart image (PNG/JPG/WEBP)', '⚠️');
        return;
      }
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewWrap.classList.remove('hidden');
        document.getElementById('vision-drop-placeholder').classList.add('hidden');
        analyzeBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#vision-clear-img-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    // Global Ctrl+V Paste for instant TradingView Screenshots
    window.addEventListener('paste', (e) => {
      const protectedUI = document.getElementById('protected-website-ui');
      if (!protectedUI || protectedUI.classList.contains('hidden')) return;
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            handleImageFile(blob);
            // Auto-expand Vision tab if minimized
            const body = document.getElementById('vision-widget-body');
            if (body) body.classList.remove('hidden');
            if (window.showToast) window.showToast('TradingView Chart Pasted! Click ANALYZE CHART', '📷');
          }
          break;
        }
      }
    });

    if (clearImgBtn) {
      clearImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        previewImg.src = '';
        previewWrap.classList.add('hidden');
        document.getElementById('vision-drop-placeholder').classList.remove('hidden');
        document.getElementById('vision-result-box').classList.add('hidden');
      });
    }

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) {
          if (window.showToast) window.showToast('Upload or Paste (Ctrl+V) a TradingView chart first!', '📷');
          return;
        }

        const statusEl = document.getElementById('vision-status-text');
        const resultBox = document.getElementById('vision-result-box');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span>⏳</span><span>AI SCANNING CHART...</span>';
        if (statusEl) {
          statusEl.textContent = 'Detecting Pair (Forex/Crypto/Stock), Structure & Liquidity...';
          statusEl.classList.remove('hidden');
        }

        try {
          const formData = new FormData();
          formData.append('chartImage', selectedFile);
          formData.append('marketHint', document.getElementById('vision-market-hint')?.value || 'AUTO DETECT');
          formData.append('tradeStyle', document.getElementById('vision-trade-style')?.value || 'Intraday Sniper');
          formData.append('maxEntryDistPct', String(window.NeuralPnlManager?.getMaxEntryDistancePct() || 0.25));

          const resp = await fetch(`${window.NEURAL_CONFIG.API_BASE_URL}/api/vision/analyze-chart`, {
            method: 'POST',
            body: formData
          });
          const data = await resp.json();

          if (!resp.ok || !data.ok) {
            throw new Error(data.error || 'Vision API request failed');
          }

          lastVisionSignal = data.signal;
          renderVisionSignal(lastVisionSignal);
          resultBox.classList.remove('hidden');
          if (statusEl) statusEl.classList.add('hidden');

          // Pulse the Neural Canvas GREEN (Buy) or RED (Sell)
          const isLong = String(lastVisionSignal.direction || '').toUpperCase().includes('BUY');
          const isSell = String(lastVisionSignal.direction || '').toUpperCase().includes('SELL');
          if (window.NeuralCanvasEngine && (isLong || isSell)) {
            window.NeuralCanvasEngine.setNeuralColorMode(isLong ? 'green_buy' : 'red_sell', {
              symbol: lastVisionSignal.pair,
              direction: lastVisionSignal.direction,
              confidence: lastVisionSignal.confidence,
              entryPrice: lastVisionSignal.entryPrice,
              tp1Price: lastVisionSignal.tp1Price,
              tp2Price: lastVisionSignal.tp2Price,
              slPrice: lastVisionSignal.slPrice
            });
          }

          if (window.showToast) {
            window.showToast(`AI Detected ${lastVisionSignal.pair} (${lastVisionSignal.assetClass}) — ${lastVisionSignal.direction}`, isLong ? '🚀' : '🔻');
          }
        } catch (err) {
          if (statusEl) {
            statusEl.textContent = `❌ ${err.message}`;
            statusEl.classList.remove('hidden');
          }
          if (window.showToast) window.showToast(err.message, '⚠️');
        } finally {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = '<span>🧠</span><span>ANALYZE CHART & GET SIGNAL</span>';
        }
      });
    }

    if (logPnlBtn) {
      logPnlBtn.addEventListener('click', () => {
        if (!lastVisionSignal) return;
        const isLong = String(lastVisionSignal.direction || '').toUpperCase().includes('BUY');
        window.NeuralPnlManager.logTrade({
          symbol: lastVisionSignal.pair,
          assetClass: lastVisionSignal.assetClass,
          source: 'TV_VISION',
          isLong,
          entryPrice: lastVisionSignal.entryPrice,
          tp1Price: lastVisionSignal.tp1Price,
          tp2Price: lastVisionSignal.tp2Price,
          slPrice: lastVisionSignal.slPrice,
          entryDistancePct: lastVisionSignal.entryDistancePct || 0
        });
        if (window.showToast) window.showToast(`Logged ${lastVisionSignal.pair} to Daily & Monthly P&L!`, '✅');
      });
    }

    if (sendRrBtn) {
      sendRrBtn.addEventListener('click', () => {
        if (!lastVisionSignal || !window.openRRCalculatorWithSignal) return;
        window.openRRCalculatorWithSignal(lastVisionSignal);
      });
    }

    if (copyPairBtn) {
      copyPairBtn.addEventListener('click', () => {
        if (!lastVisionSignal) return;
        window.copyCoinSymbolToClipboard(lastVisionSignal.pair);
      });
    }
  }

  function renderVisionSignal(sig) {
    const isLong = String(sig.direction || '').toUpperCase().includes('BUY');
    const isNear = String(sig.entryProximity || '').toUpperCase().includes('NEAR');

    document.getElementById('vis-pair').textContent = sig.pair || 'UNKNOWN';
    document.getElementById('vis-class-badge').textContent = `${sig.assetClass || 'MARKET'} • ${sig.timeframe || 'TF'}`;

    const dirEl = document.getElementById('vis-dir-badge');
    dirEl.textContent = `${sig.direction || 'SIGNAL'} • ${sig.confidence || 88}%`;
    dirEl.className = isLong
      ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white border border-emerald-300'
      : 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white border border-rose-300';

    const proxEl = document.getElementById('vis-proximity-badge');
    proxEl.textContent = `${isNear ? '🎯' : '⏳'} ${sig.entryProximity || 'NEAR ENTRY'} (${Number(sig.entryDistancePct || 0).toFixed(2)}%)`;
    proxEl.className = isNear
      ? 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold'
      : 'text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold';

    document.getElementById('vis-entry').textContent = window.formatPrice(sig.entryPrice);
    document.getElementById('vis-tp1').textContent = window.formatPrice(sig.tp1Price);
    document.getElementById('vis-tp2').textContent = window.formatPrice(sig.tp2Price);
    document.getElementById('vis-sl').textContent = window.formatPrice(sig.slPrice);
    document.getElementById('vis-rr').textContent = `R:R ${sig.riskReward || '1:2'} • ${sig.setupType || 'SMC Structure'}`;
    document.getElementById('vis-reasoning').textContent = `${sig.aiEngine || 'AI Vision'}: ${sig.reasoning || ''}`;
  }

  return { init };
})();
