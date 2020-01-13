// jshint -W097
// jshint undef: true, unused: true
/* globals require,document,__dirname,Float32Array,module*/

"use strict";

var fs = require("fs");
var glm = require("gl-matrix");
var webgl = require("./webgl.js");
var util = require("./util.js");
var rng = require("rng");

var NSTARS = 100000;

module.exports = function() {
  var self = this;

  self.initialize = function() {
    // Initialize the offscreen rendering canvas.
    self.canvas = document.createElement("canvas");

    // Initialize the gl context.
    self.gl = self.canvas.getContext("webgl");
    self.gl.enable(self.gl.BLEND);
    self.gl.blendFuncSeparate(
      self.gl.SRC_ALPHA,
      self.gl.ONE_MINUS_SRC_ALPHA,
      self.gl.ZERO,
      self.gl.ONE
    );

    // Load the programs.
    self.pNebula = util.loadProgram(
      self.gl,
      fs.readFileSync(__dirname + "/glsl/nebula.glsl", "utf8")
    );
    self.pPointStars = util.loadProgram(
      self.gl,
      fs.readFileSync(__dirname + "/glsl/point-stars.glsl", "utf8")
    );
    self.pStar = util.loadProgram(
      self.gl,
      fs.readFileSync(__dirname + "/glsl/star.glsl", "utf8")
    );
    self.pSun = util.loadProgram(
      self.gl,
      fs.readFileSync(__dirname + "/glsl/sun.glsl", "utf8")
    );

    // Create the point stars renderable.
    var rand = new rng.MT(hashcode("best seed ever") + 5000);
    var position = new Float32Array(18 * NSTARS);
    var color = new Float32Array(18 * NSTARS);
    for (var i = 0; i < NSTARS; i++) {
      var size = 0.05;
      var pos = glm.vec3.random(glm.vec3.create(), 1.0);
      var star = buildStar(size, pos, 128.0, rand);
      position.set(star.position, i * 18);
      color.set(star.color, i * 18);
    }
    var attribs = webgl.buildAttribs(self.gl, { aPosition: 3, aColor: 3 });
    attribs.aPosition.buffer.set(position);
    attribs.aColor.buffer.set(color);
    var count = position.length / 9;
    self.rPointStars = new webgl.Renderable(
      self.gl,
      self.pPointStars,
      attribs,
      count
    );

    // Create the nebula, sun, and star renderables.
    self.rNebula = buildBox(self.gl, self.pNebula);
    self.rSun = buildBox(self.gl, self.pSun);
    self.rStar = buildBox(self.gl, self.pStar);
  };

  self.render = function(params) {
    // We'll be returning a map of direction to texture.
    var textures = {};

    // Handle changes to resolution.
    self.canvas.width = self.canvas.height = params.resolution;
    self.gl.viewport(0, 0, params.resolution, params.resolution);

    // Initialize the point star parameters.
    var rand = new rng.MT(hashcode(params.seed) + 1000);
    var pStarParams = [];
    while (params.pointStars) {
      pStarParams.push({
        rotation: randomRotation(rand)
      });
      if (rand.random() < 0.2) {
        break;
      }
    }

    // Initialize the star parameters.
    var rand = new rng.MT(hashcode(params.seed) + 3000);
    var starParams = [];
    while (params.stars) {
      starParams.push({
        pos: randomVec3(rand),
        color: [1, 1, 1],
        size: 0.0,
        falloff: rand.random() * Math.pow(2, 20) + Math.pow(2, 20)
      });
      if (rand.random() < 0.01) {
        break;
      }
    }

    // Initialize the nebula parameters.
    var rand = new rng.MT(hashcode(params.seed) + 2000);
    var nebulaParams = [];
    while (params.nebulae) {
      nebulaParams.push({
        scale: rand.random() * 0.5 + 0.25,
        color: [rand.random(), rand.random(), rand.random()],
        intensity: rand.random() * 0.2 + 0.9,
        falloff: rand.random() * 3.0 + 3.0,
        offset: [
          rand.random() * 2000 - 1000,
          rand.random() * 2000 - 1000,
          rand.random() * 2000 - 1000
        ]
      });
      if (rand.random() < 0.5) {
        break;
      }
    }

    // Initialize the sun parameters.
    var rand = new rng.MT(hashcode(params.seed) + 4000);
    var sunParams = [];
    if (params.sun) {
      sunParams.push({
        pos: randomVec3(rand),
        color: [rand.random(), rand.random(), rand.random()],
        size: rand.random() * 0.0001 + 0.0001,
        falloff: rand.random() * 16.0 + 8.0
      });
    }

    // Create a list of directions we'll be iterating over.
    var dirs = {
      front: {
        target: [0, 0, -1],
        up: [0, 1, 0]
      },
      back: {
        target: [0, 0, 1],
        up: [0, 1, 0]
      },
      left: {
        target: [-1, 0, 0],
        up: [0, 1, 0]
      },
      right: {
        target: [1, 0, 0],
        up: [0, 1, 0]
      },
      top: {
        target: [0, 1, 0],
        up: [0, 0, 1]
      },
      bottom: {
        target: [0, -1, 0],
        up: [0, 0, -1]
      }
    };

    // Define and initialize the model, view, and projection matrices.
    var model = glm.mat4.create();
    var view = glm.mat4.create();
    var projection = glm.mat4.create();
    glm.mat4.perspective(projection, Math.PI / 2, 1.0, 0.1, 256);

    // Iterate over the directions to render and create the textures.
    var keys = Object.keys(dirs);
    for (var i = 0; i < keys.length; i++) {
      // Clear the context.
      self.gl.clearColor(0, 0, 0, 1);
      self.gl.clear(self.gl.COLOR_BUFFER_BIT);

      // Look in the direction for this texture.
      var dir = dirs[keys[i]];
      glm.mat4.lookAt(view, [0, 0, 0], dir.target, dir.up);

      // Render the point stars.
      self.pPointStars.use();
      model = glm.mat4.create();
      self.pPointStars.setUniform("uView", "Matrix4fv", false, view);
      self.pPointStars.setUniform(
        "uProjection",
        "Matrix4fv",
        false,
        projection
      );
      for (var j = 0; j < pStarParams.length; j++) {
        var ps = pStarParams[j];
        glm.mat4.mul(model, ps.rotation, model);
        self.pPointStars.setUniform("uModel", "Matrix4fv", false, model);
        self.rPointStars.render();
      }

      // Render the stars.
      self.pStar.use();
      self.pStar.setUniform("uView", "Matrix4fv", false, view);
      self.pStar.setUniform("uProjection", "Matrix4fv", false, projection);
      self.pStar.setUniform("uModel", "Matrix4fv", false, model);
      for (j = 0; j < starParams.length; j++) {
        var s = starParams[j];
        self.pStar.setUniform("uPosition", "3fv", s.pos);
        self.pStar.setUniform("uColor", "3fv", s.color);
        self.pStar.setUniform("uSize", "1f", s.size);
        self.pStar.setUniform("uFalloff", "1f", s.falloff);
        self.rStar.render();
      }

      // Render the nebulae.
      self.pNebula.use();
      model = glm.mat4.create();
      for (j = 0; j < nebulaParams.length; j++) {
        var p = nebulaParams[j];
        self.pNebula.setUniform("uModel", "Matrix4fv", false, model);
        self.pNebula.setUniform("uView", "Matrix4fv", false, view);
        self.pNebula.setUniform("uProjection", "Matrix4fv", false, projection);
        self.pNebula.setUniform("uScale", "1f", p.scale);
        self.pNebula.setUniform("uColor", "3fv", p.color);
        self.pNebula.setUniform("uIntensity", "1f", p.intensity);
        self.pNebula.setUniform("uFalloff", "1f", p.falloff);
        self.pNebula.setUniform("uOffset", "3fv", p.offset);
        self.rNebula.render();
      }

      // Render the suns.
      self.pSun.use();
      self.pSun.setUniform("uView", "Matrix4fv", false, view);
      self.pSun.setUniform("uProjection", "Matrix4fv", false, projection);
      self.pSun.setUniform("uModel", "Matrix4fv", false, model);
      for (j = 0; j < sunParams.length; j++) {
        var sun = sunParams[j];
        self.pSun.setUniform("uPosition", "3fv", sun.pos);
        self.pSun.setUniform("uColor", "3fv", sun.color);
        self.pSun.setUniform("uSize", "1f", sun.size);
        self.pSun.setUniform("uFalloff", "1f", sun.falloff);
        self.rSun.render();
      }

      // Create the texture.
      var c = document.createElement("canvas");
      c.width = c.height = params.resolution;
      var ctx = c.getContext("2d");
      ctx.drawImage(self.canvas, 0, 0);
      textures[keys[i]] = c;
    }

    return textures;
  };

  self.initialize();
};

