import { toRadians } from "@math.gl/core"
import { Ellipsoid } from "@math.gl/geospatial"
import { Object3D, Raycaster, Vector3 } from "three"

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
