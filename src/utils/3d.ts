import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { getVectorsFromCoordinates } from "./vectors";
import { lngLatAltToVector } from "./conversions";
import { METERS_PER_UNIT } from "./consts";
import { LineString, MultiLineString, Point, Polygon } from "geojson";

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
  slerpDistance?: number
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
  slerpDistance?: number
) {
  const points: Vector3[] = [];

  multiLineString.coordinates.forEach((coordinates) => {
    const vectors = getVectorsFromCoordinates(coordinates, {
      stitchVectors: true,
      slerpDistance,
    });
    points.push(...vectors);
  });

  const geometry = new BufferGeometry().setFromPoints(points);

  const material = new LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
  });

  return new LineSegments(geometry, material);
}

export function get3DObjectFromPolygon(polygon: Polygon) {
  return polygon.coordinates.map((coordinates) => {
    const points = coordinates.map((position) => lngLatAltToVector(position));

    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color: 0x0000ff });

    return new Line(geometry, material);
  });
}

export function getPointOnLine(
  line: Line,
  index: number,
  result: Vector3 = new Vector3()
) {
  const dimensions = 3;
  const points = Array.from(
    line.geometry.attributes.position.array.slice(
      dimensions * index,
      dimensions * index + dimensions
    )
  );

  result.set(points[0], points[1], points[2]);

  return result;
}
