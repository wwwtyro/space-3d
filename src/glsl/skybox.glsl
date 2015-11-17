#version 100
precision highp float;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

attribute vec3 aPosition;
attribute vec2 aUV;

varying vec2 uv;

void main() {
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
    uv = aUV;
}


__split__


#version 100
precision highp float;

uniform sampler2D uTexture;

varying vec2 uv;

void main() {
    gl_FragColor = texture2D(uTexture, uv);

}
