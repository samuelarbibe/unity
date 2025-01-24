import { Ellipsoid } from "@math.gl/geospatial"
import { Vector3 } from "three"
import * as turf from "@turf/turf"
import { METERS_PER_UNIT } from "./consts"

export function lngLatAltToVector([lng = 0, lat = 0, alt = 0]: turf.Position, result: Vector3 = new Vector3()) {
  const position = Ellipsoid.WGS84.cartographicToCartesian([lng, lat, alt])
  result.set(position[0], position[1], position[2]).divideScalar(METERS_PER_UNIT)

  return result
}
