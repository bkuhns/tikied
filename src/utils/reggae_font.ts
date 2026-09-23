import { Texture, Rectangle, Container, Sprite } from 'pixi.js';

export class ReggaeFont {
    private baseTexture: Texture | null = null;
    private digitTextures: Texture[] = [];

    // The left-most pixel of each number (inclusive)
    private readonly DIGIT_X = [247, 268, 282, 302, 323, 345, 364, 384, 404, 425];
    private readonly ROW_TOP = 8;
    private readonly ROW_BOTTOM = 34;

    public initialize(imgData: ImageData) {
        const width = imgData.width;
        const height = imgData.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imgData, 0, 0);

        this.baseTexture = Texture.from(canvas);

        const charHeight = this.ROW_BOTTOM - this.ROW_TOP + 1;

        // Create a cropped texture for each digit 0-9
        for (let i = 0; i < 10; i++) {
            const x = this.DIGIT_X[i];
            const nextX = (i < 9) ? this.DIGIT_X[i + 1] : (x + 21); // Estimate last digit width as 21
            const charWidth = nextX - x;
            
            // The user's coordinates are based on the already-flipped texture
            const frame = new Rectangle(x, this.ROW_TOP, charWidth, charHeight);
            
            this.digitTextures[i] = new Texture({
                source: this.baseTexture.source,
                frame: frame
            });
        }
    }

    public getDigitTexture(digit: number): Texture | null {
        if (!this.baseTexture || digit < 0 || digit > 9) return null;
        return this.digitTextures[digit];
    }

    /**
     * Creates a Container with sprites for each digit in the number.
     * The container's pivot is set to its center, so its x/y properties
     * represent the center of the rendered text.
     */
    public createNumberContainer(num: number, tint: number = 0xFFFFFF): Container {
        const container = new Container();
        if (!this.baseTexture) return container;

        const numStr = num.toString();
        let currentX = 0;
        let maxHeight = 0;

        for (let i = 0; i < numStr.length; i++) {
            const digit = parseInt(numStr[i], 10);
            if (isNaN(digit)) continue;

            const tex = this.digitTextures[digit];
            const sprite = new Sprite(tex);
            sprite.x = currentX;
            sprite.y = 0;
            sprite.tint = tint;
            container.addChild(sprite);

            currentX += tex.frame.width;
            maxHeight = Math.max(maxHeight, tex.frame.height);
        }

        // Set pivot to center so we can easily center it in the UI
        container.pivot.set(currentX / 2, maxHeight / 2);

        return container;
    }
    
    /**
     * Updates an existing container created by createNumberContainer with a new number.
     */
    public updateNumberContainer(container: Container, num: number, tint: number = 0xFFFFFF) {
        if (!this.baseTexture) return;
        
        container.removeChildren();
        
        const numStr = num.toString();
        let currentX = 0;
        let maxHeight = 0;

        for (let i = 0; i < numStr.length; i++) {
            const digit = parseInt(numStr[i], 10);
            if (isNaN(digit)) continue;

            const tex = this.digitTextures[digit];
            const sprite = new Sprite(tex);
            sprite.x = currentX;
            sprite.y = 0;
            sprite.tint = tint;
            container.addChild(sprite);

            currentX += tex.frame.width;
            maxHeight = Math.max(maxHeight, tex.frame.height);
        }

        container.pivot.set(currentX / 2, maxHeight / 2);
    }
}
