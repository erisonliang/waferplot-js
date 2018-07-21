/*
** Thin Plate Spline implementation.
** Copyright (C) 2015 Francesco Abbate. See Copyright Notice in waferplot.js
**
** Based on the Jarno Elonen's article:
** "Thin Plate Spline editor - an example program in C++""
** from: http://elonen.iki.fi/code/tpsdemo/index.html.
*/

var tps_radial = function(r) {
    return (r <= 0 ? 0 : r*r*Math.log(r));
};


var tps_radial_der = function(r) {
    return r*(1 + 2 * Math.log(r));
};

var mat_data = function(r, c) {
    var es = [];
    for (var i = 0; i < r; i++) {
        var row = [];
        for (var j = 0; j < c; j++) {
            row[j] = 0;
        }
        es[i] = row;
    }
    return es;
}

var tps_interpolation_fn = function(w, control_points, normalize) {
    return function(xr, yr) {
        var coord = normalize(xr, yr);
        var x = coord[0], y = coord[1];
        var N = control_points.rows();
        var h = w.e(N+1) + x * w.e(N+2) + y * w.e(N+3);
        for (var i = 1; i <= N; i++) {
            var xi = control_points.e(i, 1), yi = control_points.e(i, 2);
            var elen = Math.sqrt((xi - x)*(xi - x) + (yi - y)*(yi - y));
            h += w.e(i) * tps_radial(elen);
        }
        return h;
    };
};

var tps_interpolation_normal_fn = function(w, control_points, normalize) {
    return function(xr, yr) {
        var coord = normalize(xr, yr);
        var x = coord[0], y = coord[1];
        var N = control_points.rows();
        var dzdx = w.e(N+2), dzdy = w.e(N+3);
        for (var i = 1; i <= N; i++) {
            var xi = control_points.e(i, 1), yi = control_points.e(i, 2);
            var r = Math.sqrt((xi - x)*(xi - x) + (yi - y)*(yi - y));
            var dudr = tps_radial_der(r);
            if (r > 0) {
                dzdx += w.e(i) * dudr * (x - xi) / r;
                dzdy += w.e(i) * dudr * (y - yi) / r;
            }
        }
        var dcoord1 = normalize(1, 1), dcoord0 = normalize(0, 0);
        dzdx *= dcoord1[0] - dcoord0[0];
        dzdy *= dcoord1[1] - dcoord0[1];
        var nf = Math.sqrt(1 + dzdx*dzdx + dzdy*dzdy);
        return new THREE.Vector3(-dzdx / nf, -dzdy / nf, 1 / nf);
    };
};

var tps_fit = function(data, param) {
    var N = data.rows();

    var xindex = param.plotting_columns.x, yindex = param.plotting_columns.y;
    var zindex = param.plotting_columns.z;
    var cpdata = [];
    var norm = param.normalize;
    for (var i = 0; i < N; i++) {
        cpdata[i] = norm(data.e(i+1, xindex), data.e(i+1, yindex));
    }
    var control_points = Matrix.create(cpdata);

    var Ld = mat_data(N+3, N+3), Kd = mat_data(N, N);
    var Vd = [];
    var a = 0;
    for (var i = 0; i < N; i++) {
        for (var j = i+1; j < N; j++) {
            var xi = control_points.e(i+1, 1), yi = control_points.e(i+1, 2);
            var xj = control_points.e(j+1, 1), yj = control_points.e(j+1, 2);
            var elen = Math.sqrt((xi - xj)*(xi - xj) + (yi - yj)*(yi - yj));
            var Ueval = tps_radial(elen);
            Ld[i][j] = Ld[j][i] = Ueval;
            Kd[i][j] = Kd[j][i] = Ueval;
            a += elen * 2;
        }
    }
    a /= N*N;

    var regularization = param.regularization;
    for (var i = 0; i < N; i++) {
        Ld[i][i] = Kd[i][i] = regularization * (a*a);

        Ld[i][N+0] = 1;
        Ld[i][N+1] = control_points.e(i+1, 1);
        Ld[i][N+2] = control_points.e(i+1, 2);

        Ld[N+0][i] = 1;
        Ld[N+1][i] = control_points.e(i+1, 1);
        Ld[N+2][i] = control_points.e(i+1, 2);
    }

    for (var i = 0; i < N; i++) {
        Vd[i] = data.e(i+1, zindex);
    }
    Vd[N+0] = 0;
    Vd[N+1] = 0;
    Vd[N+2] = 0;

    var lld = lalolib.array2mat(Ld);
    var lvd = lalolib.array2vec(Vd);
    var w = Vector.create(lalolib.solve(lld, lvd));

    var fn = tps_interpolation_fn(w, control_points, norm);
    var normal_fn = tps_interpolation_normal_fn(w, control_points, norm);

    // Log the results of the fit. Only for debugging purpose.
    if (false) {
        var result = [];
        for (var i = 1; i <= N; i++) {
            var x = data.e(i, xindex), y = data.e(i, yindex);
            result[i-1] = [x, y, data.e(i, zindex), fn(x, y)];
        }
        console.log(Matrix.create(result).inspect());
    }
    return {eval: fn, eval_normal: normal_fn};
};

MYAPP.tps_fit = tps_fit;
