export class WebGLWaterRenderer {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private program: WebGLProgram | null = null;
    
    private stageTexture: WebGLTexture | null = null;
    private waveTexture: WebGLTexture | null = null;
    
    private u_offset1: WebGLUniformLocation | null = null;
    private u_offset2: WebGLUniformLocation | null = null;
    private u_color: WebGLUniformLocation | null = null;

    // Water state
    public tex1_offset_x = 0.0;
    public tex1_offset_y = 0.0;
    public tex2_offset_x = 0.0;
    public tex2_offset_y = 0.0;

    public dx1 = -0.00033;
    public dy1 = -0.00051;
    public dx2 = -0.00090;
    public dy2 = -0.00090;
    
    public r = 0.25;
    public g = 0.36;
    public b = 0.31;
    public contrast = 1.0;

    constructor() {
        this.canvas = document.createElement('canvas');
        const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
        if (!gl) {
            throw new Error("WebGL not supported");
        }
        this.gl = gl;
    }

    public initShaders(hlslSource: string) {
        const gl = this.gl;
        
        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_position * 0.5 + 0.5;
                v_texCoord.y = 1.0 - v_texCoord.y;
            }
        `;
        
        const fsSource = this.transpileHLSL(hlslSource);
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
        
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
        }
        
        gl.useProgram(this.program);
        
        // Setup quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0
        ]), gl.STATIC_DRAW);
        
        const positionLocation = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Uniforms
        const stageLoc = gl.getUniformLocation(this.program, "u_stageTex");
        const waveLoc = gl.getUniformLocation(this.program, "u_waveTex");
        gl.uniform1i(stageLoc, 0);
        gl.uniform1i(waveLoc, 1);
        
        this.u_offset1 = gl.getUniformLocation(this.program, "u_offset1");
        this.u_offset2 = gl.getUniformLocation(this.program, "u_offset2");
        this.u_color = gl.getUniformLocation(this.program, "u_color");
    }

    private transpileHLSL(hlsl: string): string {
        // Extract the #if 1 block
        const match = hlsl.match(/#if 1\s+([\s\S]*?)#else/);
        if (!match) throw new Error("Could not find active shader block in HLSL");
        let coreLogic = match[1];

        // Type mapping
        coreLogic = coreLogic.replace(/\bfloat4\b/g, 'vec4');
        coreLogic = coreLogic.replace(/\bfloat3\b/g, 'vec3');
        coreLogic = coreLogic.replace(/\bfloat2\b/g, 'vec2');
        coreLogic = coreLogic.replace(/\bhalf4\b/g, 'vec4');
        coreLogic = coreLogic.replace(/\bhalf3\b/g, 'vec3');
        coreLogic = coreLogic.replace(/\bhalf2\b/g, 'vec2');
        coreLogic = coreLogic.replace(/\bhalf\b/g, 'float');

        // Function mapping
        coreLogic = coreLogic.replace(/\btex2D\s*\(/g, 'texture2D(');
        coreLogic = coreLogic.replace(/\blerp\s*\(/g, 'mix(');
        
        // Literal mapping
        coreLogic = coreLogic.replace(/vec3\s*\(\s*0\s*,\s*0\.7071\s*,\s*0\.7071\s*\)/g, 'vec3(0.0, 0.7071, 0.7071)');
        coreLogic = coreLogic.replace(/\*\s*2\s*-\s*1/g, '* 2.0 - 1.0');

        // Handle specific saturate() calls with nested parentheses properly
        coreLogic = coreLogic.replace(/saturate\s*\(\s*stageRGBA\.a\s*\+\s*\(\s*materialSpecularPower\s*\*\s*stageRGBA\.a\s*\)\s*\)/g, 'clamp(stageRGBA.a + (materialSpecularPower*stageRGBA.a), 0.0, 1.0)');
        coreLogic = coreLogic.replace(/saturate\s*\(\s*dot\s*\(\s*normal\s*,\s*light\s*\)\s*\)/g, 'clamp(dot(normal, light), 0.0, 1.0)');

        // Variable binding mapping
        coreLogic = coreLogic.replace(/\btexture0\b/g, 'u_stageTex');
        coreLogic = coreLogic.replace(/\btexture1\b/g, 'u_waveTex');
        coreLogic = coreLogic.replace(/\binTexCoord0\b/g, 'v_texCoord');
        coreLogic = coreLogic.replace(/\binTexCoord1\b/g, '(v_texCoord * 8.0 + u_offset1)');
        coreLogic = coreLogic.replace(/\binTexCoord2\b/g, '(v_texCoord * 8.0 + u_offset2)');
        coreLogic = coreLogic.replace(/\binColour\b/g, 'u_color');
        coreLogic = coreLogic.replace(/\boutColour\b/g, 'gl_FragColor');
        
        // Handle undefined uniforms from HLSL
        coreLogic = coreLogic.replace(/\bmaterialSpecularPower\b/g, '0.0');

        return `
            precision highp float;
            
            uniform sampler2D u_stageTex;
            uniform sampler2D u_waveTex;
            
            uniform vec2 u_offset1;
            uniform vec2 u_offset2;
            uniform vec4 u_color;
            
            varying vec2 v_texCoord;
            
            void main() {
                ${coreLogic}
                gl_FragColor.a = 1.0;
            }
        `;
    }

    private compileShader(type: number, source: string) {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    public setStageTexture(imageData: ImageData) {
        const gl = this.gl;
        this.canvas.width = imageData.width;
        this.canvas.height = imageData.height;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        if (this.stageTexture) gl.deleteTexture(this.stageTexture);
        this.stageTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    public setWaveTexture(imageData: ImageData) {
        const gl = this.gl;
        if (this.waveTexture) gl.deleteTexture(this.waveTexture);
        this.waveTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.waveTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    public getCanvas() {
        return this.canvas;
    }

    public updateAndDraw(animate: boolean = true) {
        if (!this.stageTexture || !this.waveTexture) return;

        if (animate) {
            // Update offsets
            this.tex1_offset_x += this.dx1;
            this.tex1_offset_y += this.dy1;
            this.tex2_offset_x += this.dx2;
            this.tex2_offset_y += this.dy2;

            if (this.tex1_offset_x > 1.0) this.tex1_offset_x -= 1.0;
            if (this.tex1_offset_x < -1.0) this.tex1_offset_x += 1.0;
            if (this.tex1_offset_y > 1.0) this.tex1_offset_y -= 1.0;
            if (this.tex1_offset_y < -1.0) this.tex1_offset_y += 1.0;

            if (this.tex2_offset_x > 1.0) this.tex2_offset_x -= 1.0;
            if (this.tex2_offset_x < -1.0) this.tex2_offset_x += 1.0;
            if (this.tex2_offset_y > 1.0) this.tex2_offset_y -= 1.0;
            if (this.tex2_offset_y < -1.0) this.tex2_offset_y += 1.0;
        }

        const gl = this.gl;
        gl.useProgram(this.program);
        
        gl.uniform2f(this.u_offset1, this.tex1_offset_x, this.tex1_offset_y);
        gl.uniform2f(this.u_offset2, this.tex2_offset_x, this.tex2_offset_y);
        
        // r, g, b, a (contrast)
        gl.uniform4f(this.u_color, this.r, this.g, this.b, this.contrast);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stageTexture);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.waveTexture);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
