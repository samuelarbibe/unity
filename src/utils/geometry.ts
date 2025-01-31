import * as turf from "@turf/turf";
import { Feature, FeatureCollection, Polygon } from "geojson";

export function mergePolygons(
  featureCollection: FeatureCollection<Polygon>,
  buffer: number
) {
  return featureCollection.features.reduce((acc, curr) => {
    const feature = turf.buffer(curr, buffer);
    const unifiedFeature =
      feature && turf.union(turf.featureCollection([acc, feature]));

    if (
      !feature ||
      !unifiedFeature ||
      turf.getType(unifiedFeature) !== "Polygon"
    ) {
      throw new Error(
        "Invalid geometry type: all polygons must be contiguous."
      );
    }
    return unifiedFeature as Feature<Polygon>;
  });
}
