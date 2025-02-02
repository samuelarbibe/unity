import { bearing, destination } from "@turf/turf";
import type { LineString, Position } from "geojson";
import { lngLatAltToVector, vectorToLngLatAlt } from "../utils/conversions";
import { getVectorsFromCoordinates } from "../utils/vectors";
import { Sensor } from "./sensor";
import { type Object3D, Vector3 } from "three";

export class NearFarSensor extends Sensor {
	constructor(
		private near: number,
		private far: number,
	) {
		super();
	}

	generateProjections(globe: Object3D, lane: LineString, samplingRate: number) {
		let currentBearing = 0;
		let currentPos = new Vector3();
		let lookDir = new Vector3();
		let horizontalPos: Position = [0, 0];
		let horizontalPosOnSurface = new Vector3();

		const projections: [Vector3, Vector3][] = [];

		const vectors = getVectorsFromCoordinates(lane.coordinates, {
			slerpDistance: samplingRate,
		});

		const lanePositions = vectors.map((vector) => vectorToLngLatAlt(vector));

		for (let i = 0; i < lanePositions.length; i++) {
			currentPos = vectors[i];
			const lanePosition = lanePositions[i];
			const nextLanePosition = lanePositions[i + 1];

			currentBearing = nextLanePosition
				? bearing(lanePosition, nextLanePosition)
				: currentBearing;

			for (let depth = this.near; depth <= this.far; depth += samplingRate) {
				horizontalPos = destination(
					lanePosition.slice(0, 2),
					depth,
					currentBearing + 90,
					{
						units: "meters",
					},
				).geometry.coordinates;

				horizontalPosOnSurface = lngLatAltToVector(
					horizontalPos,
					horizontalPosOnSurface,
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
