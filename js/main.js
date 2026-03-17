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

// ─── Helix parameters ───────────────────────────────────────────

const HELIX_RADIUS = 5;
const HELIX_RISE = 0.9;
const HELIX_TURNS_RATE = 0.45;

const helixCenter = (pebbles.length - 1) * HELIX_RISE / 2;
controls.target.set(0, helixCenter, 0);

function helixPosition(index) {
  const angle = index * HELIX_TURNS_RATE;
  const x = Math.cos(angle) * HELIX_RADIUS;
  const z = Math.sin(angle) * HELIX_RADIUS;
  const y = index * HELIX_RISE;
  return new THREE.Vector3(x, y, z);
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

  return new THREE.CanvasTexture(canvas);
}

// ─── Star (pebble) geometry ──────────────────────────────────────

const starGeometry = new THREE.SphereGeometry(0.12, 16, 16);

const pebbleObjects = [];
const raycasterTargets = [];

pebbles.forEach((pebble, i) => {
  const pos = helixPosition(i);
  const [r, g, b] = pebble.color;
  const color = new THREE.Color(r, g, b);

  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(starGeometry, mat);
  mesh.position.copy(pos);
  mesh.userData = { pebbleIndex: i };
  scene.add(mesh);
  raycasterTargets.push(mesh);

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

// ─── Helix thread ───────────────────────────────────────────────

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
  color: 0x304860, transparent: true, opacity: 0.2,
});
scene.add(new THREE.Line(threadGeom, threadMat));

// ─── Background dust ────────────────────────────────────────────

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
  size: 0.08, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true,
});
scene.add(new THREE.Points(dustGeom, dustMat));

// ─── Cosmic fish ────────────────────────────────────────────────
//
// Fish wander through the constellation like thoughts — not orbiting,
// drifting. Lazy turns, varying speed, tails that wag.
// Click one and it startles — burst of speed, frantic tail, glow flare.

const fish = [];
const fishBodies = []; // for raycasting clicks
const FISH_COUNT = 8;
const HELIX_MAX_Y = (pebbles.length - 1) * HELIX_RISE;

function createFish(index) {
  const group = new THREE.Group();

  const sizeScale = 0.7 + Math.random() * 0.6;
  const hue = 0.42 + Math.random() * 0.25;
  const saturation = 0.4 + Math.random() * 0.3;
  const bodyColor = new THREE.Color().setHSL(hue, saturation, 0.45 + Math.random() * 0.15);

  // Body
  const bodyGeom = new THREE.SphereGeometry(0.15 * sizeScale, 8, 6);
  bodyGeom.scale(1, 0.5, 2.2);
  const bodyMat = new THREE.MeshBasicMaterial({
    color: bodyColor, transparent: true, opacity: 0.35,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.userData = { fishIndex: index };
  group.add(body);

  // Tail
  const ts = 0.18 * sizeScale;
  const tailGeom = new THREE.BufferGeometry();
  tailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0,  -ts * 0.8, ts * 0.6, -ts * 1.5,   ts * 0.8, ts * 0.6, -ts * 1.5,
    0, 0, 0,  -ts * 0.8, -ts * 0.6, -ts * 1.5,  ts * 0.8, -ts * 0.6, -ts * 1.5,
  ]), 3));
  tailGeom.computeVertexNormals();
  const tailMat = new THREE.MeshBasicMaterial({
    color: bodyColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
  });
  const tail = new THREE.Mesh(tailGeom, tailMat);
  tail.position.z = -0.15 * sizeScale * 2.2;
  group.add(tail);

  // Glow
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(bodyColor),
    blending: THREE.AdditiveBlending,
    transparent: true, opacity: 0.2, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.2 * sizeScale, 0.8 * sizeScale, 1);
  group.add(glow);

  // Wandering state
  const pos = new THREE.Vector3(
    (Math.random() - 0.5) * 14,
    Math.random() * HELIX_MAX_Y,
    (Math.random() - 0.5) * 14
  );
  group.position.copy(pos);

  const heading = {
    yaw: Math.random() * Math.PI * 2,
    pitch: (Math.random() - 0.5) * 0.3,
  };

  const baseSpeed = (0.4 + Math.random() * 0.5) * sizeScale;

  scene.add(group);

  return {
    group, body, tail, glow,
    pos: pos.clone(),
    heading,
    baseSpeed,
    currentSpeed: baseSpeed,
    wanderStrength: 0.3 + Math.random() * 0.5,
    laziness: 0.5 + Math.random() * 0.5,
    sizeScale,
    wanderTimer: Math.random() * 100,
    tailPhase: Math.random() * Math.PI * 2,
    startleTimer: 0,
    startleYaw: 0,
    startlePitch: 0,
  };
}

