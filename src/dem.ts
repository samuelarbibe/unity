import * as GeoTIFF from "geotiff";

export interface DEMData {
  matrix: number[][];
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
}

export class DEM {
  private matrix: number[][] | null = null;
  private originX: number | null = null;
  private originY: number | null = null;
  private scaleX: number | null = null;
  private scaleY: number | null = null;

  constructor() {}

  async loadFromFile(geoTiffPath: string) {
    const tiff = await GeoTIFF.fromUrl(geoTiffPath);
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
        const elevation = (raster[0] as GeoTIFF.TypedArray)[row * width + col];
        rowData.push(elevation);
      }
      matrix.push(rowData);
    }

    this.matrix = matrix;
  }

  load(data: DEMData) {
    this.matrix = data.matrix;
    this.originX = data.originX;
    this.originY = data.originY;
    this.scaleX = data.scaleX;
    this.scaleY = data.scaleY;
  }

  getMatrix() {
    return this.matrix;
  }

  downloadMatrixFile(fileName: string) {
    if (
      !this.matrix ||
      !this.scaleX ||
      !this.scaleY ||
      !this.originX ||
      !this.originY
    ) {
      throw new Error("DEM not loaded");
    }

    const data: DEMData = {
      matrix: this.matrix,
      originX: this.originX,
      originY: this.originY,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
    };
    const jsonString = JSON.stringify(data, null, 2);

    // Create a Blob object from the JSON string
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a hidden download link and trigger it
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName; // Name of the file to be downloaded
    document.body.appendChild(a); // Append to the DOM (optional, for some older browsers)
    a.click(); // Trigger the click to start the download
    a.remove(); // Clean up the link element
    URL.revokeObjectURL(url); // Free up the Blob URL
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
