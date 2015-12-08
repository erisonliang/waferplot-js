var iwidth = 800, iheight = 600;
var camera = new THREE.PerspectiveCamera( 75, iwidth/iheight, 0.1, 1000 );

var cameraOrtho = new THREE.OrthographicCamera( - iwidth / 2, iwidth / 2, iheight / 2, - iheight / 2, -10, 10 );
cameraOrtho.position.z = 10;

var renderer = new THREE.WebGLRenderer({antialias: true, sortObjects: false});
renderer.setSize(iwidth, iheight);
renderer.setClearColor(0xffffff);
renderer.autoClear = false; // To allow render overlay on top of sprited sphere

var container = document.getElementById("three-js");
container.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );

var color_level = [];
color_level[6] = [0x1a9850, 0x91cf60, 0xd9ef8b, 0xfee08b, 0xfc8d59, 0xd73027];
color_level[7] = [0x1a9850, 0x91cf60, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfc8d59, 0xd73027];
color_level[8] = [0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xfee08b, 0xfdae61, 0xf46d43 ,0xd73027];
color_level[9] = [0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfdae61, 0xf46d43 ,0xd73027];
color_level[10] = [0x006837, 0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xfee08b, 0xfdae61, 0xf46d43, 0xd73027, 0xa50026];
color_level[11] = [0x006837, 0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfdae61, 0xf46d43, 0xd73027, 0xa50026];
var get_colormap = function(n) { return color_level[n < 6 ? 6 : (n < 11 ? n: 11)]; }

var gen_carrier_geometry = function(plot, height) {
	var Nx = plot.Nx, Ny = plot.Ny;
	var xygen = plot.xygen, zfun = plot.zfun;
	var bo_z = function() { return height; };
	var carrier = new THREE.Geometry();
	var i = 0, j = 0;
	for (/**/; j <= Ny; j++) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (j = Ny, i++; i <= Nx; i++) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (i = Nx, j--; j >= 0; j--) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (j = 0, i--; i >= 0; i--) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	var icenter = carrier.vertices.push(xygen(Nx/2, Ny/2, bo_z)) - 1;
	for (var i = 0; i < 2*(Nx + Ny); i++) {
		var a = 2*i, b = 2*i + 1;
		var c = 2*i + 2, d = 2*i + 3;
		carrier.faces.push(new THREE.Face3(a, c, b), new THREE.Face3(b, c, d));
		carrier.faces.push(new THREE.Face3(b, d, icenter));
	}

	return carrier;
};

var rgba_string = function(n) {
	var b = n % 256;
	n = (n - b) / 256;
	var g = n % 256;
	n = (n - g) / 256;
	return 'rgba(' + String(n) + ',' + String(g) + ',' + String(b) + ',256)';
}

var create_legend_texture = function(zlevels, legend_prec) {
    var width = 512, height = 512;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');
    context.font = "14px Arial";
    context.fillStyle = "#000";

	var text_width = 0;
	for (var i = 0; i < zlevels.length; i++) {
		var metrics = context.measureText(zlevels[i].toPrecision(legend_prec));
		text_width = (metrics.width > text_width ? metrics.width : text_width);
	}
    var text_height = 14;
	var th_spacing = text_height;
	var text_yoffs = text_height / 3;
	var canvas_y = function(i) { return height - 4 - i * (text_height + th_spacing) - text_yoffs; };

	var colormap = get_colormap(zlevels.length - 1);

	var ww = text_height + th_spacing, hh = text_height;
    for (var i = 0; i < zlevels.length; i++) {
		var y1 = canvas_y(i), y2 = canvas_y(i + 1);
		var x0 = 4, x1 = x0 + text_width + 12, x2 = x1 + ww;

		context.fillStyle = '#000';
		context.fillText(zlevels[i].toPrecision(legend_prec), x0, y1 + text_yoffs);

		context.beginPath();
		context.moveTo(x1 - 4, y1);
		context.lineTo(x2, y1);
		context.stroke();

		if (i + 1 < zlevels.length) {
			context.fillStyle = rgba_string(colormap[i]);
			context.fillRect(x1, y1, ww, y2 - y1);

			context.fillStyle = '#000';
			context.moveTo(x2, y1);
			context.lineTo(x2, y2);
			context.moveTo(x1, y1);
			context.lineTo(x1, y2);
			context.stroke();
		}
    }

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return {texture: texture, width: text_width + 12 + ww, height: (text_height + th_spacing) * zlevels.length};
};