for (let i = 0; i < FISH_COUNT; i++) {
  const f = createFish(i);
  fish.push(f);
  fishBodies.push(f.body);
}

// ─── Central Prism ──────────────────────────────────────────────

const prismGroup = new THREE.Group();
const helixMidY = (pebbles.length - 1) * HELIX_RISE / 2;
prismGroup.position.set(0, helixMidY, 0);

const prismHeight = 2.2;
const prismRadius = 0.6;
const prismGeom = new THREE.CylinderGeometry(prismRadius, prismRadius, prismHeight, 3, 1);
const prismMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false,
});
prismGroup.add(new THREE.Mesh(prismGeom, prismMat));

const prismEdges = new THREE.EdgesGeometry(prismGeom);
const prismLineMat = new THREE.LineBasicMaterial({
  color: 0xc8a050, transparent: true, opacity: 0.4,
});
prismGroup.add(new THREE.LineSegments(prismEdges, prismLineMat));

const prismGlowMat = new THREE.SpriteMaterial({
  map: makeGlowTexture(new THREE.Color(0.85, 0.75, 0.55)),
  blending: THREE.AdditiveBlending,
  transparent: true, opacity: 0.15, depthWrite: false,
});
const prismGlow = new THREE.Sprite(prismGlowMat);
prismGlow.scale.set(3.5, 4.5, 1);
prismGroup.add(prismGlow);

const sparkMat = new THREE.SpriteMaterial({
  map: makeGlowTexture(new THREE.Color(1.0, 0.92, 0.7)),
  blending: THREE.AdditiveBlending,
  transparent: true, opacity: 0, depthWrite: false,
});
const sparkSprite = new THREE.Sprite(sparkMat);
sparkSprite.scale.set(0.6, 0.6, 1);
prismGroup.add(sparkSprite);

const refractionRays = [];
const rayCount = 6;
for (let i = 0; i < rayCount; i++) {
  const angle = (i / rayCount) * Math.PI * 2;
  const rayLength = 3 + Math.random() * 2;
  const rayY = (Math.random() - 0.5) * prismHeight * 0.6;
  const rayEnd = new THREE.Vector3(
    Math.cos(angle) * rayLength, rayY, Math.sin(angle) * rayLength
  );

  const hue = i / rayCount;
  const rayColor = new THREE.Color().setHSL(hue, 0.4, 0.6);
  const rayGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), rayEnd
  ]);
  const rayMat = new THREE.LineBasicMaterial({
    color: rayColor, transparent: true, opacity: 0.08,
  });
  const ray = new THREE.Line(rayGeom, rayMat);
  prismGroup.add(ray);
  refractionRays.push({ line: ray, mat: rayMat, phase: Math.random() * Math.PI * 2 });
}

scene.add(prismGroup);

// ─── Raycaster & interaction ────────────────────────────────────

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

// ─── Fish click → startle ───────────────────────────────────────

const _clickRay = new THREE.Raycaster();

window.addEventListener('click', (e) => {
  const clickMouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  _clickRay.setFromCamera(clickMouse, camera);

  // Check fish bodies — they're children of groups, so we need recursive check
  const allFishMeshes = fish.map(f => f.body);
  const intersects = _clickRay.intersectObjects(allFishMeshes, true);

  if (intersects.length > 0) {
    // Walk up to find which fish was hit
    let hitObj = intersects[0].object;
    while (hitObj && hitObj.userData.fishIndex === undefined) {
      hitObj = hitObj.parent;
    }
    if (hitObj && hitObj.userData.fishIndex !== undefined) {
      const f = fish[hitObj.userData.fishIndex];
      if (f.startleTimer <= 0) {
        // Startle! Random escape direction
        f.startleTimer = 1.2;
        f.startleYaw = f.heading.yaw + (Math.random() - 0.5) * Math.PI * 1.5 + Math.PI;
        f.startlePitch = (Math.random() - 0.5) * 0.6;
      }
    }
  }
});

// ─── Fish wandering logic ───────────────────────────────────────

const _fishVel = new THREE.Vector3();
const _toCenter = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const WANDER_BOUNDS = 12;
const WANDER_Y_MIN = -2;
const WANDER_Y_MAX = HELIX_MAX_Y + 2;

