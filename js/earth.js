// === CONFIGURABLE PARAMETERS ===
// Earth's axial tilt in degrees (for example, 23.5° for realistic Earth)
const tiltDegrees = 190;
const tiltRadians = THREE.MathUtils.degToRad(tiltDegrees);
// Compute the configurable spin axis: starting from (0,1,0) tilt toward the viewer along -z.
// This yields a vector with y = cos(tiltRadians) and z = sin(tiltRadians)
const configSpinAxis = new THREE.Vector3(0, Math.cos(tiltRadians), Math.sin(tiltRadians)).normalize();

// === SCENE SETUP ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 12;

const earthPivotY = -0.25;
const earthPivotYMobile = -5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

if (window.innerWidth < 600) {
    renderer.setSize(window.innerWidth, window.innerHeight);
} else {
    const multiplier = 1.3;
    renderer.setSize(window.innerWidth * multiplier, window.innerHeight * multiplier);
}
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// === EARTH SETUP ===
// Load Earth texture
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('pics/earth.jpg'); // Ensure the path is correct

// Create Earth geometry (default poles along Y)
const sphereGeometry = new THREE.SphereGeometry(5, 64, 64);
let sphereMaterial;
if (window.innerWidth < 600) {
    sphereMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, transparent: true, opacity: 0.3 });
} else {
    sphereMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, transparent: true, opacity: 0.7 });
}

const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);

// Reorient the Earth so that its natural poles lie along the Z axis.
// (Rotate -90° about X: the original Y axis becomes the Z axis.)
earth.rotation.x = -Math.PI / 2;

// Create a pivot group and add the Earth to it.
const earthPivot = new THREE.Group();
earthPivot.add(earth);
scene.add(earthPivot);

// Align the pivot's local Z axis (default (0,0,1)) with our desired spin axis.
const defaultZ = new THREE.Vector3(0, 0, 1);
const alignQuat = new THREE.Quaternion().setFromUnitVectors(defaultZ, configSpinAxis);
earthPivot.quaternion.copy(alignQuat);

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

// Returns a random point on Earth's surface (in Earth‑local coordinates).
function randomSurfacePointLocal() {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const x = 5 * Math.sin(phi) * Math.cos(theta);
  const y = 5 * Math.sin(phi) * Math.sin(theta);
  const z = 5 * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Returns a random point on Earth's surface that is visible (in front of the camera).
function randomVisibleSurfacePoint() {
  let p, camPos;
  do {
    p = randomSurfacePointLocal();
    camPos = toCameraSpace(p);
  } while (camPos.z >= 0);
  return p;
}

// === ARC / BEAM CREATION ===
// Creates a quadratic Bézier arc connecting two Earth‑local visible points.
function createArc(startPoint, endPoint) {
  // Compute control point as the midpoint lifted above the surface.
  const mid = startPoint.clone().add(endPoint).multiplyScalar(0.5);
  const lift = 2.5; // How high to lift the midpoint above the surface
  mid.normalize().multiplyScalar(5 + lift);
  
  // Ensure the control point is visible.
  const midCam = toCameraSpace(mid);
  if (midCam.z >= 0) {
    mid.setZ(-Math.abs(mid.z));
  }
  
  // Create the quadratic Bézier curve and sample points along it.
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
  // Add the arc as a child of Earth so it rotates correctly.
  earth.add(line);
  return line;
}

// === BEAM MANAGEMENT ===
// Array to store arcs (beams)
const arcs = [];

// Adds a new arc connecting two random visible points.
function addNewArc() {
  const startPoint = randomVisibleSurfacePoint();
  const endPoint = randomVisibleSurfacePoint();
  const arcLine = createArc(startPoint, endPoint);
  arcs.push(arcLine);
  
  // Limit to a maximum of 10 arcs: remove the oldest if necessary.
  if (arcs.length > 50) {
    const oldestArc = arcs.shift();
    earth.remove(oldestArc);
    oldestArc.geometry.dispose();
    oldestArc.material.dispose();
  }
}

// Create a new arc every 2 seconds.
setInterval(addNewArc, 150);

// === ANIMATION LOOP ===
function animate() {
  requestAnimationFrame(animate);
  
  // Spin the pivot group about its local Z axis (which is now aligned with configSpinAxis).
  const spinSpeed = 0.005;
  earthPivot.rotateOnAxis(new THREE.Vector3(0, 0, 1), spinSpeed);
  
  renderer.render(scene, camera);

  if (window.innerWidth < 600) {
    earthPivot.position.y = earthPivotYMobile;
  } else {
      earthPivot.position.y = earthPivotY;
  }
}
animate();

// === HANDLE RESIZING ===
window.addEventListener('resize', () => {

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  if (window.innerWidth < 600) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    earthPivot.position.y = earthPivotYMobile;
} else {
    const multiplier = 1.3;
    renderer.setSize(window.innerWidth * multiplier, window.innerHeight * multiplier);
    earthPivot.position.y = earthPivotY;
}
});