function buildStar(size, pos, dist, rand) {
  var c = Math.pow(rand.random(), 4.0);
  var color = [c, c, c, c, c, c, c, c, c, c, c, c, c, c, c, c, c, c];

  var vertices = [
    [-size, -size, 0],
    [size, -size, 0],
    [size, size, 0],
    [-size, -size, 0],
    [size, size, 0],
    [-size, size, 0]
  ];

  var position = [];

  for (var ii = 0; ii < 6; ii++) {
    var rot = quatRotFromForward(pos);
    glm.vec3.transformQuat(vertices[ii], vertices[ii], rot);
    vertices[ii][0] += pos[0] * dist;
    vertices[ii][1] += pos[1] * dist;
    vertices[ii][2] += pos[2] * dist;
    position.push.apply(position, vertices[ii]);
  }

  return {
    position: position,
    color: color
  };
}

function buildBox(gl, program) {
  var position = [
    -1,
    -1,
    -1,
    1,
    -1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    1,
    1,
    -1,
    -1,
    1,
    -1,

    1,
    -1,
    1,
    -1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    1,
    1,

    1,
    -1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    1,
    1,
    -1,
    -1,
    1,
    1,
    1,
    1,
    1,
    -1,

    -1,
    -1,
    1,
    -1,
    -1,
    -1,
    -1,
    1,
    -1,
    -1,
    -1,
    1,
    -1,
    1,
    -1,
    -1,
    1,
    1,

    -1,
    1,
    -1,
    1,
    1,
    -1,
    1,
    1,
    1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    -1,
    1,
    1,

    -1,
    -1,
    1,
    1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    -1
  ];
  var attribs = webgl.buildAttribs(gl, { aPosition: 3 });
  attribs.aPosition.buffer.set(new Float32Array(position));
  var count = position.length / 9;
  var renderable = new webgl.Renderable(gl, program, attribs, count);
  return renderable;
}

function quatRotBetweenVecs(a, b) {
  var theta = Math.acos(glm.vec3.dot(a, b));
  var omega = glm.vec3.create();
  glm.vec3.cross(omega, a, b);
  glm.vec3.normalize(omega, omega);
  var rot = glm.quat.create();
  glm.quat.setAxisAngle(rot, omega, theta);
  return rot;
}

function quatRotFromForward(b) {
  return quatRotBetweenVecs(glm.vec3.fromValues(0, 0, -1), b);
}

function randomRotation(rand) {
  var rot = glm.mat4.create();
  glm.mat4.rotateX(rot, rot, rand.random() * Math.PI * 2);
  glm.mat4.rotateY(rot, rot, rand.random() * Math.PI * 2);
  glm.mat4.rotateZ(rot, rot, rand.random() * Math.PI * 2);
  return rot;
}

function randomVec3(rand) {
  var v = [0, 0, 1];
  var rot = randomRotation(rand);
  glm.vec3.transformMat4(v, v, rot);
  glm.vec3.normalize(v, v);
  return v;
}

function hashcode(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash += (i + 1) * char;
  }
  return hash;
}
