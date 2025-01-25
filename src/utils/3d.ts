import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Vector3,
} from "three";
import * as turf from "@turf/turf";
import * as earcut from "earcut";
import { getVectorsFromCoordinates } from "./vectors";
import { lngLatAltToVector } from "./conversions";

export function get3DObjectFromLineString(
  lineString: turf.LineString,
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
  multiLineString: turf.MultiLineString,
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

export function get3DObjectFromPolygon(
  polygon: turf.Polygon,
  fill: boolean = false
) {
  const points = polygon.coordinates[0].map((position) =>
    lngLatAltToVector(position)
  );

  if (fill) {
    const { vertices, holes, dimensions } = earcut.flatten(polygon.coordinates);
    const triangles = earcut(vertices, holes, dimensions);

    const geometry = new BufferGeometry().setFromPoints(points);
    geometry.setIndex(triangles);

    const material = new LineBasicMaterial({ color: 0x0000ff });

    return new Mesh(geometry, material);
  } else {
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color: 0x0000ff });

    return new Line(geometry, material);
  }
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
