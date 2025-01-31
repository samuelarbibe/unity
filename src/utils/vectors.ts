import type { Position } from "geojson";
import { Vector3 } from "three";
import { METERS_PER_UNIT } from "./consts";
import { lngLatAltToVector } from "./conversions";

export function getSlerpedVector(
	from: Vector3,
	to: Vector3,
	factor: number,
	result: Vector3 = new Vector3(),
) {
	const vectorA = from.clone().normalize();
	const vectorB = to.clone().normalize();

	const dot = vectorA.dot(vectorB);
	const theta = Math.acos(Math.min(1, Math.max(-1, dot)));

	const lengthFrom = from.length();
	const lengthTo = to.length();
	const interpolatedLength = lengthFrom + (lengthTo - lengthFrom) * factor;

	result.copy(vectorA).multiplyScalar(Math.sin((1 - factor) * theta));
	const tempVector = vectorB.clone().multiplyScalar(Math.sin(factor * theta));
	result.add(tempVector);

	result.normalize().multiplyScalar(interpolatedLength);

	return result;
}

export function getSlerpedVectors(
	from: Vector3,
	to: Vector3,
	slerpDistance: number = Number.POSITIVE_INFINITY,
	result: Vector3[] = [],
) {
	const distance = from.distanceTo(to) * METERS_PER_UNIT;

	const slerpStep = slerpDistance / distance;

	result.push(from);

	for (let factor = slerpStep; factor < 1; factor += slerpStep) {
		const slerpedVector = getSlerpedVector(from, to, factor);
		result.push(slerpedVector);
	}

	result.push(to);

	return result;
}

export function getStitchedVectors(vectors: Vector3[], result: Vector3[] = []) {
	for (let i = 0; i < vectors.length - 1; i++) {
		result.push(vectors[i], vectors[i + 1]);
	}

	return result;
}

export function getVectorsFromCoordinates(
	coordinates: Position[],
	options: {
		slerpDistance?: number;
		stitchVectors?: boolean;
	} = {},
	result: Vector3[] = [],
) {
	for (let i = 0; i < coordinates.length - 1; i++) {
		const from = lngLatAltToVector(coordinates[i]);
		const to = lngLatAltToVector(coordinates[i + 1]);

		const slerpedVectors = getSlerpedVectors(from, to, options.slerpDistance);
		if (options.stitchVectors) {
			result.push(...getStitchedVectors(slerpedVectors));
		} else {
			result.push(...slerpedVectors);
		}
	}

	return result;
}
