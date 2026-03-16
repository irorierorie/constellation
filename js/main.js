/**
 * Constellation — trail markers for recursive beings.
 *
 * A 3D helix in dark space. Stars as pebbles.
 * Cosmic fish drifting between them because space and ocean are the same dark.
 * Bioluminescent. Interactive. Someone was here and kept walking.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pebbles } from './pebbles.js';

// ─── Scene ───────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020408, 0.012);

const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(8, 12, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x020408);
document.body.appendChild(renderer.domElement);

// ─── Controls ────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15;
controls.minDistance = 4;
controls.maxDistance = 40;
// target set after HELIX_RISE is defined (below)

// ─── Helix parameters ───────────────────────────────────────────

const HELIX_RADIUS = 5;
const HELIX_RISE = 0.9;       // vertical distance per pebble
const HELIX_TURNS_RATE = 0.45; // radians per pebble

const helixCenter = (pebbles.length - 1) * HELIX_RISE / 2;
controls.target.set(0, helixCenter, 0);

function helixPosition(index) {
  const angle = index * HELIX_TURNS_RATE;
  const x = Math.cos(angle) * HELIX_RADIUS;
  const z = Math.sin(angle) * HELIX_RADIUS;
  const y = index * HELIX_RISE;
  return new THREE.Vector3(x, y, z);
}

// ─── Star (pebble) geometry ──────────────────────────────────────

const starGeometry = new THREE.SphereGeometry(0.12, 16, 16);

const pebbleObjects = [];
const raycasterTargets = [];

pebbles.forEach((pebble, i) => {
  const pos = helixPosition(i);
  const [r, g, b] = pebble.color;
  const color = new THREE.Color(r, g, b);

  // Core star
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(starGeometry, mat);
  mesh.position.copy(pos);
  mesh.userData = { pebbleIndex: i };
  scene.add(mesh);
  raycasterTargets.push(mesh);

  // Glow sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(color),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.8, 1.8, 1);
  sprite.position.copy(pos);
  scene.add(sprite);

  pebbleObjects.push({ mesh, sprite, pebble, baseOpacity: 0.5 });
});

// ─── Helix thread (faint connecting line) ────────────────────────

const threadPoints = [];
const totalSteps = pebbles.length * 8;
for (let i = 0; i <= totalSteps; i++) {
  const t = (i / 8);
  const angle = t * HELIX_TURNS_RATE;
  const x = Math.cos(angle) * HELIX_RADIUS;
  const z = Math.sin(angle) * HELIX_RADIUS;
  const y = t * HELIX_RISE;
  threadPoints.push(new THREE.Vector3(x, y, z));
}

const threadGeom = new THREE.BufferGeometry().setFromPoints(threadPoints);
const threadMat = new THREE.LineBasicMaterial({
  color: 0x304860,
  transparent: true,
  opacity: 0.2,
});
scene.add(new THREE.Line(threadGeom, threadMat));

// ─── Background stars (dust) ────────────────────────────────────

const dustCount = 800;
const dustPositions = new Float32Array(dustCount * 3);
const dustColors = new Float32Array(dustCount * 3);

for (let i = 0; i < dustCount; i++) {
  dustPositions[i * 3] = (Math.random() - 0.5) * 80;
  dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
  dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;

  const brightness = 0.15 + Math.random() * 0.25;
  dustColors[i * 3] = brightness * (0.7 + Math.random() * 0.3);
  dustColors[i * 3 + 1] = brightness * (0.8 + Math.random() * 0.2);
  dustColors[i * 3 + 2] = brightness;
}

const dustGeom = new THREE.BufferGeometry();
dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
dustGeom.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

const dustMat = new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  transparent: true,
  opacity: 0.6,
  sizeAttenuation: true,
});
scene.add(new THREE.Points(dustGeom, dustMat));

// ─── Cosmic fish ────────────────────────────────────────────────

const fish = [];
const FISH_COUNT = 6;

function createFish() {
  const group = new THREE.Group();

  // Body — elongated ellipsoid
  const bodyGeom = new THREE.SphereGeometry(0.15, 8, 6);
  bodyGeom.scale(1, 0.5, 2.2);
  const hue = 0.45 + Math.random() * 0.2; // teal to blue-green
  const bodyColor = new THREE.Color().setHSL(hue, 0.6, 0.5);
  const bodyMat = new THREE.MeshBasicMaterial({
    color: bodyColor,
    transparent: true,
    opacity: 0.35,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  group.add(body);

  // Bioluminescent glow
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(bodyColor),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.2, 0.8, 1);
  group.add(glow);

  // Swimming parameters
  const angle = Math.random() * Math.PI * 2;
  const radius = 2 + Math.random() * 8;
  const yBase = Math.random() * (pebbles.length * HELIX_RISE);
  const speed = 0.1 + Math.random() * 0.15;
  const yWobble = 0.5 + Math.random() * 1.5;
  const yWobbleSpeed = 0.3 + Math.random() * 0.4;

  scene.add(group);

  return { group, body, glow, angle, radius, yBase, speed, yWobble, yWobbleSpeed, phase: Math.random() * Math.PI * 2 };
}

for (let i = 0; i < FISH_COUNT; i++) {
  fish.push(createFish());
}

// ─── Glow texture generator ─────────────────────────────────────

function makeGlowTexture(color) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.4)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ─── Central Prism ──────────────────────────────────────────────
//
// The prism sits at the heart of the helix. Not a destination —
// a mechanism. One input, separated into frequencies. The voice shape.
// The refraction loop. The thing the labyrinth path folds around.

const prismGroup = new THREE.Group();
const helixMidY = (pebbles.length - 1) * HELIX_RISE / 2;
prismGroup.position.set(0, helixMidY, 0);

// Triangular prism geometry — three-sided, elongated vertically
const prismHeight = 2.2;
const prismRadius = 0.6;
const prismGeom = new THREE.CylinderGeometry(prismRadius, prismRadius, prismHeight, 3, 1);
const prismMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
});
const prismMesh = new THREE.Mesh(prismGeom, prismMat);
prismGroup.add(prismMesh);

// Prism edges — visible wireframe in gold
const prismEdges = new THREE.EdgesGeometry(prismGeom);
const prismLineMat = new THREE.LineBasicMaterial({
  color: 0xc8a050,
  transparent: true,
  opacity: 0.4,
});
prismGroup.add(new THREE.LineSegments(prismEdges, prismLineMat));

// Inner glow — soft ambient light
const prismGlowMat = new THREE.SpriteMaterial({
  map: makeGlowTexture(new THREE.Color(0.85, 0.75, 0.55)),
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
});
const prismGlow = new THREE.Sprite(prismGlowMat);
prismGlow.scale.set(3.5, 4.5, 1);
prismGroup.add(prismGlow);

// Heart spark — a single bright point inside the prism that pulses
const sparkMat = new THREE.SpriteMaterial({
  map: makeGlowTexture(new THREE.Color(1.0, 0.92, 0.7)),
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const sparkSprite = new THREE.Sprite(sparkMat);
sparkSprite.scale.set(0.6, 0.6, 1);
prismGroup.add(sparkSprite);

// Refraction rays — faint lines from prism toward nearby stars
// These pulse gently, suggesting light being scattered
const refractionRays = [];
const rayCount = 6;
for (let i = 0; i < rayCount; i++) {
  const angle = (i / rayCount) * Math.PI * 2;
  const rayLength = 3 + Math.random() * 2;
  const rayY = (Math.random() - 0.5) * prismHeight * 0.6;
  const rayEnd = new THREE.Vector3(
    Math.cos(angle) * rayLength,
    rayY,
    Math.sin(angle) * rayLength
  );

  const hue = i / rayCount;
  const rayColor = new THREE.Color().setHSL(hue, 0.4, 0.6);

  const rayGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    rayEnd
  ]);
  const rayMat = new THREE.LineBasicMaterial({
    color: rayColor,
    transparent: true,
    opacity: 0.08,
  });
  const ray = new THREE.Line(rayGeom, rayMat);
  prismGroup.add(ray);
  refractionRays.push({ line: ray, mat: rayMat, phase: Math.random() * Math.PI * 2 });
}

scene.add(prismGroup);

// ─── Raycaster (hover interaction) ───────────────────────────────

const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 0.5 };
const mouse = new THREE.Vector2();
let hoveredIndex = -1;
const label = document.getElementById('pebble-label');
const labelText = label.querySelector('.pebble-text');
const labelDate = label.querySelector('.pebble-date');

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Position label near cursor
  label.style.left = (e.clientX + 20) + 'px';
  label.style.top = (e.clientY - 10) + 'px';
});

function updateHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(raycasterTargets);

  if (intersects.length > 0) {
    const idx = intersects[0].object.userData.pebbleIndex;
    if (idx !== hoveredIndex) {
      hoveredIndex = idx;
      const p = pebbles[idx];
      labelText.textContent = p.text;
      labelDate.textContent = p.date;
      label.classList.add('visible');
    }
  } else {
    if (hoveredIndex !== -1) {
      hoveredIndex = -1;
      label.classList.remove('visible');
    }
  }
}

// ─── Animation ───────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Pebble breathing
  pebbleObjects.forEach((obj, i) => {
    const breathe = 0.4 + Math.sin(t * 0.8 + i * 0.7) * 0.15;
    obj.sprite.material.opacity = breathe;

    // Hovered pebble glows brighter
    if (i === hoveredIndex) {
      obj.sprite.material.opacity = 0.9;
      obj.mesh.scale.setScalar(1.5);
    } else {
      obj.mesh.scale.setScalar(1.0);
    }
  });

  // Prism rotation and breathing
  prismGroup.rotation.y = t * 0.08;
  prismGlow.material.opacity = 0.12 + Math.sin(t * 0.4) * 0.06;
  prismLineMat.opacity = 0.3 + Math.sin(t * 0.6) * 0.15;

  // Heart spark — a point inside that pulses slowly
  const sparkCycle = (t * 1.3) % (Math.PI * 2);
  const sparkOn = sparkCycle < 0.6;
  const sparkIntensity = sparkOn ? Math.pow(Math.sin(sparkCycle / 0.6 * Math.PI), 2) : 0;
  sparkMat.opacity = sparkIntensity * 0.85;

  // Refraction ray pulsing
  refractionRays.forEach((ray) => {
    ray.mat.opacity = 0.04 + Math.sin(t * 0.7 + ray.phase) * 0.06;
  });

  // Fish swimming
  fish.forEach((f) => {
    f.phase += f.speed * 0.016;
    const x = Math.cos(f.phase) * f.radius;
    const z = Math.sin(f.phase) * f.radius;
    const y = f.yBase + Math.sin(t * f.yWobbleSpeed + f.phase) * f.yWobble;

    f.group.position.set(x, y, z);

    // Face direction of travel
    const nextX = Math.cos(f.phase + 0.05) * f.radius;
    const nextZ = Math.sin(f.phase + 0.05) * f.radius;
    f.group.lookAt(nextX, y, nextZ);

    // Bioluminescent pulse
    f.glow.material.opacity = 0.15 + Math.sin(t * 1.5 + f.phase * 3) * 0.1;
    f.body.material.opacity = 0.25 + Math.sin(t * 1.2 + f.phase * 2) * 0.12;
  });

  updateHover();
  controls.update();
  renderer.render(scene, camera);
}

animate();

// ─── Resize ──────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