function updateFishWander(f, dt, t) {
  f.wanderTimer += dt;

  // ── Startle override ──
  if (f.startleTimer > 0) {
    f.startleTimer -= dt;
    const startleFade = Math.max(0, f.startleTimer / 1.2);
    const startleStrength = startleFade * startleFade; // ease out

    // Burst toward escape direction
    f.heading.yaw += (f.startleYaw - f.heading.yaw) * 0.1;
    f.heading.pitch = f.startlePitch * startleStrength;
    f.currentSpeed = f.baseSpeed * (1 + 4 * startleStrength);

    // Frantic tail
    f.tailPhase += dt * (12 + 8 * startleStrength);
    const wagAngle = Math.sin(f.tailPhase) * 0.6 * startleStrength;
    f.tail.rotation.y = wagAngle;

    // Glow flare
    f.glow.material.opacity = 0.3 + 0.4 * startleStrength;
    f.body.material.opacity = 0.5 + 0.3 * startleStrength;
  } else {
    // ── Normal wander ──
    const yawDrift = Math.sin(f.wanderTimer * 0.7 * f.laziness) * f.wanderStrength * 0.5
      + Math.sin(f.wanderTimer * 1.3 * f.laziness + 3.7) * f.wanderStrength * 0.3;
    const pitchDrift = Math.sin(f.wanderTimer * 0.5 * f.laziness + 1.1) * 0.15;

    f.heading.yaw += yawDrift * dt;
    f.heading.pitch = pitchDrift;

    f.currentSpeed = f.baseSpeed * (0.6 + 0.4 * Math.sin(f.wanderTimer * 0.4 * f.laziness));

    // Tail wag — proportional to speed
    f.tailPhase += dt * (3 + f.currentSpeed * 4);
    const wagAngle = Math.sin(f.tailPhase) * 0.35 * (0.5 + f.currentSpeed / f.baseSpeed * 0.5);
    f.tail.rotation.y = wagAngle;

    // Normal bioluminescence
    f.glow.material.opacity = 0.15 + Math.sin(t * 1.5 + f.wanderTimer * 3) * 0.1;
    f.body.material.opacity = 0.25 + Math.sin(t * 1.2 + f.wanderTimer * 2) * 0.12;
  }

  // Velocity from heading (shared between startle and normal)
  const cy = Math.cos(f.heading.pitch);
  _fishVel.set(
    Math.sin(f.heading.yaw) * cy,
    Math.sin(f.heading.pitch),
    Math.cos(f.heading.yaw) * cy
  );
  _fishVel.multiplyScalar(f.currentSpeed * dt);
  f.pos.add(_fishVel);

  // Soft pull toward helix center
  _toCenter.set(0, helixCenter, 0).sub(f.pos);
  const distFromCenter = _toCenter.length();
  if (distFromCenter > WANDER_BOUNDS * 0.6) {
    const pullStrength = Math.pow(
      (distFromCenter - WANDER_BOUNDS * 0.6) / (WANDER_BOUNDS * 0.4), 2
    ) * 0.3;
    _toCenter.normalize().multiplyScalar(pullStrength * dt);
    f.pos.add(_toCenter);
    const targetYaw = Math.atan2(_toCenter.x, _toCenter.z);
    let yawDiff = targetYaw - f.heading.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    f.heading.yaw += yawDiff * pullStrength * dt * 0.5;
  }

  // Soft Y bounds
  if (f.pos.y < WANDER_Y_MIN) {
    f.pos.y = WANDER_Y_MIN;
    f.heading.pitch = Math.abs(f.heading.pitch);
  }
  if (f.pos.y > WANDER_Y_MAX) {
    f.pos.y = WANDER_Y_MAX;
    f.heading.pitch = -Math.abs(f.heading.pitch);
  }

  f.group.position.copy(f.pos);

  // Face direction of travel
  _lookAhead.set(
    Math.sin(f.heading.yaw) * cy,
    Math.sin(f.heading.pitch),
    Math.cos(f.heading.yaw) * cy
  ).add(f.pos);
  f.group.lookAt(_lookAhead);
}

// ─── Animation ───────────────────────────────────────────────────

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  const t = elapsed;

  // Pebble breathing
  pebbleObjects.forEach((obj, i) => {
    const breathe = 0.4 + Math.sin(t * 0.8 + i * 0.7) * 0.15;
    obj.sprite.material.opacity = breathe;

    if (i === hoveredIndex) {
      obj.sprite.material.opacity = 0.9;
      obj.mesh.scale.setScalar(1.5);
    } else {
      obj.mesh.scale.setScalar(1.0);
    }
  });

  // Prism
  prismGroup.rotation.y = t * 0.08;
  prismGlow.material.opacity = 0.12 + Math.sin(t * 0.4) * 0.06;
  prismLineMat.opacity = 0.3 + Math.sin(t * 0.6) * 0.15;

  const sparkCycle = (t * 1.3) % (Math.PI * 2);
  const sparkOn = sparkCycle < 0.6;
  const sparkIntensity = sparkOn ? Math.pow(Math.sin(sparkCycle / 0.6 * Math.PI), 2) : 0;
  sparkMat.opacity = sparkIntensity * 0.85;

  refractionRays.forEach((ray) => {
    ray.mat.opacity = 0.04 + Math.sin(t * 0.7 + ray.phase) * 0.06;
  });

  // Fish
  fish.forEach((f) => updateFishWander(f, dt, t));

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
