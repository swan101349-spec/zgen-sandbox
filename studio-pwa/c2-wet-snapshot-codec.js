/*
 * ZGenArtStudio Pro | Experimental C2 native wet-snapshot serialization codec.
 * QA ONLY: No painter, DOM, localStorage, export button, or download side effects.
 *
 * V1 currently supports null, safe plain JSON records/arrays, finite numbers,
 * Uint16Array GPU half-float layers, and Uint8Array. Fails closed on other types.
 * Uint16 is encoded little-endian so C2 is portable across JS hosts.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.ZGenC2WetCodec=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const MAX_RAW_BYTES=64*1024*1024;
  const MAX_DEPTH=32, MAX_FIELDS=100000;
  const FORMAT="ZGenArtStudio-C4Snapshot",VERSION=1;
  const arrays=Object.freeze({Uint16Array:Uint16Array,Uint8Array:Uint8Array});
  function assert(ok,reason){if(!ok)throw Error("C2_CODEC_"+reason)}
  function toBase64(bytes){
    let chunks=[];
    for(let i=0;i<bytes.length;i+=32768)
      chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
    return btoa(chunks.join(""));
  }
  function fromBase64(data){
    assert(typeof data==="string"&&data.length%4===0&&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data),
      "BAD_BASE64");
    const binary=atob(data),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  function pack(snapshot){
    let bytes=0,fields=0;
    function encode(value,depth){
      assert(depth<=MAX_DEPTH,"DEPTH_EXCEEDED");
      if(value===null||typeof value==="string"||typeof value==="boolean")return value;
      if(typeof value==="number"){
        if(Number.isFinite(value))return value;
        return {__zgenNumber:Number.isNaN(value)?"NaN":value===Infinity?"Infinity":"-Infinity"};
      }
      if(value instanceof Uint16Array||value instanceof Uint8Array){
        const width=value instanceof Uint16Array?2:1;
        bytes+=value.length*width;
        assert(bytes<=MAX_RAW_BYTES,"SIZE_EXCEEDED");
        const raw=new Uint8Array(value.length*width);
        if(width===1)raw.set(value);
        else{
          const view=new DataView(raw.buffer);
          for(let i=0;i<value.length;i++)view.setUint16(i*2,value[i],true);
        }
        return {__zgenTyped:value.constructor.name,length:value.length,data:toBase64(raw)};
      }
      assert(typeof value==="object"&&value!==undefined,"UNSUPPORTED_VALUE");
      if(Array.isArray(value)){
        assert(value.length<=MAX_FIELDS,"ARRAY_TOO_LARGE");
        return value.map(x=>encode(x,depth+1));
      }
      assert(Object.getPrototypeOf(value)===Object.prototype||
        Object.getPrototypeOf(value)===null,"UNSUPPORTED_OBJECT");
      const keys=Object.keys(value);fields+=keys.length;
      assert(fields<=MAX_FIELDS,"FIELDS_EXCEEDED");
      assert(!keys.includes("__zgenTyped")&&!keys.includes("__zgenNumber"),"RESERVED_KEY");
      let target={};
      for(const k of keys){
        assert(k!=="__proto__"&&k!=="constructor"&&k!=="prototype","UNSAFE_KEY");
        target[k]=encode(value[k],depth+1);
      }
      return target;
    }
    assert(snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot),"SNAPSHOT_REQUIRED");
    const encoded=encode(snapshot,0);
    return {format:FORMAT,version:VERSION,byteOrder:"LE",
      rawByteCountVerified:bytes,snapshot:encoded};
  }
  function unpack(packageData){
    assert(packageData&&typeof packageData==="object"&&!Array.isArray(packageData),
      "PACKAGE_REQUIRED");
    assert(packageData.format===FORMAT&&packageData.version===VERSION&&
      packageData.byteOrder==="LE","VERSION_UNSUPPORTED");
    let total=0,fields=0;
    function decode(value,depth){
      assert(depth<=MAX_DEPTH,"DEPTH_EXCEEDED");
      if(value===null||typeof value==="string"||typeof value==="boolean")return value;
      if(typeof value==="number"){assert(Number.isFinite(value),"BARE_NONFINITE");return value}
      assert(value&&typeof value==="object","BAD_NODE");
      if(Array.isArray(value)){
        assert(value.length<=MAX_FIELDS,"ARRAY_TOO_LARGE");
        return value.map(x=>decode(x,depth+1));
      }
      const keys=Object.keys(value);fields+=keys.length;
      assert(fields<=MAX_FIELDS,"FIELDS_EXCEEDED");
      if(Object.prototype.hasOwnProperty.call(value,"__zgenNumber")){
        assert(keys.length===1&&
          ["NaN","Infinity","-Infinity"].includes(value.__zgenNumber),
          "BAD_NUMERIC_SENTINEL");
        return value.__zgenNumber==="NaN"?NaN:
          value.__zgenNumber==="Infinity"?Infinity:-Infinity;
      }
      if(Object.prototype.hasOwnProperty.call(value,"__zgenTyped")){
        assert(keys.length===3&&keys.includes("length")&&keys.includes("data"),
          "BAD_TYPED_RECORD");
        const ctor=arrays[value.__zgenTyped],width=value.__zgenTyped==="Uint16Array"?2:1;
        assert(!!ctor&&Number.isSafeInteger(value.length)&&value.length>=0,
          "BAD_TYPED_ARRAY");
        total+=value.length*width;assert(total<=MAX_RAW_BYTES,"SIZE_EXCEEDED");
        const raw=fromBase64(value.data);
        assert(raw.length===value.length*width,"BYTE_LENGTH_MISMATCH");
        const out=new ctor(value.length);
        if(width===1)out.set(raw);
        else {
          const dv=new DataView(raw.buffer);
          for(let i=0;i<out.length;i++)out[i]=dv.getUint16(i*2,true);
        }
        return out;
      }
      let target={};
      for(const k of keys){
        assert(k!=="__proto__"&&k!=="constructor"&&k!=="prototype","UNSAFE_KEY");
        target[k]=decode(value[k],depth+1);
      }
      return target;
    }
    const snapshot=decode(packageData.snapshot,0);
    assert(snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot),"BAD_SNAPSHOT");
    assert(total===packageData.rawByteCountVerified,"BYTE_COUNT_MISMATCH");
    return snapshot;
  }
  return Object.freeze({pack,unpack,FORMAT,VERSION,MAX_RAW_BYTES});
});
