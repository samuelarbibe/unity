import "./style.css";
import { lineString } from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import lebanonDistricts from "../data/lebanon.ts";
import israelDistricts from "../data/israel.ts";
import { DEM } from "./dem.ts";
import { GlobeGeometry } from "./globe.ts";
import { Simulation } from "./simulation.ts";
import {
	get3DObjectFromLineString,
	get3DObjectFromPolygon,
} from "./utils/3d.ts";
import { METERS_PER_KM } from "./utils/consts.ts";
import { lngLatAltToVector } from "./utils/conversions.ts";
import { mergePolygons } from "./utils/geometry.ts";

import {
	acceleratedRaycast,
	computeBatchedBoundsTree,
	computeBoundsTree,
	disposeBatchedBoundsTree,
	disposeBoundsTree,
} from "three-mesh-bvh";
import { NearFarSensor } from "./sensors/near-far-sensor.ts";
import {
	BufferGeometry,
	Mesh,
	BatchedMesh,
	Object3D,
	Vector3,
	WebGLRenderer,
	Scene,
	PerspectiveCamera,
	MeshBasicMaterial,
	BackSide,
	AxesHelper,
} from "three";

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;

BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
BatchedMesh.prototype.raycast = acceleratedRaycast;

async function run() {
	Object3D.DEFAULT_UP = new Vector3(0, 0, 1);

	const canvas = document.querySelector<HTMLDivElement>("#app");
	const renderer = new WebGLRenderer();

	canvas?.appendChild(renderer.domElement);
	renderer.setSize(window.innerWidth, window.innerHeight);

	const scene = new Scene();

	// camera
	const camera = new PerspectiveCamera(
		70,
		window.innerWidth / window.innerHeight,
		0.1,
		100,
	);
	const cameraFocus = lngLatAltToVector([
		35.567258583714505, 34.09206402265245,
	]);
	const cameraPosition = lngLatAltToVector([
		35.567258583714505, 34.09206402265245, 100_000,
	]);

	camera.position.copy(cameraPosition);

	// controls
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.target.copy(cameraFocus);

	// lebanon
	const lebanonGeoJSON = mergePolygons(lebanonDistricts, 0.01);
	const lebanon = get3DObjectFromPolygon(lebanonGeoJSON.geometry);

	scene.add(...lebanon);

	// israel
	const israelGeoJSON = mergePolygons(israelDistricts, 0.01);
	const israel = get3DObjectFromPolygon(israelGeoJSON.geometry);

	scene.add(...israel);

	// globe
	const dem = new DEM();
	await dem.loadFromFile("DEM.tif");

	const globeGeometry = new GlobeGeometry(
		0.005,
		0.005,
		35.19229903037464,
		36.82531390730452,
		31.83453248177631,
		34.64095290704957,
		dem,
	);

	globeGeometry.computeBoundsTree();

	const globeMaterial = new MeshBasicMaterial({
		color: 0x333333,
		wireframe: true,
		wireframeLinewidth: 0.5,
		side: BackSide,
	});
	const globe = new Mesh(globeGeometry, globeMaterial);
	scene.add(globe);

	// axes
	const axesHelper = new AxesHelper(lngLatAltToVector([0, 0, 0]).x);
	scene.add(axesHelper);

	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.render(scene, camera);
	});

	// simulation 1
	const lane1 = lineString([
		[35.51095430508093, 33.673002063560915, 6000],
		[35.69351578066684, 34.07629374380497, 5000],
		[35.768496386711234, 34.057389853489184, 5000],
		[35.58593491112532, 33.66214920138623, 5000],
		[35.65765549082076, 33.64315339804318, 4000],
		[35.8402169664067, 34.027675220536295, 4000],
		[35.915197572451035, 33.99254450748603, 4000],
		[35.73263609686518, 33.64043936961592, 3000],
		[35.814136755608956, 33.62143877545209, 3000],
		[35.98691815214653, 33.96821473191116, 3000],
	]).geometry;

	const lane2 = lineString([
		[35.89286826006881, 34.22606422742426, 12000],
		[35.94436596761591, 34.31826944007152, 12000],
	]).geometry;
	const lane1Object = get3DObjectFromLineString(lane1, METERS_PER_KM * 1);
	const lane2Object = get3DObjectFromLineString(lane2, METERS_PER_KM * 1);
	scene.add(lane1Object);
	scene.add(lane2Object);

	const sensor1 = new NearFarSensor(-5 * METERS_PER_KM, 5 * METERS_PER_KM);

	const simulation1 = new Simulation(
		globe,
		sensor1,
		[lane1, lane2],
		0.5 * METERS_PER_KM,
	);
	simulation1.run(scene);
	//

	function animate() {
		requestAnimationFrame(animate);

		controls.update();

		renderer.render(scene, camera);
	}

	animate();
}

run();
