import { destination, point } from "@turf/turf";
import * as THREE from "three";
import { toRadians } from "@math.gl/core";
import { Sensor } from "./sensor";
import { geodeticSurfaceNormal, lngLatAltToVector } from "../utils/conversions";
import { Point } from "geojson";
import { METERS_PER_KM } from "../utils/consts";

export class PointSensor extends Sensor {
  constructor(
    private point: Point,
    private startBearing: number,
    private endBearing: number,
    private alpha: number,
    private elevationAngle: number
  ) {
    super();
  }

  generateProjections(globe: THREE.Object3D, samplingRate: number) {
    const projections: [THREE.Vector3, THREE.Vector3][] = [];

    const pointOnGround = point(this.point.coordinates.slice(0, 2));
    const pointNorth = destination(pointOnGround, 1, 0)
      .geometry.coordinates.slice(0, 2)
      .concat(this.point.coordinates[2]);

    const position = lngLatAltToVector(this.point.coordinates);
    const positionNorth = lngLatAltToVector(pointNorth);

    const north = positionNorth.sub(position).normalize();
    const nadir = geodeticSurfaceNormal(position).negate();

    let bearingDir = new THREE.Vector3();
    let lookDir = new THREE.Vector3();
    let crossDir = new THREE.Vector3();

    for (
      let bearing = this.startBearing;
      bearing < this.endBearing;
      bearing += samplingRate / METERS_PER_KM
    ) {
      bearingDir = bearingDir
        .copy(north)
        .applyAxisAngle(nadir, toRadians(bearing))
        .normalize();

      crossDir = crossDir.copy(nadir).cross(bearingDir);

      for (
        let angle = this.elevationAngle - this.alpha;
        angle <= this.elevationAngle + this.alpha;
        angle += samplingRate / METERS_PER_KM
      ) {
        lookDir = lookDir
          .copy(nadir)
          .applyAxisAngle(crossDir, toRadians(angle));

        this.raycaster.set(position, lookDir);

        const target = this.raycaster.intersectObject(globe)[0]?.point;

        if (target) {
          projections.push([position.clone(), target]);
        }
      }
    }

    return projections;
  }
}
