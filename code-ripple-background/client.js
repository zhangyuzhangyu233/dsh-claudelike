/**
 * Web UI half of the bundle.
 *
 * A port of the "landing texture" that ships inside the Claude desktop app
 * (Claude_2.42304 — resources/ion-dist/assets/v1/c9d397622-*.js,
 * `LandingTextureLayer`): a grid of monospace glyphs over which a wind field
 * blows, the pointer leaves a warm wake, and a click sends a wavefront of
 * light and jumbled characters through the field.
 *
 * Pipeline (same shape as the original):
 *   pass 1  wind: full-screen shader into a columns x rows*2 RGBA8 buffer
 *   pass 2  glyphs: 6 vertices per cell from gl_VertexID, quads the size of
 *           each glyph's ink box, lit per pixel from the wind buffer
 *
 * Everything is one draw per pass; there are no per-cell attributes.
 */
window.__ModuleLoader__.load({
  id: '@local/code-ripple-background',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const TAU = Math.PI * 2;

    /** Tunables, identical to the desktop app's landing texture config. */
    const CONFIG = {
      strength: {
        scale: 1,
        base: { dark: 0.26, light: 0.26 },
        cap: { dark: 0.9, light: 0.9 },
        rest: 0.03,
      },
      surface: { fill: 1, weight: 300, glyphCss: 9, skipUnseen: true },
      wind: {
        energy: 1,
        friction: 0.6,
        flick: 1.2,
        lull: 0.5,
        streak: 0.4,
        detail: 0.6,
        edge: 0.75,
        curl: 0.65,
        wisp: 0.5,
        tail: 0.35,
        sweep: 0.3,
        morph: 3,
        revealS: 4,
      },
      glow: {
        amount: 1,
        headroom: 3,
        color: { dark: [0.1, 0.68, 1], light: [0, 0.25, 1] },
      },
      touch: { stir: 1, ripple: 1, slowPxS: 60, fastPxS: 800 },
      composition: { card: { centerY: 0.45, calmX: 250, calmY: 80, left: 0.3 } },
      grid: { cellCss: 6.5, minCols: 24, minRows: 8, maxDevicePixels: 21e6 },
      power: { frameMs: 40, rippleFrameMs: 10, resizeSettleMs: 150 },
    };

    /** Every printable ASCII character plus a middle dot: 96 atlas cells. */
    const GLYPHS = (function () {
      const chars = [];
      for (let code = 32; code <= 126; code += 1) chars.push(String.fromCharCode(code));
      chars.push('\u00B7');
      return chars.join('');
    })();
    const ATLAS_COLS = 16;
    const ATLAS_ROWS = 6;
    const LOOKS = {
      mixed: 'ab0cAde1fEgh2iGjk3lHmn4oKpq5rMst6uRvw7xSyz8nT9eW',
      lettered: 'abcd3efgRhijk7lmnAopqr0stuEvwxy5zaeKiou2gcS9',
      figured: '0a1b2C3d4e5F6g7h8i9J0k1m2N3p4q5R6s7t8U9v0w1X2y3z',
    };
    const LOOK_KEYS = Object.keys(LOOKS);
    const RECENT_LOOKS_KEY = 'dsh-code-ripple-recent-looks';
    const RECENT_LOOKS_MAX = 3;

    // --------------------------------------------------------------- hashing

    function hash32(value) {
      let t = value >>> 0;
      t = Math.imul(t ^ (t >>> 16), 569420461);
      t = Math.imul(t ^ (t >>> 15), 1935289751);
      return (t ^ (t >>> 15)) >>> 0;
    }

    function randomStream(seed, salt) {
      let state = hash32(seed);
      for (let i = 0; i < salt.length; i += 1) state = hash32(state ^ salt.charCodeAt(i));
      return function next() {
        state = (state + 2654435769) >>> 0;
        return hash32(state) / 4294967296;
      };
    }

    function pickLook(seed, recent) {
      const unused = LOOK_KEYS.filter((key) => !recent.includes(key));
      const alternates = LOOK_KEYS.filter((key) => key !== recent[0]);
      const pool = unused.length ? unused : alternates.length ? alternates : LOOK_KEYS;
      return pool[Math.floor(randomStream(seed, 'look')() * pool.length)] || 'mixed';
    }

    function readRecentLooks() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(RECENT_LOOKS_KEY) || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed.filter((s) => typeof s === 'string');
      } catch (error) {
        /* ignore */
      }
      return [];
    }

    function rememberLook(look) {
      const next = [look, ...readRecentLooks().filter((key) => key !== look)].slice(0, RECENT_LOOKS_MAX);
      try {
        window.localStorage.setItem(RECENT_LOOKS_KEY, JSON.stringify(next));
      } catch (error) {
        /* ignore */
      }
    }

    /** A heading in [-54deg, 54deg] that alternates sides as the seed changes. */
    function headingOf(t) {
      const edge = Math.PI / 10;
      const angle = edge + (Math.PI / 4.3 - edge) * ((t * 2) % 1);
      return t < 0.5 ? angle : Math.PI - angle;
    }

    /** Per-mount wind parameters, derived from the seed exactly like the app. */
    function windParams(seed, look) {
      const next = randomStream(seed, 'wind');
      const between = (a, b) => a + (b - a) * next();
      return {
        key: look in LOOKS ? look : 'mixed',
        seed: seed >>> 0,
        heading: headingOf(next()),
        speed: between(42, 64),
        gustLength: between(380, 560),
        gustWidth: between(120, 190),
        bend: between(60, 110),
        bendScale: between(300, 440),
      };
    }

    // ------------------------------------------------------------ glyph atlas

    function measureFont(doc, family, cellWidth, dpr) {
      const weight = dpr >= 1.5 ? CONFIG.surface.weight : CONFIG.surface.weight + 100;
      const context = doc.createElement('canvas').getContext('2d');
      let advance = 0.6;
      if (context) {
        context.font = weight + ' 100px ' + family;
        advance = context.measureText('0').width / 100 || 0.6;
      }
      return {
        family: family,
        weight: weight,
        px: Math.min(
          Math.round(CONFIG.surface.glyphCss * dpr),
          Math.floor((cellWidth - 2) / advance),
        ),
      };
    }

    function buildAtlas(doc, font, cellWidth, cellHeight) {
      const atlas = doc.createElement('canvas');
      atlas.width = ATLAS_COLS * cellWidth;
      atlas.height = ATLAS_ROWS * cellHeight;
      const context = atlas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;

      context.font = font.weight + ' ' + font.px + 'px ' + font.family;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = 'white';

      const metrics = context.measureText('Mg|');
      const baseline = Math.round(
        (cellHeight - (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)) / 2 +
          metrics.fontBoundingBoxAscent,
      );
      const advance = context.measureText('0').width;
      const inset = Math.floor((cellWidth - advance) / 2);

      const missing = GLYPHS.split('').map(function (glyph, index) {
        if (Math.abs(context.measureText(glyph).width - advance) > 0.5) return true;
        const x = (index % ATLAS_COLS) * cellWidth;
        const y = Math.floor(index / ATLAS_COLS) * cellHeight;
        context.save();
        context.beginPath();
        context.rect(x, y, cellWidth, cellHeight);
        context.clip();
        context.fillText(glyph, x + inset, y + baseline);
        context.restore();
        return false;
      });

      const pixels = context.getImageData(0, 0, atlas.width, atlas.height).data;
      const coverage = new Uint8Array(atlas.width * atlas.height);
      for (let i = 0; i < coverage.length; i += 1) coverage[i] = pixels[i * 4 + 3] || 0;
      return { coverage: coverage, missing: missing, width: atlas.width, height: atlas.height };
    }

    /** Per-glyph ink: its average coverage and the box of pixels it actually marks. */
    function measureGlyphs(coverage, cellWidth, cellHeight) {
      const rowLength = ATLAS_COLS * cellWidth;
      const ink = [];
      const boxes = new Uint8Array(384);
      const threshold = 8;
      for (let g = 0; g < 96; g += 1) {
        const baseX = (g % ATLAS_COLS) * cellWidth;
        const baseY = Math.floor(g / ATLAS_COLS) * cellHeight;
        let sum = 0;
        let minX = cellWidth;
        let minY = cellHeight;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < cellHeight; y += 1) {
          for (let x = 0; x < cellWidth; x += 1) {
            const value = coverage[(baseY + y) * rowLength + baseX + x] || 0;
            sum += value;
            if (value >= threshold) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        ink.push(sum / (255 * cellWidth * cellHeight));
        if (maxX >= 0) boxes.set([minX, minY, maxX - minX + 1, maxY - minY + 1], g * 4);
      }
      return { ink: ink, boxes: boxes };
    }

    /** The look string mapped to atlas indices, with missing glyphs dropped. */
    function buildSequence(look, missing) {
      const source = LOOKS[look] || LOOKS.mixed || '';
      const indices = source
        .split('')
        .map(function (glyph) {
          return GLYPHS.indexOf(glyph);
        })
        .filter(function (index) {
          return index > 0 && missing[index] !== true;
        });
      return Uint8Array.from(
        indices.length > 0 ? indices : [GLYPHS.indexOf('.')],
      );
    }

    // ---------------------------------------------------------------- shaders

    const N = function (value) {
      return Number.isInteger(value) ? value + '.0' : String(value);
    };

    const SH_PCG = `
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float unit(uint h) { return float(h >> 8u) * (1.0 / 16777216.0); }
`;

    const SH_NOISE = `
float value(uint v) { return unit(pcg(v)) * 2.0 - 1.0; }
float noise(vec3 p, uint salt) {
  vec3 fl = floor(p), f = p - fl;
  ivec3 i = ivec3(fl);
  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  uint x0 = uint(i.x), x1 = uint(i.x + 1), y0 = uint(i.y), y1 = uint(i.y + 1);
  uint z0 = pcg(uint(i.z) ^ u_seed ^ salt), z1 = pcg(uint(i.z + 1) ^ u_seed ^ salt);
  uint a = pcg(y0 ^ z0), b = pcg(y1 ^ z0), c = pcg(y0 ^ z1), d = pcg(y1 ^ z1);
  return mix(
    mix(mix(value(x0 ^ a), value(x1 ^ a), w.x), mix(value(x0 ^ b), value(x1 ^ b), w.x), w.y),
    mix(mix(value(x0 ^ c), value(x1 ^ c), w.x), mix(value(x0 ^ d), value(x1 ^ d), w.x), w.y),
    w.z);
}
`;

    const SH_TAPS = `
uniform float u_now;
uniform int u_tapCount;
uniform vec4 u_taps[6];
uniform float u_tapRadii[6];
float heart(vec2 u) {
  float k = -u.x * u.x * u.y * u.y * u.y;
  float c = sign(k) * pow(abs(k), 1.0 / 3.0);
  float r = 1.0;
  for (int i = 0; i < 6; i++) r = sqrt(max(0.05, 1.0 + c * pow(r, 5.0 / 3.0)));
  return r;
}
vec4 tapsAt(vec2 p, out vec2 glow) {
  vec4 sum = vec4(0.0);
  glow = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    if (i >= u_tapCount) break;
    vec4 tap = u_taps[i];
    float maxReach = u_tapRadii[i] > 10.0 ? u_tapRadii[i] : 620.0;
    float age = u_now - tap.z;
    vec2 away = p - tap.xy;
    float d = length(away);
    float reach = tap.w < 0.0 ? d / heart(away / max(d, 1.0)) : d;
    float behind = maxReach * (1.0 - exp(-age / 1.3)) - reach;
    float width = min(85.0, maxReach * 0.3) + (maxReach / 620.0) * 60.0 * age;
    float front = smoothstep(-16.0, 10.0, behind) * exp(-behind * behind / (width * width));
    float swell = abs(tap.w) * exp(-age / 1.5) * front;
    sum.xy += (away / max(d, 1.0)) * (44.0 * swell);
    sum.z += 1.9 * swell * (0.25 + 0.75 * cos(behind * (6.2831853 / min(130.0, maxReach * 0.45))));
    sum.w += swell;
    float trail = smoothstep(0.0, 70.0, behind) * exp(-max(behind, 0.0) / (maxReach * 0.42));
    glow.x += abs(tap.w) * (exp(-age / 1.0) * front + 0.7 * exp(-age / 1.3) * trail);
    glow.y += abs(tap.w) * (1.0 - exp(-age / 0.2)) * exp(-age / 1.2) * trail;
  }
  return sum;
}
`;

    const SH_WARM = `
uniform int u_wakeCount;
uniform vec4 u_wakes[48];
uniform vec4 u_ways[48];
float warmthAt(vec2 p) {
  float warmth = 0.0;
  for (int i = 0; i < 48; i++) {
    if (i >= u_wakeCount) break;
    vec4 wake = u_wakes[i];
    vec3 way = u_ways[i].xyz;
    vec2 away = p - wake.xy;
    away -= way.xy * clamp(dot(away, way.xy), -way.z, way.z);
    warmth += wake.z * exp(-dot(away, away) * wake.w);
  }
  return 1.0 - exp(-1.5 * warmth);
}
`;

    const WIND_VERT = `#version 300 es
precision highp float;
precision highp int;
uniform uint u_seed;
uniform float u_time;
uniform vec4 u_wind;
uniform vec2 u_canvasCss;
out vec4 v_air;
${SH_PCG}
${SH_NOISE}
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
  vec2 heading = vec2(cos(u_wind.x), sin(u_wind.x));
  float carried = u_wind.y * (u_time + 1.0 * noise(vec3(u_time * 0.09, 3.7, 0.0), 0x58u));
  v_air = vec4(heading, carried, 0.58 * (abs(heading.x) * u_canvasCss.x + abs(heading.y) * u_canvasCss.y));
}
`;

    const WIND_FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform uint u_seed;
uniform vec2 u_sampleCss, u_originCss, u_paneCss;
uniform float u_time, u_reveal;
uniform vec4 u_wind;
uniform vec4 u_gust;
uniform vec4 u_shape;
uniform float u_tail, u_sweep;
uniform float u_morph;
in vec4 v_air;
out vec4 o;
const float TAU = 6.2831853;
const vec2 CALM = vec2(${N(CONFIG.composition.card.calmX)}, ${N(CONFIG.composition.card.calmY)});
const float CALM_LEFT = ${N(CONFIG.composition.card.left)};
const float CARD_Y = ${N(CONFIG.composition.card.centerY)};
${SH_PCG}
${SH_NOISE}
${SH_TAPS}
${SH_WARM}
vec3 slope(uint v) {
  uint h = pcg(v);
  return vec3(float(h & 1023u), float((h >> 10u) & 1023u), float((h >> 20u) & 1023u)) * (2.0 / 1023.0) - 1.0;
}
float swirl(vec3 p, uint salt) {
  vec3 fl = floor(p), f = p - fl;
  ivec3 i = ivec3(fl);
  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  uint x0 = uint(i.x), x1 = uint(i.x + 1), y0 = uint(i.y), y1 = uint(i.y + 1);
  uint z0 = pcg(uint(i.z) ^ u_seed ^ salt), z1 = pcg(uint(i.z + 1) ^ u_seed ^ salt);
  uint a = pcg(y0 ^ z0), b = pcg(y1 ^ z0), c = pcg(y0 ^ z1), d = pcg(y1 ^ z1);
  return 1.5 * mix(
    mix(mix(dot(slope(x0 ^ a), f), dot(slope(x1 ^ a), f - vec3(1.0, 0.0, 0.0)), w.x),
        mix(dot(slope(x0 ^ b), f - vec3(0.0, 1.0, 0.0)), dot(slope(x1 ^ b), f - vec3(1.0, 1.0, 0.0)), w.x), w.y),
    mix(mix(dot(slope(x0 ^ c), f - vec3(0.0, 0.0, 1.0)), dot(slope(x1 ^ c), f - vec3(1.0, 0.0, 1.0)), w.x),
        mix(dot(slope(x0 ^ d), f - vec3(0.0, 1.0, 1.0)), dot(slope(x1 ^ d), f - vec3(1.0)), w.x), w.y),
    w.z);
}
float gustsAt(vec2 at, float carried) {
  float gain = mix(0.38, 0.62, u_shape.x);
  float gust = 0.0, weight = 1.0, power = 0.0;
  vec2 size = vec2(0.85, 0.75) * u_wind.zw;
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    gust += weight * swirl(vec3((at.x - carried * (1.0 + 0.1 * k)) / size.x, at.y / size.y, u_morph * u_time * (0.03 + 0.018 * k) + 11.0 * k), 0x60u + uint(i));
    power += weight * weight;
    weight *= gain;
    size *= vec2(0.5, 0.58);
  }
  float strand = 1.0 - abs(swirl(vec3((at.x - 1.15 * carried) / (0.7 * u_wind.z), at.y / (0.95 * u_wind.w), u_morph * u_time * 0.05 + 2.0), 0x66u));
  float span = v_air.w;
  float swell = cos((at.x - carried + 0.5 * span * noise(vec3(u_time * 0.045, at.y / (2.5 * u_wind.w), 7.0), 0x67u)) * (TAU / span));
  return gust * inversesqrt(power) + u_shape.w * 0.5 * (strand * strand * strand - 0.35) + u_sweep * swell;
}
void main() {
  vec2 p = u_originCss + gl_FragCoord.xy * u_sampleCss;
  vec2 heading = v_air.xy;
  vec2 across = vec2(-heading.y, heading.x);
  vec4 hand = vec4(0.0);
  float warm = 0.0;
  if (u_tapCount + u_wakeCount > 0) {
    vec2 near = p + 24.0 * vec2(
      noise(vec3(p / 95.0, u_now * 0.12), 0x71u),
      noise(vec3(p / 95.0 + 9.1, u_now * 0.12 + 4.0), 0x72u));
    vec2 glow;
    hand = tapsAt(near, glow);
    warm = warmthAt(near);
    hand.zw += vec2(0.25, 0.05) * warm;
  }
  vec2 from = p - hand.xy;
  vec2 turn = vec2(
    noise(vec3(from / u_gust.y, u_time * 0.04), 0x51u),
    noise(vec3(from / u_gust.y + 17.3, u_time * 0.04 + 5.0), 0x52u));
  vec2 bent = from + u_gust.x * turn;
  vec2 q = vec2(dot(bent, heading), dot(bent, across));
  float carried = v_air.z;
  vec2 riding = vec2(q.x - 0.85 * carried, q.y);
  float eddySize = 1.15 * u_wind.w, fineSize = 0.38 * u_wind.w;
  vec2 eddy = vec2(
    swirl(vec3(riding / eddySize, u_morph * u_time * 0.04), 0x59u),
    swirl(vec3(riding / eddySize + 31.7, u_morph * u_time * 0.04 + 3.0), 0x5au));
  vec2 folded = riding + u_shape.z * 0.9 * u_wind.w * eddy;
  vec2 fine = vec2(
    swirl(vec3(folded / fineSize, u_morph * u_time * 0.06), 0x5bu),
    swirl(vec3(folded / fineSize + 13.1, u_morph * u_time * 0.06 + 7.0), 0x5cu));
  vec2 creased = (folded + 0.3 * u_wind.w * fine) / 24.0;
  vec2 tiny = vec2(
    swirl(vec3(creased, u_time * 0.07), 0x5du),
    swirl(vec3(creased + 5.3, u_time * 0.07 + 1.0), 0x5eu));
  vec2 pull = u_shape.z * (1.0 + 0.9 * min(hand.w, 1.5)) * (u_wind.w * (0.9 * eddy + 0.3 * fine) + u_shape.x * 30.0 * tiny);
  vec2 curled = q + pull;
  vec2 blows = normalize(heading + 0.6 * turn + hand.xy / 14.0 + u_shape.z * ((0.45 * eddy.x + 0.25 * fine.x) * heading + (0.45 * eddy.y + 0.25 * fine.y) * across));
  float still = gustsAt(curled, carried);
  float field = still + hand.z;
  float level = mix(0.02, 0.82, u_gust.z);
  float band = mix(0.26, 0.03, u_shape.y);
  bool blowing = field > level - band - 0.55 * u_tail;
  float strength = 0.0, streaks = 0.0;
  if (blowing || warm > 0.0) {
    float thread = noise(vec3((curled.x - carried * 1.6) / 140.0, curled.y / 30.0, u_time * 0.16), 0x57u);
    streaks = 1.0 - smoothstep(0.0, 0.5, abs(thread));
  }
  if (blowing) {
    float ahead = gustsAt(curled + vec2(56.0, 0.0), carried);
    float leaving = smoothstep(-0.05, 0.07, ahead - still);
    float lit = smoothstep(level - band - 0.55 * u_tail * leaving, level + band, field);
    float broad = lit * lit * mix(0.45, 1.0, clamp((field - level) / 0.45, 0.0, 1.0)) * (0.82 + 0.18 * fine.y);
    strength = broad * mix(1.0, 0.25 + 0.95 * streaks, u_gust.w);
  }
  if (warm > 0.0) {
    float grain = 0.55 * fine.y + 0.45 * tiny.x + 0.3 * (streaks - 0.4);
    strength = 1.0 - (1.0 - strength) * (1.0 - 0.85 * warm * smoothstep(-0.5, 0.25, grain));
  }
  vec2 e = (p - vec2(0.5 * u_paneCss.x, CARD_Y * u_paneCss.y)) / CALM;
  float calm = 1.0 - (1.0 - CALM_LEFT) * exp(-0.9 * dot(e, e));
  float shown = max(u_reveal, min(1.0, 2.0 * hand.w + warm));
  o = vec4(strength * calm * shown, blows * 0.5 + 0.5, calm * shown);
}
`;

    const GLYPH_VERT = `#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D u_boxes;