var add_geometry_to_scene = function(plot, scene, geometry, color) {
	var material = new THREE.MeshLambertMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var mesh = new THREE.Mesh( geometry, material );
	mesh.matrix.copy(plot.norm_matrix);
	mesh.matrixAutoUpdate = false;
	scene.add(mesh);
};

var add_pointlight = function(scene, color, pos) {
	var pointLight = new THREE.SpotLight(color);
	pointLight.position.copy(pos);
	scene.add(pointLight);
};

var create_points = function(dataset, norm_matrix, color, zselect) {
	var points_geo = new THREE.Geometry();
	for (var i = 1; i <= dataset.rows(); i++) {
		points_geo.vertices.push(zselect(i));
	}
	var points_mat = new THREE.PointsMaterial({color: color, size: 3, sizeAttenuation: false});
	var points = new THREE.Points(points_geo, points_mat);
	points.matrix.copy(norm_matrix);
	points.matrixAutoUpdate = false;
	return points;
};

var zselect_dataset = function(dataset, column) {
	return function(i) {
		var x = dataset.e(i, column.x), y = dataset.e(i, column.y), z = dataset.e(i, column.z);
		return new THREE.Vector3(x, y, z);
	};
};

var zselect_proj = function(dataset, column, zfun) {
	return function(i) {
		var x = dataset.e(i, column.x), y = dataset.e(i, column.y);
		return new THREE.Vector3(x, y, zfun(x, y));
	};
};

var plot3d_legend_scene = function(plot, width, height) {
	var sceneOrtho = new THREE.Scene();
	var legend = create_legend_texture(plot.zlevels, plot.legend_prec);
	var material = new THREE.SpriteMaterial({map: legend.texture});
	var sprite = new THREE.Sprite(material);
	sprite.scale.set(material.map.image.width, material.map.image.height, 1);
	sprite.position.set(width / 2 + material.map.image.width / 2 - legend.width - 20, material.map.image.height / 2 - legend.height / 2, 0);
	sceneOrtho.add(sprite);
	return sceneOrtho;
};

var plot3d_compute_normals = function(geometry, normal_fun) {
	var normals = [];
	for (var v = 0; v < geometry.vertices.length; v++) {
		var vert = geometry.vertices[v];
		normals[v] = normal_fun(vert.x, vert.y);
	}
	for (var f = 0; f < geometry.faces.length; f++) {
		var face = geometry.faces[f];
		var vertex_normals = face.vertexNormals;
		vertex_normals[0] = normals[face.a].clone();
		vertex_normals[1] = normals[face.b].clone();
		vertex_normals[2] = normals[face.c].clone();

		var va = geometry.vertices[face.a];
		var vb = geometry.vertices[face.b];
		var vc = geometry.vertices[face.c];
		var xcent = (va.x + vb.x + vc.x) / 3, ycent = (va.y + vb.y + vc.y) / 3;

		face.normal.copy(normal_fun(xcent, ycent));
	}
	geometry.normalsNeedUpdate = true;
};

var new_plot3d_scene = function(plot) {
	var scene = new THREE.Scene();

	var zmin = plot.zlevels[0], zmax = plot.zlevels[plot.zlevels.length - 1];

	if (plot.dataset) {
		var points = create_points(plot.dataset, plot.norm_matrix, 0x8888ff, zselect_dataset(plot.dataset, plot.plotting_columns));
		scene.add(points);

		var proj = create_points(plot.dataset, plot.norm_matrix, 0x000000, zselect_proj(plot.dataset, plot.plotting_columns, plot.zfun));
		scene.add(proj);
	}

	var carrier = gen_carrier_geometry(plot, zmin - (zmax - zmin) / 3);
	carrier.computeFaceNormals();
	carrier.computeVertexNormals();
	add_geometry_to_scene(plot, scene, carrier, 0xbbbbbb);

	var zlevels = plot.zlevels;
	var grid = new CONTOUR.Grid(plot.Nx, plot.Ny, plot.xygen, plot.zfun);
	grid.prepare(zlevels);
	for (var i = 0; i < zlevels.length; i++) {
		grid.cut_zlevel(zlevels[i], zlevels);
	}

	var colormap = get_colormap(zlevels.length - 1);
	for (var i = 0; i < zlevels.length - 1; i++) {
		var geometry = grid.select_zlevel(zlevels[i], zlevels[i+1], zlevels);
		plot3d_compute_normals(geometry, plot.normal_fun);
		add_geometry_to_scene(plot, scene, geometry, colormap[i]);
	}

	add_pointlight(scene, 0x888888, new THREE.Vector3(1, 3, 5));
	add_pointlight(scene, 0x888888, new THREE.Vector3(-1, -3, 5));
	scene.add(new THREE.AmbientLight(0x333333));
	return scene;
};

