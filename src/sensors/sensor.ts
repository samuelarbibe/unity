import * as THREE from "three";

export abstract class Sensor {
  protected raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  abstract generateProjections(
    globe: THREE.Object3D
  ): [THREE.Vector3, THREE.Vector3][];
}
