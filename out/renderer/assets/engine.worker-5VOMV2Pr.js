(function() {
  "use strict";
  function runPipeline(initialWorld, phases) {
    return phases.reduce((currentWorld2, phase) => {
      try {
        const nextWorld = phase(currentWorld2);
        if (!nextWorld || !nextWorld.heyas || !nextWorld.rikishi) {
          throw new Error(
            `[pipelineRunner] Phase "${phase.name || "anonymous"}" returned invalid WorldState (heyas or rikishi map missing).`
          );
        }
        return nextWorld;
      } catch (error) {
        console.error(
          `[PIPELINE FATAL ERROR] in phase: "${phase.name || "anonymous"}"`,
          error
        );
        return currentWorld2;
      }
    }, initialWorld);
  }
  function emptyDeltas() {
    return {
      revenue: 0,
      expenses: 0,
      statChanges: {},
      injuriesSustained: []
    };
  }
  function defaultActiveModifiers() {
    return {
      trainingMultiplier: 1,
      recoveryMultiplier: 1,
      financialPenalty: false,
      moraleBoost: false
    };
  }
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  function getAugmentedNamespace(n) {
    if (n.__esModule) return n;
    var f = n.default;
    if (typeof f == "function") {
      var a = function a2() {
        if (this instanceof a2) {
          return Reflect.construct(f, arguments, this.constructor);
        }
        return f.apply(this, arguments);
      };
      a.prototype = f.prototype;
    } else a = {};
    Object.defineProperty(a, "__esModule", { value: true });
    Object.keys(n).forEach(function(k) {
      var d = Object.getOwnPropertyDescriptor(n, k);
      Object.defineProperty(a, k, d.get ? d : {
        enumerable: true,
        get: function() {
          return n[k];
        }
      });
    });
    return a;
  }
  var alea$1 = { exports: {} };
  alea$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function Alea(seed) {
        var me = this, mash = Mash();
        me.next = function() {
          var t = 2091639 * me.s0 + me.c * 23283064365386963e-26;
          me.s0 = me.s1;
          me.s1 = me.s2;
          return me.s2 = t - (me.c = t | 0);
        };
        me.c = 1;
        me.s0 = mash(" ");
        me.s1 = mash(" ");
        me.s2 = mash(" ");
        me.s0 -= mash(seed);
        if (me.s0 < 0) {
          me.s0 += 1;
        }
        me.s1 -= mash(seed);
        if (me.s1 < 0) {
          me.s1 += 1;
        }
        me.s2 -= mash(seed);
        if (me.s2 < 0) {
          me.s2 += 1;
        }
        mash = null;
      }
      function copy(f, t) {
        t.c = f.c;
        t.s0 = f.s0;
        t.s1 = f.s1;
        t.s2 = f.s2;
        return t;
      }
      function impl(seed, opts) {
        var xg = new Alea(seed), state = opts && opts.state, prng = xg.next;
        prng.int32 = function() {
          return xg.next() * 4294967296 | 0;
        };
        prng.double = function() {
          return prng() + (prng() * 2097152 | 0) * 11102230246251565e-32;
        };
        prng.quick = prng;
        if (state) {
          if (typeof state == "object") copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      function Mash() {
        var n = 4022871197;
        var mash = function(data) {
          data = String(data);
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 4294967296;
          }
          return (n >>> 0) * 23283064365386963e-26;
        };
        return mash;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.alea = impl;
      }
    })(
      commonjsGlobal,
      module
    );
  })(alea$1);
  var aleaExports = alea$1.exports;
  var xor128$1 = { exports: {} };
  xor128$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.next = function() {
          var t = me.x ^ me.x << 11;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          return me.w ^= me.w >>> 19 ^ t ^ t >>> 8;
        };
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object") copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.xor128 = impl;
      }
    })(
      commonjsGlobal,
      module
    );
  })(xor128$1);
  var xor128Exports = xor128$1.exports;
  var xorwow$1 = { exports: {} };
  xorwow$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var t = me.x ^ me.x >>> 2;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          me.w = me.v;
          return (me.d = me.d + 362437 | 0) + (me.v = me.v ^ me.v << 4 ^ (t ^ t << 1)) | 0;
        };
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.v = 0;
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          if (k == strseed.length) {
            me.d = me.x << 10 ^ me.x >>> 4;
          }
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        t.v = f.v;
        t.d = f.d;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object") copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.xorwow = impl;
      }
    })(
      commonjsGlobal,
      module
    );
  })(xorwow$1);
  var xorwowExports = xorwow$1.exports;
  var xorshift7$1 = { exports: {} };
  xorshift7$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var X = me.x, i = me.i, t, v;
          t = X[i];
          t ^= t >>> 7;
          v = t ^ t << 24;
          t = X[i + 1 & 7];
          v ^= t ^ t >>> 10;
          t = X[i + 3 & 7];
          v ^= t ^ t >>> 3;
          t = X[i + 4 & 7];
          v ^= t ^ t << 7;
          t = X[i + 7 & 7];
          t = t ^ t << 13;
          v ^= t ^ t << 9;
          X[i] = v;
          me.i = i + 1 & 7;
          return v;
        };
        function init(me2, seed2) {
          var j, X = [];
          if (seed2 === (seed2 | 0)) {
            X[0] = seed2;
          } else {
            seed2 = "" + seed2;
            for (j = 0; j < seed2.length; ++j) {
              X[j & 7] = X[j & 7] << 15 ^ seed2.charCodeAt(j) + X[j + 1 & 7] << 13;
            }
          }
          while (X.length < 8) X.push(0);
          for (j = 0; j < 8 && X[j] === 0; ++j) ;
          if (j == 8) X[7] = -1;
          else X[j];
          me2.x = X;
          me2.i = 0;
          for (j = 256; j > 0; --j) {
            me2.next();
          }
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.x = f.x.slice();
        t.i = f.i;
        return t;
      }
      function impl(seed, opts) {
        if (seed == null) seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.x) copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.xorshift7 = impl;
      }
    })(
      commonjsGlobal,
      module
    );
  })(xorshift7$1);
  var xorshift7Exports = xorshift7$1.exports;
  var xor4096$1 = { exports: {} };
  xor4096$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var w = me.w, X = me.X, i = me.i, t, v;
          me.w = w = w + 1640531527 | 0;
          v = X[i + 34 & 127];
          t = X[i = i + 1 & 127];
          v ^= v << 13;
          t ^= t << 17;
          v ^= v >>> 15;
          t ^= t >>> 12;
          v = X[i] = v ^ t;
          me.i = i;
          return v + (w ^ w >>> 16) | 0;
        };
        function init(me2, seed2) {
          var t, v, i, j, w, X = [], limit = 128;
          if (seed2 === (seed2 | 0)) {
            v = seed2;
            seed2 = null;
          } else {
            seed2 = seed2 + "\0";
            v = 0;
            limit = Math.max(limit, seed2.length);
          }
          for (i = 0, j = -32; j < limit; ++j) {
            if (seed2) v ^= seed2.charCodeAt((j + 32) % seed2.length);
            if (j === 0) w = v;
            v ^= v << 10;
            v ^= v >>> 15;
            v ^= v << 4;
            v ^= v >>> 13;
            if (j >= 0) {
              w = w + 1640531527 | 0;
              t = X[j & 127] ^= v + w;
              i = 0 == t ? i + 1 : 0;
            }
          }
          if (i >= 128) {
            X[(seed2 && seed2.length || 0) & 127] = -1;
          }
          i = 127;
          for (j = 4 * 128; j > 0; --j) {
            v = X[i + 34 & 127];
            t = X[i = i + 1 & 127];
            v ^= v << 13;
            t ^= t << 17;
            v ^= v >>> 15;
            t ^= t >>> 12;
            X[i] = v ^ t;
          }
          me2.w = w;
          me2.X = X;
          me2.i = i;
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.i = f.i;
        t.w = f.w;
        t.X = f.X.slice();
        return t;
      }
      function impl(seed, opts) {
        if (seed == null) seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.X) copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.xor4096 = impl;
      }
    })(
      commonjsGlobal,
      // window object or global
      module
    );
  })(xor4096$1);
  var xor4096Exports = xor4096$1.exports;
  var tychei$1 = { exports: {} };
  tychei$1.exports;
  (function(module) {
    (function(global2, module2, define) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var b = me.b, c = me.c, d = me.d, a = me.a;
          b = b << 25 ^ b >>> 7 ^ c;
          c = c - d | 0;
          d = d << 24 ^ d >>> 8 ^ a;
          a = a - b | 0;
          me.b = b = b << 20 ^ b >>> 12 ^ c;
          me.c = c = c - d | 0;
          me.d = d << 16 ^ c >>> 16 ^ a;
          return me.a = a - b | 0;
        };
        me.a = 0;
        me.b = 0;
        me.c = 2654435769 | 0;
        me.d = 1367130551;
        if (seed === Math.floor(seed)) {
          me.a = seed / 4294967296 | 0;
          me.b = seed | 0;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 20; k++) {
          me.b ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.a = f.a;
        t.b = f.b;
        t.c = f.c;
        t.d = f.d;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object") copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else {
        this.tychei = impl;
      }
    })(
      commonjsGlobal,
      module
    );
  })(tychei$1);
  var tycheiExports = tychei$1.exports;
  var seedrandom$2 = { exports: {} };
  var __viteBrowserExternal = {};
  var __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    default: __viteBrowserExternal
  });
  var require$$0 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
  (function(module) {
    (function(global2, pool, math) {
      var width = 256, chunks = 6, digits = 52, rngname = "random", startdenom = math.pow(width, chunks), significance = math.pow(2, digits), overflow = significance * 2, mask = width - 1, nodecrypto;
      function seedrandom2(seed, options, callback) {
        var key = [];
        options = options == true ? { entropy: true } : options || {};
        var shortseed = mixkey(flatten(
          options.entropy ? [seed, tostring(pool)] : seed == null ? autoseed() : seed,
          3
        ), key);
        var arc4 = new ARC4(key);
        var prng = function() {
          var n = arc4.g(chunks), d = startdenom, x = 0;
          while (n < significance) {
            n = (n + x) * width;
            d *= width;
            x = arc4.g(1);
          }
          while (n >= overflow) {
            n /= 2;
            d /= 2;
            x >>>= 1;
          }
          return (n + x) / d;
        };
        prng.int32 = function() {
          return arc4.g(4) | 0;
        };
        prng.quick = function() {
          return arc4.g(4) / 4294967296;
        };
        prng.double = prng;
        mixkey(tostring(arc4.S), pool);
        return (options.pass || callback || function(prng2, seed2, is_math_call, state) {
          if (state) {
            if (state.S) {
              copy(state, arc4);
            }
            prng2.state = function() {
              return copy(arc4, {});
            };
          }
          if (is_math_call) {
            math[rngname] = prng2;
            return seed2;
          } else return prng2;
        })(
          prng,
          shortseed,
          "global" in options ? options.global : this == math,
          options.state
        );
      }
      function ARC4(key) {
        var t, keylen = key.length, me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];
        if (!keylen) {
          key = [keylen++];
        }
        while (i < width) {
          s[i] = i++;
        }
        for (i = 0; i < width; i++) {
          s[i] = s[j = mask & j + key[i % keylen] + (t = s[i])];
          s[j] = t;
        }
        (me.g = function(count) {
          var t2, r = 0, i2 = me.i, j2 = me.j, s2 = me.S;
          while (count--) {
            t2 = s2[i2 = mask & i2 + 1];
            r = r * width + s2[mask & (s2[i2] = s2[j2 = mask & j2 + t2]) + (s2[j2] = t2)];
          }
          me.i = i2;
          me.j = j2;
          return r;
        })(width);
      }
      function copy(f, t) {
        t.i = f.i;
        t.j = f.j;
        t.S = f.S.slice();
        return t;
      }
      function flatten(obj, depth) {
        var result = [], typ = typeof obj, prop;
        if (depth && typ == "object") {
          for (prop in obj) {
            try {
              result.push(flatten(obj[prop], depth - 1));
            } catch (e) {
            }
          }
        }
        return result.length ? result : typ == "string" ? obj : obj + "\0";
      }
      function mixkey(seed, key) {
        var stringseed = seed + "", smear, j = 0;
        while (j < stringseed.length) {
          key[mask & j] = mask & (smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++);
        }
        return tostring(key);
      }
      function autoseed() {
        try {
          var out;
          if (nodecrypto && (out = nodecrypto.randomBytes)) {
            out = out(width);
          } else {
            out = new Uint8Array(width);
            (global2.crypto || global2.msCrypto).getRandomValues(out);
          }
          return tostring(out);
        } catch (e) {
          var browser = global2.navigator, plugins = browser && browser.plugins;
          return [+/* @__PURE__ */ new Date(), global2, plugins, global2.screen, tostring(pool)];
        }
      }
      function tostring(a) {
        return String.fromCharCode.apply(0, a);
      }
      mixkey(math.random(), pool);
      if (module.exports) {
        module.exports = seedrandom2;
        try {
          nodecrypto = require$$0;
        } catch (ex) {
        }
      } else {
        math["seed" + rngname] = seedrandom2;
      }
    })(
      // global: `self` in browsers (including strict mode and web workers),
      // otherwise `this` in Node and other environments
      typeof self !== "undefined" ? self : commonjsGlobal,
      [],
      // pool: entropy pool starts empty
      Math
      // math: package containing random, pow, and seedrandom
    );
  })(seedrandom$2);
  var seedrandomExports = seedrandom$2.exports;
  var alea = aleaExports;
  var xor128 = xor128Exports;
  var xorwow = xorwowExports;
  var xorshift7 = xorshift7Exports;
  var xor4096 = xor4096Exports;
  var tychei = tycheiExports;
  var sr = seedrandomExports;
  sr.alea = alea;
  sr.xor128 = xor128;
  sr.xorwow = xorwow;
  sr.xorshift7 = xorshift7;
  sr.xor4096 = xor4096;
  sr.tychei = tychei;
  var seedrandom = sr;
  var seedrandom$1 = /* @__PURE__ */ getDefaultExportFromCjs(seedrandom);
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }
  function clampInt(n, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.trunc(n)));
  }
  function simpleHashToIndex(s, mod) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % mod;
  }
  class SeededRNG {
    seed;
    rng;
    idCounters = /* @__PURE__ */ new Map();
    constructor(seed) {
      this.seed = seed;
      this.rng = seedrandom$1(seed);
    }
    /** Returns a float in [0, 1) */
    next() {
      return this.rng();
    }
    /** Returns an integer in [min, max] inclusive */
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }
    /** Returns true with probability p */
    bool(p = 0.5) {
      return this.next() < p;
    }
    /** Pick a random element from an array */
    pick(arr) {
      return arr[this.int(0, arr.length - 1)];
    }
    /** Shuffle an array in place */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    /** Returns a normally distributed value with mean and standard deviation */
    gaussian(mean, stdDev) {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      const num = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return num * stdDev + mean;
    }
    /**
     * Generates a deterministic, unique ID with a prefix.
     * Maintains a counter per prefix within this RNG instance to ensure
     * chronological uniqueness within a single simulation stream.
     */
    uuid(prefix) {
      const count = (this.idCounters.get(prefix) || 0) + 1;
      this.idCounters.set(prefix, count);
      const hashSeed = `${this.seed}::${prefix}::${count}`;
      const hash = simpleHashToIndex(hashSeed, 4294967295).toString(16).padStart(8, "0");
      return `${prefix}-${hash.toUpperCase()}`;
    }
  }
  function rngFromSeed(seed, subsystem, label) {
    const combinedSeed = `${seed}::${subsystem}::${label}`;
    return new SeededRNG(combinedSeed);
  }
  function rngForWorld(world, subsystem, label) {
    return rngFromSeed(world.seed, subsystem, label);
  }
  function stableSort(iterable, keyFn) {
    return Array.from(iterable).sort((a, b) => {
      const ka = keyFn(a);
      const kb = keyFn(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }
  function stableTieBreak(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  function seededPick(rng, arr) {
    if (arr.length === 0) throw new Error("seededPick: Cannot pick from empty array.");
    return arr[rng.int(0, arr.length - 1)];
  }
  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function weightedPick(items, rng) {
    const total = items.reduce((s, x) => s + Math.max(0, x.w), 0);
    if (total <= 0) return items[0].item;
    let r = rng() * total;
    for (const x of items) {
      r -= Math.max(0, x.w);
      if (r <= 0) return x.item;
    }
    return items[items.length - 1].item;
  }
  function assertNever(x) {
    throw new Error(`Unexpected object: ${x}`);
  }
  const SHIKONA_PREFIXES = {
    power: ["Taka", "Waka", "Dai", "Oo", "Ko", "Sei", "Ryu", "Rai", "Tetsu", "Go", "Yu", "Shin", "Ken", "Kyo", "So"],
    nature: ["Asa", "Nishi", "Higa", "Aki", "Fuyu", "Haru", "Natsu", "Kaze", "Yama", "Umi", "Tani", "Mori", "Hana", "Tsuki"],
    tradition: ["Tochi", "Haku", "Kai", "Koto", "Miya", "Mitake", "Kiyo", "Sada", "Teru", "Ichi", "Ao", "Kiri", "Tama", "Ura"],
    regional: ["Endo", "Ono", "Namba", "Chiya", "Tobi", "Sho", "Masa", "Tomo", "Hide", "Kise", "Ama", "Kak", "Hiro"]
  };
  const SHIKONA_SUFFIXES = {
    mountain: ["yama", "zan", "take", "mine", "iwa", "shima", "ishi"],
    water: ["umi", "nami", "kawa", "ryu", "taki", "mizu"],
    sky: ["kaze", "arashi", "sora", "kumo", "tora"],
    flora: ["fuji", "sakura", "hana", "take", "matsu", "ume"],
    noble: ["sho", "nishiki", "ho", "omi", "sei", "ryu"],
    endings: ["noshin", "maru", "shu", "ho", "waka"]
  };
  const PRESTIGIOUS_FULL_NAMES = [
    "Hakuryu",
    "Kaio",
    "Takanofuji",
    "Wakatora",
    "Asashoryu",
    "Kotoshogiku",
    "Tochishima",
    "Terunofuji",
    "Mitakeumi",
    "Ichinojo",
    "Aoiyama",
    "Kirishima",
    "Tamanoshima"
  ];
  const NATIONALITY_PREFIXES = {
    Mongolia: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"],
    Georgia: ["Tochi", "Gaga", "Koto", "Koko"],
    Bulgaria: ["Ao", "Koto", "Bara"],
    USA: ["Musa", "Aka", "Taka", "Dai"],
    Brazil: ["Kai", "Asa", "Sho"],
    Egypt: ["Oo", "Sada", "Osa"],
    default: ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"]
  };
  const HOUSE_STYLES = [
    {
      id: "power_mountain",
      name: "Power & Mountain Lineage",
      patternBias: { "power+any": 8, "nat+terrain": 6, "cat+cat": 3, triple: -2 },
      prefixCategoryBias: { power: 8, tradition: 2 },
      suffixCategoryBias: { mountain: 8, noble: 2 }
    },
    {
      id: "sea_wind",
      name: "Sea & Wind Poets",
      patternBias: { "nat+terrain": 8, "cat+cat": 4, triple: 2 },
      prefixCategoryBias: { nature: 6, tradition: 1 },
      suffixCategoryBias: { water: 7, sky: 6, mountain: -2 },
      connectorBias: { no: 3, yori: 2 }
    },
    {
      id: "tradition_flora",
      name: "Temple & Blossom Tradition",
      patternBias: { "tradition+flora": 10, "nature+noble": 2, triple: 2, "regional+ending": -2 },
      prefixCategoryBias: { tradition: 8, nature: 2 },
      suffixCategoryBias: { flora: 9, noble: 2 },
      connectorBias: { shi: 2, ga: 1 }
    },
    {
      id: "regional_endings",
      name: "Regional Maru House",
      patternBias: { "regional+ending": 12, "cat+cat": 4, triple: -2 },
      prefixCategoryBias: { regional: 10 },
      suffixCategoryBias: { endings: 10, mountain: 1 }
    },
    {
      id: "dragon_noble",
      name: "Dragon & Noble Court",
      patternBias: { "power+any": 4, "nature+noble": 8, triple: 3 },
      prefixCategoryBias: { power: 4, tradition: 3 },
      suffixCategoryBias: { noble: 9, water: 2 },
      connectorBias: { kuni: 2, iwa: 1, ga: 1 }
    },
    {
      id: "balanced_classic",
      name: "Balanced Classic",
      patternBias: { "cat+cat": 4, "nat+terrain": 2 },
      prefixCategoryBias: { power: 2, nature: 2, tradition: 2, regional: 2 },
      suffixCategoryBias: { mountain: 2, water: 2, sky: 2, flora: 2, noble: 2, endings: 2 }
    }
  ];
  const RANK_RULES = [
    { tier: "rookie", prestigeChance: 0.02, tripleChance: 0.05, maxLen: 14, patternBias: { triple: -3, "regional+ending": 1, "cat+cat": 2 } },
    { tier: "developing", prestigeChance: 0.04, tripleChance: 0.08, maxLen: 16, patternBias: { triple: -1, "cat+cat": 2 } },
    { tier: "upper", prestigeChance: 0.06, tripleChance: 0.12, maxLen: 18, patternBias: { triple: 1, "nature+noble": 1, "tradition+flora": 1 } },
    { tier: "salaried", prestigeChance: 0.08, tripleChance: 0.16, maxLen: 20, patternBias: { triple: 2, "nat+terrain": 1 } },
    { tier: "top", prestigeChance: 0.12, tripleChance: 0.2, maxLen: 22, patternBias: { triple: 3, "tradition+flora": 1, "power+any": 1 } },
    { tier: "legend", prestigeChance: 0.16, tripleChance: 0.24, maxLen: 24, patternBias: { triple: 4, "power+any": 1, "nature+noble": 1 } }
  ];
  function seededRandom(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const a = 1664525;
    const c = 1013904223;
    const m = 4294967296;
    let x = Math.abs(hash);
    return function() {
      x = (a * x + c) % m;
      return x / m;
    };
  }
  function resolveRankTier(rank) {
    const r = (rank || "").toLowerCase();
    if (r.includes("yokozuna") || r.includes("ozeki")) return "legend";
    if (r.includes("makuuchi")) return "top";
    if (r.includes("juryo")) return "salaried";
    if (r.includes("makushita")) return "upper";
    if (r.includes("sandanme")) return "developing";
    return "rookie";
  }
  function getRankRule(rank) {
    const tier = resolveRankTier(rank);
    return RANK_RULES.find((r) => r.tier === tier) || RANK_RULES[1];
  }
  function getHouseStyle(heyaId) {
    if (!heyaId) return HOUSE_STYLES.find((s) => s.id === "balanced_classic");
    const idx = simpleHashToIndex(heyaId, HOUSE_STYLES.length);
    return HOUSE_STYLES[idx];
  }
  function mergePatternWeights(base, ...biases) {
    const out = { ...base };
    for (const b of biases) {
      for (const k in b) {
        const key = k;
        out[key] = (out[key] ?? 0) + (b[key] ?? 0);
      }
    }
    for (const k in out) {
      const key = k;
      out[key] = clamp(out[key], 0.1, 100);
    }
    return out;
  }
  function choosePattern(rng, weights) {
    const items = [];
    for (const p in weights) {
      items.push({ item: p, w: weights[p] });
    }
    return weightedPick(items, rng);
  }
  function nationalityPool(config) {
    if (!config.nationality) return NATIONALITY_PREFIXES.default;
    return NATIONALITY_PREFIXES[config.nationality] || NATIONALITY_PREFIXES.default;
  }
  function pickPrefixByCategoryBias(rng, bias) {
    const items = [];
    for (const cat in SHIKONA_PREFIXES) {
      const category = cat;
      items.push({ item: category, w: clamp(10 + (bias[category] ?? 0), 1, 50) });
    }
    const chosen = weightedPick(items, rng);
    return pick(SHIKONA_PREFIXES[chosen], rng);
  }
  function pickSuffixByCategoryBias(rng, bias) {
    const items = [];
    for (const cat in SHIKONA_SUFFIXES) {
      const category = cat;
      items.push({ item: category, w: clamp(10 + (bias[category] ?? 0), 1, 50) });
    }
    const chosen = weightedPick(items, rng);
    return pick(SHIKONA_SUFFIXES[chosen], rng);
  }
  function pickConnectorToken(rng, house) {
    const base = { no: 10, ga: 7, shi: 5, kuni: 3, iwa: 3, yori: 2 };
    const b = house.connectorBias || {};
    const items = [];
    for (const c in base) {
      const connector = c;
      items.push({ item: connector, w: clamp(base[connector] + (b[connector] ?? 0), 0.1, 50) });
    }
    const chosen = weightedPick(items, rng);
    return chosen === "no" ? "" : chosen;
  }
  const BASE_PATTERN_WEIGHTS = {
    "nat+terrain": 18,
    "power+any": 18,
    "nature+noble": 16,
    "tradition+flora": 14,
    "regional+ending": 10,
    "cat+cat": 18,
    triple: 6
  };
  function generateCandidate$1(rng, config, attempt, house, rankRule) {
    const nat = nationalityPool(config);
    if (config.preferPrestigious) {
      if (rng() < rankRule.prestigeChance) {
        const base = pick(PRESTIGIOUS_FULL_NAMES, rng);
        if (attempt > 0) {
          const extra = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
          return base + extra;
        }
        return base;
      }
    }
    const patternWeights = mergePatternWeights(BASE_PATTERN_WEIGHTS, rankRule.patternBias, house.patternBias);
    const pattern = choosePattern(rng, patternWeights);
    switch (pattern) {
      case "nat+terrain": {
        const prefix = pick(nat, rng);
        const suffix = rng() < 0.5 ? pick(SHIKONA_SUFFIXES.mountain, rng) : pick(SHIKONA_SUFFIXES.water, rng);
        return prefix + suffix;
      }
      case "power+any": {
        const prefix = pick(SHIKONA_PREFIXES.power, rng);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + suffix;
      }
      case "nature+noble": {
        const prefix = pick(SHIKONA_PREFIXES.nature, rng);
        const suffix = pick(SHIKONA_SUFFIXES.noble, rng);
        return prefix + suffix;
      }
      case "tradition+flora": {
        const prefix = pick(SHIKONA_PREFIXES.tradition, rng);
        const suffix = pick(SHIKONA_SUFFIXES.flora, rng);
        return prefix + suffix;
      }
      case "regional+ending": {
        const prefix = pick(SHIKONA_PREFIXES.regional, rng);
        const suffix = pick(SHIKONA_SUFFIXES.endings, rng);
        return prefix + suffix;
      }
      case "cat+cat": {
        const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + suffix;
      }
      case "triple": {
        if (rng() > rankRule.tripleChance) {
          const prefix2 = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
          const suffix2 = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
          return prefix2 + suffix2;
        }
        const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
        const connector = pickConnectorToken(rng, house);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + connector + suffix;
      }
      default:
        assertNever(pattern);
    }
  }
  function generateShikona(seed = "default", config = {}) {
    const rng = config.rng ? () => config.rng.next() : seededRandom(seed + (config.heyaId || "") + (config.nationality || ""));
    const house = getHouseStyle(config.heyaId);
    const rankRule = getRankRule(config.rank);
    let name = generateCandidate$1(rng, config, 0, house, rankRule);
    if (name.length > rankRule.maxLen + 4) {
      name = generateCandidate$1(rng, config, 1, house, rankRule);
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  function generateRikishiName(seed, rng) {
    return generateShikona(seed, { rng });
  }
  function generateOyakataName(seed, rng) {
    const names = [
      "Miyagino",
      "Isegahama",
      "Kokonoe",
      "Takasago",
      "Dewanoumi",
      "Hakkaku",
      "Futagoyama",
      "Shibatayama",
      "Arashio",
      "Tokitsukaze",
      "Kasugano",
      "Oguruma",
      "Kise",
      "Tamanoi",
      "Oshima"
    ];
    const roll = rng ? () => rng.next() : seededRandom(seed + "::oyakataName");
    const idx = Math.floor(roll() * names.length);
    return names[Math.max(0, Math.min(names.length - 1, idx))];
  }
  const ARCHETYPE_DEFINITIONS = {
    trickster: {
      familyPreferences: { push: 10, belt: 15, trick: 55, speed: 20 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: { technique: 1.2, speed: 1.1, weight: 0.9, strength: 0.85 }
    },
    oshi: {
      familyPreferences: { push: 75, belt: 10, trick: 5, speed: 10 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: { strength: 1.1, speed: 1.1, technique: 0.8 }
    },
    yotsu: {
      familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
      preferredGrip: "migi",
      preferredGripDepth: "standard",
      statModifiers: { strength: 1.15, weight: 1.1, speed: 0.85 }
    },
    speedster: {
      familyPreferences: { push: 10, belt: 5, trick: 15, speed: 70 },
      preferredGrip: "none",
      preferredGripDepth: "maemitsu",
      statModifiers: { speed: 1.25, technique: 1.1, weight: 0.85, strength: 0.8 }
    },
    giant: {
      familyPreferences: { push: 40, belt: 50, trick: 5, speed: 5 },
      preferredGrip: "none",
      preferredGripDepth: "deep",
      statModifiers: { weight: 1.3, strength: 1.2, speed: 0.7, balance: 0.9 }
    },
    hybrid: {
      familyPreferences: { push: 40, belt: 40, trick: 10, speed: 10 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: { strength: 1.05, technique: 1.05, weight: 1.05 }
    },
    /**
     * Tsuppari — rapid open-palm thrusting (Takakeisho style).
     * High aggression, no belt contact, tires quickly under grappling.
     */
    tsuppari: {
      familyPreferences: { push: 85, belt: 2, trick: 8, speed: 5 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: { strength: 1.15, speed: 1.05, stamina: 0.85, technique: 0.9 },
      favoredKimarite: ["tsukidashi", "tsukitaoshi", "tsukiotoshi", "oshidashi", "hatakikomi"]
    },
    /**
     * Defensive — counter-wrestler archetype.
     * Low tachiai investment; reads and punishes opponent's aggression.
     */
    defensive: {
      familyPreferences: { push: 10, belt: 35, trick: 40, speed: 15 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: { technique: 1.2, speed: 1.1, strength: 0.9, balance: 1.15, weight: 0.95 },
      favoredKimarite: ["hatakikomi", "hikiotoshi", "tsukiotoshi", "uwatenage", "ketaguri", "katasukashi"]
    }
  };
  function rollArchetype(rng) {
    const roll = rng.next();
    if (roll < 0.3) return "oshi";
    if (roll < 0.57) return "yotsu";
    if (roll < 0.65) return "trickster";
    if (roll < 0.73) return "speedster";
    if (roll < 0.8) return "tsuppari";
    if (roll < 0.86) return "defensive";
    if (roll < 0.92) return "giant";
    return "hybrid";
  }
  function buildCombatProfile(archetype) {
    return {
      archetype,
      ...ARCHETYPE_DEFINITIONS[archetype]
    };
  }
  function generateRikishiStats(args) {
    const { rng, rank, profile } = args;
    const baseMean = rank === "yokozuna" ? 85 : rank === "ozeki" ? 75 : rank === "sekiwake" || rank === "komusubi" ? 65 : rank === "maegashira" ? 55 : 40;
    const mods = profile.statModifiers;
    const stdDev = 8;
    const genStat = (key, defaultVal) => {
      const mean = baseMean * (mods[key] ?? 1);
      return clampInt(rng.gaussian(mean, stdDev), 10, 100);
    };
    const weight = clampInt(rng.gaussian(150 * (mods.weight ?? 1), 20), 80, 250);
    const height = clampInt(rng.gaussian(180 * (mods.height ?? 1), 8), 160, 210);
    return {
      strength: genStat("strength"),
      technique: genStat("technique"),
      speed: genStat("speed"),
      stamina: genStat("stamina"),
      mental: genStat("mental"),
      adaptability: genStat("adaptability"),
      balance: genStat("balance"),
      weight,
      height
    };
  }
  function generateSyntheticCareer(args) {
    const { rng, rank, division, birthYear, currentYear } = args;
    const age = currentYear - birthYear;
    const debutAge = 15 + rng.int(0, 5);
    const yearsActive = Math.max(1, age - debutAge);
    const bashoCount = yearsActive * 6;
    const boutsPerBasho = ["makuuchi", "juryo"].includes(division) ? 15 : 7;
    let winRateBase;
    let yushoChance;
    switch (rank) {
      case "yokozuna":
        winRateBase = 0.72;
        yushoChance = 0.15;
        break;
      case "ozeki":
        winRateBase = 0.62;
        yushoChance = 0.05;
        break;
      case "sekiwake":
        winRateBase = 0.57;
        yushoChance = 0.02;
        break;
      case "komusubi":
        winRateBase = 0.52;
        yushoChance = 0.01;
        break;
      default:
        winRateBase = 0.48;
        yushoChance = 3e-3;
        break;
    }
    const winRate = clamp(winRateBase + (rng.next() - 0.5) * 0.12, 0.25, 0.85);
    const totalBouts = bashoCount * boutsPerBasho;
    const wins = Math.round(totalBouts * winRate);
    const losses = totalBouts - wins;
    let yushoCount = 0;
    for (let i = 0; i < bashoCount; i++) {
      if (rng.next() < yushoChance) yushoCount++;
    }
    return { careerWins: wins, careerLosses: losses, yushoCount };
  }
  function generateFullRikishi(args) {
    const { id, rng, currentYear, rank, division, side, rankNumber } = args;
    const archetype = rollArchetype(rng);
    const profile = buildCombatProfile(archetype);
    const statsBase = generateRikishiStats({ rng, rank, profile });
    const birthYear = currentYear - (18 + rng.int(0, 15));
    const records = generateSyntheticCareer({ rng, rank, division, birthYear, currentYear });
    const name = generateRikishiName(`${rng.seed}::${id}`, rng);
    const rikishiStats = {
      ...statsBase,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
      }
    };
    return {
      ...createBaseInfo(id, name, birthYear, rank, rankNumber, division, side, statsBase.height, statsBase.weight, rng),
      ...createCombatStats(rikishiStats, division, archetype, profile),
      ...createCareerHistory(records, division)
    };
  }
  function createBaseInfo(id, name, birthYear, rank, rankNumber, division, side, height, weight, rng) {
    return {
      id,
      shikona: name,
      name,
      heyaId: "",
      // Assigned by factory
      nationality: "Japan",
      birthYear,
      rank,
      rankNumber,
      division,
      side,
      height,
      weight,
      behavior: { discipline: 70, mediaSavvy: 50, stress: 0 },
      personalityTraits: [],
      faceAvatarUrl: "",
      talentSeed: rng.int(0, 1e6)
    };
  }
  function deriveStyle(archetype) {
    if (archetype === "oshi" || archetype === "tsuppari") return "oshi";
    if (archetype === "yotsu" || archetype === "giant") return "yotsu";
    return "hybrid";
  }
  function createCombatStats(rikishiStats, division, archetype, profile) {
    return {
      stats: rikishiStats,
      // Flattened accessors for performance/legacy compatibility
      power: rikishiStats.strength,
      speed: rikishiStats.speed,
      balance: rikishiStats.balance,
      technique: rikishiStats.technique,
      aggression: rikishiStats.mental,
      stamina: rikishiStats.stamina,
      adaptability: rikishiStats.adaptability,
      experience: division === "makuuchi" ? 40 : 10,
      momentum: 50,
      fatigue: 0,
      condition: 100,
      motivation: 70,
      injured: false,
      injuryWeeksRemaining: 0,
      injuryStatus: { type: "none", isInjured: false, severity: "none", location: void 0, weeksRemaining: 0, weeksToHeal: 0 },
      style: deriveStyle(archetype),
      combatProfile: profile,
      // Legacy fields omitted — combatProfile.archetype is the canonical source
      archetypeEvidence: {
        push: { success: 0, fail: 0 },
        grapple: { success: 0, fail: 0 },
        evade: { success: 0, fail: 0 }
      },
      favoredKimarite: [],
      weakAgainstStyles: []
    };
  }
  function createCareerHistory(records, division) {
    return {
      careerWins: records.careerWins,
      careerLosses: records.careerLosses,
      careerAbsences: 0,
      makuuchiWins: division === "makuuchi" ? records.careerWins : 0,
      consecutiveYusho: 0,
      careerRecord: { wins: records.careerWins, losses: records.careerLosses, yusho: records.yushoCount },
      currentBashoWins: 0,
      currentBashoLosses: 0,
      currentBashoRecord: { wins: 0, losses: 0 },
      careerHistory: [],
      milestones: [],
      history: [],
      h2h: {}
    };
  }
  function generateCandidate(args) {
    const { id, rng, currentYear, poolType } = args;
    const archetype = rollArchetype(rng);
    const profile = buildCombatProfile(archetype);
    generateRikishiStats({ rng, rank: "jonokuchi", profile });
    const name = generateRikishiName(`${rng.seed}::candidate::${id}`, rng);
    const origin = poolType === "foreign" ? seededPick(rng, ["Mongolia", "Georgia", "Russia", "Brazil", "USA"]) : seededPick(rng, ["Aomori", "Osaka", "Tokyo", "Fukuoka", "Hokkaido", "Ishikawa"]);
    return {
      candidateId: id,
      personId: rng.uuid("PS"),
      name,
      nationality: poolType === "foreign" ? origin : "Japan",
      birthYear: currentYear - (15 + rng.int(0, poolType === "university" ? 7 : 3)),
      originRegion: origin,
      visibilityBand: "hidden",
      availabilityState: "available",
      scoutingStatus: "unscouted",
      // Core combat stats (masked by visibility in UI)
      archetype,
      style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
      combatProfile: profile,
      // Potentials
      potentialGrade: seededPick(rng, ["S", "A", "B", "C", "D"]),
      competingSuitors: [],
      tags: rng.next() > 0.8 ? ["amateur_star"] : []
    };
  }
  const RNGRegistry = {
    /**
     * Get a seeded RNG for a specific system and cadence.
     * 
     * @param world - The current WorldState.
     * @param system - The system key.
     * @param cadence - Optional sub-context (e.g., "week::12" or "rikishi::d8e4").
     */
    getSystemRNG(world, system, cadence) {
      const seed = world.seed || "sumo-manager-pro";
      const cadenceKey = cadence ? `::${cadence}` : "";
      return rngFromSeed(seed, system, `${system}${cadenceKey}`);
    },
    /**
     * Shorthand for training RNG.
     */
    getTrainingRNG(world) {
      return this.getSystemRNG(world, "training", `week::${world.calendar.currentWeek || 0}`);
    },
    /**
     * Shorthand for scouting RNG.
     */
    getScoutingRNG(world) {
      return this.getSystemRNG(world, "scouting", `week::${world.calendar.currentWeek || 0}`);
    }
  };
  const EntityService = {
    /**
     * Type-safe generic state hydrator.
     * 
     * @param parent - The object containing the state (e.g., WorldState or Heya).
     * @param key - The property key for the state.
     * @param factory - A function returning the default state if it doesn't exist.
     */
    ensureState(parent, key, factory) {
      if (!parent[key]) {
        parent[key] = factory();
      }
      return parent[key];
    },
    /**
     * Hydrate a state in a nested record.
     * Useful for per-heya states (world.trainingState[heyaId]).
     * 
     * @param world - The WorldState.
     * @param rootKey - The top-level key (e.g., 'trainingState').
     * @param id - The nested key (e.g., heyaId).
     * @param factory - The default state factory.
     */
    ensureNestedState(world, rootKey, id, factory) {
      if (!world[rootKey]) {
        world[rootKey] = {};
      }
      const root = world[rootKey];
      if (!root[id]) {
        root[id] = factory();
      }
      return root[id];
    }
  };
  const version = "1.0.0";
  const metadata = {
    tone: "NHK English Commentary",
    description: "Centralized narrative data-store for Sumo Manager Pro."
  };
  const digests = [];
  const registry = {
    ranks: {
      yokozuna: {
        labelJa: "横綱",
        label: "Yokozuna"
      },
      ozeki: {
        labelJa: "大関",
        label: "Ōzeki"
      },
      sekiwake: {
        labelJa: "関脇",
        label: "Sekiwake"
      },
      komusubi: {
        labelJa: "小結",
        label: "Komusubi"
      },
      maegashira: {
        labelJa: "前頭",
        label: "Maegashira"
      },
      juryo: {
        labelJa: "十両",
        label: "Jūryō"
      },
      makushita: {
        labelJa: "幕下",
        label: "Makushita"
      },
      sandanme: {
        labelJa: "三段目",
        label: "Sandanme"
      },
      jonidan: {
        labelJa: "序二段",
        label: "Jonidan"
      },
      jonokuchi: {
        labelJa: "序ノ口",
        label: "Jonokuchi"
      }
    },
    styles: {
      oshi: {
        label: "Oshi",
        labelJa: "押し",
        description: "Pushing/thrusting sumo—drive forward with hands and pressure rather than securing the belt."
      },
      yotsu: {
        label: "Yotsu",
        labelJa: "四つ",
        description: "Belt-focused sumo—seek a grip, control the hips, and win with throws or force-outs."
      },
      hybrid: {
        label: "Hybrid",
        labelJa: "万能",
        description: "A mixed approach—comfortable switching between pushing and belt fighting depending on the matchup."
      }
    },
    archetypes: {
      oshi_specialist: {
        label: "Oshi Specialist",
        labelJa: "押し型",
        description: "Relentless forward pressure, strong tachiai."
      },
      yotsu_specialist: {
        label: "Yotsu Specialist",
        labelJa: "四つ型",
        description: "Belt technician—hunts grips, controls the clinch."
      },
      speedster: {
        label: "Speedster",
        labelJa: "俊敏",
        description: "Quick feet and angles—wins with movement."
      },
      trickster: {
        label: "Trickster",
        labelJa: "奇策",
        description: "Unorthodox and volatile—pulls and feints."
      },
      all_rounder: {
        label: "All-Rounder",
        labelJa: "総合",
        description: "Solid fundamentals everywhere."
      },
      hybrid_oshi_yotsu: {
        label: "Hybrid Oshi/Yotsu",
        labelJa: "押し四つ",
        description: "Blends pushing and belt fighting."
      },
      counter_specialist: {
        label: "Counter Specialist",
        labelJa: "受け",
        description: "Reads pressure and punishes mistakes."
      },
      giant: {
        label: "Giant",
        labelJa: "大型",
        description: "Immovable mass—wins through weight and strength dominance."
      },
      tsuppari: {
        label: "Tsuppari",
        labelJa: "突っ張り",
        description: "High-velocity open-palm thrusting. Explosive but tires quickly."
      },
      defensive: {
        label: "Counter Fighter",
        labelJa: "受け身",
        description: "Absorbs pressure. Wins by using the opponent's weight against them."
      }
    },
    kimarite: {
      yorikiri: {
        label: "Yorikiri",
        labelJa: "寄り切り",
        description: "Classic force out by gripping the opponent"
      },
      oshidashi: {
        label: "Oshidashi",
        labelJa: "押し出し",
        description: "Frontal push out using a barrage of powerful hand thrusts to march the opponent out of the ring without touching the belt. A pure demonstration of oshi-zumo."
      },
      oshitaoshi: {
        label: "Oshitaoshi",
        labelJa: "押し倒し",
        description: "Overwhelming frontal push down that crushes the opponent directly into the clay."
      },
      yoritaoshi: {
        label: "Yoritaoshi",
        labelJa: "寄り倒し",
        description: "Devastating frontal force down, collapsing the opponent backward while maintaining a solid belt grip."
      },
      tsukidashi: {
        label: "Tsukidashi",
        labelJa: "突き出し",
        description: "Violent thrust out, using rapid open-palm strikes to send the opponent reeling across the boundary."
      },
      tsukitaoshi: {
        label: "Tsukitaoshi",
        labelJa: "突き倒し",
        description: "Ferocious thrust down that knocks the opponent completely off their feet."
      },
      abisetaoshi: {
        label: "Abisetaoshi",
        labelJa: "浴びせ倒し",
        description: "Backward force down where the attacker leans heavily, using their entire body weight to flatten the defender into the clay."
      },
      hatakikomi: {
        label: "Hatakikomi",
        labelJa: "叩き込み",
        description: "Slap down using the opponent\\"
      },
      hikiotoshi: {
        label: "Hikiotoshi",
        labelJa: "引き落とし",
        description: "Hand pull down"
      },
      okuridashi: {
        label: "Okuridashi",
        labelJa: "送り出し",
        description: "Rear push out"
      },
      tsuriotoshi: {
        label: "Tsuriotoshi",
        labelJa: "吊り落とし",
        description: "Lift-and-drop"
      },
      tsuridashi: {
        label: "Tsuridashi",
        labelJa: "吊り出し",
        description: "Lift out"
      },
      utchari: {
        label: "Utchari",
        labelJa: "打っ棄り",
        description: "Pivot sweep throw"
      },
      okuritaoshi: {
        label: "Okuritaoshi",
        labelJa: "送り倒し",
        description: "Rear push down"
      },
      katasukashi: {
        label: "Katasukashi",
        labelJa: "肩すかし",
        description: "Under-shoulder swing down"
      },
      sokubiotoshi: {
        label: "Sokubiotoshi",
        labelJa: "素首落とし",
        description: "Neck-slap down"
      },
      okurigake: {
        label: "Okurigake",
        labelJa: "送り掛け",
        description: "Rear leg trip"
      },
      okurihikiotoshi: {
        label: "Okurihikiotoshi",
        labelJa: "送り引き落とし",
        description: "Rear pull down"
      },
      waridashi: {
        label: "Waridashi",
        labelJa: "割り出し",
        description: "Upper-arm frontal push out"
      },
      okurinage: {
        label: "Okurinage",
        labelJa: "送り投げ",
        description: "Rear throw"
      },
      tsukaminage: {
        label: "Tsukaminage",
        labelJa: "つかみ投げ",
        description: "Grabbing throw"
      },
      okuritsuridashi: {
        label: "Okuritsuridashi",
        labelJa: "送り吊り出し",
        description: "Rear lift out"
      },
      okuritsuriotoshi: {
        label: "Okuritsuriotoshi",
        labelJa: "送り吊り落とし",
        description: "Rear lift and drop"
      },
      yobimodoshi: {
        label: "Yobimodoshi",
        labelJa: "呼び戻し",
        description: "Pulling body slam"
      },
      ushiromotare: {
        label: "Ushiromotare",
        labelJa: "後ろもたれ",
        description: "Backward leaning out"
      },
      uwatenage: {
        label: "Uwatenage",
        labelJa: "上手投げ",
        description: "A magnificent overarm throw, leveraging an outside belt grip to hurl the opponent to the dirt."
      },
      sukuinage: {
        label: "Sukuinage",
        labelJa: "掬い投げ",
        description: "A swift beltless arm throw, scooping the opponent under their arm and tossing them down."
      },
      shitatenage: {
        label: "Shitatenage",
        labelJa: "下手投げ",
        description: "A sharp underarm throw that uses an inside belt grip to pivot and drop the opponent."
      },
      kotenage: {
        label: "Kotenage",
        labelJa: "小手投げ",
        description: "Armlock throw"
      },
      shitatedashinage: {
        label: "Shitatedashinage",
        labelJa: "下手出し投げ",
        description: "Pulling underarm throw"
      },
      uwatedashinage: {
        label: "Uwatedashinage",
        labelJa: "上手出し投げ",
        description: "Pulling overarm throw"
      },
      kubinage: {
        label: "Kubinage",
        labelJa: "首投げ",
        description: "Headlock throw"
      },
      koshihineri: {
        label: "Koshihineri",
        labelJa: "腰捻り",
        description: "Hip twist throw"
      },
      ipponzeoi: {
        label: "Ipponzeoi",
        labelJa: "一本背負い",
        description: "One-armed shoulder throw"
      },
      nichonage: {
        label: "Nichonage",
        labelJa: "二丁投げ",
        description: "Two-handed arm throw"
      },
      yaguranage: {
        label: "Yaguranage",
        labelJa: "櫓投げ",
        description: "Inner thigh throw"
      },
      kakenage: {
        label: "Kakenage",
        labelJa: "掛け投げ",
        description: "Hooking throw"
      },
      tsukiotoshi: {
        label: "Tsukiotoshi",
        labelJa: "突き落とし",
        description: "A lightning-fast twisting thrust down, redirecting the opponent\\"
      },
      tottari: {
        label: "Tottari",
        labelJa: "とったり",
        description: "Arm bar throw"
      },
      shitatehineri: {
        label: "Shitatehineri",
        labelJa: "下手捻り",
        description: "Underarm twisting throw"
      },
      uwatehineri: {
        label: "Uwatehineri",
        labelJa: "上手捻り",
        description: "Overarm twisting throw"
      },
      kotehineri: {
        label: "Kotehineri",
        labelJa: "小手捻り",
        description: "Armlock twisting throw"
      },
      amiuchi: {
        label: "Amiuchi",
        labelJa: "網打ち",
        description: "Fisherman\\"
      },
      kainahineri: {
        label: "Kainahineri",
        labelJa: "腕捻り",
        description: "Two-arm twisting throw"
      },
      zubuneri: {
        label: "Zubuneri",
        labelJa: "頭捻り",
        description: "Head-propping twisting throw"
      },
      sakatottari: {
        label: "Sakatottari",
        labelJa: "逆取ったり",
        description: "Wrapped arm throw"
      },
      kubiotoshi: {
        label: "Kubiotoshi",
        labelJa: "首落とし",
        description: "Neck-twisting throw"
      },
      gasshohineri: {
        label: "Gasshohineri",
        labelJa: "合掌捻り",
        description: "Clasped-hand twisting throw"
      },
      harimanage: {
        label: "Harimanage",
        labelJa: "波離間投げ",
        description: "Backward belt throw"
      },
      osakate: {
        label: "Osakate",
        labelJa: "大逆手",
        description: "Overarm leg-trip throw"
      },
      sabaori: {
        label: "Sabaori",
        labelJa: "鯖折り",
        description: "Forward force down"
      },
      sotokomata_hinerite: {
        label: "Sotokomata",
        labelJa: "外小股",
        description: "Outside thigh-scooping throw"
      },
      tokkurinage: {
        label: "Tokkurinage",
        labelJa: "徳利投げ",
        description: "Two-hand head-twisting throw"
      },
      makiotoshi: {
        label: "Makiotoshi",
        labelJa: "巻き落とし",
        description: "Twisting pull down"
      },
      uchimuso: {
        label: "Uchimuso",
        labelJa: "内無双",
        description: "Inner thigh-propping twist"
      },
      sotomuso: {
        label: "Sotomuso",
        labelJa: "外無双",
        description: "Outer thigh-propping twist"
      },
      ashitori: {
        label: "Ashitori",
        labelJa: "足取り",
        description: "Leg pick"
      },
      sotogake: {
        label: "Sotogake",
        labelJa: "外掛け",
        description: "Outside leg trip"
      },
      uchigake: {
        label: "Uchigake",
        labelJa: "内掛け",
        description: "Inside leg trip"
      },
      ketaguri: {
        label: "Ketaguri",
        labelJa: "蹴手繰り",
        description: "Ankle kick sweep"
      },
      watashikomi: {
        label: "Watashikomi",
        labelJa: "渡し込み",
        description: "Thigh-hook body drop"
      },
      kekaeshi: {
        label: "Kekaeshi",
        labelJa: "蹴返し",
        description: "Kicking back the leg"
      },
      kosotogake: {
        label: "Kosotogake",
        labelJa: "小外掛け",
        description: "Minor outside leg trip"
      },
      komatasukui: {
        label: "Komatasukui",
        labelJa: "小股掬い",
        description: "Over-thigh scooping throw"
      },
      chongake: {
        label: "Chongake",
        labelJa: "ちょん掛け",
        description: "Hooking heel trip"
      },
      kawarigake: {
        label: "Kawarigake",
        labelJa: "河津掛け",
        description: "Hooking backward trip"
      },
      susoharai: {
        label: "Susoharai",
        labelJa: "裾払い",
        description: "Ankle sweep"
      },
      kirikaeshi: {
        label: "Kirikaeshi",
        labelJa: "切り返し",
        description: "Twisting backward trip"
      },
      nimaigeri: {
        label: "Nimaigeri",
        labelJa: "二枚蹴り",
        description: "Ankle kick sweep"
      },
      omata: {
        label: "Omata",
        labelJa: "大股",
        description: "Thigh-scooping throw"
      },
      susotori: {
        label: "Susotori",
        labelJa: "裾取り",
        description: "Ankle pick"
      },
      mitokorozeme: {
        label: "Mitokorozeme",
        labelJa: "三所攻め",
        description: "Triple-point attack"
      },
      kosotogari: {
        label: "Kosotogari",
        labelJa: "小外刈",
        description: "Minor outside reap"
      },
      tsumatori: {
        label: "Tsumatori",
        labelJa: "褄取り",
        description: "Rear toe pick"
      },
      izori: {
        label: "Izori",
        labelJa: "居反り",
        description: "Backwards body drop"
      },
      kakezori: {
        label: "Kakezori",
        labelJa: "掛け反り",
        description: "Hooking back drop"
      },
      shumokuzori: {
        label: "Shumokuzori",
        labelJa: "撞木反り",
        description: "Bell-clapper back drop"
      },
      sototasukizori: {
        label: "Sototasukizori",
        labelJa: "外たすき反り",
        description: "Outer kimono-string back drop"
      },
      tasukizori: {
        label: "Tasukizori",
        labelJa: "たすき反り",
        description: "Kimono-string back drop"
      },
      tsutaezori: {
        label: "Tsutaezori",
        labelJa: "伝え反り",
        description: "Underarm back drop"
      },
      kimedashi: {
        label: "Kimedashi",
        labelJa: "極め出し",
        description: "Arm-barring force out"
      },
      kimetaoshi: {
        label: "Kimetaoshi",
        labelJa: "極め倒し",
        description: "Arm-barring force down"
      },
      isamiashi: {
        label: "Isamiashi",
        labelJa: "勇み足",
        description: "Inadvertent step out"
      },
      koshikudake: {
        label: "Koshikudake",
        labelJa: "腰砕け",
        description: "Collapsing"
      },
      tsukite: {
        label: "Tsukite",
        labelJa: "つき手",
        description: "Hand touch down"
      },
      tsukihiza: {
        label: "Tsukihiza",
        labelJa: "つきひざ",
        description: "Knee touch down"
      },
      fumidashi: {
        label: "Fumidashi",
        labelJa: "踏み出し",
        description: "Stepping out"
      },
      fusensho: {
        label: "Fusensho",
        labelJa: "不戦勝",
        description: "Win by default"
      },
      hansoku: {
        label: "Hansoku",
        labelJa: "反則",
        description: "Win by disqualification"
      }
    }
  };
  const matrix = {
    voices: [
      "neutral",
      "dramatic",
      "clinical",
      "folk",
      "tabloid"
    ],
    intensity_levels: [
      "T0",
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6"
    ],
    dimensions: {
      context: [
        "ritual_open",
        "tachiai",
        "center_control",
        "edge_pressure",
        "grip_battle",
        "stance_broken",
        "recovery",
        "turning_point",
        "throw_attempt",
        "trip_attempt",
        "slap_pull_attempt",
        "counter_window",
        "ring_escape",
        "finish",
        "ceremony_close"
      ],
      stance: [
        "square",
        "bladed",
        "twisted",
        "broken",
        "unknown"
      ],
      ring_state: [
        "center",
        "near_edge",
        "at_edge",
        "outside",
        "unknown"
      ],
      moment: [
        "setup",
        "contact",
        "surge",
        "stall",
        "swing",
        "resolve"
      ]
    },
    entries: [
      {
        id: "edge_pressure_T4_dramatic_001",
        context: "edge_pressure",
        intensity: "T4",
        voice: "dramatic",
        filters: {
          stance: [
            "broken",
            "twisted",
            "unknown"
          ],
          ring_state: [
            "near_edge",
            "at_edge"
          ],
          moment: [
            "swing",
            "resolve"
          ]
        },
        cooldown: {
          scope: "basho",
          min_days: 3
        },
        phrases: [
          "Phrase 1 for testing.",
          "Phrase 2 for testing."
        ],
        tags: {
          allowed_metaphor: true,
          allowed_crowd_beat: true,
          requires_fact_anchor: true
        }
      }
    ]
  };
  const domains = {
    combat: {
      phases: {
        ritual: {
          entrance: [
            "%EAST% steps onto the dohyo—greeted warmly.",
            "%WEST% follows, expression tight.",
            "%EAST% approaches the dohyo. The hall stirs.",
            "%WEST% rises. A ripple of anticipation.",
            "%EAST% and %WEST% take their marks."
          ],
          salt: [
            "%EAST% casts the salt high.",
            "%WEST% follows suit.",
            "The traditional purification ritual continues.",
            "Salt flies across the clay — a moment of centering."
          ],
          shikiri: [
            "They crouch at the shikiri-sen. The crowd holds its breath.",
            "They crouch at the shikiri-sen… no hesitation.",
            "Down to the line. Eyes locked. Waiting.",
            "At the shikiri-sen now. Fingers to the clay. Silence falls.",
            "The gyoji's fan rises. Both men settle into the squat. A hush descends."
          ]
        },
        tachiai: {
          intensity_1: [
            "The fan drops.",
            "%WINNER% wins the tachiai.",
            "A cautious tachiai… feeling for position.",
            "No wild rush — they meet and measure each other."
          ],
          intensity_2: [
            "The fan drops—*tachiai!*",
            "%WINNER% finds the better of it.",
            "They collide — neither gives an inch!",
            "Solid contact at the tachiai, straight into a battle!"
          ],
          intensity_3: [
            "A devastating charge from %WINNER%! He connects with terrifying force!",
            "%WINNER% explodes off the mark! A perfect, punishing tachi-ai!",
            "Tremendous impact! %WINNER% dictates the terms immediately!",
            "Like a freight train! %WINNER% bowls into his opponent!"
          ],
          henka: [
            "HENKA! %ATTACKER% sidesteps the charge and the crowd erupts!",
            "A sudden evasion! %ATTACKER% redirects the momentum, leaving %DEFENDER% to tumble past.",
            "Technical surprise — %ATTACKER% slips the hit and the hall gasps."
          ]
        },
        clinch: {
          belt: [
            "They lock up! A brutal test of pure strength on the belt!",
            "Deep grips established! It's a grinding battle of attrition now!",
            "They freeze in a massive embrace—four hands locked on the mawashi!",
            "A heavy yotsu-zumo battle begins! Neither giving an inch!"
          ],
          oshi: [
            "Hands at the chest—pure oshi-zumo!",
            "They struggle for position.",
            "%NAME% applies relentless forward pressure!",
            "%NAME% unleashes a vicious flurry of tsuppari!"
          ],
          rear: [
            "%LEADER% slips to the side — danger from behind!",
            "Angle taken! %LEADER% has %TRAILER% twisted!",
            "%LEADER% circles behind — %TRAILER% is in serious trouble!"
          ]
        },
        momentum: {
          recovery: [
            "Incredible balance! %NAME% dances on the straw to stay alive!",
            "A desperate parry from %NAME%! He survives the onslaught!",
            "%NAME% bends backward over the bales but refuses to fall!",
            "%NAME% survives the pressure."
          ],
          pressure: [
            "%NAME% maintains pressure.",
            "The attack continues! %NAME% leaves no room to breathe!",
            "%NAME% shifts gears, overwhelming the defense!",
            "%NAME% methodically breaks down his opponent's posture!"
          ]
        },
        finish: {
          common: [
            "And that is the conclusion. %WINNER% takes the victory.",
            "Resolution at the rope. %WINNER% is the victor.",
            "%WINNER% executing by %KIMARITE%.",
            "%WINNER% drives through with a textbook %KIMARITE%!"
          ],
          dramatic: [
            "%WINNER% stands tall, chest heaving, as the reality of the victory settles.",
            "The hall buzzes with the electricity of that encounter.",
            "%WINNER% accepts the win with stoic grace. A true warrior.",
            "An unforgettable finish! %WINNER% cements his legacy today!"
          ],
          kinboshi: [
            "A historic kinboshi! The arena erupts into chaos as a rain of purple zabuton floods the dohyo!",
            "The Maegashira has toppled the Yokozuna! A golden star is born today."
          ],
          ginboshi: [
            "An upset for the ages! The Maegashira has taken a silver star from the Ozeki!",
            "Institutional shock! %WINNER% overcomes the Ozeki with a stunning performance."
          ]
        }
      },
      kimarite: {
        "oshi-dashi": [
          "%WINNER% drives %LOSER% out of the ring with a standard oshidashi.",
          "Steady pressure from %WINNER% results in an oshidashi win."
        ],
        "yori-kiri": [
          "%WINNER% maintains the grip and walks %LOSER% over the limit.",
          "A classic yorikiri finish for %WINNER%."
        ],
        yorikiri: [
          "With a firm grip on the mawashi, %WINNER% demonstrated exceptional power and technique, steadily driving %LOSER% out of the ring for a decisive yorikiri.",
          "%WINNER% maintained relentless forward pressure, never letting go of %LOSER%'s mawashi, eventually forcing %LOSER% over the edge in a masterful display of yorikiri."
        ],
        oshidashi: [
          "%WINNER% delivered a series of powerful shoves, pushing %LOSER% directly backward and out of the dohyo for an oshidashi victory.",
          "A strong initial charge from %WINNER% quickly transitioned into a relentless push, sending %LOSER% out of the ring with an impressive oshidashi."
        ],
        oshitaoshi: [
          "%WINNER% executed a powerful, driving push, causing %LOSER% to lose balance and fall forward onto the dohyo for an oshitaoshi.",
          "After a sustained forward drive, %WINNER% applied the final decisive push, sending %LOSER% tumbling to the clay in a convincing oshitaoshi."
        ],
        yoritaoshi: [
          "Securing a deep mawashi grip, %WINNER% applied immense pressure, forcing %LOSER% down onto the dohyo surface for a clear yoritaoshi.",
          "Maintaining a powerful hold, %WINNER% expertly leveraged %LOSER%'s position at the edge, bringing %LOSER% crashing down for a well-executed yoritaoshi."
        ],
        tsukidashi: [
          "%WINNER% unleashed a barrage of rapid thrusts, effectively driving %LOSER% straight back and out of the ring for a swift tsukidashi.",
          "A flurry of powerful tsuppari from %WINNER% overwhelmed %LOSER%, propelling them over the straw bales for a quick tsukidashi victory."
        ],
        tsukitaoshi: [
          "A powerful finishing blow from %WINNER%! He delivers a final, decisive thrust to the chest that sends %LOSER% tumbling backwards off the dohyo. The kimarite is tsukitaoshi.",
          "Steady pressure from %WINNER% culminates in a sharp thrust, leaving %LOSER% with no footing as he falls back onto the clay. That is tsukitaoshi, the thrust down."
        ],
        abisetaoshi: [
          "In a pure test of weight and leverage, %WINNER% leans his entire frame into the smaller man, forcing %LOSER% straight back under the pressure. Abisetaoshi is the winning technique.",
          "No way out for %LOSER% there; %WINNER% kept the belt grip and used his momentum to overbalance his opponent, crushing him down to the straw. A textbook abisetaoshi."
        ],
        hatakikomi: [
          "%LOSER% came in with a low, aggressive charge, but %WINNER% was ready with the sidestep and a sharp slap to the shoulder. Down goes %LOSER% to the dirt! Hatakikomi.",
          "A quick-thinking reaction at the tachiai by %WINNER%. He avoids the initial contact and slaps %LOSER% down to the surface. Hatakikomi, the slap down."
        ],
        hikiotoshi: [
          "The momentum of %LOSER% was his own undoing. %WINNER% retreats slightly, catches the arm, and pulls his opponent forward into the clay. Hikiotoshi is the call.",
          "A swift downward pull by %WINNER% catches %LOSER% off balance. He can't get his feet underneath him and hits the dirt. Hand pull down—hikiotoshi."
        ],
        okuridashi: [
          "A brilliant maneuver to take the back! %WINNER% spins his opponent around and shoves %LOSER% out over the straw from behind. Okuridashi.",
          "%LOSER% is caught completely out of position, and %WINNER% wastes no time, driving him out of the ring from the rear. That's okuridashi, the rear push out."
        ],
        tsuriotoshi: [
          "A display of sheer brute strength! %WINNER% gets deep on the mawashi, hoists %LOSER% completely off the clay, and slams him down for a clinical tsuriotoshi.",
          "Incredible power from %WINNER%! He lifts %LOSER% clear into the air and drops him right where he stands. That is a rare and dominant lifting body slam."
        ],
        tsuridashi: [
          "The crane-crush! %WINNER% secures the double inside grip, lifts %LOSER% off the ground, and carries him over the straw bales for the win.",
          "There is the lift we were looking for! %WINNER% shows his superior leverage, hoisting %LOSER% into the air and depositing him safely outside the ring."
        ],
        utchari: [
          "What a spectacular reversal at the edge! %WINNER% was on the very brink of defeat, but he leans back and twists %LOSER% over in a classic utchari!",
          "A miracle on the tawara! %WINNER% uses the circular momentum of the ring to spin %LOSER% out just as he was being pushed toward the cushions."
        ],
        okuritaoshi: [
          "%WINNER% manages to get behind his opponent, and with a firm shove to the back, sends %LOSER% sprawling forward onto the clay.",
          "The rear-push down! %WINNER% skillfully takes the back of %LOSER% and drives him down for a textbook okuritaoshi."
        ],
        katasukashi: [
          "A brilliant technical move! %WINNER% ducks under the arm, grabs the far shoulder, and pulls %LOSER% down to the dirt in one fluid motion.",
          "The under-shoulder swing down! %WINNER% uses %LOSER%'s own forward momentum against him, slipping under the attack and guiding him to the floor."
        ],
        sokubiotoshi: [
          "A sudden downward thrust by %WINNER%! He gripped the back of the neck and snapped %LOSER% down to the clay before he could react. Sokubiotoshi, the head-neck pull-down.",
          "And %LOSER% was leaning in just a bit too far. %WINNER% takes advantage, grabbing the head and pulling it straight down to the sand. That is sokubiotoshi, a textbook execution."
        ],
        okurigake: [
          "%WINNER% maneuvers beautifully to the rear, and there is the trip! %LOSER% is caught off balance as %WINNER% hooks the leg from behind. Okurigake, the rear leg trip.",
          "He’s behind him! %WINNER% secures the back and deftly trips the leg of %LOSER%, sending him tumbling. A rare and skillful okurigake to end this bout."
        ],
        okurihikiotoshi: [
          "%WINNER% secures the back and simply pulls %LOSER% down from behind. A clinical okurihikiotoshi to finish it here in the upper divisions.",
          "Total loss of balance for %LOSER% as %WINNER% gets behind and applies the downward pressure. The kimarite is okurihikiotoshi, the rear pull-down."
        ],
        waridashi: [
          "Powerful work by %WINNER%, using that deep grip on the upper arm to force %LOSER% out of the ring. That will be ruled a waridashi, the upper-arm force out.",
          "%WINNER% wedges the arm and drives forward with immense pressure, ushering %LOSER% over the straw bales. A classic waridashi, showing great technical strength."
        ],
        okurinage: [
          "He’s taken the back! %WINNER% lifts and swings %LOSER% down to the dirt with a powerful rotation. A spectacular okurinage, the rear throw.",
          "No chance for %LOSER% once %WINNER% got behind him. A quick pivot and a throw from the rear—okurinage is the winning technique."
        ],
        tsukaminage: [
          "An incredible display of raw strength! %WINNER% gets a deep grip on the mawashi, hoists %LOSER% completely off the clay, and flings him down. That is the rare lifting throw, tsukaminage!",
          "We haven't seen this in the top division for years! %WINNER% simply overpowered his opponent, lifting %LOSER% by the belt and swinging him to the dirt. A spectacular tsukaminage victory."
        ],
        okuritsuridashi: [
          "%WINNER% works his way to the back, secures a firm grip, and hoists %LOSER% into the air, carrying him safely over the straw bales. Okuritsuridashi is the official technique.",
          "Total dominance from behind as %WINNER% lifts %LOSER% off his feet and steps out of the ring. A textbook rear lift-out to end this encounter."
        ],
        okuritsuriotoshi: [
          "A powerful finish! %WINNER% takes the back, lifts %LOSER% high, and slams him directly down onto the sand. The judges rule that an okuritsuriotoshi.",
          "He had him airborne! %WINNER% moved behind his opponent, executed the lift, and then dropped %LOSER% to the floor. That's the rear lift-down throw, okuritsuriotoshi."
        ],
        yobimodoshi: [
          "The ultimate counter-throw! %WINNER% lures his opponent in, reacts to the charge, and uses %LOSER%'s own momentum to pull him down. A classic yobimodoshi!",
          "Beautifully executed! %WINNER% pulls %LOSER% toward him and swings him down in one fluid motion. The 'call-back' throw, yobimodoshi, brings the crowd to their feet."
        ],
        ushiromotare: [
          "An unusual sight here at the Kokugikan! %WINNER% had his back to his opponent but simply leaned back with all his weight, forcing %LOSER% out of the ring. Ushiromotare is the call.",
          "Despite being turned around, %WINNER% maintains his balance and uses his back to push %LOSER% over the straw. A rare backward leaning out for the win."
        ],
        uwatedashinage: [
          "A superb display of leverage! %WINNER% secures the deep overarm grip and, with a sudden pivot, pulls %LOSER% forward and down to the clay. That is uwatedashinage, the pulling overarm throw.",
          "The momentum was shifted in an instant. %WINNER% didn't wait for a frontal attack, instead using that outer grip to swing %LOSER% off-balance. A textbook uwatedashinage to end the match."
        ],
        kubinage: [
          "A desperate but effective maneuver! %WINNER% wraps the arm firmly around the neck and whips %LOSER% down to the dohyo. The neck throw, kubinage, gives %WINNER% the win.",
          "The grip on the belt wasn't there, so %WINNER% goes for the headlock! A powerful twist of the upper body sends %LOSER% sprawling. The judges confirm the technique as kubinage."
        ],
        koshihineri: [
          "Incredible strength in the midsection! %WINNER% gets the hips low, hooks the opponent, and uses a powerful twisting motion to rotate %LOSER% over the hip. A rare and impressive koshihineri.",
          "We don't see the hip-twist throw often in the top division! %WINNER% used the hip as a fulcrum to torque %LOSER% onto the sandy surface. The kimarite is koshihineri."
        ],
        ipponzeoi: [
          "A spectacular sight at the edge of the ring! %WINNER% traps the arm with both hands and launches %LOSER% over the shoulder. That is the ipponzeoi, a rare one-armed over-the-shoulder throw!",
          "Pure technical brilliance from %WINNER%! Using %LOSER%'s own forward pressure, %WINNER% executes the shoulder throw to perfection. Ipponzeoi is the official winning technique."
        ],
        nichonage: [
          "Perfect timing on the lower body! %WINNER% hooks the leg while initiating the throw, taking the foundation right out from under %LOSER%. A beautiful nichonage, the two-point leg sweep throw.",
          "The legs were the key there. %WINNER% blocks the path and sweeps through, ensuring %LOSER% has nowhere to step. The referee signals for %WINNER% via nichonage."
        ],
        yaguranage: [
          "A spectacular display of traditional technique! %WINNER% gets the leg deep inside, hoists %LOSER% up onto the hip, and executes a classic yaguranage inner thigh throw.",
          "Extraordinary leverage from %WINNER%! Using the inner thigh to hoist %LOSER% right off the surface of the dohyo. That is the rarely seen yaguranage, the inner thigh throw!"
        ],
        kakenage: [
          "The leg is hooked! %WINNER% wraps his limb around the inner thigh of %LOSER% and drives through with a textbook kakenage to finish the bout.",
          "A battle of balance on the straw, but %WINNER% finds the opening, hooks the leg securely, and sends %LOSER% to the clay with a hooking inner thigh throw."
        ],
        tsukiotoshi: [
          "%LOSER% was charging forward with a head of steam, but %WINNER% sidesteps and applies a powerful downward thrust! Tsukiotoshi is the winning technique.",
          "A sudden shift in momentum at the edge! %WINNER% catches the shoulder of %LOSER% and drives him straight down to the sand. A clinical thrust-down victory."
        ],
        tottari: [
          "He's got the arm! %WINNER% clamps down on the limb of %LOSER% with both hands and pulls him across the ring for a masterful tottari.",
          "The arm bar is locked in perfectly. %WINNER% uses the forward momentum of %LOSER% against him, pivoting sharply for the tottari arm bar throw."
        ],
        shitatehineri: [
          "Deep inside with the underarm grip, %WINNER% applies the torque and twists! %LOSER% simply can't stay upright. Shitatehineri, the underarm twist down.",
          "Superb control from the inside position. %WINNER% rotates his torso, forcing %LOSER% down to the clay with a beautiful shitatehineri."
        ],
        watashikomi: [
          "A textbook watashikomi! %WINNER% maintains the forward pressure, reaches down to snag the thigh of %LOSER%, and drives him straight onto the clay.",
          "Watch the hand placement of %WINNER% here; as he pushes forward, he secures the leg and uses that extra leverage to force %LOSER% down. A decisive thigh-grabbing push down."
        ],
        kekaeshi: [
          "A lightning-fast flick of the foot! %WINNER% employs the kekaeshi to clip the inner ankle of %LOSER%, sending him off balance and down in an instant.",
          "Beautiful timing on that minor inner-foot sweep. %WINNER% waited for the weight to shift and then kicked the leg out from under %LOSER% just as he was trying to reset."
        ],
        kosotogake: [
          "He hooks the leg! %WINNER% goes for the kosotogake, wrapping his calf around the outside of %LOSER%'s ankle and driving through with all his weight for the win.",
          "A classic minor outer leg trip. %WINNER% secures the overarm grip and hooks the leg, leaving %LOSER% with absolutely nowhere to step."
        ],
        komatasukui: [
          "What a scoop! %WINNER% reaches deep under the thigh for a komatasukui, lifting %LOSER% off his feet and dumping him onto the dohyo in spectacular fashion.",
          "Superb technical skill from %WINNER%. He caught the inner thigh of %LOSER% as he tried to circle away, executing a perfect over-thigh scooping body drop."
        ],
        chongake: [
          "The rarest of sights here in the top division! %WINNER% executes a chongake, hooking his own heel around the opposite heel of %LOSER% and pulling him backward to the floor.",
          "Incredible balance shown by %WINNER%! He hooks the heel from the inside and pulls the rug out; %LOSER% can't find his footing and falls to the hooking heel trip."
        ],
        kawarigake: [
          "A sudden shift in momentum! %WINNER% switches the angle, hooks the leg from the inside, and down goes %LOSER%! That is kawarigake, the changing-trip, executed with brilliant timing.",
          "Beautiful agility shown by %WINNER%. As %LOSER% pressed forward, %WINNER% changed his stance, caught the inner leg, and used that leverage to bring his opponent to the clay. Kawarigake is the official technique."
        ],
        susoharai: [
          "What a spectacular sweep! %WINNER% waits for the exact moment %LOSER% steps forward and brushes the ankle away from the outside. Susoharai, the ankle sweep, brings a quick end to this encounter.",
          "Precision timing by %WINNER%! He catches the trailing leg of %LOSER% with a sharp sweep, sending him tumbling. That is the susoharai, a rare and skillful display of footwork."
        ],
        kirikaeshi: [
          "The drive was there for %LOSER%, but %WINNER% sets the trap! He plants the leg behind the knee and twists backward with immense power. Kirikaeshi, the twisting backward knee trip, secures the win.",
          "A classic defensive maneuver! %WINNER% uses the momentum of %LOSER% against him, hooking the leg and pivoting for a textbook kirikaeshi. The veteran experience really showed in that transition."
        ],
        nimaigeri: [
          "Incredible footwork on the dohyo! %WINNER% delivers a sharp kick to the ankle while simultaneously applying a downward twist. %LOSER% loses his footing instantly. Nimaigeri is the call from the shimpan.",
          "A rare display of technical prowess! %WINNER% catches the ankle with a swift kicking motion, unbalancing %LOSER% and forcing the fall. That is nimaigeri, the ankle-kicking twist down."
        ],
        omata: [
          "%LOSER% overreaches, and %WINNER% is right there to capitalize! He scoops deep under the thigh, lifting and dropping %LOSER% in one fluid motion. That is omata, the thigh-scooping body drop!",
          "The balance is gone! %WINNER% reaches in to grab the inner thigh of %LOSER% and uses that leverage to force the collapse. A superb execution of the omata to end this bout."
        ],
        susotori: [
          "A remarkable show of agility as %WINNER% drops level, snatching the ankle of %LOSER% and pulling it upward to send him to the clay. That is the ankle-pick, susotori.",
          "Watch the replay here; %WINNER% waits for the pivot and then sweeps the trailing leg by the ankle. A perfectly timed susotori to secure the win against %LOSER%."
        ],
        mitokorozeme: [
          "Unbelievable! We are seeing the rarest of sights! %WINNER% has the leg hooked, the other hand on the thigh, and the head buried in the chest—it's the triple-attack, mitokorozeme! %LOSER% had no escape.",
          "A technical masterpiece by %WINNER%! He employs the mitokorozeme, attacking three points simultaneously to force %LOSER% over the straw bales. A rare treat for the fans in attendance."
        ],
        kosotogari: [
          "A subtle but devastating clip to the heel. %WINNER% reaps the outer leg of %LOSER% just as he was shifting his weight. The official kimarite is kosotogari.",
          "%WINNER% stays low and catches the outside of the ankle. It’s a minor outer reap, kosotogari, and %LOSER% simply couldn't recover his balance in time."
        ],
        tsumatori: [
          "Incredible reflexes! As %LOSER% stepped forward, %WINNER% reached down and snatched the toe, pulling it back to upend his opponent. Tsumatori is the call from the judges.",
          "The timing had to be precise, and %WINNER% delivered. He caught the tip of the foot of %LOSER% mid-stride, executing a textbook tsumatori to end the match."
        ],
        izori: [
          "He's gone under! %WINNER% ducks the charge, grabs the thighs, and arches his back to send %LOSER% flying over his head! A sensational izori backward body drop!",
          "The crowd is in an absolute frenzy! %WINNER% used %LOSER%'s own momentum against him, diving low for the rare izori. You don't see that technique every day in the top division."
        ],
        kakezori: [
          "Unbelievable! %WINNER% hooks the leg from the inside, arches his back, and pulls %LOSER% right over the top of him! That is the hooking backward body drop, a rare kakezori!",
          "A technical marvel here in the Kokugikan! %WINNER% secures the leg, leans back with incredible flexibility, and %LOSER% is sent flying backwards. The judges confirm: kakezori!"
        ],
        shumokuzori: [
          "I don't believe my eyes! %WINNER% ducks under the arm, hoists %LOSER% across his shoulders like a bell hammer, and drops to the clay! A spectacular shumokuzori, a technique we haven't seen in years!",
          "History made on the dohyo! %WINNER% carries %LOSER% across the back of his neck and falls backward for the shumokuzori. The crowd is on their feet for that incredible display of strength and technique."
        ],
        sototasukizori: [
          "Precision from %WINNER%! He reaches around the outside to grab the leg of %LOSER%, ducks his head under the arm, and pulls him over the shoulder. That's the outer tasuki-grip backward body drop, sototasukizori!",
          "What a maneuver! %WINNER% goes for the outer leg-trip while leaning back, forcing %LOSER% to tumble over him. A textbook execution of sototasukizori by the smaller man!"
        ],
        tasukizori: [
          "A technical masterpiece! %WINNER% wraps one arm under the leg and the other over the shoulder of %LOSER%, creating that cross-body leverage for a stunning tasukizori!",
          "%WINNER% uses the reverse hand-grip backward body drop! He pulls %LOSER% across his chest and falls back, making sure his opponent hits the sand first. Tasukizori is the official call."
        ],
        tsutaezori: [
          "Incredible agility! %WINNER% ducks under the extended arm of %LOSER%, circles around the back while maintaining the arm-lock, and pulls him down. That will be ruled a tsutaezori!",
          "%WINNER% slides under the charge, shifts his weight, and uses the underarm forward body drop to send %LOSER% to the floor. A brilliant tsutaezori to end the match!"
        ],
        tsukihiza: [
          "A sudden loss of balance there by %LOSER%. As he tried to adjust his footing, his knee touched the clay before any offensive move was completed. The victory goes to %WINNER% via tsukihiza.",
          "Oh, a self-inflicted error for %LOSER%! He buckles under his own momentum and his knee hits the sand. %WINNER% didn't have to do much there, but he'll take the win by knee-touchdown."
        ],
        fumidashi: [
          "Wait, let's look at the feet. %LOSER% was retreating and simply lost track of his position, stepping over the straw bales with no contact from his opponent. %WINNER% wins it by fumidashi.",
          "A lapse in concentration for %LOSER% as he inadvertently steps outside the ring. That is a rare unforced error, a rear out-of-bounds, handing the match to %WINNER%."
        ],
        fusensho: [
          "An unfortunate announcement for the fans today as %LOSER% has been forced to withdraw from the tournament. %WINNER% enters the dohyo alone to receive the win by default, or fusensho.",
          "The white circle is marked on the board for %WINNER% this afternoon. With %LOSER% absent due to injury, this bout is decided by fusensho, a victory by forfeit."
        ],
        hansoku: [
          "The shinpan are signaling a foul! It appears %LOSER% made illegal contact with the topknot of his opponent. A disqualification is called, and %WINNER% is awarded the win by hansoku.",
          "A rare and dramatic end to this bout. The judges have ruled that %LOSER% used a prohibited technique, resulting in an immediate loss. %WINNER% takes the match via hansoku."
        ]
      },
      engagement: {
        push: {
          intensity_1: [
            "%ATTACKER% moves forward with cautious thrusts.",
            "Standard oshi-zumo as %ATTACKER% maintains distance.",
            "%ATTACKER% probes the defense with steady pushing."
          ],
          intensity_2: [
            "Heavy thrusts from %ATTACKER% begin to tell.",
            "Professional pressure! %ATTACKER% dictates terms with the palms.",
            "%ATTACKER% finds a rhythm with the tsuppari, driving forward."
          ],
          intensity_3: [
            "Thunderous oshi-zumo! %ATTACKER% detonates against the chest!",
            "Relentless, piston-like thrusts from %ATTACKER%! Total dominance!",
            "%ATTACKER% overwhelms the defense with a ferocious barrage!"
          ]
        },
        belt: {
          intensity_1: [
            "They lock up on the belt. A steady test of strength.",
            "%ATTACKER% secures a standard grip and settles in.",
            "A technical battle for leverage begins on the mawashi."
          ],
          intensity_2: [
            "Resolute yotsu-zumo! %ATTACKER% commands the position.",
            "%ATTACKER% secures the favored grip and begins to drive.",
            "Professional grappling. %ATTACKER% establishes iron control."
          ],
          intensity_3: [
            "A monumental struggle! %ATTACKER% wrenches the belt with extraordinary force!",
            "Deep moro-zashi established! %ATTACKER% is decimated the defense!",
            "Total control! %ATTACKER% anchors onto the mawashi and dictates every move!"
          ]
        },
        trick: {
          intensity_1: [
            "%ATTACKER% probes with a subtle feint.",
            "A calculated pull-down attempt by %ATTACKER%.",
            "Technical maneuver — %ATTACKER% looks to redirect the momentum."
          ],
          intensity_2: [
            "Brilliant ring sense! %ATTACKER% executes a sharp parry.",
            "%ATTACKER% neutralizes the charge with expert timing.",
            "Masterful redirection. %ATTACKER% outmaneuvers the opponent."
          ],
          intensity_3: [
            "Incredible sleight of hand! %ATTACKER% shatters the momentum!",
            "Electric agility! %ATTACKER% vanishes from the line of fire!",
            "A spectacular technical reversal! %ATTACKER% conquers with pure savvy!"
          ]
        },
        speed: {
          intensity_1: [
            "%ATTACKER% shuffles laterally, looking for an opening.",
            "Steady footwork from %ATTACKER% at the center.",
            "%ATTACKER% probes the angle with quick movement."
          ],
          intensity_2: [
            "Blistering pace! %ATTACKER% commands the dohyo with speed.",
            "%ATTACKER% finds the better of the angles with a sharp pivot.",
            "Professional footwork. %ATTACKER% dictates the perimeter."
          ],
          intensity_3: [
            "Unstoppable velocity! %ATTACKER% flickers around the defense!",
            "%ATTACKER% explodes into the blind spot with extraordinary quickness!",
            "Lightning speed! %ATTACKER% decimates the posture with a rapid flank!"
          ]
        }
      }
    },
    medical: {
      injury: {
        sprain: [
          "A %SEVERITY% sprain slows %SHIKONA% down.",
          "Medical staff confirms a painful sprain to the joint.",
          "%SHIKONA% is nursing a %SEVERITY% sprain following that encounter."
        ],
        strain: [
          "An overextension leads to a %SEVERITY% muscle strain.",
          "%SHIKONA% favors the limb, clearly suffering a deep strain.",
          "Persistent strain will definitely affect the next outing."
        ],
        contusion: [
          "A brutal impact results in a %SEVERITY% contusion.",
          "Strategic concern: %SHIKONA% absorbs a heavy blow, causing deep bruising.",
          "Blunt force trauma results in a visible contusion."
        ],
        tear: [
          "A %SEVERITY% tear requires immediate professional attention.",
          "Institutional setback: %SHIKONA% has suffered a muscle tear.",
          "Diagnostic review confirms a structural tear to the soft tissue."
        ],
        fracture: [
          "A clean %SEVERITY% fracture to the bone. Exceptional misfortune.",
          "The impact has resulted in a structural fracture.",
          "%SHIKONA% is sidelined following a confirmed bone fracture."
        ],
        generic: [
          "%SHIKONA% withdraws with an undisclosed %SEVERITY% injury.",
          "Medical review in progress for a %SEVERITY% ailment.",
          "Physical condition downgraded following the last bout."
        ]
      }
    },
    scouting: {
      confidence: {
        unknown: [
          "Unknown",
          "Undiscovered",
          "No data"
        ],
        low: [
          "Limited observation",
          "Rough estimate",
          "Preliminary data"
        ],
        medium: [
          "Moderately scouted",
          "Fair observation",
          "Grounded estimate"
        ],
        high: [
          "Well-observed",
          "In-depth scouting",
          "Robust data"
        ],
        certain: [
          "Certain",
          "Verified",
          "Fact-checked"
        ]
      },
      qualifiers: {
        appears: [
          "appears",
          "seems to be",
          "looks like"
        ],
        may_be: [
          "may be",
          "could be",
          "possibly"
        ],
        unknown_narrative: [
          "Insufficient observation to determine %attr%."
        ]
      }
    },
    institutional: {
      welfare: {
        watch_headline: [
          "Heya Placed Under Regulatory Watch",
          "Compliance Alert: %HEYANAME% Monitored",
          "Welfare Review Triggered for %HEYANAME%"
        ],
        investigation_headline: [
          "Full-Scale Investigation Opened: %HEYANAME%",
          "JSA Launches Probe Into %HEYANAME% Operations",
          "Governance Crisis: Investigation at %HEYANAME%"
        ],
        sanction_headline: [
          "Sanctions Imposed on %HEYANAME%",
          "Association Penalizes %HEYANAME% for Welfare Violations",
          "Heavy Fines and Recruitment Freeze for %HEYANAME%"
        ],
        cleared_headline: [
          "Investigation Concluded: %HEYANAME% Cleared",
          "Regulatory Pressure Lifted for %HEYANAME%",
          "Heya Restored to Full Compliance Status"
        ]
      }
    },
    world: {
      venues: {
        Tokyo: {
          entrance: "Day %DAY% at the Ryogoku Kokugikan.",
          closing: "The sun sets over the Sumida River as the fans depart."
        }
      },
      seasonal: {
        winter: [
          "Cold winds blow across the Kokugikan as the tournament begins.",
          "The fresh spirit of the new year fills the arena."
        ],
        summer: [
          "Heat shimmers over the dohyo in the height of summer.",
          "Fans wave uchiwa as the temperature rises with the action."
        ]
      }
    },
    media: {
      bout: {
        upset: [
          "%WINNER% Stuns %LOSER%",
          "%WINNER% Shocks the Arena Against %LOSER%",
          "%LOSER% Falls — %WINNER% Seizes the Moment",
          "Massive Upset! %WINNER% Topples %LOSER%",
          "Unbelievable Scene: %WINNER% Defeats %LOSER%",
          "%LOSER% Caught Off Guard by a Resilient %WINNER%",
          "A Stunner in Tokyo! %WINNER% Beats %LOSER%",
          "David Defeats Goliath: %WINNER% Outlasts %LOSER%",
          "The Unthinkable Happens! %WINNER% Takes Down %LOSER%",
          "A Giant Falls: %WINNER% Secures the Ultimate Upset Against %LOSER%",
          "Nobody Predicted This! %WINNER% Topples %LOSER%",
          "The Biggest Shock of the Basho! %WINNER% Defeats %LOSER%",
          "Chaos in the Rankings! %LOSER% Upset by %WINNER%",
          "%WINNER% Silences the Critics with a Stunning Victory Over %LOSER%",
          "%WINNER% Defies the Odds, Stunning %LOSER%!",
          "A Tactical Masterclass: %WINNER% Dismantles %LOSER%"
        ],
        standard: [
          "%WINNER% Defeats %LOSER% by %KIMARITE%",
          "%WINNER% Overcomes %LOSER%",
          "%WINNER% Turns Back %LOSER%",
          "%WINNER% Proves Too Strong for %LOSER%",
          "Textbook Sumo: %WINNER% Dispatches %LOSER%",
          "%WINNER% Shows Superior Form Against %LOSER%",
          "%WINNER% Takes the Win with a Solid %KIMARITE%",
          "A Dominant Display as %WINNER% Beats %LOSER%",
          "%LOSER% Falls Short Against a Ready %WINNER%",
          "The Execution is Flawless — %WINNER% Dispatches %LOSER%",
          "A Masterclass by %WINNER% Against %LOSER%",
          "%WINNER% Comfortably Beats %LOSER% with %KIMARITE%",
          "No Surprises Here: %WINNER% Handles %LOSER%",
          "%WINNER% Stays Focused and Defeats %LOSER%",
          "A Solid Performance Earns %WINNER% the Victory Over %LOSER%",
          "Business as Usual: %WINNER% Cruises Past %LOSER%",
          "%WINNER% Shows Championship Form in Win Over %LOSER%",
          "A Methodical Takedown by %WINNER% Against %LOSER%",
          "%WINNER% Secures a Hard-Fought Win Against %LOSER%",
          "No Mistakes Made: %WINNER% Bests %LOSER%"
        ],
        mainEvent: [
          "%WINNER% Delivers in the Spotlight",
          "The Main Event Goes to %WINNER%",
          "%WINNER% Closes Out the Day with a Bang",
          "%WINNER% Proves They Belong in the Main Event",
          "A Spectacular Finale: %WINNER% Prevails",
          "%WINNER% Shines Brightest on the Grand Stage",
          "The Pressure Fails to Crack %WINNER% in the Main Event"
        ],
        subtitles: {
          upset: [
            "A momentum swing that changes the conversation.",
            "The crowd roars as the script flips.",
            "A result that won't be forgotten soon.",
            "The Kokugikan roof nearly blew off after that finish.",
            "Is this a fluke, or the beginning of a true crisis?"
          ],
          mainEvent: [
            "A crisp finish that keeps the pressure on.",
            "No hesitation — just execution.",
            "The race tightens with every day."
          ]
        }
      },
      streaks: {
        legendary: [
          "%SHIKONA% Is Unstoppable — %STREAK% Straight Wins",
          "%STREAK%-0: %SHIKONA% Rewrites the Narrative"
        ],
        hot: [
          "%SHIKONA% Surges to %STREAK% Consecutive Victories",
          "%STREAK% and Counting for %SHIKONA%"
        ],
        notable: [
          "%SHIKONA% Extends Win Streak to %STREAK%",
          "Hot Streak: %SHIKONA% Now %STREAK%-0",
          "%STREAK% Wins! %SHIKONA% Keeps Rolling"
        ]
      },
      subtitles: {
        legendary: [
          "The history books are being rewritten in real-time.",
          "Is there anyone left who can stand against this momentum?",
          "The dominance is becoming the only story in the hall."
        ],
        hot: [
          "Confidence is a physical presence in the ring now.",
          "The win streak is starting to draw national attention.",
          "Execution has been flawless for days."
        ],
        notable: [
          "A solid run that puts the rest of the division on notice.",
          "Consistency is building into a serious threat.",
          "The momentum is clearly shifting in one direction."
        ]
      }
    },
    system: {
      descriptors: {
        bands: {
          stats: {
            exceptional: "Exceptional",
            outstanding: "Outstanding",
            strong: "Strong",
            capable: "Capable",
            developing: "Developing",
            limited: "Limited",
            struggling: "Struggling"
          },
          fatigue: {
            fresh: "Fresh",
            tired: "Tired",
            worn: "Worn",
            exhausted: "Exhausted"
          },
          potential: {
            transcendent: "Transcendent",
            elite: "Elite",
            high: "High",
            average: "Average",
            low: "Low",
            unknown: "Unknown"
          }
        }
      }
    },
    events: {
      training: {
        milestone: [
          "%SHIKONA% is making measurable progress this week.",
          "A strong training cycle for %SHIKONA% — the work is paying off.",
          "%SHIKONA% continues to improve in key areas."
        ],
        title: [
          "Training Update",
          "%SHIKONA%: Training Progress",
          "Weekly Training Report"
        ],
        summary: [
          "%SHIKONA% has completed a successful training cycle.",
          "Steady improvement observed for %SHIKONA% this week.",
          "%HEYANAME% reports solid progress for %SHIKONA% on the clay."
        ],
        breakthrough_title: [
          "%SHIKONA% Breakthrough",
          "Major Progress for %SHIKONA%",
          "%SHIKONA%: Technical Leap"
        ]
      },
      economy: {
        kensho_title: [
          "Kensho prize money"
        ],
        kensho_summary: [
          "%ENVELOPES% envelope(s) awarded (¥%AMOUNT%)."
        ],
        special_prize_title: [
          "Special Prize Awarded!"
        ],
        special_prize_summary: [
          "Awarded %PRIZETYPE%-shō for outstanding performance (¥%AMOUNT%)."
        ],
        insolvency_title: [
          "Financial Insolvency"
        ],
        insolvency_summary: [
          "%HEYANAME% has run out of funds! Bankruptcy is an imminent threat."
        ],
        deficit_title: [
          "Operating Deficit"
        ],
        deficit_summary: [
          "%HEYANAME% is operating at a ¥%AMOUNT% deficit this month. Reserve funds are depleting.",
          "Financial pressure mounts: %HEYANAME% loses ¥%AMOUNT% after upkeep and salaries.",
          "Stability warning: %HEYANAME% spend exceeds income by ¥%AMOUNT%."
        ]
      },
      lifecycle: {
        title: [
          "Career Milestone",
          "Sumo Life Cycle Event"
        ],
        summary: [
          "A significant event in the career of %SHIKONA%."
        ],
        retirement_title: [
          "%SHIKONA% Retires",
          "Intai: %SHIKONA%"
        ],
        retirement_summary: [
          "After a distinguished career, %SHIKONA% has decided to hang up his mawashi.",
          "%SHIKONA% announces his retirement from professional sumo."
        ],
        naturalization_title: [
          "Naturalization: %SHIKONA%",
          "%SHIKONA% Obtains Citizenship"
        ],
        naturalization_summary: [
          "%SHIKONA% has officially completed the naturalization process, securing his future in the Association.",
          "Legal milestone: %SHIKONA% is now a Japanese citizen."
        ],
        merger_title: [
          "Stable Merger",
          "Heya Reorganization"
        ],
        merger_summary: [
          "Administrative shift: %HEYANAME% has completed a merger process."
        ]
      },
      rivalry: {
        formed_title: [
          "New rivalry emerges"
        ],
        formed_summary: [
          "%A_NAME% has developed a personal grudge against %B_NAME%."
        ],
        escalated_title: [
          "Rivalry intensifies (%HEAT%)"
        ],
        escalated_summary: [
          "The tension between %A_NAME% and %B_NAME% has reached a %HEAT% heat."
        ]
      },
      welfare: {
        alert_title: [
          "Welfare Alert"
        ],
        alert_summary: [
          "%HEYANAME% is under scrutiny for welfare compliance. Status: %STATUS%"
        ]
      },
      basho: {
        day_title: [
          "Day %DAY%"
        ],
        day_summary: [
          "Tournament day %DAY% begins."
        ],
        status_title: [
          "Basho Status Update",
          "Tournament News",
          "Kokugikan Report"
        ],
        status_summary: [
          "Tournament progress: %DAY% days concluded. Standing: %SHIKONA% (%WINS%-%LOSSES%).",
          "The race for the Cup continues. %SHIKONA% currently holds a %WINS%-%LOSSES% record.",
          "Basho Update: %SHIKONA% is %WINS%-%LOSSES% after a crucial day of action."
        ],
        bout_title: [
          "Bout concluded"
        ],
        bout_summary: [
          "Winner decided by %KIMARITE%."
        ],
        concluded_title: [
          "%BASHONAME% Basho Concluded"
        ],
        concluded_summary: [
          "%SHIKONA% wins the tournament with a dominant %WINS%-%LOSSES% record!",
          "The Emperor's Cup goes to %SHIKONA% after a historic performance.",
          "%SHIKONA% stands victorious at the end of the %BASHONAME% basho."
        ],
        playoff_title: [
          "Playoff Champion: %SHIKONA%"
        ],
        playoff_summary: [
          "%CONTENDERS% rikishi tied at %WINS% wins. %SHIKONA% wins the Cup via playoff victory.",
          "Drama at the Kokugikan! %SHIKONA% overcomes all rivals in the tie-breaker rounds.",
          "The tie-break concludes: %SHIKONA% is the last man standing."
        ],
        banzuke_reveal_summary: [
          "The official rankings have been posted. A new hierarchy takes shape.",
          "New ranks confirmed. The banzuke reveal shifts the landscape for the coming basho.",
          "The Association has published the banzuke. All eyes on the new promotions."
        ]
      },
      health: {
        injury_sustained: [
          "%SHIKONA% leaves training with an injury. Recovery timeline pending.",
          "Concern in the heya: %SHIKONA% has sustained an injury.",
          "%SHIKONA% will be sidelined. The medical staff is evaluating."
        ],
        financial_crisis: [
          "%HEYANAME% is operating at a deficit. Immediate action required.",
          "Financial pressure mounts at %HEYANAME%. Training capacity may be affected.",
          "%HEYANAME% faces a funding shortfall this period."
        ]
      },
      milestone: {
        hof_induction: [
          "%SHIKONA% is inducted into the Hall of Fame as a %CATEGORY%.",
          "Hall of Fame: %SHIKONA% joins the immortals of sumo as a %CATEGORY%.",
          "A legend enshrined: %SHIKONA% receives the highest honour, inducted as %CATEGORY%."
        ],
        year_boundary: [
          "The sumo world enters year %YEAR%.",
          "Year %YEAR% dawns. The rankings reset, the goals remain.",
          "A new year begins — year %YEAR% in the sumo calendar."
        ],
        decade_boundary: [
          "A new decade dawns in year %YEAR%. The era evolves.",
          "Year %YEAR% marks a generational shift. A decade turns.",
          "Ten years pass. Year %YEAR% opens a new chapter."
        ]
      },
      titles: {
        RECRUITMENT_WINDOW_CLOSED: [
          "Recruitment window closed"
        ],
        RECRUITMENT_BLOCKED_SANCTIONS: [
          "Recruitment blocked by sanctions"
        ],
        RECRUITMENT_WINDOW_OPEN: [
          "Recruitment window open"
        ],
        PHASE_TRANSITION: [
          "Phase transition"
        ],
        BANZUKE_REVEAL: [
          "Banzuke Hatsu-Dashi"
        ],
        MONTHLY_BOUNDARY: [
          "Financial cycle complete"
        ],
        MONTHLY_DEFICIT: [
          "Operating deficit"
        ],
        ARCHETYPE_DRIFT: [
          "Tactical shift"
        ],
        YEAR_BOUNDARY: [
          "Year %YEAR% begins"
        ],
        HOF_INDUCTION: [
          "Hall of Fame: %SHIKONA%"
        ],
        CAREER_WINS_MILESTONE: [
          "%SHIKONA% reaches %WINS% wins"
        ],
        HOF_ELIGIBLE: [
          "Hall of Fame eligibility reached"
        ],
        NPC_RECRUITMENT_SUMMARY: [
          "NPC stables recruit"
        ],
        TALENT_POOL_REINJECTION: [
          "Wrestler re-enters talent pool"
        ],
        HIGH_TALENT_SIGNED: [
          "Elite prospect signed"
        ],
        GOVERNANCE_SCANDAL_REPORTED: [
          "Scandal reported"
        ],
        GOVERNANCE_WARNING: [
          "JSA Warning"
        ],
        GOVERNANCE_STATUS_CHANGED: [
          "Governance status change"
        ],
        COMPLIANCE_SANCTIONS_LIFTED: [
          "Sanctions lifted"
        ],
        JSA_ELECTION: [
          "JSA Board Election"
        ],
        INJURY_SUSTAINED: [
          "%SHIKONA% Injured"
        ],
        GOVERNANCE_BAILOUT: [
          "Ichimon Bailout"
        ]
      },
      governance: {
        title: [
          "Governance Ruling",
          "Association Notice",
          "Institutional Decision",
          "JSA Ruling Issued"
        ],
        summary: [
          "A governance ruling has been issued regarding a recent incident.",
          "The Association has reviewed and responded to a reported matter.",
          "Institutional oversight has resulted in a formal decision.",
          "JSA officials have issued a ruling following an internal review."
        ]
      }
    },
    rikishi: {
      stats: {
        power: {
          exceptional: "His raw strength is fearsome — opponents buckle on first contact as if struck by a massive wall of concrete. He can dismantle defenses on sheer power alone.",
          outstanding: "A powerful frame that most men at this level simply cannot withstand for long. When he commits forward, the earth seems to tremble.",
          strong: "Solid, reliable strength. Enough to move most men and severely punish any passive opponents who try to stall the bout.",
          capable: "Adequate power for his rank. He won't effortlessly overwhelm anyone, but holds his own comfortably in the clinch.",
          developing: "Still building the deep muscle and leverage his rank demands. The raw potential is there, and improvement is visible.",
          limited: "Noticeably outpowered by most opponents. He relies heavily on technique, positioning, and speed to compensate for the strength gap.",
          struggling: "Physically overmatched in most contests. His raw strength is a distinct liability at this level of sumo."
        },
        speed: {
          exceptional: "Lightning quick — his first step and reaction time verge on the preternatural. By the time opponents set their feet, he is already executing his offense.",
          outstanding: "Fast enough to regularly catch opponents flat-footed before they can establish their grips or defensive posture.",
          strong: "Quick on his feet, able to exploit fleeting openings that slower, more deliberate men would miss entirely.",
          capable: "Moves adequately for his preferred style. His speed is neither a pronounced liability nor a primary weapon.",
          developing: "Could be quicker. His timing is still maturing, and momentary opportunities are occasionally left unexploited on the clay.",
          limited: "Noticeably sluggish compared to his peers. Opponents frequently dictate the pace, and he struggles to adjust laterally.",
          struggling: "Painfully slow to react and extremely easy to outmaneuver. Speed is a consistent, glaring weakness at this level."
        },
        balance: {
          exceptional: "His root is the stuff of legend — opponents describe pushing him as trying to shove a mountain. His center of gravity is an unbreakable anchor.",
          outstanding: "Exceptionally stable under immense pressure. He rarely loses footing, even in the most desperate, tangled scrambles.",
          strong: "Well-grounded and composed. He recovers remarkably well from disadvantaged positions and awkward angles.",
          capable: "Adequate balance for competitive sumo. He holds steady in most standard grappling situations without issue.",
          developing: "Sometimes caught leaning or off-angle. His balance is a work in progress and can fail under sustained, heavy pressure.",
          limited: "Unsteady under serious pressure. He is noticeably vulnerable to throws, pull-downs, and sudden shifts in momentum.",
          struggling: "Falls far too easily. Fundamental stability issues severely limit what he can attempt both offensively and defensively."
        },
        technique: {
          exceptional: "A transcendent master technician. Every grip, every angle, and every timing read is deliberate, precise, and flawlessly executed.",
          outstanding: "Highly skilled and deeply intuitive. He reads complex situations instantly and executes with the crisp clarity of a seasoned veteran.",
          strong: "A remarkably good technical foundation, featuring highly reliable execution of his preferred throwing and twisting techniques.",
          capable: "Sound fundamental basics. He can execute his core moves cleanly when the correct opportunity presents itself.",
          developing: "His technique is slowly improving but remains frustratingly inconsistent, particularly when he is put under heavy pressure.",
          limited: "Relies almost entirely on raw physicality over craft. Technical sophistication is a massive, gaping hole in his sumo game.",
          struggling: "Severely lacks the technical repertoire required to compete effectively. Opponents routinely exploit his sheer predictability."
        }
      },
      archetypes: {
        Defensive_Stalwart: {
          label: "Defensive Stalwart",
          description: "Calm, grounded, and almost impossible to rush. He absorbs pressure and turns it into opportunity, waiting for the moment his opponent overcommits."
        },
        Explosive_Blitzer: {
          label: "Explosive Blitzer",
          description: "The tachiai is his weapon. He ends fights in seconds — or he doesn't end them at all. Longer bouts expose a stamina cliff that opponents try desperately to reach."
        },
        Acrobatic_Trickster: {
          label: "Acrobatic Trickster",
          description: "Slippery, inventive, and infuriating to fight. He uses unpredictable angles, impeccable timing, and clever misdirection to make heavier, stronger opponents look completely foolish."
        },
        Immovable_Mountain: {
          label: "Immovable Mountain",
          description: "Once he plants himself, he is not going anywhere. His center of gravity is almost inhumanly low, and his patience is unlimited."
        },
        All_Rounder: {
          label: "All-Rounder",
          description: "No obvious weaknesses, no single predictable style. He adapts to whatever the bout demands — which is what makes him so difficult to game-plan against."
        }
      },
      descriptors: {
        condition: {
          Zekkouchou: {
            label: "Zekkouchou (絶好調)",
            tooltip: "Legs are deeply rooted; lungs are full. Maximum resistance to late-bout fatigue and throws."
          },
          "Bachi-bachi": {
            label: "Bachi-bachi (ばちばち)",
            tooltip: "Moving with snap and vigor. Capable of sustained pushing attacks."
          },
          "Iki-girashite": {
            label: "Iki-girashite (息を切らして)",
            tooltip: "Starting to breathe heavily. Susceptible to fatigue in extended grappling (Yotsu) bouts."
          },
          "Koshi-kudake": {
            label: "Koshi-kudake (腰砕け)",
            tooltip: "Legs are entirely gone. Highly vulnerable to pull-downs (Hikiotoshi) and slap-downs."
          }
        },
        morale: {
          "Shin-Gi-Tai": {
            label: "Shin-Gi-Tai (心技体)",
            tooltip: "Mind, technique, and body are aligned. Highly resistant to Henka (sidesteps) and pressure."
          },
          "Kiai juubun": {
            label: "Kiai juubun (気合十分)",
            tooltip: "Focused and aggressive. Likely to initiate a strong, forward-moving tachiai (initial charge)."
          },
          Mayoi: {
            label: "Mayoi (迷い)",
            tooltip: "Second-guessing their sumo. Tachiai may lack power; prone to being pushed back early."
          },
          Fugainai: {
            label: "Fugainai (不甲斐ない)",
            tooltip: "Completely demoralized. Prone to easy mistakes, false starts (Matta), and yielding the belt."
          }
        },
        potential: {
          "Taiki Bansei": {
            label: "Taiki Bansei (大器晩成)",
            tooltip: "A generational talent capable of reaching Yokozuna. Exceptional stat growth ceilings."
          },
          "Soshitsu Ari": {
            label: "Soshitsu Ari (素質あり)",
            tooltip: "Strong fundamentals. A definite San'yaku (champion) candidate if trained rigorously."
          },
          "Mikan no Taiki": {
            label: "Mikan no Taiki (未完の大器)",
            tooltip: "Average prospect. Will require specialized, intense training to survive the top division."
          },
          Genkai: {
            label: "Genkai (限界)",
            tooltip: "Physical limits are apparent. Best suited as a reliable lower-division stable pillar."
          }
        },
        momentum: {
          surging: "Surging",
          rising: "Rising",
          steady: "Steady",
          fading: "Fading",
          frozen: "Frozen"
        },
        rivalry: {
          none: "Neutral",
          simmering: "Simmering",
          heated: "Heated",
          boiling: "Boiling",
          legendary: "Legendary"
        },
        scandal: {
          none: "Clean Record",
          whispers: "Whispers",
          notable: "Under Review",
          severe: "On Probation",
          critical: "Critical Scrutiny"
        },
        prizes: {
          none: "None",
          shukun: "Shukun-shō",
          kanto: "Kantō-shō",
          gino: "Ginō-shō"
        },
        traits: {
          positive: "Gifted",
          negative: "Flawed",
          neutral: "Balanced"
        }
      }
    },
    npc: {
      strategy: {
        intensity: {
          conservative_risk: [
            "Focusing on stable survival — forced conservative training due to critical welfare risk."
          ],
          conservative_longevity: [
            "Prioritizing rikishi longevity — elevated welfare risk requires a cautious approach."
          ],
          conservative_stabilizing: [
            "Stabilizing the roster — %COUNT% wrestlers worn/fragile; reducing intensity to prevent injuries."
          ],
          balanced_friction: [
            "Managing stable friction — maintaining balanced training to avoid further morale decay."
          ],
          intensive_size: [
            "Mass-building specialized regimen — pushing hard to build world-class physical presence."
          ],
          balanced_standard: [
            "%PHILOSOPHY% cycle — maintaining steady upward trajectory."
          ],
          punishing_dominance: [
            "Uncompromising pursuit of dominance — imposing a punishing regimen for elite prospects."
          ],
          intensive_standard: [
            "Maximum performance output — intensive training to solidify top-tier standing."
          ],
          punishing_emotional: [
            "Oyakata's emotional state is driving punishing demands on the roster."
          ],
          balanced_operational: [
            "Standard operational cycle — maintaining balanced development."
          ],
          capped: [
            "(capped by sanctions to %CAP%)"
          ]
        },
        focus: {
          size_matters: [
            "Size-obsessed philosophy — power focus to bulk up roster"
          ],
          innovator: [
            "Innovator philosophy — speed & agility focus"
          ],
          traditionalist: [
            "Traditional philosophy — balance & fundamentals"
          ],
          traditionalist_yotsu: [
            "Traditionalist yotsu — emphasizing balance"
          ],
          traditionalist_power: [
            "Traditionalist approach — power focus"
          ],
          developing: [
            "Developing roster — building technique fundamentals"
          ],
          oshi_biased: [
            "Oshi-biased stable — power focus"
          ],
          yotsu_biased: [
            "Yotsu-biased stable — technique focus"
          ],
          neutral: [
            "Balanced training focus"
          ]
        },
        recovery: {
          critical: [
            "Critical health situation — maximum recovery"
          ],
          elevated: [
            "Elevated welfare concern — high recovery"
          ],
          minimal: [
            "Healthy roster — minimal recovery allocation"
          ],
          standard: [
            "Standard recovery emphasis"
          ]
        },
        scouting: {
          suspended: [
            "Financial crisis — scouting suspended"
          ],
          aggressive: [
            "Roster needs rebuilding — aggressive scouting"
          ],
          active_sleeper: [
            "Sleeper Scout personality — active scouting"
          ],
          active_ambitious: [
            "Ambitious manager seeking talent"
          ],
          passive_dominant: [
            "Dominant roster — passive scouting"
          ],
          passive_standard: [
            "Standard scouting activity"
          ]
        },
        protect: {
          active: [
            "Protecting %COUNT% wrestler(s) due to health concerns"
          ],
          none: [
            "No wrestlers require protection"
          ]
        }
      }
    },
    ui: {
      digest: {
        status: {
          injured: "%INJURY_COUNT% injury update this week.",
          no_events: "No major events recorded this week.",
          basho_day: "Basho Day %DAY%: %DETAIL%",
          healthy: "Healthy"
        },
        promotion: {
          ozeki_run: {
            imminent: "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent.",
            brink: "On the brink. A few more wins will secure the rank.",
            building: "Building a solid case, but needs a spectacular finish."
          },
          yokozuna_run: {
            standard: "Requires two consecutive yusho for promotion.",
            unanimous: "Unanimous Yokozuna Deliberation Council recommendation expected.",
            borderline: "Borderline case. The Council will scrutinize the quality of sumo.",
            partial: "Secured one Yusho. Must win the current basho to complete the run."
          }
        },
        kadoban: {
          fighting: "Fighting for survival as Kadoban Ozeki.",
          demoted: "Failed to clear Kadoban. Demotion to Sekiwake confirmed.",
          cleared: "Cleared Kadoban. Retains Ozeki rank.",
          danger: "In danger of falling to Kadoban status with another losing record."
        },
        sections: {
          injuries: "Injuries",
          economy: "Economy & Finance",
          matchups: "Key Matchups",
          governance: "Governance & Compliance",
          milestones: "Milestones & Awards",
          media: "Media & Headlines"
        }
      },
      labels: {
        kimarite: {
          rookie: "Unknown (Rookie)",
          display_format: "%NAME% (%PCT%%)"
        },
        injury: {
          severity: {
            minor: "Minor",
            moderate: "Moderate",
            severe: "Severe"
          },
          summary_format: "%SEV%%LOC% (%WEEKS%w)"
        },
        scouting: {
          reasons: {
            foreigner_limit: "Heya already at foreigner limit (1).",
            unavailable: "Candidate is no longer accepting offers.",
            not_found: "Candidate not found"
          }
        },
        stats: {
          power: "Power",
          speed: "Speed",
          technique: "Technique",
          spirit: "Spirit",
          ring_sense: "Ring Sense"
        }
      }
    },
    h2h: {
      first_meeting: [
        "These two are meeting for the very first time in the ring.",
        "A fresh matchup today; no prior history between these two.",
        "The crowd leans forward for this first-ever encounter.",
        "No data exists for this matchup - it's a complete unknown."
      ],
      domination: [
        "%P1% has absolutely dominated this matchup, leading the series %WINS%-%LOSSES%.",
        "%P2% has struggled historically here, winning only %LOSSES% of their %TOTAL% meetings.",
        "History is heavily on %P1%'s side today with a commanding %WINS%-%LOSSES% record."
      ],
      deadlock: [
        "This is as close as it gets—a %WINS%-%LOSSES% career split between them.",
        "A true rivalry! The record stands at %WINS% wins to %LOSSES%.",
        "Neither man has been able to gain a decisive edge in this series."
      ],
      streak: [
        "%P1% enters the ring confident, having won the last %STREAK% meetings against %P2%.",
        "%P1% is desperate to snap a %STREAK%-bout losing streak against %P2%."
      ],
      recent: [
        "Last time they met on Day %DAY%, %WINNER% won decisively by %KIMARITE%.",
        "%LOSER% will be looking for revenge after that %KIMARITE% loss in the previous basho.",
        "Fans remember their last bout well—a crushing %KIMARITE% victory for %WINNER%."
      ]
    },
    training: {
      intensity: {
        conservative: [
          "Conservative"
        ],
        balanced: [
          "Balanced"
        ],
        intensive: [
          "Intensive"
        ],
        punishing: [
          "Punishing"
        ]
      },
      focus: {
        power: [
          "Power"
        ],
        speed: [
          "Speed"
        ],
        technique: [
          "Technique"
        ],
        balance: [
          "Balance"
        ],
        neutral: [
          "Neutral"
        ]
      },
      recovery: {
        low: [
          "Low"
        ],
        normal: [
          "Normal"
        ],
        high: [
          "High"
        ]
      },
      mode: {
        develop: [
          "Develop"
        ],
        push: [
          "Push"
        ],
        protect: [
          "Protect"
        ],
        rebuild: [
          "Rebuild"
        ]
      }
    },
    oyakata: {
      quirks: {
        "Old-School Stickler": [
          "Old-School Stickler"
        ],
        "Gambler's Instinct": [
          "Gambler's Instinct"
        ],
        "Welfare Hawk": [
          "Welfare Hawk"
        ],
        "Discipline Hawk": [
          "Discipline Hawk"
        ],
        "Media Operator": [
          "Media Operator"
        ],
        "Sleeper Scout": [
          "Sleeper Scout"
        ],
        Nepotist: [
          "Nepotist"
        ],
        "Weight-Cutter": [
          "Weight-Cutter"
        ],
        "Keiko Romantic": [
          "Keiko Romantic"
        ],
        "Cold Pragmatist": [
          "Cold Pragmatist"
        ],
        "Family First": [
          "Family First"
        ],
        "Numbers Guy": [
          "Numbers Guy"
        ]
      }
    },
    strategy: {
      philosophies: {
        balanced: "Balanced Growth",
        aggressive: "Aggressive Development",
        conservative: "Risk Aversion",
        experimental: "Experimental Training"
      }
    }
  };
  const vocabulary = {
    intensity_1: {
      adjectives: [
        "standard",
        "routine",
        "steady",
        "calculated"
      ],
      verbs: [
        "moves",
        "drives",
        "wins",
        "finishes"
      ]
    },
    intensity_2: {
      adjectives: [
        "professional",
        "dominant",
        "resolute",
        "technical"
      ],
      verbs: [
        "executes",
        "dictates",
        "neutralizes",
        "commands"
      ]
    },
    intensity_3: {
      adjectives: [
        "thunderous",
        "electric",
        "unstoppable",
        "extraordinary"
      ],
      verbs: [
        "detonates",
        "decimates",
        "shatters",
        "conquers"
      ]
    }
  };
  var archData = {
    version,
    metadata,
    digests,
    registry,
    matrix,
    domains,
    vocabulary
  };
  var define_process_env_default = {};
  let BardEngine$1 = class BardEngine {
    static archive = archData;
    static lruCache = [];
    static MAX_CACHE_SIZE = 50;
    static formatCurrency(amount) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount).replace("￥", "¥");
    }
    static percentFormatter = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1
    });
    /**
     * Resolves a narrative path into a final interpolated string.
     */
    static resolve(rng, path, context = {}) {
      const intensityValue = context.intensity ?? 2;
      const intensity = typeof intensityValue === "number" ? intensityValue : 2;
      let options = this.getOptions(path, intensity);
      if (options.length === 0) {
        console.warn(`BardEngine: No options found at path "${path}" (Intensity: ${intensity})`);
        return { text: `[System Log]: No narrative templates found at ${path}`, id: "unknown", path };
      }
      let attempts = 0;
      let idx = 0;
      let template = "";
      do {
        idx = rng.int(0, options.length - 1);
        template = options[idx];
        attempts++;
      } while (this.lruCache.includes(template) && attempts < 3 && options.length > 1 && true);
      {
        this.updateCache(template);
      }
      const templateId = `${path}_i${intensity}_${idx}`;
      const interpolatedText = this.interpolate(template, context);
      return {
        text: interpolatedText,
        id: templateId,
        path
      };
    }
    /**
     * Retrieves a raw registry entry (metadata object) from the archive.
     * Useful for the UI/Presenters to get 'label', 'labelJa', and 'description'.
     */
    static getRegistryEntry(domain, id) {
      const registry2 = this.archive.registry;
      if (!registry2 || !registry2[domain]) return null;
      return registry2[domain][id] || null;
    }
    /**
     * Internal helper to traverse the JSON archive.
     */
    static getOptions(path, intensity) {
      const keys = path.split(".");
      let current = this.archive;
      const isRootKey = ["registry", "matrix", "digests"].includes(keys[0]);
      if (!isRootKey && keys[0] !== "domains") {
        current = this.archive.domains;
      }
      for (const key of keys) {
        if (current[key] === void 0) return [];
        current = current[key];
      }
      if (Array.isArray(current)) return current;
      if (typeof current === "string") return [current];
      if (typeof current === "object" && current !== null) {
        const intensityKey = `intensity_${intensity}`;
        if (Array.isArray(current[intensityKey])) return current[intensityKey];
        if (Array.isArray(current.common)) return current.common;
        if (current.label && typeof current.label === "string") return [current.label];
        if (current.name && typeof current.name === "string") return [current.name];
        if (current.description && typeof current.description === "string") return [current.description];
        const firstArrayKey = Object.keys(current).find((k) => Array.isArray(current[k]));
        if (firstArrayKey) return current[firstArrayKey];
      }
      return [];
    }
    /**
     * Zero-Leakage Interpolation with Auto-Formatting and Domain-Specific Logic.
     */
    static interpolate(text, context) {
      const pattern = /%([A-Z0-9_]+)%|\{\{([a-zA-Z0-9_]+)\}\}/g;
      const result = text.replace(pattern, (match, p1, p2) => {
        const key = p1 || p2;
        const value = context[key] ?? context[key.toLowerCase()];
        if (value === void 0 || value === null) {
          const errorMsg = `BardEngine Warning: Missing token {${key}} in context for template: "${text}"`;
          console.warn(errorMsg);
          return `[MISSING: ${key}]`;
        }
        if (key === "kimarite" && typeof value === "string") {
          const entry = this.getRegistryEntry("kimarite", value.toLowerCase());
          if (entry && entry.labelJa) {
            return `${entry.labelJa} (${entry.label})`;
          }
        }
        if (typeof value === "number") {
          if (key.includes("money") || key.includes("kensho") || key.includes("cost") || key.includes("revenue") || key.includes("profit")) {
            return this.currencyFormatter.format(value);
          }
          if (key.includes("rate") || key.includes("chance")) {
            return this.percentFormatter.format(value > 1 ? value / 100 : value);
          }
        }
        return value.toString();
      });
      if (result.includes("%") || result.includes("{{") || result.includes("}}")) {
        const leakMsg = `BardEngine Warning: Token leakage or unresolved brackets in result: "${result}"`;
        if (define_process_env_default.CI) {
          throw new Error(leakMsg);
        }
        console.warn(leakMsg);
      }
      return result;
    }
    /**
     * Update the LRU cache with the newest used template.
     */
    static updateCache(template) {
      this.lruCache.push(template);
      if (this.lruCache.length > this.MAX_CACHE_SIZE) {
        this.lruCache.shift();
      }
    }
    /**
     * Maps a float (0-1) or integer to a narrative intensity level (1-3).
     */
    static calculateIntensity(value, range = [0, 1]) {
      const [min, max] = range;
      const normalized = (value - min) / (max - min);
      if (normalized < 0.33) return 1;
      if (normalized < 0.66) return 2;
      return 3;
    }
  };
  function ensureEventsState(world) {
    if (world.events && world.events.version && Array.isArray(world.events.log)) {
      if (!world.events.dedupe) world.events.dedupe = {};
      return world.events;
    }
    world.events = { version: "1.0.0", log: [], dedupe: {} };
    return world.events;
  }
  function logEngineEvent(world, params) {
    const events = ensureEventsState(world);
    const year = world.calendar?.year ?? world.year ?? 2025;
    const week = world.calendar?.currentWeek ?? world.week ?? 0;
    const month = world.calendar?.month ?? 1;
    const day = world.calendar?.currentDay ?? 1;
    const dedupeKey = params.dedupeKey ?? `${year}|${week}|${params.type}|${params.scope ?? "world"}|${params.heyaId ?? ""}|${params.rikishiId ?? ""}|${params.title}`;
    if (events.dedupe[dedupeKey]) {
      return events.log[events.log.length - 1];
    }
    const idRngLabel = `${dedupeKey}::${events.log.length}`;
    const rng = rngForWorld(world, "events", idRngLabel);
    const id = rng.uuid("EV");
    const ev = {
      id,
      type: params.type,
      causalEventId: params.causalEventId,
      year,
      week,
      month,
      day,
      phase: params.phase ?? "weekly",
      category: params.category,
      importance: params.importance ?? "minor",
      scope: params.scope ?? "world",
      heyaId: params.heyaId,
      rikishiId: params.rikishiId,
      title: params.title,
      summary: params.summary,
      data: params.data,
      truthLevel: params.truthLevel ?? "public",
      tags: params.tags ?? []
    };
    events.log.push(ev);
    events.dedupe[dedupeKey] = true;
    return ev;
  }
  function queryEvents(world, filters) {
    const events = ensureEventsState(world).log;
    const impScore = (i) => i === "headline" ? 3 : i === "major" ? 2 : i === "notable" ? 1 : 0;
    const minImp = filters.minImportance ? impScore(filters.minImportance) : -1;
    let out = events;
    if (filters.category) out = out.filter((e) => e.category === filters.category);
    if (filters.scope) out = out.filter((e) => e.scope === filters.scope);
    if (filters.heyaId) out = out.filter((e) => e.heyaId === filters.heyaId);
    if (filters.rikishiId) out = out.filter((e) => e.rikishiId === filters.rikishiId);
    if (filters.types?.length) {
      const typesSet = new Set(filters.types);
      out = out.filter((e) => typesSet.has(e.type));
    }
    if (minImp >= 0) out = out.filter((e) => impScore(e.importance) >= minImp);
    return [...out].sort((a, b) => {
      const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
      const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
      if (ta !== tb) return tb - ta;
      return stableTieBreak(b.id, a.id);
    }).slice(0, filters.limit ?? 50);
  }
  const EventBus = {
    medicalReportBase: (world, ctx, importance) => {
      const rng = rngFromSeed(`medical-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.medical.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.medical.summary", ctx);
      return logEngineEvent(world, {
        type: "MEDICAL_REPORT",
        category: "injury",
        importance,
        scope: "rikishi",
        rikishiId: ctx.rikishiId,
        heyaId: ctx.heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["medical", ctx.status]
      });
    },
    governanceRuling: (world, heyaId, ctx, importance = "major") => {
      const heya = world.heyas.get(heyaId);
      const enrichedCtx = { heya: heya?.name, heyaname: heya?.name, ...ctx };
      const rng = rngFromSeed(`gov-${heyaId}-${world.year}-${world.week}-${ctx.incident}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.governance.title", enrichedCtx);
      const summaryRes = BardEngine$1.resolve(rng, "events.governance.summary", enrichedCtx);
      return logEngineEvent(world, {
        type: "GOVERNANCE_RULING",
        category: "discipline",
        importance,
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: enrichedCtx,
        tags: ["governance", "discipline"]
      });
    },
    trainingUpdate: (world, ctx) => {
      const rng = rngFromSeed(`training-${ctx.rikishiId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.training.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.training.summary", ctx);
      return logEngineEvent(world, {
        type: "TRAINING_UPDATE",
        category: "training",
        importance: "notable",
        scope: ctx.rikishiId ? "rikishi" : "heya",
        rikishiId: ctx.rikishiId,
        heyaId: ctx.heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["training"]
      });
    },
    financialAlert: (world, heyaId, ctx) => {
      const rng = rngFromSeed(`finance-${heyaId}-${world.year}-${world.week}-${ctx.incident}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.economy.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.economy.summary", ctx);
      return logEngineEvent(world, {
        type: "FINANCIAL_ALERT",
        category: "economy",
        importance: ctx.incident === "insolvency" ? "headline" : "major",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["economy", ctx.incident]
      });
    },
    awardConferred: (world, ctx) => {
      const rng = rngFromSeed(`award-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.awards.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.awards.summary", ctx);
      return logEngineEvent(world, {
        type: "AWARD_CONFERRED",
        category: "basho",
        importance: "headline",
        phase: "basho_wrap",
        scope: "rikishi",
        rikishiId: ctx.rikishiId,
        heyaId: ctx.heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["basho", "award"]
      });
    },
    lifecycleEvent: (world, ctx) => {
      const rng = rngFromSeed(`lifecycle-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.lifecycle.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.lifecycle.summary", ctx);
      return logEngineEvent(world, {
        type: "LIFECYCLE_EVENT",
        category: "career",
        importance: ctx.status === "retirement" ? "major" : "notable",
        scope: "rikishi",
        rikishiId: ctx.rikishiId,
        heyaId: ctx.heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["career", ctx.status]
      });
    },
    bashoStatus: (world, ctx) => {
      const rng = rngFromSeed(`basho-status-${ctx.status}-${world.year}-${ctx.day}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.basho.status_title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.basho.status_summary", ctx);
      return logEngineEvent(world, {
        type: "BASHO_STATUS",
        category: "basho",
        importance: ctx.status === "started" || ctx.status === "ended" || ctx.day === 15 ? "headline" : "notable",
        phase: "basho_day",
        scope: "world",
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["basho", ctx.status]
      });
    },
    welfareCompliance: (world, heyaId, ctx) => {
      const rng = rngFromSeed(`welfare-${heyaId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.welfare.title", ctx);
      const summaryRes = BardEngine$1.resolve(rng, "events.welfare.summary", ctx);
      return logEngineEvent(world, {
        type: "WELFARE_COMPLIANCE",
        category: "welfare",
        importance: ctx.status === "sanctioned" ? "headline" : "major",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data: ctx,
        tags: ["welfare", ctx.status]
      });
    },
    // --- Core Simulation Hooks ---
    boutResolved: (world, data) => {
      const rng = rngFromSeed(`bout-resolved-${data.winnerRikishiId}-${data.loserRikishiId}-${world.year}-${world.week}-${data.day}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.basho.bout_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.basho.bout_summary", data);
      return logEngineEvent(world, {
        type: "BOUT_RESOLVED",
        category: "basho",
        importance: data.upset || data.isKinboshi ? "headline" : "notable",
        phase: "basho_day",
        scope: "world",
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["basho", "bout", "pbp"]
      });
    },
    recruitDiscovered: (world, data) => {
      const rng = rngFromSeed(`recruit-${data.rikishiId}-${world.year}-${world.week}`, "narrative", "event");
      const res = BardEngine$1.resolve(rng, "events.recruiting.scouting_reports", data);
      const titleRes = BardEngine$1.resolve(rng, "events.recruiting.title", data);
      return logEngineEvent(world, {
        type: "RECRUIT_DISCOVERED",
        category: "scouting",
        importance: "notable",
        scope: "world",
        rikishiId: data.rikishiId,
        title: titleRes.text,
        summary: res.text,
        data,
        tags: ["scouting", "recruitment"]
      });
    },
    monthlyFinanceReport: (world, data) => {
      const rng = rngFromSeed(`finance-tick-${data.heya}-${world.year}-${world.week}`, "narrative", "event");
      const res = BardEngine$1.resolve(rng, "events.economy.market_shifts", data);
      const titleRes = BardEngine$1.resolve(rng, "events.economy.title", data);
      return logEngineEvent(world, {
        type: "MONTHLY_FINANCE_REPORT",
        category: "economy",
        phase: "monthly",
        importance: "notable",
        scope: "heya",
        heyaId: data.heyaId,
        title: titleRes.text,
        summary: res.text,
        data,
        tags: ["economy", "finance"]
      });
    },
    rivalryHeatSpike: (world, data) => {
      const rng = rngFromSeed(`rivalry-heat-${data.winner}-${data.loser}-${world.year}-${world.week}`, "narrative", "event");
      const res = BardEngine$1.resolve(rng, "events.rivalry.press_rumors", data);
      const titleRes = BardEngine$1.resolve(rng, "events.rivalry.title", data);
      return logEngineEvent(world, {
        type: "RIVALRY_HEAT_SPIKE",
        category: "rivalry",
        importance: data.heat > 75 ? "major" : "notable",
        scope: "world",
        title: titleRes.text,
        summary: res.text,
        data,
        tags: ["rivalry", "hype"]
      });
    },
    oyakataMoodShift: (world, heyaId, data) => {
      const rng = rngFromSeed(`mood-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.narrative.mood_shift_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.narrative.mood_shift_summary", data);
      return logEngineEvent(world, {
        type: "OYAKATA_MOOD_SHIFT",
        category: "narrative",
        importance: "major",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["narrative", "mood"]
      });
    },
    managementDecision: (world, heyaId, data, importance = "minor") => {
      const rng = rngFromSeed(`mgmt-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.management.decision_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.management.decision_summary", data);
      return logEngineEvent(world, {
        type: "NPC_MANAGER_DECISION",
        category: "training",
        importance,
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["management", "strategy"]
      });
    },
    strategyShift: (world, heyaId, data) => {
      const rng = rngFromSeed(`strategy-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.narrative.strategy_shift_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.narrative.strategy_shift_summary", data);
      return logEngineEvent(world, {
        type: "NARRATIVE_STRATEGY_SHIFT",
        category: "narrative",
        importance: "major",
        scope: "world",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["narrative", "strategy"]
      });
    },
    facilityUpdate: (world, heyaId, data, type) => {
      const rng = rngFromSeed(`facility-${heyaId}-${world.year}-${world.week}-${type}`, "narrative", "event");
      const path = type === "UPGRADED" ? "events.facility.upgraded" : "events.facility.degraded";
      const titleRes = BardEngine$1.resolve(rng, `${path}_title`, data);
      const summaryRes = BardEngine$1.resolve(rng, `${path}_summary`, data);
      return logEngineEvent(world, {
        type: type === "UPGRADED" ? "FACILITY_UPGRADED" : "FACILITY_DEGRADED",
        category: "facility",
        importance: "notable",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["facility", type.toLowerCase()]
      });
    },
    rosterEvent: (world, heyaId, data) => {
      const rng = rngFromSeed(`roster-${heyaId}-${data.rikishiId}-${world.year}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.management.roster_overflow_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.management.roster_overflow_summary", data);
      return logEngineEvent(world, {
        type: "ROSTER_OVERFLOW_RELEASE",
        category: "career",
        importance: "major",
        scope: "heya",
        heyaId,
        rikishiId: data.rikishiId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["roster", "release"]
      });
    },
    prestigeEvent: (world, heyaId, data) => {
      const rng = rngFromSeed(`prestige-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, "events.narrative.prestige_title", data);
      const summaryRes = BardEngine$1.resolve(rng, "events.narrative.prestige_summary", data);
      return logEngineEvent(world, {
        type: "AWARD_CONFERRED",
        // Reuse or map to generic milestone
        category: "milestone",
        importance: "notable",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["prestige", "milestone"]
      });
    },
    lifecycleAction: (world, data, type) => {
      const rng = rngFromSeed(`lifecycle-${type}-${data.rikishiId || data.heyaId}-${world.year}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, `events.lifecycle.${type}_title`, data);
      const summaryRes = BardEngine$1.resolve(rng, `events.lifecycle.${type}_summary`, data);
      return logEngineEvent(world, {
        type: "LIFECYCLE_EVENT",
        category: "career",
        importance: "major",
        scope: data.rikishiId ? "rikishi" : "heya",
        rikishiId: data.rikishiId,
        heyaId: data.heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["lifecycle", type]
      });
    },
    financialAction: (world, heyaId, data, type) => {
      const rng = rngFromSeed(`finance-${type}-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
      const titleRes = BardEngine$1.resolve(rng, `events.economy.${type}_title`, data);
      const summaryRes = BardEngine$1.resolve(rng, `events.economy.${type}_summary`, data);
      return logEngineEvent(world, {
        type: "FINANCIAL_ALERT",
        category: "economy",
        importance: "notable",
        scope: "heya",
        heyaId,
        title: titleRes.text,
        summary: summaryRes.text,
        data,
        tags: ["economy", type]
      });
    }
  };
  function tickWeekTalentPool(world) {
    const tp = ensureTalentPoolState(world);
    if (tp.playerScouting) {
      for (const [id, record] of Object.entries(tp.playerScouting)) {
        if (world.week - record.lastScoutedWeek > 4) {
          record.scoutingLevel = Math.max(0, record.scoutingLevel - 2);
        }
      }
    }
    for (const candidate of Object.values(tp.candidates)) {
      if (candidate.availabilityState !== "in_talks") continue;
      if (!candidate.competingSuitors.length) continue;
      const deadlineExpired = candidate.competingSuitors.some((s) => world.week >= s.deadlineWeek);
      if (!deadlineExpired) continue;
      const bandRank = { all_in: 4, high: 3, medium: 2, low: 1 };
      const winner = [...candidate.competingSuitors].sort(
        (a, b) => (bandRank[b.interestBand] ?? 0) - (bandRank[a.interestBand] ?? 0)
      )[0];
      candidate.availabilityState = "signed";
      candidate.competingSuitors = [winner];
      if (candidate.talentSeed >= 80) {
        const heya = world.heyas.get(winner.heyaId);
        if (heya) {
          heya.reputation = Math.min(100, (heya.reputation ?? 50) + 5);
          rngFromSeed(`talent-sign-${candidate.candidateId}`, "narrative", "event");
          EventBus.recruitDiscovered(world, {
            rikishiId: candidate.candidateId,
            heyaId: winner.heyaId,
            shikona: candidate.name,
            heya: heya.name,
            score: candidate.talentSeed,
            status: "high_talent_signed"
          });
        }
      }
    }
    if (world.calendar && world.calendar.month % 2 !== 0 && world.calendar.currentDay === 1) {
      refreshAllPools(world);
    }
  }
  function fillVacanciesForNPC(world, targetHeyas) {
    const tp = ensureTalentPoolState(world);
    const rng = RNGRegistry.getSystemRNG(
      world,
      "scouting",
      `npc_fill_${world.week}`
    );
    for (const [heyaId, vacancyCount] of Object.entries(targetHeyas)) {
      const heya = world.heyas.get(heyaId);
      if (!heya) continue;
      for (let i = 0; i < vacancyCount; i++) {
        const poolTypes = [
          "high_school",
          "university",
          "foreign"
        ];
        const pt = poolTypes[rng.int(0, 2)];
        const pool = tp.pools[pt];
        if (pool.candidatesVisible.length > 0) {
          const cId = pool.candidatesVisible[rng.int(0, pool.candidatesVisible.length - 1)];
          const c = tp.candidates[cId];
          if (c && c.availabilityState === "available") {
            c.availabilityState = "signed";
            c.competingSuitors = [{ heyaId, offerType: "standard", interestBand: "high", deadlineWeek: world.week }];
          }
        }
      }
    }
  }
  function refreshAllPools(world) {
    const tp = ensureTalentPoolState(world);
    const rng = RNGRegistry.getSystemRNG(
      world,
      "scouting",
      `refresh_${world.year}`
    );
    const poolTypes = ["high_school", "university", "foreign"];
    poolTypes.forEach((pt) => {
      const pool = tp.pools[pt];
      const currentCount = pool.candidatesVisible.length + pool.candidatesHidden.length;
      const toGenerate = pool.hiddenReserveCap - currentCount;
      for (let i = 0; i < toGenerate; i++) {
        const id = rng.uuid("CD");
        const candidate = generateCandidate({
          id,
          rng,
          currentYear: world.year,
          poolType: pt
        });
        tp.candidates[id] = candidate;
        pool.candidatesHidden.push(id);
      }
    });
    tp.lastYearlyRefreshYear = world.year;
  }
  function ensureTalentPoolState(world) {
    return EntityService.ensureState(world, "talentPool", () => ({
      version: "1.0.0",
      lastYearlyRefreshYear: world.year,
      candidates: {},
      pools: {
        high_school: createEmptyPool("high_school", world),
        university: createEmptyPool("university", world),
        foreign: createEmptyPool("foreign", world)
      },
      playerScouting: {}
    }));
  }
  function createEmptyPool(type, world) {
    const rng = RNGRegistry.getSystemRNG(world, "scouting", `pool_init_${type}`);
    return {
      poolId: rng.uuid("PL"),
      poolType: type,
      refreshCadence: "basho",
      populationCap: 20,
      hiddenReserveCap: 50,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: 0,
      scarcityBand: "normal",
      qualityBand: "normal"
    };
  }
  function countsAsForeignFromRikishi(rikishi) {
    return (rikishi.nationality ?? "Japan") !== "Japan";
  }
  function reinjectToTalentPool(world, rikishi) {
    const tp = ensureTalentPoolState(world);
    const rng = RNGRegistry.getSystemRNG(world, "scouting", `reinject_${rikishi.id}`);
    const id = rng.uuid("CD");
    const isForeginer = countsAsForeignFromRikishi(rikishi);
    const poolType = isForeginer ? "foreign" : "high_school";
    if (!tp.candidates[id]) {
      const birthYear = world.year - (rikishi.age ?? 20);
      tp.candidates[id] = {
        candidateId: id,
        personId: rikishi.id,
        name: rikishi.shikona ?? rikishi.name ?? id,
        nationality: rikishi.nationality ?? "Japan",
        birthYear,
        originRegion: "Japan",
        reputationSeed: 50,
        tags: ["reinjected"],
        combatProfile: {},
        archetype: "balanced",
        style: "neutral",
        heightPotentialCm: 175,
        weightPotentialKg: 150,
        talentSeed: 50,
        temperament: { discipline: 50, volatility: 50 },
        visibilityBand: "public",
        availabilityState: "available",
        competingSuitors: []
      };
      tp.pools[poolType].candidatesVisible.push(id);
    }
    EventBus.recruitDiscovered(world, {
      rikishiId: rikishi.id,
      shikona: rikishi.shikona ?? rikishi.name ?? id,
      status: "reinjected"
    });
  }
  const PREFIXES = {
    regional: ["Kyoto", "Osaka", "Nagoya", "Kanto", "Kansai", "Hokkaido", "Kyushu"],
    prestige: ["Imperial", "Diamond", "Golden", "Royal", "Platinum", "Zenith", "Apex"]
  };
  const IDENTITIES = {
    family: ["Sato", "Tanaka", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Kato"],
    abstract: ["Harmony", "Unity", "Zenith", "Rising Sun", "Horizon", "Eternal", "Aether"]
  };
  const INDUSTRIES = {
    heavy: ["Heavy Industries", "Steel", "Energy", "Shipbuilding"],
    logistics: ["Logistics", "Forwarding", "Shipping", "Warehousing"],
    fmcg: ["Sake Brewery", "Textiles", "Foods", "Beverages"],
    construction: ["Construction", "Infrastructure", "Development", "Land"]
  };
  const FINISHING_SUFFIXES = ["Corp", "Ltd", "Group", "Holdings", "Global", "Enterprises"];
  const REGIONS = ["tokyo", "osaka", "kyoto", "nagoya", "fukuoka", "sapporo", "sendai", "hiroshima", "kobe", "yokohama", "chiba", "saitama"];
  const INDUSTRY_TAGS = ["logistics", "foods", "manufacturing", "construction", "retail", "hospitality", "finance", "cultural", "sports", "media"];
  function generateSponsorNameV2(rng, tier) {
    const rollIndex = (arr) => Math.floor(rng.next() * arr.length);
    if (tier === "T0" || tier === "T1") {
      const family = IDENTITIES.family[rollIndex(IDENTITIES.family)];
      const industry = INDUSTRIES.fmcg[rollIndex(INDUSTRIES.fmcg)];
      return { displayName: `${family} ${industry}`, shortName: family };
    }
    if (tier === "T2") {
      const region = PREFIXES.regional[rollIndex(PREFIXES.regional)];
      const industryList = [...INDUSTRIES.heavy, ...INDUSTRIES.construction, ...INDUSTRIES.logistics];
      const industry = industryList[rollIndex(industryList)];
      const suffix = FINISHING_SUFFIXES[rollIndex(FINISHING_SUFFIXES.slice(0, 4))];
      return { displayName: `${region} ${industry} ${suffix}`, shortName: region };
    }
    if (tier === "T3" || tier === "T4") {
      const prestige = PREFIXES.prestige[rollIndex(PREFIXES.prestige)];
      const identity = IDENTITIES.family[rollIndex(IDENTITIES.family)];
      return { displayName: `${prestige} ${identity} Holdings`, shortName: identity };
    }
    if (tier === "T5") {
      const abstract = IDENTITIES.abstract[rollIndex(IDENTITIES.abstract)];
      return { displayName: `${abstract} Global`, shortName: abstract };
    }
    return { displayName: "Standard Sponsor", shortName: "Standard" };
  }
  function generateSponsorId(rng) {
    return rng.uuid("SP");
  }
  function rollSponsorCategory(rng) {
    const categoryRoll = rng.next();
    if (categoryRoll < 0.3) return "local_business";
    if (categoryRoll < 0.5) return "regional_corporation";
    if (categoryRoll < 0.62) return "national_brand";
    if (categoryRoll < 0.72) return "alumni_association";
    if (categoryRoll < 0.82) return "cultural_foundation";
    if (categoryRoll < 0.94) return "private_benefactor";
    return "anonymous_patron";
  }
  function generateSponsor(rng, tier, createdAtTick, existingIds) {
    const { displayName, shortName } = generateSponsorNameV2(rng, tier);
    const sponsorId = generateSponsorId(rng);
    const category = rollSponsorCategory(rng);
    const traits = getTierTraitRanges(tier);
    return {
      sponsorId,
      displayName,
      shortName,
      category,
      tier,
      originRegionId: REGIONS[Math.floor(rng.next() * REGIONS.length)],
      industryTag: INDUSTRY_TAGS[Math.floor(rng.next() * INDUSTRY_TAGS.length)],
      toneTag: ["traditional", "modern", "luxury", "local", "industrial", "civic"][Math.floor(rng.next() * 6)],
      prestigeAffinity: Math.floor(traits.prestigeMin + rng.next() * (traits.prestigeMax - traits.prestigeMin)),
      loyalty: Math.floor(traits.loyaltyMin + rng.next() * (traits.loyaltyMax - traits.loyaltyMin)),
      scandalTolerance: Math.floor(30 + rng.next() * 50),
      riskAppetite: tier === "T5" ? Math.floor(60 + rng.next() * 40) : Math.floor(20 + rng.next() * 60),
      visibilityPreference: tier === "T5" ? 2 : Math.floor(rng.next() * 3),
      active: true,
      createdAtTick,
      lastSeenTick: createdAtTick,
      relationships: []
    };
  }
  function getTierTraitRanges(tier) {
    switch (tier) {
      case "T0":
        return { prestigeMin: 10, prestigeMax: 35, loyaltyMin: 10, loyaltyMax: 40 };
      case "T1":
        return { prestigeMin: 15, prestigeMax: 45, loyaltyMin: 20, loyaltyMax: 55 };
      case "T2":
        return { prestigeMin: 25, prestigeMax: 60, loyaltyMin: 30, loyaltyMax: 70 };
      case "T3":
        return { prestigeMin: 40, prestigeMax: 75, loyaltyMin: 40, loyaltyMax: 80 };
      case "T4":
        return { prestigeMin: 50, prestigeMax: 90, loyaltyMin: 50, loyaltyMax: 95 };
      case "T5":
        return { prestigeMin: 70, prestigeMax: 100, loyaltyMin: 60, loyaltyMax: 100 };
      default:
        assertNever(tier);
    }
  }
  function rollTier(rng, dist) {
    const r = rng.next();
    let cumulative = 0;
    const tiers = ["T0", "T1", "T2", "T3", "T4", "T5"];
    for (const t of tiers) {
      cumulative += dist[t] ?? 0;
      if (r < cumulative) return t;
    }
    return "T0";
  }
  const INITIAL_SPONSOR_TIER_DISTRIBUTION = {
    T0: 0.35,
    T1: 0.25,
    T2: 0.2,
    T3: 0.12,
    T4: 0.07,
    T5: 0.01
  };
  function generateInitialSponsorPool(worldSeed, worldSizeScalar = 1) {
    const rng = rngFromSeed(worldSeed, "sponsors", "root");
    const poolSize = 180 + Math.floor(worldSizeScalar * 60);
    const sponsors = /* @__PURE__ */ new Map();
    for (let i = 0; i < poolSize; i++) {
      const tier = rollTier(rng, INITIAL_SPONSOR_TIER_DISTRIBUTION);
      const sponsor = generateSponsor(rng, tier, 0);
      sponsors.set(sponsor.sponsorId, sponsor);
    }
    return { sponsors, koenkais: /* @__PURE__ */ new Map() };
  }
  function createKoenkai(beyaId, sponsorPool, prestigeBand, rng, currentTick) {
    const koenkaiId = rng.uuid("KN");
    const memberCount = 3 + Math.floor(rng.next() * 5);
    const eligibleSponsors = Array.from(sponsorPool.sponsors.values()).filter((s) => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3")).sort((a, b) => b.prestigeAffinity - a.prestigeAffinity || a.sponsorId.localeCompare(b.sponsorId));
    const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
    const members = picked.map((sponsor, idx) => {
      const isPillar = idx === 0 && sponsor.tier !== "T1";
      return {
        relId: rng.uuid("SR"),
        sponsorId: sponsor.sponsorId,
        targetType: "beya",
        targetId: beyaId,
        role: isPillar ? "koenkai_pillar" : "koenkai_member",
        strength: isPillar ? 4 : 2,
        startedAtTick: currentTick
      };
    });
    const pb = prestigeBand.toLowerCase();
    let strengthBand = "moderate";
    if (pb.includes("elite") || pb.includes("legend")) strengthBand = "powerful";
    else if (pb.includes("respected") || pb.includes("prestig")) strengthBand = "strong";
    else if (pb.includes("struggling") || pb.includes("weak")) strengthBand = "weak";
    else if (pb.includes("unknown") || pb.includes("none")) strengthBand = "none";
    return {
      koenkaiId,
      beyaId,
      strengthBand,
      members,
      createdAtTick: currentTick,
      lastChangedTick: currentTick
    };
  }
  function createHeyaWithOyakata(args) {
    const { id, name, rng, tier } = args;
    const oyakataId = rng.uuid("OY");
    const oyakata = {
      id: oyakataId,
      heyaId: id,
      name: generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`, rng),
      shikona: generateOyakataName(`${rng.seed}::oyakata::${oyakataId}`, rng),
      age: 45 + rng.int(0, 20),
      archetype: seededPick(rng, ["traditionalist", "scientist", "gambler", "nurturer", "tyrant", "strategist"]),
      traits: {
        ambition: 50 + rng.next() * 50,
        patience: 50 + rng.next() * 50,
        risk: 50 + rng.next() * 50,
        tradition: 50 + rng.next() * 50,
        compassion: 50 + rng.next() * 50
      },
      yearsInCharge: 1 + rng.int(0, 15),
      stats: { scouting: 50, training: 50, politics: 50 },
      personality: "traditionalist"
      // Default
    };
    const heya = {
      id,
      name,
      oyakataId,
      statureBand: tier < 0.2 ? "legendary" : tier < 0.5 ? "powerful" : "established",
      prestigeBand: tier < 0.2 ? "elite" : "respected",
      facilitiesBand: "adequate",
      koenkaiBand: "moderate",
      runwayBand: "secure",
      reputation: 80 - tier * 50,
      prestige: 50 - tier * 30,
      funds: tier < 0.2 ? 4e7 : 15e6,
      scandalScore: 0,
      governanceStatus: "good_standing",
      welfareState: { welfareRisk: 10, activeDiet: "maintenance", complianceState: "compliant", weeksInState: 0, lastReviewedWeek: 0 },
      facilities: { training: 50, recovery: 50, nutrition: 50 },
      riskIndicators: { financial: false, governance: false, rivalry: false },
      ichimon: seededPick(rng, ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"]),
      politicalCapital: 100,
      location: "Tokyo",
      lineage: [],
      historicalYusho: 0
    };
    return { heya, oyakata };
  }
  function createStables(worldRng) {
    const heyaMap = /* @__PURE__ */ new Map();
    const oyakataMap = /* @__PURE__ */ new Map();
    const HEYA_NAMES = [
      "Dewanoumi",
      "Nishonoseki",
      "Takasago",
      "Tokitsukaze",
      "Isegahama",
      "Sakaigawa",
      "Kasugano",
      "Kokonoe",
      "Kise",
      "Musashigawa",
      "Kataonami",
      "Onoe",
      "Tatsunami",
      "Minezaki",
      "Tamanoi",
      "Isenoumi",
      "Ajigawa",
      "Sadogatake",
      "Hakkaku",
      "Shibatayama",
      "Michinoku",
      "Miyagino",
      "Oigami",
      "Tagonoura",
      "Naruto",
      "Arashio",
      "Asakayama",
      "Nakagawa",
      "Shikihide",
      "Yamahibiki",
      "Irumagawa",
      "Hanahago",
      "Shirane",
      "Futagoyama",
      "Fujishima",
      "Takadagawa",
      "Magaki",
      "Katsushika",
      "Oshogatsu",
      "Chiganoura",
      "Minato",
      "Shikoroyama",
      "Kagamiyama",
      "Hanakago",
      "Oguruma"
    ];
    HEYA_NAMES.forEach((name, i) => {
      const id = worldRng.uuid("HY");
      const tier = i / HEYA_NAMES.length;
      const { heya, oyakata } = createHeyaWithOyakata({ id, name, rng: worldRng, tier });
      heyaMap.set(id, heya);
      oyakataMap.set(oyakata.id, oyakata);
      heya.rikishiIds = [];
    });
    return { heyaMap, oyakataMap };
  }
  function createRosters(worldRng, heyaMap) {
    const rikishiMap = /* @__PURE__ */ new Map();
    const heyaIds = Array.from(heyaMap.keys());
    const rankConfigs = [
      { rank: "yokozuna", division: "makuuchi", count: 1 },
      { rank: "ozeki", division: "makuuchi", count: 2 },
      { rank: "sekiwake", division: "makuuchi", count: 2 },
      { rank: "komusubi", division: "makuuchi", count: 2 },
      { rank: "maegashira", division: "makuuchi", count: 34 },
      { rank: "juryo", division: "juryo", count: 28 },
      { rank: "makushita", division: "makushita", count: 120 },
      { rank: "sandanme", division: "sandanme", count: 200 },
      { rank: "jonidan", division: "jonidan", count: 200 },
      { rank: "jonokuchi", division: "jonokuchi", count: 110 }
    ];
    rankConfigs.forEach((config) => {
      for (let i = 0; i < config.count; i++) {
        const side = i % 2 === 0 ? "east" : "west";
        const rankNumber = config.rank === "maegashira" || config.rank === "juryo" || config.rank === "makushita" || config.rank === "sandanme" || config.rank === "jonidan" || config.rank === "jonokuchi" ? Math.floor(i / 2) + 1 : 1;
        const rikishiId = worldRng.uuid("RK");
        const r = generateFullRikishi({
          id: rikishiId,
          rng: worldRng,
          currentYear: 2025,
          rank: config.rank,
          division: config.division,
          side,
          rankNumber
        });
        const heyaId = worldRng.pick(heyaIds);
        r.heyaId = heyaId;
        heyaMap.get(heyaId)?.rikishiIds?.push(r.id);
        rikishiMap.set(r.id, r);
      }
    });
    return rikishiMap;
  }
  function generateInitialWorld(seed) {
    const worldRng = rngFromSeed(seed, "worldgen", "world");
    const { heyaMap, oyakataMap } = createStables(worldRng);
    const rikishiMap = createRosters(worldRng, heyaMap);
    const world = {
      id: worldRng.uuid("WD"),
      seed,
      year: 2025,
      week: 1,
      dayIndexGlobal: 0,
      cyclePhase: "interim",
      currentBashoName: "hatsu",
      heyas: heyaMap,
      rikishi: rikishiMap,
      historicalRikishi: /* @__PURE__ */ new Map(),
      oyakata: oyakataMap,
      staff: /* @__PURE__ */ new Map(),
      history: [],
      events: { version: "1.0.0", log: [], dedupe: {} },
      ftue: { isActive: true, bashoCompleted: 0, suppressedEvents: [] },
      playerHeyaId: Array.from(heyaMap.keys())[0],
      almanacSnapshots: [],
      factions: createInitialFactions(worldRng),
      calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
      records: {
        allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
      },
      settings: { archiveMode: "standard" },
      planetRating: 50,
      isInitialSeed: true,
      sponsorPool: generateInitialSponsorPool(seed),
      trainingState: /* @__PURE__ */ new Map()
    };
    if (world.sponsorPool) {
      for (const heya of world.heyas.values()) {
        const koenkai = createKoenkai(
          heya.id,
          world.sponsorPool,
          heya.prestigeBand || "respected",
          worldRng,
          0
        );
        world.sponsorPool.koenkais.set(koenkai.koenkaiId, koenkai);
        heya.koenkaiId = koenkai.koenkaiId;
        heya.koenkaiBand = koenkai.strengthBand;
      }
    }
    tickWeekTalentPool(world);
    return world;
  }
  function initializeBasho(world, name) {
    const rng = rngFromSeed(world.seed, "basho", `${world.year}-${name}`);
    return {
      id: rng.uuid("BS"),
      year: world.year,
      bashoNumber: 1,
      bashoName: name,
      day: 1,
      currentDay: 1,
      matches: [],
      standings: /* @__PURE__ */ new Map(),
      isActive: true
    };
  }
  function createInitialFactions(rng) {
    const names = ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"];
    const factions = {};
    names.forEach((name) => {
      const id = rng.uuid("FN");
      factions[id] = {
        id: name,
        // The type Faction uses IchimonName as ID internally (A6.2 compliance)
        name: `${name} Ichimon`,
        influence: 50,
        oyakataLeaderId: null
      };
    });
    return factions;
  }
  const EntityCollection = {
    /**
     * Get all rikishi, sorted by ID for determinism.
     * Auto-filters retired by default.
     */
    getRikishi(world, options = {}) {
      const all = Array.from(world.rikishi.values());
      const filtered = all.filter((r) => {
        const retiredMatch = options.includeRetired ? true : !r.isRetired;
        const heyaMatch = options.heyaId ? r.heyaId === options.heyaId : true;
        return retiredMatch && heyaMatch;
      });
      return stableSort(filtered, (r) => r.id);
    },
    /**
     * Get all active (non-retired) rikishi.
     */
    getActiveRikishi(world) {
      return this.getRikishi(world, { includeRetired: false });
    },
    /**
     * Get all rikishi for a specific heya.
     */
    getHeyaRoster(world, heyaId) {
      return this.getRikishi(world, { heyaId, includeRetired: false });
    },
    /**
     * Get all heyas, sorted by ID for determinism.
     */
    getHeyas(world) {
      const all = Array.from(world.heyas.values());
      return stableSort(all, (h) => h.id);
    },
    /**
     * Get a specific heya by ID.
     */
    getHeya(world, heyaId) {
      return world.heyas.get(heyaId);
    },
    /**
     * Get a specific rikishi by ID.
     */
    getRikishiById(world, id) {
      return world.rikishi.get(id);
    }
  };
  function deriveTone(pair) {
    const heat01 = pair.heat / 100;
    const spite01 = pair.spite / 100;
    const close01 = pair.closeness / 100;
    if (pair.sameHeya && pair.heat < 50 && pair.spite < 40) return "respect";
    if (spite01 > 0.7 && heat01 > 0.65) return "bad_blood";
    if (spite01 > 0.45 && heat01 > 0.4) return "grudge";
    if (close01 > 0.65 && heat01 > 0.5) return "respect";
    if (close01 > 0.45 && spite01 > 0.35 && heat01 > 0.55) return "unstable";
    if (pair.meetings >= 4 && pair.heat >= 35 && pair.spite < 35) return "public_hype";
    return "respect";
  }
  function resetBashoMediaTracking(state) {
    return {
      ...state,
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {}
    };
  }
  function generateGovernanceHeadline(args) {
    const { world, heyaId, templatePath, severity = "minor" } = args;
    if (!world.mediaState || !world.mediaState.headlines) return;
    const heya = world.heyas.get(heyaId);
    const context = {
      heyaname: heya?.name ?? "Heya",
      heya: heya?.name ?? "Heya"
    };
    const week = world.week ?? 0;
    const rng = rngForWorld(world, "media", `gov::${heyaId}::${templatePath}::${week}`);
    const { text: title } = BardEngine.resolve(rng, templatePath, context);
    const headline = {
      id: rng.uuid("MH"),
      week,
      tier: severity,
      beat: templatePath.includes("welfare") ? "discipline" : "media",
      tone: severity === "critical" || severity === "major" ? "controversy" : "neutral",
      rikishiIds: [],
      heyaIds: [heyaId],
      title,
      subtitle: "",
      // Optional for now
      impact: severity === "critical" ? 60 : severity === "major" ? 40 : 20,
      tags: ["governance", "institutional"]
    };
    world.mediaState.headlines.push(headline);
    if (world.mediaState.headlines.length > 250) world.mediaState.headlines.shift();
    world.mediaState.heyaPressure[heyaId] = Math.min(100, (world.mediaState.heyaPressure[heyaId] ?? 0) + headline.impact / 2);
    console.log(`MediaService: Generated Governance Headline: ${title}`);
  }
  function getInterimWeeks(_from, _to) {
    return 6;
  }
  function isBashoMonth(month) {
    return month % 2 !== 0;
  }
  function phase00_preflight(world) {
    const nextWorld = {
      ...world,
      dayIndexGlobal: (world.dayIndexGlobal ?? 0) + 1,
      // 2. Decrement phase counters (cloned)
      _interimDaysRemaining: world._interimDaysRemaining != null ? world._interimDaysRemaining - 1 : world._interimDaysRemaining,
      _postBashoDays: world._postBashoDays != null ? world._postBashoDays - 1 : world._postBashoDays
    };
    const { calendar, monthBoundary, yearBoundary } = advanceCalendarDay(world);
    nextWorld.calendar = calendar;
    nextWorld.transientContext = {
      ...world.transientContext,
      boundaries: { monthBoundary, yearBoundary },
      deltas: emptyDeltas(),
      modifiers: defaultActiveModifiers()
    };
    checkPhaseTransition(nextWorld);
    return nextWorld;
  }
  function advanceCalendarDay(world) {
    const cal = { ...world.calendar };
    const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let monthBoundary = false;
    let yearBoundary = false;
    cal.currentDay = (cal.currentDay ?? 1) + 1;
    const maxDay = DAYS_IN_MONTH[(cal.month - 1) % 12] || 30;
    if (cal.currentDay > maxDay) {
      cal.currentDay = 1;
      cal.month += 1;
      monthBoundary = true;
      if (cal.month > 12) {
        cal.month = 1;
        cal.year += 1;
        yearBoundary = true;
      }
    }
    return { calendar: cal, monthBoundary, yearBoundary };
  }
  function checkPhaseTransition(world) {
    const prev = world.cyclePhase;
    switch (world.cyclePhase) {
      case "pre_basho": {
        if ((world._interimDaysRemaining ?? 0) <= 0) {
          const bashoName = world.currentBashoName || "hatsu";
          const basho = initializeBasho(world, bashoName);
          world.currentBasho = basho;
          const nextPhase = "active_basho";
          world.cyclePhase = nextPhase;
          if (world.mediaState) world.mediaState = resetBashoMediaTracking(world.mediaState);
          EventBus.bashoStatus(world, {
            status: "started",
            incident: bashoName,
            day: 1
          });
          logTransition(world, prev, nextPhase, `The ${bashoName} basho begins!`);
          return { from: prev, to: nextPhase };
        }
        break;
      }
      case "post_basho": {
        if ((world._postBashoDays ?? 0) <= 0) {
          const nextPhase = "interim";
          world.cyclePhase = nextPhase;
          world._interimDaysRemaining = getInterimWeeks() * 7 - 7;
          logTransition(world, prev, nextPhase, "The inter-basho period begins.");
          return { from: prev, to: nextPhase };
        }
        break;
      }
      case "interim": {
        if ((world._interimDaysRemaining ?? 0) <= 14) {
          const nextPhase = "banzuke_reveal";
          world.cyclePhase = nextPhase;
          logTransition(world, prev, nextPhase, "The official banzuke has been published.");
          return { from: prev, to: nextPhase };
        }
        break;
      }
      case "banzuke_reveal": {
        if ((world._interimDaysRemaining ?? 0) <= 7) {
          const nextPhase = "pre_basho";
          world.cyclePhase = nextPhase;
          logTransition(world, prev, nextPhase, "Final preparations for the upcoming basho begin.");
          return { from: prev, to: nextPhase };
        }
        break;
      }
    }
    return void 0;
  }
  function logTransition(world, from, to, summary) {
    EventBus.bashoStatus(world, {
      status: "phase_transition",
      incident: summary,
      shikona: from,
      // repurposing for debug info or just omit
      winner: to
    });
  }
  function getSeverityWeight(sev) {
    if (sev === "serious" || sev === "high" || sev === 3) return 8;
    if (sev === "moderate" || sev === "medium" || sev === 2) return 4;
    return 2;
  }
  function computeInjuryPressure(world, heya) {
    let pressure = 0;
    let seriousCount = 0;
    let negligenceCount = 0;
    const trainingState = world.trainingState?.get(heya.id);
    const intensity = trainingState?.activeProfile.intensity || "balanced";
    const isHarsh = intensity === "punishing" || intensity === "intensive";
    const focusMap = /* @__PURE__ */ new Map();
    trainingState?.focusSlots.forEach((f) => focusMap.set(f.rikishiId, f));
    const roster = EntityCollection.getHeyaRoster(world, heya.id);
    roster.forEach((rikishi) => {
      const status = rikishi.injuryStatus || rikishi.injury;
      const isInjured = rikishi.injured || status && status.isInjured;
      if (isInjured) {
        const sev = status?.severity || (status?.severityLabel || void 0);
        const w = getSeverityWeight(sev);
        pressure += w;
        if (sev === "serious" || sev === "high" || sev === 3) seriousCount++;
        const focus = focusMap.get(rikishi.id);
        const isProtected = focus?.focusType === "protect" || focus?.focusType === "rebuild";
        if (isHarsh && !isProtected) negligenceCount++;
      }
    });
    return { pressure, seriousCount, negligenceCount };
  }
  function calculateWeeklyWelfareDelta(world, heya, state) {
    const reasons = [];
    const { pressure, seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
    let delta = clamp(Math.round(pressure / 3), 0, 12);
    if (seriousCount > 0) {
      delta += 2;
      reasons.push("serious_injuries+2");
    }
    const diet = state.activeDiet || "maintenance";
    if (diet === "austerity") {
      delta += 2;
      reasons.push("austerity_diet+2");
    } else if (diet === "premium") {
      delta -= 1;
      reasons.push("premium_diet-1");
    }
    if (negligenceCount > 0) {
      const penalty = negligenceCount * 3;
      delta += penalty;
      reasons.push(`negligence+${penalty}`);
    } else if (pressure > 0) {
      reasons.push("misfortune");
    }
    const trainingState = world.trainingState?.get(heya.id);
    const intensity = trainingState?.activeProfile.intensity || "balanced";
    const recovery = trainingState?.activeProfile.recovery || "normal";
    if (intensity === "punishing") {
      delta += 3;
      reasons.push("punishing_intensity+3");
    } else if (intensity === "intensive") {
      delta += 1;
      reasons.push("intensive_intensity+1");
    }
    if (recovery === "low") {
      delta += 2;
      reasons.push("low_recovery+2");
    } else if (recovery === "high") {
      delta -= 2;
      reasons.push("high_recovery-2");
    }
    const recQuality = heya.facilities?.recovery ?? 50;
    const nutQuality = heya.facilities?.nutrition ?? 50;
    const facDelta = Math.round((60 - recQuality) / 25) + Math.round((55 - nutQuality) / 40);
    if (facDelta !== 0) {
      delta += facDelta;
      reasons.push(`facilities${facDelta >= 0 ? "+" : ""}${facDelta}`);
    }
    if ((heya.scandalScore || 0) >= 50) {
      delta += 2;
      reasons.push("scandal_synergy+2");
    }
    const isHealthy = pressure === 0 && intensity !== "punishing" && intensity !== "intensive" && recovery !== "low";
    if (isHealthy) {
      delta -= 2;
      reasons.push("healthy_drift-2");
    }
    return { delta, reasons };
  }
  const WelfareService = {
    /**
     * Ensure heya welfare state exists.
     */
    ensureHeyaWelfareState(heya) {
      return EntityService.ensureState(
        heya,
        "welfareState",
        () => ({
          welfareRisk: 10,
          complianceState: "compliant",
          weeksInState: 0,
          lastReviewedWeek: 0,
          activeDiet: "maintenance"
        })
      );
    },
    /**
     * Authoritative Weekly Welfare Tick.
     */
    applyWeeklyWelfareTick(world) {
      const stables = EntityCollection.getHeyas(world);
      const week = world.calendar.currentWeek || 0;
      stables.forEach((heya) => {
        const state = this.ensureHeyaWelfareState(heya);
        const beforeRisk = state.welfareRisk;
        const { delta, reasons } = calculateWeeklyWelfareDelta(world, heya, state);
        state.welfareRisk = clamp(Math.round(state.welfareRisk + delta), 0, 100);
        state.weeksInState++;
        state.lastReviewedWeek = week;
        this.orchestrateComplianceTransitions(world, heya, state, reasons);
        if (!heya.riskIndicators) heya.riskIndicators = {};
        heya.riskIndicators.welfare = state.complianceState !== "compliant" || state.welfareRisk >= 55;
        const riskUp = state.welfareRisk - beforeRisk;
        if (Math.abs(riskUp) >= 8) {
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "risk_shift",
            risk: state.welfareRisk,
            delta: riskUp,
            reason: reasons.join("|")
          });
        }
      });
    },
    /**
     * Orchestrates transitions through the compliance lifecycle.
     */
    orchestrateComplianceTransitions(world, heya, state, reasons) {
      const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
      const hasNegligence = negligenceCount > 0;
      const week = world.calendar.currentWeek || 0;
      switch (state.complianceState) {
        case "compliant":
          const watchThreshold = hasNegligence ? 30 : 45;
          if (state.welfareRisk >= watchThreshold || seriousCount >= 2 || hasNegligence && state.welfareRisk >= 20) {
            this.setComplianceState(state, "watch");
            EventBus.welfareCompliance(world, heya.id, {
              heyaname: heya.name,
              status: "watch",
              incident: hasNegligence ? "negligence_suspected" : "standard_watch",
              reason: reasons.join("|")
            });
            generateGovernanceHeadline({
              world,
              heyaId: heya.id,
              templatePath: "institutional.welfare.watch_headline",
              severity: "minor"
            });
            if (world.mediaState) {
              world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 15);
            }
          }
          break;
        case "watch":
          if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
            this.setComplianceState(state, "investigation");
            state.investigation = {
              openedWeek: week,
              severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
              triggers: reasons,
              progress: 0
            };
            EventBus.welfareCompliance(world, heya.id, {
              heyaname: heya.name,
              status: "investigation_opened",
              risk: state.welfareRisk
            });
            generateGovernanceHeadline({
              world,
              heyaId: heya.id,
              templatePath: "institutional.welfare.investigation_headline",
              severity: "major"
            });
            if (world.mediaState) {
              world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 30);
            }
          } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
            this.setComplianceState(state, "compliant");
            EventBus.welfareCompliance(world, heya.id, {
              heyaname: heya.name,
              status: "cleared",
              risk: state.welfareRisk
            });
          }
          break;
        case "investigation":
          const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
          state.investigation.progress = clamp((state.investigation.progress || 0) + progressGain, 0, 100);
          if (state.welfareRisk >= 85 || seriousCount >= 3 && state.welfareRisk >= 70) {
            this.setComplianceState(state, "sanctioned");
            const fineYen = 5e6;
            state.sanctions = {
              recruitmentFreezeWeeks: 12,
              trainingIntensityCap: "medium",
              fineYen,
              note: "Mandatory welfare remediation"
            };
            heya.funds = (heya.funds ?? 0) - fineYen;
            EventBus.welfareCompliance(world, heya.id, {
              heyaname: heya.name,
              status: "sanctioned",
              risk: state.welfareRisk,
              money: fineYen
            });
            generateGovernanceHeadline({
              world,
              heyaId: heya.id,
              templatePath: "institutional.welfare.sanction_headline",
              severity: "critical"
            });
            if (world.mediaState) {
              world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 50);
            }
          } else if (state.investigation.progress >= 100 && state.welfareRisk <= 50) {
            this.setComplianceState(state, "watch");
            state.investigation = void 0;
            EventBus.welfareCompliance(world, heya.id, {
              heyaname: heya.name,
              status: "investigation_closed",
              risk: state.welfareRisk
            });
          }
          break;
        case "sanctioned":
          if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
            state.sanctions.recruitmentFreezeWeeks--;
          }
          const freezeDone = !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
          if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
            this.setComplianceState(state, "watch");
            state.sanctions = void 0;
            EventBus.welfareCompliance(world, heya.id, {
              status: "sanctions_lifted",
              heyaname: heya.name,
              risk: state.welfareRisk
            });
          }
          break;
        default:
          assertNever(state.complianceState);
      }
    },
    /**
     * Transition state helper.
     */
    setComplianceState(state, next) {
      if (state.complianceState !== next) {
        state.complianceState = next;
        state.weeksInState = 0;
      }
    },
    /**
     * Set active diet for a heya.
     */
    setHeyaDiet(world, heyaId, diet) {
      const heya = EntityCollection.getHeya(world, heyaId);
      if (!heya) return;
      const state = this.ensureHeyaWelfareState(heya);
      const oldDiet = state.activeDiet;
      state.activeDiet = diet;
      EventBus.welfareCompliance(world, heyaId, {
        heyaname: heya.name,
        status: "diet_changed",
        regimen: diet,
        reason: oldDiet
      });
    }
  };
  const DIET_COSTS = {
    austerity: 1e3,
    maintenance: 3e3,
    heavy_bulk: 6e3,
    premium: 1e4
  };
  function phase01_daily_economy(world) {
    const nextHeyas = new Map(world.heyas);
    let totalDailyFoodCost = 0;
    for (const [id, heya] of world.heyas) {
      const welfare = WelfareService.ensureHeyaWelfareState(heya);
      const diet = welfare.activeDiet || "maintenance";
      const costPerRikishi = DIET_COSTS[diet] ?? 3e3;
      const dailyFoodCost = (heya.rikishiIds?.length ?? 0) * costPerRikishi;
      totalDailyFoodCost += dailyFoodCost;
      nextHeyas.set(id, { ...heya, funds: heya.funds - dailyFoodCost });
    }
    const deltas = {
      ...world.transientContext?.deltas ?? {},
      expenses: (world.transientContext?.deltas?.expenses ?? 0) + totalDailyFoodCost
    };
    return {
      ...world,
      heyas: nextHeyas,
      transientContext: {
        ...world.transientContext,
        deltas
      }
    };
  }
  const STAT_BANDS = [
    { band: "struggling", min: 0, max: 15 },
    { band: "limited", min: 15, max: 30 },
    { band: "developing", min: 30, max: 45 },
    { band: "capable", min: 45, max: 60 },
    { band: "strong", min: 60, max: 75 },
    { band: "outstanding", min: 75, max: 90 },
    { band: "exceptional", min: 90, max: Infinity }
  ];
  const FATIGUE_BANDS = [
    { band: "fresh", min: 0, max: 15 },
    { band: "light", min: 15, max: 35 },
    { band: "tired", min: 35, max: 55 },
    { band: "exhausted", min: 55, max: 75 },
    { band: "spent", min: 75, max: Infinity }
  ];
  const RIVALRY_HEAT_BANDS = [
    { band: "dormant", min: 0, max: 20 },
    { band: "simmering", min: 20, max: 40 },
    { band: "heated", min: 40, max: 65 },
    { band: "fierce", min: 65, max: 85 },
    { band: "legendary", min: 85, max: Infinity }
  ];
  const POTENTIAL_BANDS = [
    { band: "generational", min: 88, max: 100 },
    { band: "star", min: 72, max: 87 },
    { band: "solid", min: 55, max: 71 },
    { band: "average", min: 35, max: 54 },
    { band: "limited", min: 0, max: 34 }
  ];
  const SCANDAL_BANDS = [
    { band: "clean", min: 0, max: 10 },
    { band: "whispers", min: 10, max: 30 },
    { band: "scrutiny", min: 30, max: 55 },
    { band: "scandal", min: 55, max: 80 },
    { band: "crisis", min: 80, max: Infinity }
  ];
  const PRIZE_BANDS = [
    { band: "nominal", min: 0, max: 1e4 },
    { band: "modest", min: 1e4, max: 1e5 },
    { band: "notable", min: 1e5, max: 1e6 },
    { band: "prestigious", min: 1e6, max: 1e7 },
    { band: "grand", min: 1e7, max: Infinity }
  ];
  const TRAIT_BANDS = [
    { band: "negligible", min: 0, max: 20 },
    { band: "minor", min: 20, max: 40 },
    { band: "moderate", min: 40, max: 60 },
    { band: "strong", min: 60, max: 80 },
    { band: "dominant", min: 80, max: Infinity }
  ];
  const CONDITION_DESCRIPTOR_BANDS = [
    { min: 0.85, max: 1.01, id: "Zekkouchou", colorCode: "text-green-600" },
    { min: 0.6, max: 0.85, id: "Bachi-bachi", colorCode: "text-blue-500" },
    { min: 0.35, max: 0.6, id: "Iki-girashite", colorCode: "text-yellow-500" },
    { min: 0, max: 0.35, id: "Koshi-kudake", colorCode: "text-red-500" }
  ];
  const MORALE_DESCRIPTOR_BANDS = [
    { min: 0.85, max: 1.01, id: "Shin-Gi-Tai", colorCode: "text-purple-600" },
    { min: 0.6, max: 0.85, id: "Kiai juubun", colorCode: "text-blue-500" },
    { min: 0.35, max: 0.6, id: "Mayoi", colorCode: "text-yellow-500" },
    { min: 0, max: 0.35, id: "Fugainai", colorCode: "text-red-500" }
  ];
  const POTENTIAL_DESCRIPTOR_BANDS = [
    { min: 90, max: 101, id: "Taiki Bansei", colorCode: "text-amber-500" },
    { min: 75, max: 90, id: "Soshitsu Ari", colorCode: "text-blue-500" },
    { min: 50, max: 75, id: "Mikan no Taiki", colorCode: "text-slate-400" },
    { min: 0, max: 50, id: "Genkai", colorCode: "text-slate-500" }
  ];
  function getStatLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.stats.${band}`).text;
  }
  function getStatProse(rng, attribute, band) {
    return BardEngine$1.resolve(rng, `rikishi.stats.${attribute.toLowerCase()}.${band}`).text;
  }
  function getFatigueLabel(rng, band) {
    let path = band;
    if (band === "light") path = "tired";
    if (band === "spent") path = "exhausted";
    return BardEngine$1.resolve(rng, `system.descriptors.bands.fatigue.${path}`).text;
  }
  function getMomentumLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.momentum.${band}`).text;
  }
  function getPotentialInfo(rng, band) {
    let path = band;
    if (band === "generational") path = "Taiki Bansei";
    if (band === "star") path = "Soshitsu Ari";
    if (band === "solid") path = "Mikan no Taiki";
    if (band === "average") path = "Mikan no Taiki";
    if (band === "limited") path = "Genkai";
    const label = BardEngine$1.resolve(rng, `rikishi.descriptors.potential.${path}.label`).text;
    const description = BardEngine$1.resolve(rng, `rikishi.descriptors.potential.${path}.tooltip`).text;
    return { label, description };
  }
  function getRivalryHeatLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.rivalry.${band}`).text;
  }
  function getScandalLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.scandal.${band}`).text;
  }
  function getPrizeLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.prizes.${band}`).text;
  }
  function getTraitLabel(rng, band) {
    return BardEngine$1.resolve(rng, `system.descriptors.bands.traits.${band}`).text;
  }
  function getArchetypeInfo(rng, archetype) {
    const label = BardEngine$1.resolve(rng, `rikishi.archetypes.${archetype}.label`).text;
    const description = BardEngine$1.resolve(rng, `rikishi.archetypes.${archetype}.description`).text;
    return { label, description };
  }
  const HYSTERESIS_DELTA = 5;
  function toBandWithHysteresis(value, ladder, lastBand) {
    const v = clamp(value, 0, 100);
    const resolved = ladder.find((b) => v >= b.min && v < b.max) ?? ladder[ladder.length - 1];
    if (lastBand && lastBand !== resolved.band) {
      const prevDef = ladder.find((b) => b.band === lastBand);
      if (prevDef) {
        if (v >= prevDef.max) return resolved.band;
        if (v <= prevDef.min - HYSTERESIS_DELTA) return resolved.band;
        return lastBand;
      }
    }
    return resolved.band;
  }
  function resolveDescriptor(rng, path, entry) {
    const label = BardEngine$1.resolve(rng, `${path}.${entry.id}.label`).text;
    const tooltip = BardEngine$1.resolve(rng, `${path}.${entry.id}.tooltip`).text;
    return { id: entry.id, label, tooltip, colorCode: entry.colorCode };
  }
  const NarrativeService = {
    getStatBand(value, previous) {
      return toBandWithHysteresis(value, STAT_BANDS, previous);
    },
    getStatLabel(rng, band) {
      return getStatLabel(rng, band);
    },
    describeAttribute(rng, attribute, value) {
      const band = this.getStatBand(value);
      return getStatProse(rng, attribute, band);
    },
    getFatigueBand(value, previous) {
      return toBandWithHysteresis(value, FATIGUE_BANDS, previous);
    },
    getFatigueLabel(rng, band) {
      return getFatigueLabel(rng, band);
    },
    getPotentialBand(talentSeed, previous) {
      if (talentSeed == null) return "unknown";
      return toBandWithHysteresis(talentSeed, POTENTIAL_BANDS, previous);
    },
    getPotentialInfo(rng, band) {
      return getPotentialInfo(rng, band);
    },
    getMomentumBand(momentum) {
      const v = Math.abs(momentum) > 10 ? (clamp(momentum, 0, 100) - 50) / 10 : clamp(momentum, -5, 5);
      if (v >= 3) return "on_fire";
      if (v >= 1) return "rising";
      if (v <= -3) return "in_crisis";
      if (v <= -1) return "struggling";
      return "steady";
    },
    getMomentumLabel(rng, band) {
      return getMomentumLabel(rng, band);
    },
    getRivalryHeatBand(value, previous) {
      return toBandWithHysteresis(value, RIVALRY_HEAT_BANDS, previous);
    },
    getRivalryHeatLabel(rng, band) {
      return getRivalryHeatLabel(rng, band);
    },
    getScandalBand(value, previous) {
      return toBandWithHysteresis(value, SCANDAL_BANDS, previous);
    },
    getScandalLabel(rng, band) {
      return getScandalLabel(rng, band);
    },
    getTraitBand(value, previous) {
      return toBandWithHysteresis(value, TRAIT_BANDS, previous);
    },
    getTraitLabel(rng, band) {
      return getTraitLabel(rng, band);
    },
    getPrizeBand(amount) {
      const resolved = PRIZE_BANDS.find((b) => amount >= b.min && amount < b.max);
      return resolved?.band ?? PRIZE_BANDS[PRIZE_BANDS.length - 1].band;
    },
    getPrizeLabel(rng, band) {
      return getPrizeLabel(rng, band);
    },
    getConditionDescriptor(rng, value) {
      const v = clamp(value, 0, 1);
      const entry = CONDITION_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ?? CONDITION_DESCRIPTOR_BANDS[CONDITION_DESCRIPTOR_BANDS.length - 1];
      return resolveDescriptor(rng, "rikishi.descriptors.condition", entry);
    },
    getMoraleDescriptor(rng, value) {
      const v = clamp(value, 0, 1);
      const entry = MORALE_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ?? MORALE_DESCRIPTOR_BANDS[MORALE_DESCRIPTOR_BANDS.length - 1];
      return resolveDescriptor(rng, "rikishi.descriptors.morale", entry);
    },
    getPotentialDescriptor(rng, talentSeed) {
      const v = clamp(talentSeed, 0, 100);
      const entry = POTENTIAL_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ?? POTENTIAL_DESCRIPTOR_BANDS[POTENTIAL_DESCRIPTOR_BANDS.length - 1];
      return resolveDescriptor(rng, "rikishi.descriptors.potential", entry);
    },
    getArchetypeInfo(rng, archetype) {
      return getArchetypeInfo(rng, archetype);
    }
  };
  function toRikishiDescriptor(rng, r, prev) {
    return {
      powerBand: NarrativeService.getStatBand(r.power, prev?.powerBand),
      speedBand: NarrativeService.getStatBand(r.speed, prev?.speedBand),
      balanceBand: NarrativeService.getStatBand(r.balance, prev?.balanceBand),
      techniqueBand: NarrativeService.getStatBand(r.technique, prev?.techniqueBand),
      conditionBand: "peak",
      // Simplified legacy field
      fatigueBand: NarrativeService.getFatigueBand(r.fatigue, prev?.fatigueBand),
      momentumBand: NarrativeService.getMomentumBand(r.momentum),
      potentialBand: NarrativeService.getPotentialBand(r.talentSeed, prev?.potentialBand),
      archetypeLabel: void 0,
      // Simplified legacy field
      injuryModifiers: r.injured ? [getInjuryModifier(r)] : []
    };
  }
  function getInjuryModifier(r) {
    const inj = r.currentInjury || r.injuryStatus;
    const severity = inj?.severity;
    if (severity === "serious" || typeof severity === "number" && severity >= 70) return "sidelined";
    if (severity === "moderate" || typeof severity === "number" && severity >= 35) return "hampered";
    return "taped_up";
  }
  function phase01_daily_welfare(world) {
    const nextRikishi = new Map(world.rikishi);
    const heyaDietCache = /* @__PURE__ */ new Map();
    for (const heya of world.heyas.values()) {
      heyaDietCache.set(heya.id, WelfareService.ensureHeyaWelfareState(heya).activeDiet || "maintenance");
    }
    for (const [id, r] of world.rikishi) {
      if (r.isRetired) continue;
      let next = { ...r };
      const rikishiRng = rngFromSeed(`desc-${world.dayIndexGlobal}-${id}`, "narrative", "rikishi");
      next.descriptor = toRikishiDescriptor(rikishiRng, next, next.descriptor);
      const diet = heyaDietCache.get(next.heyaId);
      if (diet === "austerity") {
        next.weight = Math.max(70, next.weight - 0.05);
        if (next.stats) {
          next.stats = { ...next.stats, mental: Math.max(1, (next.stats.mental || 50) - 0.5) };
        }
      } else if (diet === "heavy_bulk") {
        next.weight += 0.1;
        if (next.stats) {
          next.stats = { ...next.stats, mental: Math.max(1, (next.stats.mental || 50) - 0.2) };
        }
      } else if (diet === "premium") {
        next.weight += 0.08;
        if (next.stats) {
          next.stats = { ...next.stats, mental: Math.min(100, (next.stats.mental || 50) + 0.5) };
        }
        if (!next.injured && (next.fatigue ?? 0) > 0) {
          next.fatigue = Math.max(0, (next.fatigue ?? 0) - 1);
        }
      }
      if (!next.injured && (next.fatigue ?? 0) > 0) {
        next.fatigue = Math.max(0, (next.fatigue ?? 0) - 0.3);
      }
      nextRikishi.set(id, next);
    }
    return {
      ...world,
      rikishi: nextRikishi
    };
  }
  function phase01_daily_sponsors(world) {
    const pool = world.sponsorPool;
    if (!pool?.sponsors) return world;
    const rng = RNGRegistry.getSystemRNG(world, "sponsors", `day-${world.dayIndexGlobal}`);
    for (const sponsor of pool.sponsors.values()) {
      if (!sponsor.active) continue;
      const jitter = (rng.next() - 0.5) * 1;
      sponsor.satisfaction = Math.min(100, Math.max(0, (sponsor.satisfaction ?? 50) + jitter));
    }
    return world;
  }
  function phase01_monthly_market(world) {
    const boundaries = world.transientContext?.boundaries;
    if (!boundaries?.monthBoundary) return world;
    const market = world.myosekiMarket;
    if (!market?.stocks) return world;
    const rng = RNGRegistry.getSystemRNG(world, "market", `month-${world.year}-${world.calendar.month}`);
    for (const stock of Object.values(market.stocks)) {
      if (stock.status === "available" && stock.askingPrice) {
        const drift = 1 + (rng.next() - 0.5) * 0.06;
        stock.askingPrice = Math.round(stock.askingPrice * drift / 1e4) * 1e4;
      }
    }
    return world;
  }
  const RANK_HIERARCHY = {
    yokozuna: {
      rank: "yokozuna",
      division: "makuuchi",
      nameJa: "横綱",
      tier: 1,
      salary: 3e6,
      isSanyaku: true,
      isSekitori: true,
      fightsPerBasho: 15
    },
    ozeki: {
      rank: "ozeki",
      division: "makuuchi",
      nameJa: "大関",
      tier: 2,
      salary: 25e5,
      isSanyaku: true,
      isSekitori: true,
      fightsPerBasho: 15
    },
    sekiwake: {
      rank: "sekiwake",
      division: "makuuchi",
      nameJa: "関脇",
      tier: 3,
      salary: 18e5,
      isSanyaku: true,
      isSekitori: true,
      fightsPerBasho: 15
    },
    komusubi: {
      rank: "komusubi",
      division: "makuuchi",
      nameJa: "小結",
      tier: 4,
      salary: 18e5,
      isSanyaku: true,
      isSekitori: true,
      fightsPerBasho: 15
    },
    maegashira: {
      rank: "maegashira",
      division: "makuuchi",
      nameJa: "前頭",
      tier: 5,
      salary: 14e5,
      isSanyaku: false,
      isSekitori: true,
      fightsPerBasho: 15
    },
    juryo: {
      rank: "juryo",
      division: "juryo",
      nameJa: "十両",
      tier: 6,
      salary: 11e5,
      isSanyaku: false,
      isSekitori: true,
      fightsPerBasho: 15
    },
    makushita: {
      rank: "makushita",
      division: "makushita",
      nameJa: "幕下",
      tier: 7,
      salary: 0,
      isSanyaku: false,
      isSekitori: false,
      fightsPerBasho: 7
    },
    sandanme: {
      rank: "sandanme",
      division: "sandanme",
      nameJa: "三段目",
      tier: 8,
      salary: 0,
      isSanyaku: false,
      isSekitori: false,
      fightsPerBasho: 7
    },
    jonidan: {
      rank: "jonidan",
      division: "jonidan",
      nameJa: "序二段",
      tier: 9,
      salary: 0,
      isSanyaku: false,
      isSekitori: false,
      fightsPerBasho: 7
    },
    jonokuchi: {
      rank: "jonokuchi",
      division: "jonokuchi",
      nameJa: "序ノ口",
      tier: 10,
      salary: 0,
      isSanyaku: false,
      isSekitori: false,
      fightsPerBasho: 7
    }
  };
  function getHeyaStaffBonuses(world, heyaId) {
    const heya = world.heyas.get(heyaId);
    const bonuses = {
      technique: 1,
      conditioning: 1,
      medical: 1,
      scouting: 1,
      administration: 1
    };
    if (!heya || !heya.staffIds || !world.staff) return bonuses;
    const BAND_VALUES = {
      feeble: 0.01,
      limited: 0.05,
      serviceable: 0.1,
      strong: 0.15,
      great: 0.2,
      dominant: 0.3,
      monstrous: 0.5
    };
    for (const staffId of heya.staffIds) {
      const staff = world.staff.get(staffId);
      if (!staff || staff.careerPhase === "retired") continue;
      const fatigueFactor = staff.fatigue > 80 ? 0.4 : staff.fatigue > 50 ? 0.7 : 1;
      const moraleFactor = staff.morale > 90 ? 1.15 : staff.morale < 30 ? 0.6 : 1;
      const efficiency = fatigueFactor * moraleFactor;
      const primaryBonus = BAND_VALUES[staff.competenceBands.primary] * efficiency;
      const secondaryBonus = staff.competenceBands.secondary ? BAND_VALUES[staff.competenceBands.secondary] * 0.4 * efficiency : 0;
      const totalStaffBonus = primaryBonus + secondaryBonus;
      switch (staff.role) {
        case "technique_coach":
          bonuses.technique += totalStaffBonus;
          break;
        case "conditioning_coach":
          bonuses.conditioning += totalStaffBonus;
          break;
        case "medical_staff":
          bonuses.medical += totalStaffBonus;
          break;
        case "scout":
          bonuses.scouting += totalStaffBonus;
          break;
        case "administrator":
          bonuses.administration -= totalStaffBonus * 0.5;
          break;
        case "assistant_oyakata":
          bonuses.technique += totalStaffBonus * 0.2;
          bonuses.conditioning += totalStaffBonus * 0.2;
          bonuses.medical += totalStaffBonus * 0.2;
          break;
      }
    }
    bonuses.administration = Math.max(0.7, bonuses.administration);
    return bonuses;
  }
  const INTENSITY_MULTIPLIERS = {
    conservative: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.8 },
    balanced: { growth: 1, fatigue: 1, injuryRisk: 1 },
    intensive: { growth: 1.2, fatigue: 1.25, injuryRisk: 1.15 },
    punishing: { growth: 1.35, fatigue: 1.5, injuryRisk: 1.35 }
  };
  const RECOVERY_MULTIPLIERS = {
    low: { fatigueDecay: 0.8, injuryRecovery: 0.85 },
    normal: { fatigueDecay: 1, injuryRecovery: 1 },
    high: { fatigueDecay: 1.25, injuryRecovery: 1.2 }
  };
  const FOCUS_BIAS_MATRIX = {
    power: { strength: 1.3, speed: 0.85, technique: 0.95, balance: 0.95, weight: 1, stamina: 1, mental: 1, adaptability: 1 },
    speed: { strength: 0.85, speed: 1.3, technique: 0.95, balance: 0.95, weight: 1, stamina: 1, mental: 1, adaptability: 1 },
    technique: { strength: 0.9, speed: 0.9, technique: 1.35, balance: 1.1, weight: 1, stamina: 1, mental: 1, adaptability: 1 },
    balance: { strength: 0.9, speed: 0.95, technique: 1.1, balance: 1.35, weight: 1, stamina: 1, mental: 1, adaptability: 1 },
    neutral: { strength: 1, speed: 1, technique: 1, balance: 1, weight: 1, stamina: 1, mental: 1, adaptability: 1 }
  };
  const ARCHETYPE_AFFINITY = {
    Explosive_Blitzer: { speed: 1.25, mental: 1.15, technique: 0.9, balance: 0.9, stamina: 0.85 },
    Immovable_Mountain: { weight: 1.3, balance: 1.2, strength: 1.15, technique: 0.85, speed: 0.7 },
    Defensive_Stalwart: { technique: 1.25, balance: 1.2, stamina: 1.1, speed: 0.9, mental: 1.1 },
    Acrobatic_Trickster: { speed: 1.2, technique: 1.2, adaptability: 1.2, strength: 0.8, weight: 0.75 },
    All_Rounder: { strength: 1.05, speed: 1.05, technique: 1.05, balance: 1.05, stamina: 1.05 }
  };
  const INDIVIDUAL_FOCUS_MODES = {
    develop: { growth: 1.25, fatigue: 1.1, injuryRisk: 1.05 },
    push: { growth: 1.35, fatigue: 1.2, injuryRisk: 1.2 },
    protect: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.7 },
    rebuild: { growth: 1.1, fatigue: 0.9, injuryRisk: 0.85 }
  };
  const PHASE_EFFECTS = {
    rookie: { injurySensitivity: 0.8, growthMult: 1.25 },
    prime: { injurySensitivity: 1, growthMult: 1 },
    veteran: { injurySensitivity: 1.2, growthMult: 0.65 },
    twilight: { injurySensitivity: 1.5, growthMult: 0.35 }
  };
  const STAT_CEILING_KEYS = [
    "strength",
    "speed",
    "technique",
    "balance",
    "stamina",
    "mental",
    "adaptability"
  ];
  function getStatCeiling(talentSeed, statKey) {
    const baseCeiling = 45 + talentSeed / 100 * 54;
    const idx = STAT_CEILING_KEYS.indexOf(statKey);
    const offset = idx >= 0 ? idx * 7 % 5 - 2 : 0;
    return Math.min(99, Math.max(30, Math.round(baseCeiling + offset)));
  }
  function diminishingReturnsMult(currentStat, ceiling) {
    if (ceiling <= 0) return 0;
    const ratio = Math.min(currentStat / ceiling, 1);
    return Math.max(0, 1 - ratio * ratio * ratio);
  }
  function getCareerPhase(experience) {
    if (experience < 30) return "rookie";
    if (experience < 70) return "prime";
    if (experience < 90) return "veteran";
    return "twilight";
  }
  function calculateFatigueDelta(profile, focus) {
    const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].fatigue;
    const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].fatigue : 1;
    const recoveryMult = RECOVERY_MULTIPLIERS[profile.recovery].fatigueDecay;
    const BASE_FATIGUE_GAIN = 10;
    const BASE_RECOVERY = 8;
    const gain = BASE_FATIGUE_GAIN * intensityMult * focusModeMult;
    const decay = BASE_RECOVERY * recoveryMult;
    return Math.floor(gain - decay);
  }
  function calculateGrowthVector(profile, focus, rikishi, heya, world) {
    const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].growth;
    const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].growth : 1;
    const bias = FOCUS_BIAS_MATRIX[profile.focus];
    const phase = getCareerPhase(rikishi.experience);
    const phaseMult = PHASE_EFFECTS[phase].growthMult;
    const trainingFacility = heya?.facilities?.training ?? 50;
    const facilityGrowthMult = 0.85 + Math.min(100, Math.max(0, trainingFacility)) / 100 * 0.35;
    const nutritionFacility = heya?.facilities?.nutrition ?? 50;
    const nutritionMult = 0.92 + Math.min(100, Math.max(0, nutritionFacility)) / 100 * 0.16;
    const BASE_GROWTH = 0.5;
    let degeikoMult = 1;
    if (heya && heya.ichimon && world?.factions) {
      const faction = world.factions[heya.ichimon];
      if (faction) {
        if (faction.influence >= 80) degeikoMult = 1.1;
      }
    }
    const totalMult = intensityMult * focusModeMult * phaseMult * facilityGrowthMult * degeikoMult * BASE_GROWTH;
    const talentSeed = rikishi.talentSeed ?? 50;
    const archetype = rikishi.derivedArchetype;
    const affinity = archetype ? ARCHETYPE_AFFINITY[archetype] : null;
    const growth = {
      strength: 0,
      speed: 0,
      technique: 0,
      balance: 0,
      weight: 0,
      stamina: 0,
      mental: 0,
      adaptability: 0
    };
    const applyCapped = (stat, rawMult, currentVal) => {
      const ceiling = getStatCeiling(talentSeed, stat);
      const drMult = diminishingReturnsMult(currentVal, ceiling);
      const affinityMult = affinity && affinity[stat] || 1;
      return totalMult * rawMult * drMult * affinityMult;
    };
    growth.strength = applyCapped("strength", bias.strength, rikishi.stats?.strength || 50) * nutritionMult;
    growth.speed = applyCapped("speed", bias.speed, rikishi.stats?.speed || 50);
    growth.technique = applyCapped("technique", bias.technique, rikishi.stats?.technique || 50);
    growth.balance = applyCapped("balance", bias.balance, rikishi.stats?.balance || 50);
    growth.stamina = applyCapped("stamina", 0.5, rikishi.stats?.stamina || 50) * nutritionMult;
    growth.mental = applyCapped("mental", 0.2, rikishi.stats?.mental || 50);
    growth.adaptability = applyCapped("adaptability", 0.2, rikishi.stats?.adaptability || 50);
    return growth;
  }
  function createDefaultTrainingState(beyaId) {
    return {
      beyaId,
      activeProfile: {
        intensity: "balanced",
        focus: "neutral",
        styleBias: "neutral",
        recovery: "normal"
      },
      focusSlots: []
    };
  }
  function ensureHeyaTrainingState(world, beyaId) {
    return EntityService.ensureNestedState(
      world,
      "trainingState",
      beyaId,
      () => createDefaultTrainingState(beyaId)
    );
  }
  function applyWeeklyTraining(world) {
    RNGRegistry.getTrainingRNG(world);
    const activeRikishi = EntityCollection.getActiveRikishi(world);
    activeRikishi.forEach((rikishi) => {
      const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
      const profile = beyaState.activeProfile;
      const individualFocus = beyaState.focusSlots.find((s) => s.rikishiId === rikishi.id);
      const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
      const focusType = individualFocus?.focusType;
      const isOnRecoveryFocus = focusType === "protect" || focusType === "rebuild";
      if (rikishi.injured && isOnRecoveryFocus) {
        rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) - Math.abs(fatigueDelta)));
      } else {
        rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));
      }
      if (!rikishi.injured) {
        const heya = EntityCollection.getHeya(world, rikishi.heyaId);
        const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
        const growth = calculateGrowthVector(profile, individualFocus, rikishi, heya, world);
        const finalGrowth = {
          strength: growth.strength * staffBonuses.conditioning,
          speed: growth.speed * staffBonuses.conditioning,
          technique: growth.technique * staffBonuses.technique,
          balance: growth.balance * staffBonuses.conditioning,
          stamina: growth.stamina * staffBonuses.conditioning,
          adaptability: growth.adaptability,
          mental: growth.mental * staffBonuses.technique
        };
        const prevPower = rikishi.power || 50;
        rikishi.power = Math.min(100, (rikishi.power || 50) + finalGrowth.strength);
        rikishi.speed = Math.min(100, (rikishi.speed || 50) + finalGrowth.speed);
        rikishi.technique = Math.min(100, (rikishi.technique || 50) + finalGrowth.technique);
        rikishi.balance = Math.min(100, (rikishi.balance || 50) + finalGrowth.balance);
        rikishi.stamina = Math.min(100, (rikishi.stamina || 50) + finalGrowth.stamina);
        rikishi.adaptability = Math.min(100, (rikishi.adaptability || 50) + finalGrowth.adaptability);
        rikishi.experience = Math.min(100, (rikishi.experience || 0) + finalGrowth.mental * 0.5);
        if (!rikishi.stats) rikishi.stats = {};
        rikishi.stats.strength = Math.floor(rikishi.power);
        rikishi.stats.speed = Math.floor(rikishi.speed);
        rikishi.stats.technique = Math.floor(rikishi.technique);
        rikishi.stats.balance = Math.floor(rikishi.balance);
        rikishi.stats.stamina = Math.floor(rikishi.stamina);
        rikishi.stats.adaptability = Math.floor(rikishi.adaptability);
        rikishi.stats.mental = Math.floor(rikishi.experience);
        const currentPower = Math.floor(rikishi.power);
        if (Math.floor(currentPower / 10) > Math.floor(prevPower / 10)) {
          EventBus.trainingUpdate(world, {
            rikishiId: rikishi.id,
            heyaId: rikishi.heyaId,
            shikona: rikishi.shikona || rikishi.name,
            status: profile.focus,
            intensity: profile.intensity,
            score: currentPower
          });
        }
      }
    });
  }
  const TrainingService = {
    ensureHeyaTrainingState,
    applyWeeklyTraining,
    createDefaultTrainingState
  };
  function phase01_week_training(world) {
    const nextRikishi = new Map(world.rikishi);
    const activeRikishi = EntityCollection.getActiveRikishi(world);
    activeRikishi.forEach((rikishi) => {
      const r = { ...rikishi };
      if (!r.stats) r.stats = { ...rikishi.stats };
      const beyaState = ensureHeyaTrainingState(world, r.heyaId);
      const profile = beyaState.activeProfile;
      const individualFocus = beyaState.focusSlots.find((s) => s.rikishiId === r.id);
      const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
      const focusType = individualFocus?.focusType;
      const isOnRecoveryFocus = focusType === "protect" || focusType === "rebuild";
      if (r.injured && isOnRecoveryFocus) {
        r.fatigue = Math.max(0, Math.min(100, (r.fatigue || 0) - Math.abs(fatigueDelta)));
      } else {
        r.fatigue = Math.max(0, Math.min(100, (r.fatigue || 0) + fatigueDelta));
      }
      if (!r.injured) {
        const heya = EntityCollection.getHeya(world, r.heyaId);
        const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
        const growth = calculateGrowthVector(profile, individualFocus, r, heya, world);
        const finalGrowth = {
          strength: growth.strength * staffBonuses.conditioning,
          speed: growth.speed * staffBonuses.conditioning,
          technique: growth.technique * staffBonuses.technique,
          balance: growth.balance * staffBonuses.conditioning,
          stamina: growth.stamina * staffBonuses.conditioning,
          adaptability: growth.adaptability,
          mental: growth.mental * staffBonuses.technique
        };
        const prevPower = r.power || 50;
        r.power = Math.min(100, (r.power ?? 50) + finalGrowth.strength);
        r.speed = Math.min(100, (r.speed ?? 50) + finalGrowth.speed);
        r.technique = Math.min(100, (r.technique ?? 50) + finalGrowth.technique);
        r.balance = Math.min(100, (r.balance ?? 50) + finalGrowth.balance);
        r.stamina = Math.min(100, (r.stamina ?? 50) + finalGrowth.stamina);
        r.adaptability = Math.min(100, (r.adaptability ?? 50) + finalGrowth.adaptability);
        r.experience = Math.min(100, (r.experience ?? 0) + finalGrowth.mental * 0.5);
        r.stats.strength = Math.floor(r.power);
        r.stats.speed = Math.floor(r.speed);
        r.stats.technique = Math.floor(r.technique);
        r.stats.balance = Math.floor(r.balance);
        r.stats.stamina = Math.floor(r.stamina);
        r.stats.adaptability = Math.floor(r.adaptability);
        r.stats.mental = Math.floor(r.experience);
        const currentPower = Math.floor(r.power);
        if (Math.floor(currentPower / 10) > Math.floor(prevPower / 10)) {
          EventBus.trainingUpdate(world, {
            rikishiId: r.id,
            heyaId: r.heyaId,
            shikona: r.shikona || r.name,
            status: profile.focus,
            intensity: profile.intensity,
            score: currentPower
          });
        }
      }
      nextRikishi.set(r.id, r);
    });
    return {
      ...world,
      rikishi: nextRikishi
    };
  }
  const SIMULATION_CONFIG = {
    /** Injury baselines */
    injuries: {
      weeklyBaseChance: 5e-3,
      maxWeeklyChance: 0.12
    }
  };
  function getBaseWeeksOut(severity, area, type) {
    let min = 1, max = 2;
    if (severity === "moderate") {
      min = 2;
      max = 5;
    }
    if (severity === "serious") {
      min = 6;
      max = 13;
    }
    if (area === "knee" || area === "back") {
      min += 1;
      max += 2;
    }
    if (type === "fracture") {
      min += 3;
      max += 5;
    }
    if (type === "tear" || type === "nerve") {
      min += 2;
      max += 4;
    }
    return { min, max };
  }
  function tickRikishiRecovery(rikishi, recoveryMult = 1) {
    if (!rikishi.injured || rikishi.injuryWeeksRemaining <= 0) {
      rikishi.injured = false;
      rikishi.injuryWeeksRemaining = 0;
      return false;
    }
    const weeksReduced = recoveryMult >= 1.2 ? 2 : 1;
    rikishi.injuryWeeksRemaining = Math.max(0, rikishi.injuryWeeksRemaining - weeksReduced);
    if (rikishi.injuryWeeksRemaining <= 0) {
      rikishi.injured = false;
      rikishi.injuryStatus = { type: "none", severity: "none", weeksRemaining: 0 };
      rikishi.injury = rikishi.injuryStatus;
      return true;
    }
    if (rikishi.injuryStatus) {
      rikishi.injuryStatus.weeksRemaining = rikishi.injuryWeeksRemaining;
    }
    return false;
  }
  function calculateWeeklyInjuryChance(rikishi, fatigue) {
    const base = SIMULATION_CONFIG.injuries.weeklyBaseChance;
    const fatigueMult = 1 + clamp(fatigue, 0, 100) / 200;
    const durability = typeof rikishi.durability === "number" ? rikishi.durability : 60;
    const durabilityMult = clamp(1.35 - durability / 100, 0.6, 1.35);
    const chance = base * fatigueMult * durabilityMult;
    return clamp(chance, 0, SIMULATION_CONFIG.injuries.maxWeeklyChance);
  }
  function rollWeeklyInjury(args) {
    const { rng, rikishi, fatigue } = args;
    const chance = calculateWeeklyInjuryChance(rikishi, fatigue);
    if (rng.next() >= chance) return null;
    const sevRoll = rng.next();
    const severity = sevRoll < 0.72 ? "minor" : sevRoll < 0.95 ? "moderate" : "serious";
    const area = pickArea(rng);
    const type = pickType(rng, severity);
    const { min, max } = getBaseWeeksOut(severity, area, type);
    const weeksOut = clampInt(min + Math.floor(rng.next() * (max - min + 1)), 1, 26);
    return { severity, area, type, weeksOut };
  }
  function pickArea(rng) {
    const areas = ["knee", "ankle", "back", "shoulder", "elbow", "wrist", "hip", "rib", "neck", "other"];
    const weights = [0.18, 0.12, 0.12, 0.1, 0.08, 0.08, 0.08, 0.08, 0.06, 0.1];
    let r = rng.next();
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) return areas[i];
      r -= weights[i];
    }
    return "other";
  }
  function pickType(rng, severity) {
    const roll = rng.next();
    if (severity === "serious") {
      if (roll < 0.35) return "tear";
      if (roll < 0.65) return "fracture";
      return "nerve";
    }
    if (severity === "moderate") {
      if (roll < 0.35) return "sprain";
      if (roll < 0.7) return "strain";
      return "contusion";
    }
    return "inflammation";
  }
  function phase01_week_health(world) {
    const nextRikishi = new Map(world.rikishi);
    for (const [id, rikishi] of world.rikishi) {
      if (rikishi.isRetired) continue;
      const r = { ...rikishi };
      let changed = false;
      if (r.injured) {
        const staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
        const recovered = tickRikishiRecovery(r, staffBonuses.medical);
        changed = true;
        if (recovered) {
          EventBus.lifecycleEvent(world, {
            rikishiId: r.id,
            heyaId: r.heyaId,
            shikona: r.shikona || r.name,
            status: "recovery"
          });
        }
      }
      if (!r.injured) {
        const seededRng2 = RNGRegistry.getSystemRNG(world, "health", `tick::${r.id}::${world.week}`);
        const fatigue = r.fatigue ?? 0;
        const result = rollWeeklyInjury({ rng: seededRng2, rikishi: r, fatigue });
        if (result) {
          r.injured = true;
          r.injuryWeeksRemaining = result.weeksOut;
          r.currentInjury = {
            id: seededRng2.uuid("IJ"),
            severity: result.severity,
            area: result.area,
            type: result.type,
            weeksOut: result.weeksOut,
            weekOccurred: world.week ?? 0
          };
          changed = true;
          EventBus.lifecycleEvent(world, {
            rikishiId: r.id,
            heyaId: r.heyaId,
            shikona: r.shikona || r.name,
            status: "injury",
            reason: result.area,
            score: result.weeksOut
          });
        }
      }
      if (changed) {
        nextRikishi.set(id, r);
      }
    }
    return {
      ...world,
      rikishi: nextRikishi
    };
  }
  function phase01_week_welfare(world) {
    const nextHeyas = new Map(world.heyas);
    const week = world.calendar.currentWeek || 0;
    for (const [id, heya] of world.heyas) {
      const nextHeya = { ...heya };
      const state = WelfareService.ensureHeyaWelfareState(nextHeya);
      const nextState = { ...state };
      const beforeRisk = nextState.welfareRisk;
      const { delta, reasons } = calculateWeeklyWelfareDelta(world, nextHeya, nextState);
      nextState.welfareRisk = clamp(Math.round(nextState.welfareRisk + delta), 0, 100);
      nextState.weeksInState++;
      nextState.lastReviewedWeek = week;
      orchestrateTransitionsPure(world, nextHeya, nextState, reasons);
      nextHeya.riskIndicators = {
        ...heya.riskIndicators,
        welfare: nextState.complianceState !== "compliant" || nextState.welfareRisk >= 55
      };
      nextHeya.welfareState = nextState;
      const riskUp = nextState.welfareRisk - beforeRisk;
      if (Math.abs(riskUp) >= 8) {
        EventBus.welfareCompliance(world, nextHeya.id, {
          heyaname: nextHeya.name,
          status: "risk_shift",
          risk: nextState.welfareRisk,
          delta: riskUp,
          reason: reasons.join("|")
        });
      }
      nextHeyas.set(id, nextHeya);
    }
    return {
      ...world,
      heyas: nextHeyas
    };
  }
  function orchestrateTransitionsPure(world, heya, state, reasons) {
    const { seriousCount, negligenceCount } = computeInjuryPressure(world, heya);
    const hasNegligence = negligenceCount > 0;
    const week = world.calendar.currentWeek || 0;
    switch (state.complianceState) {
      case "compliant":
        const watchThreshold = hasNegligence ? 30 : 45;
        if (state.welfareRisk >= watchThreshold || seriousCount >= 2 || hasNegligence && state.welfareRisk >= 20) {
          setComplianceStatePure(state, "watch");
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "watch",
            incident: hasNegligence ? "negligence_suspected" : "standard_watch",
            reason: reasons.join("|")
          });
          generateGovernanceHeadline(world, heya.id);
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 15);
          }
        }
        break;
      case "watch":
        if (state.welfareRisk >= 65 && state.weeksInState >= 2) {
          setComplianceStatePure(state, "investigation");
          state.investigation = {
            openedWeek: week,
            severity: state.welfareRisk >= 80 ? "high" : state.welfareRisk >= 72 ? "medium" : "low",
            triggers: reasons,
            progress: 0
          };
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "investigation_opened",
            risk: state.welfareRisk
          });
          generateGovernanceHeadline(world, heya.id, "major", `Full-scale investigation opened into ${heya.name}.`);
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 30);
          }
        } else if (state.welfareRisk <= 25 && state.weeksInState >= 3) {
          setComplianceStatePure(state, "compliant");
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "cleared",
            risk: state.welfareRisk
          });
        }
        break;
      case "investigation":
        const progressGain = clamp(Math.round(4 + (heya.facilities?.recovery || 50) / 30), 2, 12);
        state.investigation.progress = clamp((state.investigation.progress || 0) + progressGain, 0, 100);
        if (state.welfareRisk >= 85 || seriousCount >= 3 && state.welfareRisk >= 70) {
          setComplianceStatePure(state, "sanctioned");
          const fineYen = 5e6;
          state.sanctions = {
            recruitmentFreezeWeeks: 12,
            trainingIntensityCap: "medium",
            fineYen,
            note: "Mandatory welfare remediation"
          };
          heya.funds = (heya.funds ?? 0) - fineYen;
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "sanctioned",
            risk: state.welfareRisk,
            money: fineYen
          });
          generateGovernanceHeadline(world, heya.id, "critical", `Sanctions imposed on ${heya.name} for welfare violations.`);
          if (world.mediaState) {
            world.mediaState.heyaPressure[heya.id] = Math.min(100, (world.mediaState.heyaPressure[heya.id] ?? 0) + 50);
          }
        } else if (state.investigation.progress >= 100 && state.welfareRisk <= 50) {
          setComplianceStatePure(state, "watch");
          state.investigation = void 0;
          EventBus.welfareCompliance(world, heya.id, {
            heyaname: heya.name,
            status: "investigation_closed",
            risk: state.welfareRisk
          });
        }
        break;
      case "sanctioned":
        if (state.sanctions?.recruitmentFreezeWeeks && state.sanctions.recruitmentFreezeWeeks > 0) {
          state.sanctions.recruitmentFreezeWeeks--;
        }
        const freezeDone = !state.sanctions?.recruitmentFreezeWeeks || state.sanctions.recruitmentFreezeWeeks <= 0;
        if (freezeDone && state.welfareRisk <= 45 && state.weeksInState >= 4) {
          setComplianceStatePure(state, "watch");
          state.sanctions = void 0;
          EventBus.welfareCompliance(world, heya.id, {
            status: "sanctions_lifted",
            heyaname: heya.name,
            risk: state.welfareRisk
          });
        }
        break;
    }
  }
  function setComplianceStatePure(state, next) {
    if (state.complianceState !== next) {
      state.complianceState = next;
      state.weeksInState = 0;
    }
  }
  function phase01_week_governance(world) {
    const nextHeyas = new Map(world.heyas);
    const isElectionWeek = world.week === 52 && world.year % 2 === 0;
    for (const [id, heya] of world.heyas) {
      const nextHeya = { ...heya };
      let changed = false;
      if (nextHeya.scandalScore && nextHeya.scandalScore > 0) {
        nextHeya.scandalScore = Math.max(0, nextHeya.scandalScore - 1);
        changed = true;
      }
      if (nextHeya.scandalScore != null && nextHeya.scandalScore >= 30 && nextHeya.id === world.playerHeyaId) {
        EventBus.governanceRuling(world, nextHeya.id, {
          score: nextHeya.scandalScore,
          incident: "governance_warning",
          reason: "Scandal threshold exceeded"
        }, "major");
      }
      const score = nextHeya.scandalScore ?? 0;
      const newStatus = score >= 60 ? "sanctioned" : score >= 30 ? "probation" : score >= 15 ? "warning" : "good_standing";
      if (nextHeya.governanceStatus !== newStatus) {
        const prevStatus = nextHeya.governanceStatus;
        nextHeya.governanceStatus = newStatus;
        changed = true;
        EventBus.governanceRuling(world, nextHeya.id, {
          incident: "status_changed",
          status: newStatus,
          reason: prevStatus,
          score: Math.floor(score)
        }, newStatus === "sanctioned" ? "headline" : newStatus === "probation" ? "major" : "notable");
        if (newStatus === "sanctioned" || newStatus === "probation") {
          generateGovernanceHeadline(
            world,
            nextHeya.id,
            newStatus === "sanctioned" ? "critical" : "major",
            `${nextHeya.name} governance status has escalated to ${newStatus}.`
          );
        }
      }
      if (isElectionWeek && nextHeya.ichimon) {
        if (nextHeya.politicalCapital !== void 0) {
          nextHeya.politicalCapital = Math.min(100, (nextHeya.politicalCapital ?? 50) + 5);
          changed = true;
        }
      }
      if (changed) {
        nextHeyas.set(id, nextHeya);
      }
    }
    if (isElectionWeek) {
      const ichimons = new Set(Array.from(world.heyas.values()).map((h) => h.ichimon).filter(Boolean));
      ichimons.forEach((ichimon) => {
        EventBus.bashoStatus(world, {
          status: "phase_transition",
          incident: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
          shikona: ichimon
        });
      });
    }
    return {
      ...world,
      heyas: nextHeyas
    };
  }
  const cacheMap = /* @__PURE__ */ new WeakMap();
  function getCache(world) {
    let cache = cacheMap.get(world);
    if (!cache || cache.dayIndexGlobal !== world.dayIndexGlobal) {
      cache = { dayIndexGlobal: world.dayIndexGlobal ?? 0 };
      cacheMap.set(world, cache);
    }
    return cache;
  }
  function getAvailableStables(world) {
    const cache = getCache(world);
    if (cache.availableStables) return cache.availableStables;
    const result = [];
    for (const h of world.heyas.values()) {
      result.push(h);
    }
    cache.availableStables = result;
    return result;
  }
  function getRikishi(world, id) {
    return world.rikishi.get(id) || world.historicalRikishi?.get(id);
  }
  function getHeya(world, id) {
    return world.heyas.get(id);
  }
  function getOyakataForHeya(world, heyaId) {
    const heya = world.heyas.get(heyaId);
    if (!heya) return void 0;
    return world.oyakata.get(heya.oyakataId);
  }
  function getHeyaRosterIds(world, heyaId) {
    const heya = world.heyas.get(heyaId);
    return heya?.rikishiIds ?? [];
  }
  function getHeyaRoster(world, heyaId) {
    const ids = getHeyaRosterIds(world, heyaId);
    const roster = [];
    for (const id of ids) {
      const r = world.rikishi.get(id);
      if (r) roster.push(r);
    }
    return roster;
  }
  function getHeyaStyleBias(world, heyaId) {
    const roster = getHeyaRoster(world, heyaId);
    let oshi = 0;
    let yotsu = 0;
    for (const r of roster) {
      if (r.style === "oshi") oshi += 1;
      if (r.style === "yotsu") yotsu += 1;
    }
    if (oshi === yotsu) return "neutral";
    return oshi > yotsu ? "oshi" : "yotsu";
  }
  function bandHealth(r) {
    const c = r.condition ?? 100;
    if (c >= 90) return "peak";
    if (c >= 70) return "good";
    if (c >= 50) return "fair";
    if (c >= 30) return "worn";
    return "fragile";
  }
  function bandWelfareRisk(risk) {
    if (risk <= 20) return "safe";
    if (risk <= 44) return "cautious";
    if (risk <= 69) return "elevated";
    return "critical";
  }
  function bandGovernancePressure(scandalScore, status) {
    if (status === "sanctioned") return "severe";
    if (status === "probation" || scandalScore >= 60) return "moderate";
    if (status === "warning" || scandalScore >= 30) return "mild";
    return "none";
  }
  function bandMediaHeat(heat) {
    if (heat >= 75) return "blazing";
    if (heat >= 50) return "hot";
    if (heat >= 25) return "warm";
    return "cold";
  }
  function bandRivalry(world, heyaId) {
    const heya = world.heyas.get(heyaId);
    if (!heya) return "dormant";
    const rivalriesState = world.rivalriesState;
    if (!rivalriesState?.pairs) return "dormant";
    let maxHeat = 0;
    const rIds = heya.rikishiIds || [];
    if (rIds.length === 0) return "dormant";
    const rIdSet = new Set(rIds);
    for (const pair of Object.values(rivalriesState.pairs)) {
      if (rIdSet.has(pair.aId) || rIdSet.has(pair.bId)) {
        if (pair.heat > maxHeat) maxHeat = pair.heat;
      }
    }
    if (maxHeat >= 75) return "fierce";
    if (maxHeat >= 50) return "heated";
    if (maxHeat >= 25) return "simmering";
    return "dormant";
  }
  function bandRosterStrength(heya, world) {
    const RANK_WEIGHT = {
      yokozuna: 100,
      ozeki: 85,
      sekiwake: 70,
      komusubi: 60,
      maegashira: 40,
      juryo: 25,
      makushita: 15,
      sandanme: 10,
      jonidan: 5,
      jonokuchi: 2
    };
    const roster = getHeyaRoster(world, heya.id);
    let total = 0;
    for (const r of roster) {
      total += RANK_WEIGHT[r.rank] ?? 5;
    }
    const avg = roster.length > 0 ? total / roster.length : 0;
    if (avg >= 60) return "dominant";
    if (avg >= 40) return "strong";
    if (avg >= 25) return "competitive";
    if (avg >= 12) return "developing";
    return "weak";
  }
  function bandMorale(heya, world) {
    const welfareRisk = heya.welfareState?.welfareRisk ?? 10;
    const roster = getHeyaRoster(world, heya.id);
    let momentumSum = 0;
    for (const r of roster) {
      momentumSum += r.momentum ?? 0;
    }
    const avgMomentum = roster.length > 0 ? momentumSum / roster.length : 0;
    const score = (100 - welfareRisk) * 0.6 + (avgMomentum + 5) * 4;
    if (score >= 85) return "inspired";
    if (score >= 65) return "content";
    if (score >= 45) return "neutral";
    if (score >= 25) return "disgruntled";
    return "mutinous";
  }
  function bandRikishiMomentum(m) {
    if (m >= 2) return "rising";
    if (m <= -2) return "declining";
    return "steady";
  }
  function getStableMediaHeat(world, heyaId) {
    const mediaState = world.mediaState;
    if (!mediaState?.heyaPressure) return 0;
    return mediaState.heyaPressure[heyaId] ?? 0;
  }
  function getRikishiMediaHeat(world, rikishiId) {
    const mediaState = world.mediaState;
    if (!mediaState?.mediaHeat) return 0;
    return mediaState.mediaHeat[rikishiId] ?? 0;
  }
  function buildPerceptionSnapshot(world, heyaId) {
    const heya = world.heyas.get(heyaId);
    if (!heya) {
      return {
        heyaId,
        heyaName: "Unknown",
        generatedAtWeek: world.week,
        generatedAtYear: world.year,
        statureBand: "new",
        prestigeBand: "unknown",
        runwayBand: "comfortable",
        koenkaiBand: "none",
        welfareRiskBand: "safe",
        complianceState: "compliant",
        governancePressureBand: "none",
        stableMediaHeatBand: "cold",
        rivalryPressureBand: "dormant",
        rosterStrengthBand: "weak",
        rosterSize: 0,
        moraleBand: "neutral",
        rikishiPerceptions: [],
        alignmentScore: 100,
        styleBias: "neutral"
      };
    }
    const welfareRisk = heya.welfareState?.welfareRisk ?? 10;
    const roster = getHeyaRoster(world, heyaId);
    const rikishiPerceptions = roster.map((r) => ({
      rikishiId: r.id,
      shikona: r.shikona,
      rank: r.rank,
      style: r.style,
      healthBand: bandHealth(r),
      mediaHeatBand: bandMediaHeat(getRikishiMediaHeat(world, r.id)),
      momentum: bandRikishiMomentum(r.momentum ?? 0)
    }));
    const styleBias = getHeyaStyleBias(world, heyaId);
    return {
      heyaId,
      heyaName: heya.name,
      generatedAtWeek: world.week,
      generatedAtYear: world.year,
      statureBand: heya.statureBand,
      prestigeBand: heya.prestigeBand,
      runwayBand: heya.runwayBand,
      koenkaiBand: heya.koenkaiBand,
      welfareRiskBand: bandWelfareRisk(welfareRisk),
      complianceState: heya.welfareState?.complianceState ?? "compliant",
      governancePressureBand: bandGovernancePressure(heya.scandalScore, heya.governanceStatus),
      stableMediaHeatBand: bandMediaHeat(getStableMediaHeat(world, heyaId)),
      rivalryPressureBand: bandRivalry(world, heyaId),
      rosterStrengthBand: bandRosterStrength(heya, world),
      rosterSize: (heya.rikishiIds || []).length,
      moraleBand: bandMorale(heya, world),
      rikishiPerceptions,
      alignmentScore: 100,
      // Default to full alignment, updated by Oyakata memory consolidation
      styleBias
    };
  }
  function getCachedPerception(world, heyaId) {
    const cached = world.perceptionCache?.[heyaId];
    if (cached) return cached;
    return buildPerceptionSnapshot(world, heyaId);
  }
  const PHILOSOPHY_BY_ARCHETYPE = {
    traditionalist: ["traditionalist", "style_purist"],
    scientist: ["meta_chaser", "innovator", "balanced"],
    gambler: ["underdog_hunter", "meta_chaser"],
    nurturer: ["balanced", "underdog_hunter"],
    tyrant: ["size_matters", "style_purist"],
    strategist: ["meta_chaser", "balanced", "innovator"],
    strict: ["style_purist", "traditionalist"],
    indulgent: ["balanced", "underdog_hunter"]
  };
  function getOyakataStyleProfile(world, oyakata) {
    const rng = rngForWorld(world, "oyakataStyle", oyakata.id);
    const options = PHILOSOPHY_BY_ARCHETYPE[oyakata.archetype] ?? ["balanced"];
    const philosophy = options[rng.int(0, options.length - 1)];
    switch (philosophy) {
      case "style_purist": {
        const styleBias = (oyakata.traits?.tradition ?? 50) >= 60 ? "yotsu" : "oshi";
        return {
          philosophy,
          preferredArchetypes: styleBias === "yotsu" ? ["yotsu"] : ["oshi", "tsuppari"],
          preferredStyle: styleBias,
          statWeights: { power: 0.7, speed: 0.4, technique: 0.9, size: 0.5, potential: 0.6 },
          description: `Exclusively recruits ${styleBias} wrestlers. Refuses to train other styles.`
        };
      }
      case "meta_chaser": {
        const meta = world._postBashoMeta;
        const metaStyle = meta?.metaBias === "oshi" ? "oshi" : meta?.metaBias === "yotsu" ? "yotsu" : "hybrid";
        return {
          philosophy,
          preferredArchetypes: metaStyle === "oshi" ? ["oshi", "speedster"] : metaStyle === "yotsu" ? ["yotsu"] : ["hybrid"],
          preferredStyle: metaStyle,
          statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.8 },
          description: `Adapts recruitment to the current dominant style. Currently favoring ${metaStyle}.`
        };
      }
      case "traditionalist":
        return {
          philosophy,
          preferredArchetypes: ["yotsu", "hybrid"],
          preferredStyle: "yotsu",
          statWeights: { power: 0.8, speed: 0.3, technique: 0.7, size: 0.8, potential: 0.5 },
          description: "Old school. Believes in belt-wrestling, heavy training, and traditional methods."
        };
      case "innovator":
        return {
          philosophy,
          preferredArchetypes: ["speedster", "trickster", "defensive"],
          preferredStyle: "any",
          statWeights: { power: 0.3, speed: 0.9, technique: 0.8, size: 0.2, potential: 0.9 },
          description: "Seeks unconventional wrestlers who can outthink and outmaneuver opponents."
        };
      case "size_matters":
        return {
          philosophy,
          preferredArchetypes: ["oshi", "hybrid", "giant"],
          preferredStyle: "oshi",
          statWeights: { power: 0.9, speed: 0.2, technique: 0.4, size: 1, potential: 0.5 },
          description: "Recruits the biggest, heaviest prospects. Believes mass wins matches."
        };
      case "underdog_hunter":
        return {
          philosophy,
          preferredArchetypes: ["trickster", "speedster"],
          preferredStyle: "any",
          statWeights: { power: 0.4, speed: 0.5, technique: 0.5, size: 0.3, potential: 1 },
          description: "Scouts overlooked talent from obscure sources. Values raw potential over polish."
        };
      case "balanced":
      default:
        return {
          philosophy: "balanced",
          preferredArchetypes: ["hybrid"],
          preferredStyle: "any",
          statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.7 },
          description: "No strong recruitment bias. Evaluates each prospect on individual merit."
        };
    }
  }
  const HARD_CAP_ROSTER_SIZE = 30;
  function enforceHardCapRosterOverflow(world) {
    let totalReleased = 0;
    for (const heya of stableSort(world.heyas.values(), (x) => x.id)) {
      if (!heya.rikishiIds || heya.rikishiIds.length <= HARD_CAP_ROSTER_SIZE) continue;
      const overflowCount = heya.rikishiIds.length - HARD_CAP_ROSTER_SIZE;
      const candidatesForRelease = heya.rikishiIds.map((rId) => world.rikishi.get(rId)).filter((r) => r !== void 0);
      const scoredCandidates = candidatesForRelease.map((r) => {
        let score = 0;
        const potential = r.talentSeed ?? (r.power + r.speed + r.technique) / 3;
        score += potential;
        score += (r.experience ?? 0) * 0.5;
        if (r.injured) {
          score -= (r.injuryWeeksRemaining ?? 0) * 2;
        }
        const winRatio = (r.currentBashoWins ?? 0) / ((r.currentBashoWins ?? 0) + (r.currentBashoLosses ?? 0) || 1);
        score += winRatio * 20;
        if (countsAsForeignFromRikishi(r)) {
          score += 30;
        }
        const tieBreaker = parseInt(r.id.slice(-4), 16) / 65535 || 0;
        score += tieBreaker;
        return { rikishi: r, score };
      });
      scoredCandidates.sort((a, b) => a.score - b.score || stableTieBreak(a.rikishi.id, b.rikishi.id));
      const toRelease = scoredCandidates.slice(0, overflowCount);
      for (const { rikishi } of toRelease) {
        releaseRikishiToPool(world, heya, rikishi);
        totalReleased++;
      }
    }
    return totalReleased;
  }
  function releaseRikishiToPool(world, heya, rikishi) {
    heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== rikishi.id);
    rikishi.heyaId = "";
    EventBus.rosterEvent(world, heya.id, {
      rikishiId: rikishi.id,
      shikona: rikishi.shikona,
      heya: heya.name,
      limit: HARD_CAP_ROSTER_SIZE
    });
    reinjectToTalentPool(world, rikishi);
  }
  const TOTAL_MYOSEKI = 105;
  const MYOSEKI_NAMES = [
    "Tateyama",
    "Nishonoseki",
    "Kokonoe",
    "Takasago",
    "Dewanoumi",
    "Tokitsukaze",
    "Isegahama",
    "Kasugano",
    "Tatsunami",
    "Sakaigawa",
    "Sadogatake",
    "Musashigawa",
    "Oitekaze",
    "Miyagino",
    "Hakkaku",
    "Oguruma",
    "Michinoku",
    "Isenoumi",
    "Takadagawa",
    "Shikoroyama",
    "Tagonoura",
    "Otake",
    "Tomozuna",
    "Kise",
    "Futagoyama",
    "Asahiyama",
    "Arashio",
    "Oshiogawa",
    "Takekuma",
    "Chiganoura",
    "Hanakago",
    "Kagamiyama",
    "Kataonami",
    "Magaki",
    "Minato",
    "Minezaki",
    "Naruto",
    "Nishikido",
    "Onogawa",
    "Onomatsu",
    "Shikihide",
    "Tamanoi",
    "Tatsutagawa",
    "Azumazeki",
    "Irumagawa",
    "Kiriyama",
    "Asakayama",
    "Shiranui",
    "Otowayama",
    "Urakaze",
    "Ikazuchi",
    "Jinmaku",
    "Oshiogawa",
    "Tatsunami",
    "Minato",
    "Tatsunami",
    "Kumagatani",
    "Irumagawa",
    "Tatsutagawa",
    "Edagawa",
    "Kise",
    "Kasugayama",
    "Tatsutayama",
    "Tatsutayama",
    "Minato",
    "Fujishima",
    "Katsunoura",
    "Oyamazumi",
    "Hanakago",
    "Shiratama",
    "Onomatsu",
    "Asahiyama",
    "Tatsutayama",
    "Izutsu",
    "Asakayama",
    "Irumagawa",
    "Kumagatani",
    "Kumagatani",
    "Edagawa",
    "Minatogawa",
    "Sanoyama",
    "Tatsutayama",
    "Minatogawa",
    "Kumagatani",
    "Izutsu",
    "Kumagatani",
    "Tatsutayama",
    "Shikoroyama",
    "Kise",
    "Onogawa",
    "Kumagatani",
    "Izutsu",
    "Onogawa",
    "Shikoroyama",
    "Kise",
    "Izutsu",
    "Onogawa",
    "Kumagatani",
    "Edagawa",
    "Kise",
    "Shikoroyama",
    "Izutsu",
    "Onogawa",
    "Kumagatani",
    "Minatogawa"
  ];
  const uniqueNames = Array.from(new Set(MYOSEKI_NAMES));
  while (uniqueNames.length < TOTAL_MYOSEKI) {
    uniqueNames.push(`Elder_${uniqueNames.length + 1}`);
  }
  const QUIRK_IDS = [
    "Old-School Stickler",
    "Gambler's Instinct",
    "Welfare Hawk",
    "Discipline Hawk",
    "Media Operator",
    "Sleeper Scout",
    "Nepotist",
    "Weight-Cutter",
    "Keiko Romantic",
    "Cold Pragmatist",
    "Family First",
    "Numbers Guy"
  ];
  function pickUnique(rng, items, count) {
    const pool = [...items];
    const out = [];
    while (pool.length && out.length < count) {
      const idx = Math.floor(rng.next() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }
  function ensurePersonaForOyakata(world, oyakata) {
    if (Array.isArray(oyakata.quirks) && oyakata.quirks.length) return;
    const rng = rngForWorld(world, "oyakataPersona", oyakata.id);
    const baseCount = oyakata.archetype === "tyrant" || oyakata.archetype === "gambler" ? 3 : 2;
    const quirkIds = pickUnique(rng, QUIRK_IDS, baseCount);
    const quirkLabels = quirkIds.map((id) => BardEngine$1.resolve(rng, `oyakata.quirks.${id}`).text);
    const flags = {
      welfareHawk: quirkIds.includes("Welfare Hawk") || oyakata.traits.compassion >= 75,
      disciplineHawk: quirkIds.includes("Discipline Hawk") || oyakata.archetype === "tyrant" || oyakata.traits.tradition >= 80,
      publicityHawk: quirkIds.includes("Media Operator") || oyakata.traits.ambition >= 80,
      nepotist: quirkIds.includes("Nepotist")
    };
    oyakata.quirks = quirkLabels;
    oyakata.managerFlags = flags;
  }
  function getManagerPersona(world, heyaId) {
    const heya = getHeya(world, heyaId);
    const oyakata = getOyakataForHeya(world, heyaId);
    const perception = getCachedPerception(world, heyaId);
    if (!heya || !oyakata) {
      return {
        archetype: "unknown",
        traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
        quirks: [],
        flags: { welfareHawk: false, disciplineHawk: false, publicityHawk: false, nepotist: false },
        styleBias: "neutral",
        welfareDiscipline: 0.4,
        riskAppetite: 0.5,
        perception,
        mood: "content"
      };
    }
    ensurePersonaForOyakata(world, oyakata);
    const traits = oyakata.traits;
    const flags = {
      welfareHawk: Boolean(oyakata.managerFlags?.welfareHawk),
      disciplineHawk: Boolean(oyakata.managerFlags?.disciplineHawk),
      publicityHawk: Boolean(oyakata.managerFlags?.publicityHawk),
      nepotist: Boolean(oyakata.managerFlags?.nepotist)
    };
    const welfareDiscipline = Math.max(0, Math.min(
      1,
      traits.compassion / 120 + (flags.welfareHawk ? 0.25 : 0) - traits.risk / 220
    ));
    const riskAppetite = Math.max(0, Math.min(
      1,
      traits.risk / 100 * 0.65 + traits.ambition / 100 * 0.35
    ));
    return {
      archetype: oyakata.archetype,
      traits,
      quirks: oyakata.quirks ?? [],
      flags,
      styleBias: getHeyaStyleBias(world, heyaId),
      welfareDiscipline,
      riskAppetite,
      perception,
      mood: oyakata.mood ?? "content"
    };
  }
  function seededRng(provided) {
    return new SeededRNG("npc_strategy");
  }
  function decideTrainingIntensity(perception, riskAppetite, welfareDiscipline, mood, complianceCap, philosophy, providedRng) {
    const rng = seededRng();
    const INTENSITY_RANK = ["conservative", "balanced", "intensive", "punishing"];
    const rank = (i) => INTENSITY_RANK.indexOf(i);
    const fragileCount = perception.rikishiPerceptions.reduce((acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0), 0);
    const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;
    let intensity;
    let reason;
    if (perception.welfareRiskBand === "critical") {
      intensity = "conservative";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.conservative_risk").text;
    } else if (perception.welfareRiskBand === "elevated" && welfareDiscipline > 0.5) {
      intensity = "conservative";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.conservative_longevity").text;
    } else if (fragileRatio >= 0.4) {
      intensity = "conservative";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.conservative_stabilizing", { COUNT: fragileCount }).text;
    } else if (perception.moraleBand === "mutinous" || perception.moraleBand === "disgruntled") {
      intensity = "balanced";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.balanced_friction").text;
    } else if (philosophy === "size_matters" && perception.welfareRiskBand === "safe") {
      intensity = "intensive";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.intensive_size").text;
    } else if (philosophy === "underdog_hunter" || philosophy === "balanced" || philosophy === "innovator") {
      intensity = "balanced";
      const philKey = philosophy === "underdog_hunter" ? "experimental" : philosophy === "innovator" ? "aggressive" : "balanced";
      const philLabel = BardEngine$1.resolve(rng, `strategy.philosophies.${philKey}`).text;
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.balanced_standard", { philosophy: philLabel }).text;
    } else if (riskAppetite > 0.85 && perception.welfareRiskBand === "safe") {
      intensity = "punishing";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.punishing_dominance").text;
    } else if (riskAppetite > 0.7 && (perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong")) {
      intensity = "intensive";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.intensive_standard").text;
    } else if (mood === "furious" || mood === "obsessed") {
      intensity = "punishing";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.punishing_emotional").text;
    } else {
      intensity = "balanced";
      reason = BardEngine$1.resolve(rng, "npc.strategy.intensity.balanced_operational").text;
    }
    if (complianceCap && rank(intensity) > rank(complianceCap)) {
      intensity = complianceCap;
      reason += " " + BardEngine$1.resolve(rng, "npc.strategy.intensity.capped", { CAP: intensity }).text;
    }
    return { intensity, reason };
  }
  function decideTrainingFocus(perception, styleBias, tradition, philosophy, providedRng) {
    const rng = seededRng();
    if (philosophy === "size_matters") {
      return { focus: "power", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.size_matters").text };
    }
    if (philosophy === "innovator") {
      return { focus: "speed", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.innovator").text };
    }
    if (philosophy === "traditionalist" || philosophy === "style_purist" && styleBias === "yotsu") {
      return { focus: "balance", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.traditionalist").text };
    }
    if (tradition >= 75 && styleBias === "yotsu") {
      return { focus: "balance", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.traditionalist_yotsu").text };
    }
    if (tradition >= 75) {
      return { focus: "power", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.traditionalist_power").text };
    }
    if (perception.rosterStrengthBand === "developing" || perception.rosterStrengthBand === "weak") {
      return { focus: "technique", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.developing").text };
    }
    if (styleBias === "oshi") {
      return { focus: "power", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.oshi_biased").text };
    }
    if (styleBias === "yotsu") {
      return { focus: "technique", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.yotsu_biased").text };
    }
    return { focus: "neutral", reason: BardEngine$1.resolve(rng, "npc.strategy.focus.neutral").text };
  }
  function decideRecovery(perception, welfareDiscipline, providedRng) {
    const rng = seededRng();
    const fragileCount = perception.rikishiPerceptions.reduce((acc, r) => acc + (r.healthBand === "fragile" || r.healthBand === "worn" ? 1 : 0), 0);
    const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;
    if (perception.welfareRiskBand === "critical" || fragileRatio >= 0.5) {
      return { recovery: "high", reason: BardEngine$1.resolve(rng, "npc.strategy.recovery.critical").text };
    }
    if (perception.welfareRiskBand === "elevated" || fragileRatio >= 0.3 || welfareDiscipline > 0.7) {
      return { recovery: "high", reason: BardEngine$1.resolve(rng, "npc.strategy.recovery.elevated").text };
    }
    if (fragileRatio <= 0.1 && perception.welfareRiskBand === "safe") {
      return { recovery: "low", reason: BardEngine$1.resolve(rng, "npc.strategy.recovery.minimal").text };
    }
    return { recovery: "normal", reason: BardEngine$1.resolve(rng, "npc.strategy.recovery.standard").text };
  }
  function decideScoutingPriority(perception, ambition, hasSleeperScoutQuirk, providedRng) {
    const rng = seededRng();
    if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
      return { priority: "none", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.suspended").text };
    }
    if (perception.rosterSize < 8 || perception.rosterStrengthBand === "weak") {
      return { priority: "aggressive", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.aggressive").text };
    }
    if (hasSleeperScoutQuirk) {
      return { priority: "active", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.active_sleeper").text };
    }
    if (ambition >= 75 && perception.rosterStrengthBand !== "dominant") {
      return { priority: "active", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.active_ambitious").text };
    }
    if (perception.rosterStrengthBand === "dominant") {
      return { priority: "passive", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.passive_dominant").text };
    }
    return { priority: "passive", reason: BardEngine$1.resolve(rng, "npc.strategy.scouting.passive_standard").text };
  }
  function identifyProtects(perception, welfareDiscipline, providedRng) {
    const rng = seededRng();
    const HIGH_RANKS = /* @__PURE__ */ new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
    const protectIds = [];
    for (const rp of perception.rikishiPerceptions) {
      if (rp.healthBand === "fragile") {
        protectIds.push(rp.rikishiId);
      } else if (rp.healthBand === "worn" && HIGH_RANKS.has(rp.rank)) {
        protectIds.push(rp.rikishiId);
      } else if (rp.healthBand === "worn" && welfareDiscipline > 0.6) {
        protectIds.push(rp.rikishiId);
      }
    }
    const reason = protectIds.length > 0 ? BardEngine$1.resolve(rng, "npc.strategy.protect.active", { COUNT: protectIds.length }).text : BardEngine$1.resolve(rng, "npc.strategy.protect.none").text;
    return { protectIds, reason };
  }
  function makeNPCWeeklyDecision(world, heyaId) {
    const persona = getManagerPersona(world, heyaId);
    const perception = persona.perception;
    const reasoning = [];
    const heya = getHeya(world, heyaId);
    const oyakata = heya ? getOyakataForHeya(world, heyaId) : void 0;
    const styleProfile = oyakata ? getOyakataStyleProfile(world, oyakata) : void 0;
    const philosophy = styleProfile?.philosophy;
    const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap;
    const trainingProposal = spawnTrainingWorker({
      perception: rpPerception(perception),
      // Isolated rikishi perception
      riskAppetite: persona.riskAppetite,
      welfareDiscipline: persona.welfareDiscipline,
      mood: persona.mood,
      complianceCap,
      philosophy,
      styleBias: persona.styleBias,
      tradition: persona.traits.tradition
    });
    reasoning.push(...trainingProposal.reasoning);
    const scoutingProposal = spawnScoutingWorker({
      runwayBand: perception.runwayBand,
      rosterSize: perception.rosterSize,
      rosterStrengthBand: perception.rosterStrengthBand,
      ambition: persona.traits.ambition,
      hasSleeperScout: persona.quirks.includes("Sleeper Scout")
    });
    reasoning.push(scoutingProposal.reason);
    const personnelProposal = spawnPersonnelWorker({
      rikishiPerceptions: perception.rikishiPerceptions,
      welfareDiscipline: persona.welfareDiscipline,
      styleProfile,
      world
      // Needed for getRikishi (limited read)
    });
    reasoning.push(...personnelProposal.reasoning);
    if (persona.mood === "furious" && trainingProposal.trainingIntensity !== "punishing") {
      trainingProposal.trainingIntensity = "punishing";
      reasoning.push("[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury.");
    }
    return {
      heyaId,
      archetype: persona.archetype,
      trainingIntensity: trainingProposal.trainingIntensity,
      trainingFocus: trainingProposal.trainingFocus,
      recovery: trainingProposal.recovery,
      scoutingPriority: scoutingProposal.priority,
      individualProtects: personnelProposal.individualProtects,
      individualDevelops: personnelProposal.individualDevelops,
      individualPushes: personnelProposal.individualPushes,
      reasoning,
      mood: persona.mood
    };
  }
  function spawnTrainingWorker(ctx) {
    const intensity = decideTrainingIntensity(
      ctx.perception,
      ctx.riskAppetite,
      ctx.welfareDiscipline,
      ctx.mood,
      ctx.complianceCap,
      ctx.philosophy
    );
    const focus = decideTrainingFocus(
      ctx.perception,
      ctx.styleBias,
      ctx.tradition,
      ctx.philosophy
    );
    const recovery = decideRecovery(ctx.perception, ctx.welfareDiscipline);
    return {
      trainingIntensity: intensity.intensity,
      trainingFocus: focus.focus,
      recovery: recovery.recovery,
      reasoning: [`[Training Worker] ${intensity.reason}`, `[Focus Worker] ${focus.reason}`, `[Recovery Worker] ${recovery.reason}`]
    };
  }
  function spawnScoutingWorker(ctx) {
    const decision = decideScoutingPriority(
      { runwayBand: ctx.runwayBand, rosterSize: ctx.rosterSize, rosterStrengthBand: ctx.rosterStrengthBand },
      ctx.ambition,
      ctx.hasSleeperScout
    );
    return {
      priority: decision.priority,
      reason: `[Scouting Worker] ${decision.reason}`
    };
  }
  function spawnPersonnelWorker(ctx) {
    const reasoning = [];
    const protectDecision = identifyProtects(ctx, ctx.welfareDiscipline);
    if (protectDecision.protectIds.length > 0) {
      reasoning.push(`[Personnel Worker] ${protectDecision.reason}`);
    }
    const individualDevelops = [];
    const individualPushes = [];
    const protectedSet = new Set(protectDecision.protectIds);
    if (ctx.styleProfile && ctx.rikishiPerceptions.length > 0) {
      for (const rp of ctx.rikishiPerceptions) {
        if (protectedSet.has(rp.rikishiId)) continue;
        const rikishi = getRikishi(ctx.world, rp.rikishiId);
        if (!rikishi) continue;
        const matchesStyle = ctx.styleProfile.preferredStyle === "any" || rikishi.style === ctx.styleProfile.preferredStyle;
        const matchesArchetype = ctx.styleProfile.preferredArchetypes.includes(rikishi.archetype);
        if (matchesArchetype && matchesStyle) {
          if ((rp.healthBand === "peak" || rp.healthBand === "good") && (ctx.styleProfile.philosophy === "style_purist" || ctx.styleProfile.philosophy === "size_matters")) {
            individualPushes.push(rp.rikishiId);
          } else if (rp.healthBand === "peak" || rp.healthBand === "good") {
            individualDevelops.push(rp.rikishiId);
          }
        } else if (matchesArchetype || matchesStyle) {
          individualDevelops.push(rp.rikishiId);
        }
      }
      individualPushes.splice(3);
      individualDevelops.splice(5);
      if (individualPushes.length > 0) {
        reasoning.push(`[Personnel Worker] Philosophy push: ${individualPushes.length} wrestlers`);
      }
    }
    return {
      protectIds: protectDecision.protectIds,
      individualProtects: protectDecision.protectIds,
      individualDevelops,
      individualPushes,
      reasoning
    };
  }
  function rpPerception(p) {
    return {
      rikishiPerceptions: p.rikishiPerceptions,
      welfareRiskBand: p.welfareRiskBand,
      rosterSize: p.rosterSize,
      moraleBand: p.moraleBand,
      rosterStrengthBand: p.rosterStrengthBand
    };
  }
  function tickYear(world) {
    for (const heya of getAvailableStables(world)) {
      if (heya.id === world.playerHeyaId) continue;
      const persona = getManagerPersona(world, heya.id);
      if (persona.traits.ambition > 70 && persona.perception.rosterStrengthBand === "weak") {
        EventBus.managementDecision(world, heya.id, {
          year: world.calendar.year,
          strategy: "rebuild",
          ambition: persona.traits.ambition
        }, "minor");
      }
    }
  }
  function phase01_week_npc_ai(world) {
    const nextTrainingStates = new Map(world.trainingState || []);
    const nextOyakata = new Map(world.oyakata);
    const scoutingMap = {};
    const playerHeyaId = world.playerHeyaId;
    for (const heya of getAvailableStables(world)) {
      if (heya.id === playerHeyaId) continue;
      const perception = buildPerceptionSnapshot(world, heya.id);
      const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : void 0;
      if (oyakata) {
        const nextOya = { ...oyakata };
        consolidateOyakataMemoryPure(world, nextOya, perception);
        const decision = makeNPCWeeklyDecision(world, heya.id);
        applyNPCDecisionPure(world, nextTrainingStates, decision);
        const oldMood = nextOya.mood ?? "content";
        const newMood = decision.mood;
        if (newMood) nextOya.mood = newMood;
        if (oldMood !== newMood) {
          EventBus.oyakataMoodShift(world, heya.id, { oldMood, newMood });
        }
        scoutingMap[heya.id] = decision.scoutingPriority;
        EventBus.managementDecision(world, heya.id, {
          archetype: decision.archetype,
          intensity: decision.trainingIntensity,
          focus: decision.trainingFocus,
          recovery: decision.recovery,
          scouting: decision.scoutingPriority,
          protectedCount: decision.individualProtects.length,
          reasoningLog: decision.reasoning.join(" | ")
        }, decision.trainingIntensity === "punishing" || decision.trainingIntensity === "conservative" ? "notable" : "minor");
        if (decision.trainingIntensity === "punishing") {
          EventBus.strategyShift(world, heya.id, { intensity: "punishing", reasoning: decision.reasoning[0] });
        }
        nextOyakata.set(nextOya.id, nextOya);
      }
    }
    let nextWorld = {
      ...world,
      trainingState: nextTrainingStates,
      oyakata: nextOyakata,
      npcScoutingPriorities: scoutingMap
    };
    nextWorld = enforceHardCapRosterOverflow(nextWorld);
    return nextWorld;
  }
  function consolidateOyakataMemoryPure(world, oyakata, perception) {
    if (!oyakata.memory) {
      oyakata.memory = {
        observations: [],
        coreDirectives: [`Maintain the excellence of stable`, `Prioritize ${oyakata.archetype} values`],
        lastConsolidationTick: world.week
      };
    }
    const memory = { ...oyakata.memory };
    memory.observations = [...memory.observations];
    const tick = world.week;
    if (perception.moraleBand === "mutinous" && oyakata.mood !== "furious" && oyakata.mood !== "anxious") {
      memory.observations.push({
        tick,
        type: "alignment",
        summary: `Unexpected morale collapse detected.`,
        importance: 8
      });
    }
    if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
      memory.observations.push({
        tick,
        type: "perception",
        summary: `Financial runway is ${perception.runwayBand}.`,
        importance: 10
      });
    }
    if (memory.observations.length > 10) {
      memory.observations.sort((a, b) => b.importance - a.importance);
      memory.observations = memory.observations.slice(0, 10);
    }
    memory.lastConsolidationTick = tick;
    oyakata.memory = memory;
  }
  function applyNPCDecisionPure(world, nextTrainingStates, decision) {
    const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);
    const nextState = { ...state };
    nextState.activeProfile = {
      ...state.activeProfile,
      intensity: decision.trainingIntensity,
      focus: decision.trainingFocus,
      recovery: decision.recovery
    };
    const allManagedIds = /* @__PURE__ */ new Set([
      ...decision.individualProtects,
      ...decision.individualPushes,
      ...decision.individualDevelops
    ]);
    const existingFocus = state.focusSlots.filter((f) => !allManagedIds.has(f.rikishiId));
    const protectSlots = decision.individualProtects.map((id) => ({
      rikishiId: id,
      focusType: "protect"
    }));
    const pushSlots = decision.individualPushes.map((id) => ({
      rikishiId: id,
      focusType: "push"
    }));
    const developSlots = decision.individualDevelops.map((id) => ({
      rikishiId: id,
      focusType: "develop"
    }));
    nextState.focusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];
    nextTrainingStates.set(decision.heyaId, nextState);
  }
  function phase01_week_recruitment(world) {
    let nextWorld = { ...world };
    if (nextWorld.talentPool) {
      nextWorld.talentPool = {
        ...nextWorld.talentPool,
        playerScouting: { ...nextWorld.talentPool.playerScouting },
        candidates: { ...nextWorld.talentPool.candidates }
      };
      for (const [id, record] of Object.entries(nextWorld.talentPool.playerScouting)) {
        if (nextWorld.week - record.lastScoutedWeek > 4) {
          nextWorld.talentPool.playerScouting[id] = {
            ...record,
            scoutingLevel: Math.max(0, record.scoutingLevel - 2)
          };
        }
      }
      for (const id in nextWorld.talentPool.candidates) {
        const candidate = { ...nextWorld.talentPool.candidates[id] };
        if (candidate.availabilityState === "in_talks" && candidate.competingSuitors.length > 0) {
          const deadlineExpired = candidate.competingSuitors.some((s) => nextWorld.week >= s.deadlineWeek);
          if (deadlineExpired) {
            const bandRank = { all_in: 4, high: 3, medium: 2, low: 1 };
            const winner = [...candidate.competingSuitors].sort(
              (a, b) => (bandRank[b.interestBand] ?? 0) - (bandRank[a.interestBand] ?? 0)
            )[0];
            candidate.availabilityState = "signed";
            candidate.competingSuitors = [winner];
            nextWorld.talentPool.candidates[id] = candidate;
            const heya = nextWorld.heyas.get(winner.heyaId);
            if (heya && candidate.talentSeed >= 80) {
              const nextHeya = {
                ...heya,
                reputation: Math.min(100, (heya.reputation ?? 50) + 5)
              };
              const nextHeyas = new Map(nextWorld.heyas);
              nextHeyas.set(nextHeya.id, nextHeya);
              nextWorld.heyas = nextHeyas;
              EventBus.recruitDiscovered(nextWorld, {
                rikishiId: candidate.candidateId,
                heyaId: winner.heyaId,
                shikona: candidate.name,
                heya: heya.name,
                score: candidate.talentSeed,
                status: "high_talent_signed"
              });
            }
          }
        }
      }
    }
    const rw = nextWorld._recruitmentWindow;
    if (rw?.isOpen && nextWorld.week >= rw.closesAtWeek) {
      nextWorld._recruitmentWindow = { ...rw, isOpen: false };
      if (nextWorld.playerHeyaId) {
        EventBus.recruitDiscovered(nextWorld, {
          rikishiId: nextWorld.playerHeyaId,
          heyaId: nextWorld.playerHeyaId,
          status: "window_closed",
          day: nextWorld.week
        });
      }
    }
    if (nextWorld.cyclePhase === "interim") {
      const elapsedWeeks = Math.floor((42 - (nextWorld._interimDaysRemaining ?? 0)) / 7);
      if (elapsedWeeks === 3 && !nextWorld._recruitmentWindow?.isOpen) {
        const playerHeya = nextWorld.playerHeyaId ? nextWorld.heyas.get(nextWorld.playerHeyaId) : null;
        if (playerHeya && playerHeya.welfareState?.complianceState !== "sanctioned") {
          nextWorld._recruitmentWindow = {
            openedAtWeek: nextWorld.week,
            closesAtWeek: nextWorld.week + 2,
            vacancies: 0,
            isOpen: true,
            phase: "mid_interim"
          };
          EventBus.recruitDiscovered(nextWorld, {
            rikishiId: playerHeya.id,
            heyaId: playerHeya.id,
            status: "window_open",
            day: nextWorld.week + 2,
            incident: "mid_interim"
          });
        }
      }
    }
    if (nextWorld.cyclePhase === "interim" && Math.floor((42 - (nextWorld._interimDaysRemaining ?? 0)) / 7) === 3) {
      const smallStables = {};
      let hasItems = false;
      for (const h of nextWorld.heyas.values()) {
        if (h.id !== nextWorld.playerHeyaId && (h.rikishiIds ?? []).length < 6) {
          smallStables[h.id] = Math.max(1, 6 - (h.rikishiIds ?? []).length);
          hasItems = true;
        }
      }
      if (hasItems) {
        fillVacanciesForNPC(nextWorld, smallStables);
      }
    }
    return nextWorld;
  }
  function phase01_week_rivalries(world) {
    let nextWorld = { ...world };
    if (nextWorld.rivalriesState) {
      const nextPairs = {};
      const week = nextWorld.calendar.currentWeek || 0;
      for (const key in nextWorld.rivalriesState.pairs) {
        const pair = { ...nextWorld.rivalriesState.pairs[key] };
        const weeksSince = week - (pair.lastMetWeek || 0);
        const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1 : 1.5;
        pair.heat = clamp(pair.heat - decay, 0, 100);
        pair.closeness = clamp(pair.closeness - 0.25, 0, 100);
        pair.spite = clamp(pair.spite - 0.35, 0, 100);
        pair.tone = deriveTone(pair);
        const isCold = pair.heat < 5 && pair.meetings < 2 && weeksSince > 30;
        if (!isCold) {
          nextPairs[key] = pair;
        }
      }
      nextWorld.rivalriesState = {
        ...nextWorld.rivalriesState,
        pairs: nextPairs
      };
    }
    if (nextWorld.eventState) {
      const eventsState = { ...nextWorld.eventState };
      const currentYear = nextWorld.calendar?.year ?? nextWorld.year ?? 2025;
      const currentWeek = nextWorld.calendar?.currentWeek ?? nextWorld.week ?? 0;
      const MAX_AGE_WEEKS = 52;
      const currentTotalWeeks = currentYear * 52 + currentWeek;
      const newLog = eventsState.log.filter((ev) => {
        const evTotalWeeks = ev.year * 52 + ev.week;
        const ageWeeks = currentTotalWeeks - evTotalWeeks;
        const isHeadline = ev.importance === "headline";
        const isCareerOrBasho = ev.category === "career" || ev.category === "basho";
        const isRecent = ageWeeks <= MAX_AGE_WEEKS;
        return isRecent || isHeadline || isCareerOrBasho;
      });
      nextWorld.eventState = {
        ...eventsState,
        log: newLog
      };
    }
    return nextWorld;
  }
  function computeFacilitiesBand(heya) {
    const avg = (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    if (avg >= 85) return "world_class";
    if (avg >= 65) return "excellent";
    if (avg >= 45) return "adequate";
    if (avg >= 25) return "basic";
    return "minimal";
  }
  function phase05_monthly_gates(world) {
    const boundaries = world.transientContext?.boundaries;
    if (!boundaries?.monthBoundary) return world;
    const nextHeyas = new Map(world.heyas);
    const nextRikishi = new Map(world.rikishi);
    for (const [id, heya] of world.heyas) {
      let nextHeya = { ...heya };
      let totalSalaries = 0;
      const rikishiIds = nextHeya.rikishiIds ?? [];
      for (const rId of rikishiIds) {
        const r = nextRikishi.get(rId) || world.rikishi.get(rId);
        if (!r) continue;
        const info = RANK_HIERARCHY[r.rank];
        if (info?.isSekitori) {
          const baseSalary = info.salary ?? 0;
          const kinboshiCount = r.stats?.achievements?.kinboshiEarned ?? 0;
          const kinboshiStipend = r.division === "makuuchi" ? kinboshiCount * 4e4 : 0;
          const totalRikishiPay = baseSalary + kinboshiStipend;
          const nextR = { ...r, economics: { ...r.economics || { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 } } };
          nextR.economics.cash += totalRikishiPay;
          nextR.economics.totalEarnings += totalRikishiPay;
          nextRikishi.set(rId, nextR);
          totalSalaries += totalRikishiPay;
        } else {
          totalSalaries += 7e4;
        }
      }
      const staffBonuses = getHeyaStaffBonuses(world, nextHeya.id);
      const oyakataSalary = 12e5 * staffBonuses.administration;
      const facilityUpkeep = (nextHeya.facilities.training * 4e3 + nextHeya.facilities.recovery * 4e3 + nextHeya.facilities.nutrition * 8e3) * staffBonuses.administration;
      const totalExpenses = totalSalaries + facilityUpkeep + oyakataSalary;
      nextHeya.funds = (nextHeya.funds ?? 0) - totalExpenses;
      if (nextHeya.activeLoans && nextHeya.activeLoans.length > 0) {
        let totalPayment = 0;
        const nextLoans = [];
        for (const loan of nextHeya.activeLoans) {
          const payment = Math.min(loan.monthlyPayment, loan.remainingBalance);
          totalPayment += payment;
          const nextLoan = { ...loan, remainingBalance: loan.remainingBalance - payment };
          if (nextLoan.remainingBalance > 0) {
            nextLoans.push(nextLoan);
          } else {
            EventBus.financialAlert(world, nextHeya.id, {
              incident: "loan_paid_off",
              status: loan.type,
              heya: loan.providerName,
              heyaname: nextHeya.name
            });
          }
        }
        nextHeya.activeLoans = nextLoans;
        nextHeya.funds -= totalPayment;
      }
      const maintenance = (nextHeya.facilities.training + nextHeya.facilities.recovery + nextHeya.facilities.nutrition) * 3e3;
      if (nextHeya.funds >= maintenance) {
        nextHeya.funds -= maintenance;
      } else {
        nextHeya.facilities = {
          training: Math.max(5, nextHeya.facilities.training - 2),
          recovery: Math.max(5, nextHeya.facilities.recovery - 2),
          nutrition: Math.max(5, nextHeya.facilities.nutrition - 2)
        };
        const oldBand = nextHeya.facilitiesBand;
        nextHeya.facilitiesBand = computeFacilitiesBand(nextHeya);
        if (nextHeya.facilitiesBand !== oldBand) {
          EventBus.facilityUpdate(world, nextHeya.id, {
            oldBand,
            newBand: nextHeya.facilitiesBand
          }, "DEGRADED");
        }
      }
      const burn = Math.max(1, totalExpenses + maintenance);
      const runway = nextHeya.funds / burn;
      nextHeya.runwayBand = runway >= 12 ? "secure" : runway >= 6 ? "comfortable" : runway >= 3 ? "tight" : runway >= 1 ? "critical" : "desperate";
      nextHeyas.set(id, nextHeya);
    }
    if (isBashoMonth(world.calendar.month)) {
      for (const [id, r] of nextRikishi) {
        if (r.isRetired) continue;
        const nextR = { ...r };
        const evidence = nextR.archetypeEvidence;
        if (evidence && !Array.isArray(evidence)) {
          let newArchetype = nextR.tacticalArchetypePrimary;
          if (evidence.push.success >= 5 && evidence.push.success > evidence.grapple.success) newArchetype = "oshi";
          else if (evidence.grapple.success >= 5 && evidence.grapple.success > evidence.push.success) newArchetype = "yotsu";
          if (newArchetype !== nextR.tacticalArchetypePrimary) {
            EventBus.trainingUpdate(world, { rikishiId: id, status: newArchetype, reason: nextR.tacticalArchetypePrimary });
            nextR.tacticalArchetypePrimary = newArchetype;
          }
          nextR.archetypeEvidence = { push: { success: 0, fail: 0 }, grapple: { success: 0, fail: 0 }, evade: { success: 0, fail: 0 } };
          nextRikishi.set(id, nextR);
        }
      }
    }
    EventBus.bashoStatus(world, {
      status: "meta_shift",
      incident: "monthly_boundary",
      day: world.calendar.month,
      score: world.calendar.year
    });
    return {
      ...world,
      heyas: nextHeyas,
      rikishi: nextRikishi
    };
  }
  function createEmptyHallOfFame() {
    return {
      version: "1.0.0",
      inductees: [],
      inducted: {},
      lastProcessedYear: 0
    };
  }
  const CHAMPION_YUSHO_MIN = 3;
  const IRON_MAN_BASHO_MIN = 30;
  const TECHNICIAN_GINO_MIN = 3;
  function tryAddInductee(world, hof, newInductees, rid, r, category, stats) {
    const key = `${rid}::${category}`;
    if (hof.inducted[key]) return;
    const inductee = {
      rikishiId: rid,
      shikona: r.shikona || r.name || rid,
      category,
      inductionYear: world.year,
      stats: {
        highestRank: r.rank,
        careerWins: r.careerWins || 0,
        careerLosses: r.careerLosses || 0,
        ...stats
      }
    };
    newInductees.push(inductee);
    hof.inductees.push(inductee);
    hof.inducted[key] = true;
  }
  function processChampions(world, history, hof, newInductees) {
    const yushoCounts = /* @__PURE__ */ new Map();
    for (const br of history) {
      if (br.yusho) {
        yushoCounts.set(br.yusho, (yushoCounts.get(br.yusho) || 0) + 1);
      }
    }
    for (const [rid, count] of yushoCounts) {
      if (count < CHAMPION_YUSHO_MIN) continue;
      const r = world.rikishi.get(rid);
      if (!r) continue;
      tryAddInductee(world, hof, newInductees, rid, r, "champion", { yushoCount: count });
    }
  }
  function processIronMen(world, hof, newInductees) {
    for (const r of world.rikishi.values()) {
      if (r.isRetired) continue;
      const totalBouts = (r.careerWins || 0) + (r.careerLosses || 0);
      const estimatedBasho = Math.floor(totalBouts / 7);
      if (estimatedBasho < IRON_MAN_BASHO_MIN) continue;
      tryAddInductee(world, hof, newInductees, r.id, r, "iron_man", { consecutiveBasho: estimatedBasho });
    }
  }
  function processTechnicians(world, history, hof, newInductees) {
    const ginoCountsStats = /* @__PURE__ */ new Map();
    for (const br of history) {
      if (br.ginoSho) {
        ginoCountsStats.set(br.ginoSho, (ginoCountsStats.get(br.ginoSho) || 0) + 1);
      }
    }
    for (const [rid, count] of ginoCountsStats) {
      if (count < TECHNICIAN_GINO_MIN) continue;
      const r = world.rikishi.get(rid);
      if (!r) continue;
      tryAddInductee(world, hof, newInductees, rid, r, "technician", { ginoShoCount: count });
    }
  }
  function processYearEndInduction(world) {
    const hof = getOrCreateHoF(world);
    if (hof.lastProcessedYear >= world.year) return [];
    hof.lastProcessedYear = world.year;
    const history = Array.isArray(world.history) ? world.history : [];
    const newInductees = [];
    processChampions(world, history, hof, newInductees);
    processIronMen(world, hof, newInductees);
    processTechnicians(world, history, hof, newInductees);
    return newInductees;
  }
  function getOrCreateHoF(world) {
    const w = world;
    if (!w.hallOfFame) {
      w.hallOfFame = createEmptyHallOfFame();
    }
    return w.hallOfFame;
  }
  function phase06_yearly_gates(world) {
    const boundaries = world.transientContext?.boundaries;
    if (!boundaries?.yearBoundary) return world;
    let nextWorld = { ...world, year: world.calendar.year };
    if (nextWorld.hallOfFame) {
      nextWorld.hallOfFame = {
        ...nextWorld.hallOfFame,
        inductees: [...nextWorld.hallOfFame.inductees],
        inducted: { ...nextWorld.hallOfFame.inducted }
      };
    }
    const inductees = processYearEndInduction(nextWorld);
    const hofInductees = inductees.map((i) => i.shikona);
    for (const inductee of inductees) {
      EventBus.lifecycleEvent(nextWorld, {
        rikishiId: inductee.rikishiId,
        shikona: inductee.shikona,
        status: "hof_induction",
        reason: inductee.category,
        score: inductee.stats.yushoCount ?? 0
      });
    }
    if (nextWorld.talentPool) {
      nextWorld.talentPool = {
        ...nextWorld.talentPool,
        candidates: { ...nextWorld.talentPool.candidates }
      };
    }
    tickYear(nextWorld);
    if (nextWorld.staff) {
      const nextStaff = new Map(nextWorld.staff);
      for (const [id, staff] of nextWorld.staff) {
        const s = { ...staff };
        s.age += 1;
        s.yearsAtBeya += 1;
        if (s.careerPhase === "apprentice" && s.age >= 30) s.careerPhase = "established";
        else if (s.careerPhase === "established" && s.age >= 45) s.careerPhase = "senior";
        else if (s.careerPhase === "senior" && s.age >= 55) s.careerPhase = "declining";
        else if (s.careerPhase === "declining" && s.age >= 65) s.careerPhase = "retired";
        nextStaff.set(id, s);
      }
      nextWorld.staff = nextStaff;
    }
    const newYear = nextWorld.year;
    const isDecadeBoundary = newYear % 10 === 0;
    EventBus.bashoStatus(nextWorld, {
      status: "meta_shift",
      incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
      day: newYear,
      score: hofInductees.length,
      reason: hofInductees.length > 0 ? hofInductees.join("|") : "None"
    });
    return nextWorld;
  }
  function phase06_narrative(world) {
    const deltas = world.transientContext?.deltas;
    if (!deltas) return world;
    const next = { ...world };
    for (const rId of deltas.injuriesSustained) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      EventBus.lifecycleEvent(next, {
        rikishiId: rId,
        heyaId: r.heyaId,
        shikona: r.shikona,
        status: "injury",
        score: r.injuryWeeksRemaining
      });
    }
    if (deltas.expenses > deltas.revenue) {
      const playerHeyaId = world.playerHeyaId;
      const heya = playerHeyaId ? world.heyas.get(playerHeyaId) : void 0;
      if (heya && heya.funds < 0) {
        EventBus.financialAlert(next, playerHeyaId, {
          incident: "insolvency",
          money: heya.funds,
          heyaname: heya.name ?? heya.id
        }, "major");
      }
    }
    for (const [rId, changes] of Object.entries(deltas.statChanges)) {
      const bigGains = changes.filter((c) => c.amount >= 1);
      if (bigGains.length === 0) continue;
      const r = world.rikishi.get(rId);
      if (!r) continue;
      bigGains.map((c) => `+${c.amount.toFixed(1)} ${c.stat}`).join(", ");
      EventBus.trainingUpdate(next, {
        rikishiId: rId,
        heyaId: r.heyaId,
        shikona: r.shikona,
        incident: "milestone",
        status: bigGains[0].stat,
        // main stat gained
        score: bigGains[0].amount
        // main gain amount
      });
    }
    return next;
  }
  const bashoPipeline = [
    phase01_week_governance,
    phase01_week_npc_ai,
    phase01_week_recruitment,
    phase01_week_rivalries,
    phase06_narrative
  ];
  const offSeasonPipeline = [
    phase01_week_training,
    phase01_week_health,
    phase01_week_welfare,
    phase01_week_governance,
    phase01_week_npc_ai,
    phase01_week_recruitment,
    phase01_week_rivalries,
    phase06_narrative
  ];
  function advanceOneDay(world) {
    const daysSinceTick = (world._daysSinceLastWeeklyTick ?? world.dayIndexGlobal % 7) + 1;
    const aboutToStartBasho = (world.cyclePhase === "pre_basho" || world.cyclePhase === "banzuke_reveal") && (world._interimDaysRemaining || 0) <= 1;
    const isWeeklyTick = daysSinceTick >= 7 || aboutToStartBasho;
    const activePhases = [
      phase00_preflight,
      phase01_daily_economy,
      phase01_daily_welfare,
      phase01_daily_sponsors,
      phase01_monthly_market
    ];
    if (isWeeklyTick) {
      if (world.cyclePhase === "active_basho") {
        activePhases.push(...bashoPipeline);
      } else {
        activePhases.push(...offSeasonPipeline);
      }
    }
    activePhases.push(phase05_monthly_gates);
    activePhases.push(phase06_yearly_gates);
    let nextWorld = runPipeline(world, activePhases);
    nextWorld = {
      ...nextWorld,
      _daysSinceLastWeeklyTick: isWeeklyTick ? 0 : daysSinceTick
    };
    nextWorld.transientContext = {
      ...nextWorld.transientContext,
      lastReport: buildDailyReport(nextWorld, isWeeklyTick)
    };
    return nextWorld;
  }
  function buildDailyReport(world, isWeekly) {
    const boundaries = world.transientContext?.boundaries || { monthBoundary: false, yearBoundary: false };
    return {
      dayIndexGlobal: world.dayIndexGlobal,
      phase: world.cyclePhase,
      subsystemsRun: isWeekly ? ["weekly_pipeline"] : ["daily_micro"],
      monthBoundary: boundaries.monthBoundary,
      yearBoundary: boundaries.yearBoundary
    };
  }
  function cloneWorldForTick(world) {
    return structuredClone(world);
  }
  function tickOrchestrator(world) {
    const next = cloneWorldForTick(world);
    advanceOneDay(next);
    return next;
  }
  function generateH2HCommentary(r1, r2) {
    const recordSeed = `${r1.id}::${r2.id}::${r1.h2h?.[r2.id]?.wins ?? 0}::${r1.h2h?.[r2.id]?.losses ?? 0}`;
    const rng = rngFromSeed("h2h", "h2h", recordSeed);
    if (!r1.h2h) r1.h2h = {};
    const record = r1.h2h[r2.id];
    if (!record || record.wins === 0 && record.losses === 0) {
      return BardEngine$1.resolve(rng, "h2h.first_meeting").text;
    }
    const total = record.wins + record.losses;
    const p1Name = r1.shikona;
    const p2Name = r2.shikona;
    const last = record.lastMatch;
    if (total >= 4 && record.wins / total > 0.75) {
      return BardEngine$1.resolve(rng, "h2h.domination", {
        P1: p1Name,
        P2: p2Name,
        WINS: record.wins.toString(),
        LOSSES: record.losses.toString(),
        TOTAL: total.toString()
      }).text;
    }
    if (total >= 4 && record.losses / total > 0.75) {
      return BardEngine$1.resolve(rng, "h2h.domination", {
        P1: p2Name,
        P2: p1Name,
        WINS: record.losses.toString(),
        LOSSES: record.wins.toString(),
        TOTAL: total.toString()
      }).text;
    }
    if (Math.abs(record.wins - record.losses) <= 1 && total > 2) {
      return BardEngine$1.resolve(rng, "h2h.deadlock", {
        WINS: record.wins.toString(),
        LOSSES: record.losses.toString()
      }).text;
    }
    if (Math.abs(record.streak) >= 3) {
      return BardEngine$1.resolve(rng, "h2h.streak", {
        P1: p1Name,
        P2: p2Name,
        STREAK: Math.abs(record.streak).toString()
      }).text;
    }
    if (last) {
      const winnerName = last.winnerId === r1.id ? p1Name : p2Name;
      const loserName = last.winnerId === r1.id ? p2Name : p1Name;
      return BardEngine$1.resolve(rng, "h2h.recent", {
        DAY: last.day.toString(),
        WINNER: winnerName,
        LOSER: loserName,
        KIMARITE: last.kimarite
      }).text;
    }
    return `${p1Name} leads the series ${record.wins} to ${record.losses}.`;
  }
  function createSelector(fn) {
    let lastWorld = null;
    let lastResult;
    return (world) => {
      if (world === lastWorld && lastWorld !== null) {
        return lastResult;
      }
      lastWorld = world;
      lastResult = fn(world);
      return lastResult;
    };
  }
  const selectAllRikishi = createSelector((world) => {
    return Array.from(world.rikishi.values());
  });
  const selectInjuredRikishi = createSelector((world) => {
    const all = selectAllRikishi(world);
    return all.filter((r) => r.injury?.isInjured || r.injured);
  });
  const selectRecentEvents = createSelector((world) => {
    const recentEvents = world.events?.log ? queryEvents(world, { limit: 120 }) : [];
    const thisWeek = world.week ?? 0;
    const buckets = {
      media: [],
      economy: [],
      scouting: [],
      training: [],
      career: [],
      rivalry: [],
      governance: [],
      welfare: []
    };
    for (const e of recentEvents) {
      if (e.week < thisWeek - 1 || e.week > thisWeek) continue;
      if (e.category === "media" || e.type.includes("SCANDAL")) buckets.media.push(e);
      else if (e.category === "economy" || e.category === "sponsor") buckets.economy.push(e);
      else if (e.category === "scouting") buckets.scouting.push(e);
      else if (e.category === "training") buckets.training.push(e);
      else if (e.category === "career") buckets.career.push(e);
      else if (e.category === "rivalry") buckets.rivalry.push(e);
      else if (e.type.startsWith("GOVERNANCE") || e.category === "discipline") buckets.governance.push(e);
      else if (e.category === "welfare" || e.type.startsWith("COMPLIANCE") || e.type.startsWith("WELFARE")) buckets.welfare.push(e);
    }
    return buckets;
  });
  const CATEGORY_DEFAULTS = {
    Kihonwaza: { tacticalFamily: "push", baseWeight: 500, statWeights: { strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0 }, kimariteClass: "force_out" },
    Nageite: { tacticalFamily: "belt", baseWeight: 100, statWeights: { strength: 0.3, weight: 0.1, speed: 0.1, technique: 0.5, balance: 0 }, requiresBeltGrip: true, kimariteClass: "throw" },
    Kakeite: { tacticalFamily: "speed", baseWeight: 50, statWeights: { strength: 0.1, weight: 0, speed: 0.5, technique: 0.4, balance: 0 }, kimariteClass: "trip" },
    Sorite: { tacticalFamily: "trick", baseWeight: 1, isHighRisk: true, requirements: { isDesperation: true }, statWeights: { strength: 0.1, weight: 0, speed: 0.1, technique: 0.8, balance: 0 }, kimariteClass: "special" },
    Hinerite: { tacticalFamily: "trick", baseWeight: 100, statWeights: { strength: 0.1, weight: 0.1, speed: 0.2, technique: 0.6, balance: 0 }, leverageTarget: "momentum", kimariteClass: "twist" },
    Tokushuwaza: { tacticalFamily: "trick", baseWeight: 50, statWeights: { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.4, balance: 0 }, kimariteClass: "special" },
    Hiwaza: { tacticalFamily: "trick", baseWeight: 1, statWeights: { strength: 0.1, weight: 0.4, speed: 0.2, technique: 0.3, balance: 0 }, kimariteClass: "result" }
  };
  function defineKimarite(entry) {
    const defaults = CATEGORY_DEFAULTS[entry.jsaCategory] || {};
    const baseWeight = entry.baseWeight ?? defaults.baseWeight ?? 1;
    const rarity = entry.rarity ?? (baseWeight <= 5 ? "legendary" : baseWeight <= 30 ? "rare" : baseWeight <= 150 ? "uncommon" : "common");
    return {
      ...defaults,
      ...entry,
      statWeights: entry.statWeights ?? defaults.statWeights ?? { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.2, balance: 0.2 },
      baseWeight,
      rarity,
      requirements: { ...defaults.requirements, ...entry.requirements },
      isHighRisk: entry.isHighRisk ?? defaults.isHighRisk ?? false
    };
  }
  const K = defineKimarite;
  const KIMARITE_REGISTRY = [
    // === Kihonwaza (Basic Techniques - 7 moves) ===
    K({ id: "yorikiri", jsaCategory: "Kihonwaza", baseWeight: 1e3, tacticalFamily: "belt", requiresBeltGrip: true }),
    K({ id: "oshidashi", jsaCategory: "Kihonwaza", baseWeight: 850 }),
    K({ id: "oshitaoshi", jsaCategory: "Kihonwaza", baseWeight: 250 }),
    K({ id: "yoritaoshi", jsaCategory: "Kihonwaza", baseWeight: 200, tacticalFamily: "belt", requiresBeltGrip: true }),
    K({ id: "tsukidashi", jsaCategory: "Kihonwaza", baseWeight: 120, statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0 } }),
    K({ id: "tsukitaoshi", jsaCategory: "Kihonwaza", baseWeight: 50, statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0 } }),
    K({ id: "abisetaoshi", jsaCategory: "Kihonwaza", baseWeight: 30, tacticalFamily: "belt", requiresBeltGrip: true }),
    // === Tokushuwaza (Special Techniques - 19 moves) ===
    K({ id: "tsuridashi", jsaCategory: "Tokushuwaza", baseWeight: 25, tacticalFamily: "belt", requiresBeltGrip: true, requirements: { minStrengthDifferential: 30 } }),
    K({ id: "utchari", jsaCategory: "Tokushuwaza", baseWeight: 20, requirements: { edgeOfRing: true } }),
    K({ id: "okuritaoshi", jsaCategory: "Tokushuwaza", baseWeight: 15, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "katasukashi", jsaCategory: "Tokushuwaza", baseWeight: 15 }),
    K({ id: "sokubiotoshi", jsaCategory: "Tokushuwaza", baseWeight: 10 }),
    K({ id: "okurigake", jsaCategory: "Tokushuwaza", baseWeight: 5, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "okurihikiotoshi", jsaCategory: "Tokushuwaza", baseWeight: 5, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "waridashi", jsaCategory: "Tokushuwaza", baseWeight: 5, tacticalFamily: "push" }),
    K({ id: "okurinage", jsaCategory: "Tokushuwaza", baseWeight: 3, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "tsukaminage", jsaCategory: "Tokushuwaza", baseWeight: 2, tacticalFamily: "belt" }),
    K({ id: "okuritsuridashi", jsaCategory: "Tokushuwaza", baseWeight: 2, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "okuritsuriotoshi", jsaCategory: "Tokushuwaza", baseWeight: 1, tacticalFamily: "speed", requirements: { canFlank: true } }),
    K({ id: "yobimodoshi", jsaCategory: "Tokushuwaza", baseWeight: 1, tacticalFamily: "belt" }),
    K({ id: "ushiromotare", jsaCategory: "Tokushuwaza", baseWeight: 1 }),
    // === Nageite (Throwing Techniques - 13 moves) ===
    K({ id: "uwatenage", jsaCategory: "Nageite", baseWeight: 350, leverageTarget: "high_center_of_gravity", requirements: { requiredGrip: { anyHand: "outside" } } }),
    K({ id: "sukuinage", jsaCategory: "Nageite", baseWeight: 200, requiresBeltGrip: false }),
    K({ id: "shitatenage", jsaCategory: "Nageite", baseWeight: 150, requirements: { requiredGrip: { anyHand: "inside" } } }),
    K({ id: "kotenage", jsaCategory: "Nageite", baseWeight: 120, requiresBeltGrip: false }),
    K({ id: "shitatedashinage", jsaCategory: "Nageite", baseWeight: 80, tacticalFamily: "trick" }),
    K({ id: "uwatedashinage", jsaCategory: "Nageite", baseWeight: 60, tacticalFamily: "trick" }),
    K({ id: "kubinage", jsaCategory: "Nageite", baseWeight: 15, requiresBeltGrip: false }),
    K({ id: "koshihineri", jsaCategory: "Nageite", baseWeight: 5 }),
    K({ id: "ipponzeoi", jsaCategory: "Nageite", baseWeight: 3, tacticalFamily: "trick" }),
    K({ id: "nichonage", jsaCategory: "Nageite", baseWeight: 2 }),
    K({ id: "yaguranage", jsaCategory: "Nageite", baseWeight: 2 }),
    K({ id: "kakenage", jsaCategory: "Nageite", baseWeight: 2 }),
    // === Hinerite (Twisting Techniques - 19 moves) ===
    K({ id: "tsukiotoshi", jsaCategory: "Hinerite", baseWeight: 350 }),
    K({ id: "tottari", jsaCategory: "Hinerite", baseWeight: 30 }),
    K({ id: "shitatehineri", jsaCategory: "Hinerite", baseWeight: 25, tacticalFamily: "belt", requiresBeltGrip: true }),
    K({ id: "uwatehineri", jsaCategory: "Hinerite", baseWeight: 20, tacticalFamily: "belt", requiresBeltGrip: true }),
    K({ id: "kotehineri", jsaCategory: "Hinerite", baseWeight: 15, tacticalFamily: "belt" }),
    K({ id: "amiuchi", jsaCategory: "Hinerite", baseWeight: 10 }),
    K({ id: "kainahineri", jsaCategory: "Hinerite", baseWeight: 10 }),
    K({ id: "zubuneri", jsaCategory: "Hinerite", baseWeight: 5 }),
    K({ id: "sakatottari", jsaCategory: "Hinerite", baseWeight: 5 }),
    K({ id: "kubiotoshi", jsaCategory: "Hinerite", baseWeight: 5 }),
    K({ id: "gasshohineri", jsaCategory: "Hinerite", baseWeight: 2, tacticalFamily: "belt" }),
    K({ id: "harimanage", jsaCategory: "Hinerite", baseWeight: 2, tacticalFamily: "belt" }),
    K({ id: "osakate", jsaCategory: "Hinerite", baseWeight: 1 }),
    K({ id: "sabaori", jsaCategory: "Hinerite", baseWeight: 1, tacticalFamily: "belt", requiresBeltGrip: true }),
    K({ id: "sotokomata_hinerite", jsaCategory: "Hinerite", baseWeight: 1 }),
    K({ id: "tokkurinage", jsaCategory: "Hinerite", baseWeight: 1 }),
    K({ id: "makiotoshi", jsaCategory: "Hinerite", baseWeight: 1 }),
    K({ id: "uchimuso", jsaCategory: "Hinerite", baseWeight: 1 }),
    K({ id: "sotomuso", jsaCategory: "Hinerite", baseWeight: 1 }),
    // === Kakeite (Tripping Techniques - 18 moves) ===
    K({ id: "ashitori", jsaCategory: "Kakeite", baseWeight: 30 }),
    K({ id: "sotogake", jsaCategory: "Kakeite", baseWeight: 25 }),
    K({ id: "uchigake", jsaCategory: "Kakeite", baseWeight: 20 }),
    K({ id: "ketaguri", jsaCategory: "Kakeite", baseWeight: 15, tacticalFamily: "trick" }),
    K({ id: "watashikomi", jsaCategory: "Kakeite", baseWeight: 10 }),
    K({ id: "kekaeshi", jsaCategory: "Kakeite", baseWeight: 10 }),
    K({ id: "kosotogake", jsaCategory: "Kakeite", baseWeight: 8 }),
    K({ id: "komatasukui", jsaCategory: "Kakeite", baseWeight: 5 }),
    K({ id: "chongake", jsaCategory: "Kakeite", baseWeight: 3 }),
    K({ id: "kawarigake", jsaCategory: "Kakeite", baseWeight: 2, isHighRisk: true }),
    K({ id: "susoharai", jsaCategory: "Kakeite", baseWeight: 2 }),
    K({ id: "kirikaeshi", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "nimaigeri", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "omata", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "susotori", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "mitokorozeme", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "kosotogari", jsaCategory: "Kakeite", baseWeight: 1 }),
    K({ id: "tsumatori", jsaCategory: "Kakeite", baseWeight: 1 }),
    // === Sorite (Backwards Body Drops - 6 moves) ===
    K({ id: "izori", jsaCategory: "Sorite", baseWeight: 1 }),
    K({ id: "kakezori", jsaCategory: "Sorite", baseWeight: 1 }),
    K({ id: "shumokuzori", jsaCategory: "Sorite", baseWeight: 1 }),
    K({ id: "sototasukizori", jsaCategory: "Sorite", baseWeight: 1 }),
    K({ id: "tasukizori", jsaCategory: "Sorite", baseWeight: 1 }),
    K({ id: "tsutaezori", jsaCategory: "Sorite", baseWeight: 1 }),
    // === Tokushuwaza Continued (Remaining from 19) ===
    K({ id: "kimedashi", jsaCategory: "Tokushuwaza", baseWeight: 5 }),
    K({ id: "kimetaoshi", jsaCategory: "Tokushuwaza", baseWeight: 5 }),
    // === Hiwaza (Non-Winning Techniques - 5 moves) ===
    K({ id: "isamiashi", jsaCategory: "Hiwaza", baseWeight: 1 }),
    K({ id: "koshikudake", jsaCategory: "Hiwaza", baseWeight: 1 }),
    K({ id: "tsukite", jsaCategory: "Hiwaza", baseWeight: 1 }),
    K({ id: "tsukihiza", jsaCategory: "Hiwaza", baseWeight: 1 }),
    K({ id: "fumidashi", jsaCategory: "Hiwaza", baseWeight: 1 }),
    // === Forfeits & Extras (Engine internal) ===
    { id: "fusensho", jsaCategory: "Tokushuwaza", tacticalFamily: "trick", baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, kimariteClass: "forfeit" },
    { id: "hansoku", jsaCategory: "Tokushuwaza", tacticalFamily: "trick", baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, kimariteClass: "forfeit" }
  ];
  new Map(
    KIMARITE_REGISTRY.map((k) => [k.id, k])
  );
  function labelForWorld(world) {
    const year = world.year ?? 2025;
    const week = world.week ?? 0;
    const phase = world.cyclePhase ?? "interim";
    return `${year} — Week ${week} (${phase})`;
  }
  function buildWeeklyDigest(world) {
    if (!world) return null;
    const sections = [];
    const injuryItems = selectInjuredRikishi(world).map((r) => {
      const injury = r.injury;
      return {
        id: `injury::${r.id}`,
        kind: "injury",
        title: `${r.shikona ?? r.name ?? r.id} injured`,
        detail: injury ? `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? 0}w remaining` : "Unknown injury",
        rikishiId: r.id
      };
    });
    if (injuryItems.length) {
      const sectionRng2 = new SeededRNG((world.seed || "section") + "_injuries");
      sections.push({
        id: "injuries",
        title: BardEngine$1.resolve(sectionRng2, "ui.digest.sections.injuries").text,
        items: injuryItems
      });
    }
    const matchupItems = [];
    const basho = world.currentBasho;
    if (basho && world.cyclePhase === "active_basho" && world.week > 1) {
      const day = basho.day ?? 1;
      let matchupCount = 0;
      for (const match of basho.matches || []) {
        if (match.day !== day) continue;
        if (matchupCount >= 3) break;
        matchupCount++;
        const eastId = match.eastRikishiId;
        const westId = match.westRikishiId;
        if (!eastId || !westId) continue;
        const east = world.rikishi.get(eastId);
        const west = world.rikishi.get(westId);
        if (!east || !west) continue;
        matchupItems.push({
          id: `matchup::${east.id}::${west.id}::d${day}`,
          kind: "generic",
          title: `${east.shikona ?? east.name} vs ${west.shikona ?? west.name}`,
          detail: generateH2HCommentary(east, west),
          rikishiId: east.id
        });
      }
      if (matchupItems.length) {
        const sectionRng2 = new SeededRNG((world.seed || "section") + "_matchups");
        sections.push({
          id: "matchups",
          title: BardEngine$1.resolve(sectionRng2, "ui.digest.sections.matchups").text,
          items: matchupItems
        });
      }
    }
    const eventBuckets = selectRecentEvents(world);
    const mapEventToItem = (e) => ({
      id: e.id,
      kind: e.category === "scouting" ? "scouting" : e.category === "economy" || e.category === "sponsor" ? "economy" : e.category === "training" ? "training" : "generic",
      title: e.title,
      detail: e.summary,
      rikishiId: e.rikishiId,
      heyaId: e.heyaId
    });
    const mediaItems = eventBuckets.media.map(mapEventToItem);
    const trainingItems = eventBuckets.training.map(mapEventToItem);
    const careerItems = eventBuckets.career.map(mapEventToItem);
    const rivalryItems = eventBuckets.rivalry.map(mapEventToItem);
    const welfareItems = eventBuckets.welfare.map(mapEventToItem);
    const govItems = eventBuckets.governance.map(mapEventToItem);
    const scoutItems = eventBuckets.scouting.map(mapEventToItem);
    const econItems = eventBuckets.economy.map(mapEventToItem);
    const narrativeItems = queryEvents(world, { category: "narrative" }).map((e) => ({
      ...mapEventToItem(e),
      kind: "narrative"
    }));
    const sectionRng = new SeededRNG((world.seed || "section") + "_" + world.week);
    if (mediaItems.length) sections.push({ id: "media", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.media").text, items: mediaItems });
    if (narrativeItems.length) sections.push({ id: "narrative", title: "Internal Intelligence", items: narrativeItems });
    if (trainingItems.length) sections.push({ id: "training", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.governance").text, items: trainingItems });
    if (careerItems.length) sections.push({ id: "career", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.milestones").text, items: careerItems });
    if (rivalryItems.length) sections.push({ id: "rivalries", title: "Rivalries", items: rivalryItems });
    if (welfareItems.length) sections.push({ id: "welfare", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.governance").text, items: welfareItems });
    if (govItems.length) sections.push({ id: "governance", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.governance").text, items: govItems });
    if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
    if (econItems.length) sections.push({ id: "economy", title: BardEngine$1.resolve(sectionRng, "ui.digest.sections.economy").text, items: econItems });
    const counts = {
      trainingEvents: trainingItems.length,
      injuries: injuryItems.length,
      recoveries: 0,
      economy: econItems.length,
      scouting: scoutItems.length
    };
    const rng = world.rng || new SeededRNG(world.seed || "weekly_digest");
    const headline = basho && world.cyclePhase === "active_basho" ? BardEngine$1.resolve(rng, "ui.digest.status.basho_day", {
      DAY: (basho.day ?? 1).toString(),
      DETAIL: matchupItems.length ? "Key matchups highlighted." : "Tournament in progress."
    }).text : injuryItems.length ? BardEngine$1.resolve(rng, "ui.digest.status.injured", {
      INJURY_COUNT: injuryItems.length.toString()
    }).text : BardEngine$1.resolve(rng, "ui.digest.status.no_events").text;
    return {
      time: { label: labelForWorld(world) },
      headline,
      counts,
      sections
    };
  }
  function generateWorld(opts) {
    const world = generateInitialWorld(opts.seed);
    if (opts.playerConfig?.heyaId) world.playerHeyaId = opts.playerConfig.heyaId;
    return world;
  }
  let currentWorld = null;
  self.onmessage = async (event) => {
    const command = event.data;
    try {
      switch (command.type) {
        case "START_WORLD":
          currentWorld = generateWorld({ seed: command.seed, playerConfig: { heyaId: command.playerHeyaId } });
          emitDigest();
          break;
        case "LOAD_WORLD":
          currentWorld = command.world;
          emitDigest();
          break;
        case "TICK_DAY":
          if (currentWorld) {
            currentWorld = tickOrchestrator(currentWorld);
            emitDigest();
          }
          break;
        case "AUTO_SIM_DAYS":
          if (currentWorld) {
            for (let i = 0; i < command.days; i++) {
              currentWorld = tickOrchestrator(currentWorld);
              if (i % 5 === 0) {
                self.postMessage({
                  type: "PROGRESS",
                  message: `Simulating day ${i + 1} of ${command.days}...`,
                  current: i + 1,
                  total: command.days
                });
              }
            }
            emitDigest();
            self.postMessage({ type: "WORLD_UPDATED", world: currentWorld });
          }
          break;
        case "GET_DIGEST":
          emitDigest();
          break;
        default:
          console.warn(`[Worker] Unknown command: ${command.type}`);
      }
    } catch (err) {
      self.postMessage({ type: "ERROR", message: err.message || "Unknown engine error" });
    }
  };
  function emitDigest() {
    if (!currentWorld) return;
    const digest = buildWeeklyDigest(currentWorld);
    if (digest) {
      self.postMessage({ type: "TICK_COMPLETED", digest });
    }
  }
  self.postMessage({ type: "READY", worldExists: !!currentWorld });
})();
