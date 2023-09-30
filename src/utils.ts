import * as turf from '@turf/turf'
import { Ellipsoid } from '@math.gl/geospatial';
import earcut from 'earcut'
import { BufferGeometry, Line, LineBasicMaterial, LineSegments, Mesh, Object3D, Raycaster, Vector3 } from 'three'
import { toRadians } from '@math.gl/core';

export const METERS_PER_KM = 1000
export const METERS_PER_UNIT = 100_000

type FrustumFrame = {
  topRight: Vector3
  bottomRight: Vector3
  topLeft: Vector3
  bottomLeft: Vector3
}

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

export function lngLatAltToVector([lng = 0, lat = 0, alt = 0]: turf.Position) {
  return new Vector3(...Ellipsoid.WGS84.cartographicToCartesian([lng, lat, alt])).divideScalar(METERS_PER_UNIT)
}

function slerpVectors(from: Vector3, to: Vector3, factor: number) {
  const vectorA = from.clone().normalize();
  const vectorB = to.clone().normalize();

  // Calculate the angle between the vectors
  const dot = vectorA.dot(vectorB);
  const theta = Math.acos(Math.min(1, Math.max(-1, dot)));

  // Determine the length of the interpolated vector
  const lengthFrom = from.length();
  const lengthTo = to.length();
  const interpolatedLength = lengthFrom + (lengthTo - lengthFrom) * factor;

  // Perform Slerp
  const interpolatedVector = new Vector3();
  interpolatedVector.copy(vectorA).multiplyScalar(Math.sin((1 - factor) * theta));
  const tempVector = vectorB.clone().multiplyScalar(Math.sin(factor * theta));
  interpolatedVector.add(tempVector);

  // Set the length of the interpolated vector
  interpolatedVector.normalize().multiplyScalar(interpolatedLength);

  return interpolatedVector
}

function getSlerpedVectors(from: Vector3, to: Vector3, slerpDistance: number = Infinity) {
  const distance = from.distanceTo(to) * METERS_PER_UNIT

  const slerpStep = slerpDistance / distance

  const result: Vector3[] = []

  result.push(from)

  for (let factor = slerpStep; factor < 1; factor += slerpStep) {
    const slerpedVector = slerpVectors(from, to, factor)
    result.push(slerpedVector)
  }

  result.push(to)

  return result
}

function getStitchedVectors(vectors: Vector3[]) {
  const result: Vector3[] = []
  for (let i = 0; i < vectors.length - 1; i++) {
    result.push(vectors[i], vectors[i + 1])
  }

  return result
}

// export function createEarthMesh(gap: number) {
//   const lineStrings = []
//   for (let i = -180; i < 180; i += gap) {
//     const lngLineString = []
//     for (let j = -90; j <= 90; j += gap) {
//       lngLineString.push([i, j])
//     }
//     lineStrings.push(lngLineString)
//   }

//   for (let j = -90 + gap; j < 90; j += gap) {
//     const latLineString = []
//     for (let i = -180; i <= 180; i += gap) {
//       latLineString.push([i, j])
//     }
//     lineStrings.push(latLineString)
//   }

//   return turf.multiLineString(lineStrings)
// }

function getVectorsFromCoordinates(
  coordinates: turf.Position[],
  options: {
    slerpDistance?: number,
    stitchVectors?: boolean
  } = {}
) {
  const result: Vector3[] = []

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

export function getPointOnLine(line: Line, index: number) {
  const dimensions = 3
  const points = Array.from(line.geometry.attributes.position.array.slice(dimensions * index, dimensions * index + dimensions))

  return new Vector3(...points)
}

// alpha: vertical opening
// beta: horizontal opening
export function createFrustumFrame(from: Vector3, to: Vector3, alpha: number, beta: number): FrustumFrame {
  const yAxis = new Vector3(...Ellipsoid.WGS84.geodeticSurfaceNormal(from.toArray())).normalize()
  const center = to.clone().sub(from).normalize()

  const zAxis = center.clone().cross(yAxis).normalize()

  const topRight = center.clone().applyAxisAngle(zAxis, toRadians(alpha)).applyAxisAngle(yAxis, toRadians(beta)).normalize()
  const bottomRight = center.clone().applyAxisAngle(zAxis, toRadians(-alpha)).applyAxisAngle(yAxis, toRadians(beta)).normalize()
  const topLeft = center.clone().applyAxisAngle(zAxis, toRadians(alpha)).applyAxisAngle(yAxis, toRadians(-beta)).normalize()
  const bottomLeft = center.clone().applyAxisAngle(zAxis, toRadians(-alpha)).applyAxisAngle(yAxis, toRadians(-beta)).normalize()

  return {
    topRight,
    bottomRight,
    topLeft,
    bottomLeft,
  }
}

export function get3DObjectFromFrustumFrame(from: Vector3, frustumFrame: FrustumFrame) {
  const material = new LineBasicMaterial({
    color: 0xff0000
  });

  const geometry = new BufferGeometry().setFromPoints([
    from, from.clone().add(frustumFrame.topRight),
    from, from.clone().add(frustumFrame.bottomRight),
    from, from.clone().add(frustumFrame.topLeft),
    from, from.clone().add(frustumFrame.bottomLeft),
  ]);

  return new LineSegments(geometry, material);
}

export function get3DObjectFromFrustumIntersection(from: Vector3, frustumFrame: FrustumFrame, object: Object3D) {
  const topRightRaycaster = new Raycaster(from, frustumFrame.topRight.clone().normalize())
  const bottomRightRaycaster = new Raycaster(from, frustumFrame.bottomRight.clone().normalize())
  const topLeftRaycaster = new Raycaster(from, frustumFrame.topLeft.clone().normalize())
  const bottomLeftRaycaster = new Raycaster(from, frustumFrame.bottomLeft.clone().normalize())

  const topRightIntersect = topRightRaycaster.intersectObject(object)
  const bottomRightIntersect = bottomRightRaycaster.intersectObject(object)
  const topLeftIntersect = topLeftRaycaster.intersectObject(object)
  const bottomLeftIntersect = bottomLeftRaycaster.intersectObject(object)

  let geometry

  if (!topRightIntersect.length || !bottomLeftIntersect.length || !topRightIntersect.length || !bottomLeftIntersect.length) {
    geometry = new BufferGeometry()
  } else {
    geometry = new BufferGeometry().setFromPoints([
      topRightIntersect[0].point,
      bottomRightIntersect[0].point,
      bottomLeftIntersect[0].point,
      topLeftIntersect[0].point,
      topRightIntersect[0].point,
    ]);
  }
  const material = new LineBasicMaterial({ color: 0xff0000 });

  return new Line(geometry, material);
}
