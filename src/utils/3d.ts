import type { LineString, MultiLineString, Point, Polygon } from "geojson";
import {
	BufferGeometry,
	type ColorRepresentation,
	Line,
	Line3,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	SphereGeometry,
	Vector3,
} from "three";
import { METERS_PER_UNIT } from "./consts";
import { lngLatAltToVector } from "./conversions";
import { getVectorsFromCoordinates } from "./vectors";

export function get3DObjectFromPoint(point: Point) {
	const vector = lngLatAltToVector(point.coordinates);
	const geometry = new SphereGeometry(100 / METERS_PER_UNIT);

	const material = new MeshBasicMaterial({
		color: 0xff0000,
	});

	const mesh = new Mesh(geometry, material);

	mesh.position.set(vector.x, vector.y, vector.z);

	return mesh;
}

export function get3DObjectFromLineString(
	lineString: LineString,
	slerpDistance?: number,
) {
	const vectors = getVectorsFromCoordinates(lineString.coordinates, {
		slerpDistance,
	});
	const geometry = new BufferGeometry().setFromPoints(vectors);

	const material = new LineBasicMaterial({
		color: 0x00ff00,
	});

	return new Line(geometry, material);
}

export function get3DObjectFromMultiLineString(
	multiLineString: MultiLineString,
	slerpDistance?: number,
) {
	const points: Vector3[] = [];

	for (const coordinates of multiLineString.coordinates) {
		const vectors = getVectorsFromCoordinates(coordinates, {
			stitchVectors: true,
			slerpDistance,
		});
		points.push(...vectors);
	}

	const geometry = new BufferGeometry().setFromPoints(points);

	const material = new LineBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.2,
	});

	return new LineSegments(geometry, material);
}

export function get3DObjectFromPolygon(
	polygon: Polygon,
	color: ColorRepresentation = 0x0000ff,
) {
	return polygon.coordinates.map((coordinates) => {
		const points = coordinates.map((position) => lngLatAltToVector(position));

		const geometry = new BufferGeometry().setFromPoints(points);
		const material = new LineBasicMaterial({ color });

		return new Line(geometry, material);
	});
}

export function getPointOnLine(
	line: Line,
	index: number,
	result: Vector3 = new Vector3(),
) {
	const dimensions = 3;
	const points = Array.from(
		line.geometry.attributes.position.array.slice(
			dimensions * index,
			dimensions * index + dimensions,
		),
	);

	result.set(points[0], points[1], points[2]);

	return result;
}

export function findClosestPointOnLine(line: Line, point: Vector3): Vector3 {
	const geometry = line.geometry as BufferGeometry;
	const positions = geometry.attributes.position;
	const count = positions.count;

	const closestPoint = new Vector3();
	let minDistanceSq = Number.POSITIVE_INFINITY;

	const a = new Vector3();
	const b = new Vector3();
	const tempClosest = new Vector3();

	for (let i = 0; i < count - 1; i++) {
		a.fromBufferAttribute(positions, i);
		b.fromBufferAttribute(positions, i + 1);

		const segment = new Line3(a, b);
		segment.closestPointToPoint(point, true, tempClosest);

		const distSq = tempClosest.distanceToSquared(point);
		if (distSq < minDistanceSq) {
			minDistanceSq = distSq;
			closestPoint.copy(tempClosest);
		}
	}

	return closestPoint;
}
