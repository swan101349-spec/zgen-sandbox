/* ZGenArtStudio Pro — Lyrical Pencil #1 | recovered private-engine geometry
 * Live renderer uses ONLY the existing native 720×1280 #paint Canvas2D context.
 * It owns NO pointer listeners, canvas, reference layer, saved project or Undo
 * stack. Native C1 must call begin/move/end within its existing transaction.
 * Pressure opens a curved, grainy fan; light movement returns to fine graphite.
 */
(()=>{
'use strict';
const grades=Object.freeze({
  '2H':{width:.72,opacity:.42,fan:.65,gamma:1.45,grain:.62},
  H:{width:.85,opacity:.54,fan:.84,gamma:1.25,grain:.55},
  HB:{width:1,opacity:.65,fan:1,gamma:1.05,grain:.48},
  B:{width:1.08,opacity:.72,fan:1.12,gamma:.97,grain:.43},
  '2B':{width:1.18,opacity:.78,fan:1.25,gamma:.90,grain:.38},
  '4B':{width:1.38,opacity:.88,fan:1.5,gamma:.78,grain:.28},
  '6B':{width:1.62,opacity:.94,fan:1.8,gamma:.68,grain:.20},
  '8B':{width:1.90,opacity:.99,fan:2.15,gamma:.58,grain:.12}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safeColor=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#383838';
const opts={grade:'2B',size:'fine',fan:.72,mode:'graphite',sensitivity:.65};
const sizes=Object.freeze({xs:.37,fine:.67,standard:1,wide:1.7});
let stroke=null,sequence=0;
let lastMetrics={strokes:0,segments:0,minWidth:0,maxWidth:0,maxFlare:0,pressureMin:1,pressureMax:0,marks:0};
function parameters(pressure,tilt,bend,settings={}){
  const grade=grades[opts.grade]||grades['2B'];
  const nativeSize=clamp(Number(settings.size)||22,1,100);
  const base=(.6+nativeSize*.118)*(sizes[opts.size]||1);
  const p=clamp(pressure,.035,1);
  const curvedPressure=Math.pow(p,grade.gamma*(1.25-opts.sensitivity*.5));
  const sideways=clamp(tilt,0,1);
  const turn=clamp(bend,0,Math.PI)/Math.PI;
  const core=Math.max(.4,base*grade.width*(.17+1.26*curvedPressure));
  const flare=base*grade.fan*opts.fan*(.14+2.7*Math.pow(p,1.6))*
    (.35+sideways*1.55)*(1+turn*1.4);
  const alpha=clamp((Number(settings.opacity)||95)/100*grade.opacity*
    (.22+.78*curvedPressure),.02,.98);
  return {core,flare:clamp(flare,0,55),alpha,pressure:p,sideways,turn,
    color:safeColor(settings.color)};
}
function sourcePressure(ev,speed){
  if(ev.pointerType==='pen'&&Number.isFinite(ev.pressure)&&ev.pressure>0)
    return clamp(ev.pressure,.035,1);
  // Finger/mouse has no reliable hardware pressure; slow marks deposit pigment.
  const simulated=clamp(.82-Math.min(1,speed/2.6)*.57,.18,.84);
  return ev.pointerType==='touch'&&Number.isFinite(ev.pressure)&&ev.pressure>0
    ?clamp(.45*ev.pressure+.55*simulated,.04,1):simulated;
}
function sideTilt(ev,speed){
  if(ev.pointerType==='pen')return clamp(Math.hypot(ev.tiltX||0,ev.tiltY||0)/80,0,1);
  return clamp(.15+Math.min(.4,speed/4),.1,.55);
}
function record(geom){
  lastMetrics.minWidth=Math.min(lastMetrics.minWidth||geom.core,geom.core);
  lastMetrics.maxWidth=Math.max(lastMetrics.maxWidth,geom.core);
  lastMetrics.maxFlare=Math.max(lastMetrics.maxFlare,geom.flare);
  lastMetrics.pressureMin=Math.min(lastMetrics.pressureMin,geom.pressure);
  lastMetrics.pressureMax=Math.max(lastMetrics.pressureMax,geom.pressure);
}
function markTip(ctx,pt,geom){
  ctx.save();
  ctx.fillStyle=geom.color;ctx.globalAlpha=geom.alpha*.70;
  ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(.35,geom.core*.25),0,Math.PI*2);ctx.fill();
  ctx.restore();lastMetrics.marks++;
}
// One recovered atmospheric pencil at a time. Dry Scrub uses the
// ORIGINAL native C1 pointer/history transaction, never a second canvas.
// The geometry follows the private atmospheric pencil's directional recipe:
// short, rotating translucent marks, scaled by real pen pressure and flare.
// True watercolor ★ is deliberately NOT simulated by dry Canvas2D.
function scrubDry(ctx,a,b,now,tangent){
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  if(length<.001)return;
  const nx=-tangent.y,ny=tangent.x;
  const coverage=clamp((now.core+now.flare)*1.6,3,48);
  const samples=Math.min(18,Math.max(2,Math.ceil(length/3)));
  const count=clamp(Math.round((.85+opts.fan)*3),2,8);
  const heading=Math.atan2(tangent.y,tangent.x);
  ctx.save();ctx.strokeStyle=now.color;ctx.lineCap='round';
  for(let s=0;s<samples;s++){
    const f=(s+.5)/samples;
    const cx=a.x+(b.x-a.x)*f,cy=a.y+(b.y-a.y)*f;
    for(let m=0;m<count;m++){
      // Stable deterministic marks across replay; no Math.random jitter.
      let seed=(Math.imul(stroke?.id||1,2654435761)^
        Math.imul(stroke?.points.length||1,2246822519)^
        Math.imul(s+1,3266489917)^Math.imul(m+1,668265263))>>>0;
      const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
      const across=(rnd()-.5)*coverage*1.8;
      const along=(rnd()-.5)*Math.min(10,coverage*.38);
      const x=cx+nx*across+tangent.x*along;
      const y=cy+ny*across+tangent.y*along;
      const angle=heading+(rnd()-.5)*Math.PI*1.35;
      const span=coverage*(.16+.25*rnd());
      const half=span*.5, dx=Math.cos(angle)*half,dy=Math.sin(angle)*half;
      const x1=clamp(x-dx,0,720),y1=clamp(y-dy,0,1280);
      const x2=clamp(x+dx,0,720),y2=clamp(y+dy,0,1280);
      if(Math.hypot(x2-x1,y2-y1)<.5)continue;
      ctx.globalAlpha=clamp(now.alpha*(.23+.34*rnd())*(.65+.35*now.pressure),.01,.26);
      ctx.lineWidth=.45+.32*rnd();
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      lastMetrics.marks++;
    }
  }
  ctx.restore();
}
function render(ctx,a,b,prior,now,tangent,bend){
  if(opts.mode==='scrub'){scrubDry(ctx,a,b,now,tangent);return;}
  const nx=-tangent.y,ny=tangent.x;
  ctx.save();
  ctx.strokeStyle=now.color;ctx.lineCap='round';ctx.lineJoin='round';
  // The core is an expressive graphite line, not a computer-perfect solid tube.
  ctx.globalAlpha=clamp((prior.alpha+now.alpha)*.44,.02,.94);
  ctx.lineWidth=Math.max(.45,(prior.core+now.core)*.5);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();lastMetrics.marks++;
  // Rib curves sweep sideways when pressure, tilt and curvature increase.
  // Each rib stays translucent, so repeated movements build graphite texture.
  const ribs=clamp(Math.ceil(now.flare/3.4),1,13);
  if(now.flare>1.1&&ribs>1){
    for(let j=0;j<ribs;j++){
      const u=(j/(ribs-1)-.5)*2;
      const falloff=Math.pow(Math.max(0,1-Math.abs(u)),.67);
      if(falloff<.035)continue;
      const spanA=prior.flare*.5*u,spanB=now.flare*.5*u;
      const width=clamp(now.core*(.11+.15*falloff),.42,1.8);
      ctx.globalAlpha=clamp(now.alpha*(.09+.33*falloff)*Math.pow(now.pressure,.55),.012,.41);
      ctx.lineWidth=width;
      ctx.beginPath();ctx.moveTo(a.x+nx*spanA,a.y+ny*spanA);
      ctx.quadraticCurveTo(
        (a.x+b.x)*.5+nx*(spanA+spanB)*.53+ny*bend*.75,
        (a.y+b.y)*.5+ny*(spanA+spanB)*.53-nx*bend*.75,
        b.x+nx*spanB,b.y+ny*spanB
      );ctx.stroke();lastMetrics.marks++;
    }
  }
  // The user's original four procedural language modes; graphite is default.
  if(opts.mode==='sketchy'){
    // Pressure-responsive graphite fragments that run along the SAME gesture.
    // Alternating offset strokes give the hand-drawn broken-pencil character.
    const rhythm=(stroke?.points.length||0)+Math.round(bend*8);
    const lift=(rhythm%9===4);
    const side=1.5+now.flare*.14;
    if(!lift){
      ctx.globalAlpha=clamp(now.alpha*(.10+.17*now.pressure),.015,.32);
      ctx.lineWidth=Math.max(.4,now.core*(.11+.13*now.pressure));
      ctx.beginPath();
      ctx.moveTo(a.x+nx*side,a.y+ny*side);
      ctx.quadraticCurveTo((a.x+b.x)*.5-nx*side*.9,
        (a.y+b.y)*.5-ny*side*.9,b.x+nx*side*.65,b.y+ny*side*.65);
      ctx.stroke();lastMetrics.marks++;
    }
    // Small lifted graphite crosshatches follow the curvature of a strong
    // turn. They diminish when the pen returns to a quiet/light gesture.
    if(bend>.12&&now.pressure>.24&&rhythm%3!==1){
      const radius=Math.min(7,now.flare*.16+now.core*.28);
      const mid={x:(a.x+b.x)*.5,y:(a.y+b.y)*.5};
      ctx.globalAlpha=now.alpha*.12*now.pressure;ctx.lineWidth=.48;
      ctx.beginPath();ctx.moveTo(mid.x-nx*radius,mid.y-ny*radius);
      ctx.lineTo(mid.x+nx*radius,mid.y+ny*radius);
      ctx.stroke();lastMetrics.marks++;
    }
  }else if(opts.mode==='shader'){
    const count=Math.min(6,Math.ceil(now.pressure*5));
    ctx.globalAlpha=now.alpha*.19;ctx.lineWidth=.55;
    for(let k=0;k<count;k++){
      const frac=(k+.5)/count,len=now.flare*(.2+.3*frac);
      const x=a.x+(b.x-a.x)*frac,y=a.y+(b.y-a.y)*frac;
      ctx.beginPath();ctx.moveTo(x-nx*len,y-ny*len);ctx.lineTo(x+nx*len,y+ny*len);ctx.stroke();
      lastMetrics.marks++;
    }
  }else if(opts.mode==='harmony'&&stroke?.points.length>5){
    // Fine chord lines connect previous notes on the artist's own path.
    // The short and long offsets respond to loop spacing and pressure;
    // they never become an independent canvas or a separate pointer owner.
    const history=stroke.points;
    for(const lag of [5,11]){
      if(history.length<=lag)continue;
      const anchor=history[history.length-1-lag];
      const dist=Math.hypot(b.x-anchor.x,b.y-anchor.y);
      if(dist<7||dist>132)continue;
      const strength=clamp(now.alpha*(.08+.13*now.pressure),.009,.19);
      ctx.globalAlpha=lag===11?strength*.65:strength;
      ctx.lineWidth=lag===11?.42:.55;
      ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.quadraticCurveTo((b.x+anchor.x)*.5+nx*bend*3.5,
        (b.y+anchor.y)*.5+ny*bend*3.5,anchor.x,anchor.y);
      ctx.stroke();lastMetrics.marks++;
    }
  }
  ctx.restore();
}
function begin(pt,ev,ctx,settings={}){
  if(stroke||!ctx||ctx.canvas?.id!=='paint')return false;
  if(!Number.isFinite(pt?.x)||!Number.isFinite(pt?.y))return false;
  const t=Number.isFinite(ev.timeStamp)?ev.timeStamp:performance.now();
  const p=sourcePressure(ev,0),geom=parameters(p,sideTilt(ev,0),0,settings);
  stroke={id:++sequence,points:[{...pt}],prev:{...pt},geom,
    t,pressure:p,tangent:{x:1,y:0},settings};
  lastMetrics={strokes:lastMetrics.strokes+1,segments:0,minWidth:0,maxWidth:0,maxFlare:0,
    pressureMin:1,pressureMax:0,marks:0};
  markTip(ctx,pt,geom);record(geom);
  return true;
}
function move(pt,ev,ctx,settings={}){
  if(!stroke||!ctx||ctx.canvas?.id!=='paint')return false;
  if(!Number.isFinite(pt?.x)||!Number.isFinite(pt?.y))return false;
  const prev=stroke.prev,dx=pt.x-prev.x,dy=pt.y-prev.y,dist=Math.hypot(dx,dy);
  if(dist<.35)return false;
  const now=Number.isFinite(ev.timeStamp)?ev.timeStamp:performance.now();
  const speed=dist/Math.max(1,now-stroke.t);
  let p=sourcePressure(ev,speed);
  p=stroke.pressure*.22+p*.78;
  const tangent={x:dx/dist,y:dy/dist};
  const bend=Math.acos(clamp(stroke.tangent.x*tangent.x+stroke.tangent.y*tangent.y,-1,1));
  const final=parameters(p,sideTilt(ev,speed),bend,settings);
  const steps=Math.max(1,Math.ceil(dist/2.9));
  let prior=stroke.geom;
  for(let i=1;i<=steps;i++){
    const u=i/steps;
    const from={x:prev.x+dx*(i-1)/steps,y:prev.y+dy*(i-1)/steps};
    const to={x:prev.x+dx*u,y:prev.y+dy*u};
    const interpolated={
      core:stroke.geom.core+(final.core-stroke.geom.core)*u,
      flare:stroke.geom.flare+(final.flare-stroke.geom.flare)*u,
      alpha:stroke.geom.alpha+(final.alpha-stroke.geom.alpha)*u,
      pressure:stroke.geom.pressure+(final.pressure-stroke.geom.pressure)*u,
      color:final.color
    };
    render(ctx,from,to,prior,interpolated,tangent,bend);
    prior=interpolated;
    record(interpolated);
  }
  stroke.prev={...pt};stroke.geom=final;stroke.pressure=p;stroke.tangent=tangent;
  stroke.t=now;stroke.points.push({...pt});
  if(stroke.points.length>2048)stroke.points.shift();
  lastMetrics.segments++;return true;
}
function end(ctx){
  if(!stroke)return false;
  stroke=null;return true;
}
function cancel(){stroke=null;}
function configure(patch){
  if(stroke||!patch||typeof patch!=='object')return false;
  if(patch.grade!==undefined&&Object.hasOwn(grades,patch.grade))opts.grade=patch.grade;
  if(patch.size!==undefined&&Object.hasOwn(sizes,patch.size))opts.size=patch.size;
  if(patch.mode!==undefined&&['graphite','harmony','sketchy','shader','scrub'].includes(patch.mode))opts.mode=patch.mode;
  if(patch.fan!==undefined&&Number.isFinite(Number(patch.fan)))opts.fan=clamp(Number(patch.fan),0,1);
  return true;
}
const api=Object.freeze({ready:true,begin,move,end,cancel,configure,
  getOptions:()=>({...opts}),metrics:()=>({...lastMetrics,drawing:!!stroke}),
  measure:(pressure,tilt=0,bend=0,settings={size:22,opacity:95,color:'#383838'})=>
    parameters(pressure,tilt,bend,settings)
});
Object.defineProperty(window,'__ZGEN_LYRICAL_ONE',{value:api,configurable:false});
})();
