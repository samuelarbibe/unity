import * as turf from '@turf/turf'

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