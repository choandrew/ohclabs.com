// === SCENE SETUP ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 12;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === EARTH SETUP ===
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('pics/earth.jpg'); // Ensure correct path
const sphereGeometry = new THREE.SphereGeometry(5, 64, 64);
const sphereMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(earth);

// === LIGHTS ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// === UTILITY FUNCTIONS ===

// Converts an Earth‑local point to camera space.
function toCameraSpace(localPoint) {
  const worldPoint = localPoint.clone();
  earth.localToWorld(worldPoint);
  return worldPoint.applyMatrix4(camera.matrixWorldInverse);
}

// Returns a random point on the Earth's surface (in Earth‑local space).
function randomSurfacePointLocal() {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const x = 5 * Math.sin(phi) * Math.cos(theta);
  const y = 5 * Math.sin(phi) * Math.sin(theta);
  const z = 5 * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Keeps picking until the point is on the visible (front) side.
function randomVisibleSurfacePoint() {
  let p, camPos;
  do {
    p = randomSurfacePointLocal();
    camPos = toCameraSpace(p);
  } while (camPos.z >= 0);
  return p;
}

// === ARC / RAY CREATION ===

// Creates a quadratic Bézier arc connecting two Earth‑local visible points.
function createArc(startPoint, endPoint) {
  // Compute control point as the midpoint, lifted above the surface.
  const mid = startPoint.clone().add(endPoint).multiplyScalar(0.5);
  const lift = 2; // How high to lift the midpoint
  mid.normalize().multiplyScalar(5 + lift);

  // Ensure the control point is visible
  const midCam = toCameraSpace(mid);
  if (midCam.z >= 0) {
    mid.setZ(-Math.abs(mid.z));
  }

  // Create the Bézier curve and sample points along it.
  const curve = new THREE.QuadraticBezierCurve3(startPoint, mid, endPoint);
  const segments = 50;
  const points = curve.getPoints(segments);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Create a bright line material that respects depth testing.
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false
  });
  
  const line = new THREE.Line(geometry, material);
  // Add the arc in Earth‑local space so it rotates with the globe.
  earth.add(line);
  return line;
}

// Array to keep track of arcs (maximum 10 visible).
const arcs = [];

// Adds a new arc connecting two random visible points.
function addNewArc() {
  const startPoint = randomVisibleSurfacePoint();
  const endPoint = randomVisibleSurfacePoint();
  const arcLine = createArc(startPoint, endPoint);
  
  // Store the new arc.
  arcs.push(arcLine);
  
  // If more than 10 arcs, remove and dispose the oldest one.
  if (arcs.length > 40) {
    const oldestArc = arcs.shift();
    earth.remove(oldestArc);
    oldestArc.geometry.dispose();
    oldestArc.material.dispose();
  }
}

// Create a new arc every 2 seconds.
setInterval(addNewArc, 500);
setInterval(addNewArc, 500);
setInterval(addNewArc, 500);

// === ANIMATION LOOP ===
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate Earth continuously.
  earth.rotation.y += 0.005;
  renderer.render(scene, camera);
}
animate();

// === HANDLE RESIZING ===
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