var CAMERA_DIST = 2.0, CAMERA_ANGLE = 30 * Math.PI / 180;
var point_camera = function(scene) {
	camera.position.x = 0;
	camera.position.y = - CAMERA_DIST * Math.cos(CAMERA_ANGLE);
	camera.position.z = + CAMERA_DIST * Math.sin(CAMERA_ANGLE);
	camera.lookAt(scene.position);
};

var new_plot = function(zfun, normal_fun, dataset, plotting_columns) {
	var Nx = 80, Ny = 80, Dx = 5, Dy = 5;

	var xyeval = function(i, j, action) {
		var x = -150 + 300 * i / Nx, y = -150 + 300 * j / Ny;
		var phi = Math.atan2(y, x);
		var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
		return action(x * cosphi, y * cosphi);
    }

	var zmin, zmax;
	for (var i = 0; i <= Nx; i++) {
		for (var j = 0; j <= Ny; j++) {
			var z = xyeval(i, j, zfun);
			zmin = (zmin && zmin <= z) ? zmin : z;
			zmax = (zmax && zmax >= z) ? zmax : z;
		}
	}

	var ZLEVEL_NUMBER = 11;
	var zunits = MYAPP.scale_units(zmin, zmax, ZLEVEL_NUMBER);
	var zdiv = zunits.div;
	var zindex1 = Math.floor(zmin / zdiv), zindex2 = Math.ceil(zmax / zdiv);
	if (zindex2 <= zindex1) zindex2 = zindex1 + 1;
	var zrange = (zindex2 - zindex1) * zdiv;

	var zlevels = [];
	for (var zi = zindex1; zi <= zindex2; zi++) { zlevels.push(zi * zdiv); }

	var xygen = function(i, j, zfun) {
		return xyeval(i, j, function(x, y) { return new THREE.Vector3(x, y, zfun(x, y)); });
	};

	var offset = new THREE.Matrix4().setPosition(new THREE.Vector3(0, 0, -zmin));
	var Z_SHRINK_FACTOR = 3;
	var mat = new THREE.Matrix4().makeScale(1/150, 1/150, 1/(Z_SHRINK_FACTOR * zrange)).multiply(offset);

	var plot = {
		Nx: Nx,
		Ny: Ny,
		xygen: xygen,
		zfun: zfun,
		normal_fun: normal_fun,
		zlevels: zlevels,
		dataset: dataset,
		plotting_columns: plotting_columns,
		norm_matrix: mat,
		legend_prec: zunits.digits,
	};

	return plot;
};

MYAPP.load_wafer_function = function(zfun, normal_fun, dataset, plotting_columns) {
	var plot = new_plot(zfun, normal_fun, dataset, plotting_columns);
	MYAPP.scene = new_plot3d_scene(plot);
	MYAPP.sceneHUD = plot3d_legend_scene(plot, iwidth, iheight);
	render();
};

var zfun0 = function(x, y) { return 0; };
var normal_fun0 = function(x, y) {return new THREE.Vector3(0, 0, 1); };
var plot_example = new_plot(zfun0, normal_fun0);
MYAPP.scene = new_plot3d_scene(plot_example);

point_camera(MYAPP.scene);

var render = function() {
	renderer.clear();
	renderer.render(MYAPP.scene, camera);
	renderer.clearDepth();
	if (MYAPP.sceneHUD) {
		renderer.render(MYAPP.sceneHUD, cameraOrtho);
	}
};

controls.addEventListener('change', render);

var animate = function() {
	requestAnimationFrame(animate);
	controls.update();
}

render();
animate();
