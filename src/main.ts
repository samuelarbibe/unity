import './style.css'
import * as THREE from 'three'
import { centroid, lineString } from '@turf/turf';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import {
  METERS_PER_KM,
  mergePolygons,
  getPointOnLine,
  lngLatAltToVector,
  createFrustumFrame,
  get3DObjectFromPolygon,
  get3DObjectFromLineString,
  get3DObjectFromFrustumFrame,
  get3DObjectFromFrustumIntersection,
} from './utils';
import lebanonDistricts from '../data/lebanon.ts'
import { GlobeGeometry } from './Globe.ts';

THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

const canvas = document.querySelector<HTMLDivElement>('#app')

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
canvas?.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);
const controls = new OrbitControls(camera, renderer.domElement);

const lebanonPolygon = mergePolygons(lebanonDistricts, 0.01)
const lebanon = get3DObjectFromPolygon(lebanonPolygon.geometry);

// const geometry = new GlobeGeometry(0.1, 0.1, 34.5, 37, 32.5, 35);
const geometry = new GlobeGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1, side: THREE.BackSide });
const globe = new THREE.Mesh(geometry, material);

const slerpDistance = METERS_PER_KM * 10
const lane = get3DObjectFromLineString(lineString([
  [
    35.070771710910634,
    33.2583547951523,
    350_000
  ],
  [
    35.124403888233275,
    33.497407565043986,
    350_000
  ],
  [
    35.23236476466175,
    33.694666693376504,
    350_000
  ],
  [
    35.29505172516929,
    33.80528180324596,
    350_000
  ]
]
), slerpDistance)

const pointOnSurface = lngLatAltToVector([35.39428495959217, 33.224181124642186])

for (let i = 0; i <= 0; i++) {
  const pointOnLane = getPointOnLine(lane, i)
  const frustumFrame = createFrustumFrame(pointOnLane, pointOnSurface, 1, 10)
  const frustumFrameIntersection = get3DObjectFromFrustumIntersection(pointOnLane, frustumFrame, globe)

  const frustumFrameObject = get3DObjectFromFrustumFrame(pointOnLane, frustumFrame)

  scene.add(frustumFrameObject)
  scene.add(frustumFrameIntersection)
}

scene.add(lane);
scene.add(lebanon);
scene.add(globe);

const centerOfLebanon = lngLatAltToVector(centroid(lebanonPolygon).geometry.coordinates)

const cameraPosition = pointOnSurface.clone().multiplyScalar(1.05)

camera.position.x = cameraPosition.x
camera.position.y = cameraPosition.y
camera.position.z = cameraPosition.z

controls.target.x = pointOnSurface.x
controls.target.y = pointOnSurface.y
controls.target.z = pointOnSurface.z

// const axesHelper = new THREE.AxesHelper(lngLatAltToVector([0, 0, 0]).x);

// scene.add(axesHelper);

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

animate()


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(scene, camera)
})