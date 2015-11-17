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

uniform vec3 uColor;
uniform vec3 uOffset;
uniform float uScale;
uniform float uIntensity;
uniform float uFalloff;

varying vec3 pos;

__noise4d__

float noise(vec3 p) {
    return 0.5 * cnoise(vec4(p, 0)) + 0.5;
}

float nebula(vec3 p) {
    const int steps = 6;
    float scale = pow(2.0, float(steps));
    vec3 displace;
    for (int i = 0; i < steps; i++) {
        displace = vec3(
            noise(p.xyz * scale + displace),
            noise(p.yzx * scale + displace),
            noise(p.zxy * scale + displace)
        );
        scale *= 0.5;
    }
    return noise(p * scale + displace);
}

void main() {
    vec3 posn = normalize(pos) * uScale;
    float c = min(1.0, nebula(posn + uOffset) * uIntensity);
    c = pow(c, uFalloff);
    gl_FragColor = vec4(uColor, c);

}
