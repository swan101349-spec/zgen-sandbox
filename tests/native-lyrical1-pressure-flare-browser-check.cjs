/* Lyrical Pencil #1 | native Three-Shell real pen-pressure acceptance
 * Synthetic Chromium pen pressure is NOT an actual Galaxy Tab S9 S Pen test.
 * No painter copy, fake canvas, owner artwork or shortcut is ever modified.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const BASE='http://127.0.0.1:8765/studio-recovery-20261124/';
const paper=()=>({
  paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  w:document.querySelector('#paint').width,
  h:document.querySelector('#paint').height,
  undo:window.__C4History(),
  lyrical:window.__ZGEN_LYRICAL_ONE.metrics(),
  recovery:window.__ZGEN_ART_RECOVERY.status()
});
async function simulatedPen(client,box,pressureSchedule){
  // Chrome CDP pen event is a real native browser pointer path, not a call
  // directly to our brush renderer.
  const points=pressureSchedule.map((entry,index)=>{
    const t=index/(pressureSchedule.length-1);
    return {
      x:box.x+box.width*(.24+t*.52),
      y:box.y+box.height*(.24+.11*Math.sin(t*Math.PI*2.1)),
      force:entry[0],tiltX:entry[1],tiltY:Math.round(entry[1]*.48)
    };
  });
  for(let index=0;index<points.length;index++){
    const {x,y,force,tiltX,tiltY}=points[index];
    const type=index===0?'mousePressed':'mouseMoved';
    await client.send('Input.dispatchMouseEvent',{
      type,x,y,pointerType:'pen',button:'left',buttons:1,
      clickCount:index===0?1:0,force,tiltX,tiltY
    });
  }
  const p=points[points.length-1];
  await client.send('Input.dispatchMouseEvent',{
    type:'mouseReleased',x:p.x,y:p.y,pointerType:'pen',
    button:'left',buttons:0,force:0
  });
}
async function main(){
 const browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const viewport of [{width:390,height:844},{width:853,height:533}]){
   const context=await browser.newContext({viewport,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__ZGEN_LYRICAL_ONE?.ready&&
      window.__ZGEN_BETA_26&&window.__C4History&&
      window.__ZGEN_ART_RECOVERY?.status().ready&&
      !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
   assert.equal(await page.locator('#paint').evaluate(x=>x.width),720);
   assert.equal(await page.locator('#paint').evaluate(x=>x.height),1280);
   const initial=await page.evaluate(paper);
   await page.locator('#zshell-left .zshell-handle').click();
   const lead=page.locator('#zshell-left button[data-brush="lyrical"]');
   assert.equal(await lead.count(),1,'One premier pencil in existing Brushes shell');
   await lead.click();
   await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='lyrical');
   // Grade/shade/size/flare controls live in the original ☷ panel.
   await page.locator('.zshell-adjust-handle').click();
   const panel=page.locator('#zshell-adjust-panel');
   assert.equal(await panel.locator('select[data-lyrical="grade"]').count(),1);
   await panel.locator('select[data-lyrical="grade"]').selectOption('6B');
   await panel.locator('select[data-lyrical="size"]').selectOption('fine');
   await panel.locator('select[data-lyrical="mode"]').selectOption('graphite');
   await panel.locator('input[data-lyrical="fan"]').evaluate(el=>{
     el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const tones=panel.locator('[data-graphite-tone]');
   assert.equal(await tones.count(),3,'All 3 native gray/dark/black pencil tones visible');
   await tones.nth(1).click();
   await page.waitForFunction(()=>{
     const chip=document.querySelector('#chip');
     return chip?.style.backgroundColor==='rgb(56, 56, 56)';
   });
   const design=await page.evaluate(()=>{
     const api=window.__ZGEN_LYRICAL_ONE,options=api.getOptions();
     return {
       options,
       thin:api.measure(.09,.05,0,{size:22,color:'#383838',opacity:96}),
       middle:api.measure(.45,.4,.25,{size:22,color:'#383838',opacity:96}),
       broad:api.measure(.94,.82,.85,{size:22,color:'#383838',opacity:96}),
       returnFine:api.measure(.07,.05,0,{size:22,color:'#383838',opacity:96})
     };
   });
   assert.equal(design.options.grade,'6B');
   assert.equal(design.options.fan,1);
   assert(design.thin.core<design.middle.core&&design.middle.core<design.broad.core,
     'Light → medium → strong pressure must increase core width');
   assert(design.thin.flare<design.middle.flare&&design.middle.flare<design.broad.flare,
     'Pressure, tilt and curve must swell the lyrical fan');
   assert(design.returnFine.flare<design.middle.flare*.3,
     'Pressure released must return to a fine wave, not remain broad');
   await page.locator('.zshell-adjust-handle').click();
   const bounds=await page.locator('#paint').boundingBox();
   assert(bounds&&bounds.width>90&&bounds.height>140,'Real native paper visible');
   const cdp=await context.newCDPSession(page);
   await page.evaluate(()=>{
     window.__lyricalQA={types:[],pressures:[]};
     document.querySelector('#paint').addEventListener('pointermove',ev=>{
       window.__lyricalQA.types.push(ev.pointerType);
       window.__lyricalQA.pressures.push(ev.pressure);
     },{passive:true});
   });
   await simulatedPen(cdp,bounds,[
     [.08,0],[.16,11],[.31,26],[.62,45],[.92,68],
     [.89,60],[.58,34],[.25,16],[.10,5],[.07,0]
   ]);
   await page.waitForFunction(()=>window.__C4History().undo.length>=1,null,{timeout:12000});
   const after=await page.evaluate(paper);
   assert.notEqual(after.paint,initial.paint,'Lyrical pen must make REAL paint pixels');
   assert.equal(after.reference,initial.reference,'Pencil may not change tracing original');
   assert.equal(after.undo.undo.length,1,'One native Undo transaction per lyrical stroke');
   assert(after.lyrical.marks>5&&after.lyrical.maxFlare>after.lyrical.minWidth,
     'The original lyrical brush must create core + curved flare rib marks');
   const delivered=await page.evaluate(()=>window.__lyricalQA);
   assert(delivered.types.includes('pen'),'Browser must deliver real simulated PEN events');
   assert(Math.max(...delivered.pressures)>.7&&Math.min(...delivered.pressures)<.3,
     'Native pointer path must receive fluctuating pressure, not fixed mouse pressure');
   assert(after.lyrical.pressureMax>.5&&after.lyrical.pressureMin<.3,
     'Recorded dynamics must follow pressure along the original stroke');
   // Native original arrows, not a duplicate pencil-specific history.
   await page.locator('.zshell-history-left').click();
   assert.equal((await page.evaluate(paper)).paint,initial.paint,
     'Native Undo erases exactly one lyrical line and no more');
   await page.locator('.zshell-history-right').click();
   assert.equal((await page.evaluate(paper)).paint,after.paint,
     'Native Redo recreates same lyrical graphite exactly');
   // Shader is a variant of the SAME Pencil #1, with no new engine.
   await page.locator('.zshell-adjust-handle').click();
   await panel.locator('select[data-lyrical="mode"]').selectOption('shader');
   await page.locator('.zshell-adjust-handle').click();
   await simulatedPen(cdp,bounds,[[.14,8],[.4,28],[.79,58],[.3,18],[.07,0]]);
   const shader=await page.evaluate(paper);
   assert.equal(shader.undo.undo.length,2,'Native shader stroke must join same Undo stack');
   assert.notEqual(shader.paint,after.paint,'Shader mode must draw visible real pixels');
   await page.locator('.zshell-history-left').click();
   assert.equal((await page.evaluate(paper)).paint,after.paint,
     'One Undo removes only the shader stroke, lyrical base stays');
   await page.locator('.zshell-history-right').click();
   assert.equal((await page.evaluate(paper)).paint,shader.paint);
   assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
     'Native atomic artwork retention must commit both lyrical and shader marks');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
       !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_LYRICAL_ONE?.ready,
       null,{timeout:45000});
   const recovered=await page.evaluate(paper);
   assert.equal(recovered.paint,shader.paint,'Lyrical Pencil and Shader pixels survive reload');
   assert.equal(recovered.reference,initial.reference,'No original reference corruption');
   assert.deepEqual([recovered.w,recovered.h],[720,1280]);
   assert.deepEqual(errors,[],'No browser exceptions');
   console.log('ZGEN_LYRICAL1_NATIVE_PASS '+JSON.stringify({
     viewport,verifiedSimulatedPen:true,pressureIncrease:true,
     pressureFalloff:true,curveTiltFlare:true,realNativeMarks:true,
     graphiteGrades:true,compactThreeLineControls:true,shaderMode:true,
     nativeUndoRedo:true,artworkReload:true,
     referencePreserved:true,originalPainter720x1280:true,
     deviceSPenTested:false
   }));
   await context.close();
  }
 }finally{await browser.close()}
}
main().catch(e=>{console.error('ZGEN_LYRICAL1_NATIVE_FAIL',e);process.exitCode=1});
