'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const outDir = 'three-shell-browser-qa';
fs.mkdirSync(outDir,{recursive:true});
const fixtures = [
  {name:'phone360',width:360,height:740},
  {name:'phone390',width:390,height:780},
  {name:'phone430',width:430,height:850},
  {name:'tablet-portrait',width:800,height:1180},
  {name:'tablet-landscape',width:1180,height:760}
];
const approx=(a,b,tol=2)=>Math.abs(a-b)<=tol;
async function snapshot(page) {
  return page.evaluate(()=>{
    const area=document.getElementById('canvasArea').getBoundingClientRect();
    const board=document.getElementById('board').getBoundingClientRect();
    const bottom=document.querySelector('#zshell-bottom .zshell-handle').getBoundingClientRect();
    const paint=document.getElementById('paint');
    const reference=document.getElementById('reference');
    return {
      mode:window.__ZGEN_THREE_SHELL?.viewMode,
      area:{x:area.x,y:area.y,width:area.width,height:area.height},
      board:{x:board.x,y:board.y,width:board.width,height:board.height},
      bottomWidth:bottom.width,
      backing:[paint.width,paint.height,reference.width,reference.height]
    };
  });
}
function checkFit(s,name) {
  assert.equal(s.mode,'fit',name+': Fit Canvas active');
  assert.deepEqual(s.backing,[720,1280,720,1280],name+': backing dimensions preserved');
  assert.ok(s.board.width>0 && s.board.height>0,name+': visible paper');
  assert.ok(approx(s.board.width/s.board.height,9/16,0.005),name+': 9:16 proportions');
  assert.ok(s.board.x>=s.area.x-1,name+': left paper edge');
  assert.ok(s.board.y>=s.area.y-1,name+': top paper edge');
  assert.ok(s.board.x+s.board.width<=s.area.x+s.area.width+1,name+': right paper edge');
  assert.ok(s.board.y+s.board.height<=s.area.y+s.area.height+1,name+': bottom paper edge');
  assert.ok(s.bottomWidth<=180,name+': compact palette handle, not full-width');
}
(async()=>{
  const browser=await chromium.launch({
    headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try{
    const page=await browser.newPage({viewport:{width:390,height:780},deviceScaleFactor:1,hasTouch:true,isMobile:true});
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:8765/shell-v2.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>!!window.__ZGEN_THREE_SHELL?.recalculatePaperFit,{timeout:12000});
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());

    // Seed a real tracing-layer pixel so layout changes must not wipe it.
    const initialPixel=await page.evaluate(()=>{
      const canvas=document.getElementById('reference');
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.fillStyle='rgba(127,37,211,1)';
      ctx.fillRect(11,13,1,1);
      return Array.from(ctx.getImageData(11,13,1,1).data);
    });
    assert.equal(initialPixel[3],255,'tracing test pixel visible');

    for (const x of fixtures) {
      await page.setViewportSize({width:x.width,height:x.height});
      await page.waitForTimeout(120);
      await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
      const s=await snapshot(page);
      checkFit(s,x.name);
      await page.screenshot({path:path.join(outDir,x.name+'.png')});
      console.log('PASS '+x.name+': paper '+Math.round(s.board.width)+'x'+Math.round(s.board.height)+' in '+Math.round(s.area.width)+'x'+Math.round(s.area.height));
    }

    const before=await snapshot(page);
    await page.locator('#zshell-bottom .zshell-handle').click();
    assert.equal(await page.locator('#zshell-bottom-panel').isVisible(),true,'bottom overlays the paper');
    const withPalette=await snapshot(page);
    assert.ok(approx(withPalette.board.width,before.board.width,1),'palette does not resize paper');
    await page.locator('#zshell-right .zshell-handle').click();
    assert.equal(await page.locator('#zshell-bottom-panel').isVisible(),false,'opening tools collapses other panel');

    await page.locator('#zshell-right-panel .zshell-viewbar button').nth(1).click();
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
    const fill=await snapshot(page);
    assert.equal(fill.mode,'fill','Fill Width is explicit');
    assert.ok(approx(fill.board.width,fill.area.width-10,1),'Fill Width consumes available width');
    await page.locator('#zshell-right .zshell-handle').click();
    await page.locator('#zshell-right-panel .zshell-viewbar button').first().click();
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
    checkFit(await snapshot(page),'fit-return');


    // Real original engine wiring: only THREE contextual sliders at once.
    await page.setViewportSize({width:390,height:780});
    await page.waitForTimeout(120);
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
    await page.locator('.zshell-adjust-handle').click();
    assert.equal(await page.locator('#zshell-adjust-panel input[type=range]').count(),3,'watercolor: exactly three sliders');
    assert.deepEqual(await page.locator('#zshell-adjust-panel input[data-setting]').evaluateAll(
      nodes=>nodes.map(x=>x.dataset.setting)),['size','water','pigment'],'watercolor: contextual fields');
    assert.equal(await page.locator('#zshell-adjust-panel [data-size-preset]').count(),5,'XS to XL buttons');
    await page.locator('#zshell-adjust-panel [data-size-preset=XL]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),80,'XL changes real engine size');
    await page.locator('#zshell-adjust-panel [data-size-preset=XS]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),3,'XS changes real engine size');
    await page.locator('#zshell-adjust-panel input[data-setting=water]').evaluate(slider=>{
      slider.value='24';slider.dispatchEvent(new Event('input',{bubbles:true}));
    });
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().water),24,'water slider changes engine');
    await page.locator('#zshell-adjust-panel input[data-setting=pigment]').evaluate(slider=>{
      slider.value='31';slider.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.locator('#zshell-adjust-panel .zshell-adjust-close').click();
    await page.locator('#zshell-left .zshell-handle').click();
    await page.locator('#painting-rail button[data-act=water]').click();
    assert.equal(await page.locator('#r-pigment').inputValue(),'31','pigment slider reaches original native engine');
    await page.locator('#drawer button[data-act=close]').click();

    // Switch to actual existing 2B Graphite; the same adjustments become
    // Size, Mark Strength (opacity), Lazy, rather than watercolor controls.
    await page.locator('#zshell-left .zshell-handle').click();
    await page.locator('#zshell-left-panel button[data-brush=graphite]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().brush),'graphite','actual graphite brush selected');
    await page.locator('.zshell-adjust-handle').click();
    assert.deepEqual(await page.locator('#zshell-adjust-panel input[data-setting]').evaluateAll(
      nodes=>nodes.map(x=>x.dataset.setting)),['size','opacity','lazy'],'graphite: three distinct fields');
    await page.locator('#zshell-adjust-panel input[data-setting=opacity]').evaluate(slider=>{
      slider.value='54';slider.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.locator('#zshell-adjust-panel input[data-setting=lazy]').evaluate(slider=>{
      slider.value='0';slider.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.locator('#zshell-adjust-panel [data-size-preset=XS]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),3,'graphite XS size is real');
    await page.locator('#zshell-adjust-panel .zshell-adjust-close').click();

    const rect=await page.locator('#board').boundingBox();
    assert.ok(rect && rect.width>100,'paper visible for true graphite marks');
    const drawAt=async fractionY=>{
      const startX=rect.x+rect.width*.40,endX=rect.x+rect.width*.60;
      const y=rect.y+rect.height*fractionY;
      await page.mouse.move(startX,y);
      await page.mouse.down();
      await page.mouse.move(endX,y,{steps:14});
      await page.mouse.up();
    };
    await drawAt(.26);
    await page.locator('.zshell-adjust-handle').click();
    await page.locator('#zshell-adjust-panel [data-size-preset=XL]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),80,'graphite XL changes real engine');
    await page.locator('#zshell-adjust-panel .zshell-adjust-close').click();
    await drawAt(.74);
    const marks=await page.evaluate(()=>{
      const c=document.getElementById('paint');
      const ctx=c.getContext('2d',{willReadFrequently:true});
      function pixels(fy){
        const box=ctx.getImageData(230,Math.round(1280*fy)-110,260,220);
        let marked=0;
        for(let i=3;i<box.data.length;i+=4)if(box.data[i]>4)marked++;
        return marked;
      }
      return {xs:pixels(.26),xl:pixels(.74)};
    });
    assert.ok(marks.xs>3,'XS graphite visibly marks actual canvas ('+marks.xs+')');
    assert.ok(marks.xl>marks.xs*2,'XL graphite makes physically larger stroke: '+JSON.stringify(marks));
    console.log('PASS: contextual 3 slider modes, XS/XL real size and 2B graphite pixel coverage '+JSON.stringify(marks));

    // Artist regression: real Undo/Redo and exported PNG after resizing.
    // Do not equate visible buttons with working history or save behavior.
    const countPaintRegion=async fractionY=>page.evaluate(fy=>{
      const c=document.getElementById('paint');
      const ctx=c.getContext('2d',{willReadFrequently:true});
      const box=ctx.getImageData(230,Math.round(1280*fy)-110,260,220);
      let count=0;
      for(let i=3;i<box.data.length;i+=4)if(box.data[i]>4)count++;
      return count;
    },fractionY);
    const beforeUndo=await countPaintRegion(.74);
    await page.locator('#zshell-right .zshell-handle').click();
    await page.locator('#canvas-rail button[data-act=undo]').click();
    await page.waitForTimeout(150);
    const afterUndo=await countPaintRegion(.74);
    assert.ok(afterUndo<beforeUndo*.4,
      'real Undo removes most of XL graphite pixels: '+JSON.stringify({beforeUndo,afterUndo}));
    await page.locator('#zshell-right .zshell-handle').click();
    await page.locator('#canvas-rail button[data-act=redo]').click();
    await page.waitForTimeout(150);
    const afterRedo=await countPaintRegion(.74);
    assert.ok(afterRedo>beforeUndo*.65,
      'real Redo restores XL graphite pixels: '+JSON.stringify({beforeUndo,afterRedo}));
    console.log('PASS: real graphite Undo/Redo pixels '+JSON.stringify({beforeUndo,afterUndo,afterRedo}));

    // Save with the original tool; inspect actual downloaded PNG bytes and dimensions.
    await page.locator('#zshell-right .zshell-handle').click();
    const downloadReady=page.waitForEvent('download',{timeout:12000});
    await page.locator('#zshell-right-panel .actions button[data-act=export]').click();
    const download=await downloadReady;
    const pngBytes=fs.readFileSync(await download.path());
    assert.deepEqual([...pngBytes.subarray(0,8)],[137,80,78,71,13,10,26,10],
      'real PNG magic header');
    assert.equal(pngBytes.readUInt32BE(16),720,'PNG export width');
    assert.equal(pngBytes.readUInt32BE(20),1280,'PNG export height');
    assert.ok(pngBytes.length>3000,'PNG export has substantial content');
    console.log('PASS: original PNG download valid 720x1280, '+pngBytes.length+' bytes');

    // Rapid toggles must never navigate away or erase the drawing.
    const beforeToggles=await countPaintRegion(.74);
    for(let i=0;i<12;i++){
      const side=i%2?'#zshell-left':'#zshell-right';
      await page.locator(side+' .zshell-handle').click();
      await page.locator(side+' .zshell-close').click();
    }
    assert.ok(page.url().endsWith('/shell-v2.html'),'docking controls never navigate away');
    const afterToggles=await countPaintRegion(.74);
    assert.equal(afterToggles,beforeToggles,'panel toggling never changes art pixels');
    assert.equal(errors.length,0,'no uncaught runtime errors during artist regressions: '+errors.join(' | '));
    console.log('PASS: 12 drawer cycles, same URL, unchanged pixels, no runtime exceptions');


    const retainedPixel=await page.evaluate(()=>{
      const canvas=document.getElementById('reference');
      return Array.from(canvas.getContext('2d',{willReadFrequently:true}).getImageData(11,13,1,1).data);
    });
    assert.deepEqual(retainedPixel,initialPixel,'reference pixel preserved through 5 resizes and fit modes');
    console.log('PASS: floating panel overlay, Fit Canvas/Fill Width, tracing pixel remains, no backing-canvas resize');
    if(errors.length)console.log('Page runtime warnings (not evaluated as an engine PASS): '+errors.slice(0,5).join(' | '));
    // Persistent native brush favorites: save/recall through real data-brush
    // selection and survive reload. No synthetic paint engine substitute.
    await page.locator('#zshell-left .zshell-handle').click();
    const favoriteToggle=page.locator('#zshell-left-panel .zshell-fav-toggle');
    await favoriteToggle.click();
    assert.equal(await favoriteToggle.getAttribute('aria-pressed'),'true',
      'current 2B graphite saved as favorite');
    assert.equal(await page.locator('#zshell-left-panel .zshell-fav-list button[data-brush=graphite]').count(),1,
      'favorite is a real native data-brush selector');
    await page.locator('#drawing-rail button[data-brush=ink]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().brush),'ink',
      'native Indian Ink remains available');
    await page.locator('#zshell-left .zshell-handle').click();
    await page.locator('#zshell-left-panel .zshell-fav-list button[data-brush=graphite]').click();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().brush),'graphite',
      'favorite recalls real 2B engine brush');

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__ZGEN_BETA_26?.state && !!window.__ZGEN_THREE_SHELL);
    await page.locator('#zshell-left .zshell-handle').click();
    assert.equal(await page.locator('#zshell-left-panel .zshell-fav-list button[data-brush=graphite]').count(),1,
      'favorite survives page refresh via localStorage');
    console.log('PASS: native favorite save, real Ink→Graphite recall, survives reload');


    // P0 size acceptance: all five presets must affect the ACTUAL engine, not
    // only a label. Two brush families (fine Indian Ink and Round watercolor)
    // must deposit distinct real 720x1280 paint pixels, including tiny XS.
    // Graphite XS/XL pixel test above remains separately authoritative.
    for(const medium of ['ink','round']){
      const p=await browser.newPage({viewport:{width:390,height:780},hasTouch:true,isMobile:true});
      try{
        await p.goto('http://127.0.0.1:8765/shell-v2.html',{waitUntil:'domcontentloaded'});
        await p.waitForFunction(()=>!!window.__ZGEN_BETA_26?.state && !!window.__ZGEN_THREE_SHELL);
        if(medium==='ink'){
          await p.locator('#zshell-left .zshell-handle').click();
          await p.locator('#zshell-left-panel button[data-brush=ink]').click();
        }
        assert.equal(await p.evaluate(()=>window.__ZGEN_BETA_26.state().brush),medium,
          medium+' selected real native brush');
        const firstSize=await p.evaluate(()=>window.__ZGEN_BETA_26.state().size);
        if(medium==='ink')
          assert.equal(firstSize,3,'Indian Ink must start at practical fine XS, not inherited M');
        await p.locator('.zshell-adjust-handle').click();
        assert.equal(await p.locator('#zshell-adjust-panel [data-size-preset]').count(),5,
          'five native quick-size buttons in every real mark-making tool');
        assert.equal(await p.locator('#zshell-adjust-panel .zshell-advanced').getAttribute('open'),null,
          'technical sliders start collapsed; five simple size buttons are first');
        await p.locator('#zshell-adjust-panel .zshell-adjust-close').click();
        if(medium==='round'){
          // Round is deposited into the native WebGL C4 wet canvas, not #paint.
          // Compare the *same actual GPU canvas* against its clean pre-stroke
          // pixels instead of falsely reporting zero on the 2D dry layer.
          await p.waitForTimeout(300);
          await p.evaluate(()=>{
            const wet=document.querySelector('#c4-wet');
            if(!wet||!wet.getContext('webgl2'))
              throw new Error('Original WebGL wet surface not found');
            const copy=document.createElement('canvas');
            copy.width=720;copy.height=1280;
            const ctx=copy.getContext('2d',{willReadFrequently:true});
            ctx.drawImage(wet,0,0);
            window.__p0WetInitial=ctx.getImageData(0,0,720,1280).data;
          });
        }
        const sizes=[['XS',3],['S',10],['M',22],['L',45],['XL',80]];
        const rows=[.14,.32,.50,.68,.86];
        const areaProof=[];
        for(let n=0;n<sizes.length;n++){
          const [name,value]=sizes[n];
          await p.locator('.zshell-adjust-handle').click();
          const button=p.locator('#zshell-adjust-panel [data-size-preset='+name+']');
          await button.click();
          assert.equal(await p.evaluate(()=>window.__ZGEN_BETA_26.state().size),value,
            medium+' '+name+' must change native size, not just UI');
          await p.locator('#zshell-adjust-panel .zshell-adjust-close').click();
          const rect=await p.locator('#board').boundingBox();
          assert.ok(rect&&rect.width>100,medium+' paper visible');
          const y=rect.y+rect.height*rows[n];
          await p.mouse.move(rect.x+rect.width*.40,y);
          await p.mouse.down();
          await p.mouse.move(rect.x+rect.width*.60,y,{steps:16});
          await p.mouse.up();
          await p.waitForTimeout(180);
          const count=await p.evaluate(({fy,wetMode})=>{
            const canvas=document.querySelector(wetMode?'#c4-wet':'#paint');
            const ctx=wetMode?(()=>{const copy=document.createElement('canvas');
              copy.width=720;copy.height=1280;const c=copy.getContext('2d',{willReadFrequently:true});
              c.drawImage(canvas,0,0);return c;})():canvas.getContext('2d',{willReadFrequently:true});
            const yy=Math.max(0,Math.round(fy*1280)-80);
            const data=ctx.getImageData(210,yy,300,160).data;
            let marked=0;
            if(wetMode){
              const base=window.__p0WetInitial;
              for(let y=0;y<160;y++)for(let x=0;x<300;x++){
                const a=(y*300+x)*4,b=((yy+y)*720+210+x)*4;
                const change=Math.abs(data[a]-base[b])+Math.abs(data[a+1]-base[b+1])+
                  Math.abs(data[a+2]-base[b+2])+Math.abs(data[a+3]-base[b+3]);
                if(change>22)marked++;
              }
            }else{
              for(let i=3;i<data.length;i+=4)if(data[i]>4)marked++;
            }
            return marked;
          },{fy:rows[n],wetMode:medium==='round'});
          areaProof.push({size:name,value,markedPixels:count});
        }
        assert.ok(areaProof[0].markedPixels>3,medium+' XS must actually leave a visible fine mark: '+JSON.stringify(areaProof));
        assert.ok(areaProof[4].markedPixels>areaProof[0].markedPixels*1.8,
          medium+' XL must materially exceed XS physical mark footprint: '+JSON.stringify(areaProof));
        assert.ok(areaProof.every(p=>p.markedPixels>3),
          medium+' every size must paint actual pixels: '+JSON.stringify(areaProof));
        console.log('P0_REAL_BRUSH_SIZE '+JSON.stringify({medium,areaProof}));
        // One tap at any moment, deterministic commands for future Van Gogh voice.
        const api=await p.evaluate(()=>{
          const controls=window.__ZGEN_BRUSH_CONTROLS;
          const before=controls.brush;
          const changed=controls.setPreset('XS');
          const xs=window.__ZGEN_BETA_26.state().size;
          const stepped=controls.stepSize(1);
          const small=window.__ZGEN_BETA_26.state().size;
          return {before,changed,xs,stepped,small};
        });
        assert.deepEqual({changed:api.changed,xs:api.xs,stepped:api.stepped,small:api.small},
          {changed:true,xs:3,stepped:true,small:10},medium+' voice-ready tap size must drive native drawing');
        // Tool-specific size retained when a different brush uses its own default.
        await p.locator('#zshell-left .zshell-handle').click();
        await p.locator('#zshell-left-panel button[data-brush=graphite]').click();
        await p.waitForFunction(()=>window.__ZGEN_BRUSH_CONTROLS?.brush==='graphite');
        assert.equal(await p.evaluate(()=>window.__ZGEN_BETA_26.state().size),3,
          '2B Graphite starts at a thin XS regardless of previous brush');
        if(medium==='ink'){
          await p.locator('#zshell-left .zshell-handle').click();
          await p.locator('#zshell-left-panel button[data-brush=ink]').click();
        }else{
          await p.locator('#zshell-bottom .zshell-handle').click();
          await p.locator('#zshell-bottom-panel button[data-act=brush]').click();
          await p.locator('#drawer button[data-brush=round]').click();
        }
        await p.waitForFunction(key=>window.__ZGEN_BRUSH_CONTROLS?.brush===key,medium);
        assert.equal(await p.evaluate(()=>window.__ZGEN_BETA_26.state().size),10,
          medium+' remembers its last adjusted size when selected again');
        console.log('P0_PER_TOOL_SIZE_MEMORY '+JSON.stringify({medium,api,graphite:3,restored:10}));

      }finally{await p.close();}
    }

  } finally { await browser.close(); }
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
