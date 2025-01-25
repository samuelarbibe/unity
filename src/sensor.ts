import { LineString } from "@turf/turf";
import { get3DObjectFromLineString, getPointOnLine } from "./utils/3d";
import * as THREE from "three";
import { Ellipsoid } from "@math.gl/geospatial";
import { toRadians } from "@math.gl/core";

export class Sensor {
  constructor(private alpha: number, private elevationAngle: number) {}

  generateProjections(
    globe: THREE.Object3D,
    lane: LineString,
    verticalSamplingRate: number,
    horizontalSamplingRate: number
  ) {
    const raycaster = new THREE.Raycaster();
    raycaster.far = 10;

    const lineObject = get3DObjectFromLineString(lane, verticalSamplingRate);
    const projections: [THREE.Vector3, THREE.Vector3][] = [];

    let nadir = new THREE.Vector3();
    let cartesianPos = [0, 0, 0];
    let surfaceNormal = [0, 0, 0];
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

      cartesianPos = currentPos.toArray(cartesianPos);
      surfaceNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(
        cartesianPos,
        surfaceNormal
      );
      nadir = nadir.fromArray(surfaceNormal).negate();

      for (
        let a = this.elevationAngle - this.alpha;
        a <= this.elevationAngle + this.alpha;
        a += horizontalSamplingRate
      ) {
        lookDir = lookDir.copy(nadir).applyAxisAngle(movingDir, toRadians(-a));
        raycaster.set(currentPos, lookDir);

        const target = raycaster.intersectObject(globe)[0]?.point;

        if (target) {
          projections.push([currentPos.clone(), target]);
        }
      }
    }

    return projections;
  }
}
