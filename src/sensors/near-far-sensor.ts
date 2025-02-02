import { bearing, destination } from "@turf/turf";
import type { LineString, Position } from "geojson";
import * as THREE from "three";
import { lngLatAltToVector, vectorToLngLatAlt } from "../utils/conversions";
import { getVectorsFromCoordinates } from "../utils/vectors";
import { Sensor } from "./sensor";

export class NearFarSensor extends Sensor {
	constructor(
		private lane: LineString,
		private near: number,
		private far: number,
	) {
		super();
	}

	generateProjections(globe: THREE.Object3D, samplingRate: number) {
		let currentBearing = 0;
		let currentPos = new THREE.Vector3();
		let lookDir = new THREE.Vector3();
		let horizontalPos: Position = [0, 0];
		let horizontalPosOnSurface = new THREE.Vector3();

		const projections: [THREE.Vector3, THREE.Vector3][] = [];

		const vectors = getVectorsFromCoordinates(this.lane.coordinates, {
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
