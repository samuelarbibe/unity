import { Raycaster, type Object3D } from "three";
import type { Projection } from "../types";
import type { LineString } from "geojson";

export abstract class Sensor {
	protected raycaster: Raycaster;

	constructor() {
		this.raycaster = new Raycaster();
	}

	abstract generateProjections(
		globe: Object3D,
		lane: LineString,
		samplingRate: number,
	): Projection[];
}
