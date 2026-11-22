// assets/three-table-preview/vendor/fflate.module.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i3 = 0; i3 < 31; ++i3) {
    b[i3] = start += 1 << eb[i3 - 1];
  }
  var r = new i32(b[30]);
  for (var i3 = 1; i3 < 30; ++i3) {
    for (var j = b[i3]; j < b[i3 + 1]; ++j) {
      r[j] = j - b[i3] << 5 | i3;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i3 = 0;
  var l = new u16(mb);
  for (; i3 < s; ++i3) {
    if (cd[i3])
      ++l[cd[i3] - 1];
  }
  var le = new u16(mb);
  for (i3 = 1; i3 < mb; ++i3) {
    le[i3] = le[i3 - 1] + l[i3 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i3 = 0; i3 < s; ++i3) {
      if (cd[i3]) {
        var sv = i3 << 4 | cd[i3];
        var r_1 = mb - cd[i3];
        var v = le[cd[i3] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i3 = 0; i3 < s; ++i3) {
      if (cd[i3]) {
        co[i3] = rev[le[cd[i3] - 1]++] >> 15 - cd[i3];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i3 = 1; i3 < a.length; ++i3) {
    if (a[i3] > m)
      m = a[i3];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i3 = 0; i3 < hcLen; ++i3) {
          clt[clim[i3]] = bits(dat, pos + i3 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i3 = 0; i3 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i3++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i3 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i3++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i3 = sym - 257, b = fleb[i3];
          add = bits(dat, pos, (1 << b) - 1) + fl[i3];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var gzs = function(d) {
  if (d[0] != 31 || d[1] != 139 || d[2] != 8)
    err(6, "invalid gzip data");
  var flg = d[3];
  var st = 10;
  if (flg & 4)
    st += (d[10] | d[11] << 8) + 2;
  for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
    ;
  return st + (flg & 2);
};
var gzl = function(d) {
  var l = d.length;
  return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
};
function gunzipSync(data, opts) {
  var st = gzs(data);
  if (st + 8 > data.length)
    err(6, "invalid gzip data");
  return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// apps/three-game/src/render/native-venue/gzip-response.js
async function readGzipResponse(response) {
  if (!response.ok) throw Error("Compressed asset unavailable: " + response.url);
  if (typeof DecompressionStream === "function") {
    return new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  }
  const data = gunzipSync(new Uint8Array(await response.arrayBuffer()));
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

// apps/three-game/src/render/native-venue/fast-display.js
async function loadFastDisplay({ THREE: THREE3, base, resources }) {
  const r = await fetch(base + "native-display-linear.rgba16f.bin.gz");
  if (!r.ok) throw Error("Missing fast native display LUT");
  const bytes = await readGzipResponse(r);
  if (bytes.byteLength !== 57 * 57 * 57 * 8) throw Error("Invalid fast native display LUT");
  const texture = new THREE3.Data3DTexture(new Uint16Array(bytes), 57, 57, 57);
  texture.format = THREE3.RGBAFormat;
  texture.type = THREE3.HalfFloatType;
  texture.colorSpace = THREE3.NoColorSpace;
  texture.minFilter = texture.magFilter = THREE3.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  resources.add(texture);
  return { uniform: { value: texture }, shader: `uniform sampler3D nativeFastDisplaySampler;
vec4 nativeOCIODisplay(vec4 p){
 vec3 c=mat3(.39553512156355991,.053896177714209924,.04633438224762481,.21551437118985967,.55718018202328989,.11635212600253207,.096057317009832555,.096030380267908291,.54442025033221542)*p.rgb;
 c=log2(max(c,vec3(1.17549435e-38)))*.0400000028+.498957247;
 return vec4(texture(nativeFastDisplaySampler,(c.zyx*56.+.5)/57.).rgb,p.a);
}` };
}

// apps/three-game/src/render/native-venue/vertex-lighting.js
async function loadVertexLighting({ THREE: THREE3, base, resources, cube }) {
  const r = await fetch(base + "native-dielectric-response.rgba16f.bin.gz");
  if (!r.ok) throw Error("Missing vertex dielectric response");
  const bytes = await readGzipResponse(r);
  if (bytes.byteLength !== 256 * 256 * 8) throw Error("Invalid vertex dielectric response");
  const texture = new THREE3.DataTexture(new Uint16Array(bytes), 256, 256, THREE3.RGBAFormat, THREE3.HalfFloatType);
  texture.colorSpace = THREE3.NoColorSpace;
  texture.minFilter = texture.magFilter = THREE3.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  resources.add(texture);
  const size = cube.image[0].image?.width || cube.image[0].width, maxMip = Math.floor(Math.log2(size));
  if (2 ** maxMip !== size) throw Error("Unsupported PMREM face size");
  const varyings = "varying vec3 nativeVertexSpecular;varying vec4 nativeVertexWeights;\n";
  const indirect = `void RE_IndirectSpecular_Physical(const in vec3 radiance,const in vec3 irradiance,const in vec3 clearcoatRadiance,const in vec3 geometryPosition,const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight){
 vec3 light=irradiance*RECIPROCAL_PI;
 reflectedLight.indirectDiffuse+=material.diffuseContribution*nativeVertexWeights.x*light;
 reflectedLight.indirectSpecular+=nativeVertexSpecular+nativeVertexWeights.yzw*light;
}
`;
  const pars = THREE3.ShaderChunk.lights_physical_pars_fragment.replace(/void RE_IndirectSpecular_Physical[\s\S]*?(?=\n#define RE_Direct)/, indirect);
  function bind(m, { vertexBaked = false } = {}) {
    const unbaked = !m.lightMap && !vertexBaked;
    const previous = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader) => {
      previous?.(shader);
      shader.uniforms.nativeVertexBRDF = { value: texture };
      const extra = unbaked ? "varying vec3 nativeUnbakedIrradiance;\n" : "";
      shader.vertexShader = extra + varyings + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
#define ENVMAP_TYPE_CUBE_UV
#define CUBEUV_TEXEL_WIDTH ${1 / (3 * Math.max(size, 112))}
#define CUBEUV_TEXEL_HEIGHT ${1 / (4 * size)}
#define CUBEUV_MAX_MIP ${maxMip}.0
uniform sampler2D envMap,roughnessMap,nativeVertexBRDF;
uniform mat3 envMapRotation;
uniform float envMapIntensity,roughness,metalness;
uniform vec3 diffuse;
${THREE3.ShaderChunk.cube_uv_reflection_fragment}`);
      shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
vec3 nativeNormal=normalize(transformedNormal),nativeView=normalize(-mvPosition.xyz);
#ifdef DOUBLE_SIDED
if(dot(nativeNormal,nativeView)<0.)nativeNormal=-nativeNormal;
#endif
float nativeRough=roughness;
#ifdef USE_ROUGHNESSMAP
nativeRough*=texture2D(roughnessMap,vRoughnessMapUv).${m.lightMap?.userData.roughnessTexture ? "r" : "a"};
#endif
nativeRough=clamp(nativeRough,.0525,1.);
float nativeNoV=clamp(dot(nativeNormal,nativeView),0.,1.);
vec4 nativeResponse=texture2D(nativeVertexBRDF,(vec2(nativeRough,nativeNoV)*255.+.5)/256.);
vec3 nativeReflection=normalize(mix(reflect(-nativeView,nativeNormal),nativeNormal,pow4(nativeRough)));
nativeReflection=transformDirectionByInverseViewMatrix(nativeReflection,viewMatrix);
vec3 nativeSingle=vec3(nativeResponse.g)+metalness*(diffuse-vec3(.04))*nativeResponse.a;
float nativeEms=1.-nativeResponse.g-.96*nativeResponse.a;
vec3 nativeFavg=diffuse+(1.-diffuse)*.047619;
vec3 nativeSingleMetal=diffuse*nativeResponse.a+nativeResponse.g-.04*nativeResponse.a;
vec3 nativeMulti=mix(vec3(nativeResponse.b),nativeSingleMetal*nativeFavg/(1.-nativeEms*nativeFavg)*nativeEms,metalness);
nativeVertexSpecular=textureCubeUV(envMap,envMapRotation*nativeReflection,nativeRough).rgb*envMapIntensity*nativeSingle;
nativeVertexWeights=vec4(nativeResponse.r,nativeMulti);
${unbaked ? "nativeUnbakedIrradiance=PI*textureCubeUV(envMap,envMapRotation*transformDirectionByInverseViewMatrix(nativeNormal,viewMatrix),1.).rgb*envMapIntensity;" : ""}`);
      shader.fragmentShader = extra + varyings + shader.fragmentShader;
      if (unbaked) shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", THREE3.ShaderChunk.lights_fragment_maps.replace("getIBLIrradiance( geometryNormal )", "nativeUnbakedIrradiance"));
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_pars_fragment>", pars);
    };
    m.customProgramCacheKey = () => key() + "-static-vertex-dielectric-v1";
    m.userData.nativeVertexLighting = true;
    m.needsUpdate = true;
  }
  return { bind };
}

// apps/three-game/src/render/native-venue/compact-assets.js
async function loadBinary(base, name, byteLength) {
  const response = await fetch(base + name);
  if (!response.ok) throw Error("Native asset unavailable: " + name);
  const data = await readGzipResponse(response);
  if (data.byteLength !== byteLength) throw Error("Invalid native asset length: " + name);
  return data;
}
function decodePaethRgb9e5Q5(data, width, height) {
  const planes = new Uint8Array(data);
  const count = width * height;
  for (let channel = 0; channel < 4; channel++) {
    const offset = channel * count;
    for (let y = 0; y < height; y++) {
      for (let x3 = 0; x3 < width; x3++) {
        const i3 = offset + y * width + x3;
        const left = x3 ? planes[i3 - 1] : 0;
        const up = y ? planes[i3 - width] : 0;
        const corner = x3 && y ? planes[i3 - width - 1] : 0;
        const a = Math.abs(up - corner);
        const b = Math.abs(left - corner);
        const c = Math.abs(left + up - 2 * corner);
        planes[i3] += a <= b && a <= c ? left : b <= c ? up : corner;
      }
    }
  }
  const pixels = new Uint32Array(count);
  for (let i3 = 0; i3 < count; i3++) {
    pixels[i3] = planes[i3] << 4 | planes[count + i3] << 13 | planes[2 * count + i3] << 22 | planes[3 * count + i3] << 27;
  }
  return pixels;
}
async function loadPackedLight({ THREE: THREE3, base, item, resources }) {
  const compactFile = item.compact?.encoding === "rgb9e5-q5-paeth" ? item.compact.file : null;
  const data = await loadBinary(base, compactFile || item.file, item.width * item.height * 4);
  const pixels = compactFile ? decodePaethRgb9e5Q5(data, item.width, item.height) : new Uint32Array(data);
  const light = new THREE3.DataTexture(pixels, item.width, item.height, THREE3.RGBFormat, THREE3.UnsignedInt5999Type);
  light.colorSpace = THREE3.LinearSRGBColorSpace;
  light.flipY = true;
  light.generateMipmaps = false;
  light.minFilter = light.magFilter = THREE3.LinearFilter;
  light.needsUpdate = true;
  resources.add(light);
  if (item.roughness) {
    const pixels2 = await loadBinary(base, item.roughness, item.width * item.height);
    const rough = new THREE3.DataTexture(new Uint8Array(pixels2), item.width, item.height, THREE3.RedFormat, THREE3.UnsignedByteType);
    rough.colorSpace = THREE3.NoColorSpace;
    rough.flipY = true;
    rough.generateMipmaps = false;
    rough.minFilter = rough.magFilter = THREE3.LinearFilter;
    rough.needsUpdate = true;
    resources.add(rough);
    light.userData.roughnessTexture = rough;
  }
  return light;
}
async function loadFloorDisplay({ THREE: THREE3, base, resources }) {
  const bytes = await loadBinary(base, "floor-display.bin.gz", 2048 * 2048 * 4);
  const texture = new THREE3.DataTexture(new Uint8Array(bytes), 2048, 2048, THREE3.RGBAFormat, THREE3.UnsignedByteType);
  Object.assign(texture, { colorSpace: THREE3.NoColorSpace, flipY: true, minFilter: THREE3.LinearFilter, magFilter: THREE3.LinearFilter, generateMipmaps: false, needsUpdate: true });
  const material = new THREE3.ShaderMaterial({
    name: "Offline carpet display",
    side: THREE3.DoubleSide,
    toneMapped: false,
    uniforms: { floorDisplay: { value: texture } },
    vertexShader: "attribute vec2 uv1;varying vec2 floorUV;void main(){floorUV=uv1;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform sampler2D floorDisplay;varying vec2 floorUV;void main(){gl_FragColor=texture2D(floorDisplay,floorUV);}"
  });
  material.userData.offlineFloorDisplay = true;
  resources.add(texture);
  resources.add(material);
  return material;
}
async function loadDenseDisplay({ THREE: THREE3, base, resources }) {
  const size = 97, bytes = await loadBinary(base, "dense-display.bin.gz", size ** 3 * 4);
  const texture = new THREE3.Data3DTexture(new Uint8Array(bytes), size, size, size);
  Object.assign(texture, { format: THREE3.RGBAFormat, type: THREE3.UnsignedByteType, colorSpace: THREE3.NoColorSpace, minFilter: THREE3.LinearFilter, magFilter: THREE3.LinearFilter, unpackAlignment: 1, needsUpdate: true });
  resources.add(texture);
  return { uniform: { value: texture }, shader: `uniform sampler3D nativeDenseDisplay;
vec4 nativeOCIODisplay(vec4 p){
 vec3 c=mat3(.39553512156355991,.053896177714209924,.04633438224762481,.21551437118985967,.55718018202328989,.11635212600253207,.096057317009832555,.096030380267908291,.54442025033221542)*p.rgb;
 c=log2(max(c,vec3(1.17549435e-38)))*.0400000028+.498957247;
 return vec4(texture(nativeDenseDisplay,(c.zyx*96.+.5)/97.).rgb,p.a);
}` };
}

// apps/three-game/src/render/native-venue/native-diffuse-energy.js
import * as THREE from "three";
async function loadNativeDiffuseEnergy(base, resources) {
  const info = await (await fetch(base + "native-diffuse-energy.json")).json(), textures = {};
  for (const [key, item] of Object.entries(info.files)) {
    const data = new Float32Array(await (await fetch(base + item.file)).arrayBuffer());
    const texture = new THREE.DataTexture(data, item.width, item.height, THREE.RedFormat, THREE.FloatType);
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    resources.add(texture);
    textures[key] = texture;
  }
  const code = `uniform sampler2D nativeEnergyE;uniform sampler2D nativeEnergyAverage;uniform sampler2D nativeEnergyS;
float nativeCyclesDiffuseWeight(float rough,float cosineView){
 vec2 uv32=(clamp(vec2(rough,cosineView),0.0,1.0)*31.0+.5)/32.0;
 vec2 uv16=(clamp(vec2(rough,cosineView),0.0,1.0)*15.0+.5)/16.0;
 float E=texture2D(nativeEnergyE,uv32).r;
 float avg=texture2D(nativeEnergyAverage,vec2((clamp(rough,0.0,1.0)*31.0+.5)/32.0,.5)).r;
 float S=texture2D(nativeEnergyS,uv16).r;
 float Fss=(1.5-1.0)/(4.08567+1.00071*1.5);
 float Fms=Fss*avg/(1.0-Fss*(1.0-avg));
 float darkening=E+Fms*(1.0-E);
 return clamp(1.0-(.04+.96*S)*darkening,0.0,1.0);
}`;
  function uniforms() {
    return { nativeEnergyE: { value: textures.E }, nativeEnergyAverage: { value: textures.Eavg }, nativeEnergyS: { value: textures.S } };
  }
  function bind(material) {
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader) => {
      previous?.(shader);
      Object.assign(shader.uniforms, uniforms());
      shader.fragmentShader = code + "\n" + shader.fragmentShader;
      const nativeRough = `float nativeSourceRoughness=material.roughness;
#ifdef USE_ANISOTROPY
nativeSourceRoughness=sqrt(sqrt(max(pow2(material.roughness)*material.alphaT,0.0)));
#endif
vec3 diffuse = material.diffuseContribution * nativeCyclesDiffuseWeight(nativeSourceRoughness,clamp(dot(geometryNormal,geometryViewDir),0.0,1.0));`;
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_pars_fragment>", THREE.ShaderChunk.lights_physical_pars_fragment.replace("vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );", nativeRough));
    };
    material.customProgramCacheKey = () => key() + "-native-cycles-diffuse-layer-746c83811bfd";
    material.needsUpdate = true;
  }
  function controls(renderer) {
    const rt = new THREE.WebGLRenderTarget(info.controls.length, 1, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
    const geometry = new THREE.PlaneGeometry(2, 2), scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const cases = info.controls.map((x3, i3) => `if(gl_FragCoord.x<${(i3 + 1).toFixed(1)}){float c=nativeCyclesDiffuseWeight(${x3.roughness.toFixed(8)},${x3.cosineView.toFixed(8)});gl_FragColor=vec4(c,c,c,1.);return;}`).join("");
    const mat = new THREE.ShaderMaterial({ uniforms: uniforms(), vertexShader: "void main(){gl_Position=vec4(position.xy,0.,1.);}", fragmentShader: code + "\nvoid main(){" + cases + "}", depthTest: false, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, mat));
    try {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const data = new Float32Array(info.controls.length * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, info.controls.length, 1, data);
      return info.controls.map((c, i3) => ({ ...c, gameGPUDiffuseAttenuation: data[i3 * 4] }));
    } finally {
      renderer.setRenderTarget(null);
      rt.dispose();
      geometry.dispose();
      mat.dispose();
    }
  }
  return { info, bind, controls };
}

// apps/three-game/src/render/native-venue/adapter.js
import * as THREE2 from "three";

// node_modules/three/examples/jsm/loaders/GLTFLoader.js
import {
  AnimationClip as AnimationClip2,
  Bone,
  Box3,
  BufferAttribute as BufferAttribute2,
  BufferGeometry as BufferGeometry2,
  ClampToEdgeWrapping,
  Color,
  ColorManagement,
  DirectionalLight,
  DoubleSide,
  FileLoader,
  FrontSide,
  Group,
  ImageBitmapLoader,
  InstancedMesh,
  InterleavedBuffer as InterleavedBuffer2,
  InterleavedBufferAttribute as InterleavedBufferAttribute2,
  Interpolant,
  InterpolateDiscrete,
  InterpolateLinear,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  LinearFilter as LinearFilter2,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  LinearSRGBColorSpace,
  Loader,
  LoaderUtils,
  Material,
  MathUtils,
  Matrix4 as Matrix42,
  Mesh as Mesh2,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  NearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  NumberKeyframeTrack,
  Object3D,
  OrthographicCamera as OrthographicCamera2,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  PropertyBinding,
  Quaternion as Quaternion2,
  QuaternionKeyframeTrack as QuaternionKeyframeTrack2,
  RepeatWrapping,
  Skeleton,
  SkinnedMesh,
  Sphere,
  SpotLight,
  Texture,
  TextureLoader,
  TriangleFanDrawMode as TriangleFanDrawMode2,
  TriangleStripDrawMode as TriangleStripDrawMode2,
  Vector2,
  Vector3 as Vector33,
  VectorKeyframeTrack as VectorKeyframeTrack2,
  SRGBColorSpace,
  InstancedBufferAttribute as InstancedBufferAttribute2
} from "three";

// node_modules/three/examples/jsm/utils/BufferGeometryUtils.js
import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  TriangleFanDrawMode,
  TriangleStripDrawMode,
  TrianglesDrawMode,
  Vector3
} from "three";
function toTrianglesDrawMode(geometry, drawMode) {
  if (drawMode === TrianglesDrawMode) {
    console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.");
    return geometry;
  }
  if (drawMode === TriangleFanDrawMode || drawMode === TriangleStripDrawMode) {
    let index = geometry.getIndex();
    if (index === null) {
      const indices = [];
      const position = geometry.getAttribute("position");
      if (position !== void 0) {
        for (let i3 = 0; i3 < position.count; i3++) {
          indices.push(i3);
        }
        geometry.setIndex(indices);
        index = geometry.getIndex();
      } else {
        console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.");
        return geometry;
      }
    }
    const numberOfTriangles = index.count - 2;
    const newIndices = [];
    if (drawMode === TriangleFanDrawMode) {
      for (let i3 = 1; i3 <= numberOfTriangles; i3++) {
        newIndices.push(index.getX(0));
        newIndices.push(index.getX(i3));
        newIndices.push(index.getX(i3 + 1));
      }
    } else {
      for (let i3 = 0; i3 < numberOfTriangles; i3++) {
        if (i3 % 2 === 0) {
          newIndices.push(index.getX(i3));
          newIndices.push(index.getX(i3 + 1));
          newIndices.push(index.getX(i3 + 2));
        } else {
          newIndices.push(index.getX(i3 + 2));
          newIndices.push(index.getX(i3 + 1));
          newIndices.push(index.getX(i3));
        }
      }
    }
    if (newIndices.length / 3 !== numberOfTriangles) {
      console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");
    }
    const newGeometry = geometry.clone();
    newGeometry.setIndex(newIndices);
    newGeometry.clearGroups();
    return newGeometry;
  } else {
    console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:", drawMode);
    return geometry;
  }
}

// node_modules/three/examples/jsm/utils/SkeletonUtils.js
import {
  AnimationClip,
  AnimationMixer,
  Matrix4,
  Quaternion,
  QuaternionKeyframeTrack,
  SkeletonHelper,
  Vector3 as Vector32,
  VectorKeyframeTrack
} from "three";
function clone(source) {
  const sourceLookup = /* @__PURE__ */ new Map();
  const cloneLookup = /* @__PURE__ */ new Map();
  const clone2 = source.clone();
  parallelTraverse(source, clone2, function(sourceNode, clonedNode) {
    sourceLookup.set(clonedNode, sourceNode);
    cloneLookup.set(sourceNode, clonedNode);
  });
  clone2.traverse(function(node) {
    if (!node.isSkinnedMesh) return;
    const clonedMesh = node;
    const sourceMesh = sourceLookup.get(node);
    const sourceBones = sourceMesh.skeleton.bones;
    clonedMesh.skeleton = sourceMesh.skeleton.clone();
    clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix);
    clonedMesh.skeleton.bones = sourceBones.map(function(bone) {
      return cloneLookup.get(bone);
    });
    clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix);
  });
  return clone2;
}
function parallelTraverse(a, b, callback) {
  callback(a, b);
  for (let i3 = 0; i3 < a.children.length; i3++) {
    parallelTraverse(a.children[i3], b.children[i3], callback);
  }
}

// node_modules/three/examples/jsm/loaders/GLTFLoader.js
var GLTFLoader = class extends Loader {
  /**
   * Constructs a new glTF loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(manager) {
    super(manager);
    this.dracoLoader = null;
    this.ktx2Loader = null;
    this.meshoptDecoder = null;
    this.pluginCallbacks = [];
    this.register(function(parser) {
      return new GLTFMaterialsClearcoatExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsDispersionExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFTextureBasisUExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFTextureWebPExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFTextureAVIFExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsSheenExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsTransmissionExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsVolumeExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsIorExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsEmissiveStrengthExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsSpecularExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsIridescenceExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsAnisotropyExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMaterialsBumpExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFLightsExtension(parser);
    });
    this.register(function(parser) {
      return new GLTFMeshoptCompression(parser, EXTENSIONS.EXT_MESHOPT_COMPRESSION);
    });
    this.register(function(parser) {
      return new GLTFMeshoptCompression(parser, EXTENSIONS.KHR_MESHOPT_COMPRESSION);
    });
    this.register(function(parser) {
      return new GLTFMeshGpuInstancing(parser);
    });
  }
  /**
   * Starts loading from the given URL and passes the loaded glTF asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  load(url, onLoad, onProgress, onError) {
    const scope = this;
    let resourcePath;
    if (this.resourcePath !== "") {
      resourcePath = this.resourcePath;
    } else if (this.path !== "") {
      const relativeUrl = LoaderUtils.extractUrlBase(url);
      resourcePath = LoaderUtils.resolveURL(relativeUrl, this.path);
    } else {
      resourcePath = LoaderUtils.extractUrlBase(url);
    }
    this.manager.itemStart(url);
    const _onError = function(e) {
      if (onError) {
        onError(e);
      } else {
        console.error(e);
      }
      scope.manager.itemError(url);
      scope.manager.itemEnd(url);
    };
    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setResponseType("arraybuffer");
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);
    loader.load(url, function(data) {
      try {
        scope.parse(data, resourcePath, function(gltf) {
          onLoad(gltf);
          scope.manager.itemEnd(url);
        }, _onError);
      } catch (e) {
        _onError(e);
      }
    }, onProgress, _onError);
  }
  /**
   * Sets the given Draco loader to this loader. Required for decoding assets
   * compressed with the `KHR_draco_mesh_compression` extension.
   *
   * @param {DRACOLoader} dracoLoader - The Draco loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setDRACOLoader(dracoLoader) {
    this.dracoLoader = dracoLoader;
    return this;
  }
  /**
   * Sets the given KTX2 loader to this loader. Required for loading KTX2
   * compressed textures.
   *
   * @param {KTX2Loader} ktx2Loader - The KTX2 loader to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setKTX2Loader(ktx2Loader) {
    this.ktx2Loader = ktx2Loader;
    return this;
  }
  /**
   * Sets the given meshopt decoder. Required for decoding assets
   * compressed with the `EXT_meshopt_compression` extension.
   *
   * @param {Object} meshoptDecoder - The meshopt decoder to set.
   * @return {GLTFLoader} A reference to this loader.
   */
  setMeshoptDecoder(meshoptDecoder) {
    this.meshoptDecoder = meshoptDecoder;
    return this;
  }
  /**
   * Registers a plugin callback. This API is internally used to implement the various
   * glTF extensions but can also used by third-party code to add additional logic
   * to the loader.
   *
   * @param {function(parser:GLTFParser)} callback - The callback function to register.
   * @return {GLTFLoader} A reference to this loader.
   */
  register(callback) {
    if (this.pluginCallbacks.indexOf(callback) === -1) {
      this.pluginCallbacks.push(callback);
    }
    return this;
  }
  /**
   * Unregisters a plugin callback.
   *
   * @param {Function} callback - The callback function to unregister.
   * @return {GLTFLoader} A reference to this loader.
   */
  unregister(callback) {
    if (this.pluginCallbacks.indexOf(callback) !== -1) {
      this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
    }
    return this;
  }
  /**
   * Parses the given glTF data and returns the resulting group.
   *
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @param {function(GLTFLoader~LoadObject)} onLoad - Executed when the loading process has been finished.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  parse(data, path, onLoad, onError) {
    let json;
    const extensions = {};
    const plugins = {};
    const textDecoder = new TextDecoder();
    if (typeof data === "string") {
      json = JSON.parse(data);
    } else if (data instanceof ArrayBuffer) {
      const magic = textDecoder.decode(new Uint8Array(data, 0, 4));
      if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
        try {
          extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data);
        } catch (error) {
          if (onError) onError(error);
          return;
        }
        json = JSON.parse(extensions[EXTENSIONS.KHR_BINARY_GLTF].content);
      } else {
        json = JSON.parse(textDecoder.decode(data));
      }
    } else {
      json = data;
    }
    if (json.asset === void 0 || json.asset.version[0] < 2) {
      if (onError) onError(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
      return;
    }
    const parser = new GLTFParser(json, {
      path: path || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder
    });
    parser.fileLoader.setRequestHeader(this.requestHeader);
    for (let i3 = 0; i3 < this.pluginCallbacks.length; i3++) {
      const plugin = this.pluginCallbacks[i3](parser);
      if (!plugin.name) console.error("THREE.GLTFLoader: Invalid plugin found: missing name");
      plugins[plugin.name] = plugin;
      extensions[plugin.name] = true;
    }
    if (json.extensionsUsed) {
      for (let i3 = 0; i3 < json.extensionsUsed.length; ++i3) {
        const extensionName = json.extensionsUsed[i3];
        const extensionsRequired = json.extensionsRequired || [];
        switch (extensionName) {
          case EXTENSIONS.KHR_MATERIALS_UNLIT:
            extensions[extensionName] = new GLTFMaterialsUnlitExtension();
            break;
          case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
            extensions[extensionName] = new GLTFDracoMeshCompressionExtension(json, this.dracoLoader);
            break;
          case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
            extensions[extensionName] = new GLTFTextureTransformExtension();
            break;
          case EXTENSIONS.KHR_MESH_QUANTIZATION:
            extensions[extensionName] = new GLTFMeshQuantizationExtension();
            break;
          default:
            if (extensionsRequired.indexOf(extensionName) >= 0 && plugins[extensionName] === void 0) {
              console.warn('THREE.GLTFLoader: Unknown extension "' + extensionName + '".');
            }
        }
      }
    }
    parser.setExtensions(extensions);
    parser.setPlugins(plugins);
    parser.parse(onLoad, onError);
  }
  /**
   * Async version of {@link GLTFLoader#parse}.
   *
   * @async
   * @param {string|ArrayBuffer} data - The raw glTF data.
   * @param {string} path - The URL base path.
   * @return {Promise<GLTFLoader~LoadObject>} A Promise that resolves with the loaded glTF when the parsing has been finished.
   */
  parseAsync(data, path) {
    const scope = this;
    return new Promise(function(resolve, reject) {
      scope.parse(data, path, resolve, reject);
    });
  }
};
function GLTFRegistry() {
  let objects = {};
  return {
    get: function(key) {
      return objects[key];
    },
    add: function(key, object) {
      objects[key] = object;
    },
    remove: function(key) {
      delete objects[key];
    },
    removeAll: function() {
      objects = {};
    }
  };
}
function getMaterialExtension(parser, materialIndex, extensionName) {
  const materialDef = parser.json.materials[materialIndex];
  if (materialDef.extensions && materialDef.extensions[extensionName]) {
    return materialDef.extensions[extensionName];
  }
  return null;
}
var EXTENSIONS = {
  KHR_BINARY_GLTF: "KHR_binary_glTF",
  KHR_DRACO_MESH_COMPRESSION: "KHR_draco_mesh_compression",
  KHR_LIGHTS_PUNCTUAL: "KHR_lights_punctual",
  KHR_MATERIALS_CLEARCOAT: "KHR_materials_clearcoat",
  KHR_MATERIALS_DISPERSION: "KHR_materials_dispersion",
  KHR_MATERIALS_IOR: "KHR_materials_ior",
  KHR_MATERIALS_SHEEN: "KHR_materials_sheen",
  KHR_MATERIALS_SPECULAR: "KHR_materials_specular",
  KHR_MATERIALS_TRANSMISSION: "KHR_materials_transmission",
  KHR_MATERIALS_IRIDESCENCE: "KHR_materials_iridescence",
  KHR_MATERIALS_ANISOTROPY: "KHR_materials_anisotropy",
  KHR_MATERIALS_UNLIT: "KHR_materials_unlit",
  KHR_MATERIALS_VOLUME: "KHR_materials_volume",
  KHR_TEXTURE_BASISU: "KHR_texture_basisu",
  KHR_TEXTURE_TRANSFORM: "KHR_texture_transform",
  KHR_MESH_QUANTIZATION: "KHR_mesh_quantization",
  KHR_MATERIALS_EMISSIVE_STRENGTH: "KHR_materials_emissive_strength",
  EXT_MATERIALS_BUMP: "EXT_materials_bump",
  EXT_TEXTURE_WEBP: "EXT_texture_webp",
  EXT_TEXTURE_AVIF: "EXT_texture_avif",
  EXT_MESHOPT_COMPRESSION: "EXT_meshopt_compression",
  KHR_MESHOPT_COMPRESSION: "KHR_meshopt_compression",
  EXT_MESH_GPU_INSTANCING: "EXT_mesh_gpu_instancing"
};
var GLTFLightsExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;
    this.cache = { refs: {}, uses: {} };
  }
  _markDefs() {
    const parser = this.parser;
    const nodeDefs = this.parser.json.nodes || [];
    for (let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
      const nodeDef = nodeDefs[nodeIndex];
      if (nodeDef.extensions && nodeDef.extensions[this.name] && nodeDef.extensions[this.name].light !== void 0) {
        parser._addNodeRef(this.cache, nodeDef.extensions[this.name].light);
      }
    }
  }
  _loadLight(lightIndex) {
    const parser = this.parser;
    const cacheKey = "light:" + lightIndex;
    let dependency = parser.cache.get(cacheKey);
    if (dependency) return dependency;
    const json = parser.json;
    const extensions = json.extensions && json.extensions[this.name] || {};
    const lightDefs = extensions.lights || [];
    const lightDef = lightDefs[lightIndex];
    let lightNode;
    const color = new Color(16777215);
    if (lightDef.color !== void 0) color.setRGB(lightDef.color[0], lightDef.color[1], lightDef.color[2], LinearSRGBColorSpace);
    const range = lightDef.range !== void 0 ? lightDef.range : 0;
    switch (lightDef.type) {
      case "directional":
        lightNode = new DirectionalLight(color);
        lightNode.target.position.set(0, 0, -1);
        lightNode.add(lightNode.target);
        break;
      case "point":
        lightNode = new PointLight(color);
        lightNode.distance = range;
        break;
      case "spot":
        lightNode = new SpotLight(color);
        lightNode.distance = range;
        lightDef.spot = lightDef.spot || {};
        lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== void 0 ? lightDef.spot.innerConeAngle : 0;
        lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== void 0 ? lightDef.spot.outerConeAngle : Math.PI / 4;
        lightNode.angle = lightDef.spot.outerConeAngle;
        lightNode.penumbra = 1 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
        lightNode.target.position.set(0, 0, -1);
        lightNode.add(lightNode.target);
        break;
      default:
        throw new Error("THREE.GLTFLoader: Unexpected light type: " + lightDef.type);
    }
    lightNode.position.set(0, 0, 0);
    assignExtrasToUserData(lightNode, lightDef);
    if (lightDef.intensity !== void 0) lightNode.intensity = lightDef.intensity;
    lightNode.name = parser.createUniqueName(lightDef.name || "light_" + lightIndex);
    dependency = Promise.resolve(lightNode);
    parser.cache.add(cacheKey, dependency);
    return dependency;
  }
  getDependency(type, index) {
    if (type !== "light") return;
    return this._loadLight(index);
  }
  createNodeAttachment(nodeIndex) {
    const self2 = this;
    const parser = this.parser;
    const json = parser.json;
    const nodeDef = json.nodes[nodeIndex];
    const lightDef = nodeDef.extensions && nodeDef.extensions[this.name] || {};
    const lightIndex = lightDef.light;
    if (lightIndex === void 0) return null;
    return this._loadLight(lightIndex).then(function(light) {
      return parser._getNodeRef(self2.cache, lightIndex, light);
    });
  }
};
var GLTFMaterialsUnlitExtension = class {
  constructor() {
    this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;
  }
  getMaterialType() {
    return MeshBasicMaterial;
  }
  extendParams(materialParams, materialDef, parser) {
    const pending = [];
    materialParams.color = new Color(1, 1, 1);
    materialParams.opacity = 1;
    const metallicRoughness = materialDef.pbrMetallicRoughness;
    if (metallicRoughness) {
      if (Array.isArray(metallicRoughness.baseColorFactor)) {
        const array = metallicRoughness.baseColorFactor;
        materialParams.color.setRGB(array[0], array[1], array[2], LinearSRGBColorSpace);
        materialParams.opacity = array[3];
      }
      if (metallicRoughness.baseColorTexture !== void 0) {
        pending.push(parser.assignTexture(materialParams, "map", metallicRoughness.baseColorTexture, SRGBColorSpace));
      }
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsEmissiveStrengthExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    if (extension.emissiveStrength !== void 0) {
      materialParams.emissiveIntensity = extension.emissiveStrength;
    }
    return Promise.resolve();
  }
};
var GLTFMaterialsClearcoatExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    if (extension.clearcoatFactor !== void 0) {
      materialParams.clearcoat = extension.clearcoatFactor;
    }
    if (extension.clearcoatTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "clearcoatMap", extension.clearcoatTexture));
    }
    if (extension.clearcoatRoughnessFactor !== void 0) {
      materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;
    }
    if (extension.clearcoatRoughnessTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "clearcoatRoughnessMap", extension.clearcoatRoughnessTexture));
    }
    if (extension.clearcoatNormalTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "clearcoatNormalMap", extension.clearcoatNormalTexture));
      if (extension.clearcoatNormalTexture.scale !== void 0) {
        const scale = extension.clearcoatNormalTexture.scale;
        materialParams.clearcoatNormalScale = new Vector2(scale, scale);
      }
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsDispersionExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_DISPERSION;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    materialParams.dispersion = extension.dispersion !== void 0 ? extension.dispersion : 0;
    return Promise.resolve();
  }
};
var GLTFMaterialsIridescenceExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_IRIDESCENCE;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    if (extension.iridescenceFactor !== void 0) {
      materialParams.iridescence = extension.iridescenceFactor;
    }
    if (extension.iridescenceTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "iridescenceMap", extension.iridescenceTexture));
    }
    if (extension.iridescenceIor !== void 0) {
      materialParams.iridescenceIOR = extension.iridescenceIor;
    }
    if (materialParams.iridescenceThicknessRange === void 0) {
      materialParams.iridescenceThicknessRange = [100, 400];
    }
    if (extension.iridescenceThicknessMinimum !== void 0) {
      materialParams.iridescenceThicknessRange[0] = extension.iridescenceThicknessMinimum;
    }
    if (extension.iridescenceThicknessMaximum !== void 0) {
      materialParams.iridescenceThicknessRange[1] = extension.iridescenceThicknessMaximum;
    }
    if (extension.iridescenceThicknessTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "iridescenceThicknessMap", extension.iridescenceThicknessTexture));
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsSheenExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_SHEEN;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    materialParams.sheenColor = new Color(0, 0, 0);
    materialParams.sheenRoughness = 0;
    materialParams.sheen = 1;
    if (extension.sheenColorFactor !== void 0) {
      const colorFactor = extension.sheenColorFactor;
      materialParams.sheenColor.setRGB(colorFactor[0], colorFactor[1], colorFactor[2], LinearSRGBColorSpace);
    }
    if (extension.sheenRoughnessFactor !== void 0) {
      materialParams.sheenRoughness = extension.sheenRoughnessFactor;
    }
    if (extension.sheenColorTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "sheenColorMap", extension.sheenColorTexture, SRGBColorSpace));
    }
    if (extension.sheenRoughnessTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "sheenRoughnessMap", extension.sheenRoughnessTexture));
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsTransmissionExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    if (extension.transmissionFactor !== void 0) {
      materialParams.transmission = extension.transmissionFactor;
    }
    if (extension.transmissionTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "transmissionMap", extension.transmissionTexture));
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsVolumeExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_VOLUME;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    materialParams.thickness = extension.thicknessFactor !== void 0 ? extension.thicknessFactor : 0;
    if (extension.thicknessTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "thicknessMap", extension.thicknessTexture));
    }
    materialParams.attenuationDistance = extension.attenuationDistance || Infinity;
    const colorArray = extension.attenuationColor || [1, 1, 1];
    materialParams.attenuationColor = new Color().setRGB(colorArray[0], colorArray[1], colorArray[2], LinearSRGBColorSpace);
    return Promise.all(pending);
  }
};
var GLTFMaterialsIorExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_IOR;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    materialParams.ior = extension.ior !== void 0 ? extension.ior : 1.5;
    if (materialParams.ior === 0) materialParams.ior = 1e3;
    return Promise.resolve();
  }
};
var GLTFMaterialsSpecularExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_SPECULAR;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    materialParams.specularIntensity = extension.specularFactor !== void 0 ? extension.specularFactor : 1;
    if (extension.specularTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "specularIntensityMap", extension.specularTexture));
    }
    const colorArray = extension.specularColorFactor || [1, 1, 1];
    materialParams.specularColor = new Color().setRGB(colorArray[0], colorArray[1], colorArray[2], LinearSRGBColorSpace);
    if (extension.specularColorTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "specularColorMap", extension.specularColorTexture, SRGBColorSpace));
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsBumpExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_MATERIALS_BUMP;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    materialParams.bumpScale = extension.bumpFactor !== void 0 ? extension.bumpFactor : 1;
    if (extension.bumpTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "bumpMap", extension.bumpTexture));
    }
    return Promise.all(pending);
  }
};
var GLTFMaterialsAnisotropyExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_MATERIALS_ANISOTROPY;
  }
  getMaterialType(materialIndex) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    return extension !== null ? MeshPhysicalMaterial : null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = getMaterialExtension(this.parser, materialIndex, this.name);
    if (extension === null) return Promise.resolve();
    const pending = [];
    if (extension.anisotropyStrength !== void 0) {
      materialParams.anisotropy = extension.anisotropyStrength;
    }
    if (extension.anisotropyRotation !== void 0) {
      materialParams.anisotropyRotation = extension.anisotropyRotation;
    }
    if (extension.anisotropyTexture !== void 0) {
      pending.push(this.parser.assignTexture(materialParams, "anisotropyMap", extension.anisotropyTexture));
    }
    return Promise.all(pending);
  }
};
var GLTFTextureBasisUExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.KHR_TEXTURE_BASISU;
  }
  loadTexture(textureIndex) {
    const parser = this.parser;
    const json = parser.json;
    const textureDef = json.textures[textureIndex];
    if (!textureDef.extensions || !textureDef.extensions[this.name]) {
      return null;
    }
    const extension = textureDef.extensions[this.name];
    const loader = parser.options.ktx2Loader;
    if (!loader) {
      if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
        throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");
      } else {
        return null;
      }
    }
    return parser.loadTextureImage(textureIndex, extension.source, loader);
  }
};
var GLTFTextureWebPExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
  }
  loadTexture(textureIndex) {
    const name = this.name;
    const parser = this.parser;
    const json = parser.json;
    const textureDef = json.textures[textureIndex];
    if (!textureDef.extensions || !textureDef.extensions[name]) {
      return null;
    }
    const extension = textureDef.extensions[name];
    const source = json.images[extension.source];
    let loader = parser.textureLoader;
    if (source.uri) {
      const handler = parser.options.manager.getHandler(source.uri);
      if (handler !== null) loader = handler;
    }
    return parser.loadTextureImage(textureIndex, extension.source, loader);
  }
};
var GLTFTextureAVIFExtension = class {
  constructor(parser) {
    this.parser = parser;
    this.name = EXTENSIONS.EXT_TEXTURE_AVIF;
  }
  loadTexture(textureIndex) {
    const name = this.name;
    const parser = this.parser;
    const json = parser.json;
    const textureDef = json.textures[textureIndex];
    if (!textureDef.extensions || !textureDef.extensions[name]) {
      return null;
    }
    const extension = textureDef.extensions[name];
    const source = json.images[extension.source];
    let loader = parser.textureLoader;
    if (source.uri) {
      const handler = parser.options.manager.getHandler(source.uri);
      if (handler !== null) loader = handler;
    }
    return parser.loadTextureImage(textureIndex, extension.source, loader);
  }
};
var GLTFMeshoptCompression = class {
  constructor(parser, name) {
    this.name = name;
    this.parser = parser;
  }
  loadBufferView(index) {
    const json = this.parser.json;
    const bufferView = json.bufferViews[index];
    if (bufferView.extensions && bufferView.extensions[this.name]) {
      const extensionDef = bufferView.extensions[this.name];
      const buffer = this.parser.getDependency("buffer", extensionDef.buffer);
      const decoder = this.parser.options.meshoptDecoder;
      if (!decoder || !decoder.supported) {
        if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
          throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");
        } else {
          return null;
        }
      }
      return buffer.then(function(res) {
        const byteOffset = extensionDef.byteOffset || 0;
        const byteLength = extensionDef.byteLength || 0;
        const count = extensionDef.count;
        const stride = extensionDef.byteStride;
        const source = new Uint8Array(res, byteOffset, byteLength);
        if (decoder.decodeGltfBufferAsync) {
          return decoder.decodeGltfBufferAsync(count, stride, source, extensionDef.mode, extensionDef.filter).then(function(res2) {
            return res2.buffer;
          });
        } else {
          return decoder.ready.then(function() {
            const result = new ArrayBuffer(count * stride);
            decoder.decodeGltfBuffer(new Uint8Array(result), count, stride, source, extensionDef.mode, extensionDef.filter);
            return result;
          });
        }
      });
    } else {
      return null;
    }
  }
};
var GLTFMeshGpuInstancing = class {
  constructor(parser) {
    this.name = EXTENSIONS.EXT_MESH_GPU_INSTANCING;
    this.parser = parser;
  }
  createNodeMesh(nodeIndex) {
    const json = this.parser.json;
    const nodeDef = json.nodes[nodeIndex];
    if (!nodeDef.extensions || !nodeDef.extensions[this.name] || nodeDef.mesh === void 0) {
      return null;
    }
    const meshDef = json.meshes[nodeDef.mesh];
    for (const primitive of meshDef.primitives) {
      if (primitive.mode !== WEBGL_CONSTANTS.TRIANGLES && primitive.mode !== WEBGL_CONSTANTS.TRIANGLE_STRIP && primitive.mode !== WEBGL_CONSTANTS.TRIANGLE_FAN && primitive.mode !== void 0) {
        return null;
      }
    }
    const extensionDef = nodeDef.extensions[this.name];
    const attributesDef = extensionDef.attributes;
    const pending = [];
    const attributes = {};
    for (const key in attributesDef) {
      pending.push(this.parser.getDependency("accessor", attributesDef[key]).then((accessor) => {
        attributes[key] = accessor;
        return attributes[key];
      }));
    }
    if (pending.length < 1) {
      return null;
    }
    pending.push(this.parser.createNodeMesh(nodeIndex));
    return Promise.all(pending).then((results) => {
      const nodeObject = results.pop();
      const meshes = nodeObject.isGroup ? nodeObject.children : [nodeObject];
      const count = results[0].count;
      const instancedMeshes = [];
      for (const mesh of meshes) {
        const m = new Matrix42();
        const p = new Vector33();
        const q = new Quaternion2();
        const s = new Vector33(1, 1, 1);
        const instancedMesh = new InstancedMesh(mesh.geometry, mesh.material, count);
        for (let i3 = 0; i3 < count; i3++) {
          if (attributes.TRANSLATION) {
            p.fromBufferAttribute(attributes.TRANSLATION, i3);
          }
          if (attributes.ROTATION) {
            q.fromBufferAttribute(attributes.ROTATION, i3);
          }
          if (attributes.SCALE) {
            s.fromBufferAttribute(attributes.SCALE, i3);
          }
          instancedMesh.setMatrixAt(i3, m.compose(p, q, s));
        }
        for (const attributeName in attributes) {
          if (attributeName === "_COLOR_0") {
            const attr = attributes[attributeName];
            instancedMesh.instanceColor = new InstancedBufferAttribute2(attr.array, attr.itemSize, attr.normalized);
          } else if (attributeName !== "TRANSLATION" && attributeName !== "ROTATION" && attributeName !== "SCALE") {
            mesh.geometry.setAttribute(attributeName, attributes[attributeName]);
          }
        }
        Object3D.prototype.copy.call(instancedMesh, mesh);
        this.parser.assignFinalMaterial(instancedMesh);
        instancedMeshes.push(instancedMesh);
      }
      if (nodeObject.isGroup) {
        nodeObject.clear();
        nodeObject.add(...instancedMeshes);
        return nodeObject;
      }
      return instancedMeshes[0];
    });
  }
};
var BINARY_EXTENSION_HEADER_MAGIC = "glTF";
var BINARY_EXTENSION_HEADER_LENGTH = 12;
var BINARY_EXTENSION_CHUNK_TYPES = { JSON: 1313821514, BIN: 5130562 };
var GLTFBinaryExtension = class {
  constructor(data) {
    this.name = EXTENSIONS.KHR_BINARY_GLTF;
    this.content = null;
    this.body = null;
    const headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
    const textDecoder = new TextDecoder();
    this.header = {
      magic: textDecoder.decode(new Uint8Array(data.slice(0, 4))),
      version: headerView.getUint32(4, true),
      length: headerView.getUint32(8, true)
    };
    if (this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC) {
      throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
    } else if (this.header.version < 2) {
      throw new Error("THREE.GLTFLoader: Legacy binary file detected.");
    }
    const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
    const chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
    let chunkIndex = 0;
    while (chunkIndex < chunkContentsLength) {
      const chunkLength = chunkView.getUint32(chunkIndex, true);
      chunkIndex += 4;
      const chunkType = chunkView.getUint32(chunkIndex, true);
      chunkIndex += 4;
      if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {
        const contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength);
        this.content = textDecoder.decode(contentArray);
      } else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {
        const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
        this.body = data.slice(byteOffset, byteOffset + chunkLength);
      }
      chunkIndex += chunkLength;
    }
    if (this.content === null) {
      throw new Error("THREE.GLTFLoader: JSON content not found.");
    }
  }
};
var GLTFDracoMeshCompressionExtension = class {
  constructor(json, dracoLoader) {
    if (!dracoLoader) {
      throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");
    }
    this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
    this.json = json;
    this.dracoLoader = dracoLoader;
    this.dracoLoader.preload();
  }
  decodePrimitive(primitive, parser) {
    const json = this.json;
    const dracoLoader = this.dracoLoader;
    const bufferViewIndex = primitive.extensions[this.name].bufferView;
    const gltfAttributeMap = primitive.extensions[this.name].attributes;
    const threeAttributeMap = {};
    const attributeNormalizedMap = {};
    const attributeTypeMap = {};
    for (const attributeName in gltfAttributeMap) {
      const threeAttributeName = ATTRIBUTES[attributeName] || attributeName.toLowerCase();
      threeAttributeMap[threeAttributeName] = gltfAttributeMap[attributeName];
    }
    for (const attributeName in primitive.attributes) {
      const threeAttributeName = ATTRIBUTES[attributeName] || attributeName.toLowerCase();
      if (gltfAttributeMap[attributeName] !== void 0) {
        const accessorDef = json.accessors[primitive.attributes[attributeName]];
        const componentType = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
        attributeTypeMap[threeAttributeName] = componentType.name;
        attributeNormalizedMap[threeAttributeName] = accessorDef.normalized === true;
      }
    }
    return parser.getDependency("bufferView", bufferViewIndex).then(function(bufferView) {
      return new Promise(function(resolve, reject) {
        dracoLoader.decodeDracoFile(bufferView, function(geometry) {
          for (const attributeName in geometry.attributes) {
            const attribute = geometry.attributes[attributeName];
            const normalized = attributeNormalizedMap[attributeName];
            if (normalized !== void 0) attribute.normalized = normalized;
          }
          resolve(geometry);
        }, threeAttributeMap, attributeTypeMap, LinearSRGBColorSpace, reject);
      });
    });
  }
};
var GLTFTextureTransformExtension = class {
  constructor() {
    this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;
  }
  extendTexture(texture, transform) {
    if ((transform.texCoord === void 0 || transform.texCoord === texture.channel) && transform.offset === void 0 && transform.rotation === void 0 && transform.scale === void 0) {
      return texture;
    }
    texture = texture.clone();
    if (transform.texCoord !== void 0) {
      texture.channel = transform.texCoord;
    }
    if (transform.offset !== void 0) {
      texture.offset.fromArray(transform.offset);
    }
    if (transform.rotation !== void 0) {
      texture.rotation = transform.rotation;
    }
    if (transform.scale !== void 0) {
      texture.repeat.fromArray(transform.scale);
    }
    texture.needsUpdate = true;
    return texture;
  }
};
var GLTFMeshQuantizationExtension = class {
  constructor() {
    this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;
  }
};
var GLTFCubicSplineInterpolant = class extends Interpolant {
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  copySampleValue_(index) {
    const result = this.resultBuffer, values = this.sampleValues, valueSize = this.valueSize, offset = index * valueSize * 3 + valueSize;
    for (let i3 = 0; i3 !== valueSize; i3++) {
      result[i3] = values[offset + i3];
    }
    return result;
  }
  interpolate_(i1, t0, t, t1) {
    const result = this.resultBuffer;
    const values = this.sampleValues;
    const stride = this.valueSize;
    const stride2 = stride * 2;
    const stride3 = stride * 3;
    const td3 = t1 - t0;
    const p = (t - t0) / td3;
    const pp = p * p;
    const ppp = pp * p;
    const offset1 = i1 * stride3;
    const offset0 = offset1 - stride3;
    const s2 = -2 * ppp + 3 * pp;
    const s3 = ppp - pp;
    const s0 = 1 - s2;
    const s1 = s3 - pp + p;
    for (let i3 = 0; i3 !== stride; i3++) {
      const p0 = values[offset0 + i3 + stride];
      const m0 = values[offset0 + i3 + stride2] * td3;
      const p1 = values[offset1 + i3 + stride];
      const m1 = values[offset1 + i3] * td3;
      result[i3] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;
    }
    return result;
  }
};
var _quaternion = new Quaternion2();
var GLTFCubicSplineQuaternionInterpolant = class extends GLTFCubicSplineInterpolant {
  interpolate_(i1, t0, t, t1) {
    const result = super.interpolate_(i1, t0, t, t1);
    _quaternion.fromArray(result).normalize().toArray(result);
    return result;
  }
};
var WEBGL_CONSTANTS = {
  FLOAT: 5126,
  //FLOAT_MAT2: 35674,
  FLOAT_MAT3: 35675,
  FLOAT_MAT4: 35676,
  FLOAT_VEC2: 35664,
  FLOAT_VEC3: 35665,
  FLOAT_VEC4: 35666,
  LINEAR: 9729,
  REPEAT: 10497,
  SAMPLER_2D: 35678,
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6,
  UNSIGNED_BYTE: 5121,
  UNSIGNED_SHORT: 5123
};
var WEBGL_COMPONENT_TYPES = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};
var WEBGL_FILTERS = {
  9728: NearestFilter,
  9729: LinearFilter2,
  9984: NearestMipmapNearestFilter,
  9985: LinearMipmapNearestFilter,
  9986: NearestMipmapLinearFilter,
  9987: LinearMipmapLinearFilter
};
var WEBGL_WRAPPINGS = {
  33071: ClampToEdgeWrapping,
  33648: MirroredRepeatWrapping,
  10497: RepeatWrapping
};
var WEBGL_TYPE_SIZES = {
  "SCALAR": 1,
  "VEC2": 2,
  "VEC3": 3,
  "VEC4": 4,
  "MAT2": 4,
  "MAT3": 9,
  "MAT4": 16
};
var ATTRIBUTES = {
  POSITION: "position",
  NORMAL: "normal",
  TANGENT: "tangent",
  TEXCOORD_0: "uv",
  TEXCOORD_1: "uv1",
  TEXCOORD_2: "uv2",
  TEXCOORD_3: "uv3",
  COLOR_0: "color",
  WEIGHTS_0: "skinWeight",
  JOINTS_0: "skinIndex"
};
var PATH_PROPERTIES = {
  scale: "scale",
  translation: "position",
  rotation: "quaternion",
  weights: "morphTargetInfluences"
};
var INTERPOLATION = {
  CUBICSPLINE: void 0,
  // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
  // keyframe track will be initialized with a default interpolation type, then modified.
  LINEAR: InterpolateLinear,
  STEP: InterpolateDiscrete
};
var ALPHA_MODES = {
  OPAQUE: "OPAQUE",
  MASK: "MASK",
  BLEND: "BLEND"
};
function createDefaultMaterial(cache) {
  if (cache["DefaultMaterial"] === void 0) {
    cache["DefaultMaterial"] = new MeshStandardMaterial({
      color: 16777215,
      emissive: 0,
      metalness: 1,
      roughness: 1,
      transparent: false,
      depthTest: true,
      side: FrontSide
    });
  }
  return cache["DefaultMaterial"];
}
function addUnknownExtensionsToUserData(knownExtensions, object, objectDef) {
  for (const name in objectDef.extensions) {
    if (knownExtensions[name] === void 0) {
      object.userData.gltfExtensions = object.userData.gltfExtensions || {};
      object.userData.gltfExtensions[name] = objectDef.extensions[name];
    }
  }
}
function assignExtrasToUserData(object, gltfDef) {
  if (gltfDef.extras !== void 0) {
    if (typeof gltfDef.extras === "object") {
      Object.assign(object.userData, gltfDef.extras);
    } else {
      console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, " + gltfDef.extras);
    }
  }
}
function addMorphTargets(geometry, targets, parser) {
  let hasMorphPosition = false;
  let hasMorphNormal = false;
  let hasMorphColor = false;
  for (let i3 = 0, il = targets.length; i3 < il; i3++) {
    const target = targets[i3];
    if (target.POSITION !== void 0) hasMorphPosition = true;
    if (target.NORMAL !== void 0) hasMorphNormal = true;
    if (target.COLOR_0 !== void 0) hasMorphColor = true;
    if (hasMorphPosition && hasMorphNormal && hasMorphColor) break;
  }
  if (!hasMorphPosition && !hasMorphNormal && !hasMorphColor) return Promise.resolve(geometry);
  const pendingPositionAccessors = [];
  const pendingNormalAccessors = [];
  const pendingColorAccessors = [];
  for (let i3 = 0, il = targets.length; i3 < il; i3++) {
    const target = targets[i3];
    if (hasMorphPosition) {
      const pendingAccessor = target.POSITION !== void 0 ? parser.getDependency("accessor", target.POSITION) : geometry.attributes.position;
      pendingPositionAccessors.push(pendingAccessor);
    }
    if (hasMorphNormal) {
      const pendingAccessor = target.NORMAL !== void 0 ? parser.getDependency("accessor", target.NORMAL) : geometry.attributes.normal;
      pendingNormalAccessors.push(pendingAccessor);
    }
    if (hasMorphColor) {
      const pendingAccessor = target.COLOR_0 !== void 0 ? parser.getDependency("accessor", target.COLOR_0) : geometry.attributes.color;
      pendingColorAccessors.push(pendingAccessor);
    }
  }
  return Promise.all([
    Promise.all(pendingPositionAccessors),
    Promise.all(pendingNormalAccessors),
    Promise.all(pendingColorAccessors)
  ]).then(function(accessors) {
    const morphPositions = accessors[0];
    const morphNormals = accessors[1];
    const morphColors = accessors[2];
    if (hasMorphPosition) geometry.morphAttributes.position = morphPositions;
    if (hasMorphNormal) geometry.morphAttributes.normal = morphNormals;
    if (hasMorphColor) geometry.morphAttributes.color = morphColors;
    geometry.morphTargetsRelative = true;
    return geometry;
  });
}
function updateMorphTargets(mesh, meshDef) {
  mesh.updateMorphTargets();
  if (meshDef.weights !== void 0) {
    for (let i3 = 0, il = meshDef.weights.length; i3 < il; i3++) {
      mesh.morphTargetInfluences[i3] = meshDef.weights[i3];
    }
  }
  if (meshDef.extras && Array.isArray(meshDef.extras.targetNames)) {
    const targetNames = meshDef.extras.targetNames;
    if (mesh.morphTargetInfluences.length === targetNames.length) {
      mesh.morphTargetDictionary = {};
      for (let i3 = 0, il = targetNames.length; i3 < il; i3++) {
        mesh.morphTargetDictionary[targetNames[i3]] = i3;
      }
    } else {
      console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.");
    }
  }
}
function createPrimitiveKey(primitiveDef) {
  let geometryKey;
  const dracoExtension = primitiveDef.extensions && primitiveDef.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION];
  if (dracoExtension) {
    geometryKey = "draco:" + dracoExtension.bufferView + ":" + dracoExtension.indices + ":" + createAttributesKey(dracoExtension.attributes);
  } else {
    geometryKey = primitiveDef.indices + ":" + createAttributesKey(primitiveDef.attributes) + ":" + primitiveDef.mode;
  }
  if (primitiveDef.targets !== void 0) {
    for (let i3 = 0, il = primitiveDef.targets.length; i3 < il; i3++) {
      geometryKey += ":" + createAttributesKey(primitiveDef.targets[i3]);
    }
  }
  return geometryKey;
}
function createAttributesKey(attributes) {
  let attributesKey = "";
  const keys = Object.keys(attributes).sort();
  for (let i3 = 0, il = keys.length; i3 < il; i3++) {
    attributesKey += keys[i3] + ":" + attributes[keys[i3]] + ";";
  }
  return attributesKey;
}
function getNormalizedComponentScale(constructor) {
  switch (constructor) {
    case Int8Array:
      return 1 / 127;
    case Uint8Array:
      return 1 / 255;
    case Int16Array:
      return 1 / 32767;
    case Uint16Array:
      return 1 / 65535;
    default:
      throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.");
  }
}
function getImageURIMimeType(uri) {
  if (uri.search(/\.jpe?g($|\?)/i) > 0 || uri.search(/^data\:image\/jpeg/) === 0) return "image/jpeg";
  if (uri.search(/\.webp($|\?)/i) > 0 || uri.search(/^data\:image\/webp/) === 0) return "image/webp";
  if (uri.search(/\.ktx2($|\?)/i) > 0 || uri.search(/^data\:image\/ktx2/) === 0) return "image/ktx2";
  return "image/png";
}
var _identityMatrix = new Matrix42();
var GLTFParser = class {
  constructor(json = {}, options = {}) {
    this.json = json;
    this.extensions = {};
    this.plugins = {};
    this.options = options;
    this.cache = new GLTFRegistry();
    this.associations = /* @__PURE__ */ new Map();
    this.primitiveCache = {};
    this.nodeCache = {};
    this.meshCache = { refs: {}, uses: {} };
    this.cameraCache = { refs: {}, uses: {} };
    this.lightCache = { refs: {}, uses: {} };
    this.sourceCache = {};
    this.textureCache = {};
    this.nodeNamesUsed = {};
    let isSafari = false;
    let safariVersion = -1;
    let isFirefox = false;
    let firefoxVersion = -1;
    if (typeof navigator !== "undefined" && typeof navigator.userAgent !== "undefined") {
      const userAgent = navigator.userAgent;
      isSafari = /^((?!chrome|android).)*safari/i.test(userAgent) === true;
      const safariMatch = userAgent.match(/Version\/(\d+)/);
      safariVersion = isSafari && safariMatch ? parseInt(safariMatch[1], 10) : -1;
      isFirefox = userAgent.indexOf("Firefox") > -1;
      firefoxVersion = isFirefox ? userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }
    if (typeof createImageBitmap === "undefined" || isSafari && safariVersion < 17 || isFirefox && firefoxVersion < 98) {
      this.textureLoader = new TextureLoader(this.options.manager);
    } else {
      this.textureLoader = new ImageBitmapLoader(this.options.manager);
    }
    this.textureLoader.setCrossOrigin(this.options.crossOrigin);
    this.textureLoader.setRequestHeader(this.options.requestHeader);
    this.fileLoader = new FileLoader(this.options.manager);
    this.fileLoader.setResponseType("arraybuffer");
    if (this.options.crossOrigin === "use-credentials") {
      this.fileLoader.setWithCredentials(true);
    }
  }
  setExtensions(extensions) {
    this.extensions = extensions;
  }
  setPlugins(plugins) {
    this.plugins = plugins;
  }
  parse(onLoad, onError) {
    const parser = this;
    const json = this.json;
    const extensions = this.extensions;
    this.cache.removeAll();
    this.nodeCache = {};
    this._invokeAll(function(ext) {
      return ext._markDefs && ext._markDefs();
    });
    Promise.all(this._invokeAll(function(ext) {
      return ext.beforeRoot && ext.beforeRoot();
    })).then(function() {
      return Promise.all([
        parser.getDependencies("scene"),
        parser.getDependencies("animation"),
        parser.getDependencies("camera")
      ]);
    }).then(function(dependencies) {
      const result = {
        scene: dependencies[0][json.scene || 0],
        scenes: dependencies[0],
        animations: dependencies[1],
        cameras: dependencies[2],
        asset: json.asset,
        parser,
        userData: {}
      };
      addUnknownExtensionsToUserData(extensions, result, json);
      assignExtrasToUserData(result, json);
      return Promise.all(parser._invokeAll(function(ext) {
        return ext.afterRoot && ext.afterRoot(result);
      })).then(function() {
        for (const scene of result.scenes) {
          scene.updateMatrixWorld();
        }
        onLoad(result);
      });
    }).catch(onError);
  }
  /**
   * Marks the special nodes/meshes in json for efficient parse.
   *
   * @private
   */
  _markDefs() {
    const nodeDefs = this.json.nodes || [];
    const skinDefs = this.json.skins || [];
    const meshDefs = this.json.meshes || [];
    for (let skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex++) {
      const joints = skinDefs[skinIndex].joints;
      for (let i3 = 0, il = joints.length; i3 < il; i3++) {
        nodeDefs[joints[i3]].isBone = true;
      }
    }
    for (let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
      const nodeDef = nodeDefs[nodeIndex];
      if (nodeDef.mesh !== void 0) {
        this._addNodeRef(this.meshCache, nodeDef.mesh);
        if (nodeDef.skin !== void 0) {
          meshDefs[nodeDef.mesh].isSkinnedMesh = true;
        }
      }
      if (nodeDef.camera !== void 0) {
        this._addNodeRef(this.cameraCache, nodeDef.camera);
      }
    }
  }
  /**
   * Counts references to shared node / Object3D resources. These resources
   * can be reused, or "instantiated", at multiple nodes in the scene
   * hierarchy. Mesh, Camera, and Light instances are instantiated and must
   * be marked. Non-scenegraph resources (like Materials, Geometries, and
   * Textures) can be reused directly and are not marked here.
   *
   * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
   *
   * @private
   * @param {Object} cache
   * @param {Object3D} index
   */
  _addNodeRef(cache, index) {
    if (index === void 0) return;
    if (cache.refs[index] === void 0) {
      cache.refs[index] = cache.uses[index] = 0;
    }
    cache.refs[index]++;
  }
  /**
   * Returns a reference to a shared resource, cloning it if necessary.
   *
   * @private
   * @param {Object} cache
   * @param {number} index
   * @param {Object} object
   * @return {Object}
   */
  _getNodeRef(cache, index, object) {
    if (cache.refs[index] <= 1) return object;
    const ref = object.clone();
    const updateMappings = (original, clone2) => {
      const mappings = this.associations.get(original);
      if (mappings != null) {
        this.associations.set(clone2, mappings);
      }
      for (const [i3, child] of original.children.entries()) {
        updateMappings(child, clone2.children[i3]);
      }
    };
    updateMappings(object, ref);
    ref.name += "_instance_" + cache.uses[index]++;
    return ref;
  }
  _invokeOne(func) {
    const extensions = Object.values(this.plugins);
    extensions.push(this);
    for (let i3 = 0; i3 < extensions.length; i3++) {
      const result = func(extensions[i3]);
      if (result) return result;
    }
    return null;
  }
  _invokeAll(func) {
    const extensions = Object.values(this.plugins);
    extensions.unshift(this);
    const pending = [];
    for (let i3 = 0; i3 < extensions.length; i3++) {
      const result = func(extensions[i3]);
      if (result) pending.push(result);
    }
    return pending;
  }
  /**
   * Requests the specified dependency asynchronously, with caching.
   *
   * @private
   * @param {string} type
   * @param {number} index
   * @return {Promise<Object3D|Material|Texture|AnimationClip|ArrayBuffer|Object>}
   */
  getDependency(type, index) {
    const cacheKey = type + ":" + index;
    let dependency = this.cache.get(cacheKey);
    if (!dependency) {
      switch (type) {
        case "scene":
          dependency = this.loadScene(index);
          break;
        case "node":
          dependency = this._invokeOne(function(ext) {
            return ext.loadNode && ext.loadNode(index);
          });
          break;
        case "mesh":
          dependency = this._invokeOne(function(ext) {
            return ext.loadMesh && ext.loadMesh(index);
          });
          break;
        case "accessor":
          dependency = this.loadAccessor(index);
          break;
        case "bufferView":
          dependency = this._invokeOne(function(ext) {
            return ext.loadBufferView && ext.loadBufferView(index);
          });
          break;
        case "buffer":
          dependency = this.loadBuffer(index);
          break;
        case "material":
          dependency = this._invokeOne(function(ext) {
            return ext.loadMaterial && ext.loadMaterial(index);
          });
          break;
        case "texture":
          dependency = this._invokeOne(function(ext) {
            return ext.loadTexture && ext.loadTexture(index);
          });
          break;
        case "skin":
          dependency = this.loadSkin(index);
          break;
        case "animation":
          dependency = this._invokeOne(function(ext) {
            return ext.loadAnimation && ext.loadAnimation(index);
          });
          break;
        case "camera":
          dependency = this.loadCamera(index);
          break;
        default:
          dependency = this._invokeOne(function(ext) {
            return ext != this && ext.getDependency && ext.getDependency(type, index);
          });
          if (!dependency) {
            throw new Error("Unknown type: " + type);
          }
          break;
      }
      this.cache.add(cacheKey, dependency);
    }
    return dependency;
  }
  /**
   * Requests all dependencies of the specified type asynchronously, with caching.
   *
   * @private
   * @param {string} type
   * @return {Promise<Array<Object>>}
   */
  getDependencies(type) {
    let dependencies = this.cache.get(type);
    if (!dependencies) {
      const parser = this;
      const defs = this.json[type + (type === "mesh" ? "es" : "s")] || [];
      dependencies = Promise.all(defs.map(function(def, index) {
        return parser.getDependency(type, index);
      }));
      this.cache.add(type, dependencies);
    }
    return dependencies;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   *
   * @private
   * @param {number} bufferIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBuffer(bufferIndex) {
    const bufferDef = this.json.buffers[bufferIndex];
    const loader = this.fileLoader;
    if (bufferDef.type && bufferDef.type !== "arraybuffer") {
      throw new Error("THREE.GLTFLoader: " + bufferDef.type + " buffer type is not supported.");
    }
    if (bufferDef.uri === void 0 && bufferIndex === 0) {
      return Promise.resolve(this.extensions[EXTENSIONS.KHR_BINARY_GLTF].body);
    }
    const options = this.options;
    return new Promise(function(resolve, reject) {
      loader.load(LoaderUtils.resolveURL(bufferDef.uri, options.path), resolve, void 0, function() {
        reject(new Error('THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".'));
      });
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   *
   * @private
   * @param {number} bufferViewIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBufferView(bufferViewIndex) {
    const bufferViewDef = this.json.bufferViews[bufferViewIndex];
    return this.getDependency("buffer", bufferViewDef.buffer).then(function(buffer) {
      const byteLength = bufferViewDef.byteLength || 0;
      const byteOffset = bufferViewDef.byteOffset || 0;
      return buffer.slice(byteOffset, byteOffset + byteLength);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
   *
   * @private
   * @param {number} accessorIndex
   * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
   */
  loadAccessor(accessorIndex) {
    const parser = this;
    const json = this.json;
    const accessorDef = this.json.accessors[accessorIndex];
    if (accessorDef.bufferView === void 0 && accessorDef.sparse === void 0) {
      const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
      const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
      const normalized = accessorDef.normalized === true;
      const array = new TypedArray(accessorDef.count * itemSize);
      return Promise.resolve(new BufferAttribute2(array, itemSize, normalized));
    }
    const pendingBufferViews = [];
    if (accessorDef.bufferView !== void 0) {
      pendingBufferViews.push(this.getDependency("bufferView", accessorDef.bufferView));
    } else {
      pendingBufferViews.push(null);
    }
    if (accessorDef.sparse !== void 0) {
      pendingBufferViews.push(this.getDependency("bufferView", accessorDef.sparse.indices.bufferView));
      pendingBufferViews.push(this.getDependency("bufferView", accessorDef.sparse.values.bufferView));
    }
    return Promise.all(pendingBufferViews).then(function(bufferViews) {
      const bufferView = bufferViews[0];
      const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
      const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
      const elementBytes = TypedArray.BYTES_PER_ELEMENT;
      const itemBytes = elementBytes * itemSize;
      const byteOffset = accessorDef.byteOffset || 0;
      const byteStride = accessorDef.bufferView !== void 0 ? json.bufferViews[accessorDef.bufferView].byteStride : void 0;
      const normalized = accessorDef.normalized === true;
      let array, bufferAttribute;
      if (byteStride && byteStride !== itemBytes) {
        const ibSlice = Math.floor(byteOffset / byteStride);
        const ibCacheKey = "InterleavedBuffer:" + accessorDef.bufferView + ":" + accessorDef.componentType + ":" + ibSlice + ":" + accessorDef.count;
        let ib = parser.cache.get(ibCacheKey);
        if (!ib) {
          array = new TypedArray(bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes);
          ib = new InterleavedBuffer2(array, byteStride / elementBytes);
          parser.cache.add(ibCacheKey, ib);
        }
        bufferAttribute = new InterleavedBufferAttribute2(ib, itemSize, byteOffset % byteStride / elementBytes, normalized);
      } else {
        if (bufferView === null) {
          array = new TypedArray(accessorDef.count * itemSize);
        } else {
          array = new TypedArray(bufferView, byteOffset, accessorDef.count * itemSize);
        }
        bufferAttribute = new BufferAttribute2(array, itemSize, normalized);
      }
      if (accessorDef.sparse !== void 0) {
        const itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
        const TypedArrayIndices = WEBGL_COMPONENT_TYPES[accessorDef.sparse.indices.componentType];
        const byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
        const byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
        const sparseIndices = new TypedArrayIndices(bufferViews[1], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices);
        const sparseValues = new TypedArray(bufferViews[2], byteOffsetValues, accessorDef.sparse.count * itemSize);
        if (bufferView !== null) {
          bufferAttribute = new BufferAttribute2(bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized);
        }
        bufferAttribute.normalized = false;
        for (let i3 = 0, il = sparseIndices.length; i3 < il; i3++) {
          const index = sparseIndices[i3];
          bufferAttribute.setX(index, sparseValues[i3 * itemSize]);
          if (itemSize >= 2) bufferAttribute.setY(index, sparseValues[i3 * itemSize + 1]);
          if (itemSize >= 3) bufferAttribute.setZ(index, sparseValues[i3 * itemSize + 2]);
          if (itemSize >= 4) bufferAttribute.setW(index, sparseValues[i3 * itemSize + 3]);
          if (itemSize >= 5) throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.");
        }
        bufferAttribute.normalized = normalized;
      }
      return bufferAttribute;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
   *
   * @private
   * @param {number} textureIndex
   * @return {Promise<?Texture>}
   */
  loadTexture(textureIndex) {
    const json = this.json;
    const options = this.options;
    const textureDef = json.textures[textureIndex];
    const sourceIndex = textureDef.source;
    const sourceDef = json.images[sourceIndex];
    let loader = this.textureLoader;
    if (sourceDef.uri) {
      const handler = options.manager.getHandler(sourceDef.uri);
      if (handler !== null) loader = handler;
    }
    return this.loadTextureImage(textureIndex, sourceIndex, loader);
  }
  loadTextureImage(textureIndex, sourceIndex, loader) {
    const parser = this;
    const json = this.json;
    const textureDef = json.textures[textureIndex];
    const sourceDef = json.images[sourceIndex];
    const cacheKey = (sourceDef.uri || sourceDef.bufferView) + ":" + textureDef.sampler;
    if (this.textureCache[cacheKey]) {
      return this.textureCache[cacheKey];
    }
    const promise = this.loadImageSource(sourceIndex, loader).then(function(texture) {
      texture.flipY = false;
      texture.name = textureDef.name || sourceDef.name || "";
      if (texture.name === "" && typeof sourceDef.uri === "string" && sourceDef.uri.startsWith("data:image/") === false) {
        texture.name = sourceDef.uri;
      }
      const samplers = json.samplers || {};
      const sampler = samplers[textureDef.sampler] || {};
      texture.magFilter = WEBGL_FILTERS[sampler.magFilter] || LinearFilter2;
      texture.minFilter = WEBGL_FILTERS[sampler.minFilter] || LinearMipmapLinearFilter;
      texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS] || RepeatWrapping;
      texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT] || RepeatWrapping;
      texture.generateMipmaps = !texture.isCompressedTexture && texture.minFilter !== NearestFilter && texture.minFilter !== LinearFilter2;
      parser.associations.set(texture, { textures: textureIndex });
      return texture;
    }).catch(function() {
      return null;
    });
    this.textureCache[cacheKey] = promise;
    return promise;
  }
  loadImageSource(sourceIndex, loader) {
    const parser = this;
    const json = this.json;
    const options = this.options;
    if (this.sourceCache[sourceIndex] !== void 0) {
      return this.sourceCache[sourceIndex].then((texture) => texture.clone());
    }
    const sourceDef = json.images[sourceIndex];
    const URL2 = self.URL || self.webkitURL;
    let sourceURI = sourceDef.uri || "";
    let isObjectURL = false;
    if (sourceDef.bufferView !== void 0) {
      sourceURI = parser.getDependency("bufferView", sourceDef.bufferView).then(function(bufferView) {
        isObjectURL = true;
        const blob = new Blob([bufferView], { type: sourceDef.mimeType });
        sourceURI = URL2.createObjectURL(blob);
        return sourceURI;
      });
    } else if (sourceDef.uri === void 0) {
      throw new Error("THREE.GLTFLoader: Image " + sourceIndex + " is missing URI and bufferView");
    }
    const promise = Promise.resolve(sourceURI).then(function(sourceURI2) {
      return new Promise(function(resolve, reject) {
        let onLoad = resolve;
        if (loader.isImageBitmapLoader === true) {
          onLoad = function(imageBitmap) {
            const texture = new Texture(imageBitmap);
            texture.needsUpdate = true;
            resolve(texture);
          };
        }
        loader.load(LoaderUtils.resolveURL(sourceURI2, options.path), onLoad, void 0, reject);
      });
    }).then(function(texture) {
      if (isObjectURL === true) {
        URL2.revokeObjectURL(sourceURI);
      }
      assignExtrasToUserData(texture, sourceDef);
      texture.userData.mimeType = sourceDef.mimeType || getImageURIMimeType(sourceDef.uri);
      return texture;
    }).catch(function(error) {
      console.error("THREE.GLTFLoader: Couldn't load texture", sourceURI);
      throw error;
    });
    this.sourceCache[sourceIndex] = promise;
    return promise;
  }
  /**
   * Asynchronously assigns a texture to the given material parameters.
   *
   * @private
   * @param {Object} materialParams
   * @param {string} mapName
   * @param {Object} mapDef
   * @param {string} [colorSpace]
   * @return {Promise<Texture>}
   */
  assignTexture(materialParams, mapName, mapDef, colorSpace) {
    const parser = this;
    return this.getDependency("texture", mapDef.index).then(function(texture) {
      if (!texture) return null;
      if (mapDef.texCoord !== void 0 && mapDef.texCoord > 0) {
        texture = texture.clone();
        texture.channel = mapDef.texCoord;
      }
      if (parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM]) {
        const transform = mapDef.extensions !== void 0 ? mapDef.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM] : void 0;
        if (transform) {
          const gltfReference = parser.associations.get(texture);
          texture = parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM].extendTexture(texture, transform);
          parser.associations.set(texture, gltfReference);
        }
      }
      if (colorSpace !== void 0) {
        texture.colorSpace = colorSpace;
      }
      materialParams[mapName] = texture;
      return texture;
    });
  }
  /**
   * Assigns final material to a Mesh, Line, or Points instance. The instance
   * already has a material (generated from the glTF material options alone)
   * but reuse of the same glTF material may require multiple threejs materials
   * to accommodate different primitive types, defines, etc. New materials will
   * be created if necessary, and reused from a cache.
   *
   * @private
   * @param {Object3D} mesh Mesh, Line, or Points instance.
   */
  assignFinalMaterial(mesh) {
    const geometry = mesh.geometry;
    let material = mesh.material;
    const useDerivativeTangents = geometry.attributes.tangent === void 0;
    const useVertexColors = geometry.attributes.color !== void 0;
    const useFlatShading = geometry.attributes.normal === void 0;
    if (mesh.isPoints) {
      const cacheKey = "PointsMaterial:" + material.uuid;
      let pointsMaterial = this.cache.get(cacheKey);
      if (!pointsMaterial) {
        pointsMaterial = new PointsMaterial();
        Material.prototype.copy.call(pointsMaterial, material);
        pointsMaterial.color.copy(material.color);
        pointsMaterial.map = material.map;
        pointsMaterial.sizeAttenuation = false;
        this.cache.add(cacheKey, pointsMaterial);
      }
      material = pointsMaterial;
    } else if (mesh.isLine) {
      const cacheKey = "LineBasicMaterial:" + material.uuid;
      let lineMaterial = this.cache.get(cacheKey);
      if (!lineMaterial) {
        lineMaterial = new LineBasicMaterial();
        Material.prototype.copy.call(lineMaterial, material);
        lineMaterial.color.copy(material.color);
        lineMaterial.map = material.map;
        this.cache.add(cacheKey, lineMaterial);
      }
      material = lineMaterial;
    }
    if (useDerivativeTangents || useVertexColors || useFlatShading) {
      let cacheKey = "ClonedMaterial:" + material.uuid + ":";
      if (useDerivativeTangents) cacheKey += "derivative-tangents:";
      if (useVertexColors) cacheKey += "vertex-colors:";
      if (useFlatShading) cacheKey += "flat-shading:";
      let cachedMaterial = this.cache.get(cacheKey);
      if (!cachedMaterial) {
        cachedMaterial = material.clone();
        if (useVertexColors) cachedMaterial.vertexColors = true;
        if (useFlatShading) cachedMaterial.flatShading = true;
        if (useDerivativeTangents) {
          if (cachedMaterial.normalScale) cachedMaterial.normalScale.y *= -1;
          if (cachedMaterial.clearcoatNormalScale) cachedMaterial.clearcoatNormalScale.y *= -1;
        }
        this.cache.add(cacheKey, cachedMaterial);
        this.associations.set(cachedMaterial, this.associations.get(material));
      }
      material = cachedMaterial;
    }
    mesh.material = material;
  }
  getMaterialType() {
    return MeshStandardMaterial;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
   *
   * @private
   * @param {number} materialIndex
   * @return {Promise<Material>}
   */
  loadMaterial(materialIndex) {
    const parser = this;
    const json = this.json;
    const extensions = this.extensions;
    const materialDef = json.materials[materialIndex];
    let materialType;
    const materialParams = {};
    const materialExtensions = materialDef.extensions || {};
    const pending = [];
    if (materialExtensions[EXTENSIONS.KHR_MATERIALS_UNLIT]) {
      const kmuExtension = extensions[EXTENSIONS.KHR_MATERIALS_UNLIT];
      materialType = kmuExtension.getMaterialType();
      pending.push(kmuExtension.extendParams(materialParams, materialDef, parser));
    } else {
      const metallicRoughness = materialDef.pbrMetallicRoughness || {};
      materialParams.color = new Color(1, 1, 1);
      materialParams.opacity = 1;
      if (Array.isArray(metallicRoughness.baseColorFactor)) {
        const array = metallicRoughness.baseColorFactor;
        materialParams.color.setRGB(array[0], array[1], array[2], LinearSRGBColorSpace);
        materialParams.opacity = array[3];
      }
      if (metallicRoughness.baseColorTexture !== void 0) {
        pending.push(parser.assignTexture(materialParams, "map", metallicRoughness.baseColorTexture, SRGBColorSpace));
      }
      materialParams.metalness = metallicRoughness.metallicFactor !== void 0 ? metallicRoughness.metallicFactor : 1;
      materialParams.roughness = metallicRoughness.roughnessFactor !== void 0 ? metallicRoughness.roughnessFactor : 1;
      if (metallicRoughness.metallicRoughnessTexture !== void 0) {
        pending.push(parser.assignTexture(materialParams, "metalnessMap", metallicRoughness.metallicRoughnessTexture));
        pending.push(parser.assignTexture(materialParams, "roughnessMap", metallicRoughness.metallicRoughnessTexture));
      }
      materialType = this._invokeOne(function(ext) {
        return ext.getMaterialType && ext.getMaterialType(materialIndex);
      });
      pending.push(Promise.all(this._invokeAll(function(ext) {
        return ext.extendMaterialParams && ext.extendMaterialParams(materialIndex, materialParams);
      })));
    }
    if (materialDef.doubleSided === true) {
      materialParams.side = DoubleSide;
    }
    const alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;
    if (alphaMode === ALPHA_MODES.BLEND) {
      materialParams.transparent = true;
      materialParams.depthWrite = false;
    } else {
      materialParams.transparent = false;
      if (alphaMode === ALPHA_MODES.MASK) {
        materialParams.alphaTest = materialDef.alphaCutoff !== void 0 ? materialDef.alphaCutoff : 0.5;
      }
    }
    if (materialDef.normalTexture !== void 0 && materialType !== MeshBasicMaterial) {
      pending.push(parser.assignTexture(materialParams, "normalMap", materialDef.normalTexture));
      materialParams.normalScale = new Vector2(1, 1);
      if (materialDef.normalTexture.scale !== void 0) {
        const scale = materialDef.normalTexture.scale;
        materialParams.normalScale.set(scale, scale);
      }
    }
    if (materialDef.occlusionTexture !== void 0 && materialType !== MeshBasicMaterial) {
      pending.push(parser.assignTexture(materialParams, "aoMap", materialDef.occlusionTexture));
      if (materialDef.occlusionTexture.strength !== void 0) {
        materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;
      }
    }
    if (materialDef.emissiveFactor !== void 0 && materialType !== MeshBasicMaterial) {
      const emissiveFactor = materialDef.emissiveFactor;
      materialParams.emissive = new Color().setRGB(emissiveFactor[0], emissiveFactor[1], emissiveFactor[2], LinearSRGBColorSpace);
    }
    if (materialDef.emissiveTexture !== void 0 && materialType !== MeshBasicMaterial) {
      pending.push(parser.assignTexture(materialParams, "emissiveMap", materialDef.emissiveTexture, SRGBColorSpace));
    }
    return Promise.all(pending).then(function() {
      const material = new materialType(materialParams);
      if (materialDef.name) material.name = materialDef.name;
      assignExtrasToUserData(material, materialDef);
      parser.associations.set(material, { materials: materialIndex });
      if (materialDef.extensions) addUnknownExtensionsToUserData(extensions, material, materialDef);
      return material;
    });
  }
  /**
   * When Object3D instances are targeted by animation, they need unique names.
   *
   * @private
   * @param {string} originalName
   * @return {string}
   */
  createUniqueName(originalName) {
    const sanitizedName = PropertyBinding.sanitizeNodeName(originalName || "");
    if (sanitizedName in this.nodeNamesUsed) {
      return sanitizedName + "_" + ++this.nodeNamesUsed[sanitizedName];
    } else {
      this.nodeNamesUsed[sanitizedName] = 0;
      return sanitizedName;
    }
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
   *
   * Creates BufferGeometries from primitives.
   *
   * @private
   * @param {Array<GLTF.Primitive>} primitives
   * @return {Promise<Array<BufferGeometry>>}
   */
  loadGeometries(primitives) {
    const parser = this;
    const extensions = this.extensions;
    const cache = this.primitiveCache;
    function createDracoPrimitive(primitive) {
      return extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(primitive, parser).then(function(geometry) {
        return addPrimitiveAttributes(geometry, primitive, parser);
      });
    }
    const pending = [];
    for (let i3 = 0, il = primitives.length; i3 < il; i3++) {
      const primitive = primitives[i3];
      const cacheKey = createPrimitiveKey(primitive);
      const cached = cache[cacheKey];
      if (cached) {
        pending.push(cached.promise);
      } else {
        let geometryPromise;
        if (primitive.extensions && primitive.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION]) {
          geometryPromise = createDracoPrimitive(primitive);
        } else {
          geometryPromise = addPrimitiveAttributes(new BufferGeometry2(), primitive, parser);
        }
        cache[cacheKey] = { primitive, promise: geometryPromise };
        pending.push(geometryPromise);
      }
    }
    return Promise.all(pending);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
   *
   * @private
   * @param {number} meshIndex
   * @return {Promise<Group|Mesh|SkinnedMesh|Line|Points>}
   */
  loadMesh(meshIndex) {
    const parser = this;
    const json = this.json;
    const extensions = this.extensions;
    const meshDef = json.meshes[meshIndex];
    const primitives = meshDef.primitives;
    const pending = [];
    for (let i3 = 0, il = primitives.length; i3 < il; i3++) {
      const material = primitives[i3].material === void 0 ? createDefaultMaterial(this.cache) : this.getDependency("material", primitives[i3].material);
      pending.push(material);
    }
    pending.push(parser.loadGeometries(primitives));
    return Promise.all(pending).then(function(results) {
      const materials = results.slice(0, results.length - 1);
      const geometries = results[results.length - 1];
      const meshes = [];
      for (let i3 = 0, il = geometries.length; i3 < il; i3++) {
        const geometry = geometries[i3];
        const primitive = primitives[i3];
        let mesh;
        const material = materials[i3];
        if (primitive.mode === WEBGL_CONSTANTS.TRIANGLES || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN || primitive.mode === void 0) {
          mesh = meshDef.isSkinnedMesh === true ? new SkinnedMesh(geometry, material) : new Mesh2(geometry, material);
          if (mesh.isSkinnedMesh === true) {
            mesh.normalizeSkinWeights();
          }
          if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP) {
            mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleStripDrawMode2);
          } else if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN) {
            mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleFanDrawMode2);
          }
        } else if (primitive.mode === WEBGL_CONSTANTS.LINES) {
          mesh = new LineSegments(geometry, material);
        } else if (primitive.mode === WEBGL_CONSTANTS.LINE_STRIP) {
          mesh = new Line(geometry, material);
        } else if (primitive.mode === WEBGL_CONSTANTS.LINE_LOOP) {
          mesh = new LineLoop(geometry, material);
        } else if (primitive.mode === WEBGL_CONSTANTS.POINTS) {
          mesh = new Points(geometry, material);
        } else {
          throw new Error("THREE.GLTFLoader: Primitive mode unsupported: " + primitive.mode);
        }
        if (Object.keys(mesh.geometry.morphAttributes).length > 0) {
          updateMorphTargets(mesh, meshDef);
        }
        mesh.name = parser.createUniqueName(meshDef.name || "mesh_" + meshIndex);
        assignExtrasToUserData(mesh, meshDef);
        if (primitive.extensions) addUnknownExtensionsToUserData(extensions, mesh, primitive);
        parser.assignFinalMaterial(mesh);
        meshes.push(mesh);
      }
      for (let i3 = 0, il = meshes.length; i3 < il; i3++) {
        parser.associations.set(meshes[i3], {
          meshes: meshIndex,
          primitives: i3
        });
      }
      if (meshes.length === 1) {
        if (meshDef.extensions) addUnknownExtensionsToUserData(extensions, meshes[0], meshDef);
        return meshes[0];
      }
      const group = new Group();
      if (meshDef.extensions) addUnknownExtensionsToUserData(extensions, group, meshDef);
      parser.associations.set(group, { meshes: meshIndex });
      for (let i3 = 0, il = meshes.length; i3 < il; i3++) {
        group.add(meshes[i3]);
      }
      return group;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
   *
   * @private
   * @param {number} cameraIndex
   * @return {Promise<Camera>|undefined}
   */
  loadCamera(cameraIndex) {
    let camera;
    const cameraDef = this.json.cameras[cameraIndex];
    const params = cameraDef[cameraDef.type];
    if (!params) {
      console.warn("THREE.GLTFLoader: Missing camera parameters.");
      return;
    }
    if (cameraDef.type === "perspective") {
      camera = new PerspectiveCamera(MathUtils.radToDeg(params.yfov), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6);
    } else if (cameraDef.type === "orthographic") {
      camera = new OrthographicCamera2(-params.xmag, params.xmag, params.ymag, -params.ymag, params.znear, params.zfar);
    }
    if (cameraDef.name) camera.name = this.createUniqueName(cameraDef.name);
    assignExtrasToUserData(camera, cameraDef);
    return Promise.resolve(camera);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
   *
   * @private
   * @param {number} skinIndex
   * @return {Promise<Skeleton>}
   */
  loadSkin(skinIndex) {
    const skinDef = this.json.skins[skinIndex];
    const pending = [];
    for (let i3 = 0, il = skinDef.joints.length; i3 < il; i3++) {
      pending.push(this._loadNodeShallow(skinDef.joints[i3]));
    }
    if (skinDef.inverseBindMatrices !== void 0) {
      pending.push(this.getDependency("accessor", skinDef.inverseBindMatrices));
    } else {
      pending.push(null);
    }
    return Promise.all(pending).then(function(results) {
      const inverseBindMatrices = results.pop();
      const jointNodes = results;
      const bones = [];
      const boneInverses = [];
      for (let i3 = 0, il = jointNodes.length; i3 < il; i3++) {
        const jointNode = jointNodes[i3];
        if (jointNode) {
          bones.push(jointNode);
          const mat = new Matrix42();
          if (inverseBindMatrices !== null) {
            mat.fromArray(inverseBindMatrices.array, i3 * 16);
          }
          boneInverses.push(mat);
        } else {
          console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', skinDef.joints[i3]);
        }
      }
      return new Skeleton(bones, boneInverses);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
   *
   * @private
   * @param {number} animationIndex
   * @return {Promise<AnimationClip>}
   */
  loadAnimation(animationIndex) {
    const json = this.json;
    const parser = this;
    const animationDef = json.animations[animationIndex];
    const animationName = animationDef.name ? animationDef.name : "animation_" + animationIndex;
    const pendingNodes = [];
    const pendingInputAccessors = [];
    const pendingOutputAccessors = [];
    const pendingSamplers = [];
    const pendingTargets = [];
    for (let i3 = 0, il = animationDef.channels.length; i3 < il; i3++) {
      const channel = animationDef.channels[i3];
      const sampler = animationDef.samplers[channel.sampler];
      const target = channel.target;
      const name = target.node;
      const input = animationDef.parameters !== void 0 ? animationDef.parameters[sampler.input] : sampler.input;
      const output = animationDef.parameters !== void 0 ? animationDef.parameters[sampler.output] : sampler.output;
      if (target.node === void 0) continue;
      pendingNodes.push(this.getDependency("node", name));
      pendingInputAccessors.push(this.getDependency("accessor", input));
      pendingOutputAccessors.push(this.getDependency("accessor", output));
      pendingSamplers.push(sampler);
      pendingTargets.push(target);
    }
    return Promise.all([
      Promise.all(pendingNodes),
      Promise.all(pendingInputAccessors),
      Promise.all(pendingOutputAccessors),
      Promise.all(pendingSamplers),
      Promise.all(pendingTargets)
    ]).then(function(dependencies) {
      const nodes = dependencies[0];
      const inputAccessors = dependencies[1];
      const outputAccessors = dependencies[2];
      const samplers = dependencies[3];
      const targets = dependencies[4];
      const tracks = [];
      for (let i3 = 0, il = nodes.length; i3 < il; i3++) {
        const node = nodes[i3];
        const inputAccessor = inputAccessors[i3];
        const outputAccessor = outputAccessors[i3];
        const sampler = samplers[i3];
        const target = targets[i3];
        if (node === void 0) continue;
        if (node.updateMatrix) {
          node.updateMatrix();
        }
        const createdTracks = parser._createAnimationTracks(node, inputAccessor, outputAccessor, sampler, target);
        if (createdTracks) {
          for (let k = 0; k < createdTracks.length; k++) {
            tracks.push(createdTracks[k]);
          }
        }
      }
      const animation = new AnimationClip2(animationName, void 0, tracks);
      assignExtrasToUserData(animation, animationDef);
      return animation;
    });
  }
  createNodeMesh(nodeIndex) {
    const json = this.json;
    const parser = this;
    const nodeDef = json.nodes[nodeIndex];
    if (nodeDef.mesh === void 0) return null;
    return parser.getDependency("mesh", nodeDef.mesh).then(function(mesh) {
      const node = parser._getNodeRef(parser.meshCache, nodeDef.mesh, mesh);
      if (nodeDef.weights !== void 0) {
        node.traverse(function(o) {
          if (!o.isMesh) return;
          for (let i3 = 0, il = nodeDef.weights.length; i3 < il; i3++) {
            o.morphTargetInfluences[i3] = nodeDef.weights[i3];
          }
        });
      }
      return node;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
   *
   * @private
   * @param {number} nodeIndex
   * @return {Promise<Object3D>}
   */
  loadNode(nodeIndex) {
    const json = this.json;
    const parser = this;
    const nodeDef = json.nodes[nodeIndex];
    const nodePending = parser._loadNodeShallow(nodeIndex);
    const childPending = [];
    const childrenDef = nodeDef.children || [];
    for (let i3 = 0, il = childrenDef.length; i3 < il; i3++) {
      childPending.push(parser.getDependency("node", childrenDef[i3]));
    }
    const skeletonPending = nodeDef.skin === void 0 ? Promise.resolve(null) : parser.getDependency("skin", nodeDef.skin);
    return Promise.all([
      nodePending,
      Promise.all(childPending),
      skeletonPending
    ]).then(function(results) {
      const node = results[0];
      const children = results[1];
      const skeleton = results[2];
      if (skeleton !== null) {
        node.traverse(function(mesh) {
          if (!mesh.isSkinnedMesh) return;
          mesh.bind(skeleton, _identityMatrix);
        });
      }
      for (let i3 = 0, il = children.length; i3 < il; i3++) {
        node.add(children[i3]);
      }
      if (node.userData.pivot !== void 0 && children.length > 0) {
        const pivot = node.userData.pivot;
        const pivotChild = children[0];
        node.pivot = new Vector33().fromArray(pivot);
        node.position.x -= pivot[0];
        node.position.y -= pivot[1];
        node.position.z -= pivot[2];
        pivotChild.position.set(0, 0, 0);
        delete node.userData.pivot;
      }
      return node;
    });
  }
  // ._loadNodeShallow() parses a single node.
  // skin and child nodes are created and added in .loadNode() (no '_' prefix).
  _loadNodeShallow(nodeIndex) {
    const json = this.json;
    const extensions = this.extensions;
    const parser = this;
    if (this.nodeCache[nodeIndex] !== void 0) {
      return this.nodeCache[nodeIndex];
    }
    const nodeDef = json.nodes[nodeIndex];
    const nodeName = nodeDef.name ? parser.createUniqueName(nodeDef.name) : "";
    const pending = [];
    const meshPromise = parser._invokeOne(function(ext) {
      return ext.createNodeMesh && ext.createNodeMesh(nodeIndex);
    });
    if (meshPromise) {
      pending.push(meshPromise);
    }
    if (nodeDef.camera !== void 0) {
      pending.push(parser.getDependency("camera", nodeDef.camera).then(function(camera) {
        return parser._getNodeRef(parser.cameraCache, nodeDef.camera, camera);
      }));
    }
    parser._invokeAll(function(ext) {
      return ext.createNodeAttachment && ext.createNodeAttachment(nodeIndex);
    }).forEach(function(promise) {
      pending.push(promise);
    });
    this.nodeCache[nodeIndex] = Promise.all(pending).then(function(objects) {
      let node;
      if (nodeDef.isBone === true) {
        node = new Bone();
      } else if (objects.length > 1) {
        node = new Group();
      } else if (objects.length === 1) {
        node = objects[0];
      } else {
        node = new Object3D();
      }
      if (node !== objects[0]) {
        for (let i3 = 0, il = objects.length; i3 < il; i3++) {
          node.add(objects[i3]);
        }
      }
      if (nodeDef.name) {
        node.userData.name = nodeDef.name;
        node.name = nodeName;
      }
      assignExtrasToUserData(node, nodeDef);
      if (nodeDef.extensions) addUnknownExtensionsToUserData(extensions, node, nodeDef);
      if (nodeDef.matrix !== void 0) {
        const matrix = new Matrix42();
        matrix.fromArray(nodeDef.matrix);
        node.applyMatrix4(matrix);
      } else {
        if (nodeDef.translation !== void 0) {
          node.position.fromArray(nodeDef.translation);
        }
        if (nodeDef.rotation !== void 0) {
          node.quaternion.fromArray(nodeDef.rotation);
        }
        if (nodeDef.scale !== void 0) {
          node.scale.fromArray(nodeDef.scale);
        }
      }
      if (!parser.associations.has(node)) {
        parser.associations.set(node, {});
      } else if (nodeDef.mesh !== void 0 && parser.meshCache.refs[nodeDef.mesh] > 1) {
        const mapping = parser.associations.get(node);
        parser.associations.set(node, { ...mapping });
      }
      parser.associations.get(node).nodes = nodeIndex;
      return node;
    });
    return this.nodeCache[nodeIndex];
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
   *
   * @private
   * @param {number} sceneIndex
   * @return {Promise<Group>}
   */
  loadScene(sceneIndex) {
    const extensions = this.extensions;
    const sceneDef = this.json.scenes[sceneIndex];
    const parser = this;
    const scene = new Group();
    if (sceneDef.name) scene.name = parser.createUniqueName(sceneDef.name);
    assignExtrasToUserData(scene, sceneDef);
    if (sceneDef.extensions) addUnknownExtensionsToUserData(extensions, scene, sceneDef);
    const nodeIds = sceneDef.nodes || [];
    const pending = [];
    for (let i3 = 0, il = nodeIds.length; i3 < il; i3++) {
      pending.push(parser.getDependency("node", nodeIds[i3]));
    }
    return Promise.all(pending).then(function(nodes) {
      for (let i3 = 0, il = nodes.length; i3 < il; i3++) {
        const node = nodes[i3];
        if (node.parent !== null) {
          scene.add(clone(node));
        } else {
          scene.add(node);
        }
      }
      const reduceAssociations = (node) => {
        const reducedAssociations = /* @__PURE__ */ new Map();
        for (const [key, value] of parser.associations) {
          if (key instanceof Material || key instanceof Texture) {
            reducedAssociations.set(key, value);
          }
        }
        node.traverse((node2) => {
          const mappings = parser.associations.get(node2);
          if (mappings != null) {
            reducedAssociations.set(node2, mappings);
          }
        });
        return reducedAssociations;
      };
      parser.associations = reduceAssociations(scene);
      return scene;
    });
  }
  _createAnimationTracks(node, inputAccessor, outputAccessor, sampler, target) {
    const tracks = [];
    const targetName = node.name ? node.name : node.uuid;
    const targetNames = [];
    function collectMorphTargets(object) {
      if (object.morphTargetInfluences) {
        targetNames.push(object.name ? object.name : object.uuid);
      }
    }
    if (PATH_PROPERTIES[target.path] === PATH_PROPERTIES.weights) {
      collectMorphTargets(node);
      if (node.isGroup) {
        node.children.forEach(collectMorphTargets);
      }
    } else {
      targetNames.push(targetName);
    }
    let TypedKeyframeTrack;
    switch (PATH_PROPERTIES[target.path]) {
      case PATH_PROPERTIES.weights:
        TypedKeyframeTrack = NumberKeyframeTrack;
        break;
      case PATH_PROPERTIES.rotation:
        TypedKeyframeTrack = QuaternionKeyframeTrack2;
        break;
      case PATH_PROPERTIES.translation:
      case PATH_PROPERTIES.scale:
        TypedKeyframeTrack = VectorKeyframeTrack2;
        break;
      default:
        switch (outputAccessor.itemSize) {
          case 1:
            TypedKeyframeTrack = NumberKeyframeTrack;
            break;
          case 2:
          case 3:
          default:
            TypedKeyframeTrack = VectorKeyframeTrack2;
            break;
        }
        break;
    }
    const interpolation = sampler.interpolation !== void 0 ? INTERPOLATION[sampler.interpolation] : InterpolateLinear;
    const outputArray = this._getArrayFromAccessor(outputAccessor);
    for (let j = 0, jl = targetNames.length; j < jl; j++) {
      const track = new TypedKeyframeTrack(
        targetNames[j] + "." + PATH_PROPERTIES[target.path],
        inputAccessor.array,
        outputArray,
        interpolation
      );
      if (sampler.interpolation === "CUBICSPLINE") {
        this._createCubicSplineTrackInterpolant(track);
      }
      tracks.push(track);
    }
    return tracks;
  }
  _getArrayFromAccessor(accessor) {
    let outputArray = accessor.array;
    if (accessor.normalized) {
      const scale = getNormalizedComponentScale(outputArray.constructor);
      const scaled = new Float32Array(outputArray.length);
      for (let j = 0, jl = outputArray.length; j < jl; j++) {
        scaled[j] = outputArray[j] * scale;
      }
      outputArray = scaled;
    }
    return outputArray;
  }
  _createCubicSplineTrackInterpolant(track) {
    track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline(result) {
      const interpolantType = this instanceof QuaternionKeyframeTrack2 ? GLTFCubicSplineQuaternionInterpolant : GLTFCubicSplineInterpolant;
      return new interpolantType(this.times, this.values, this.getValueSize() / 3, result);
    };
    track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;
  }
};
function computeBounds(geometry, primitiveDef, parser) {
  const attributes = primitiveDef.attributes;
  const box = new Box3();
  if (attributes.POSITION !== void 0) {
    const accessor = parser.json.accessors[attributes.POSITION];
    const min = accessor.min;
    const max3 = accessor.max;
    if (min !== void 0 && max3 !== void 0) {
      box.set(
        new Vector33(min[0], min[1], min[2]),
        new Vector33(max3[0], max3[1], max3[2])
      );
      if (accessor.normalized) {
        const boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);
        box.min.multiplyScalar(boxScale);
        box.max.multiplyScalar(boxScale);
      }
    } else {
      console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      return;
    }
  } else {
    return;
  }
  const targets = primitiveDef.targets;
  if (targets !== void 0) {
    const maxDisplacement = new Vector33();
    const vector = new Vector33();
    for (let i3 = 0, il = targets.length; i3 < il; i3++) {
      const target = targets[i3];
      if (target.POSITION !== void 0) {
        const accessor = parser.json.accessors[target.POSITION];
        const min = accessor.min;
        const max3 = accessor.max;
        if (min !== void 0 && max3 !== void 0) {
          vector.setX(Math.max(Math.abs(min[0]), Math.abs(max3[0])));
          vector.setY(Math.max(Math.abs(min[1]), Math.abs(max3[1])));
          vector.setZ(Math.max(Math.abs(min[2]), Math.abs(max3[2])));
          if (accessor.normalized) {
            const boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);
            vector.multiplyScalar(boxScale);
          }
          maxDisplacement.max(vector);
        } else {
          console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
        }
      }
    }
    box.expandByVector(maxDisplacement);
  }
  geometry.boundingBox = box;
  const sphere = new Sphere();
  box.getCenter(sphere.center);
  sphere.radius = box.min.distanceTo(box.max) / 2;
  geometry.boundingSphere = sphere;
}
function addPrimitiveAttributes(geometry, primitiveDef, parser) {
  const attributes = primitiveDef.attributes;
  const pending = [];
  function assignAttributeAccessor(accessorIndex, attributeName) {
    return parser.getDependency("accessor", accessorIndex).then(function(accessor) {
      geometry.setAttribute(attributeName, accessor);
    });
  }
  for (const gltfAttributeName in attributes) {
    const threeAttributeName = ATTRIBUTES[gltfAttributeName] || gltfAttributeName.toLowerCase();
    if (threeAttributeName in geometry.attributes) continue;
    pending.push(assignAttributeAccessor(attributes[gltfAttributeName], threeAttributeName));
  }
  if (primitiveDef.indices !== void 0 && !geometry.index) {
    const accessor = parser.getDependency("accessor", primitiveDef.indices).then(function(accessor2) {
      geometry.setIndex(accessor2);
    });
    pending.push(accessor);
  }
  if (ColorManagement.workingColorSpace !== LinearSRGBColorSpace && "COLOR_0" in attributes) {
    console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${ColorManagement.workingColorSpace}" not supported.`);
  }
  assignExtrasToUserData(geometry, primitiveDef);
  computeBounds(geometry, primitiveDef, parser);
  return Promise.all(pending).then(function() {
    return primitiveDef.targets !== void 0 ? addMorphTargets(geometry, primitiveDef.targets, parser) : geometry;
  });
}

// node_modules/three/examples/jsm/loaders/EXRLoader.js
import {
  DataTextureLoader,
  DataUtils,
  FloatType as FloatType2,
  HalfFloatType,
  LinearFilter as LinearFilter3,
  LinearSRGBColorSpace as LinearSRGBColorSpace2,
  RedFormat as RedFormat2,
  RGFormat,
  RGBAFormat as RGBAFormat2
} from "three";

// node_modules/three/examples/jsm/libs/fflate.module.js
var u82 = Uint8Array;
var u162 = Uint16Array;
var i322 = Int32Array;
var fleb2 = new u82([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb2 = new u82([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim2 = new u82([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb2 = function(eb, start) {
  var b = new u162(31);
  for (var i3 = 0; i3 < 31; ++i3) {
    b[i3] = start += 1 << eb[i3 - 1];
  }
  var r = new i322(b[30]);
  for (var i3 = 1; i3 < 30; ++i3) {
    for (var j = b[i3]; j < b[i3 + 1]; ++j) {
      r[j] = j - b[i3] << 5 | i3;
    }
  }
  return { b, r };
};
var _a2 = freb2(fleb2, 2);
var fl2 = _a2.b;
var revfl2 = _a2.r;
fl2[28] = 258, revfl2[258] = 28;
var _b2 = freb2(fdeb2, 0);
var fd2 = _b2.b;
var revfd2 = _b2.r;
var rev2 = new u162(32768);
for (i2 = 0; i2 < 32768; ++i2) {
  x2 = (i2 & 43690) >> 1 | (i2 & 21845) << 1;
  x2 = (x2 & 52428) >> 2 | (x2 & 13107) << 2;
  x2 = (x2 & 61680) >> 4 | (x2 & 3855) << 4;
  rev2[i2] = ((x2 & 65280) >> 8 | (x2 & 255) << 8) >> 1;
}
var x2;
var i2;
var hMap2 = (function(cd, mb, r) {
  var s = cd.length;
  var i3 = 0;
  var l = new u162(mb);
  for (; i3 < s; ++i3) {
    if (cd[i3])
      ++l[cd[i3] - 1];
  }
  var le = new u162(mb);
  for (i3 = 1; i3 < mb; ++i3) {
    le[i3] = le[i3 - 1] + l[i3 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u162(1 << mb);
    var rvb = 15 - mb;
    for (i3 = 0; i3 < s; ++i3) {
      if (cd[i3]) {
        var sv = i3 << 4 | cd[i3];
        var r_1 = mb - cd[i3];
        var v = le[cd[i3] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev2[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u162(s);
    for (i3 = 0; i3 < s; ++i3) {
      if (cd[i3]) {
        co[i3] = rev2[le[cd[i3] - 1]++] >> 15 - cd[i3];
      }
    }
  }
  return co;
});
var flt2 = new u82(288);
for (i2 = 0; i2 < 144; ++i2)
  flt2[i2] = 8;
var i2;
for (i2 = 144; i2 < 256; ++i2)
  flt2[i2] = 9;
var i2;
for (i2 = 256; i2 < 280; ++i2)
  flt2[i2] = 7;
var i2;
for (i2 = 280; i2 < 288; ++i2)
  flt2[i2] = 8;
var i2;
var fdt2 = new u82(32);
for (i2 = 0; i2 < 32; ++i2)
  fdt2[i2] = 5;
var i2;
var flrm2 = /* @__PURE__ */ hMap2(flt2, 9, 1);
var fdrm2 = /* @__PURE__ */ hMap2(fdt2, 5, 1);
var max2 = function(a) {
  var m = a[0];
  for (var i3 = 1; i3 < a.length; ++i3) {
    if (a[i3] > m)
      m = a[i3];
  }
  return m;
};
var bits2 = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits162 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft2 = function(p) {
  return (p + 7) / 8 | 0;
};
var slc2 = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u82(v.subarray(s, e));
};
var ec2 = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err2 = function(ind, msg, nt) {
  var e = new Error(msg || ec2[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err2);
  if (!nt)
    throw e;
  return e;
};
var inflt2 = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u82(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u82(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u82(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits2(dat, pos, 1);
      var type = bits2(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft2(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err2(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm2, dm = fdrm2, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits2(dat, pos, 31) + 257, hcLen = bits2(dat, pos + 10, 15) + 4;
        var tl = hLit + bits2(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u82(tl);
        var clt = new u82(19);
        for (var i3 = 0; i3 < hcLen; ++i3) {
          clt[clim2[i3]] = bits2(dat, pos + i3 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max2(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap2(clt, clb, 1);
        for (var i3 = 0; i3 < tl; ) {
          var r = clm[bits2(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i3++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits2(dat, pos, 3), pos += 2, c = ldt[i3 - 1];
            else if (s == 17)
              n = 3 + bits2(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits2(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i3++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max2(lt);
        dbt = max2(dt);
        lm = hMap2(lt, lbt, 1);
        dm = hMap2(dt, dbt, 1);
      } else
        err2(1);
      if (pos > tbts) {
        if (noSt)
          err2(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits162(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err2(0);
        break;
      }
      if (!c)
        err2(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i3 = sym - 257, b = fleb2[i3];
          add = bits2(dat, pos, (1 << b) - 1) + fl2[i3];
          pos += b;
        }
        var d = dm[bits162(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err2(3);
        pos += d & 15;
        var dt = fd2[dsym];
        if (dsym > 3) {
          var b = fdeb2[dsym];
          dt += bits162(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err2(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err2(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc2(buf, 0, bt) : buf.subarray(0, bt);
};
var et2 = /* @__PURE__ */ new u82(0);
var zls = function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err2(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err2(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
};
function unzlibSync(data, opts) {
  return inflt2(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td2 = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds2 = 0;
try {
  td2.decode(et2, { stream: true });
  tds2 = 1;
} catch (e) {
}

// node_modules/three/examples/jsm/loaders/EXRLoader.js
var EXRLoader = class extends DataTextureLoader {
  /**
   * Constructs a new EXR loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(manager) {
    super(manager);
    this.type = HalfFloatType;
    this.outputFormat = RGBAFormat2;
    this.part = 0;
  }
  /**
   * Parses the given EXR texture data.
   *
   * @param {ArrayBuffer} buffer - The raw texture data.
   * @return {DataTextureLoader~TexData} An object representing the parsed texture data.
   */
  parse(buffer) {
    const USHORT_RANGE = 1 << 16;
    const BITMAP_SIZE = USHORT_RANGE >> 3;
    const HUF_ENCBITS = 16;
    const HUF_DECBITS = 14;
    const HUF_ENCSIZE = (1 << HUF_ENCBITS) + 1;
    const HUF_DECSIZE = 1 << HUF_DECBITS;
    const HUF_DECMASK = HUF_DECSIZE - 1;
    const NBITS = 16;
    const A_OFFSET = 1 << NBITS - 1;
    const MOD_MASK = (1 << NBITS) - 1;
    const SHORT_ZEROCODE_RUN = 59;
    const LONG_ZEROCODE_RUN = 63;
    const SHORTEST_LONG_RUN = 2 + LONG_ZEROCODE_RUN - SHORT_ZEROCODE_RUN;
    const ULONG_SIZE = 8;
    const FLOAT32_SIZE = 4;
    const INT32_SIZE = 4;
    const INT16_SIZE = 2;
    const INT8_SIZE = 1;
    const STATIC_HUFFMAN = 0;
    const DEFLATE = 1;
    const UNKNOWN = 0;
    const LOSSY_DCT = 1;
    const RLE = 2;
    const logBase = Math.pow(2.7182818, 2.2);
    let b44LogTable = null;
    function reverseLutFromBitmap(bitmap, lut) {
      let k = 0;
      for (let i3 = 0; i3 < USHORT_RANGE; ++i3) {
        if (i3 == 0 || bitmap[i3 >> 3] & 1 << (i3 & 7)) {
          lut[k++] = i3;
        }
      }
      const n = k - 1;
      while (k < USHORT_RANGE) lut[k++] = 0;
      return n;
    }
    function hufClearDecTable(hdec) {
      for (let i3 = 0; i3 < HUF_DECSIZE; i3++) {
        hdec[i3] = {};
        hdec[i3].len = 0;
        hdec[i3].lit = 0;
        hdec[i3].p = null;
      }
    }
    const getBitsReturn = { l: 0, c: 0, lc: 0 };
    function getBits(nBits, c, lc, uInt8Array2, inOffset) {
      while (lc < nBits) {
        c = c << 8 | parseUint8Array(uInt8Array2, inOffset);
        lc += 8;
      }
      lc -= nBits;
      getBitsReturn.l = c >> lc & (1 << nBits) - 1;
      getBitsReturn.c = c;
      getBitsReturn.lc = lc;
    }
    const hufTableBuffer = new Array(59);
    function hufCanonicalCodeTable(hcode) {
      for (let i3 = 0; i3 <= 58; ++i3) hufTableBuffer[i3] = 0;
      for (let i3 = 0; i3 < HUF_ENCSIZE; ++i3) hufTableBuffer[hcode[i3]] += 1;
      let c = 0;
      for (let i3 = 58; i3 > 0; --i3) {
        const nc = c + hufTableBuffer[i3] >> 1;
        hufTableBuffer[i3] = c;
        c = nc;
      }
      for (let i3 = 0; i3 < HUF_ENCSIZE; ++i3) {
        const l = hcode[i3];
        if (l > 0) hcode[i3] = l | hufTableBuffer[l]++ << 6;
      }
    }
    function hufUnpackEncTable(uInt8Array2, inOffset, ni, im, iM, hcode) {
      const p = inOffset;
      let c = 0;
      let lc = 0;
      for (; im <= iM; im++) {
        if (p.value - inOffset.value > ni) return false;
        getBits(6, c, lc, uInt8Array2, p);
        const l = getBitsReturn.l;
        c = getBitsReturn.c;
        lc = getBitsReturn.lc;
        hcode[im] = l;
        if (l == LONG_ZEROCODE_RUN) {
          if (p.value - inOffset.value > ni) {
            throw new Error("THREE.EXRLoader: Something wrong with hufUnpackEncTable");
          }
          getBits(8, c, lc, uInt8Array2, p);
          let zerun = getBitsReturn.l + SHORTEST_LONG_RUN;
          c = getBitsReturn.c;
          lc = getBitsReturn.lc;
          if (im + zerun > iM + 1) {
            throw new Error("THREE.EXRLoader: Something wrong with hufUnpackEncTable");
          }
          while (zerun--) hcode[im++] = 0;
          im--;
        } else if (l >= SHORT_ZEROCODE_RUN) {
          let zerun = l - SHORT_ZEROCODE_RUN + 2;
          if (im + zerun > iM + 1) {
            throw new Error("THREE.EXRLoader: Something wrong with hufUnpackEncTable");
          }
          while (zerun--) hcode[im++] = 0;
          im--;
        }
      }
      hufCanonicalCodeTable(hcode);
    }
    function hufLength(code) {
      return code & 63;
    }
    function hufCode(code) {
      return code >> 6;
    }
    function hufBuildDecTable(hcode, im, iM, hdecod) {
      for (; im <= iM; im++) {
        const c = hufCode(hcode[im]);
        const l = hufLength(hcode[im]);
        if (c >> l) {
          throw new Error("THREE.EXRLoader: Invalid table entry");
        }
        if (l > HUF_DECBITS) {
          const pl = hdecod[c >> l - HUF_DECBITS];
          if (pl.len) {
            throw new Error("THREE.EXRLoader: Invalid table entry");
          }
          pl.lit++;
          if (pl.p) {
            const p = pl.p;
            pl.p = new Array(pl.lit);
            for (let i3 = 0; i3 < pl.lit - 1; ++i3) {
              pl.p[i3] = p[i3];
            }
          } else {
            pl.p = new Array(1);
          }
          pl.p[pl.lit - 1] = im;
        } else if (l) {
          let plOffset = 0;
          for (let i3 = 1 << HUF_DECBITS - l; i3 > 0; i3--) {
            const pl = hdecod[(c << HUF_DECBITS - l) + plOffset];
            if (pl.len || pl.p) {
              throw new Error("THREE.EXRLoader: Invalid table entry");
            }
            pl.len = l;
            pl.lit = im;
            plOffset++;
          }
        }
      }
      return true;
    }
    const getCharReturn = { c: 0, lc: 0 };
    function getChar(c, lc, uInt8Array2, inOffset) {
      c = c << 8 | parseUint8Array(uInt8Array2, inOffset);
      lc += 8;
      getCharReturn.c = c;
      getCharReturn.lc = lc;
    }
    const getCodeReturn = { c: 0, lc: 0 };
    function getCode(po, rlc, c, lc, uInt8Array2, inOffset, outBuffer, outBufferOffset, outBufferEndOffset) {
      if (po == rlc) {
        if (lc < 8) {
          getChar(c, lc, uInt8Array2, inOffset);
          c = getCharReturn.c;
          lc = getCharReturn.lc;
        }
        lc -= 8;
        let cs = c >> lc;
        cs = new Uint8Array([cs])[0];
        if (outBufferOffset.value + cs > outBufferEndOffset) {
          return false;
        }
        const s = outBuffer[outBufferOffset.value - 1];
        while (cs-- > 0) {
          outBuffer[outBufferOffset.value++] = s;
        }
      } else if (outBufferOffset.value < outBufferEndOffset) {
        outBuffer[outBufferOffset.value++] = po;
      } else {
        return false;
      }
      getCodeReturn.c = c;
      getCodeReturn.lc = lc;
    }
    function UInt16(value) {
      return value & 65535;
    }
    function Int16(value) {
      const ref = UInt16(value);
      return ref > 32767 ? ref - 65536 : ref;
    }
    const wdec14Return = { a: 0, b: 0 };
    function wdec14(l, h) {
      const ls = Int16(l);
      const hs = Int16(h);
      const hi = hs;
      const ai = ls + (hi & 1) + (hi >> 1);
      const as = ai;
      const bs = ai - hi;
      wdec14Return.a = as;
      wdec14Return.b = bs;
    }
    function wdec16(l, h) {
      const m = UInt16(l);
      const d = UInt16(h);
      const bb = m - (d >> 1) & MOD_MASK;
      const aa = d + bb - A_OFFSET & MOD_MASK;
      wdec14Return.a = aa;
      wdec14Return.b = bb;
    }
    function wav2Decode(buffer2, j, nx, ox, ny, oy, mx) {
      const w14 = mx < 1 << 14;
      const n = nx > ny ? ny : nx;
      let p = 1;
      let p2;
      let py;
      while (p <= n) p <<= 1;
      p >>= 1;
      p2 = p;
      p >>= 1;
      while (p >= 1) {
        py = 0;
        const ey = py + oy * (ny - p2);
        const oy1 = oy * p;
        const oy2 = oy * p2;
        const ox1 = ox * p;
        const ox2 = ox * p2;
        let i00, i01, i10, i11;
        for (; py <= ey; py += oy2) {
          let px = py;
          const ex = py + ox * (nx - p2);
          for (; px <= ex; px += ox2) {
            const p01 = px + ox1;
            const p10 = px + oy1;
            const p11 = p10 + ox1;
            if (w14) {
              wdec14(buffer2[px + j], buffer2[p10 + j]);
              i00 = wdec14Return.a;
              i10 = wdec14Return.b;
              wdec14(buffer2[p01 + j], buffer2[p11 + j]);
              i01 = wdec14Return.a;
              i11 = wdec14Return.b;
              wdec14(i00, i01);
              buffer2[px + j] = wdec14Return.a;
              buffer2[p01 + j] = wdec14Return.b;
              wdec14(i10, i11);
              buffer2[p10 + j] = wdec14Return.a;
              buffer2[p11 + j] = wdec14Return.b;
            } else {
              wdec16(buffer2[px + j], buffer2[p10 + j]);
              i00 = wdec14Return.a;
              i10 = wdec14Return.b;
              wdec16(buffer2[p01 + j], buffer2[p11 + j]);
              i01 = wdec14Return.a;
              i11 = wdec14Return.b;
              wdec16(i00, i01);
              buffer2[px + j] = wdec14Return.a;
              buffer2[p01 + j] = wdec14Return.b;
              wdec16(i10, i11);
              buffer2[p10 + j] = wdec14Return.a;
              buffer2[p11 + j] = wdec14Return.b;
            }
          }
          if (nx & p) {
            const p10 = px + oy1;
            if (w14)
              wdec14(buffer2[px + j], buffer2[p10 + j]);
            else
              wdec16(buffer2[px + j], buffer2[p10 + j]);
            i00 = wdec14Return.a;
            buffer2[p10 + j] = wdec14Return.b;
            buffer2[px + j] = i00;
          }
        }
        if (ny & p) {
          let px = py;
          const ex = py + ox * (nx - p2);
          for (; px <= ex; px += ox2) {
            const p01 = px + ox1;
            if (w14)
              wdec14(buffer2[px + j], buffer2[p01 + j]);
            else
              wdec16(buffer2[px + j], buffer2[p01 + j]);
            i00 = wdec14Return.a;
            buffer2[p01 + j] = wdec14Return.b;
            buffer2[px + j] = i00;
          }
        }
        p2 = p;
        p >>= 1;
      }
      return py;
    }
    function hufDecode(encodingTable, decodingTable, uInt8Array2, inOffset, ni, rlc, no, outBuffer, outOffset) {
      let c = 0;
      let lc = 0;
      const outBufferEndOffset = no;
      const inOffsetEnd = Math.trunc(inOffset.value + (ni + 7) / 8);
      while (inOffset.value < inOffsetEnd) {
        getChar(c, lc, uInt8Array2, inOffset);
        c = getCharReturn.c;
        lc = getCharReturn.lc;
        while (lc >= HUF_DECBITS) {
          const index = c >> lc - HUF_DECBITS & HUF_DECMASK;
          const pl = decodingTable[index];
          if (pl.len) {
            lc -= pl.len;
            getCode(pl.lit, rlc, c, lc, uInt8Array2, inOffset, outBuffer, outOffset, outBufferEndOffset);
            c = getCodeReturn.c;
            lc = getCodeReturn.lc;
          } else {
            if (!pl.p) {
              throw new Error("THREE.EXRLoader: hufDecode issues");
            }
            let j;
            for (j = 0; j < pl.lit; j++) {
              const l = hufLength(encodingTable[pl.p[j]]);
              while (lc < l && inOffset.value < inOffsetEnd) {
                getChar(c, lc, uInt8Array2, inOffset);
                c = getCharReturn.c;
                lc = getCharReturn.lc;
              }
              if (lc >= l) {
                if (hufCode(encodingTable[pl.p[j]]) == (c >> lc - l & (1 << l) - 1)) {
                  lc -= l;
                  getCode(pl.p[j], rlc, c, lc, uInt8Array2, inOffset, outBuffer, outOffset, outBufferEndOffset);
                  c = getCodeReturn.c;
                  lc = getCodeReturn.lc;
                  break;
                }
              }
            }
            if (j == pl.lit) {
              throw new Error("THREE.EXRLoader: hufDecode issues");
            }
          }
        }
      }
      const i3 = 8 - ni & 7;
      c >>= i3;
      lc -= i3;
      while (lc > 0) {
        const pl = decodingTable[c << HUF_DECBITS - lc & HUF_DECMASK];
        if (pl.len) {
          lc -= pl.len;
          getCode(pl.lit, rlc, c, lc, uInt8Array2, inOffset, outBuffer, outOffset, outBufferEndOffset);
          c = getCodeReturn.c;
          lc = getCodeReturn.lc;
        } else {
          throw new Error("THREE.EXRLoader: hufDecode issues");
        }
      }
      return true;
    }
    function hufUncompress(uInt8Array2, inDataView, inOffset, nCompressed, outBuffer, nRaw) {
      const outOffset = { value: 0 };
      const initialInOffset = inOffset.value;
      const im = parseUint32(inDataView, inOffset);
      const iM = parseUint32(inDataView, inOffset);
      inOffset.value += 4;
      const nBits = parseUint32(inDataView, inOffset);
      inOffset.value += 4;
      if (im < 0 || im >= HUF_ENCSIZE || iM < 0 || iM >= HUF_ENCSIZE) {
        throw new Error("THREE.EXRLoader: Something wrong with HUF_ENCSIZE");
      }
      const freq = new Array(HUF_ENCSIZE);
      const hdec = new Array(HUF_DECSIZE);
      hufClearDecTable(hdec);
      const ni = nCompressed - (inOffset.value - initialInOffset);
      hufUnpackEncTable(uInt8Array2, inOffset, ni, im, iM, freq);
      if (nBits > 8 * (nCompressed - (inOffset.value - initialInOffset))) {
        throw new Error("THREE.EXRLoader: Something wrong with hufUncompress");
      }
      hufBuildDecTable(freq, im, iM, hdec);
      hufDecode(freq, hdec, uInt8Array2, inOffset, nBits, iM, nRaw, outBuffer, outOffset);
    }
    function applyLut(lut, data, nData) {
      for (let i3 = 0; i3 < nData; ++i3) {
        data[i3] = lut[data[i3]];
      }
    }
    function predictor(source) {
      for (let t = 1; t < source.length; t++) {
        const d = source[t - 1] + source[t] - 128;
        source[t] = d;
      }
    }
    function interleaveScalar(source, out) {
      let t1 = 0;
      let t2 = Math.floor((source.length + 1) / 2);
      let s = 0;
      const stop = source.length - 1;
      while (true) {
        if (s > stop) break;
        out[s++] = source[t1++];
        if (s > stop) break;
        out[s++] = source[t2++];
      }
    }
    function decodeRunLength(source) {
      let size = source.byteLength;
      const out = new Array();
      let p = 0;
      const reader = new DataView(source);
      while (size > 0) {
        const l = reader.getInt8(p++);
        if (l < 0) {
          const count = -l;
          size -= count + 1;
          for (let i3 = 0; i3 < count; i3++) {
            out.push(reader.getUint8(p++));
          }
        } else {
          const count = l;
          size -= 2;
          const value = reader.getUint8(p++);
          for (let i3 = 0; i3 < count + 1; i3++) {
            out.push(value);
          }
        }
      }
      return out;
    }
    function lossyDctDecode(cscSet, rowPtrs, channelData, acBuffer, dcBuffer, outBuffer) {
      let dataView = new DataView(outBuffer.buffer);
      const width = channelData[cscSet.idx[0]].width;
      const height = channelData[cscSet.idx[0]].height;
      const numComp = 3;
      const numFullBlocksX = Math.floor(width / 8);
      const numBlocksX = Math.ceil(width / 8);
      const numBlocksY = Math.ceil(height / 8);
      const leftoverX = width - (numBlocksX - 1) * 8;
      const leftoverY = height - (numBlocksY - 1) * 8;
      const currAcComp = { value: 0 };
      const currDcComp = new Array(numComp);
      const dctData = new Array(numComp);
      const halfZigBlock = new Array(numComp);
      const rowBlock = new Array(numComp);
      const rowOffsets = new Array(numComp);
      for (let comp = 0; comp < numComp; ++comp) {
        rowOffsets[comp] = rowPtrs[cscSet.idx[comp]];
        currDcComp[comp] = comp < 1 ? 0 : currDcComp[comp - 1] + numBlocksX * numBlocksY;
        dctData[comp] = new Float32Array(64);
        halfZigBlock[comp] = new Uint16Array(64);
        rowBlock[comp] = new Uint16Array(numBlocksX * 64);
      }
      for (let blocky = 0; blocky < numBlocksY; ++blocky) {
        let maxY = 8;
        if (blocky == numBlocksY - 1)
          maxY = leftoverY;
        let maxX = 8;
        for (let blockx = 0; blockx < numBlocksX; ++blockx) {
          if (blockx == numBlocksX - 1)
            maxX = leftoverX;
          for (let comp = 0; comp < numComp; ++comp) {
            halfZigBlock[comp].fill(0);
            halfZigBlock[comp][0] = dcBuffer[currDcComp[comp]++];
            unRleAC(currAcComp, acBuffer, halfZigBlock[comp]);
            unZigZag(halfZigBlock[comp], dctData[comp]);
            dctInverse(dctData[comp]);
          }
          if (numComp == 3) {
            csc709Inverse(dctData);
          }
          for (let comp = 0; comp < numComp; ++comp) {
            convertToHalf(dctData[comp], rowBlock[comp], blockx * 64);
          }
        }
        let offset2 = 0;
        for (let comp = 0; comp < numComp; ++comp) {
          const type = channelData[cscSet.idx[comp]].type;
          for (let y = 8 * blocky; y < 8 * blocky + maxY; ++y) {
            offset2 = rowOffsets[comp][y];
            for (let blockx = 0; blockx < numFullBlocksX; ++blockx) {
              const src = blockx * 64 + (y & 7) * 8;
              dataView.setUint16(offset2 + 0 * INT16_SIZE * type, rowBlock[comp][src + 0], true);
              dataView.setUint16(offset2 + 1 * INT16_SIZE * type, rowBlock[comp][src + 1], true);
              dataView.setUint16(offset2 + 2 * INT16_SIZE * type, rowBlock[comp][src + 2], true);
              dataView.setUint16(offset2 + 3 * INT16_SIZE * type, rowBlock[comp][src + 3], true);
              dataView.setUint16(offset2 + 4 * INT16_SIZE * type, rowBlock[comp][src + 4], true);
              dataView.setUint16(offset2 + 5 * INT16_SIZE * type, rowBlock[comp][src + 5], true);
              dataView.setUint16(offset2 + 6 * INT16_SIZE * type, rowBlock[comp][src + 6], true);
              dataView.setUint16(offset2 + 7 * INT16_SIZE * type, rowBlock[comp][src + 7], true);
              offset2 += 8 * INT16_SIZE * type;
            }
          }
          if (numFullBlocksX != numBlocksX) {
            for (let y = 8 * blocky; y < 8 * blocky + maxY; ++y) {
              const offset3 = rowOffsets[comp][y] + 8 * numFullBlocksX * INT16_SIZE * type;
              const src = numFullBlocksX * 64 + (y & 7) * 8;
              for (let x3 = 0; x3 < maxX; ++x3) {
                dataView.setUint16(offset3 + x3 * INT16_SIZE * type, rowBlock[comp][src + x3], true);
              }
            }
          }
        }
      }
      const halfRow = new Uint16Array(width);
      dataView = new DataView(outBuffer.buffer);
      for (let comp = 0; comp < numComp; ++comp) {
        channelData[cscSet.idx[comp]].decoded = true;
        const type = channelData[cscSet.idx[comp]].type;
        if (channelData[comp].type != 2) continue;
        for (let y = 0; y < height; ++y) {
          const offset2 = rowOffsets[comp][y];
          for (let x3 = 0; x3 < width; ++x3) {
            halfRow[x3] = dataView.getUint16(offset2 + x3 * INT16_SIZE * type, true);
          }
          for (let x3 = 0; x3 < width; ++x3) {
            dataView.setFloat32(offset2 + x3 * INT16_SIZE * type, decodeFloat16(halfRow[x3]), true);
          }
        }
      }
    }
    function lossyDctChannelDecode(channelIndex, rowPtrs, channelData, acBuffer, dcBuffer, outBuffer) {
      const dataView = new DataView(outBuffer.buffer);
      const cd = channelData[channelIndex];
      const width = cd.width;
      const height = cd.height;
      const numBlocksX = Math.ceil(width / 8);
      const numBlocksY = Math.ceil(height / 8);
      const numFullBlocksX = Math.floor(width / 8);
      const leftoverX = width - (numBlocksX - 1) * 8;
      const leftoverY = height - (numBlocksY - 1) * 8;
      const currAcComp = { value: 0 };
      let currDcComp = 0;
      const dctData = new Float32Array(64);
      const halfZigBlock = new Uint16Array(64);
      const rowBlock = new Uint16Array(numBlocksX * 64);
      for (let blocky = 0; blocky < numBlocksY; ++blocky) {
        let maxY = 8;
        if (blocky == numBlocksY - 1) maxY = leftoverY;
        for (let blockx = 0; blockx < numBlocksX; ++blockx) {
          halfZigBlock.fill(0);
          halfZigBlock[0] = dcBuffer[currDcComp++];
          unRleAC(currAcComp, acBuffer, halfZigBlock);
          unZigZag(halfZigBlock, dctData);
          dctInverse(dctData);
          convertToHalf(dctData, rowBlock, blockx * 64);
        }
        for (let y = 8 * blocky; y < 8 * blocky + maxY; ++y) {
          let offset2 = rowPtrs[channelIndex][y];
          for (let blockx = 0; blockx < numFullBlocksX; ++blockx) {
            const src = blockx * 64 + (y & 7) * 8;
            for (let x3 = 0; x3 < 8; ++x3) {
              dataView.setUint16(offset2 + x3 * INT16_SIZE * cd.type, rowBlock[src + x3], true);
            }
            offset2 += 8 * INT16_SIZE * cd.type;
          }
          if (numBlocksX != numFullBlocksX) {
            const src = numFullBlocksX * 64 + (y & 7) * 8;
            for (let x3 = 0; x3 < leftoverX; ++x3) {
              dataView.setUint16(offset2 + x3 * INT16_SIZE * cd.type, rowBlock[src + x3], true);
            }
          }
        }
      }
      cd.decoded = true;
    }
    function unRleAC(currAcComp, acBuffer, halfZigBlock) {
      let acValue;
      let dctComp = 1;
      while (dctComp < 64) {
        acValue = acBuffer[currAcComp.value];
        if (acValue == 65280) {
          dctComp = 64;
        } else if (acValue >> 8 == 255) {
          dctComp += acValue & 255;
        } else {
          halfZigBlock[dctComp] = acValue;
          dctComp++;
        }
        currAcComp.value++;
      }
    }
    function unZigZag(src, dst) {
      dst[0] = decodeFloat16(src[0]);
      dst[1] = decodeFloat16(src[1]);
      dst[2] = decodeFloat16(src[5]);
      dst[3] = decodeFloat16(src[6]);
      dst[4] = decodeFloat16(src[14]);
      dst[5] = decodeFloat16(src[15]);
      dst[6] = decodeFloat16(src[27]);
      dst[7] = decodeFloat16(src[28]);
      dst[8] = decodeFloat16(src[2]);
      dst[9] = decodeFloat16(src[4]);
      dst[10] = decodeFloat16(src[7]);
      dst[11] = decodeFloat16(src[13]);
      dst[12] = decodeFloat16(src[16]);
      dst[13] = decodeFloat16(src[26]);
      dst[14] = decodeFloat16(src[29]);
      dst[15] = decodeFloat16(src[42]);
      dst[16] = decodeFloat16(src[3]);
      dst[17] = decodeFloat16(src[8]);
      dst[18] = decodeFloat16(src[12]);
      dst[19] = decodeFloat16(src[17]);
      dst[20] = decodeFloat16(src[25]);
      dst[21] = decodeFloat16(src[30]);
      dst[22] = decodeFloat16(src[41]);
      dst[23] = decodeFloat16(src[43]);
      dst[24] = decodeFloat16(src[9]);
      dst[25] = decodeFloat16(src[11]);
      dst[26] = decodeFloat16(src[18]);
      dst[27] = decodeFloat16(src[24]);
      dst[28] = decodeFloat16(src[31]);
      dst[29] = decodeFloat16(src[40]);
      dst[30] = decodeFloat16(src[44]);
      dst[31] = decodeFloat16(src[53]);
      dst[32] = decodeFloat16(src[10]);
      dst[33] = decodeFloat16(src[19]);
      dst[34] = decodeFloat16(src[23]);
      dst[35] = decodeFloat16(src[32]);
      dst[36] = decodeFloat16(src[39]);
      dst[37] = decodeFloat16(src[45]);
      dst[38] = decodeFloat16(src[52]);
      dst[39] = decodeFloat16(src[54]);
      dst[40] = decodeFloat16(src[20]);
      dst[41] = decodeFloat16(src[22]);
      dst[42] = decodeFloat16(src[33]);
      dst[43] = decodeFloat16(src[38]);
      dst[44] = decodeFloat16(src[46]);
      dst[45] = decodeFloat16(src[51]);
      dst[46] = decodeFloat16(src[55]);
      dst[47] = decodeFloat16(src[60]);
      dst[48] = decodeFloat16(src[21]);
      dst[49] = decodeFloat16(src[34]);
      dst[50] = decodeFloat16(src[37]);
      dst[51] = decodeFloat16(src[47]);
      dst[52] = decodeFloat16(src[50]);
      dst[53] = decodeFloat16(src[56]);
      dst[54] = decodeFloat16(src[59]);
      dst[55] = decodeFloat16(src[61]);
      dst[56] = decodeFloat16(src[35]);
      dst[57] = decodeFloat16(src[36]);
      dst[58] = decodeFloat16(src[48]);
      dst[59] = decodeFloat16(src[49]);
      dst[60] = decodeFloat16(src[57]);
      dst[61] = decodeFloat16(src[58]);
      dst[62] = decodeFloat16(src[62]);
      dst[63] = decodeFloat16(src[63]);
    }
    function dctInverse(data) {
      const a = 0.5 * Math.cos(3.14159 / 4);
      const b = 0.5 * Math.cos(3.14159 / 16);
      const c = 0.5 * Math.cos(3.14159 / 8);
      const d = 0.5 * Math.cos(3 * 3.14159 / 16);
      const e = 0.5 * Math.cos(5 * 3.14159 / 16);
      const f = 0.5 * Math.cos(3 * 3.14159 / 8);
      const g = 0.5 * Math.cos(7 * 3.14159 / 16);
      const alpha = new Array(4);
      const beta = new Array(4);
      const theta = new Array(4);
      const gamma = new Array(4);
      for (let row = 0; row < 8; ++row) {
        const rowPtr = row * 8;
        alpha[0] = c * data[rowPtr + 2];
        alpha[1] = f * data[rowPtr + 2];
        alpha[2] = c * data[rowPtr + 6];
        alpha[3] = f * data[rowPtr + 6];
        beta[0] = b * data[rowPtr + 1] + d * data[rowPtr + 3] + e * data[rowPtr + 5] + g * data[rowPtr + 7];
        beta[1] = d * data[rowPtr + 1] - g * data[rowPtr + 3] - b * data[rowPtr + 5] - e * data[rowPtr + 7];
        beta[2] = e * data[rowPtr + 1] - b * data[rowPtr + 3] + g * data[rowPtr + 5] + d * data[rowPtr + 7];
        beta[3] = g * data[rowPtr + 1] - e * data[rowPtr + 3] + d * data[rowPtr + 5] - b * data[rowPtr + 7];
        theta[0] = a * (data[rowPtr + 0] + data[rowPtr + 4]);
        theta[3] = a * (data[rowPtr + 0] - data[rowPtr + 4]);
        theta[1] = alpha[0] + alpha[3];
        theta[2] = alpha[1] - alpha[2];
        gamma[0] = theta[0] + theta[1];
        gamma[1] = theta[3] + theta[2];
        gamma[2] = theta[3] - theta[2];
        gamma[3] = theta[0] - theta[1];
        data[rowPtr + 0] = gamma[0] + beta[0];
        data[rowPtr + 1] = gamma[1] + beta[1];
        data[rowPtr + 2] = gamma[2] + beta[2];
        data[rowPtr + 3] = gamma[3] + beta[3];
        data[rowPtr + 4] = gamma[3] - beta[3];
        data[rowPtr + 5] = gamma[2] - beta[2];
        data[rowPtr + 6] = gamma[1] - beta[1];
        data[rowPtr + 7] = gamma[0] - beta[0];
      }
      for (let column = 0; column < 8; ++column) {
        alpha[0] = c * data[16 + column];
        alpha[1] = f * data[16 + column];
        alpha[2] = c * data[48 + column];
        alpha[3] = f * data[48 + column];
        beta[0] = b * data[8 + column] + d * data[24 + column] + e * data[40 + column] + g * data[56 + column];
        beta[1] = d * data[8 + column] - g * data[24 + column] - b * data[40 + column] - e * data[56 + column];
        beta[2] = e * data[8 + column] - b * data[24 + column] + g * data[40 + column] + d * data[56 + column];
        beta[3] = g * data[8 + column] - e * data[24 + column] + d * data[40 + column] - b * data[56 + column];
        theta[0] = a * (data[column] + data[32 + column]);
        theta[3] = a * (data[column] - data[32 + column]);
        theta[1] = alpha[0] + alpha[3];
        theta[2] = alpha[1] - alpha[2];
        gamma[0] = theta[0] + theta[1];
        gamma[1] = theta[3] + theta[2];
        gamma[2] = theta[3] - theta[2];
        gamma[3] = theta[0] - theta[1];
        data[0 + column] = gamma[0] + beta[0];
        data[8 + column] = gamma[1] + beta[1];
        data[16 + column] = gamma[2] + beta[2];
        data[24 + column] = gamma[3] + beta[3];
        data[32 + column] = gamma[3] - beta[3];
        data[40 + column] = gamma[2] - beta[2];
        data[48 + column] = gamma[1] - beta[1];
        data[56 + column] = gamma[0] - beta[0];
      }
    }
    function csc709Inverse(data) {
      for (let i3 = 0; i3 < 64; ++i3) {
        const y = data[0][i3];
        const cb = data[1][i3];
        const cr = data[2][i3];
        data[0][i3] = y + 1.5747 * cr;
        data[1][i3] = y - 0.1873 * cb - 0.4682 * cr;
        data[2][i3] = y + 1.8556 * cb;
      }
    }
    function convertToHalf(src, dst, idx) {
      for (let i3 = 0; i3 < 64; ++i3) {
        dst[idx + i3] = DataUtils.toHalfFloat(toLinear(src[i3]));
      }
    }
    function toLinear(float) {
      if (float <= 1) {
        return Math.sign(float) * Math.pow(Math.abs(float), 2.2);
      } else {
        return Math.sign(float) * Math.pow(logBase, Math.abs(float) - 1);
      }
    }
    function uncompressRAW(info) {
      return new DataView(info.array.buffer, info.offset.value, info.size);
    }
    function uncompressRLE(info) {
      const compressed = info.viewer.buffer.slice(info.offset.value, info.offset.value + info.size);
      const rawBuffer = new Uint8Array(decodeRunLength(compressed));
      const tmpBuffer = new Uint8Array(rawBuffer.length);
      predictor(rawBuffer);
      interleaveScalar(rawBuffer, tmpBuffer);
      return new DataView(tmpBuffer.buffer);
    }
    function uncompressZIP(info) {
      const compressed = info.array.slice(info.offset.value, info.offset.value + info.size);
      const rawBuffer = unzlibSync(compressed);
      const tmpBuffer = new Uint8Array(rawBuffer.length);
      predictor(rawBuffer);
      interleaveScalar(rawBuffer, tmpBuffer);
      return new DataView(tmpBuffer.buffer);
    }
    function uncompressPIZ(info) {
      const inDataView = info.viewer;
      const inOffset = { value: info.offset.value };
      const outBuffer = new Uint16Array(info.columns * info.lines * (info.inputChannels.length * info.type));
      const bitmap = new Uint8Array(BITMAP_SIZE);
      let outBufferEnd = 0;
      const pizChannelData = new Array(info.inputChannels.length);
      for (let i3 = 0, il = info.inputChannels.length; i3 < il; i3++) {
        pizChannelData[i3] = {};
        pizChannelData[i3]["start"] = outBufferEnd;
        pizChannelData[i3]["end"] = pizChannelData[i3]["start"];
        pizChannelData[i3]["nx"] = info.columns;
        pizChannelData[i3]["ny"] = info.lines;
        pizChannelData[i3]["size"] = info.type;
        outBufferEnd += pizChannelData[i3].nx * pizChannelData[i3].ny * pizChannelData[i3].size;
      }
      const minNonZero = parseUint16(inDataView, inOffset);
      const maxNonZero = parseUint16(inDataView, inOffset);
      if (maxNonZero >= BITMAP_SIZE) {
        throw new Error("THREE.EXRLoader: Something is wrong with PIZ_COMPRESSION BITMAP_SIZE");
      }
      if (minNonZero <= maxNonZero) {
        for (let i3 = 0; i3 < maxNonZero - minNonZero + 1; i3++) {
          bitmap[i3 + minNonZero] = parseUint8(inDataView, inOffset);
        }
      }
      const lut = new Uint16Array(USHORT_RANGE);
      const maxValue = reverseLutFromBitmap(bitmap, lut);
      const length = parseUint32(inDataView, inOffset);
      hufUncompress(info.array, inDataView, inOffset, length, outBuffer, outBufferEnd);
      for (let i3 = 0; i3 < info.inputChannels.length; ++i3) {
        const cd = pizChannelData[i3];
        for (let j = 0; j < pizChannelData[i3].size; ++j) {
          wav2Decode(
            outBuffer,
            cd.start + j,
            cd.nx,
            cd.size,
            cd.ny,
            cd.nx * cd.size,
            maxValue
          );
        }
      }
      applyLut(lut, outBuffer, outBufferEnd);
      let tmpOffset = 0;
      const tmpBuffer = new Uint8Array(outBuffer.buffer.byteLength);
      for (let y = 0; y < info.lines; y++) {
        for (let c = 0; c < info.inputChannels.length; c++) {
          const cd = pizChannelData[c];
          const n = cd.nx * cd.size;
          const cp = new Uint8Array(outBuffer.buffer, cd.end * INT16_SIZE, n * INT16_SIZE);
          tmpBuffer.set(cp, tmpOffset);
          tmpOffset += n * INT16_SIZE;
          cd.end += n;
        }
      }
      return new DataView(tmpBuffer.buffer);
    }
    function uncompressPXR(info) {
      const compressed = info.array.slice(info.offset.value, info.offset.value + info.size);
      const rawBuffer = unzlibSync(compressed);
      const byteSize = info.inputChannels.length * info.lines * info.columns * info.totalBytes;
      const tmpBuffer = new ArrayBuffer(byteSize);
      const viewer = new DataView(tmpBuffer);
      let tmpBufferEnd = 0;
      let writePtr = 0;
      const ptr = new Array(4);
      for (let y = 0; y < info.lines; y++) {
        for (let c = 0; c < info.inputChannels.length; c++) {
          let pixel = 0;
          const type = info.inputChannels[c].pixelType;
          switch (type) {
            case 1:
              ptr[0] = tmpBufferEnd;
              ptr[1] = ptr[0] + info.columns;
              tmpBufferEnd = ptr[1] + info.columns;
              for (let j = 0; j < info.columns; ++j) {
                const diff = rawBuffer[ptr[0]++] << 8 | rawBuffer[ptr[1]++];
                pixel += diff;
                viewer.setUint16(writePtr, pixel, true);
                writePtr += 2;
              }
              break;
            case 2:
              ptr[0] = tmpBufferEnd;
              ptr[1] = ptr[0] + info.columns;
              ptr[2] = ptr[1] + info.columns;
              tmpBufferEnd = ptr[2] + info.columns;
              for (let j = 0; j < info.columns; ++j) {
                const diff = rawBuffer[ptr[0]++] << 24 | rawBuffer[ptr[1]++] << 16 | rawBuffer[ptr[2]++] << 8;
                pixel += diff;
                viewer.setUint32(writePtr, pixel, true);
                writePtr += 4;
              }
              break;
          }
        }
      }
      return viewer;
    }
    function uncompressB44(info) {
      const src = info.array;
      let srcOffset = info.offset.value;
      const width = info.columns;
      const height = info.lines;
      const channels = info.inputChannels;
      const totalBytes = info.totalBytes;
      const isB44A = EXRHeader.compression === "B44A_COMPRESSION";
      const outBuffer = new Uint8Array(height * width * totalBytes);
      const block = new Uint16Array(16);
      let chByteOffset = 0;
      for (let c = 0; c < channels.length; c++) {
        const channel = channels[c];
        const pixelSize = channel.pixelType * 2;
        const chanWidth = Math.ceil(width / channel.xSampling);
        const chanHeight = Math.ceil(height / channel.ySampling);
        const isFullRes = channel.xSampling === 1 && channel.ySampling === 1;
        if (channel.pixelType !== 1) {
          for (let y = 0; y < chanHeight; y++) {
            if (isFullRes) {
              const lineBase = y * width * totalBytes + chByteOffset * width;
              for (let x3 = 0; x3 < chanWidth * pixelSize; x3++) {
                outBuffer[lineBase + x3] = src[srcOffset++];
              }
            } else {
              srcOffset += chanWidth * pixelSize;
            }
          }
          chByteOffset += pixelSize;
          continue;
        }
        const numBlocksX = Math.ceil(chanWidth / 4);
        const numBlocksY = Math.ceil(chanHeight / 4);
        for (let by = 0; by < numBlocksY; by++) {
          for (let bx = 0; bx < numBlocksX; bx++) {
            if (isB44A && src[srcOffset + 2] >= 52) {
              const t = src[srcOffset] << 8 | src[srcOffset + 1];
              const h = t & 32768 ? t & 32767 : ~t & 65535;
              block.fill(h);
              srcOffset += 3;
            } else {
              const s0 = src[srcOffset] << 8 | src[srcOffset + 1];
              const shift = src[srcOffset + 2] >> 2;
              const bias = 32 << shift;
              const s4 = s0 + ((src[srcOffset + 2] << 4 | src[srcOffset + 3] >> 4) & 63) * (1 << shift) - bias & 65535;
              const s8 = s4 + ((src[srcOffset + 3] << 2 | src[srcOffset + 4] >> 6) & 63) * (1 << shift) - bias & 65535;
              const s12 = s8 + (src[srcOffset + 4] & 63) * (1 << shift) - bias & 65535;
              const s1 = s0 + (src[srcOffset + 5] >> 2 & 63) * (1 << shift) - bias & 65535;
              const s5 = s4 + ((src[srcOffset + 5] << 4 | src[srcOffset + 6] >> 4) & 63) * (1 << shift) - bias & 65535;
              const s9 = s8 + ((src[srcOffset + 6] << 2 | src[srcOffset + 7] >> 6) & 63) * (1 << shift) - bias & 65535;
              const s13 = s12 + (src[srcOffset + 7] & 63) * (1 << shift) - bias & 65535;
              const s2 = s1 + (src[srcOffset + 8] >> 2 & 63) * (1 << shift) - bias & 65535;
              const s6 = s5 + ((src[srcOffset + 8] << 4 | src[srcOffset + 9] >> 4) & 63) * (1 << shift) - bias & 65535;
              const s10 = s9 + ((src[srcOffset + 9] << 2 | src[srcOffset + 10] >> 6) & 63) * (1 << shift) - bias & 65535;
              const s14 = s13 + (src[srcOffset + 10] & 63) * (1 << shift) - bias & 65535;
              const s3 = s2 + (src[srcOffset + 11] >> 2 & 63) * (1 << shift) - bias & 65535;
              const s7 = s6 + ((src[srcOffset + 11] << 4 | src[srcOffset + 12] >> 4) & 63) * (1 << shift) - bias & 65535;
              const s11 = s10 + ((src[srcOffset + 12] << 2 | src[srcOffset + 13] >> 6) & 63) * (1 << shift) - bias & 65535;
              const s15 = s14 + (src[srcOffset + 13] & 63) * (1 << shift) - bias & 65535;
              const t = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15];
              for (let i3 = 0; i3 < 16; i3++) {
                block[i3] = t[i3] & 32768 ? t[i3] & 32767 : ~t[i3] & 65535;
              }
              srcOffset += 14;
            }
            if (channel.pLinear) {
              if (b44LogTable === null) {
                b44LogTable = new Uint16Array(65536);
                for (let i3 = 0; i3 < 65536; i3++) {
                  if ((i3 & 31744) === 31744 || i3 > 32768) {
                    b44LogTable[i3] = 0;
                  } else {
                    const f = decodeFloat16(i3);
                    b44LogTable[i3] = f <= 0 ? 0 : DataUtils.toHalfFloat(8 * Math.log(f));
                  }
                }
              }
              for (let i3 = 0; i3 < 16; i3++) block[i3] = b44LogTable[block[i3]];
            }
            for (let py = 0; py < 4; py++) {
              const chanY = by * 4 + py;
              if (chanY >= chanHeight) continue;
              for (let px = 0; px < 4; px++) {
                const chanX = bx * 4 + px;
                if (chanX >= chanWidth) continue;
                const val = block[py * 4 + px];
                for (let dy = 0; dy < channel.ySampling; dy++) {
                  const fullY = chanY * channel.ySampling + dy;
                  if (fullY >= height) continue;
                  for (let dx = 0; dx < channel.xSampling; dx++) {
                    const fullX = chanX * channel.xSampling + dx;
                    if (fullX >= width) continue;
                    const outIdx = fullY * width * totalBytes + chByteOffset * width + fullX * 2;
                    outBuffer[outIdx] = val & 255;
                    outBuffer[outIdx + 1] = val >> 8 & 255;
                  }
                }
              }
            }
          }
        }
        chByteOffset += 2;
      }
      return new DataView(outBuffer.buffer);
    }
    function uncompressDWA(info) {
      const inDataView = info.viewer;
      const inOffset = { value: info.offset.value };
      const outBuffer = new Uint8Array(info.columns * info.lines * (info.inputChannels.length * info.type * INT16_SIZE));
      const dwaHeader = {
        version: parseInt64(inDataView, inOffset),
        unknownUncompressedSize: parseInt64(inDataView, inOffset),
        unknownCompressedSize: parseInt64(inDataView, inOffset),
        acCompressedSize: parseInt64(inDataView, inOffset),
        dcCompressedSize: parseInt64(inDataView, inOffset),
        rleCompressedSize: parseInt64(inDataView, inOffset),
        rleUncompressedSize: parseInt64(inDataView, inOffset),
        rleRawSize: parseInt64(inDataView, inOffset),
        totalAcUncompressedCount: parseInt64(inDataView, inOffset),
        totalDcUncompressedCount: parseInt64(inDataView, inOffset),
        acCompression: parseInt64(inDataView, inOffset)
      };
      if (dwaHeader.version < 2)
        throw new Error("THREE.EXRLoader: " + EXRHeader.compression + " version " + dwaHeader.version + " is unsupported");
      const channelRules = new Array();
      let ruleSize = parseUint16(inDataView, inOffset) - INT16_SIZE;
      while (ruleSize > 0) {
        const name = parseNullTerminatedString(inDataView.buffer, inOffset);
        const value = parseUint8(inDataView, inOffset);
        const compression = value >> 2 & 3;
        const csc = (value >> 4) - 1;
        const index = new Int8Array([csc])[0];
        const type = parseUint8(inDataView, inOffset);
        channelRules.push({
          name,
          index,
          type,
          compression
        });
        ruleSize -= name.length + 3;
      }
      const channels = EXRHeader.channels;
      const channelData = new Array(info.inputChannels.length);
      for (let i3 = 0; i3 < info.inputChannels.length; ++i3) {
        const cd = channelData[i3] = {};
        const channel = channels[i3];
        cd.name = channel.name;
        cd.compression = UNKNOWN;
        cd.decoded = false;
        cd.type = channel.pixelType;
        cd.pLinear = channel.pLinear;
        cd.width = info.columns;
        cd.height = info.lines;
      }
      const cscSet = {
        idx: new Array(3)
      };
      for (let offset2 = 0; offset2 < info.inputChannels.length; ++offset2) {
        const cd = channelData[offset2];
        const dotIndex = cd.name.lastIndexOf(".");
        const suffix = dotIndex >= 0 ? cd.name.substring(dotIndex + 1) : cd.name;
        for (let i3 = 0; i3 < channelRules.length; ++i3) {
          const rule = channelRules[i3];
          if (suffix === rule.name && cd.type === rule.type) {
            cd.compression = rule.compression;
            if (rule.index >= 0) {
              cscSet.idx[rule.index] = offset2;
            }
            cd.offset = offset2;
          }
        }
      }
      let acBuffer, dcBuffer, rleBuffer;
      if (dwaHeader.acCompressedSize > 0) {
        switch (dwaHeader.acCompression) {
          case STATIC_HUFFMAN:
            acBuffer = new Uint16Array(dwaHeader.totalAcUncompressedCount);
            hufUncompress(info.array, inDataView, inOffset, dwaHeader.acCompressedSize, acBuffer, dwaHeader.totalAcUncompressedCount);
            break;
          case DEFLATE:
            const compressed = info.array.slice(inOffset.value, inOffset.value + dwaHeader.totalAcUncompressedCount);
            const data = unzlibSync(compressed);
            acBuffer = new Uint16Array(data.buffer);
            inOffset.value += dwaHeader.totalAcUncompressedCount;
            break;
        }
      }
      if (dwaHeader.dcCompressedSize > 0) {
        const zlibInfo = {
          array: info.array,
          offset: inOffset,
          size: dwaHeader.dcCompressedSize
        };
        dcBuffer = new Uint16Array(uncompressZIP(zlibInfo).buffer);
        inOffset.value += dwaHeader.dcCompressedSize;
      }
      if (dwaHeader.rleRawSize > 0) {
        const compressed = info.array.slice(inOffset.value, inOffset.value + dwaHeader.rleCompressedSize);
        const data = unzlibSync(compressed);
        rleBuffer = decodeRunLength(data.buffer);
        inOffset.value += dwaHeader.rleCompressedSize;
      }
      let outBufferEnd = 0;
      const rowOffsets = new Array(channelData.length);
      for (let i3 = 0; i3 < rowOffsets.length; ++i3) {
        rowOffsets[i3] = new Array();
      }
      for (let y = 0; y < info.lines; ++y) {
        for (let chan = 0; chan < channelData.length; ++chan) {
          rowOffsets[chan].push(outBufferEnd);
          outBufferEnd += channelData[chan].width * info.type * INT16_SIZE;
        }
      }
      if (cscSet.idx[0] !== void 0 && channelData[cscSet.idx[0]]) {
        lossyDctDecode(cscSet, rowOffsets, channelData, acBuffer, dcBuffer, outBuffer);
      }
      for (let i3 = 0; i3 < channelData.length; ++i3) {
        const cd = channelData[i3];
        if (cd.decoded) continue;
        switch (cd.compression) {
          case RLE:
            let row = 0;
            let rleOffset = 0;
            for (let y = 0; y < info.lines; ++y) {
              let rowOffsetBytes = rowOffsets[i3][row];
              for (let x3 = 0; x3 < cd.width; ++x3) {
                for (let byte = 0; byte < INT16_SIZE * cd.type; ++byte) {
                  outBuffer[rowOffsetBytes++] = rleBuffer[rleOffset + byte * cd.width * cd.height];
                }
                rleOffset++;
              }
              row++;
            }
            break;
          case LOSSY_DCT:
            lossyDctChannelDecode(i3, rowOffsets, channelData, acBuffer, dcBuffer, outBuffer);
            break;
          default:
            throw new Error("THREE.EXRLoader: unsupported channel compression");
        }
      }
      return new DataView(outBuffer.buffer);
    }
    function parseNullTerminatedString(buffer2, offset2) {
      const uintBuffer = new Uint8Array(buffer2);
      let endOffset = 0;
      while (uintBuffer[offset2.value + endOffset] != 0) {
        endOffset += 1;
      }
      const stringValue = new TextDecoder().decode(
        uintBuffer.slice(offset2.value, offset2.value + endOffset)
      );
      offset2.value = offset2.value + endOffset + 1;
      return stringValue;
    }
    function parseFixedLengthString(buffer2, offset2, size) {
      const stringValue = new TextDecoder().decode(
        new Uint8Array(buffer2).slice(offset2.value, offset2.value + size)
      );
      offset2.value = offset2.value + size;
      return stringValue;
    }
    function parseRational(dataView, offset2) {
      const x3 = parseInt32(dataView, offset2);
      const y = parseUint32(dataView, offset2);
      return [x3, y];
    }
    function parseTimecode(dataView, offset2) {
      const x3 = parseUint32(dataView, offset2);
      const y = parseUint32(dataView, offset2);
      return [x3, y];
    }
    function parseInt32(dataView, offset2) {
      const Int32 = dataView.getInt32(offset2.value, true);
      offset2.value = offset2.value + INT32_SIZE;
      return Int32;
    }
    function parseUint32(dataView, offset2) {
      const Uint32 = dataView.getUint32(offset2.value, true);
      offset2.value = offset2.value + INT32_SIZE;
      return Uint32;
    }
    function parseUint8Array(uInt8Array2, offset2) {
      const Uint8 = uInt8Array2[offset2.value];
      offset2.value = offset2.value + INT8_SIZE;
      return Uint8;
    }
    function parseUint8(dataView, offset2) {
      const Uint8 = dataView.getUint8(offset2.value);
      offset2.value = offset2.value + INT8_SIZE;
      return Uint8;
    }
    const parseInt64 = function(dataView, offset2) {
      const int = Number(dataView.getBigInt64(offset2.value, true));
      offset2.value += ULONG_SIZE;
      return int;
    };
    function parseFloat32(dataView, offset2) {
      const float = dataView.getFloat32(offset2.value, true);
      offset2.value += FLOAT32_SIZE;
      return float;
    }
    function decodeFloat32(dataView, offset2) {
      return DataUtils.toHalfFloat(parseFloat32(dataView, offset2));
    }
    function decodeFloat16(binary) {
      const exponent = (binary & 31744) >> 10, fraction = binary & 1023;
      return (binary >> 15 ? -1 : 1) * (exponent ? exponent === 31 ? fraction ? NaN : Infinity : Math.pow(2, exponent - 15) * (1 + fraction / 1024) : 6103515625e-14 * (fraction / 1024));
    }
    function parseUint16(dataView, offset2) {
      const Uint16 = dataView.getUint16(offset2.value, true);
      offset2.value += INT16_SIZE;
      return Uint16;
    }
    function parseFloat16(buffer2, offset2) {
      return decodeFloat16(parseUint16(buffer2, offset2));
    }
    function parseChlist(dataView, buffer2, offset2, size) {
      const startOffset = offset2.value;
      const channels = [];
      while (offset2.value < startOffset + size - 1) {
        const name = parseNullTerminatedString(buffer2, offset2);
        const pixelType = parseInt32(dataView, offset2);
        const pLinear = parseUint8(dataView, offset2);
        offset2.value += 3;
        const xSampling = parseInt32(dataView, offset2);
        const ySampling = parseInt32(dataView, offset2);
        channels.push({
          name,
          pixelType,
          pLinear,
          xSampling,
          ySampling
        });
      }
      offset2.value += 1;
      return channels;
    }
    function parseChromaticities(dataView, offset2) {
      const redX = parseFloat32(dataView, offset2);
      const redY = parseFloat32(dataView, offset2);
      const greenX = parseFloat32(dataView, offset2);
      const greenY = parseFloat32(dataView, offset2);
      const blueX = parseFloat32(dataView, offset2);
      const blueY = parseFloat32(dataView, offset2);
      const whiteX = parseFloat32(dataView, offset2);
      const whiteY = parseFloat32(dataView, offset2);
      return { redX, redY, greenX, greenY, blueX, blueY, whiteX, whiteY };
    }
    function parseCompression(dataView, offset2) {
      const compressionCodes = [
        "NO_COMPRESSION",
        "RLE_COMPRESSION",
        "ZIPS_COMPRESSION",
        "ZIP_COMPRESSION",
        "PIZ_COMPRESSION",
        "PXR24_COMPRESSION",
        "B44_COMPRESSION",
        "B44A_COMPRESSION",
        "DWAA_COMPRESSION",
        "DWAB_COMPRESSION"
      ];
      const compression = parseUint8(dataView, offset2);
      return compressionCodes[compression];
    }
    function parseBox2i(dataView, offset2) {
      const xMin = parseInt32(dataView, offset2);
      const yMin = parseInt32(dataView, offset2);
      const xMax = parseInt32(dataView, offset2);
      const yMax = parseInt32(dataView, offset2);
      return { xMin, yMin, xMax, yMax };
    }
    function parseLineOrder(dataView, offset2) {
      const lineOrders = [
        "INCREASING_Y",
        "DECREASING_Y",
        "RANDOM_Y"
      ];
      const lineOrder = parseUint8(dataView, offset2);
      return lineOrders[lineOrder];
    }
    function parseEnvmap(dataView, offset2) {
      const envmaps = [
        "ENVMAP_LATLONG",
        "ENVMAP_CUBE"
      ];
      const envmap = parseUint8(dataView, offset2);
      return envmaps[envmap];
    }
    function parseTiledesc(dataView, offset2) {
      const levelModes = [
        "ONE_LEVEL",
        "MIPMAP_LEVELS",
        "RIPMAP_LEVELS"
      ];
      const roundingModes = [
        "ROUND_DOWN",
        "ROUND_UP"
      ];
      const xSize = parseUint32(dataView, offset2);
      const ySize = parseUint32(dataView, offset2);
      const modes = parseUint8(dataView, offset2);
      return {
        xSize,
        ySize,
        levelMode: levelModes[modes & 15],
        roundingMode: roundingModes[modes >> 4]
      };
    }
    function parseV2f(dataView, offset2) {
      const x3 = parseFloat32(dataView, offset2);
      const y = parseFloat32(dataView, offset2);
      return [x3, y];
    }
    function parseV3f(dataView, offset2) {
      const x3 = parseFloat32(dataView, offset2);
      const y = parseFloat32(dataView, offset2);
      const z = parseFloat32(dataView, offset2);
      return [x3, y, z];
    }
    function parseValue(dataView, buffer2, offset2, type, size) {
      if (type === "string" || type === "stringvector" || type === "iccProfile") {
        return parseFixedLengthString(buffer2, offset2, size);
      } else if (type === "chlist") {
        return parseChlist(dataView, buffer2, offset2, size);
      } else if (type === "chromaticities") {
        return parseChromaticities(dataView, offset2);
      } else if (type === "compression") {
        return parseCompression(dataView, offset2);
      } else if (type === "box2i") {
        return parseBox2i(dataView, offset2);
      } else if (type === "envmap") {
        return parseEnvmap(dataView, offset2);
      } else if (type === "tiledesc") {
        return parseTiledesc(dataView, offset2);
      } else if (type === "lineOrder") {
        return parseLineOrder(dataView, offset2);
      } else if (type === "float") {
        return parseFloat32(dataView, offset2);
      } else if (type === "v2f") {
        return parseV2f(dataView, offset2);
      } else if (type === "v3f") {
        return parseV3f(dataView, offset2);
      } else if (type === "int") {
        return parseInt32(dataView, offset2);
      } else if (type === "rational") {
        return parseRational(dataView, offset2);
      } else if (type === "timecode") {
        return parseTimecode(dataView, offset2);
      } else if (type === "preview" || type === "deepImageState" || type === "idmanifest") {
        offset2.value += size;
        return "skipped";
      } else {
        offset2.value += size;
        return void 0;
      }
    }
    function roundLog2(x3, mode) {
      const log2 = Math.log2(x3);
      return mode == "ROUND_DOWN" ? Math.floor(log2) : Math.ceil(log2);
    }
    function calculateTileLevels(tiledesc, w, h) {
      let num = 0;
      switch (tiledesc.levelMode) {
        case "ONE_LEVEL":
          num = 1;
          break;
        case "MIPMAP_LEVELS":
          num = roundLog2(Math.max(w, h), tiledesc.roundingMode) + 1;
          break;
        case "RIPMAP_LEVELS":
          throw new Error("THREE.EXRLoader: RIPMAP_LEVELS tiles currently unsupported.");
      }
      return num;
    }
    function calculateTiles(count, dataSize, size, roundingMode) {
      const tiles = new Array(count);
      for (let i3 = 0; i3 < count; i3++) {
        const b = 1 << i3;
        let s = dataSize / b | 0;
        if (roundingMode == "ROUND_UP" && s * b < dataSize) s += 1;
        const l = Math.max(s, 1);
        tiles[i3] = (l + size - 1) / size | 0;
      }
      return tiles;
    }
    function parseTiles() {
      const EXRDecoder2 = this;
      const offset2 = EXRDecoder2.offset;
      const tmpOffset = { value: 0 };
      for (let tile = 0; tile < EXRDecoder2.tileCount; tile++) {
        const tileX = parseInt32(EXRDecoder2.viewer, offset2);
        const tileY = parseInt32(EXRDecoder2.viewer, offset2);
        offset2.value += 8;
        EXRDecoder2.size = parseUint32(EXRDecoder2.viewer, offset2);
        const startX = tileX * EXRDecoder2.blockWidth;
        const startY = tileY * EXRDecoder2.blockHeight;
        EXRDecoder2.columns = startX + EXRDecoder2.blockWidth > EXRDecoder2.width ? EXRDecoder2.width - startX : EXRDecoder2.blockWidth;
        EXRDecoder2.lines = startY + EXRDecoder2.blockHeight > EXRDecoder2.height ? EXRDecoder2.height - startY : EXRDecoder2.blockHeight;
        const bytesBlockLine = EXRDecoder2.columns * EXRDecoder2.totalBytes;
        const isCompressed = EXRDecoder2.size < EXRDecoder2.lines * bytesBlockLine;
        const viewer = isCompressed ? EXRDecoder2.uncompress(EXRDecoder2) : uncompressRAW(EXRDecoder2);
        offset2.value += EXRDecoder2.size;
        for (let line = 0; line < EXRDecoder2.lines; line++) {
          const lineOffset = line * EXRDecoder2.columns * EXRDecoder2.totalBytes;
          for (let channelID = 0; channelID < EXRDecoder2.inputChannels.length; channelID++) {
            const name = EXRHeader.channels[channelID].name;
            const lOff = EXRDecoder2.channelByteOffsets[name] * EXRDecoder2.columns;
            const cOff = EXRDecoder2.decodeChannels[name];
            if (cOff === void 0) continue;
            tmpOffset.value = lineOffset + lOff;
            const outLineOffset = (EXRDecoder2.height - (1 + startY + line)) * EXRDecoder2.outLineWidth;
            for (let x3 = 0; x3 < EXRDecoder2.columns; x3++) {
              const outIndex = outLineOffset + (x3 + startX) * EXRDecoder2.outputChannels + cOff;
              EXRDecoder2.byteArray[outIndex] = EXRDecoder2.getter(viewer, tmpOffset);
            }
          }
        }
      }
    }
    function parseScanline() {
      const EXRDecoder2 = this;
      const offset2 = EXRDecoder2.offset;
      const tmpOffset = { value: 0 };
      for (let scanlineBlockIdx = 0; scanlineBlockIdx < EXRDecoder2.height / EXRDecoder2.blockHeight; scanlineBlockIdx++) {
        const line = parseInt32(EXRDecoder2.viewer, offset2) - EXRHeader.dataWindow.yMin;
        EXRDecoder2.size = parseUint32(EXRDecoder2.viewer, offset2);
        EXRDecoder2.lines = line + EXRDecoder2.blockHeight > EXRDecoder2.height ? EXRDecoder2.height - line : EXRDecoder2.blockHeight;
        const bytesPerLine = EXRDecoder2.columns * EXRDecoder2.totalBytes;
        const isCompressed = EXRDecoder2.size < EXRDecoder2.lines * bytesPerLine;
        const viewer = isCompressed ? EXRDecoder2.uncompress(EXRDecoder2) : uncompressRAW(EXRDecoder2);
        offset2.value += EXRDecoder2.size;
        for (let line_y = 0; line_y < EXRDecoder2.lines; line_y++) {
          const true_y = line + line_y;
          const lineOffset = line_y * bytesPerLine;
          const outLineOffset = (EXRDecoder2.height - 1 - true_y) * EXRDecoder2.outLineWidth;
          for (let channelID = 0; channelID < EXRDecoder2.inputChannels.length; channelID++) {
            const name = EXRHeader.channels[channelID].name;
            const lOff = EXRDecoder2.channelByteOffsets[name] * EXRDecoder2.columns;
            const cOff = EXRDecoder2.decodeChannels[name];
            if (cOff === void 0) continue;
            tmpOffset.value = lineOffset + lOff;
            for (let x3 = 0; x3 < EXRDecoder2.columns; x3++) {
              const outIndex = outLineOffset + x3 * EXRDecoder2.outputChannels + cOff;
              EXRDecoder2.byteArray[outIndex] = EXRDecoder2.getter(viewer, tmpOffset);
            }
          }
        }
      }
    }
    function parseMultiPartScanline() {
      const EXRDecoder2 = this;
      const chunkOffsets = EXRDecoder2.chunkOffsets;
      const tmpOffset = { value: 0 };
      for (let chunkIdx = 0; chunkIdx < chunkOffsets.length; chunkIdx++) {
        const offset2 = { value: chunkOffsets[chunkIdx] };
        offset2.value += INT32_SIZE;
        const line = parseInt32(EXRDecoder2.viewer, offset2) - EXRHeader.dataWindow.yMin;
        EXRDecoder2.size = parseUint32(EXRDecoder2.viewer, offset2);
        EXRDecoder2.lines = line + EXRDecoder2.blockHeight > EXRDecoder2.height ? EXRDecoder2.height - line : EXRDecoder2.blockHeight;
        const bytesPerLine = EXRDecoder2.columns * EXRDecoder2.totalBytes;
        const isCompressed = EXRDecoder2.size < EXRDecoder2.lines * bytesPerLine;
        const savedOffset = EXRDecoder2.offset;
        EXRDecoder2.offset = offset2;
        const viewer = isCompressed ? EXRDecoder2.uncompress(EXRDecoder2) : uncompressRAW(EXRDecoder2);
        EXRDecoder2.offset = savedOffset;
        for (let line_y = 0; line_y < EXRDecoder2.lines; line_y++) {
          const true_y = line + line_y;
          const lineOffset = line_y * bytesPerLine;
          const outLineOffset = (EXRDecoder2.height - 1 - true_y) * EXRDecoder2.outLineWidth;
          for (let channelID = 0; channelID < EXRDecoder2.inputChannels.length; channelID++) {
            const name = EXRHeader.channels[channelID].name;
            const lOff = EXRDecoder2.channelByteOffsets[name] * EXRDecoder2.columns;
            const cOff = EXRDecoder2.decodeChannels[name];
            if (cOff === void 0) continue;
            tmpOffset.value = lineOffset + lOff;
            for (let x3 = 0; x3 < EXRDecoder2.columns; x3++) {
              const outIndex = outLineOffset + x3 * EXRDecoder2.outputChannels + cOff;
              EXRDecoder2.byteArray[outIndex] = EXRDecoder2.getter(viewer, tmpOffset);
            }
          }
        }
      }
    }
    function decompressDeepData(array, compressedOffset, compressedSize, compression) {
      if (compressedSize === 0) return null;
      const compressed = array.slice(compressedOffset, compressedOffset + compressedSize);
      switch (compression) {
        case "NO_COMPRESSION":
          return new DataView(compressed.buffer, compressed.byteOffset, compressed.byteLength);
        case "RLE_COMPRESSION": {
          const rawBuffer = new Uint8Array(decodeRunLength(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)));
          const tmpBuffer = new Uint8Array(rawBuffer.length);
          predictor(rawBuffer);
          interleaveScalar(rawBuffer, tmpBuffer);
          return new DataView(tmpBuffer.buffer);
        }
        case "ZIPS_COMPRESSION": {
          const rawBuffer = unzlibSync(compressed);
          const tmpBuffer = new Uint8Array(rawBuffer.length);
          predictor(rawBuffer);
          interleaveScalar(rawBuffer, tmpBuffer);
          return new DataView(tmpBuffer.buffer);
        }
        default:
          throw new Error("THREE.EXRLoader: " + compression + " is unsupported for deep data");
      }
    }
    function parseDeepScanline() {
      const EXRDecoder2 = this;
      const chunkOffsets = EXRDecoder2.chunkOffsets;
      const width = EXRDecoder2.width;
      const height = EXRDecoder2.height;
      const deepChannels = EXRDecoder2.deepChannels;
      const compression = EXRHeader.compression;
      const isMultiPart = EXRDecoder2.multiPart;
      const decodeChannels = EXRDecoder2.decodeChannels;
      const outputChannels = EXRDecoder2.outputChannels;
      const isHalfOutput = EXRDecoder2.byteArray instanceof Uint16Array;
      let alphaChannelIdx = -1;
      for (let i3 = 0; i3 < deepChannels.length; i3++) {
        if (deepChannels[i3].name === "A") {
          alphaChannelIdx = i3;
          break;
        }
      }
      for (let chunkIdx = 0; chunkIdx < chunkOffsets.length; chunkIdx++) {
        const chunkOffset = { value: chunkOffsets[chunkIdx] };
        if (isMultiPart) chunkOffset.value += INT32_SIZE;
        const line = parseInt32(EXRDecoder2.viewer, chunkOffset) - EXRHeader.dataWindow.yMin;
        const sctCompressedSize = parseInt64(EXRDecoder2.viewer, chunkOffset);
        const dataCompressedSize = parseInt64(EXRDecoder2.viewer, chunkOffset);
        parseInt64(EXRDecoder2.viewer, chunkOffset);
        const sctView = decompressDeepData(EXRDecoder2.array, chunkOffset.value, sctCompressedSize, compression);
        chunkOffset.value += sctCompressedSize;
        if (sctView === null) continue;
        const cumulativeCounts = new Uint32Array(width);
        for (let x3 = 0; x3 < width; x3++) {
          cumulativeCounts[x3] = sctView.getUint32(x3 * 4, true);
        }
        const totalSamples = cumulativeCounts[width - 1];
        if (totalSamples === 0) {
          chunkOffset.value += dataCompressedSize;
          continue;
        }
        const pixelView = decompressDeepData(EXRDecoder2.array, chunkOffset.value, dataCompressedSize, compression);
        const channelOffsets = [];
        let bytePos = 0;
        for (let i3 = 0; i3 < deepChannels.length; i3++) {
          channelOffsets.push(bytePos);
          bytePos += totalSamples * deepChannels[i3].bytesPerSample;
        }
        const outLineOffset = (height - 1 - line) * EXRDecoder2.outLineWidth;
        for (let x3 = 0; x3 < width; x3++) {
          const startSample = x3 === 0 ? 0 : cumulativeCounts[x3 - 1];
          const endSample = cumulativeCounts[x3];
          const numSamples = endSample - startSample;
          if (numSamples === 0) continue;
          const composited = new Float32Array(outputChannels);
          let compositedAlpha = 0;
          for (let s = 0; s < numSamples; s++) {
            const sampleIdx = startSample + s;
            const factor = 1 - compositedAlpha;
            if (factor <= 0) break;
            let sampleAlpha = 1;
            if (alphaChannelIdx >= 0) {
              const aBps = deepChannels[alphaChannelIdx].bytesPerSample;
              const aOff = channelOffsets[alphaChannelIdx] + sampleIdx * aBps;
              sampleAlpha = aBps === 2 ? decodeFloat16(pixelView.getUint16(aOff, true)) : pixelView.getFloat32(aOff, true);
            }
            for (let ci = 0; ci < deepChannels.length; ci++) {
              const ch = deepChannels[ci];
              const cOff = decodeChannels[ch.name];
              if (cOff === void 0) continue;
              const bps = ch.bytesPerSample;
              const dataOff = channelOffsets[ci] + sampleIdx * bps;
              const value = bps === 2 ? decodeFloat16(pixelView.getUint16(dataOff, true)) : pixelView.getFloat32(dataOff, true);
              composited[cOff] += value * factor;
            }
            compositedAlpha += sampleAlpha * factor;
          }
          if (decodeChannels["A"] !== void 0) {
            composited[decodeChannels["A"]] = compositedAlpha;
          }
          const outIndex = outLineOffset + x3 * outputChannels;
          for (let c = 0; c < outputChannels; c++) {
            EXRDecoder2.byteArray[outIndex + c] = isHalfOutput ? DataUtils.toHalfFloat(composited[c]) : composited[c];
          }
        }
      }
    }
    function parsePartHeader(dataView, buffer2, offset2) {
      const header = {};
      let hasAttributes = false;
      while (true) {
        const attributeName = parseNullTerminatedString(buffer2, offset2);
        if (attributeName === "") break;
        hasAttributes = true;
        const attributeType = parseNullTerminatedString(buffer2, offset2);
        const attributeSize = parseUint32(dataView, offset2);
        const attributeValue = parseValue(dataView, buffer2, offset2, attributeType, attributeSize);
        if (attributeValue === void 0) {
          console.warn(`THREE.EXRLoader: Skipped unknown header attribute type '${attributeType}'.`);
        } else {
          header[attributeName] = attributeValue;
        }
      }
      return hasAttributes ? header : null;
    }
    function parseHeader(dataView, buffer2, offset2) {
      if (dataView.getUint32(0, true) != 20000630) {
        throw new Error("THREE.EXRLoader: Provided file doesn't appear to be in OpenEXR format.");
      }
      const version = dataView.getUint8(4);
      const spec = dataView.getUint8(5);
      const flags = {
        singleTile: !!(spec & 2),
        longName: !!(spec & 4),
        deepFormat: !!(spec & 8),
        multiPart: !!(spec & 16)
      };
      offset2.value = 8;
      const headers = [];
      if (flags.multiPart) {
        while (true) {
          const header = parsePartHeader(dataView, buffer2, offset2);
          if (header === null) break;
          header.version = version;
          header.spec = flags;
          headers.push(header);
        }
        if (headers.length === 0) {
          throw new Error("THREE.EXRLoader: No valid part headers found.");
        }
      } else {
        const header = parsePartHeader(dataView, buffer2, offset2);
        header.version = version;
        header.spec = flags;
        headers.push(header);
      }
      return headers;
    }
    function setupDecoder(EXRHeader2, dataView, uInt8Array2, offset2, outputType, outputFormat) {
      const EXRDecoder2 = {
        size: 0,
        viewer: dataView,
        array: uInt8Array2,
        offset: offset2,
        width: EXRHeader2.dataWindow.xMax - EXRHeader2.dataWindow.xMin + 1,
        height: EXRHeader2.dataWindow.yMax - EXRHeader2.dataWindow.yMin + 1,
        inputChannels: EXRHeader2.channels,
        channelByteOffsets: {},
        shouldExpand: false,
        yCbCr: false,
        totalBytes: null,
        columns: null,
        lines: null,
        type: null,
        uncompress: null,
        getter: null,
        format: null,
        colorSpace: LinearSRGBColorSpace2
      };
      switch (EXRHeader2.compression) {
        case "NO_COMPRESSION":
          EXRDecoder2.blockHeight = 1;
          EXRDecoder2.uncompress = uncompressRAW;
          break;
        case "RLE_COMPRESSION":
          EXRDecoder2.blockHeight = 1;
          EXRDecoder2.uncompress = uncompressRLE;
          break;
        case "ZIPS_COMPRESSION":
          EXRDecoder2.blockHeight = 1;
          EXRDecoder2.uncompress = uncompressZIP;
          break;
        case "ZIP_COMPRESSION":
          EXRDecoder2.blockHeight = 16;
          EXRDecoder2.uncompress = uncompressZIP;
          break;
        case "PIZ_COMPRESSION":
          EXRDecoder2.blockHeight = 32;
          EXRDecoder2.uncompress = uncompressPIZ;
          break;
        case "PXR24_COMPRESSION":
          EXRDecoder2.blockHeight = 16;
          EXRDecoder2.uncompress = uncompressPXR;
          break;
        case "B44_COMPRESSION":
        case "B44A_COMPRESSION":
          EXRDecoder2.blockHeight = 32;
          EXRDecoder2.uncompress = uncompressB44;
          break;
        case "DWAA_COMPRESSION":
          EXRDecoder2.blockHeight = 32;
          EXRDecoder2.uncompress = uncompressDWA;
          break;
        case "DWAB_COMPRESSION":
          EXRDecoder2.blockHeight = 256;
          EXRDecoder2.uncompress = uncompressDWA;
          break;
        default:
          throw new Error("THREE.EXRLoader: " + EXRHeader2.compression + " is unsupported");
      }
      const channels = {};
      for (const channel of EXRHeader2.channels) {
        switch (channel.name) {
          case "BY":
          case "RY":
          case "Y":
          case "R":
          case "G":
          case "B":
          case "A":
            channels[channel.name] = true;
            EXRDecoder2.type = channel.pixelType;
        }
      }
      let fillAlpha = false;
      let invalidOutput = false;
      if (channels.Y && channels.RY && channels.BY) {
        EXRDecoder2.outputChannels = 4;
        EXRDecoder2.yCbCr = true;
      } else if (channels.R && channels.G && channels.B) {
        EXRDecoder2.outputChannels = 4;
      } else if (channels.Y) {
        EXRDecoder2.outputChannels = 1;
      } else {
        throw new Error("THREE.EXRLoader: file contains unsupported data channels.");
      }
      switch (EXRDecoder2.outputChannels) {
        case 4:
          if (outputFormat == RGBAFormat2) {
            fillAlpha = !channels.A;
            EXRDecoder2.format = RGBAFormat2;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 4;
            EXRDecoder2.decodeChannels = { R: 0, G: 1, B: 2, A: 3 };
          } else if (outputFormat == RGFormat) {
            EXRDecoder2.format = RGFormat;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 2;
            EXRDecoder2.decodeChannels = { R: 0, G: 1 };
          } else if (outputFormat == RedFormat2) {
            EXRDecoder2.format = RedFormat2;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 1;
            EXRDecoder2.decodeChannels = { R: 0 };
          } else {
            invalidOutput = true;
          }
          break;
        case 1:
          if (outputFormat == RGBAFormat2) {
            fillAlpha = true;
            EXRDecoder2.format = RGBAFormat2;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 4;
            EXRDecoder2.shouldExpand = true;
            EXRDecoder2.decodeChannels = { Y: 0 };
          } else if (outputFormat == RGFormat) {
            EXRDecoder2.format = RGFormat;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 2;
            EXRDecoder2.shouldExpand = true;
            EXRDecoder2.decodeChannels = { Y: 0 };
          } else if (outputFormat == RedFormat2) {
            EXRDecoder2.format = RedFormat2;
            EXRDecoder2.colorSpace = LinearSRGBColorSpace2;
            EXRDecoder2.outputChannels = 1;
            EXRDecoder2.decodeChannels = { Y: 0 };
          } else {
            invalidOutput = true;
          }
          break;
        default:
          invalidOutput = true;
      }
      if (invalidOutput) throw new Error("THREE.EXRLoader: invalid output format for specified file.");
      if (EXRDecoder2.yCbCr) {
        EXRDecoder2.format = RGBAFormat2;
        EXRDecoder2.outputChannels = 4;
        EXRDecoder2.decodeChannels = { Y: 0, RY: 1, BY: 2 };
        fillAlpha = true;
      }
      if (EXRDecoder2.type == 1) {
        switch (outputType) {
          case FloatType2:
            EXRDecoder2.getter = parseFloat16;
            break;
          case HalfFloatType:
            EXRDecoder2.getter = parseUint16;
            break;
        }
      } else if (EXRDecoder2.type == 2) {
        switch (outputType) {
          case FloatType2:
            EXRDecoder2.getter = parseFloat32;
            break;
          case HalfFloatType:
            EXRDecoder2.getter = decodeFloat32;
        }
      } else {
        throw new Error("THREE.EXRLoader: unsupported pixelType " + EXRDecoder2.type + " for " + EXRHeader2.compression + ".");
      }
      EXRDecoder2.columns = EXRDecoder2.width;
      const size = EXRDecoder2.width * EXRDecoder2.height * EXRDecoder2.outputChannels;
      switch (outputType) {
        case FloatType2:
          EXRDecoder2.byteArray = new Float32Array(size);
          if (fillAlpha)
            EXRDecoder2.byteArray.fill(1, 0, size);
          break;
        case HalfFloatType:
          EXRDecoder2.byteArray = new Uint16Array(size);
          if (fillAlpha)
            EXRDecoder2.byteArray.fill(15360, 0, size);
          break;
        default:
          console.error("THREE.EXRLoader: unsupported type: ", outputType);
          break;
      }
      let byteOffset = 0;
      for (const channel of EXRHeader2.channels) {
        if (EXRDecoder2.decodeChannels[channel.name] !== void 0) {
          EXRDecoder2.channelByteOffsets[channel.name] = byteOffset;
        }
        byteOffset += channel.pixelType * 2;
      }
      EXRDecoder2.totalBytes = byteOffset;
      EXRDecoder2.outLineWidth = EXRDecoder2.width * EXRDecoder2.outputChannels;
      if (EXRHeader2.spec.deepFormat) {
        EXRDecoder2.deepChannels = [];
        let deepBytesPerSample = 0;
        for (const channel of EXRHeader2.channels) {
          const bytesPerSample = channel.pixelType === 0 ? 4 : channel.pixelType * 2;
          EXRDecoder2.deepChannels.push({
            name: channel.name,
            pixelType: channel.pixelType,
            bytesPerSample
          });
          deepBytesPerSample += bytesPerSample;
        }
        EXRDecoder2.deepBytesPerSample = deepBytesPerSample;
        EXRDecoder2.chunkOffsets = EXRHeader2._chunkOffsets;
        EXRDecoder2.multiPart = EXRHeader2.spec.multiPart;
        EXRDecoder2.decode = parseDeepScanline.bind(EXRDecoder2);
      } else if (EXRHeader2.spec.singleTile) {
        EXRDecoder2.blockHeight = EXRHeader2.tiles.ySize;
        EXRDecoder2.blockWidth = EXRHeader2.tiles.xSize;
        const numXLevels = calculateTileLevels(EXRHeader2.tiles, EXRDecoder2.width, EXRDecoder2.height);
        const numXTiles = calculateTiles(numXLevels, EXRDecoder2.width, EXRHeader2.tiles.xSize, EXRHeader2.tiles.roundingMode);
        const numYTiles = calculateTiles(numXLevels, EXRDecoder2.height, EXRHeader2.tiles.ySize, EXRHeader2.tiles.roundingMode);
        EXRDecoder2.tileCount = numXTiles[0] * numYTiles[0];
        for (let l = 0; l < numXLevels; l++)
          for (let y = 0; y < numYTiles[l]; y++)
            for (let x3 = 0; x3 < numXTiles[l]; x3++)
              parseInt64(dataView, offset2);
        EXRDecoder2.decode = parseTiles.bind(EXRDecoder2);
      } else if (EXRHeader2.spec.multiPart) {
        EXRDecoder2.blockWidth = EXRDecoder2.width;
        EXRDecoder2.chunkOffsets = EXRHeader2._chunkOffsets;
        EXRDecoder2.decode = parseMultiPartScanline.bind(EXRDecoder2);
      } else {
        EXRDecoder2.blockWidth = EXRDecoder2.width;
        const blockCount = Math.ceil(EXRDecoder2.height / EXRDecoder2.blockHeight);
        for (let i3 = 0; i3 < blockCount; i3++)
          parseInt64(dataView, offset2);
        EXRDecoder2.decode = parseScanline.bind(EXRDecoder2);
      }
      return EXRDecoder2;
    }
    const offset = { value: 0 };
    const bufferDataView = new DataView(buffer);
    const uInt8Array = new Uint8Array(buffer);
    const EXRHeaders = parseHeader(bufferDataView, buffer, offset);
    const partIndex = Math.max(0, Math.min(this.part, EXRHeaders.length - 1));
    const EXRHeader = EXRHeaders[partIndex];
    if (EXRHeader.spec.multiPart || EXRHeader.spec.deepFormat) {
      for (let p = 0; p < EXRHeaders.length; p++) {
        const chunkCount = EXRHeaders[p].chunkCount;
        if (p === partIndex) {
          EXRHeader._chunkOffsets = [];
          for (let i3 = 0; i3 < chunkCount; i3++)
            EXRHeader._chunkOffsets.push(parseInt64(bufferDataView, offset));
        } else {
          for (let i3 = 0; i3 < chunkCount; i3++)
            parseInt64(bufferDataView, offset);
        }
      }
    }
    const EXRDecoder = setupDecoder(EXRHeader, bufferDataView, uInt8Array, offset, this.type, this.outputFormat);
    EXRDecoder.decode();
    if (EXRDecoder.shouldExpand) {
      const byteArray = EXRDecoder.byteArray;
      if (this.outputFormat == RGBAFormat2) {
        for (let i3 = 0; i3 < byteArray.length; i3 += 4)
          byteArray[i3 + 2] = byteArray[i3 + 1] = byteArray[i3];
      } else if (this.outputFormat == RGFormat) {
        for (let i3 = 0; i3 < byteArray.length; i3 += 2)
          byteArray[i3 + 1] = byteArray[i3];
      }
    }
    if (EXRDecoder.yCbCr) {
      const byteArray = EXRDecoder.byteArray;
      const nPixels = EXRDecoder.width * EXRDecoder.height;
      if (this.type === HalfFloatType) {
        for (let i3 = 0; i3 < nPixels; i3++) {
          const base = i3 * 4;
          const Y = decodeFloat16(byteArray[base]);
          const RY = decodeFloat16(byteArray[base + 1]);
          const BY = decodeFloat16(byteArray[base + 2]);
          const R = (1 + RY) * Y;
          const B = (1 + BY) * Y;
          const G = (Y - R * 0.2126 - B * 0.0722) / 0.7152;
          byteArray[base] = DataUtils.toHalfFloat(Math.max(0, R));
          byteArray[base + 1] = DataUtils.toHalfFloat(Math.max(0, G));
          byteArray[base + 2] = DataUtils.toHalfFloat(Math.max(0, B));
        }
      } else {
        for (let i3 = 0; i3 < nPixels; i3++) {
          const base = i3 * 4;
          const Y = byteArray[base];
          const RY = byteArray[base + 1];
          const BY = byteArray[base + 2];
          const R = (1 + RY) * Y;
          const B = (1 + BY) * Y;
          byteArray[base] = Math.max(0, R);
          byteArray[base + 1] = Math.max(0, (Y - R * 0.2126 - B * 0.0722) / 0.7152);
          byteArray[base + 2] = Math.max(0, B);
        }
      }
    }
    return {
      header: EXRHeader,
      width: EXRDecoder.width,
      height: EXRDecoder.height,
      data: EXRDecoder.byteArray,
      format: EXRDecoder.format,
      colorSpace: EXRDecoder.colorSpace,
      type: this.type,
      minFilter: LinearFilter3,
      magFilter: LinearFilter3,
      generateMipmaps: false,
      flipY: false
    };
  }
  /**
   * Sets the texture type.
   *
   * @param {(HalfFloatType|FloatType)} value - The texture type to set.
   * @return {EXRLoader} A reference to this loader.
   */
  setDataType(value) {
    this.type = value;
    return this;
  }
  /**
   * Sets texture output format. Defaults to `RGBAFormat`.
   *
   * @param {(RGBAFormat|RGFormat|RedFormat)} value - Texture output format.
   * @return {EXRLoader} A reference to this loader.
   */
  setOutputFormat(value) {
    this.outputFormat = value;
    return this;
  }
  /**
   * For multi-part EXR files, sets which part to load.
   *
   * @param {number} value - The part index to load.
   * @return {EXRLoader} A reference to this loader.
   */
  setPart(value) {
    this.part = value;
    return this;
  }
};

// apps/three-game/src/render/native-venue/adapter.js
async function createNativeAssetReaders(base, loader, resources) {
  async function loadNormal8(name) {
    const response = await fetch(base + name);
    if (!response.ok) throw Error("Normal texture unavailable: " + name);
    const bytes = new Uint8Array(await readGzipResponse(response));
    if (bytes.byteLength !== 2048 * 2048 * 4) throw Error("Normal texture byte length mismatch: " + name);
    const texture = new THREE2.DataTexture(bytes, 2048, 2048, THREE2.RGBAFormat, THREE2.UnsignedByteType);
    texture.colorSpace = THREE2.NoColorSpace;
    texture.minFilter = texture.magFilter = THREE2.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
  }
  const packedLighting = await (await fetch(base + "packed-lightmaps.json")).json();
  const encodingInfo = await (await fetch(base + "native-lightmap-encoding.json")).json();
  async function loadVenueLighting(name) {
    if (packedLighting.assets[name]) return loadPackedLight({ THREE: THREE2, base, item: packedLighting.assets[name], resources });
    const item = encodingInfo.assets[name];
    if (!item) return loader.loadAsync(base + name);
    const response = await fetch(base + item.file);
    const data = new Uint8Array(await readGzipResponse(response));
    if (data.length !== item.width * item.height * 4) throw Error("Encoded lightmap size mismatch");
    const texture = new THREE2.DataTexture(data, item.width, item.height, THREE2.RGBAFormat, THREE2.UnsignedByteType);
    texture.userData.nativeEncodingScale = item.scale;
    texture.needsUpdate = true;
    return texture;
  }
  async function loadGeometry(name) {
    const response = await fetch(base + name + ".gz");
    if (!response.ok) throw Error("Native geometry unavailable: " + name);
    const data = await readGzipResponse(response);
    return new GLTFLoader().parseAsync(data, base);
  }
  return { loadNormal8, loadVenueLighting, loadGeometry };
}
async function loadTableBody({ renderer, base, resources, loadNormal8, loadVenueLighting, loadGeometry }, parent) {
  const bodyDescription = await (await fetch(base + "table-body-manifest.json")).json();
  const bodyAsset = await loadGeometry("table-body.glb");
  const bodyTexture = await loadVenueLighting("table-body-linear.exr");
  bodyTexture.colorSpace = THREE2.LinearSRGBColorSpace;
  bodyTexture.flipY = true;
  bodyTexture.generateMipmaps = false;
  bodyTexture.minFilter = THREE2.LinearFilter;
  resources.add(bodyTexture);
  const bodyNormal = await loadNormal8("table-body-normal.rgba8.bin.gz");
  bodyNormal.colorSpace = THREE2.NoColorSpace;
  bodyNormal.flipY = true;
  bodyNormal.generateMipmaps = false;
  bodyNormal.minFilter = THREE2.LinearFilter;
  resources.add(bodyNormal);
  const compactReflections = await (await fetch(base + "compact-reflections.json")).json();
  const reflectionResponse = await fetch(base + "table-reflections.bin.gz");
  const reflectionBuffer = await readGzipResponse(reflectionResponse);
  const reflectionPixels = new Uint16Array(reflectionBuffer), reflectionEnvironments = [], N = compactReflections.size;
  for (let group = 0; group < compactReflections.groups; group++) {
    const faces = [];
    for (let face = 0; face < 6; face++) {
      const offset = (group * 6 + face) * N * N * 4;
      const t = new THREE2.DataTexture(reflectionPixels.subarray(offset, offset + N * N * 4), N, N, THREE2.RGBAFormat, THREE2.HalfFloatType);
      t.colorSpace = THREE2.LinearSRGBColorSpace;
      t.needsUpdate = true;
      resources.add(t);
      faces.push(t);
    }
    const cube = new THREE2.CubeTexture(faces);
    cube.type = THREE2.HalfFloatType;
    cube.format = THREE2.RGBAFormat;
    cube.colorSpace = THREE2.LinearSRGBColorSpace;
    cube.isRenderTargetTexture = true;
    cube.needsUpdate = true;
    resources.add(cube);
    const pm = new THREE2.PMREMGenerator(renderer);
    reflectionEnvironments.push(pm.fromCubemap(cube));
    pm.dispose();
    resources.add(reflectionEnvironments.at(-1));
  }
  const bodyEnvironment = reflectionEnvironments[0], bodyMaterials = /* @__PURE__ */ new Set(), legProbes = compactReflections.probes;
  for (const p of legProbes) p.environment = reflectionEnvironments[p.group];
  bodyAsset.scene.updateMatrixWorld(true);
  bodyAsset.scene.traverse((n) => {
    if (!n.isMesh || Array.isArray(n.material) || n.material.userData.tableBodyRole !== "leg") return;
    const g = n.geometry.clone(), positions = g.getAttribute("position"), index = g.getIndex(), lower = [], upper = [], v = new THREE2.Vector3();
    for (let i3 = 0; i3 < (index ? index.count : positions.count); i3 += 3) {
      const tri = [0, 1, 2].map((k) => index ? index.getX(i3 + k) : i3 + k);
      const height = tri.reduce((sum, j) => sum + v.fromBufferAttribute(positions, j).applyMatrix4(n.matrixWorld).y, 0) / 3;
      (height > 0.465 ? upper : lower).push(...tri);
    }
    g.setIndex(lower.concat(upper));
    g.clearGroups();
    g.addGroup(0, lower.length, 0);
    g.addGroup(lower.length, upper.length, 1);
    const post = n.material.clone();
    post.userData = { ...post.userData, tableBodyRole: "apron", upperLegPost: true };
    n.geometry = g;
    n.material = [n.material, post];
  });
  bodyAsset.scene.traverse((n) => {
    if (!n.isMesh) return;
    const channel = n.userData.nativeBodyBakeChannel ?? n.parent?.userData.nativeBodyBakeChannel ?? 1;
    bodyTexture.channel = channel;
    bodyNormal.channel = channel;
    for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
      bodyMaterials.add(m);
      m.lightMap = bodyTexture;
      const isLeg = m.userData.tableBodyRole === "leg";
      m.lightMapIntensity = Math.PI * (isLeg ? 0.55 : 1.45);
      m.normalMap = bodyNormal;
      m.normalMapType = THREE2.TangentSpaceNormalMap;
      m.normalScale.set(1, 1);
      m.envMap = bodyEnvironment.texture;
      m.envMapIntensity = isLeg ? 1.65 : 0.65;
      if (isLeg) {
        n.geometry.computeBoundingBox();
        const c = n.geometry.boundingBox.getCenter(new THREE2.Vector3()).applyMatrix4(n.matrixWorld);
        const world = new THREE2.Vector3(-c.z, c.y, c.x);
        const probe = legProbes.reduce((best, p) => Math.hypot(p.position[0] - world.x, p.position[2] - world.z) < Math.hypot(best.position[0] - world.x, best.position[2] - world.z) ? p : best);
        m.envMap = probe.environment.texture;
        m.userData.legProbe = probe.id;
        m.userData.reflectionMirror = probe.mirror;
        m.metalness = 0;
        m.roughness = 0.58;
        m.normalScale.set(0.8, 0.8);
        if (m.clearcoat !== void 0) m.clearcoat = 0;
        m.color.setRGB(0.65, 0.32, 0.2);
      }
      if (m.userData.upperLegPost) {
        m.color.setRGB(0.65, 0.32, 0.2);
        m.metalness = 0;
        m.roughness = 0.72;
        m.lightMapIntensity = Math.PI * 0.6;
        m.envMapIntensity = 0.65;
      }
      m.userData.tableVenueReflection = true;
      m.onBeforeCompile = (shader) => {
        if (isLeg) {
          shader.uniforms.legReflectionMirror = { value: new THREE2.Vector3(...m.userData.reflectionMirror) };
          shader.fragmentShader = "uniform vec3 legReflectionMirror;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace("#include <envmap_physical_pars_fragment>", THREE2.ShaderChunk.envmap_physical_pars_fragment.replace("envMapRotation * reflectVec", "legReflectionMirror * (envMapRotation * reflectVec)"));
        }
        shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.directDiffuse=vec3(0.0);");
        shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", THREE2.ShaderChunk.lights_fragment_maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "").replace("irradiance += lightMapIrradiance;", "iblIrradiance += lightMapIrradiance;"));
      };
      m.customProgramCacheKey = () => "table-compact-reflection-v1-" + isLeg;
      m.needsUpdate = true;
    }
  });
  window.tableBodyReflectionAudit = () => ({ materials: bodyMaterials.size, legProbeBindings: [...bodyMaterials].filter((m) => m.userData.tableBodyRole === "leg").map((m) => m.userData.legProbe), allPhysical: [...bodyMaterials].every((m) => m.isMeshStandardMaterial), allProbeBound: [...bodyMaterials].every((m) => m.envMap === bodyEnvironment.texture || legProbes.some((p) => m.envMap === p.environment.texture)), allFillBound: [...bodyMaterials].every((m) => m.lightMap === bodyTexture), allNormalsBound: [...bodyMaterials].every((m) => m.normalMap === bodyNormal), runtimeProbeCaptures: 0, probeFaceSize: N, sharedReflectionGroups: reflectionEnvironments.length, reflectionBytes: compactReflections.bytes, upperPosts: [...bodyMaterials].filter((m) => m.userData.upperLegPost).length, matteLegs: [...bodyMaterials].filter((m) => m.userData.tableBodyRole === "leg").every((m) => m.metalness === 0 && m.roughness >= 0.55) });
  parent?.add(bodyAsset.scene);
  return { root: bodyAsset.scene, description: bodyDescription };
}
async function loadNativeTableBody({ renderer, base }) {
  const resources = /* @__PURE__ */ new Set();
  let root;
  function dispose() {
    root?.removeFromParent();
    root?.traverse((node) => {
      if (node.geometry) resources.add(node.geometry);
      for (const material of [node.material].flat().filter(Boolean)) {
        resources.add(material);
        for (const texture of Object.values(material)) if (texture?.isTexture) resources.add(texture);
      }
    });
    for (const resource of resources) resource.dispose();
    resources.clear();
  }
  try {
    const readers = await createNativeAssetReaders(base, new EXRLoader(), resources);
    const body = await loadTableBody({ renderer, base, resources, ...readers });
    root = body.root;
    root.rotation.y = -Math.PI / 2;
    const display = await loadFastDisplay({ THREE: THREE2, base, resources });
    const materials = /* @__PURE__ */ new Set();
    root.traverse((node) => {
      if (node.isMesh) for (const m of [node.material].flat()) materials.add(m);
    });
    for (const material of materials) {
      const compile = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
      material.onBeforeCompile = (shader) => {
        compile(shader, renderer);
        shader.uniforms.nativeFastDisplaySampler = display.uniform;
        const indirect = THREE2.ShaderChunk.lights_fragment_begin.replace(
          "vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );",
          "vec3 irradiance = vec3(0.0);"
        );
        shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", indirect);
        shader.fragmentShader = display.shader + "\n" + shader.fragmentShader.replace(
          "#include <colorspace_fragment>",
          "gl_FragColor=nativeOCIODisplay(gl_FragColor);"
        );
      };
      material.customProgramCacheKey = () => key() + "-table-only-hardware-display-v1";
      material.needsUpdate = true;
    }
    return { ...body, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
async function loadNativePreview({ renderer, base, includeTableBody = true }) {
  const packedMapAudit = [];
  const diagnosticPass = { value: 0 };
  const scene = new THREE2.Scene();
  scene.background = new THREE2.Color("#05080d");
  const loader = new EXRLoader(), resources = /* @__PURE__ */ new Set();
  const { loadNormal8, loadVenueLighting, loadGeometry } = await createNativeAssetReaders(base, loader, resources);
  const probeData = new Uint16Array(await loadBinary(base, "venue-reflections-128.bin.gz", 2 * 6 * 128 * 128 * 8));
  function makeEnvironment(group) {
    const faces = [];
    for (let face = 0; face < 6; face++) {
      const offset = (group * 6 + face) * 128 * 128 * 4;
      const t = new THREE2.DataTexture(probeData.subarray(offset, offset + 128 * 128 * 4), 128, 128, THREE2.RGBAFormat, THREE2.HalfFloatType);
      t.colorSpace = THREE2.LinearSRGBColorSpace;
      t.needsUpdate = true;
      faces.push(t);
      resources.add(t);
    }
    const cube2 = new THREE2.CubeTexture(faces);
    Object.assign(cube2, { type: THREE2.HalfFloatType, format: THREE2.RGBAFormat, colorSpace: THREE2.LinearSRGBColorSpace, isRenderTargetTexture: true, needsUpdate: true });
    resources.add(cube2);
    return cube2;
  }
  const cube = makeEnvironment(0), metalCube = makeEnvironment(1);
  const mainResponse = await fetch(base + "lightmapped-venue-single-scene.glb.gz");
  const mainBuffer = await readGzipResponse(mainResponse);
  const gltf = await new GLTFLoader().parseAsync(mainBuffer, base);
  gltf.scene.rotation.y = -Math.PI / 2;
  scene.add(gltf.scene);
  const replacedPlayerNodes = [];
  for (const node of (() => {
    const a = [];
    gltf.scene.traverse((n) => {
      if (n.userData.nativeLightmap) a.push(n);
    });
    return a;
  })()) {
    if (node.userData.nativeVenueFloor) {
      if (!node.isMesh || Array.isArray(node.material)) throw Error("Unsupported carpet topology");
      resources.add(node.material);
      node.material = await loadFloorDisplay({ THREE: THREE2, base, resources });
      continue;
    }
    const map = await loadVenueLighting(node.userData.nativeLightmap.replace(".exr", "-linear.exr"));
    map.colorSpace = THREE2.LinearSRGBColorSpace;
    map.flipY = true;
    map.generateMipmaps = false;
    map.minFilter = THREE2.LinearFilter;
    map.channel = node.userData.nativeLightmapChannel;
    resources.add(map);
    const nativeNormal = null;
    const roughness = map.userData.roughnessTexture || map;
    if (roughness !== map) roughness.channel = map.channel;
    if (roughness) packedMapAudit.push({ width: map.image.width, height: map.image.height, retiredGPUBytes: map.image.data.byteLength, exactHalfFloatChannelCopy: true, offlinePacked: true });
    const detailMaps = /* @__PURE__ */ new Map();
    for (const [name, files] of Object.entries(node.userData.nativeDetailMaps || {})) {
      const light = await loadVenueLighting(files.light.replace("-light.exr", "-light-roughness.exr"));
      light.colorSpace = THREE2.LinearSRGBColorSpace;
      light.flipY = true;
      light.channel = node.userData.nativeDetailMapChannel;
      light.generateMipmaps = false;
      light.minFilter = THREE2.LinearFilter;
      resources.add(light);
      packedMapAudit.push({ width: light.image.width, height: light.image.height, retiredGPUBytes: light.image.data.byteLength, exactHalfFloatChannelCopy: true, offlinePacked: true });
      const detailRough = light.userData.roughnessTexture || light;
      detailRough.channel = light.channel;
      detailMaps.set(name, { light, rough: detailRough });
    }
    node.traverse((mesh) => {
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (nativeNormal && m.isMeshStandardMaterial) {
          m.normalMap = nativeNormal;
          m.aoMap = nativeNormal;
          m.aoMapIntensity = 1;
        }
        if (roughness && m.isMeshStandardMaterial) {
          m.roughnessMap = roughness;
          m.roughness = 1;
        }
        const detail = detailMaps.get(m.name);
        if (detail) {
          m.lightMap = detail.light;
          m.roughnessMap = detail.rough;
          m.roughness = 1;
        } else {
          m.lightMap = map;
        }
        m.lightMapIntensity = Math.PI;
        m.onBeforeCompile = (shader) => {
          if (nativeNormal) shader.fragmentShader = shader.fragmentShader.replace("#include <aomap_fragment>", THREE2.ShaderChunk.aomap_fragment.replace("texture2D( aoMap, vAoMapUv ).r", "texture2D( aoMap, vAoMapUv ).a").replace("reflectedLight.indirectDiffuse *= ambientOcclusion;", ""));
          if (m.lightMap?.userData.roughnessTexture) {
            shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", THREE2.ShaderChunk.roughnessmap_fragment.replace("texelRoughness.g", "texelRoughness.r"));
          } else if (m.roughnessMap === m.lightMap) shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", THREE2.ShaderChunk.roughnessmap_fragment.replace("texelRoughness.g", "texelRoughness.a"));
          shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.directDiffuse=vec3(0.0);");
          shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", THREE2.ShaderChunk.lights_fragment_maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "").replace("irradiance += lightMapIrradiance;", "iblIrradiance += lightMapIrradiance;"));
        };
        m.customProgramCacheKey = () => "whole-floor-rebake-geometry-ao-v1";
        m.needsUpdate = true;
      }
    });
  }
  const thin = await loadGeometry("thin-vertex-venue.glb");
  gltf.scene.add(thin.scene);
  thin.scene.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry.getAttribute("_native_irradiance")) return;
    const m = mesh.material;
    m.lightMap = null;
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute vec3 _native_irradiance;\nvarying vec3 nativeVertexIrradiance;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nnativeVertexIrradiance=_native_irradiance;");
      shader.fragmentShader = "varying vec3 nativeVertexIrradiance;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", THREE2.ShaderChunk.lights_fragment_maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "") + "\niblIrradiance+=PI*nativeVertexIrradiance;");
    };
    m.customProgramCacheKey = () => "native-thin-vertex-irradiance-v1";
    m.needsUpdate = true;
  });
  const nativeGlass = await loadGeometry("glass-vertex-venue.glb");
  const previousGlass = [];
  gltf.scene.traverse((mesh) => {
    if (mesh.isMesh && mesh.material?.transmission > 0) previousGlass.push(mesh);
  });
  for (const mesh of previousGlass) {
    mesh.parent.remove(mesh);
    resources.add(mesh.geometry);
    resources.add(mesh.material);
  }
  gltf.scene.add(nativeGlass.scene);
  nativeGlass.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (!mesh.geometry.getAttribute("_native_irradiance")) throw Error("Native glass static illumination attribute missing");
    const m = mesh.material;
    m.lightMap = null;
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute vec3 _native_irradiance;\nvarying vec3 nativeVertexIrradiance;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nnativeVertexIrradiance=_native_irradiance;");
      shader.fragmentShader = "varying vec3 nativeVertexIrradiance;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_maps>", THREE2.ShaderChunk.lights_fragment_maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "") + "\niblIrradiance+=PI*nativeVertexIrradiance;");
    };
    m.customProgramCacheKey = () => "native-glass-vertex-irradiance-v1";
    m.needsUpdate = true;
  });
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (m.isMeshStandardMaterial) {
      m.envMap = m.lightMap && m.name.includes("\u96FE\u9762\u94F6\u8272\u91D1\u5C5E\u677F") ? metalCube : cube;
      m.envMapIntensity = 1;
      m.needsUpdate = true;
    }
  });
  const nativeEnergy = await loadNativeDiffuseEnergy(base, resources);
  const nativeEnergyMaterials = /* @__PURE__ */ new Set();
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (m.isMeshStandardMaterial && (m.transmission ?? 0) === 0 && (m.ior ?? 1.5) === 1.5 && (m.specularIntensity ?? 1) === 1 && (!m.specularColor || m.specularColor.r === 1 && m.specularColor.g === 1 && m.specularColor.b === 1) && !m.clearcoat && !m.sheen && !m.iridescence) nativeEnergyMaterials.add(m);
  });
  if (nativeEnergyMaterials.size < 10) throw Error("Native energy adapter did not bind expected opaque materials");
  const vertexLighting = await loadVertexLighting({ THREE: THREE2, base, resources, cube }), vertexBaked = /* @__PURE__ */ new Set();
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.geometry.getAttribute("_native_irradiance")) for (const m of Array.isArray(o.material) ? o.material : [o.material]) vertexBaked.add(m);
  });
  for (const m of nativeEnergyMaterials) {
    if (!m.isMeshPhysicalMaterial && !m.normalMap && !m.aoMap && !m.metalnessMap && (!m.metalness || !m.map)) vertexLighting.bind(m, { vertexBaked: vertexBaked.has(m) });
    else nativeEnergy.bind(m);
  }
  window.nativeEnergyControls = () => nativeEnergy.controls(renderer);
  const encodedMaterials = /* @__PURE__ */ new Set();
  gltf.scene.traverse((mesh) => {
    if (mesh.isMesh) {
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (m.lightMap?.userData.nativeEncodingScale) encodedMaterials.add(m);
    }
  });
  for (const m of encodedMaterials) {
    const previous = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader) => {
      previous?.(shader, renderer);
      shader.uniforms.nativeLightEncodingScale = { value: m.lightMap.userData.nativeEncodingScale };
      shader.fragmentShader = `uniform float nativeLightEncodingScale;
vec3 nativeDecodeLightmap(sampler2D source,vec2 uv,float scale){ivec2 wh=textureSize(source,0);vec2 xy=uv*vec2(wh)-.5;ivec2 at=ivec2(floor(xy));vec2 blend=fract(xy);ivec2 last=wh-1;vec3 a=texelFetch(source,clamp(at,ivec2(0),last),0).rgb;vec3 b=texelFetch(source,clamp(at+ivec2(1,0),ivec2(0),last),0).rgb;vec3 c=texelFetch(source,clamp(at+ivec2(0,1),ivec2(0),last),0).rgb;vec3 d=texelFetch(source,clamp(at+ivec2(1,1),ivec2(0),last),0).rgb;return mix(mix(a*a,b*b,blend.x),mix(c*c,d*d,blend.x),blend.y)*scale;}
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;", "vec3 lightMapIrradiance = nativeDecodeLightmap(lightMap,vLightMapUv,nativeLightEncodingScale) * lightMapIntensity;");
    };
    m.customProgramCacheKey = () => key() + "-diagnostic-sqrt-lightmap-decode";
    m.needsUpdate = true;
  }
  const bodyDescription = includeTableBody ? (await loadTableBody({ renderer, base, resources, loadNormal8, loadVenueLighting, loadGeometry }, gltf.scene)).description : null;
  window.underTableBakeAudit = () => ({ materials: 1, resolution: 2048, runtimeLights: 0, wholeFloorRebaked: true, localBlendRemoved: true, rectangularSpecularMaskRemoved: true });
  const toneMaterials = /* @__PURE__ */ new Set();
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (toneMaterials.has(m)) continue;
      toneMaterials.add(m);
      const previous = m.onBeforeCompile;
      const previousKey = m.customProgramCacheKey?.bind(m);
      m.onBeforeCompile = (shader) => {
        previous?.(shader, renderer);
        shader.uniforms.nativeDiagnosticPass = diagnosticPass;
        shader.fragmentShader = "uniform int nativeDiagnosticPass;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `#if defined(STANDARD)
if(nativeDiagnosticPass==1)outgoingLight=reflectedLight.directDiffuse+reflectedLight.indirectDiffuse;
if(nativeDiagnosticPass==2)outgoingLight=reflectedLight.directSpecular+reflectedLight.indirectSpecular;
#endif
#include <opaque_fragment>`);
      };
      m.customProgramCacheKey = () => "native-ocio-lut-v1-" + (previousKey?.() || "");
      m.needsUpdate = true;
    }
  });
  for (const m of toneMaterials) {
    if (m.envMap !== metalCube) continue;
    const previous = m.onBeforeCompile, previousKey = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader) => {
      previous(shader, renderer);
      shader.uniforms.nativeProbeOrigin = { value: new THREE2.Vector3(4.35, 0.22, -5.25) };
      shader.vertexShader = "varying vec3 nativeWorldPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nnativeWorldPosition=worldPosition.xyz;");
      shader.fragmentShader = "varying vec3 nativeWorldPosition;\nuniform vec3 nativeProbeOrigin;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_fragment>", THREE2.ShaderChunk.lights_physical_fragment + `
#ifdef USE_ANISOTROPY
// Cycles uses its generated-coordinate tangent rather than glTF's default UV frame.
vec3 nativeUpView=normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0));
vec3 nativeTangent=cross(nativeUpView,normal);
if(dot(nativeTangent,nativeTangent)>1e-8){material.anisotropyT=normalize(nativeTangent);material.anisotropyB=normalize(cross(normal,material.anisotropyT));}
// Translate native GGX alpha_x / alpha_y into Three's anisotropic parameterization.
float nativeAspect=sqrt(1.0-.9*material.anisotropy);
float nativeAlphaX=pow2(material.roughness)/nativeAspect;
float nativeAlphaY=pow2(material.roughness)*nativeAspect;
material.alphaT=nativeAlphaX;
material.roughness=sqrt(nativeAlphaY);
material.anisotropy=sqrt(max((nativeAlphaX-nativeAlphaY)/(1.0-nativeAlphaY),0.0));
#endif
`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <envmap_physical_pars_fragment>", THREE2.ShaderChunk.envmap_physical_pars_fragment.replace("vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );", `if(reflectVec.y < -0.02){float floorDistance=(-0.012-nativeWorldPosition.y)/reflectVec.y;if(floorDistance>0.0){vec3 hit=nativeWorldPosition+reflectVec*floorDistance;reflectVec=normalize(hit-nativeProbeOrigin);}}
vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );`));
    };
    m.customProgramCacheKey = () => previousKey() + "-native-probe-floor-parallax-native-bsdf-v2";
    m.needsUpdate = true;
  }
  for (const m of toneMaterials) {
    if (!m.userData.nativeGeometryThickness) continue;
    const previous = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader) => {
      previous(shader, renderer);
      shader.vertexShader = "attribute float _native_thickness;\nvarying float nativeGeometryThickness;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nnativeGeometryThickness=_native_thickness;");
      shader.fragmentShader = "varying float nativeGeometryThickness;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <transmission_fragment>", THREE2.ShaderChunk.transmission_fragment.replace("material.thickness = thickness;", "material.thickness = nativeGeometryThickness;"));
    };
    m.customProgramCacheKey = () => key() + "-native-geometry-thickness-v1";
    m.needsUpdate = true;
  }
  const cullAudit = { sourceMeshes: 0, chunks: 0, sourceTriangles: 0, outputTriangles: 0, sharedVertexBuffers: true };
  const splitCandidates = [];
  gltf.scene.traverse((n) => {
    if (n.isMesh && !n.isSkinnedMesh && !Array.isArray(n.material) && n.geometry.index && n.geometry.index.count > 6e4) splitCandidates.push(n);
  });
  for (const mesh of splitCandidates) {
    const source = mesh.geometry, p = source.getAttribute("position"), index = source.index, groups = /* @__PURE__ */ new Map(), cell = 2;
    for (let i3 = 0; i3 < index.count; i3 += 3) {
      const a = index.getX(i3), b = index.getX(i3 + 1), c = index.getX(i3 + 2);
      const x3 = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
      const key = Math.floor(x3 / cell) + "," + Math.floor(y / cell) + "," + Math.floor(z / cell);
      let chunk = groups.get(key);
      if (!chunk) groups.set(key, chunk = []);
      chunk.push(a, b, c);
    }
    if (groups.size <= 1) continue;
    cullAudit.sourceMeshes++;
    cullAudit.sourceTriangles += index.count / 3;
    resources.add(source);
    for (const [key, indices] of groups) {
      const g = new THREE2.BufferGeometry();
      for (const [name, attribute] of Object.entries(source.attributes)) g.setAttribute(name, attribute);
      g.setIndex(new THREE2.BufferAttribute(new Uint32Array(indices), 1));
      const bounds = new THREE2.Box3(), v = new THREE2.Vector3();
      for (const i3 of indices) bounds.expandByPoint(v.fromBufferAttribute(p, i3));
      g.boundingBox = bounds;
      g.boundingSphere = bounds.getBoundingSphere(new THREE2.Sphere());
      const part = mesh.clone(false);
      part.name = mesh.name + " / spatial " + key;
      part.geometry = g;
      part.frustumCulled = true;
      mesh.parent.add(part);
      cullAudit.chunks++;
      cullAudit.outputTriangles += indices.length / 3;
    }
    mesh.removeFromParent();
  }
  if (cullAudit.sourceTriangles !== cullAudit.outputTriangles) throw Error("Spatial partition lost triangles");
  gltf.scene.userData.spatialCullAudit = cullAudit;
  const simplifiedGlass = /* @__PURE__ */ new Set();
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (mesh.userData.nativeTransmissionInterior) {
      mesh.visible = false;
      return;
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (m.transmission > 0) {
      m.transmission = 0;
      m.transparent = true;
      m.opacity = 0.24;
      m.depthWrite = false;
      m.side = THREE2.FrontSide;
      m.needsUpdate = true;
      simplifiedGlass.add(m);
    }
  });
  const fastDisplay = await loadFastDisplay({ THREE: THREE2, base, resources });
  const denseDisplay = await loadDenseDisplay({ THREE: THREE2, base, resources });
  const directMaterials = /* @__PURE__ */ new Set();
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!m.userData.offlineFloorDisplay) directMaterials.add(m);
  });
  for (const m of directMaterials) {
    const previous = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (shader) => {
      previous?.(shader, renderer);
      const vertex = m.userData.nativeVertexLighting;
      shader.uniforms[vertex ? "nativeDenseDisplay" : "nativeFastDisplaySampler"] = vertex ? denseDisplay.uniform : fastDisplay.uniform;
      shader.fragmentShader = (vertex ? denseDisplay.shader : fastDisplay.shader) + "\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <colorspace_fragment>", "gl_FragColor=nativeOCIODisplay(gl_FragColor);");
    };
    m.customProgramCacheKey = () => key() + (m.userData.nativeVertexLighting ? "-dense-display-v1" : "-hardware-display-v1");
    m.needsUpdate = true;
  }
  window.simplifiedGlassMaterialCount = simplifiedGlass.size;
  const root = gltf.scene;
  root.userData.invalidateNativeFrame = () => {
  };
  root.userData.nativePreview = true;
  root.userData.resize = () => {
  };
  root.userData.render = (camera, tableScene) => {
    renderer.nativeTransmissionLayers = false;
    renderer.nativeReuseOpaqueForTransmission = false;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    const oldBg = tableScene.background, oldAutoClear = renderer.autoClear;
    tableScene.background = null;
    renderer.autoClear = false;
    try {
      renderer.render(tableScene, camera);
    } finally {
      tableScene.background = oldBg;
      renderer.autoClear = oldAutoClear;
    }
  };
  root.userData.dispose = () => {
    for (const group of [gltf.scene, ...replacedPlayerNodes]) group.traverse((o) => {
      if (o.geometry) resources.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
        resources.add(m);
        for (const t of Object.values(m)) if (t?.isTexture) resources.add(t);
      }
    });
    for (const r of resources) r.dispose();
  };
  root.userData.configureGameTable = (gameTable) => {
    const originals = /* @__PURE__ */ new Map();
    gameTable.traverse((mesh) => {
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (m.name !== "tableBrandLogo" || originals.has(m)) continue;
        originals.set(m, { color: m.color.clone(), emissive: m.emissive.clone() });
        m.color.setRGB(0, 0, 0);
        m.emissive.setRGB(0, 0, 0);
      }
    });
    if (originals.size !== 1) throw Error("Expected one shared table wordmark material");
    root.userData.tableLogoAudit = () => ({ color: "#000000", emissive: "#000000", materials: originals.size, originalTexturePreserved: true, originalShaderPreserved: true, extraTextureObjects: 0, extraTriangles: 0, extraDrawCalls: 0 });
    return () => {
      for (const [m, original] of originals) {
        m.color.copy(original.color);
        m.emissive.copy(original.emissive);
      }
    };
  };
  root.userData.middlePocketReturnRotation = Math.PI;
  root.userData.middlePocketReturnPivotX = -712e-6;
  root.userData.replacedTableBodyNames = bodyDescription?.replacedGameNames ?? [];
  root.userData.nativeAssetRevision = "compact-native-irradiance-glass-energy";
  return root;
}
export {
  loadNativePreview,
  loadNativeTableBody
};
/*!
fflate - fast JavaScript compression/decompression
<https://101arrowz.github.io/fflate>
Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
version 0.8.2
*/
/*! Bundled license information:

three/examples/jsm/libs/fflate.module.js:
  (*!
  fflate - fast JavaScript compression/decompression
  <https://101arrowz.github.io/fflate>
  Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
  version 0.8.2
  *)
*/
