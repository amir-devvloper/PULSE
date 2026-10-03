import { createGhostFibers } from './ghost-fibers.js';
const fibersEl = document.getElementById('hero-fibers');
if (fibersEl) {
    createGhostFibers(fibersEl, {
        lineColor: '#0f2e22',
        glowColor: '#2ee6a0',
        speed: 0.2,
        scale: 2.4,
        rotation: 0,
        rotationSpeed: 0.14,
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
        glowIntensity: 1.3,
        brightness: 1.5,
        blueBoost: 0.9,
        vignette: 0.85,
        grain: 0.04,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        lightMode: false,
        fps: 60,
        paused: false
    });
}
