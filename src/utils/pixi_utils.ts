import { Sprite, Texture, Rectangle } from 'pixi.js';

export class TextureUtils {
    /**
     * Slices a base Texture into a grid of individual frames.
     * Iterates from bottom to top (to handle inverted textures like DDS) and left to right.
     */
    public static sliceSpriteSheet(
        baseTexture: Texture, 
        originalWidth: number, 
        originalHeight: number, 
        rows: number, 
        cols: number
    ): Texture[] {
        const frames: Texture[] = [];
        const fw = originalWidth / cols;
        const fh = originalHeight / rows;
        
        // Always animate bottom-to-top to handle vertical flipping naturally.
        for (let r = rows - 1; r >= 0; r--) {
            for (let c = 0; c < cols; c++) {
                frames.push(new Texture({
                    source: baseTexture.source,
                    frame: new Rectangle(c * fw, r * fh, fw, fh)
                }));
            }
        }
        
        return frames;
    }
}

export class AnimatedSprite extends Sprite {
    private frameTextures: Texture[];
    private fps: number;
    private loopStyle: 'linear' | 'pingpong';
    private elapsedTime: number = 0;
    private speedMultiplier: number = 1.0;

    constructor(frames: Texture[], fps: number = 8, loopStyle: 'linear' | 'pingpong' = 'linear') {
        super(frames.length > 0 ? frames[0] : Texture.EMPTY);
        this.frameTextures = frames;
        this.fps = fps;
        this.loopStyle = loopStyle;
    }

    public setSpeedMultiplier(mult: number) {
        this.speedMultiplier = mult;
    }

    public update(dt: number) {
        this.elapsedTime += dt;
        
        const numFrames = this.frameTextures.length;
        if (numFrames <= 1 || this.fps <= 0) {
            return;
        }

        let frameIdx = 0;
        if (this.loopStyle === 'pingpong') {
            const cycleLen = 2 * (numFrames - 1);
            if (cycleLen > 0) {
                const step = Math.floor(this.elapsedTime * this.fps * this.speedMultiplier) % cycleLen;
                frameIdx = step < numFrames ? step : cycleLen - step;
            }
        } else {
            frameIdx = Math.floor(this.elapsedTime * this.fps * this.speedMultiplier) % numFrames;
        }

        if (this.texture !== this.frameTextures[frameIdx]) {
            this.texture = this.frameTextures[frameIdx];
        }
    }
}

export class StaticSprite extends Sprite {
    // Purely a static sprite with no per-frame updates.
    constructor(texture?: Texture) {
        super(texture);
    }
}

export class TreeSprite extends Sprite {
    private timeOffset: number;
    private treeStrength: number;
    private drawHeight: number;
    private baseDx: number;

    constructor(texture: Texture, timeOffset: number, treeStrength: number, drawHeight: number, baseDx: number) {
        super(texture);
        this.timeOffset = timeOffset;
        this.treeStrength = treeStrength;
        this.drawHeight = drawHeight;
        this.baseDx = baseDx;
    }

    /**
     * @param dt Delta time in seconds
     * @param timeSec Global performance time in seconds (for continuous sync across all trees)
     */
    public update(dt: number, timeSec: number, swayEnabled: boolean) {
        if (!swayEnabled) {
            this.skew.x = 0;
            this.x = this.baseDx;
            return;
        }

        const speed = 0.75;
        const baseSway = Math.sin((timeSec * speed) + this.timeOffset);
        const swayAngle = baseSway * 0.04 * this.treeStrength;
        
        this.skew.x = swayAngle;
        this.x = this.baseDx - (swayAngle * this.drawHeight);
    }
}
