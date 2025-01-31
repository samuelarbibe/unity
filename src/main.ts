import "./style.css";
import * as THREE from "three";
import { lineString, point } from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import lebanonDistricts from "../data/lebanon.ts";
import { GlobeGeometry } from "./globe.ts";
import {
  get3DObjectFromPolygon,
  get3DObjectFromLineString,
  get3DObjectFromPoint,
} from "./utils/3d.ts";
import { METERS_PER_KM } from "./utils/consts.ts";
import { lngLatAltToVector } from "./utils/conversions.ts";
import { mergePolygons } from "./utils/geometry.ts";
import { DEM } from "./dem.ts";
import { Simulation } from "./simulation.ts";

import {
  computeBoundsTree,
  disposeBoundsTree,
  computeBatchedBoundsTree,
  disposeBatchedBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";
import { AngleSensor } from "./sensors/angle-sensor.ts";
import { NearFarSensor } from "./sensors/near-far-sensor.ts";
import { PointSensor } from "./sensors/point-sensor.ts";

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

  scene.add(...lebanon);

  // globe
  const dem = new DEM();
  await dem.loadFromFile("DEM.tif");

  const globeGeometry = new GlobeGeometry(
    0.002,
    0.002,
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

  // axes
  const axesHelper = new THREE.AxesHelper(lngLatAltToVector([0, 0, 0]).x);
  scene.add(axesHelper);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  });

  // simulation 1
  const laneGeoJSON = lineString([
    [35.81173966438041, 34.223477239036384, 3000],
    [35.814689800345064, 34.49327712216213, 3000],
  ]);
  const lane1 = get3DObjectFromLineString(
    laneGeoJSON.geometry,
    METERS_PER_KM * 1
  );
  scene.add(lane1);

  // const sensor1 = new AngleSensor(
  //   laneGeoJSON.geometry,
  //   10,
  //   85,
  //   0.3 * METERS_PER_KM,
  //   0.1
  // );

  const sensor1 = new NearFarSensor(
    laneGeoJSON.geometry,
    20 * METERS_PER_KM,
    60 * METERS_PER_KM
  );

  const simulation1 = new Simulation(globe, sensor1, 0.3 * METERS_PER_KM);
  simulation1.run(scene);
  //

  // simulation 2
  const lane2GeoJSON = lineString([
    [35.872580014743505, 34.12832462549051, 5000],
    [35.875549597317956, 34.19473037685394, 5000],
  ]);
  const lane2 = get3DObjectFromLineString(
    lane2GeoJSON.geometry,
    METERS_PER_KM * 1
  );
  scene.add(lane2);

  const sensor2 = new NearFarSensor(
    lane2GeoJSON.geometry,
    7 * METERS_PER_KM,
    45 * METERS_PER_KM
  );
  const simulation2 = new Simulation(globe, sensor2, 0.5 * METERS_PER_KM);
  simulation2.run(scene);
  //

  // simulation 3
  const point3 = point([35.78206410711991, 34.15878030223702, 3000]);
  const pointObject = get3DObjectFromPoint(point3.geometry);

  scene.add(pointObject);

  const sensor3 = new PointSensor(point3.geometry, 0, 90, 20, 45, 0.5, 0.5);
  const simulation3 = new Simulation(globe, sensor3, 1 * METERS_PER_KM);
  simulation3.run(scene);
  //

  function animate() {
    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
  }

  animate();
}

run();
