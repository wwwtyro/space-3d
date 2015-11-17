// jshint -W097
// jshint undef: true, unused: true
/* globals require,window,document,requestAnimationFrame,dat,location*/

"use strict";

var qs = require("query-string");
var glm = require("gl-matrix");
var Space3D = require("./space-3d.js");
var Skybox = require("./skybox.js");

var resolution = 1024;

window.onload = function() {

    var params = qs.parse(location.hash);

    var ControlsMenu = function() {
        this.seed = params.seed || generateRandomSeed();
        this.randomSeed = function() {
            this.seed = generateRandomSeed();
            renderTextures();
        };
        this.fov = parseInt(params.fov) || 80;
        this.pointStars = params.pointStars === undefined ? true : params.pointStars === "true";
        this.stars = params.stars === undefined ? true : params.stars === "true";
        this.sun = params.sun === undefined ? true : params.sun === "true";
        this.nebulae = params.nebulae === undefined ? true : params.nebulae === "true";
        this.resolution = parseInt(params.resolution) || 1024;
        this.animationSpeed = params.animationSpeed === undefined ? 1.0 : parseFloat(params.animationSpeed);
        this.unifiedTexture = params.unifiedTexture === undefined ? true : params.unifiedTexture === "true";
    };

    var menu = new ControlsMenu();
    var gui = new dat.GUI({
        autoPlace: false,
        width: 320,
    });
    gui.add(menu, "seed").name("Seed").listen().onFinishChange(renderTextures);
    gui.add(menu, "randomSeed").name("Randomize seed");
    gui.add(menu, "fov", 10, 150, 1).name("Field of view °");
    gui.add(menu, "pointStars").name("Point stars").onChange(renderTextures);
    gui.add(menu, "stars").name("Bright stars").onChange(renderTextures);
    gui.add(menu, "sun").name("Sun").onChange(renderTextures);
    gui.add(menu, "nebulae").name("Nebulae").onChange(renderTextures);
    gui.add(menu, "resolution", [256, 512, 1024, 2048, 4096]).name("Resolution").onChange(renderTextures);
    gui.add(menu, "unifiedTexture").name("Unified texture");
    gui.add(menu, "animationSpeed", 0, 10).name("Animation speed");

    document.body.appendChild(gui.domElement);
    gui.domElement.style.position = "fixed";
    gui.domElement.style.left = "16px";
    gui.domElement.style.top = "272px";

    function hideGui() {
        gui.domElement.style.display = "none";
    }

    function showGui() {
        gui.domElement.style.display = "block";
    }

    function hideUnified() {
        document.getElementById("texture-canvas").style.display = "none";
    }

    function showUnified() {
        document.getElementById("texture-canvas").style.display = "block";
    }

    function hideSplit() {
        document.getElementById("texture-left").style.display = "none";
        document.getElementById("texture-right").style.display = "none";
        document.getElementById("texture-top").style.display = "none";
        document.getElementById("texture-bottom").style.display = "none";
        document.getElementById("texture-front").style.display = "none";
        document.getElementById("texture-back").style.display = "none";
    }

    function showSplit() {
        document.getElementById("texture-left").style.display = "block";
        document.getElementById("texture-right").style.display = "block";
        document.getElementById("texture-top").style.display = "block";
        document.getElementById("texture-bottom").style.display = "block";
        document.getElementById("texture-front").style.display = "block";
        document.getElementById("texture-back").style.display = "block";
    }

    function setQueryString() {
        location.hash = qs.stringify({
            seed: menu.seed,
            fov: menu.fov,
            pointStars: menu.pointStars,
            stars: menu.stars,
            sun: menu.sun,
            nebulae: menu.nebulae,
            resolution: menu.resolution,
            animationSpeed: menu.animationSpeed,
        });
    }

    var hideControls = false;

    window.onkeypress = function(e) {
        if (e.charCode == 32) {
            hideControls = !hideControls;
        }
    };

    var renderCanvas = document.getElementById("render-canvas");
    renderCanvas.width = renderCanvas.clientWidth;
    renderCanvas.height = renderCanvas.clientHeight;

    var skybox = new Skybox(renderCanvas);
    var space = new Space3D(resolution);

    function renderTextures() {
        var textures = space.render({
            seed: menu.seed,
            pointStars: menu.pointStars,
            stars: menu.stars,
            sun: menu.sun,
            nebulae: menu.nebulae,
            unifiedTexture: menu.unifiedTexture,
            resolution: menu.resolution,
        });
        skybox.setTextures(textures);
        var canvas = document.getElementById("texture-canvas");
        canvas.width = 4 * menu.resolution;
        canvas.height = 3 * menu.resolution;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(textures.left,   menu.resolution * 0, menu.resolution * 1);
        ctx.drawImage(textures.right,  menu.resolution * 2, menu.resolution * 1);
        ctx.drawImage(textures.front,  menu.resolution * 1, menu.resolution * 1);
        ctx.drawImage(textures.back,   menu.resolution * 3, menu.resolution * 1);
        ctx.drawImage(textures.top,    menu.resolution * 1, menu.resolution * 0);
        ctx.drawImage(textures.bottom, menu.resolution * 1, menu.resolution * 2);

        function drawIndividual(source, targetid) {
            var canvas = document.getElementById(targetid);
            canvas.width = canvas.height = menu.resolution;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(source, 0, 0);
        }

        drawIndividual(textures.left,   "texture-left");
        drawIndividual(textures.right,  "texture-right");
        drawIndividual(textures.front,  "texture-front");
        drawIndividual(textures.back,   "texture-back");
        drawIndividual(textures.top,    "texture-top");
        drawIndividual(textures.bottom, "texture-bottom");
    }

    renderTextures();

    var tick = 0.0;

    function render() {

        hideUnified();
        hideSplit();
        hideGui();

        if (!hideControls) {
            showGui();
            if (menu.unifiedTexture) {
                showUnified();
            } else {
                showSplit();
            }
        }

        tick += 0.0025 * menu.animationSpeed;

        var view = glm.mat4.create();
        var projection = glm.mat4.create();

        renderCanvas.width = renderCanvas.clientWidth;
        renderCanvas.height = renderCanvas.clientHeight;

        glm.mat4.lookAt(view, [0,0,0], [Math.cos(tick), Math.sin(tick * 0.555), Math.sin(tick)], [0,1,0]);

        var fov = (menu.fov/360)*Math.PI*2;
        glm.mat4.perspective(projection, fov, renderCanvas.width/renderCanvas.height, 0.1, 8);

        skybox.render(view, projection);

        requestAnimationFrame(render);

        setQueryString();
    }

    render();

};

function generateRandomSeed() {
    return (Math.random() * 1000000000000000000).toString(36);
}
