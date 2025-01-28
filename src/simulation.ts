import * as THREE from "three";
import { Sensor } from "./sensors/sensor";

export class Simulation {
  constructor(private globe: THREE.Object3D, private sensor: Sensor) {}

  run(scene: THREE.Scene) {
    const projections = this.sensor.generateProjections(this.globe);

    // const projectionLinesPositions = projections.reduce<THREE.Vector3[]>(
    //   (acc, curr) => {
    //     acc.push(...curr);
    //     return acc;
    //   },
    //   []
    // );

    // const projectionGeometry = new THREE.BufferGeometry().setFromPoints(
    //   projectionLinesPositions
    // );
    // const projectionMaterial = new THREE.LineBasicMaterial({
    //   color: 0xff0000,
    //   linewidth: 0.01,
    // });
    // const projectionsObjects = new THREE.LineSegments(
    //   projectionGeometry,
    //   projectionMaterial
    // );

    // scene.add(projectionsObjects);

    const hitPositions = projections.map(([, hit]) => hit);
    const hitGeometry = new THREE.BufferGeometry().setFromPoints(hitPositions);
    const hitMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.001,
    });
    const hitObjects = new THREE.Points(hitGeometry, hitMaterial);
    scene.add(hitObjects);
  }
}
