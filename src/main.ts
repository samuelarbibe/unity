import "./style.css";
import * as THREE from "three";
import { lineString } from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import lebanonDistricts from "../data/lebanon.ts";
import { GlobeGeometry } from "./geometries/globe.ts";
import {
  get3DObjectFromPolygon,
  get3DObjectFromLineString,
  getPointOnLine,
} from "./utils/3d.ts";
import { METERS_PER_KM } from "./utils/consts.ts";
import { lngLatAltToVector } from "./utils/conversions.ts";
import { getFrustumNormal, getFrustumIntersection } from "./utils/frustum.ts";
import { mergePolygons } from "./utils/geometry.ts";
import { DEM } from "./utils/height.ts";

async function run() {
  THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

  const canvas = document.querySelector<HTMLDivElement>("#app");

  const renderer = new THREE.WebGLRenderer();

  renderer.setSize(window.innerWidth, window.innerHeight);
  canvas?.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    700
  );

  const controls = new OrbitControls(camera, renderer.domElement);

  const lebanonGeoJSON = mergePolygons(lebanonDistricts, 0.01);
  const lebanon = get3DObjectFromPolygon(lebanonGeoJSON.geometry);

  const dataUrl = "DEM.tif";

  const dem = new DEM(dataUrl);
  await dem.load();

  const globeGeometry = new GlobeGeometry(
    0.002,
    0.002,
    35.567258583714505,
    36.655101456535135,
    34.09206402265245,
    34.54153636493626,
    dem
  );

  const globeMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    wireframeLinewidth: 0.5,
    side: THREE.BackSide,
  });
  const globe = new THREE.Mesh(globeGeometry, globeMaterial);

  const laneGeoJSON = lineString([
    [35.697489072151996, 34.32605282423867, 2500],
    [35.820916382160334, 34.47018642182205, 2500],
  ]);
  const slerpDistance = METERS_PER_KM * 1;
  const lane = get3DObjectFromLineString(laneGeoJSON, slerpDistance);

  const cameraFocus = lngLatAltToVector([
    35.39428495959217, 33.224181124642186,
  ]);

  let index = 0;
  const origin = getPointOnLine(lane, index++);
  const nextPosition = getPointOnLine(lane, index);

  while (origin.x && nextPosition.x) {
    const direction = nextPosition.clone().sub(origin).normalize();

    for (let v = 8; v <= 8; v += 5) {
      for (let h = 80; h <= 100; h += 5) {
        const frustumNormal = getFrustumNormal(origin, direction, v, h);
        const target = frustumNormal.clone().add(origin);
        const intersectionPoints = getFrustumIntersection(
          origin,
          target,
          3,
          3,
          globe
        );

        const closedIntersectionPoints = [
          ...intersectionPoints,
          intersectionPoints[0],
        ].filter(Boolean);
        const geometry = new THREE.BufferGeometry().setFromPoints(
          closedIntersectionPoints
        );
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

        const intersection = new THREE.Line(geometry, material);

        scene.add(intersection);
      }
    }

    origin.copy(nextPosition);
    getPointOnLine(lane, index++, nextPosition);
  }

  scene.add(lane);
  scene.add(globe);
  scene.add(lebanon);

  const cameraPosition = cameraFocus.clone().addScalar(2);

  camera.position.copy(cameraPosition);
  controls.target.copy(cameraFocus);

  const axesHelper = new THREE.AxesHelper(lngLatAltToVector([0, 0, 0]).x);

  scene.add(axesHelper);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  });

  function animate() {
    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
  }

  animate();
}

run();
