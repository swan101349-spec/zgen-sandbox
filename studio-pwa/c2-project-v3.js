/*
 * ZGenArtStudio Pro | C2 P0 editable-project v3 CONTAINER (isolated QA candidate).
 * Does NOT install Save/Open buttons, mutate canvas, or download files.
 * Requires verified ZGenC2WetCodec v1. Caller must validate ALL fields before
 * changing any existing artist canvas; browser image decode is a separate gate.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.ZGenC2ProjectV3=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const FORMAT="ZGenArtStudio", VERSION=3, MAX_JSON_BYTES=30*1024*1024;
  const MAX_PNG_LENGTH=12*1024*1024;
  const DIMENSION=Object.freeze([720,1280]);
  const GPU=Object.freeze(["inkA","inkB","fixedA","fixedB","wet"]);
  const NUMERIC=Object.freeze(["size","water","pigment","grain","opacity","refOpacity"]);
  const OPTIONAL=Object.freeze(["lineWeight","lazy"]);
  const COLORS=/^#[0-9a-fA-F]{6}$/;
  const NAMES=/^[a-z][a-z0-9-]{0,31}$/;
  function check(ok,tag){if(!ok)throw Error("C2_PROJECT_"+tag)}
  function object(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)}
  function keys(x,allowed,label){
    check(object(x),label+"_OBJECT");
    for(const k of Object.keys(x))
      check(allowed.includes(k)&&k!=="__proto__"&&k!=="constructor",label+"_KEY");
  }
  function validDimension(d){
    check(Array.isArray(d)&&d.length===2&&d[0]===DIMENSION[0]&&d[1]===DIMENSION[1],
      "DIMENSION_MISMATCH");
  }
  function png(data,label){
    check(typeof data==="string"&&data.length>=70&&data.length<=MAX_PNG_LENGTH,
      label+"_SIZE");
    const prefix="data:image/png;base64,";
    check(data.startsWith(prefix),"BAD_"+label+"_PNG");
    const payload=data.slice(prefix.length);
    check(payload.length%4===0&&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload),
      "BAD_"+label+"_BASE64");
    let bytes;
    try { bytes=atob(payload.slice(0,40)); }catch(e){throw Error("C2_PROJECT_BAD_"+label+"_BASE64")}
    const sig=[137,80,78,71,13,10,26,10];
    check(sig.every((x,i)=>bytes.charCodeAt(i)===x),"BAD_"+label+"_PNG");
    check(bytes.slice(12,16)==="IHDR","BAD_"+label+"_IHDR");
    const u32=i=>((bytes.charCodeAt(i)*16777216)+
      (bytes.charCodeAt(i+1)<<16)+(bytes.charCodeAt(i+2)<<8)+bytes.charCodeAt(i+3));
    check(u32(16)===720&&u32(20)===1280,label+"_PIXEL_DIMENSION_MISMATCH");
    return data;
  }
  function controls(x){
    keys(x,["brush","color","paper",...NUMERIC,...OPTIONAL],"CONTROLS");
    check(typeof x.brush==="string"&&NAMES.test(x.brush),"BAD_BRUSH");
    check(typeof x.color==="string"&&COLORS.test(x.color),"BAD_PIGMENT");
    if(x.paper!==undefined)check(typeof x.paper==="string"&&NAMES.test(x.paper),"BAD_PAPER");
    for(const k of NUMERIC){
      check(typeof x[k]==="number"&&Number.isFinite(x[k]),"BAD_"+k.toUpperCase());
      const lo=k==="size"?.5:0,hi=k==="size"?256:100;
      check(x[k]>=lo&&x[k]<=hi,"BAD_"+k.toUpperCase());
    }
    for(const k of OPTIONAL)if(x[k]!==undefined){
      check(typeof x[k]==="number"&&Number.isFinite(x[k])&&x[k]>=0&&x[k]<=100,"BAD_"+k.toUpperCase());
    }
    return Object.assign({},x);
  }
  function native(s){
    check(object(s)&&s.version==="c4-webgl2/1","NATIVE_VERSION");
    check(object(s.document)&&object(s.document.whole),"NATIVE_DOCUMENT");
    const l=s.document.whole.layers;
    keys(l,GPU,"GPU_LAYERS");
    check(GPU.every(k=>l[k] instanceof Uint16Array),"GPU_ARRAY_REQUIRED");
    const len=l.wet.length;
    check(GPU.slice(0,4).every(k=>l[k].length===len*4),"GPU_LAYER_SIZE");
    check(len<=720*1280,"GPU_PIXEL_LIMIT");
    check(object(s.document.paper)&&typeof s.document.paper.id==="string","PAPER_STATE");
    check(object(s.document.wet),"WET_STATE");
    return s;
  }
  function codec(){
    const x=typeof globalThis!=="undefined"?globalThis.ZGenC2WetCodec:undefined;
    check(x&&x.FORMAT==="ZGenArtStudio-C4Snapshot"&&x.VERSION===1,"CODEC_UNAVAILABLE");
    return x;
  }
  function checkTop(data,legacy){
    const permitted=["format","version","dimension","paint","reference",
      "brush","color","size","water","pigment","grain","opacity","refOpacity",
      "paper","lineWeight","lazy"];
    if(!legacy)permitted.push("wet");
    keys(data,permitted,"FILE");
    check(data.format===FORMAT&&data.version===(legacy?2:VERSION),"FORMAT");
    validDimension(data.dimension);
  }
  function pack(options){
    keys(options,["paint","reference","dimension","controls","wetSnapshot"],"INPUT");
    validDimension(options.dimension);
    const c=controls(options.controls);
    png(options.paint,"PAINT");png(options.reference,"REFERENCE");
    const wet=codec().pack(native(options.wetSnapshot));
    const result=Object.assign({format:FORMAT,version:VERSION,
      dimension:DIMENSION.slice(),paint:options.paint,reference:options.reference},c,{wet});
    check(JSON.stringify(result).length<=MAX_JSON_BYTES,"FILE_SIZE");
    return result;
  }
  // Output is decoded, validated data only. No Image.decode/restore/pointer side effects.
  function unpack(value,opts){
    const legacy=object(value)&&value.version===2;
    if(legacy)check(opts&&opts.allowLegacy===true,"LEGACY_V2_REQUIRES_OPT_IN");
    checkTop(value,legacy);
    const paint=png(value.paint,"PAINT"),reference=png(value.reference,"REFERENCE");
    const names=["brush","color","size","water","pigment","grain","opacity","refOpacity",
      "paper","lineWeight","lazy"],c={};
    for(const k of names)if(value[k]!==undefined)c[k]=value[k];
    const normalized=controls(c);
    const wetSnapshot=legacy?null:native(codec().unpack(value.wet));
    return Object.freeze({version:value.version,legacy,dimension:DIMENSION.slice(),
      paint,reference,controls:normalized,wetSnapshot});
  }
  function parse(text,opts){
    check(typeof text==="string"&&text.length>0&&text.length<=MAX_JSON_BYTES,"FILE_SIZE");
    let input;
    try {input=JSON.parse(text)}catch(e){throw Error("C2_PROJECT_JSON_PARSE")}
    return unpack(input,opts);
  }
  function stringify(options){
    const out=JSON.stringify(pack(options));
    check(out.length<=MAX_JSON_BYTES,"FILE_SIZE");
    return out;
  }
  return Object.freeze({pack,unpack,parse,stringify,FORMAT,VERSION,MAX_JSON_BYTES});
});
