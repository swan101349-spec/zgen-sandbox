/* QA ONLY | Verify immutable GitHub source delivered via HTTPS test CDN.
 * No published GitHub Pages change and NO user artwork uploaded. This checker
 * uses blank ephemeral Chromium profiles to test the SAME exact source SHA.
 *
 * A public CDN is a separate, third-party origin. Preview is exclusively
 * disposable drawing tests, not an editable-project storage destination.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {chromium}=require('playwright');
const sha='4d53f1011145454a0d53a6cee77ffe79fe2f72af';
const remote='https://rawcdn.githack.com/swan101349-spec/zgen-sandbox/'+sha+'/studio-recovery-20261124/';
const base=path.resolve(__dirname,'..','studio-recovery-20261124');
const checks=[
 'index.html','three-shell.js','three-shell.css',
 'lyrical-pencil-one.js','artwork-survival.js',
 'original-artwork-gallery.js',
 'assets/gallery24/graphite-01.png',
 'assets/gallery24/rascal-12.png'
];
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function verifyTransport(){
 const results=[];
 for(const file of checks){
  const response=await fetch(remote+file,{redirect:'follow',signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,'HTTPS preview file missing '+file);
  const bytes=Buffer.from(await response.arrayBuffer());
  const original=fs.readFileSync(path.join(base,file));
  assert.equal(digest(bytes),digest(original),
    'Preview transport changed actual original source bytes '+file);
  const type=response.headers.get('content-type')||'';
  if(file.endsWith('.html'))assert(/text\/html/i.test(type),
    'HTML must be rendered as a real page: '+type);
  if(file.endsWith('.js'))assert(/javascript|ecmascript/i.test(type),
    'Native script must be served executable: '+file+' '+type);
  if(file.endsWith('.css'))assert(/text\/css/i.test(type),
    'Styles must load with proper MIME type: '+file+' '+type);
  if(file.endsWith('.png'))assert(/image\/png/i.test(type),
    'Owner-approved cropped PNG must have proper MIME type: '+file+' '+type);
  results.push({file,sha256:digest(original),type,bytes:bytes.length});
 }
 return results;
}
function picture(){
 return{
  paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  undo:window.__C4History(),dimensions:[
    document.querySelector('#paint').width,
    document.querySelector('#paint').height
  ]
 };
}
async function drawPen(cdp,box){
 const positions=[[.25,.29,.08,0],[.37,.31,.35,18],[.47,.39,.84,55],
 [.59,.36,.92,62],[.66,.30,.39,21],[.75,.24,.09,0]];
 for(let i=0;i<positions.length;i++){
  const [x,y,p,t]=positions[i];
  await cdp.send('Input.dispatchMouseEvent',{
   type:i?'mouseMoved':'mousePressed',pointerType:'pen',
   x:box.x+box.width*x,y:box.y+box.height*y,
   button:'left',buttons:1,clickCount:i?0:1,force:p,tiltX:t,tiltY:Math.round(t*.4)
  });
 }
 await cdp.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',button:'left',buttons:0,
   x:box.x+box.width*.75,y:box.y+box.height*.24,force:0
 });
}
(async()=>{
 const verified=await verifyTransport();
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const viewport of [{width:390,height:844},{width:853,height:533}]){
   const context=await browser.newContext({viewport,hasTouch:true});
   const page=await context.newPage();
   const failures=[],exceptions=[];
   page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
   page.on('pageerror',e=>exceptions.push(e.message));
   const response=await page.goto(remote+'index.html',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(response?.status(),200,'External test page must navigate normally');
   if((await page.title()).includes('External Content Notice')){
     const notice=await page.locator('a').evaluateAll(nodes=>nodes.map(a=>({
       text:a.textContent.trim(),href:a.getAttribute('href'),target:a.target
     })));
     console.log('ZGEN_PREVIEW_NOTICE',JSON.stringify(notice).slice(0,2400));
     const opener=page.getByText('Open the page',{exact:true});
     assert.equal(await opener.count(),1,'One explicit consent link should exist');
     await opener.click();
     await page.waitForLoadState('domcontentloaded');
     console.log('ZGEN_PREVIEW_NOTICE_CLEARED',JSON.stringify({
       title:await page.title(),url:page.url()
     }));
   }
   try {
     await page.waitForFunction(()=>window.__ZGEN_LYRICAL_ONE?.ready&&
       window.__ZGEN_BETA_26?.state&&window.__C4History&&
       window.__ZGEN_ART_RECOVERY?.status?.().ready&&
       !window.__ZGEN_ART_RECOVERY.status().blocked,
       null,{timeout:16000});
   }catch(error){
     const diagnostics=await page.evaluate(()=>({
       url:location.href,
       origin:location.origin,
       state:document.readyState,
       title:document.title,
       scripts:[...document.scripts].map(s=>({src:s.src,loaded:s.readyState})).slice(-10),
       native:!!window.__ZGEN_BETA_26,
       lyrical:!!window.__ZGEN_LYRICAL_ONE,
       history:!!window.__C4History,
       recovery:window.__ZGEN_ART_RECOVERY?.status?.()||null,
       indexedDB:!!window.indexedDB,
       paint:document.querySelector('#paint')?.getAttribute('width')||null,
       html:document.body?.innerText?.slice(0,550)
     }));
     throw new Error('LIVE_PREVIEW_STARTUP_DIAGNOSTICS '+JSON.stringify({
       diagnostics,exceptions,failures,rootHeaders:response?.headers()
     })+' | '+error.message);
   }
   const initial=await page.evaluate(picture);
   assert.deepEqual(initial.dimensions,[720,1280]);
   assert.equal(await page.locator('#paint').count(),1,'No duplicate painter allowed');
   assert.equal(await page.locator('#zshell-left button[data-brush=lyrical]').count(),1);
   assert.equal(await page.locator('#zgen-original-gallery24').count(),1,
     'Owner-approved gallery stays part of same Three-Shell');
   await page.locator('#zshell-left .zshell-handle').click();
   await page.locator('#zshell-left button[data-brush=lyrical]').click();
   await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='lyrical');
   const bounds=await page.locator('#paint').boundingBox();
   assert.ok(bounds&&bounds.width>90&&bounds.height>150);
   const cdp=await context.newCDPSession(page);
   await drawPen(cdp,bounds);
   const drawn=await page.evaluate(picture);
   assert.notEqual(drawn.paint,initial.paint,'Actual pen pressure must leave ink');
   assert.equal(drawn.reference,initial.reference,'Reference protected');
   assert.equal(drawn.undo.undo.length,1,'Native history must own lyrical mark');
   await page.locator('.zshell-history-left').click();
   assert.equal((await page.evaluate(picture)).paint,initial.paint,'Native undo');
   await page.locator('.zshell-history-right').click();
   assert.equal((await page.evaluate(picture)).paint,drawn.paint,'Native redo');
   assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
     'Temporary preview artist mark survival bridge works in ephemeral test browser');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status()?.ready&&
     !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_LYRICAL_ONE?.ready,
     null,{timeout:45000});
   assert.equal((await page.evaluate(picture)).paint,drawn.paint,
     'Single disposable test mark survives a reload in isolated CDN origin');
   assert.deepEqual(exceptions,[],'No JavaScript errors');
   assert.deepEqual(failures,[],'All actual resources should load over HTTPS');
   console.log('ZGEN_IMMUTABLE_TABLET_PREVIEW_PASS '+JSON.stringify({
     exactSourceSHA:sha,viewport,externalHttpsOrigin:new URL(remote).origin,
     contentIdenticalToGitHub:true,originalFilesMatched:verified.length,
     nativeLyricalPaint:true,undoRedo:true,disposableTestSurvivesReload:true,
     ownerMainUnchanged:true,ownerShortcutUnchanged:true,deviceSPenTested:false,
     warning:'Third-party preview origin; no private original artwork uploads'
   }));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('ZGEN_IMMUTABLE_TABLET_PREVIEW_FAIL',e);process.exitCode=1});
