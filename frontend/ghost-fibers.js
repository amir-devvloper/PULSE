/*
  GhostFibers — vanilla WebGL2 port (no React, no `ogl` dependency).
  Same shader as the original component; the mount/lifecycle logic is
  rewritten in plain JS so it drops straight into a static HTML page.
*/

const hexToRgb = hex => {
  const value = hex.trim().replace(/^#/, '');
  const normalized = value.length === 3 ? value.replace(/./g, c => c + c) : value;
  const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!match) return [1, 1, 1];
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
};

const VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uLayers;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uLayerSpeed;
uniform float uTwist;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uLineFrequency;
uniform float uLineSpacing;
uniform float uLineSharpness;
uniform float uGlowFalloff;
uniform float uGlowIntensity;
uniform float uBrightness;
uniform float uBlueBoost;
uniform float uVignette;
uniform float uGrain;
uniform float uRotationSpeed;
uniform float uLightMode;
uniform vec3 uLineColor;
uniform vec3 uGlowColor;

out vec4 fragColor;

#define MAX_LAYERS 10

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float grainHash(vec2 point) {
  point = floor(point);
  float hash = 52.9829189 * fract(dot(point, vec2(0.065, 0.005)));
  return fract(hash);
}

float layeredGrain(vec2 fragmentPixel) {
  vec2 point = mod(fragmentPixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
  vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
  float grain = 0.0;
  grain += 0.40 * grainHash(rotated);
  grain += 0.25 * grainHash(rotated * 2.0 + 17.0);
  grain += 0.20 * grainHash(rotated * 4.0 + 47.0);
  grain += 0.10 * grainHash(rotated * 8.0 + 113.0);
  grain += 0.05 * grainHash(rotated * 16.0 + 191.0);
  return grain;
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec3 backdrop = mix(vec3(0.070588, 0.058824, 0.090196), vec3(1.0), step(0.5, uLightMode));
  vec3 centerTone = max(uLineColor * 0.85567 - uGlowColor * 0.06186, vec3(0.0));
  vec3 cloudTone = uLineColor * 0.19588 + uGlowColor * 0.2268;
  vec2 p = uv;
  p /= max(uScale, 0.05);
  p = rotate2d(radians(uRotation) + time * uRotationSpeed) * p;
  vec3 color = vec3(0.0);
  float fiberField = 0.0;

  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;

    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));

    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;

    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
    color += uLineColor * lines / fi;

    float glow = exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi)));
    color += uGlowColor * glow * uGlowIntensity / (fi * 2.0);
  }

  float center = exp(-2.2 * dot(uv, uv));
  color += centerTone * center;

  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  color += cloudTone * cloud;

  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  color *= mix(1.0 - uVignette, 1.0, vignette);
  color = 1.0 - exp(-color * uBrightness);
  color.b *= uBlueBoost;

  vec3 outputColor;
  if (uLightMode > 0.5) {
    float edgeFade = mix(1.0 - uVignette, 1.0, vignette);
    float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
    float atmosphere = (center * 0.025 + cloud * 0.015) * edgeFade;
    vec3 fiberInk = mix(backdrop, uLineColor, 0.52);
    vec3 airColor = mix(backdrop, uGlowColor, 0.16);

    outputColor = mix(backdrop, airColor, atmosphere);
    outputColor = mix(outputColor, fiberInk, fibers * 0.3);
  } else {
    outputColor = backdrop + color;
  }

  float noise = (layeredGrain(gl_FragCoord.xy) - 0.5) * uGrain;
  outputColor = clamp(outputColor + noise, 0.0, 1.0);
  fragColor = vec4(outputColor, 1.0);
}
`;

const DEFAULTS = {
  lineColor: '#140E35',
  glowColor: '#3437A0',
  speed: 0.2,
  scale: 2,
  rotation: 0,
  rotationSpeed: 0.25,
  layers: 4,
  waveAmplitude: 0.015,
  waveFrequency: 3,
  waveSpeed: 0.15,
  layerSpeed: 0.08,
  twist: 0.1,
  twistFrequency: 5,
  twistSpeed: 1.2,
  lineFrequency: 5,
  lineSpacing: 2,
  lineSharpness: 16,
  glowFalloff: 10,
  glowIntensity: 1.6,
  brightness: 2,
  blueBoost: 1.25,
  vignette: 0.8,
  grain: 0.05,
  lightMode: false,
  dpr: 1,
  fps: 60,
  paused: false
};

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('GhostFibers shader compile error: ' + info);
  }
  return shader;
}

export function createGhostFibers(container, options = {}) {
  const settings = { ...DEFAULTS, ...options };

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) {
    container.removeChild(canvas);
    return { update() {}, destroy() {} };
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('GhostFibers program link error: ' + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // Full-screen triangle
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'position');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const uniformNames = [
    'uResolution', 'uTime', 'uSpeed', 'uScale', 'uRotation', 'uLayers',
    'uWaveAmplitude', 'uWaveFrequency', 'uWaveSpeed', 'uLayerSpeed',
    'uTwist', 'uTwistFrequency', 'uTwistSpeed', 'uLineFrequency',
    'uLineSpacing', 'uLineSharpness', 'uGlowFalloff', 'uGlowIntensity',
    'uBrightness', 'uBlueBoost', 'uVignette', 'uGrain', 'uRotationSpeed',
    'uLightMode', 'uLineColor', 'uGlowColor'
  ];
  const uniforms = {};
  uniformNames.forEach(name => { uniforms[name] = gl.getUniformLocation(program, name); });

  function applyUniforms(s) {
    gl.uniform1f(uniforms.uTime, elapsed);
    gl.uniform1f(uniforms.uSpeed, s.speed);
    gl.uniform1f(uniforms.uScale, s.scale);
    gl.uniform1f(uniforms.uRotation, s.rotation);
    gl.uniform1f(uniforms.uRotationSpeed, s.rotationSpeed);
    gl.uniform1f(uniforms.uLayers, Math.min(Math.max(Math.round(s.layers), 1), 10));
    gl.uniform1f(uniforms.uWaveAmplitude, s.waveAmplitude);
    gl.uniform1f(uniforms.uWaveFrequency, s.waveFrequency);
    gl.uniform1f(uniforms.uWaveSpeed, s.waveSpeed);
    gl.uniform1f(uniforms.uLayerSpeed, s.layerSpeed);
    gl.uniform1f(uniforms.uTwist, s.twist);
    gl.uniform1f(uniforms.uTwistFrequency, s.twistFrequency);
    gl.uniform1f(uniforms.uTwistSpeed, s.twistSpeed);
    gl.uniform1f(uniforms.uLineFrequency, s.lineFrequency);
    gl.uniform1f(uniforms.uLineSpacing, s.lineSpacing);
    gl.uniform1f(uniforms.uLineSharpness, s.lineSharpness);
    gl.uniform1f(uniforms.uGlowFalloff, s.glowFalloff);
    gl.uniform1f(uniforms.uGlowIntensity, s.glowIntensity);
    gl.uniform1f(uniforms.uBrightness, s.brightness);
    gl.uniform1f(uniforms.uBlueBoost, s.blueBoost);
    gl.uniform1f(uniforms.uVignette, s.vignette);
    gl.uniform1f(uniforms.uGrain, s.grain);
    gl.uniform1f(uniforms.uLightMode, s.lightMode ? 1 : 0);
    const line = hexToRgb(s.lineColor);
    const glow = hexToRgb(s.glowColor);
    gl.uniform3f(uniforms.uLineColor, line[0], line[1], line[2]);
    gl.uniform3f(uniforms.uGlowColor, glow[0], glow[1], glow[2]);
  }

  let current = settings;
  let elapsed = 0;
  let previousTime = performance.now();
  let lastRenderTime = 0;
  let frameRate = settings.fps;
  let frameId = 0;
  let isPaused = settings.paused;
  let isVisible = true;
  let isPageVisible = !document.hidden;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function render() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(uniforms.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    applyUniforms(current);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function canAnimate() {
    return isVisible && isPageVisible && !isPaused && !reducedMotion.matches;
  }

  function stop() {
    if (frameId !== 0) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function loop(now) {
    frameId = 0;
    if (!canAnimate()) return;
    const delta = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    elapsed += delta;
    if (now - lastRenderTime >= 1000 / frameRate - 0.5) {
      render();
      lastRenderTime = now;
    }
    frameId = requestAnimationFrame(loop);
  }

  function start() {
    if (!canAnimate() || frameId !== 0) return;
    previousTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }

  function setSize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(Math.max(current.dpr, 0.5), 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    render();
  }

  const resizeObserver = new ResizeObserver(setSize);
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (canAnimate()) start(); else stop();
    },
    { threshold: 0 }
  );
  intersectionObserver.observe(container);

  function handleVisibility() {
    isPageVisible = !document.hidden;
    if (canAnimate()) start(); else stop();
  }
  function handleReducedMotion() {
    if (canAnimate()) start();
    else { stop(); render(); }
  }
  document.addEventListener('visibilitychange', handleVisibility);
  reducedMotion.addEventListener('change', handleReducedMotion);

  setSize();
  start();

  return {
    update(next = {}) {
      current = { ...current, ...next };
      frameRate = Math.min(Math.max(current.fps, 1), 120);
      isPaused = current.paused;
      if (canAnimate()) start();
      else { stop(); render(); }
    },
    destroy() {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotion.removeEventListener('change', handleReducedMotion);
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
