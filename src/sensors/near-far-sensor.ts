import { LineString } from "@turf/turf";
import { get3DObjectFromLineString, getPointOnLine } from "../utils/3d";
import * as THREE from "three";
import { Sensor } from "./sensor";
import { METERS_PER_UNIT } from "../utils/consts";
import {
  geodeticSurfaceNormal,
  vectorOnGeodeticSurface,
} from "../utils/conversions";

export class NearFarSensor extends Sensor {
  constructor(
    private lane: LineString,
    private near: number,
    private far: number,
    private samplingRate: number
  ) {
    super();
  }

  generateProjections(globe: THREE.Object3D) {
    const lineObject = get3DObjectFromLineString(this.lane, this.samplingRate);
    const projections: [THREE.Vector3, THREE.Vector3][] = [];

    let nadir = new THREE.Vector3();
    let nextPos = new THREE.Vector3();
    let currentPos = new THREE.Vector3();
    let movingDir = new THREE.Vector3();
    let lookDir = new THREE.Vector3();
    let crossVector = new THREE.Vector3();
    let near = new THREE.Vector3();
    let horizontalPos = new THREE.Vector3();
    let horizontalPosOnSurface = new THREE.Vector3();

    for (
      let i = 0;
      i < lineObject.geometry.attributes.position.count - 1;
      i++
    ) {
      currentPos = getPointOnLine(lineObject, i, currentPos);
      nextPos = getPointOnLine(lineObject, i + 1, nextPos);

      movingDir = movingDir.copy(nextPos).sub(currentPos).normalize();

      nadir = geodeticSurfaceNormal(currentPos).negate();
      crossVector.crossVectors(nadir, movingDir).normalize();

      near.copy(crossVector).multiplyScalar(this.near / METERS_PER_UNIT);

      for (
        let depth = 0;
        depth <= this.far - this.near;
        depth += this.samplingRate
      ) {
        horizontalPos = horizontalPos
          .copy(crossVector)
          .multiplyScalar((this.near + depth) / METERS_PER_UNIT)
          .add(currentPos);

        horizontalPosOnSurface = vectorOnGeodeticSurface(
          horizontalPos,
          horizontalPosOnSurface
        );

        lookDir = lookDir
          .copy(horizontalPosOnSurface)
          .sub(currentPos)
          .normalize();

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
