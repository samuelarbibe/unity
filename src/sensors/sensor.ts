import { LineString } from "@turf/turf";
import * as THREE from "three";

export abstract class Sensor {
  protected raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  abstract generateProjections(
    globe: THREE.Object3D,
    lane: LineString
  ): [THREE.Vector3, THREE.Vector3][];
}
