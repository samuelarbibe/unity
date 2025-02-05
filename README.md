# [Unity - Airborne Sensor Projection Simulator](https://unity-eta.vercel.app)

Unity is an airborne/satellite sensor projection simulator designed to model the projected viewing polygon on the Earth’s surface based on specified sensor parameters.  

## Features
-	**3D Visualization**: Utilizes Three.js for rendering and vector manipulation to represent the sensor’s field of view and footprint on the ground.
-	**Accurate Earth Representation**: Employs math.gl to construct a WGS84-compatible Earth ellipsoid, ensuring precise geodetic calculations.
-	**DEM**: Can receive a DEM in geotiff format to create more accurate predictions.
-	**Adjustable Sampling Rates**: Allows customization of Earth’s surface resolution and sampling rates to balance between accuracy and performance.
-	**Airborne Sensing Strategies**: Simulates multiple sensing strategies, like near-far, and elevation angle and [AOV](https://en.wikipedia.org/wiki/Angle_of_view_%28photography%29).
-	**Path Interpolation**: Accounts for Earth’s curvature by spherically linearly interpolating [SLERP](https://en.wikipedia.org/wiki/Slerp) input paths provided as GeoJSON LineStrings.

## How It Works
### 1. Earth Surface Generation
 Creates the earth's surface mesh for a specified bbox, based on a WGS84 ellipsoid + DEM.  
<img alt="Earth Surface" src="https://github.com/user-attachments/assets/98a805eb-7514-4929-8e2c-60f99d91748a" />  
<img alt="Screenshot 2025-02-05 at 15 49 09" src="https://github.com/user-attachments/assets/48bad10e-1292-47f5-aae7-2eb5ea81dca6" />  
### 2. Lane Interpolation
Interpolates the given geoJSON lanes using [SLERP](https://en.wikipedia.org/wiki/Slerp).  
<img alt="Lane Interpolation" src="https://github.com/user-attachments/assets/1d240345-a788-4c5d-922f-c789034ad999" />  
### 3. FOV Simulation
For a given sampling rate, and according to the configured sensor, Unity generates an array of vectors directed towards the Earth’s surface within the sensor's calculated FOV.  
<img alt="Screenshot 2025-02-05 at 15 53 00" src="https://github.com/user-attachments/assets/ee60581d-1d23-464d-aafb-397eb783ab51" />  
### 4. Footpring Calculation
using Three.js' [Raycaster](https://threejs.org/docs/#api/en/core/Raycaster), hit points are calculated on earth's surface mesh, and converted to cartographic coordinates.  
<img alt="Screenshot 2025-02-05 at 15 53 24" src="https://github.com/user-attachments/assets/22a16023-d49e-4fea-8527-9cb3fc3dbd08" />  
### 5. Footprint GeoJSON
Converts all the hit points into a single `FeatureCollection<Polygon>` that can be projected onto a map, using turf's [concave hull](https://turfjs.org/docs/api/concave).  
<img alt="Screenshot 2025-02-05 at 15 55 06" src="https://github.com/user-attachments/assets/4f800509-d610-47ef-855e-85b3a179995f" />  

## Accuracy Considerations
-	**Surface Resolution**: The simulator’s accuracy is influenced by the Earth’s surface resolution, which can be fine-tuned as needed.
-	**Sampling Rate**: The sampling rate is adjustable to balance between performance and precision.
