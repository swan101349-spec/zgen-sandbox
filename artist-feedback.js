/* Artist feedback sidecar for the existing public beta.
   No network, no painting engine calls, no external source data. */
(() => {
  'use strict';
  const app = document.querySelector('#app');
  const header = app?.querySelector('.head');
  const canvas = app?.querySelector('#paint');
  if (!app || !header || !canvas || document.querySelector('#artist-feedback-open')) return;

  const current = [
    ['fit','Fit Canvas','Use View > Fit to show the complete 9:16 paper.'],
    ['rails','Compact side panels','Open and close Brushes, Tools and Colors & Artwork. Panels should slide over the art, not shrink it.'],
    ['sliders','Three brush sliders','Tap the top-left ☷ control. Watercolor: Size / Water / Pigment. Drawing: Size / Mark strength / Lazy.'],
    ['sizes','Brush sizes XS to XL','Try fine graphite and a larger brush. Look for real changes in line width.'],
    ['pigments','44 painting colors','Select at least two colors and confirm the next real marks change color.'],
    ['water','Watercolor painting','Make a light Round brush wash, then compare pigment/water settings.'],
    ['graphite','2B Graphite and Indian Ink','Make fine and medium marks with both tools.'],
    ['fill','Bounded watercolor Fill','Tap a closed shape to apply a light wash. Try an open shape to confirm it does not flood.'],
    ['trace','Import and tracing','Import a reference image, draw over it and inspect opacity/alignment.'],
    ['history','Undo and Redo','Draw a mark, undo once and redo. Keep your other artwork intact.'],
    ['favorites','Brush favorites','Save and recall a favorite brush, then close and reopen the drawer.'],
    ['switch','Swap left and right panels','Use the 180° swap control, then switch back without rotating the paper.'],
    ['png','Export PNG intentionally','Tap PNG only when you want a download; check no automatic downloads.'],
    ['zoom','Finger and S Pen navigation','Try finger mark, two-finger zoom/pan and S Pen marks if available. Physical outcome is not a browser QA PASS.'],
    ['stop','STOP and GO','See whether pause and resume affect the real brush or wet-flow behavior as expected.']
  ];
  const pending = [
    'Pastel-tinted Hot Press / Cold Press / Rough paper choices under floating panels',
    'Even smaller lowered color tray and two-finger expansion of tool drawers',
    'Original art/stencil library staged 24 → 48 → 120',
    'Eight lyrical pencil grades and ★ dry / wet conversion',
    'Eye Assist and other standalone Carpenter experiments',
    'Editable project Save and Reopen',
    'Full handwriting, pressure, tilt and wet-physics owner approval'
  ];
  const key='zgen-existing-beta-artist-feedback-v1';
  const votes=Object.create(null);
  const acceptable=new Set(['PASS','FAIL','NOT TESTED']);
  let notes='', stored={};
  try {
    stored=JSON.parse(localStorage.getItem(key)||'{}');
    notes=String(stored.notes||'');
  } catch {}
  for(const [id] of current)votes[id]=acceptable.has(stored?.votes?.[id])?stored.votes[id]:'NOT TESTED';
  function persist(){
    try{localStorage.setItem(key,JSON.stringify({votes,notes}));}catch{}
  }
  function node(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }

  const opener=node('button','artist-feedback-open','TEST');
  opener.id='artist-feedback-open';opener.type='button';
  opener.setAttribute('aria-label','Open painting feedback checklist');
  opener.setAttribute('aria-controls','artist-feedback-panel');
  opener.setAttribute('aria-expanded','false');
  const anchor=header.querySelector('#rail-settings');
  if(anchor)header.insertBefore(opener,anchor);else header.append(opener);

  const backdrop=node('div','artist-feedback-backdrop');backdrop.id='artist-feedback-backdrop';backdrop.hidden=true;
  const side=node('aside','artist-feedback-panel');side.id='artist-feedback-panel';
  side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');
  side.setAttribute('aria-label','Artist painting feedback checklist');
  side.setAttribute('aria-hidden','true');side.hidden=true;
  const top=node('div','artist-feedback-head');
  const heading=node('div','artist-feedback-heading');
  heading.append(node('strong','', 'Painting feedback'),node('small','','Same beta · Your Galaxy Tab S9'));
  const close=node('button','artist-feedback-close','×');
  close.type='button';close.setAttribute('aria-label','Close feedback panel');
  top.append(heading,close);
  const content=node('div','artist-feedback-content');
  content.append(node('p','artist-feedback-intro',
    'Paint first, then mark PASS or FAIL. These are your real-device results, not automatic engineering passes. All choices stay on this device until you copy them.'));
  const progress=node('p','artist-feedback-progress');
  progress.setAttribute('role','status');content.append(progress);
  const present=node('section','artist-feedback-section');
  present.append(node('h2','','Available in this beta'));
  const cards=node('div','artist-feedback-cards');
  present.append(cards);content.append(present);
  const future=node('details','artist-feedback-section artist-feedback-future');
  const futureHeading=node('summary','','Engineering queue · not in this beta');
  future.append(futureHeading);
  const futureList=node('ul','artist-feedback-pending');
  for(const item of pending)futureList.append(node('li','',item));
  future.append(futureList);content.append(future);
  const label=node('label','artist-feedback-label','What should Janet fix or improve?');
  label.htmlFor='artist-feedback-notes';
  const textarea=node('textarea','artist-feedback-notes');
  textarea.id='artist-feedback-notes';textarea.rows=4;
  textarea.placeholder='Example: Fit is hidden. Slider panel is too big. The Rigger makes a thick line.';
  textarea.value=notes;
  content.append(label,textarea);
  const copy=node('button','artist-feedback-copy','Copy one feedback report');
  copy.type='button';
  const copyStatus=node('p','artist-feedback-copy-status');
  copyStatus.setAttribute('role','status');copyStatus.setAttribute('aria-live','polite');
  content.append(copy,copyStatus);
  content.append(node('p','artist-feedback-footnote',
    'No automatic sharing, no credentials, no downloads and no purchases. Your full private engineering checklist remains separate from this public painting beta.'));
  side.append(top,content);app.append(backdrop,side);

  function render(){
    cards.replaceChildren();
    let done=0;
    for(const [id,title,detail] of current){
      if(votes[id]!=='NOT TESTED')done++;
      const item=node('div','artist-feedback-item');
      item.dataset.test=id;
      item.append(node('strong','artist-feedback-name',title),node('p','artist-feedback-detail',detail));
      const choices=node('div','artist-feedback-choices');
      choices.setAttribute('role','group');
      choices.setAttribute('aria-label','Your result for '+title);
      for(const status of ['PASS','FAIL','NOT TESTED']){
        const b=node('button','artist-feedback-choice',status==='NOT TESTED'?'Not tested':status);
        b.type='button';b.dataset.vote=status;
        b.setAttribute('aria-pressed',String(votes[id]===status));
        b.addEventListener('click',()=>{votes[id]=status;persist();render();});
        choices.append(b);
      }
      item.append(choices);cards.append(item);
    }
    progress.textContent=done+' of '+current.length+' painting checks marked';
  }
  function toggle(open){
    side.hidden=!open;backdrop.hidden=!open;
    side.setAttribute('aria-hidden',String(!open));
    opener.setAttribute('aria-expanded',String(open));
    if(open)close.focus();else opener.focus();
  }
  opener.addEventListener('click',()=>toggle(true));
  close.addEventListener('click',()=>toggle(false));
  backdrop.addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!side.hidden)toggle(false)});
  textarea.addEventListener('input',()=>{notes=textarea.value;persist();});
  function report(){
    const out=[
      'ZGenArtStudio Pro | Galaxy Tab S9 painting feedback',
      'Build: existing public GitHub Pages beta | source: zgen-sandbox',
      'Device: physical finger / S Pen results; not CI certification'
    ];
    for(const [id,title] of current)out.push(votes[id]+' | '+title);
    out.push('NOT IN THIS BUILD: '+pending.join('; '));
    out.push('NOTES: '+(notes.trim()||'(none)'));
    return out.join('\n');
  }
  copy.addEventListener('click',async()=>{
    const value=report();
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const temp=node('textarea');temp.value=value;document.body.append(temp);temp.select();
        const success=document.execCommand('copy');temp.remove();
        if(!success)throw new Error('Clipboard unavailable');
      }
      copyStatus.textContent='Copied. Paste the report into your conversation with Janet.';
    } catch {
      copyStatus.textContent='Clipboard unavailable. Please tell Janet which painting controls passed or failed.';
    }
  });
  render();
  window.__ZGEN_FEEDBACK = Object.freeze({
    version:'2026-11-23',
    itemCount:current.length,
    get open(){return !side.hidden},
    get markedCount(){return Object.values(votes).filter(v=>v!=='NOT TESTED').length}
  });
})();
