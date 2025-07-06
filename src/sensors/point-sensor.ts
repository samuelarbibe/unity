import { bearing, rhumbDestination } from "@turf/turf";
import type { LineString, Position } from "geojson";
import { type Object3D, Vector3 } from "three";
import { findClosestPointOnLine, get3DObjectFromLineString } from "../utils/3d";
import { lngLatAltToVector, vectorToLngLatAlt } from "../utils/conversions";
import { Sensor } from "./sensor";

export class PointSensor extends Sensor {
	constructor(
		private center: Position,
		private width: number,
		private height: number,
	) {
		super();
	}

	generateProjections(globe: Object3D, lane: LineString, samplingRate: number) {
		const lineObject = get3DObjectFromLineString(lane, samplingRate);
		const projections: [Vector3, Vector3][] = [];

		const centerPos = lngLatAltToVector(this.center);
		const currentPos = findClosestPointOnLine(lineObject, centerPos);

		const sourcePoint = vectorToLngLatAlt(currentPos);
		const targetBearing = bearing(sourcePoint, this.center);

		const targetPos = new Vector3();
		const direction = new Vector3();

		for (
			let deltaX = -this.width / 2;
			deltaX <= this.width / 2;
			deltaX += samplingRate
		) {
			for (
				let deltaY = -this.height / 2;
				deltaY <= this.height / 2;
				deltaY += samplingRate
			) {
				const targetPoint = rhumbDestination(
					rhumbDestination(this.center, deltaX, targetBearing + 90, {
						units: "meters",
					}).geometry.coordinates,
					deltaY,
					targetBearing + 180,
					{ units: "meters" },
				).geometry.coordinates;

				targetPos.copy(lngLatAltToVector(targetPoint));
				direction.copy(targetPos.sub(currentPos));

				this.raycaster.set(currentPos, targetPos);

				const target = this.raycaster.intersectObject(globe)[0]?.point;

				if (target) {
					projections.push([currentPos.clone(), target]);
				}
			}
		}

		return projections;
	}
}
