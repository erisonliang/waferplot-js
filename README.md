# Waferplot-js

A simple HTML application using the [three.js](http://threejs.org/) library to create a 3D plot of measurements made on a wafer surface.
The data can be plotted either as a 3D plot or as a contour plot.

It works by loading a measurement file in CSV format and plot any of the parameters versus the X and Ys.
In addition to plain csv in tabular form the application is able to load directly data coming from some well-known ellipsometers and reflectometers for the semiconductor industry.

The application uses the Thin Plate Spline algorithm as described in the Jarno Elonen's excellent article [Thin Plate Spline editor - an example program in C++](http://elonen.iki.fi/code/tpsdemo/index.html).
