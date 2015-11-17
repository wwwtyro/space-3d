#version 100
precision highp float;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

attribute vec3 aPosition;
varying vec3 pos;

void main() {
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
    pos = (uModel * vec4(aPosition, 1)).xyz;
}


__split__


#version 100
precision highp float;

uniform vec3 uPosition;
uniform vec3 uColor;
uniform float uSize;
uniform float uFalloff;

varying vec3 pos;

void main() {
    vec3 posn = normalize(pos);
    float d = 1.0 - clamp(dot(posn, normalize(uPosition)), 0.0, 1.0);
    float i = exp(-(d - uSize) * uFalloff);
    float o = clamp(i, 0.0, 1.0);
    gl_FragColor = vec4(uColor + i, o);

}
