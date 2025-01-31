import { concave, featureCollection, point, polygon } from "@turf/turf";
import type { Position } from "geojson";
import * as THREE from "three";
import type { Sensor } from "./sensors/sensor";
import { get3DObjectFromPolygon } from "./utils/3d";
import { vectorToLngLatAlt } from "./utils/conversions";

export class Simulation {
	constructor(
		private globe: THREE.Object3D,
		private sensor: Sensor,
		private samplingRate: number,
	) {}

	private generateFootprint(positions: Position[]) {
		const points = featureCollection(positions.map((pos) => point(pos)));

		const hull = concave(points, {
			maxEdge: this.samplingRate * 2,
			units: "meters",
		});

		console.log(hull);

		if (!hull) return null;

		if (hull.geometry.type === "Polygon") {
			return featureCollection([polygon(hull.geometry.coordinates)]);
		}

		return featureCollection(
			hull.geometry.coordinates.map((coords) => polygon(coords)),
		);
	}

	run(scene: THREE.Scene) {
		const projections = this.sensor.generateProjections(
			this.globe,
			this.samplingRate,
		);

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

		const footprint = this.generateFootprint(
			hitPositions.map((position) => vectorToLngLatAlt(position).slice(0, 2)),
		);

		console.log(footprint);

		if (footprint) {
			const footprintObjects = footprint.features.flatMap((polygon) =>
				get3DObjectFromPolygon(polygon.geometry, 0xff0000),
			);
			scene.add(...footprintObjects);
		}
	}
}
