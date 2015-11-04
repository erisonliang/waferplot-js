var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var Nx = 50, Ny = 50;

var myfun = function(x, y) { return Math.exp(-10*(x*x+y*y)); };

var xygen = function(i, j) {
	var x = -1 + 2 * i / Nx, y = -1 + 2 * j / Ny;
	var phi = Math.atan2(y, x);
	var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
	return [x * cosphi, y * cosphi];
};

var geometry = new THREE.Geometry();
for (var i = 0; i <= Nx; i++) {
	for (var j = 0; j <= Ny; j++) {
		var xylist = xygen(i, j)
		var x = xylist[0], y = xylist[1];
		var z = myfun(x, y);
		geometry.vertices.push(new THREE.Vector3(x,y,z));
	}
}

var geti = function(i, j) { return (Ny + 1) * i + j; };

for (var i = 0; i < Nx; i++) {
	for (var j = 0; j < Ny; j++) {
		var i1 = geti(i, j), i2 = geti(i, j+1);
		var i3 = geti(i+1, j+1), i4 = geti(i+1, j);
		geometry.faces.push(new THREE.Face3(i1,i2,i4), new THREE.Face3(i2,i3,i4));
	}
}

var material = new THREE.MeshPhongMaterial( { color: 0x00ff00, specular: 0xffffff, shininess: 30, shading: THREE.FlatShading, side: THREE.DoubleSide } )
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

// create a point light
var pointLight = new THREE.PointLight(0xFFFFFF);

// set its position
pointLight.position.x = 1;
pointLight.position.y = 3;
pointLight.position.z = 10;

// add to the scene
scene.add(pointLight);

camera.position.z = 5;

var render = function () {
	requestAnimationFrame( render );

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render(scene, camera);
};

render();
