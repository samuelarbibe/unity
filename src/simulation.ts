import { concave, featureCollection, point, polygon } from "@turf/turf";
import type { LineString, Position } from "geojson";
import type { Sensor } from "./sensors/sensor";
import { get3DObjectFromPolygon } from "./utils/3d";
import { vectorToLngLatAlt } from "./utils/conversions";
import type { Projection } from "./types";
import {
	type Scene,
	type Vector3,
	type Object3D,
	BufferGeometry,
	LineBasicMaterial,
	LineSegments,
	Points,
	PointsMaterial,
} from "three";

export class Simulation {
	constructor(
		private globe: Object3D,
		private sensor: Sensor,
		private lanes: LineString[],
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

	// @ts-expect-error unused func
	private drawProjections(scene: Scene, projections: Projection[]) {
		const projectionLinesPositions = projections.reduce<Vector3[]>(
			(acc, curr) => {
				acc.push(...curr);
				return acc;
			},
			[],
		);
		const projectionGeometry = new BufferGeometry().setFromPoints(
			projectionLinesPositions,
		);
		const projectionMaterial = new LineBasicMaterial({
			color: 0xff0000,
			linewidth: 0.01,
		});
		const projectionsObjects = new LineSegments(
			projectionGeometry,
			projectionMaterial,
		);
		scene.add(projectionsObjects);
	}

	// @ts-expect-error unused func
	private drawHitPoints(scene: Scene, projections: Projection[]) {
		const hitPositions = projections.map(([, hit]) => hit);
		const hitGeometry = new BufferGeometry().setFromPoints(hitPositions);
		const hitMaterial = new PointsMaterial({
			color: 0x00ff00,
			size: 0.001,
		});
		const hitObjects = new Points(hitGeometry, hitMaterial);
		scene.add(hitObjects);
	}

	private drawFootprint(scene: Scene, projections: Projection[]) {
		const hitPositions = projections.map(([, hit]) =>
			vectorToLngLatAlt(hit).slice(0, 2),
		);

		const footprint = this.generateFootprint(hitPositions);

		if (footprint) {
			const footprintObjects = footprint.features.flatMap((polygon) =>
				get3DObjectFromPolygon(polygon.geometry, 0xff0000),
			);
			scene.add(...footprintObjects);
		}
	}

	run(scene?: Scene) {
		const projections = this.lanes.flatMap((lane) =>
			this.sensor.generateProjections(this.globe, lane, this.samplingRate),
		);

		if (scene) {
			this.drawFootprint(scene, projections);
		}

		return projections;
	}
}
