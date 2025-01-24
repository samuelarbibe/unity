// @ts-nocheck

import * as GeoTIFF from "geotiff";

export class DEM {
  private matrix: number[][] | null = null;
  private originX: number | null = null;
  private originY: number | null = null;
  private scaleX: number | null = null;
  private scaleY: number | null = null;

  constructor(private geoTiffPath: string) {}

  async load() {
    const tiff = await GeoTIFF.fromUrl(this.geoTiffPath);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const tiePoints = image.getTiePoints();
    const pixelScale = image.getFileDirectory().ModelPixelScale;

    this.scaleX = pixelScale[0];
    this.scaleY = pixelScale[1];
    this.originX = tiePoints[0].x;
    this.originY = tiePoints[0].y;

    const matrix = [];

    const raster = await image.readRasters();

    // Loop through rows and columns to generate longitude, latitude, and elevation
    for (let row = 0; row < height; row++) {
      const rowData: number[] = [];
      for (let col = 0; col < width; col++) {
        const elevation = raster[0][row * width + col];
        rowData.push(elevation);
      }
      matrix.push(rowData);
    }

    this.matrix = matrix;
  }

  getHeightAt(lat: number, lng: number) {
    if (
      !this.matrix ||
      !this.scaleX ||
      !this.scaleY ||
      !this.originX ||
      !this.originY
    ) {
      throw new Error("DEM not loaded");
    }

    const x = Math.floor((lng - this.originX) / this.scaleX);
    const y = Math.floor((this.originY - lat) / this.scaleY);

    return this.matrix[y]?.[x] ?? 0;
  }
}
