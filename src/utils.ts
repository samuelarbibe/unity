import earcut from 'earcut'
import * as turf from '@turf/turf'
import { toRadians } from '@math.gl/core';
import { Ellipsoid } from '@math.gl/geospatial';
import { BufferGeometry, Line, LineBasicMaterial, LineSegments, Mesh, Object3D, Raycaster, Vector3 } from 'three'

export const METERS_PER_KM = 1000
export const METERS_PER_UNIT = 100_000

export function mergePolygons(featureCollection: turf.FeatureCollection<turf.Polygon>, buffer: number) {
  return featureCollection.features
    .reduce((acc, curr) => {
      const unifiedFeature = turf.union(acc, turf.buffer(curr, buffer))

      if (!unifiedFeature || (turf.getType(unifiedFeature) !== 'Polygon')) {
        throw new Error('Invalid geometry type: all polygons must be contiguous.')
      }
      return unifiedFeature as turf.Feature<turf.Polygon>
    })
}

export function lngLatAltToVector([lng = 0, lat = 0, alt = 0]: turf.Position, result: Vector3 = new Vector3()) {
  const position = Ellipsoid.WGS84.cartographicToCartesian([lng, lat, alt])
  result.set(position[0], position[1], position[2]).divideScalar(METERS_PER_UNIT)

  return result
}

function slerpVectors(from: Vector3, to: Vector3, factor: number, result: Vector3 = new Vector3()) {
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

  return result
}

function getSlerpedVectors(from: Vector3, to: Vector3, slerpDistance: number = Infinity, result: Vector3[] = []) {
  const distance = from.distanceTo(to) * METERS_PER_UNIT

  const slerpStep = slerpDistance / distance

  result.push(from)

  for (let factor = slerpStep; factor < 1; factor += slerpStep) {
    const slerpedVector = slerpVectors(from, to, factor)
    result.push(slerpedVector)
  }

  result.push(to)

  return result
}

function getStitchedVectors(vectors: Vector3[], result: Vector3[] = []) {
  for (let i = 0; i < vectors.length - 1; i++) {
    result.push(vectors[i], vectors[i + 1])
  }

  return result
}

function getVectorsFromCoordinates(
  coordinates: turf.Position[],
  options: {
    slerpDistance?: number,
    stitchVectors?: boolean
  } = {},
  result: Vector3[] = []
) {
  for (let i = 0; i < coordinates.length - 1; i++) {
    const from = lngLatAltToVector(coordinates[i])
    const to = lngLatAltToVector(coordinates[i + 1])

    const slerpedVectors = getSlerpedVectors(from, to, options.slerpDistance)
    if (options.stitchVectors) {
      result.push(...getStitchedVectors(slerpedVectors))
    } else {
      result.push(...slerpedVectors)
    }
  }

  return result
}

export function get3DObjectFromLineString(lineString: turf.Feature<turf.LineString>, slerpDistance?: number) {
  const vectors = getVectorsFromCoordinates(lineString.geometry.coordinates, { slerpDistance })
  const geometry = new BufferGeometry().setFromPoints(vectors)

  const material = new LineBasicMaterial({
    color: 0x00ff00,
  });

  return new Line(geometry, material);
}

export function get3DObjectFromMultiLineString(multiLineString: turf.MultiLineString, slerpDistance?: number) {
  const points: Vector3[] = []

  multiLineString.coordinates.forEach((coordinates) => {
    const vectors = getVectorsFromCoordinates(coordinates, { stitchVectors: true, slerpDistance })
    points.push(...vectors)
  })

  const geometry = new BufferGeometry().setFromPoints(points)

  const material = new LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2
  });

  return new LineSegments(geometry, material);
}

export function get3DObjectFromPolygon(polygon: turf.Polygon, fill: boolean = false) {
  const points = polygon.coordinates[0].map((position) => lngLatAltToVector(position))

  if (fill) {
    const { vertices, holes, dimensions } = earcut.flatten(polygon.coordinates)
    const triangles = earcut(vertices, holes, dimensions)

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

export function getPointOnLine(line: Line, index: number, result: Vector3 = new Vector3()) {
  const dimensions = 3
  const points = Array.from(line.geometry.attributes.position.array.slice(dimensions * index, dimensions * index + dimensions))

  result.set(points[0], points[1], points[2])

  return result
}

export function getFrustumNormal(
  from: Vector3,
  movingDirection: Vector3,
  verticalAngle: number = 90,
  horizontalAngle: number = 0
) {
  const up = new Vector3(...Ellipsoid.WGS84.geodeticSurfaceNormal(from.toArray())).normalize()

  const xAxis = movingDirection
  const zAxis = xAxis.clone().cross(up)
  const yAxis = zAxis.clone().cross(xAxis)

  const frustumNormal = xAxis.clone()

  frustumNormal
    .applyAxisAngle(zAxis, toRadians(-verticalAngle))
    .applyAxisAngle(yAxis, toRadians(-horizontalAngle))
    .normalize()

  return frustumNormal
}

export function createFrustumFrame(from: Vector3, to: Vector3, alpha: number, beta: number) {
  const up = new Vector3(...Ellipsoid.WGS84.geodeticSurfaceNormal(from.toArray())).normalize()

  const xAxis = to.clone().sub(from).normalize()
  const zAxis = xAxis.clone().cross(up).normalize().negate()
  const yAxis = xAxis.clone().cross(zAxis).normalize()

  const topRight = xAxis.clone().applyAxisAngle(yAxis, toRadians(alpha)).applyAxisAngle(zAxis, toRadians(beta)).normalize()
  const bottomRight = xAxis.clone().applyAxisAngle(yAxis, toRadians(-alpha)).applyAxisAngle(zAxis, toRadians(beta)).normalize()
  const topLeft = xAxis.clone().applyAxisAngle(yAxis, toRadians(alpha)).applyAxisAngle(zAxis, toRadians(-beta)).normalize()
  const bottomLeft = xAxis.clone().applyAxisAngle(yAxis, toRadians(-alpha)).applyAxisAngle(zAxis, toRadians(-beta)).normalize()

  return {
    topRight,
    bottomRight,
    topLeft,
    bottomLeft,
  }
}

export function getFrustumIntersection(
  from: Vector3,
  to: Vector3,
  alpha: number,
  beta: number,
  object: Object3D,
  intersectionPoints: Vector3[] = []
) {
  const raycaster = new Raycaster()
  const frustumFrame = createFrustumFrame(from, to, alpha, beta)

  raycaster.set(from, frustumFrame.topRight.clone().normalize())
  intersectionPoints.push(raycaster.intersectObject(object)[0]?.point)
  raycaster.set(from, frustumFrame.bottomRight.clone().normalize())
  intersectionPoints.push(raycaster.intersectObject(object)[0]?.point)
  raycaster.set(from, frustumFrame.bottomLeft.clone().normalize())
  intersectionPoints.push(raycaster.intersectObject(object)[0]?.point)
  raycaster.set(from, frustumFrame.topLeft.clone().normalize())
  intersectionPoints.push(raycaster.intersectObject(object)[0]?.point)

  return intersectionPoints.filter(Boolean)
}
