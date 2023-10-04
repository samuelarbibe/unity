# Unity - [demo](https://unity-eta.vercel.app/)
> Airborne sensor projection simulator

Unity is an Airborne/Satellite sensor projection simulator.  
It can be used to simulate the projected vieweing polygon on the surface of the earth, given a set of sensor paremeters.  

### How does it work?
Unity uses [Three.js](https://threejs.org/) to perform rendering and vector manipulation.  
For every given camera position, Unity "sends" an array of vectors to the surface of the earth, and creates a[Frustum](https://en.wikipedia.org/wiki/Frustum):  
![image](https://github.com/samuelarbibe/unity/assets/38098325/e7b147dd-d1bd-4c4e-bea3-ba60ccc763ad)  
This frsutum's vectors are then intersected with the earth's surface using Three.js' [Raycaster](https://threejs.org/docs/index.html?q=rayca#api/en/core/Raycaster) helper.

### Accuracy
Unity uses [math.gl](https://uber-web.github.io/math.gl/) to build a WGS84 compatible earth ellipsoid:  
![image](https://github.com/samuelarbibe/unity/assets/38098325/c7754968-ac35-4d98-a7a3-814e250551cd)  
And calculates according to the WGS84 geodetic coordinates (`[X, Y, Z]`)

#### Earth's surface resolution
The accuracy is also affected by the earth's surface resolution, that can be fine-tuned according to the need.  
<img width="872" alt="Screenshot 2023-10-04 at 21 30 37" src="https://github.com/samuelarbibe/unity/assets/38098325/ef949f29-6f3d-4f59-8d56-6a7dfaea0a3e">  
<img width="1077" alt="Screenshot 2023-10-04 at 21 30 24" src="https://github.com/samuelarbibe/unity/assets/38098325/3f15f267-8514-4cc3-a315-c3110ec76fff">

#### Sampling rate
The sampling rate can also be modified. For example:  
<img width="424" alt="Screenshot 2023-10-04 at 21 34 00" src="https://github.com/samuelarbibe/unity/assets/38098325/fe36e732-df1e-4701-a32a-c9176f4a9e82">  
<img width="425" alt="Screenshot 2023-10-04 at 21 34 07" src="https://github.com/samuelarbibe/unity/assets/38098325/c2e66454-5280-4a5c-a830-24b92e7ef7b5">  

#### accounting for path curvature
The given path, inputed as a GeoJSON LineString, is Spherically Linearly Interpolated ([SLERP](https://en.wikipedia.org/wiki/Slerp#:~:text=In%20computer%20graphics%2C%20Slerp%20is,purpose%20of%20animating%203D%20rotation.))  According to earth's curvature.  
This interpolation can be performed at a given rate.  
<img width="1082" alt="Screenshot 2023-10-04 at 21 11 34" src="https://github.com/samuelarbibe/unity/assets/38098325/18d065cc-ddc1-4e6c-86da-8fd0f5fb19aa">

