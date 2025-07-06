import type { LineString } from "geojson";
import { type Object3D, Raycaster } from "three";
import type { Projection } from "../types";

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
