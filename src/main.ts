import './style.css'
import * as THREE from 'three'
import { lineString } from '@turf/turf';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import {
  METERS_PER_KM,
  mergePolygons,
  getPointOnLine,
  lngLatAltToVector,
  get3DObjectFromPolygon,
  getFrustumIntersection,
  get3DObjectFromLineString,
} from './utils';
import { GlobeGeometry } from './Globe.ts';
import lebanonDistricts from '../data/lebanon.ts'

THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

const canvas = document.querySelector<HTMLDivElement>('#app')

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
canvas?.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);
const controls = new OrbitControls(camera, renderer.domElement);

const lebanonGeoJSON = mergePolygons(lebanonDistricts, 0.01)
const lebanon = get3DObjectFromPolygon(lebanonGeoJSON.geometry);

const globeGeometry = new GlobeGeometry(0.1, 0.1, 0, 37, 32.5, 60);
const globeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.05, side: THREE.BackSide });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);

const laneGeoJSON = lineString([
  [
    35.070771710910634,
    33.2583547951523,
    4500
  ],
  [
    35.29505172516929,
    33.80528180324596,
    4500
  ]
]
)
const slerpDistance = METERS_PER_KM * 100
const lane = get3DObjectFromLineString(laneGeoJSON, slerpDistance)

const target = lngLatAltToVector([35.39428495959217, 33.224181124642186])

for (let i = 0; i <= 0; i++) {
  const origin = getPointOnLine(lane, i)
  const intersectionPoints = getFrustumIntersection(origin, target, 1, 10, globe)

  const geometry = new THREE.BufferGeometry().setFromPoints([...intersectionPoints, intersectionPoints[0]]);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

  const intersection = new THREE.Line(geometry, material);

  scene.add(intersection)
}

scene.add(lane);
scene.add(globe);
scene.add(lebanon);

const cameraPosition = target.clone().addScalar(2)

camera.position.copy(cameraPosition)
controls.target.copy(target)

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