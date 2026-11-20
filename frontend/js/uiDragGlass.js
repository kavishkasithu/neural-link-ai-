/**
 * Universal Draggable & Minimizable Liquid Glass Tab Controller
 */
window.NeuralTabManager = (function () {
  let topZ = 30;

  function makeDraggable(tabEl, options = {}) {
    if (!tabEl || tabEl.dataset.dragBound === 'true') return;
    tabEl.dataset.dragBound = 'true';
    tabEl.classList.add('draggable-card', 'liquid-glass-tab');

    const defaultPos = {
      top: options.defaultTop ?? tabEl.style.top,
      left: options.defaultLeft ?? tabEl.style.left,
      right: options.defaultRight ?? tabEl.style.right,
      bottom: options.defaultBottom ?? tabEl.style.bottom,
      transform: options.defaultTransform ?? ''
    };

    let isDragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    function startDrag(clientX, clientY, target) {
      if (target && target.closest('button, input, select, a, textarea, label')) return;
      topZ++;
      tabEl.style.zIndex = String(topZ);

      const rect = tabEl.getBoundingClientRect();
      isDragging = true;
      startX = clientX;
      startY = clientY;
      origLeft = rect.left;
      origTop = rect.top;

      tabEl.style.bottom = 'auto';
      tabEl.style.right = 'auto';
      tabEl.style.transform = 'none';
      tabEl.style.left = `${origLeft}px`;
      tabEl.style.top = `${origTop}px`;
      tabEl.style.transition = 'none';
      document.body.style.cursor = 'grabbing';
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const rect = tabEl.getBoundingClientRect();
      const maxL = Math.max(6, window.innerWidth - rect.width - 6);
      const maxT = Math.max(6, window.innerHeight - rect.height - 6);
      tabEl.style.left = `${Math.min(maxL, Math.max(6, origLeft + dx))}px`;
      tabEl.style.top = `${Math.min(maxT, Math.max(6, origTop + dy))}px`;
    }

    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      tabEl.style.transition = '';
      document.body.style.cursor = '';
    }

    tabEl.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY, e.target));
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        onMove(e.clientX, e.clientY);
      }
    });
    window.addEventListener('mouseup', stopDrag);

    tabEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', stopDrag);

    // Wire Reset Position Button if present
    if (options.resetBtnSelector) {
      const resetBtn = tabEl.querySelector(options.resetBtnSelector);
      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          tabEl.style.top = defaultPos.top || '';
          tabEl.style.left = defaultPos.left || '';
          tabEl.style.right = defaultPos.right || '';
          tabEl.style.bottom = defaultPos.bottom || '';
          tabEl.style.transform = defaultPos.transform || '';
          if (window.showToast) window.showToast('Tab position reset', '📌');
        });
      }
    }

    // Wire Minimize Toggle Button if present
    if (options.minimizeBtnSelector && options.bodySelector) {
      const minBtn = tabEl.querySelector(options.minimizeBtnSelector);
      const bodyEl = tabEl.querySelector(options.bodySelector);
      if (minBtn && bodyEl) {
        minBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const hidden = bodyEl.classList.toggle('hidden');
          minBtn.textContent = hidden ? '▲' : '▼';
        });
      }
    }
  }

  return { makeDraggable };
})();
