import { toRadians } from "@math.gl/core";
import type { LineString } from "geojson";
import { get3DObjectFromLineString, getPointOnLine } from "../utils/3d";
import { geodeticSurfaceNormal } from "../utils/conversions";
import { Sensor } from "./sensor";
import { type Object3D, Vector3 } from "three";

export class AngleSensor extends Sensor {
	constructor(
		private alpha: number,
		private elevationAngle: number,
	) {
		super();
	}

	generateProjections(globe: Object3D, lane: LineString, samplingRate: number) {
		const lineObject = get3DObjectFromLineString(lane, samplingRate);
		const projections: [Vector3, Vector3][] = [];

		let nadir = new Vector3();
		let nextPos = new Vector3();
		let currentPos = new Vector3();
		let movingDir = new Vector3();
		let lookDir = new Vector3();

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
				a += samplingRate
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
