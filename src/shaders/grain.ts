/**
 * Film Grain Shader - PixiJS v8 Compatible
 * Creates animated noise overlay for cinematic effect
 */

// Vertex Shader (passthrough)
export const grainVertexShader = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

// Fragment Shader with animated grain
export const grainFragmentShader = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uNoise;
uniform float uTime;

// High-quality pseudo-random function
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    
    // Generate animated noise based on coord + time
    float grain = (rand(vTextureCoord + uTime) - 0.5) * uNoise;
    
    // Apply grain to RGB channels, preserve alpha
    finalColor = vec4(color.rgb + grain, color.a);
}
`;
