import { Ellipsoid } from "@math.gl/geospatial";
import type { Position } from "geojson";
import { Vector3 } from "three";
import { METERS_PER_UNIT } from "./consts";

export function lngLatAltToVector(
	[lng = 0, lat = 0, alt = 0]: Position,
	result: Vector3 = new Vector3(),
) {
	const position = Ellipsoid.WGS84.cartographicToCartesian([lng, lat, alt]);
	result
		.set(position[0], position[1], position[2])
		.divideScalar(METERS_PER_UNIT);

	return result;
}

export function vectorToLngLatAlt(
	vector: Vector3,
	result: Position = [0, 0, 0],
) {
	const position = Ellipsoid.WGS84.cartesianToCartographic([
		vector.x,
		vector.y,
		vector.z,
	]);
	result[0] = position[0];
	result[1] = position[1];
	result[2] = position[2];

	return result;
}
export function vectorOnGeodeticSurface(
	vector: Vector3,
	result: Vector3 = new Vector3(),
) {
	const position = Ellipsoid.WGS84.scaleToGeodeticSurface(vector.toArray());
	result
		.set(position[0], position[1], position[2])
		.divideScalar(METERS_PER_UNIT);

	return result;
}

export function geodeticSurfaceNormal(
	vector: Vector3,
	result: Vector3 = new Vector3(),
) {
	const normal = Ellipsoid.WGS84.geodeticSurfaceNormal(vector.toArray());
	result.set(normal[0], normal[1], normal[2]);

	return result;
}
