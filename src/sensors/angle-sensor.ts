import { get3DObjectFromLineString, getPointOnLine } from "../utils/3d";
import * as THREE from "three";
import { toRadians } from "@math.gl/core";
import { Sensor } from "./sensor";
import { geodeticSurfaceNormal } from "../utils/conversions";
import { LineString } from "geojson";

export class AngleSensor extends Sensor {
  constructor(
    private lane: LineString,
    private alpha: number,
    private elevationAngle: number,
    private verticalSamplingRate: number,
    private horizontalSamplingRate: number
  ) {
    super();
  }

  generateProjections(globe: THREE.Object3D) {
    const lineObject = get3DObjectFromLineString(
      this.lane,
      this.verticalSamplingRate
    );
    const projections: [THREE.Vector3, THREE.Vector3][] = [];

    let nadir = new THREE.Vector3();
    let nextPos = new THREE.Vector3();
    let currentPos = new THREE.Vector3();
    let movingDir = new THREE.Vector3();
    let lookDir = new THREE.Vector3();

    for (
      let i = 0;
      i < lineObject.geometry.attributes.position.count - 1;
      i++
    ) {
      currentPos = getPointOnLine(lineObject, i, currentPos);
      nextPos = getPointOnLine(lineObject, i + 1, nextPos);

      movingDir = movingDir.copy(nextPos).sub(currentPos).normalize();
      nadir = geodeticSurfaceNormal(currentPos).negate();

      for (
        let a = this.elevationAngle - this.alpha;
        a <= this.elevationAngle + this.alpha;
        a += this.horizontalSamplingRate
      ) {
        lookDir = lookDir.copy(nadir).applyAxisAngle(movingDir, toRadians(-a));
        this.raycaster.set(currentPos, lookDir);

        const target = this.raycaster.intersectObject(globe)[0]?.point;

        if (target) {
          projections.push([currentPos.clone(), target]);
        }
      }
    }

    return projections;
  }
}