uniform highp sampler2D u_sequence;
uniform highp sampler2D u_wind;
uniform ivec2 u_grid, u_cell, u_buffer;
uniform uint u_seed;
uniform float u_time, u_fill, u_flick;
uniform int u_count;
uniform vec4 u_cellCss;
out vec2 v_shift;
out vec4 v_box;
out vec2 v_glow;
const ivec2 CORNER[6] = ivec2[6](ivec2(0, 0), ivec2(1, 0), ivec2(0, 1), ivec2(0, 1), ivec2(1, 0), ivec2(1, 1));
const ivec2 SAMPLES = ivec2(1, 2);
${SH_PCG}
${SH_TAPS}
void none() {
  gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
  v_shift = vec2(0.0);
  v_box = vec4(0.0);
  v_glow = vec2(0.0);
}
void main() {
  int id = gl_VertexID / 6;
  ivec2 c = ivec2(id % u_grid.x, id / u_grid.x);
  uint cell = pcg((uint(c.x) * 0x9E3779B9u) ^ pcg(uint(c.y) ^ u_seed));
  if (unit(cell) >= u_fill) {
    none();
    return;
  }
  uint pace = pcg(cell);
  int steps = int(floor(u_time * u_flick * (0.6 + 0.8 * unit(pace)) + unit(pcg(pace))));
  vec2 glow = vec2(0.0);
  if (u_tapCount > 0) {
    steps += int(floor(6.0 * tapsAt(u_cellCss.xy + vec2(c) * u_cellCss.zw, glow).w + unit(pcg(pace ^ 0x33u))));
    glow *= 0.65 + 0.35 * unit(pcg(pace ^ 0x51u));
  }
  if (glow.x < 0.04 && glow.y < 0.015) {
    ivec2 first = c * SAMPLES, last = u_grid * SAMPLES - 1;
    float most = 0.0;
    for (int y = -1; y <= SAMPLES.y; y++) {
      for (int x = -1; x <= SAMPLES.x; x++) {
        most = max(most, texelFetch(u_wind, clamp(first + ivec2(x, y), ivec2(0), last), 0).r);
      }
    }
    if (most == 0.0) {
      none();
      return;
    }
  }
  int g = int(texelFetch(u_sequence, ivec2((int(cell >> 8u) + steps) % u_count, 0), 0).r * 255.0 + 0.5);
  uvec4 box = texelFetch(u_boxes, ivec2(g, 0), 0);
  ivec2 origin = c * u_cell;
  ivec2 px = origin + ivec2(box.xy) + CORNER[gl_VertexID - id * 6] * ivec2(box.zw);
  ivec2 home = ivec2(g & 15, g >> 4) * u_cell;
  v_shift = vec2(home - origin);
  v_box = vec4(home, home + u_cell - 1);
  v_glow = glow;
  vec2 n = vec2(px) / vec2(u_buffer) * 2.0 - 1.0;
  gl_Position = vec4(n.x, -n.y, 0.0, 1.0);
}
`;

    const GLYPH_FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_shift;
in vec4 v_box;
in vec2 v_glow;
uniform highp sampler2D u_atlas;
uniform highp sampler2D u_wind;
uniform vec3 u_color, u_glowColor;
uniform ivec2 u_buffer;
uniform float u_friction, u_glowAmount, u_inkAlpha;
out vec4 o;
const float REST = ${N(CONFIG.strength.rest)};
const float HEAD = ${N(CONFIG.glow.headroom)};
ivec4 box;
float inkAt(ivec2 at) { return texelFetch(u_atlas, clamp(at, box.xy, box.zw), 0).r; }
void main() {
  box = ivec4(floor(v_box + 0.5));
  ivec2 px = ivec2(int(gl_FragCoord.x), u_buffer.y - 1 - int(gl_FragCoord.y));
  ivec2 at = px + ivec2(floor(v_shift + 0.5));
  float ink = inkAt(at);
  if (ink <= 0.0) { o = vec4(0.0); return; }
  vec4 wind = texture(u_wind, (vec2(px) + 0.5) / vec2(u_buffer));
  vec2 blows = wind.gb * 2.0 - 1.0;
  vec2 rise = vec2(inkAt(at + ivec2(1, 0)) - inkAt(at - ivec2(1, 0)), inkAt(at + ivec2(0, 1)) - inkAt(at - ivec2(0, 1)));
  float steep = length(rise);
  float facing = steep > 0.02 ? max(0.0, dot(rise / steep, blows)) : 0.35;
  float caught = mix(1.0, 0.45 + 1.1 * facing, u_friction);
  float light = min(1.0, wind.r * caught) + REST * wind.a;
  float tint = smoothstep(0.04, 0.3, u_glowAmount * v_glow.x);
  float bright = min(1.0, light) * mix(u_inkAlpha, HEAD, tint);
  float left = u_glowAmount * 0.3 * v_glow.y * wind.a;
  float a = ink * min(1.0, (bright + left) / HEAD);
  o = vec4((mix(u_color, u_glowColor, tint) * bright + u_glowColor * left) / (bright + left + 0.0001) * a, a);
}
`;

    // ------------------------------------------------------------- WebGL layer

    function compile(gl, type, source) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        if (window.console) window.console.error('[code-ripple] shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function program(gl, vertexSource, fragmentSource) {
      const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
      const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!vs || !fs) return null;
      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        if (window.console) window.console.error('[code-ripple] link: ' + gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    }

    function texture(gl, unit, smooth) {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const filter = smooth ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }

    function uploadTexture(gl, unit, format, width, height, data) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const types = format === 'r8' ? [gl.R8, gl.RED] : format === 'rgba8' ? [gl.RGBA8, gl.RGBA] : [gl.RGBA8UI, gl.RGBA_INTEGER];
      gl.texImage2D(gl.TEXTURE_2D, 0, types[0], width, height, 0, types[1], gl.UNSIGNED_BYTE, data);
    }

    function gridFor(deviceWidth, deviceHeight, dpr) {
      const cellWidth = Math.max(5, Math.round(CONFIG.grid.cellCss * dpr));
      const cellHeight = cellWidth * 2;
      let columns = Math.ceil(deviceWidth / cellWidth);
      let rows = Math.ceil(deviceHeight / cellHeight);
      if (columns < CONFIG.grid.minCols || rows < CONFIG.grid.minRows) return null;
      const weight = (columns * cellWidth * rows * cellHeight) / CONFIG.grid.maxDevicePixels;
      if (weight > 1) {
        columns = Math.floor(columns / Math.sqrt(weight));
        rows = Math.floor(rows / Math.sqrt(weight));
      }
      return {
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        columns: columns,
        rows: rows,
        left: Math.round((deviceWidth - columns * cellWidth) / 2),
        top: Math.round((deviceHeight - rows * cellHeight) / 2),
        scale: dpr,
      };
    }

    function createLayer(host, family, params) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText =
        'position:absolute;left:0;top:0;display:block;pointer-events:none;opacity:0;transition:opacity 500ms ease-out;';
      host.appendChild(canvas);

      let gl = null;
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
        });
      } catch (error) {
        gl = null;
      }
      if (!gl) {
        canvas.remove();
        return null;
      }

      const windProgram = program(gl, WIND_VERT, WIND_FRAG);
      const glyphProgram = program(gl, GLYPH_VERT, GLYPH_FRAG);
      if (!windProgram || !glyphProgram) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
        return null;
      }

      const UNITS = { wind: 0, atlas: 1, boxes: 2, sequence: 3 };
      const windTex = texture(gl, UNITS.wind, true);
      const atlasTex = texture(gl, UNITS.atlas, false);
      const boxesTex = texture(gl, UNITS.boxes, false);
      const sequenceTex = texture(gl, UNITS.sequence, false);
      const framebuffer = gl.createFramebuffer();

      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const loc = function (p, name) {
        return gl.getUniformLocation(p, name);
      };

      gl.useProgram(windProgram);
      gl.uniform1ui(loc(windProgram, 'u_seed'), params.seed);
      gl.uniform1f(loc(windProgram, 'u_tail'), CONFIG.wind.tail);
      gl.uniform1f(loc(windProgram, 'u_sweep'), CONFIG.wind.sweep);
      gl.uniform1f(loc(windProgram, 'u_morph'), CONFIG.wind.morph);
      gl.uniform4f(loc(windProgram, 'u_wind'), params.heading, params.speed, params.gustLength, params.gustWidth);
      gl.uniform4f(loc(windProgram, 'u_gust'), params.bend, params.bendScale, CONFIG.wind.lull, CONFIG.wind.streak);
      gl.uniform4f(loc(windProgram, 'u_shape'), CONFIG.wind.detail, CONFIG.wind.edge, CONFIG.wind.curl, CONFIG.wind.wisp);

      gl.useProgram(glyphProgram);
      gl.uniform1i(loc(glyphProgram, 'u_wind'), UNITS.wind);
      gl.uniform1i(loc(glyphProgram, 'u_atlas'), UNITS.atlas);
      gl.uniform1i(loc(glyphProgram, 'u_boxes'), UNITS.boxes);
      gl.uniform1i(loc(glyphProgram, 'u_sequence'), UNITS.sequence);
      gl.uniform1ui(loc(glyphProgram, 'u_seed'), params.seed);
      gl.uniform1f(loc(glyphProgram, 'u_fill'), CONFIG.surface.fill);
      gl.uniform1f(loc(glyphProgram, 'u_flick'), CONFIG.wind.flick);
      gl.uniform1f(loc(glyphProgram, 'u_friction'), CONFIG.wind.friction);
      gl.uniform1f(loc(glyphProgram, 'u_glowAmount'), CONFIG.glow.amount);

      const touchLocations = function (p) {
        return {
          now: loc(p, 'u_now'),
          tapCount: loc(p, 'u_tapCount'),
          wakeCount: loc(p, 'u_wakeCount'),
          taps: loc(p, 'u_taps'),
          tapRadii: loc(p, 'u_tapRadii'),
          wakes: loc(p, 'u_wakes'),
          ways: loc(p, 'u_ways'),
        };
      };
      const touchUniforms = { wind: touchLocations(windProgram), glyphs: touchLocations(glyphProgram) };

      const setTouch = function (locations, touch) {
        gl.uniform1i(locations.tapCount, touch ? touch.tapCount : 0);
        gl.uniform1i(locations.wakeCount, touch ? touch.wakeCount : 0);
        if (!touch) return;
        gl.uniform1f(locations.now, touch.now);
        if (touch.tapCount > 0) {
          gl.uniform4fv(locations.taps, touch.taps);
          if (locations.tapRadii) gl.uniform1fv(locations.tapRadii, touch.tapRadii);
        }
        if (touch.wakeCount > 0) {
          gl.uniform4fv(locations.wakes, touch.wakes);
          gl.uniform4fv(locations.ways, touch.ways);
        }
      };

      const U = {
        cellCss: loc(glyphProgram, 'u_cellCss'),
        windTime: loc(windProgram, 'u_time'),
        reveal: loc(windProgram, 'u_reveal'),
        sampleCss: loc(windProgram, 'u_sampleCss'),
        originCss: loc(windProgram, 'u_originCss'),
        paneCss: loc(windProgram, 'u_paneCss'),
        canvasCss: loc(windProgram, 'u_canvasCss'),
        glyphTime: loc(glyphProgram, 'u_time'),
        count: loc(glyphProgram, 'u_count'),
        grid: loc(glyphProgram, 'u_grid'),
        cell: loc(glyphProgram, 'u_cell'),
        buffer: loc(glyphProgram, 'u_buffer'),
        color: loc(glyphProgram, 'u_color'),
        glowColor: loc(glyphProgram, 'u_glowColor'),
        inkAlpha: loc(glyphProgram, 'u_inkAlpha'),
      };

      let columns = 0;
      let rows = 0;
      let cells = 0;
      let atlasCellWidth = 0;

      function rebuildAtlas(cellWidth, cellHeight) {
        const font = measureFont(document, family, cellWidth, window.devicePixelRatio || 1);
        const atlas = buildAtlas(document, font, cellWidth, cellHeight);
        if (!atlas) return false;
        const metrics = measureGlyphs(atlas.coverage, cellWidth, cellHeight);
        const sequence = buildSequence(params.key, atlas.missing);
        uploadTexture(gl, UNITS.atlas, 'r8', atlas.width, atlas.height, atlas.coverage);
        uploadTexture(gl, UNITS.boxes, 'rgba8ui', GLYPHS.length, 1, metrics.boxes);
        uploadTexture(gl, UNITS.sequence, 'r8', sequence.length, 1, sequence);
        gl.useProgram(glyphProgram);
        gl.uniform1i(U.count, sequence.length);
        atlasCellWidth = cellWidth;
        return true;
      }

      function resize(grid, cssWidth, cssHeight) {
        if (grid.cellWidth !== atlasCellWidth) {
          if (!rebuildAtlas(grid.cellWidth, grid.cellHeight)) return false;
        }
        const width = grid.columns * grid.cellWidth;
        const height = grid.rows * grid.cellHeight;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const toCss = function (value) {
          return value / grid.scale;
        };
        canvas.style.left = toCss(grid.left) + 'px';
        canvas.style.top = toCss(grid.top) + 'px';
        canvas.style.width = toCss(width) + 'px';
        canvas.style.height = toCss(height) + 'px';

        if (grid.columns !== columns || grid.rows !== rows) {
          columns = grid.columns;
          rows = grid.rows;
          cells = columns * rows;
          uploadTexture(gl, UNITS.wind, 'rgba8', columns, rows * 2, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, windTex, 0);
        }

        gl.useProgram(windProgram);
        gl.uniform2f(U.sampleCss, toCss(grid.cellWidth), toCss(grid.cellHeight) / 2);
        gl.uniform2f(U.originCss, toCss(grid.left), toCss(grid.top));
        gl.uniform2f(U.paneCss, cssWidth, cssHeight);
        gl.uniform2f(U.canvasCss, toCss(width), toCss(height));

        gl.useProgram(glyphProgram);
        gl.uniform2i(U.grid, columns, rows);
        gl.uniform4f(
          U.cellCss,
          toCss(grid.left + grid.cellWidth / 2),
          toCss(grid.top + grid.cellHeight / 2),
          toCss(grid.cellWidth),
          toCss(grid.cellHeight),
        );
        gl.uniform2i(U.cell, grid.cellWidth, grid.cellHeight);
        gl.uniform2i(U.buffer, width, height);
        return true;
      }

      function setInk(rgb, alpha) {
        gl.useProgram(glyphProgram);
        gl.uniform3f(U.color, rgb[0], rgb[1], rgb[2]);
        gl.uniform1f(U.inkAlpha, alpha);
      }

      function setGlow(rgb) {
        gl.useProgram(glyphProgram);
        gl.uniform3f(U.glowColor, rgb[0], rgb[1], rgb[2]);
      }

      function draw(state) {
        if (!cells) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, columns, rows * 2);
        gl.useProgram(windProgram);
        gl.uniform1f(U.windTime, state.time);
        gl.uniform1f(U.reveal, state.reveal);
        setTouch(touchUniforms.wind, state.touch);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(glyphProgram);
        gl.uniform1f(U.glyphTime, state.time);
        setTouch(touchUniforms.glyphs, state.touch);
        gl.drawArrays(gl.TRIANGLES, 0, 6 * cells);
      }

      return {
        canvas: canvas,
        resize: resize,
        setInk: setInk,
        setGlow: setGlow,
        draw: draw,
        destroy: function () {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          canvas.remove();
        },
      };
    }

    // ------------------------------------------------------------------ touch

    const TAP_LIFE = 3.6;
    const WAKE_LIFE = 2.4;
    const MOVE_GAP = 0.25;
    const MIN_AGE = 0.035;
    const MIN_TRAVEL = 18;
    const SPEED_SMOOTH = 0.08;
    const FORCE_FALLOFF = 90;
    const WARM_UP = 0.05;
    const WARM_DECAY = 0.65;
    const WAKE_RADIUS = 50;
    const WAKE_GROWTH = 40;
    const MIN_WAKE = 0.002;
    const HEART_EVERY = 3;

    function createTouch() {
      let taps = [];
      let wakes = [];
      let last = null;
      let previous = null;
      let speed = 0;
      let tapCount = 0;
      const state = {
        now: 0,
        tapCount: 0,
        taps: new Float32Array(24),
        tapRadii: new Float32Array(6),
        wakeCount: 0,
        wakes: new Float32Array(192),
        ways: new Float32Array(192),
      };
      return {
        move: function (x, y, now) {
          if (!last || !previous || now - last.at > MOVE_GAP) {
            last = { x: x, y: y, at: now };
            previous = last;
            speed = 0;
            return false;
          }
          const dt = Math.max(now - last.at, 1 / 240);
          const distance = Math.hypot(x - last.x, y - last.y);
          speed += (distance / dt - speed) * Math.min(1, dt / SPEED_SMOOTH);
          last = { x: x, y: y, at: now };
          const travel = Math.hypot(x - previous.x, y - previous.y);
          if (travel < MIN_TRAVEL || now - previous.at < MIN_AGE) return false;
          const { slowPxS, fastPxS, stir } = CONFIG.touch;
          const t = (speed - slowPxS) / (fastPxS - slowPxS);
          const clamped = Math.min(1, Math.max(0, t));
          const force = stir * clamped * clamped * (3 - 2 * clamped);
          const from = previous;
          previous = last;
          if (force < 0.04) return false;
          wakes = wakes.slice(-47).concat([
            {
              x: (x + from.x) / 2,
              y: (y + from.y) / 2,
              at: now,
              force: (force * travel) / (travel + FORCE_FALLOFF),
              wayX: (x - from.x) / 2,
              wayY: (y - from.y) / 2,
            },
          ]);
          return true;
        },
        tap: function (x, y, now, radius, force, pinnedRight) {
          tapCount += 1;
          const defaultForce = tapCount % HEART_EVERY === 0 ? -1.15 * CONFIG.touch.ripple : CONFIG.touch.ripple;
          const f = force !== undefined ? force : defaultForce;
          const r = radius !== undefined ? radius : 620.0;
          taps = taps.slice(-5).concat([{
            x: x,
            y: y,
            at: now,
            force: f,
            radius: r,
            pinnedRight: Boolean(pinnedRight),
            wayX: 0,
            wayY: 0,
          }]);
        },
        leave: function () {
          last = null;
        },
        busy: function (now) {
          return taps.some((t) => now - t.at < TAP_LIFE) || wakes.some((w) => now - w.at < WAKE_LIFE);
        },
        rippling: function (now) {
          return taps.some((t) => now - t.at < TAP_LIFE);
        },
        frame: function (now, hostWidth) {
          taps = taps.filter((t) => now - t.at < TAP_LIFE);
          wakes = wakes.filter((w) => now - w.at < WAKE_LIFE);
          state.now = now;
          state.tapCount = taps.length;
          taps.forEach(function (tap, i) {
            let tapX = tap.x;
            if (tap.pinnedRight && typeof hostWidth === 'number' && hostWidth > 0) {
              tapX = hostWidth;
            }
            state.taps.set([tapX, tap.y, tap.at, tap.force], i * 4);
            state.tapRadii[i] = tap.radius || 620.0;
          });
          const rest = 48 - wakes.length;
          let count = 0;
          wakes.forEach(function (wake, index) {
            const age = Math.max(0, now - wake.at);
            const force = wake.force * Math.min(1, (index + 1 + rest) / 8) * (1 - Math.exp(-age / WARM_UP)) * Math.exp(-age / WARM_DECAY);
            if (force < MIN_WAKE) return;
            const radius = WAKE_RADIUS + WAKE_GROWTH * age;
            const length = Math.hypot(wake.wayX, wake.wayY);
            state.wakes.set([wake.x, wake.y, force, 1 / (radius * radius)], count * 4);
            state.ways.set([wake.wayX / (length || 1), wake.wayY / (length || 1), length, 0], count * 4);
            count += 1;
          });
          state.wakeCount = count;
          return state;
        },
      };
    }

    // ----------------------------------------------------------------- helpers

    function srgbLuminance(rgb) {
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function cssColor(value, fallback) {
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return fallback;
      probe.fillStyle = '#123456';
      probe.fillStyle = value;
      return probe.fillStyle === '#123456' ? fallback : probe.fillStyle;
    }

    function colorParts(value) {
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return { rgb: [0.5, 0.5, 0.5], alpha: 1 };
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const data = probe.getImageData(0, 0, 1, 1).data;
      return { rgb: [data[0] / 255, data[1] / 255, data[2] / 255], alpha: data[3] / 255 };
    }

    function readThemeInk() {
      const root = getComputedStyle(document.documentElement);
      const raw = root.getPropertyValue('--dsw-alias-label-primary').trim() || getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary').trim();
      return cssColor(raw, '#e7ecf6');
    }

    function readScheme() {
      const root = getComputedStyle(document.documentElement);
      const bg = cssColor(root.getPropertyValue('--dsw-alias-bg-base').trim(), '');
      const probe = document.createElement('canvas').getContext('2d');
      let dark = true;
      if (probe && bg) {
        probe.fillStyle = bg;
        probe.fillRect(0, 0, 1, 1);
        const data = probe.getImageData(0, 0, 1, 1).data;
        dark = srgbLuminance([data[0] / 255, data[1] / 255, data[2] / 255]) < 0.5;
      }
      return dark ? 'dark' : 'light';
    }

    function smoothstep(t) {
      const x = Math.min(1, Math.max(0, t));
      return x * x * (3 - 2 * x);
    }

    // --------------------------------------------------------------- component

    function CodeRippleBackground() {
      const hostRef = React.useRef(null);

      React.useEffect(() => {
        const anchor = hostRef.current;
        const overlay = anchor && anchor.closest('[data-shell-overlay]');
        const appFrame = overlay && overlay.parentElement;
        if (!appFrame) return undefined;

        function findCenterCol() {
          return (
            appFrame.querySelector('[class*="centerCol"]') ||
            appFrame.querySelector(':scope > div:has(> [data-slot="main"])') ||
            appFrame.querySelector('[data-slot="main"]')?.parentElement
          );
        }

        let centerCol = findCenterCol();
        // Strictly conversation-panel only: no conversation column means no
        // background at all, instead of falling back to the whole app frame.
        if (!centerCol) {
          if (window.console) {
            window.console.warn('[code-ripple] conversation panel not found; background stays off');
          }
          return undefined;
        }

        // Own a background node inside the main interface (center column)
        // covering the entire conversation panel without masking top bar or bottom bar.
        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.dataset.codeRippleBackground = '';
        host.style.cssText =
          'position:absolute;left:0;right:0;top:0;bottom:0;width:100%;height:100%;z-index:0;overflow:hidden;pointer-events:none;user-select:none;' +
          'font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;';

        centerCol.prepend(host);
        if (centerCol) {
          centerCol.setAttribute('data-code-ripple-center', '');
        }

        const seed = (window.crypto && window.crypto.getRandomValues
          ? window.crypto.getRandomValues(new Uint32Array(1))[0]
          : Math.floor(Math.random() * 4294967296)) >>> 0;
        const look = pickLook(seed, readRecentLooks());
        const params = windParams(seed, look);
        const style = getComputedStyle(host);
        const family =
          style.fontFamily ||
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

        const layer = createLayer(host, family, params);
        if (!layer) {
          host.remove();
          if (window.console) window.console.warn('[code-ripple] WebGL2 layer unavailable');
          return undefined;
        }

        /*
         * Readability veil: a theme-tinted scrim between the glyph field and the
         * conversation content. It tones the moving characters down where the
         * user reads, so paragraphs and code stay legible while the texture is
         * still visible in the gaps.
         */
        const veil = document.createElement('div');
        veil.setAttribute('aria-hidden', 'true');
        veil.dataset.codeRippleVeil = '';
        host.appendChild(veil);
        function veilFor(current) {
          return current === 'dark'
            ? 'linear-gradient(180deg, rgba(13,13,16,0.30) 0%, rgba(13,13,16,0.46) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.58) 100%)';
        }

        // Style the conversation panel containers so the animation covers the
        // entire conversation panel (top to bottom) without masking top/bottom bars,
        // while keeping the sidebar completely untouched.
        const previousFrame = appFrame.getAttribute('data-code-ripple-frame');
        appFrame.setAttribute('data-code-ripple-frame', '');
        const backgroundStyle = document.createElement('style');
        backgroundStyle.textContent =
          '[data-code-ripple-center]{' +
          'position:relative!important;' +
          'overflow:hidden!important;' +
          '}' +
          '[data-code-ripple-veil]{' +
          'position:absolute!important;' +
          'inset:0!important;' +
          'pointer-events:none!important;' +
          'z-index:1!important;' +
          '}' +
          '[data-code-ripple-background]{' +
          'position:absolute!important;' +
          'inset:0!important;' +
          'width:100%!important;' +
          'height:100%!important;' +
          'z-index:0!important;' +
          'pointer-events:none!important;' +
          'user-select:none!important;' +
          'overflow:hidden!important;' +
          '}' +
          '[data-code-ripple-center] [data-slot="main"],' +
          '[data-code-ripple-center] [data-slot="main.conversation"],' +
          '[data-code-ripple-center] [data-slot="main"]>div,' +
          '[data-code-ripple-center] [data-phase],' +
          '[data-code-ripple-center] [class*="_root"][data-phase],' +
          '[data-code-ripple-center] [data-conversation-scroll],' +
          '[data-code-ripple-center] [data-slot="conversation.session"],' +
          '[data-code-ripple-center] [data-slot="conversation.content"],' +
          '[data-code-ripple-center] [class*="composerSeat"],' +
          '[data-code-ripple-center] [data-composer-seat],' +
          '[data-code-ripple-center] [data-conversation-region="composer"],' +
          '[data-code-ripple-center] [class*="composerStack"],' +
          '[data-code-ripple-center] [data-slot*="composer"],' +
          '[data-code-ripple-center] [class*="dock"],' +
          '[data-code-ripple-center] [class*="Dock"],' +
          '[data-code-ripple-center] [class*="TurnUsage"],' +
          '[data-code-ripple-center] [class*="scrollBody"],' +
          '[data-code-ripple-center] [class*="viewArea"],' +
          '[data-code-ripple-center] header,' +
          '[data-code-ripple-center] [class*="_header"],' +
          '[data-code-ripple-center] [class*="header"],' +
          '[data-code-ripple-center] footer,' +
          '[data-code-ripple-center] [class*="footer"],' +
          '[data-code-ripple-center] [class*="statusBar"],' +
          '[data-code-ripple-center] [class*="status-bar"],' +
          '[data-code-ripple-center] [class*="bottomRow"]{' +
          'position:relative!important;' +
          'background-color:transparent!important;' +
          'background-image:none!important;' +
          'background:transparent!important;' +
          '}';
        document.head.appendChild(backgroundStyle);
        rememberLook(params.key);
        host.dataset.landingTexture = 'canvas';
        layer.canvas.dataset.look = params.key + '/' + params.seed.toString(16);
        layer.canvas.dataset.version = '2.1.0';

        const touch = createTouch();
        let scheme = readScheme();
        let ink = colorParts(readThemeInk());
        layer.setInk(ink.rgb, ink.alpha);
        layer.setGlow(CONFIG.glow.color[scheme]);
        veil.style.background = veilFor(scheme);
        let strength = Math.min(
          1,
          Math.max(0.65, Math.min(CONFIG.strength.base[scheme] * CONFIG.strength.scale, CONFIG.strength.cap[scheme]) *
            CONFIG.glow.headroom),
        );

        let themeTimer = 0;
        function applyTheme() {
          const nextScheme = readScheme();
          const nextInk = colorParts(readThemeInk());
          if (nextScheme === scheme && nextInk.rgb.every((v, i) => Math.abs(v - ink.rgb[i]) < 0.004)) return;
          scheme = nextScheme;
          ink = nextInk;
          layer.setInk(ink.rgb, ink.alpha);
          layer.setGlow(CONFIG.glow.color[scheme]);
          strength = Math.min(
            1,
            Math.max(0.65, Math.min(CONFIG.strength.base[scheme] * CONFIG.strength.scale, CONFIG.strength.cap[scheme]) *
              CONFIG.glow.headroom),
          );
          veil.style.background = veilFor(scheme);
          layer.canvas.style.opacity = String(strength);
        }
        const themeObserver = new MutationObserver(function () {
          if (themeTimer) clearTimeout(themeTimer);
          themeTimer = setTimeout(function () {
            themeTimer = 0;
            applyTheme();
          }, 140);
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'class', 'style'],
        });
        if (document.body) {
          themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-theme', 'class', 'style'],
          });
        }

        let before = performance.now();
        let clock = 0;
        let start = 0;
        let reveal = 0;
        let raf = 0;
        let timer = 0;
        let running = true;
        let stale = 0;
        let resizeTimer = 0;
        let grid = null;

        function measure() {
          host.style.top = '0px';
          host.style.height = '100%';

          const dpr = window.devicePixelRatio || 1;
          const width = Math.max(1, Math.floor(host.clientWidth));
          const height = Math.max(1, Math.floor(host.clientHeight));
          const next = gridFor(
            Math.max(1, Math.round(width * dpr)),
            Math.max(1, Math.round(height * dpr)),
            dpr,
          );
          if (!next) {
            layer.canvas.style.visibility = 'hidden';
            grid = null;
            return;
          }
          const ok = layer.resize(next, width, height);
          layer.canvas.style.visibility = ok ? '' : 'hidden';
          grid = ok ? next : null;
        }

        function schedule() {
          if (timer) clearTimeout(timer);
          timer = 0;
          if (!running || document.hidden) return;
          const busy = touch.busy(clock);
          timer = setTimeout(function () {
            timer = 0;
            raf = requestAnimationFrame(frame);
          }, busy ? CONFIG.power.rippleFrameMs : CONFIG.power.frameMs);
        }

        function frame(now) {
          raf = 0;
          const dt = Math.min(Math.max(now - before, 0), 250);
          before = now;
          clock += dt / 1000;
          if (!start) start = clock;
          reveal = smoothstep((clock - start) / CONFIG.wind.revealS);
          layer.canvas.style.opacity = String(strength);
          layer.draw({ time: clock * CONFIG.wind.energy, reveal: reveal, touch: touch.frame(clock, host.clientWidth) });
          schedule();
        }

        function isOverInteractive(event) {
          const target = event.target;
          if (target && target.closest && target.closest('button, a, input, textarea, [role="button"]')) {
            return true;
          }
          return false;
        }

        function onPointerMove(event) {
          if (event.pointerType !== 'mouse') return;
          if (isOverInteractive(event)) {
            touch.leave();
            return;
          }
          const rect = layer.canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            touch.leave();
            return;
          }
          if (touch.move(x, y, clock)) schedule();
        }

        function onPointerDown(event) {
          if (event.button !== 0) return;
          if (isOverInteractive(event)) {
            return;
          }
          const rect = layer.canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            return;
          }
          touch.tap(x, y, clock);
          schedule();
        }

        function onPointerLeave() {
          touch.leave();
        }

        function onResize(immediate) {
          if (resizeTimer) clearTimeout(resizeTimer);
          if (immediate || !grid) {
            resizeTimer = 0;
            measure();
            return;
          }
          resizeTimer = setTimeout(function () {
            resizeTimer = 0;
            measure();
          }, CONFIG.power.resizeSettleMs);
        }

        function onVisibility() {
          if (document.hidden) {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            if (timer) clearTimeout(timer);
            timer = 0;
            return;
          }
          before = performance.now();
          schedule();
        }

        // --- Sidebar expansion ripple detection ---
        let prevLeftCollapsed = appFrame.hasAttribute('data-sidebar-collapsed');
        let prevRightCollapsed = appFrame.hasAttribute('data-rightbar-collapsed');
        let prevSidebarWidth = 0;
        let prevRightbarWidth = 0;
        let isReadyForSidebarRipples = false;
        let lastLeftExpandTime = 0;
        let lastRightExpandTime = 0;

        function getLeftSidebarWidth() {
          const sidebarEl = appFrame.querySelector('[class*="sidebarCol"], [data-slot="sidebar"]');
          return sidebarEl ? Math.round(sidebarEl.getBoundingClientRect().width) : 0;
        }

        function getRightSidebarWidth() {
          const rightbarEl = appFrame.querySelector('[data-rightbar-col], [class*="rightbarCol"]');
          return rightbarEl ? Math.round(rightbarEl.getBoundingClientRect().width) : 0;
        }

        function triggerLeftSidebarRipple(customWidth) {
          const now = performance.now();
          if (now - lastLeftExpandTime < 700) return;
          lastLeftExpandTime = now;

          const rect = layer.canvas.getBoundingClientRect();
          const radius = customWidth && customWidth > 50 ? customWidth : 280;
          const x = 0;
          const y = Math.round(rect.height / 2);
          touch.tap(x, y, clock, radius, CONFIG.touch.ripple * 1.5, false);
          schedule();
        }

        function triggerRightSidebarRipple(customWidth) {
          const now = performance.now();
          if (now - lastRightExpandTime < 700) return;
          lastRightExpandTime = now;

          const rect = layer.canvas.getBoundingClientRect();
          const radius = customWidth && customWidth > 50 ? customWidth : 400;
          const x = Math.round(rect.width);
          const y = Math.round(rect.height / 2);
          touch.tap(x, y, clock, radius, CONFIG.touch.ripple * 1.5, true);
          schedule();
        }

        function checkSidebarExpansion() {
          if (!isReadyForSidebarRipples) return;
          const isLeftCollapsed = appFrame.hasAttribute('data-sidebar-collapsed');
          const isRightCollapsed = appFrame.hasAttribute('data-rightbar-collapsed');

          const curSidebarWidth = getLeftSidebarWidth();
          const curRightbarWidth = getRightSidebarWidth();

          // Left sidebar expanded:
          // Transited from collapsed to expanded, or width expanded from near 0 to normal width
          if ((prevLeftCollapsed && !isLeftCollapsed) || (prevSidebarWidth <= 20 && curSidebarWidth > 50)) {
            triggerLeftSidebarRipple(curSidebarWidth > 50 ? curSidebarWidth : 280);
          }

          // Right sidebar expanded:
          // Transited from collapsed to expanded, or width expanded from near 0 to normal width
          if ((prevRightCollapsed && !isRightCollapsed) || (prevRightbarWidth <= 20 && curRightbarWidth > 50)) {
            triggerRightSidebarRipple(curRightbarWidth > 50 ? curRightbarWidth : 400);
          }

          prevLeftCollapsed = isLeftCollapsed;
          prevRightCollapsed = isRightCollapsed;
          prevSidebarWidth = curSidebarWidth;
          prevRightbarWidth = curRightbarWidth;
        }

        // Arm sidebar expansion ripples after initial layout settles
        setTimeout(function () {
          prevLeftCollapsed = appFrame.hasAttribute('data-sidebar-collapsed');
          prevRightCollapsed = appFrame.hasAttribute('data-rightbar-collapsed');
          prevSidebarWidth = getLeftSidebarWidth();
          prevRightbarWidth = getRightSidebarWidth();
          isReadyForSidebarRipples = true;
        }, 500);

        // Listen for dimension changes on centerCol & host (handles sidebar drag/toggle, window resize)
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () {
          onResize();
          checkSidebarExpansion();
        }) : null;
        if (resizeObserver) {
          if (centerCol) resizeObserver.observe(centerCol);
          resizeObserver.observe(host);
        }

        // Dedicated observer for appFrame attributes (data-sidebar-collapsed, data-rightbar-collapsed)
        const sidebarObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(function () {
          checkSidebarExpansion();
        }) : null;
        if (sidebarObserver) {
          sidebarObserver.observe(appFrame, {
            attributes: true,
            attributeFilter: ['data-sidebar-collapsed', 'data-rightbar-collapsed', 'style'],
          });
        }

        measure();

        // If centerCol wasn't immediately found, observe appFrame until it appears
        let frameObserver = null;
        if (!centerCol) {
          frameObserver = new MutationObserver(function () {
            const found = findCenterCol();
            if (found) {
              centerCol = found;
              centerCol.setAttribute('data-code-ripple-center', '');
              if (host.parentElement !== centerCol) {
                centerCol.prepend(host);
              }
              if (resizeObserver) resizeObserver.observe(centerCol);
              if (childObserver) {
                childObserver.observe(centerCol, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['data-phase', 'class'],
                });
              }
              measure();
              if (frameObserver) {
                frameObserver.disconnect();
                frameObserver = null;
              }
            }
          });
          frameObserver.observe(appFrame, { childList: true, subtree: true });
        }

        // Watch centerCol to ensure host remains prepended across React reconciliations
        // and react immediately when switching between hero and active conversation phases
        const childObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(function () {
          if (centerCol && host.parentElement !== centerCol) {
            centerCol.prepend(host);
          }
          measure();
        }) : null;
        if (childObserver && centerCol) {
          childObserver.observe(centerCol, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-phase', 'class'],
          });
        }

        window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
        window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
        window.addEventListener('pointerleave', onPointerLeave, { passive: true });
        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', onVisibility);
        schedule();

        return function () {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          if (timer) clearTimeout(timer);
          if (resizeTimer) clearTimeout(resizeTimer);
          if (themeTimer) clearTimeout(themeTimer);
          if (frameObserver) frameObserver.disconnect();
          if (childObserver) childObserver.disconnect();
          if (sidebarObserver) sidebarObserver.disconnect();
          if (resizeObserver) resizeObserver.disconnect();
          themeObserver.disconnect();
          window.removeEventListener('pointermove', onPointerMove, { capture: true });
          window.removeEventListener('pointerdown', onPointerDown, { capture: true });
          window.removeEventListener('pointerleave', onPointerLeave);
          window.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVisibility);
          delete host.dataset.landingTexture;
          layer.destroy();
          host.remove();
          backgroundStyle.remove();
          if (previousFrame === null) appFrame.removeAttribute('data-code-ripple-frame');
          else appFrame.setAttribute('data-code-ripple-frame', previousFrame);
          if (centerCol) {
            centerCol.removeAttribute('data-code-ripple-center');
          }
        };
      }, []);

      return h('span', {
        ref: hostRef,
        'aria-hidden': true,
        hidden: true,
      });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'code-ripple-background',
              order: 0,
            },
            CodeRippleBackground,
          ),
        );
      },
    };
  },
});
