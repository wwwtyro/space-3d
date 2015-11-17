#version 100
precision highp float;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

attribute vec3 aPosition;
attribute vec3 aColor;

varying vec3 color;

void main() {
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
    color = aColor;
}


__split__


#version 100
precision highp float;


varying vec3 color;

void main() {
    gl_FragColor = vec4(color, 1.0);

}
