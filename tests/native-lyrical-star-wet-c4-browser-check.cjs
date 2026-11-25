/* Lyrical #1 ★ Native C4 wet bridge: REAL GPU half-float pigment, not dry alpha.
 * Original Three-Shell C1 gesture/history and original C4 watercolor physics.
 * Synthetic Chromium pen, never a claim of hardware S Pen validation.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='http://127.0.0.1:8765/studio-recovery-20261124/';
function capture(){
  const native=window.__C4.snapshot(),layers=native.document?.whole?.layers||{};
  const wet={};
  for(const [name,array] of Object.entries(layers)){
    let hash=2166136261,nonzero=0;
    for(let i=0;i<array.length;i++){
      hash=Math.imul(hash^array[i],16777619);
      if(array[i])nonzero++;
    }
    wet[name]={hash:hash>>>0,nonzero,length:array.length};
  }
  return {
    wet,dirty:native.dirty,phase:native.phase,
    paint:document.querySelector('#paint').toDataURL('image/png'),
    reference:document.querySelector('#reference').toDataURL('image/png'),
    history:window.__C4History(),nativeOptions:window.__ZGEN_LYRICAL_ONE.getOptions(),
    metrics:window.__ZGEN_LYRICAL_ONE.metrics(),
    size:[document.querySelector('#paint').width,document.querySelector('#paint').height]
  };
}
(async()=>{
const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
for(const viewport of [{width:390,height:844},{width:853,height:533}]){
  const context=await browser.newContext({viewport,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_LYRICAL_ONE?.ready&&
    window.__C4?.snapshot&&window.__C4History&&
    window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  await page.locator('#zshell-left .zshell-handle').click();
  await page.getByRole('button',{name:'Select Lyrical Pencil number one, pressure and tilt expressive graphite'}).click();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26?.state().brush==='lyrical');
  const bounds=await page.locator('#paint').boundingBox();
  assert.ok(bounds&&bounds.width>80&&bounds.height>150,'original 720x1280 painter visible');
  const cdp=await context.newCDPSession(page);
  async function stroke(fy){
    for(let i=0;i<23;i++){
      const t=i/22,force=.065+.83*Math.pow(Math.sin(t*Math.PI),1.5);
      await cdp.send('Input.dispatchMouseEvent',{
        type:i?'mouseMoved':'mousePressed',pointerType:'pen',
        x:bounds.x+bounds.width*(.22+.56*t),
        y:bounds.y+bounds.height*(fy+.038*Math.sin(t*Math.PI*2)),
        button:'left',buttons:1,clickCount:i?0:1,force,
        tiltX:Math.round(36*Math.sin(t*Math.PI)),tiltY:11
      });
    }
    await cdp.send('Input.dispatchMouseEvent',{
      type:'mouseReleased',pointerType:'pen',
      x:bounds.x+bounds.width*.78,y:bounds.y+bounds.height*fy,
      button:'left',buttons:0,force:0
    });
  }
  const pristine=await page.evaluate(capture);
  await stroke(.27); // dry baseline; this MUST still be native Canvas2D graphite.
  await page.waitForFunction(()=>window.__C4History().undo.length===1);
  const dry=await page.evaluate(capture);
  assert.notEqual(dry.paint,pristine.paint,'dry Lyrical original pixels remain functional');
  assert.deepEqual(dry.wet,pristine.wet,'dry graphite cannot contaminate C4 wet pigment');
  await page.getByRole('button',{name:'Brush adjustments: three sliders'}).click();
  const toggle=page.getByRole('button',{name:'Toggle Lyrical pencil native C4 watercolor mode'});
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'),'true','real ★ toggle state ON');
  const on=await page.evaluate(()=>window.__ZGEN_LYRICAL_ONE.getOptions());
  assert.equal(on.medium,'watercolor');
  assert.equal(on.mode,'graphite','wet only allowed for Lyrical #1');
  // A user's normal workflow closes the compact adjustment overlay before
  // touching paper. Otherwise the browser may send stylus events to UI,
  // hiding an otherwise valid C4 bridge with a false missing-history signal.
  await page.getByRole('button',{name:'Brush adjustments: three sliders'}).click();
  assert.equal(await page.locator('#zshell-adjust-panel').evaluate(el=>el.hidden),true,
    'Close adjustments before using the original painting paper');
  const hit=await page.evaluate(box=>{
    const x=box.x+box.width*.22,y=box.y+box.height*.46;
    const node=document.elementFromPoint(x,y);
    return {id:node?.id,tag:node?.tagName,classes:node?.className,
      paint:node?.id==='paint',position:[x,y]};
  },bounds);
  assert.equal(hit.paint,true,'The native paper must receive wet stylus input: '+JSON.stringify(hit));
  await stroke(.46); // one ORIGINAL C1 transaction, but ACTUAL C4 GPU wet mark.
  // A wet GPU stroke leaves dry #paint untouched. Prevent a false owner
  // warning from the packed painter's legacy dry-only endpoint sampler.
  await page.waitForFunction(()=>
    document.querySelector('#status')?.textContent?.includes('native C4 pigment'),
    null,{timeout:5000});
  assert.equal((await page.locator('#status').textContent()).includes('NO PAINT PIXEL'),
    false,'Never misreport valid C4 pigment as a missing dry paint pixel');
  try {
    await page.waitForFunction(()=>window.__C4History().undo.length===2,
      null,{timeout:10000});
  }catch(error){
    const diag=await page.evaluate(()=>({
      undo:window.__C4History(),mode:window.__ZGEN_LYRICAL_ONE?.getOptions(),
      pencil:window.__ZGEN_LYRICAL_ONE?.metrics(),
      c4Active:window.__C4?.active,c4Paused:window.__C4?.paused,
      c4Phase:window.__C4?.phase,c4Dirty:window.__C4?.dirty,
      status:document.querySelector('#status')?.textContent
    }));
    throw new Error('C4 wet pencil missing native history after pointer stroke: '+
      JSON.stringify(diag),{cause:error});
  }
  // Freeze native C4 before its separate ~1.5 s automatic Dry Wash
  // checkpoint; otherwise Undo rightly removes the drying boundary instead
  // of the pencil's single wet stroke, causing a false history failure.
  await page.waitForTimeout(350);
  await page.evaluate(()=>document.querySelector('[data-act="stop"]').click());
  const wet=await page.evaluate(capture);
  assert.equal(wet.history.undo.length,2,
    'Native wet stroke must be the second C1 transaction, not an auto-Dry-Wash boundary');
  assert.deepEqual(wet.size,[720,1280],'native painter backing pixels unchanged');
  assert.equal(wet.paint,dry.paint,'★ must NOT fake watercolor on graphite canvas');
  assert.equal(wet.reference,dry.reference,'reference must not be touched');
  assert.equal(wet.metrics.wetNative,true,'C4 bridge used');
  assert.ok(Object.values(wet.wet).some(layer=>layer.nonzero>0),
    'genuine native C4 GPU pigment arrays must contain wet pixels');
  assert.notDeepEqual(wet.wet,dry.wet,'wet C4 pigment state changes');
  await page.locator('.zshell-history-left').click();
  const undone=await page.evaluate(capture);
  assert.deepEqual(undone.wet,dry.wet,'original Undo restores C4 wet arrays');
  assert.equal(undone.paint,dry.paint,'dry graphite survives wet Undo');
  assert.equal(undone.reference,dry.reference,'reference survives Undo');
  await page.locator('.zshell-history-right').click();
  const redone=await page.evaluate(capture);
  assert.deepEqual(redone.wet,wet.wet,'Redo restores native wet pigment arrays exactly');
  assert.equal(redone.paint,dry.paint,'dry graphite preserved after Redo');
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
    'original recovery checkpoint committed');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.snapshot&&
    window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  const reopened=await page.evaluate(capture);
  assert.equal(reopened.paint,dry.paint,'dry graphite retained after browser reload');
  assert.equal(reopened.reference,dry.reference,'reference retained after reload');
  assert.ok(Object.values(reopened.wet).some(x=>x.nonzero>0),
    'C4 wet pigment retained after browser reload');
  assert.deepEqual(reopened.size,[720,1280],'native paper dimensions retained');
  assert.deepEqual(errors,[],'zero browser errors');
  console.log('ZGEN_LYRICAL1_NATIVE_C4_STAR_PASS '+JSON.stringify({
    viewport,originalC1Undo:true,authenticC4WetLayers:true,
    dryLayerUntouched:true,wetUndoExact:true,wetRedoExact:true,
    mixedDryWetReload:true,referenceUnchanged:true,ownerSPenTested:false,
    otherTextureStarsVerified:false,liveDeployed:false
  }));
  await context.close();
}
}finally{await browser.close()}
})().catch(err=>{console.error('ZGEN_LYRICAL1_NATIVE_C4_STAR_FAIL',err);process.exitCode=1});
