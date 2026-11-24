/* Presentation adapter only: do not change the protected engine or canvas memory. */
(() => {
  const app = document.querySelector('#app');
  const viewport = document.querySelector('.viewport');
  const area = document.querySelector('#canvasArea');
  const rails = [...document.querySelectorAll('.rail')];
  const storageKey = 'zgen-hydrogen-rail-layout-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch {}
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const validEdges = ['left', 'right', 'top', 'bottom'];
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(rails.map(r => [r.id, {edge:r.dataset.edge, collapsed:r.dataset.collapsed === 'true'}])))); } catch {}
  }
  for (const rail of rails) {
    const stored = saved[rail.id];
    if (stored && validEdges.includes(stored.edge)) rail.dataset.edge = stored.edge;
    rail.dataset.collapsed = String(stored?.collapsed === true);
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'rail-toggle';
    toggle.textContent = rail.id === 'painting-rail' ? 'Paint' : rail.id === 'drawing-rail' ? 'Draw' : 'View';
    toggle.setAttribute('aria-label', 'Collapse or expand ' + rail.getAttribute('aria-label'));
    toggle.setAttribute('aria-expanded', String(rail.dataset.collapsed !== 'true'));
    toggle.addEventListener('click', () => {
      rail.dataset.collapsed = String(rail.dataset.collapsed !== 'true');
      toggle.setAttribute('aria-expanded', String(rail.dataset.collapsed !== 'true'));
      save(); layout();
    });
    rail.prepend(toggle);
  }
  function layout() {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    const hasTop = rails.some(r => r.dataset.edge === 'top');
    const hasBottom = rails.some(r => r.dataset.edge === 'bottom');
    viewport.style.setProperty('grid-template-rows', `${hasTop ? 52 : 0}px minmax(0,1fr) ${hasBottom ? 52 : 0}px`, 'important');
    area.style.gridRow = '2';
    for (const edge of validEdges) {
      const group = rails.filter(r => r.dataset.edge === edge);
      group.forEach((r, index) => {
        r.style.cssText = '';
        if (edge === 'left' || edge === 'right') {
          const top = hasTop ? 56 : 4;
          const available = Math.max(44, h - top - (hasBottom ? 56 : 4));
          // Share one narrow edge lane; long rails scroll instead of overlapping.
          const slot = available / group.length;
          r.style.setProperty('top', `${top + index * slot}px`);
          r.style.setProperty('bottom', 'auto');
          r.style.maxHeight = `${Math.max(44, slot - 4)}px`;
        } else {
          const slot = Math.max(44, (w - 112) / group.length);
          r.style.left = `${56 + index * slot}px`;
          r.style.right = 'auto'; r.style.width = `${slot - 4}px`;
        }
      });
    }
  }
  const dialog = document.createElement('dialog'); dialog.id = 'rail-dialog';
  dialog.setAttribute('aria-label', 'Tool rail positions');
  dialog.innerHTML = '<h2>Tool rail positions</h2><p>Choose an edge. Tap Paint, Draw or View to collapse that rail.</p>' + rails.map(r => `<label>${r.getAttribute('aria-label')}<select data-rail="${r.id}" aria-label="${r.getAttribute('aria-label')} edge">${validEdges.map(edge => `<option value="${edge}">${edge}</option>`).join('')}</select></label>`).join('') + '<p>Draw opens pencil, ink and tracing tools. View opens canvas controls.</p><button type="button" id="close-rail-dialog">Done</button>';
  app.append(dialog);
  document.querySelector('#rail-settings').addEventListener('click', () => {
    dialog.querySelectorAll('select').forEach(s => s.value = document.getElementById(s.dataset.rail).dataset.edge);
    dialog.showModal();
  });
  dialog.addEventListener('change', e => {
    if (!e.target.matches('select[data-rail]')) return;
    document.getElementById(e.target.dataset.rail).dataset.edge = e.target.value;
    save(); layout(); window.dispatchEvent(new Event('resize'));
  });
  document.querySelector('#close-rail-dialog').addEventListener('click', () => dialog.close());
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-act]');
    if (button) document.querySelector('#drawer').dataset.side = button.closest('.rail')?.dataset.edge === 'right' ? 'right' : 'left';
  });
  let frame;
  function viewportResize() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // Browser pinch zoom remains available for accessibility. Canvas gestures
      // are handled exclusively by the original engine on its existing nodes.
      const visual = window.visualViewport;
      const height = visual && visual.scale === 1 ? visual.height : window.innerHeight;
      document.documentElement.style.setProperty('--visual-height', `${height}px`);
      layout();
    });
  }
  window.addEventListener('resize', viewportResize);
  window.visualViewport?.addEventListener('resize', viewportResize);
  const observer = new ResizeObserver(() => {
    // The engine's existing window resize listener fits CSS width only.
    window.dispatchEvent(new Event('resize'));
  });
  observer.observe(area);

  // C5 / S0 work order #55: five obvious sizes for every native mark-making
  // brush. This adapter NEVER replaces the original painter/pointer pipeline.
  const sizeSteps = Object.freeze({XS:3,S:10,M:22,L:45,XL:80});
  const savedToolSizes = Object.create(null);
  const sizeStorageKey = 'zgen-private-native-per-tool-size-v1';
  try {
    const data = JSON.parse(localStorage.getItem(sizeStorageKey) || '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [brush, size] of Object.entries(data).slice(0,64)) {
        if (/^[a-z][a-z0-9_-]{0,47}$/i.test(brush) &&
            Number.isInteger(size) && size >= 1 && size <= 100)
          savedToolSizes[brush] = size;
      }
    }
  } catch {} // Browser storage restrictions must not disable painting.
  const sizeBar = document.createElement('div');
  sizeBar.className = 'zgen-size-strip';
  sizeBar.setAttribute('role','group');
  sizeBar.setAttribute('aria-label','Brush and pencil size, extra small through extra large');
  const sizeRelay = document.createElement('input');
  sizeRelay.type='range';sizeRelay.min='1';sizeRelay.max='100';
  sizeRelay.dataset.setting='size';sizeRelay.hidden=true;sizeRelay.tabIndex=-1;
  sizeRelay.setAttribute('aria-hidden','true');
  sizeBar.append(sizeRelay);
  const sizeButtons = [];
  let selectedBrush = null;
  function nativeState() {
    return window.__ZGEN_BETA_26?.state?.() || null;
  }
  function remember(brush, size) {
    if (!/^[a-z][a-z0-9_-]{0,47}$/i.test(brush)) return;
    if (!Number.isInteger(size) || size < 1 || size > 100) return;
    savedToolSizes[brush] = size;
    try {localStorage.setItem(sizeStorageKey, JSON.stringify(savedToolSizes))} catch {}
  }
  function refreshSize() {
    const size = nativeState()?.size;
    sizeButtons.forEach(({element,value}) => {
      element.setAttribute('aria-pressed',String(size === value));
    });
  }
  function applyNativeSize(value) {
    const state = nativeState();
    if (!state || !Number.isInteger(value) || value < 1 || value > 100)
      return false;
    sizeRelay.value = String(value);
    // The original module's document input listener sets c.size.
    sizeRelay.dispatchEvent(new Event('input',{bubbles:true}));
    const verified = nativeState()?.size === value;
    if (verified) remember(state.brush,value);
    refreshSize();
    return verified;
  }
  const smallDefault = brush => /(?:graphite|ink|pencil|detail|rigger|liner|pen)/i.test(brush);
  function syncSelectedBrush() {
    const state = nativeState();
    if (!state || !state.brush || state.brush === selectedBrush) return;
    selectedBrush = state.brush;
    const desired = savedToolSizes[selectedBrush] ??
      (smallDefault(selectedBrush) ? sizeSteps.XS : sizeSteps.M);
    applyNativeSize(desired);
  }
  // Native brush selection calls its own label update; observe THAT actual
  // completion, avoiding order/race with the deferred original module script.
  const nameNode = document.querySelector('#brushName');
  if (nameNode) {
    const brushSelectionObserver = new MutationObserver(syncSelectedBrush);
    brushSelectionObserver.observe(nameNode,{
      subtree:true,childList:true,characterData:true
    });
  }
  document.addEventListener('input',ev=>{
    if (ev.target?.dataset?.setting !== 'size') return;
    const state=nativeState();
    if (state) remember(state.brush,state.size);
    refreshSize();
  });
  for (const [label,value] of Object.entries(sizeSteps)) {
    const element=document.createElement('button');
    element.type='button';
    element.className='zgen-size-button';
    element.dataset.zgenSize=label;
    element.textContent=label;
    element.setAttribute('aria-label',({
      XS:'Extra small',S:'Small',M:'Medium',L:'Large',XL:'Extra large'
    })[label]+' brush size');
    element.setAttribute('aria-pressed','false');
    element.addEventListener('click',()=>applyNativeSize(value));
    sizeButtons.push({element,value});
    sizeBar.append(element);
  }
  viewport.append(sizeBar);
  // Voice-ready command targets only; no microphone or speech service enabled.
  window.__ZGEN_SIZE_COMMANDS = Object.freeze({
    setSize(label) {
      const key=String(label).trim().toUpperCase();
      return Object.prototype.hasOwnProperty.call(sizeSteps,key)
        ? applyNativeSize(sizeSteps[key]) : false;
    },
    sizeStep(direction) {
      const state=nativeState();
      if (!state || (direction!==1 && direction!==-1)) return false;
      const values=Object.values(sizeSteps);
      let index=0;
      values.forEach((v,i)=>{
        if (Math.abs(v-state.size)<Math.abs(values[index]-state.size)) index=i;
      });
      return applyNativeSize(values[Math.max(0,Math.min(4,index+direction))]);
    },
    get selectedBrush() {return nativeState()?.brush || null},
    get nativeSize() {return nativeState()?.size ?? null}
  });

  viewportResize();
  window.__ZGEN_SHELL = { version:'2026-11-21', layout, backingResize:false };
})();


/* PWA registration: additive only. Never change the painter or saved-art state. */
(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {
      scope: './',
      updateViaCache: 'none'
    }).catch(err => {
      console.warn('ZGen offline install unavailable; painting remains usable:', err);
    });
  }, { once: true });
})();
