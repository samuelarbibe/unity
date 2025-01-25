import "./style.css";
import * as THREE from "three";
import { lineString } from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import lebanonDistricts from "../data/lebanon.ts";
import { GlobeGeometry } from "./globe.ts";
import {
  get3DObjectFromPolygon,
  get3DObjectFromLineString,
} from "./utils/3d.ts";
import { METERS_PER_KM } from "./utils/consts.ts";
import { lngLatAltToVector } from "./utils/conversions.ts";
import { mergePolygons } from "./utils/geometry.ts";
import { DEM } from "./dem.ts";
import { Sensor } from "./sensor.ts";
import { Simulation } from "./simulation.ts";

import {
  computeBoundsTree,
  disposeBoundsTree,
  computeBatchedBoundsTree,
  disposeBatchedBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;

async function run() {
  THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

  const canvas = document.querySelector<HTMLDivElement>("#app");
  const renderer = new THREE.WebGLRenderer();

  canvas?.appendChild(renderer.domElement);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();

  // camera
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  const cameraFocus = lngLatAltToVector([
    35.567258583714505, 34.09206402265245,
  ]);
  const cameraPosition = lngLatAltToVector([
    35.567258583714505, 34.09206402265245, 100_000,
  ]);

  camera.position.copy(cameraPosition);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(cameraFocus);

  // lebanon
  const lebanonGeoJSON = mergePolygons(lebanonDistricts, 0.01);
  const lebanon = get3DObjectFromPolygon(lebanonGeoJSON.geometry);

  scene.add(lebanon);

  // globe
  const dem = new DEM();
  await dem.loadFromFile("DEM.tif");

  const globeGeometry = new GlobeGeometry(
    0.005,
    0.005,
    35.7,
    36.2,
    34.1,
    34.5,
    dem
  );

  globeGeometry.computeBoundsTree();

  const globeMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    wireframeLinewidth: 0.5,
    side: THREE.BackSide,
  });
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  scene.add(globe);

  // lane
  const laneGeoJSON = lineString([
    [35.697489072151996, 34.32605282423867, 3000],
    [35.820916382160334, 34.47018642182205, 3000],
  ]);
  const slerpDistance = METERS_PER_KM * 1;
  const lane = get3DObjectFromLineString(laneGeoJSON.geometry, slerpDistance);
  scene.add(lane);

  // axes
  const axesHelper = new THREE.AxesHelper(lngLatAltToVector([0, 0, 0]).x);
  scene.add(axesHelper);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  });

  // simulation
  const sensor = new Sensor(10, 85);
  const simulation = new Simulation(
    globe,
    sensor,
    laneGeoJSON.geometry,
    METERS_PER_KM * 0.3,
    0.1
  );

  simulation.run(scene);

  function animate() {
    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
  }

  animate();
}

run();
