import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { lngLatAltToVector } from "./utils";

class GlobeGeometry extends BufferGeometry {
  constructor(
    lngStep = 10,
    latStep = 10,
    fromLng = -180,
    toLng = 180,
    fromLat = -90,
    toLat = 90,
  ) {

    super();

    this.type = 'GlobeGeometry';

    this.parameters = {
      lngStep,
      latStep,
      fromLng,
      toLng,
      fromLat,
      toLat,
    }

    let index = 0;
    const grid = [];

    const vertex = new Vector3();
    const normal = new Vector3();

    // buffers

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];

    // generate vertices, normals and uvs

    const heightSegments = (toLat - fromLat) / latStep
    const widthSegments = (toLng - fromLng) / lngStep

    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = [];

      const lat = fromLat + (iy * latStep)

      const v = iy / heightSegments;

      let uOffset = 0;

      for (let ix = 0; ix <= widthSegments; ix++) {
        const lng = fromLng + (ix * lngStep)

        const u = ix / widthSegments;

        // vertex

        const point = lngLatAltToVector([lng, lat])

        vertex.x = point.x
        vertex.y = point.y
        vertex.z = point.z

        vertices.push(vertex.x, vertex.y, vertex.z);

        // normal

        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);

        // uv

        uvs.push(u + uOffset, 1 - v);

        verticesRow.push(index++);

      }

      grid.push(verticesRow);

    }

    // indices

    for (let iy = 0; iy < heightSegments; iy++) {

      for (let ix = 0; ix < widthSegments; ix++) {

        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];

        if (iy !== 0) indices.push(a, b, d);
        if (iy !== heightSegments - 1) indices.push(b, c, d);
      }

    }

    // build geometry

    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }

  copy(source) {
    super.copy(source);

    this.parameters = Object.assign({}, source.parameters);

    return this;
  }

  static fromJSON(data) {
    return new GlobeGeometry(
      data.lngStep,
      data.latStep,
      data.fromLng,
      data.toLng,
      data.fromLat,
      data.toLat,
    );
  }
}

export { GlobeGeometry };