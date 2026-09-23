import { Container, Sprite, Texture } from 'pixi.js';
import { AnimatedSprite } from '../utils/pixi_utils.js';
import { EnemyKindInfo } from '../data/enemy_data.js';

export class Monster {
    public readonly spriteContainer: Container;
    public readonly bodySprite: AnimatedSprite;
    public readonly balloonSprite?: Sprite;
    
    public routeIndex: number;
    public ratio: number;
    public routeLength: number;
    public maxSpeed: number;
    public speedMultiplier: number;
    public kindInfo: EnemyKindInfo;
    public isOnFire: boolean;
    public isCold: boolean;
    
    private elapsedTime: number = 0;

    constructor(
        kindInfo: EnemyKindInfo,
        bodyTextures: Texture[],
        balloonTextures: Texture[] | undefined,
        routeIndex: number,
        routeLength: number,
        isOnFire: boolean,
        isCold: boolean
    ) {
        this.kindInfo = kindInfo;
        this.routeIndex = routeIndex;
        this.ratio = 0.0;
        this.routeLength = routeLength;
        this.maxSpeed = kindInfo.max_speed;
        
        this.isOnFire = isOnFire;
        this.isCold = isCold;
        
        this.speedMultiplier = 1.0;
        if (isOnFire) this.speedMultiplier = 1.5;
        else if (isCold) this.speedMultiplier = 0.5;

        // Container to hold both the body and the balloon
        this.spriteContainer = new Container();

        // Setup Body
        const fps = kindInfo.fps ?? 8;
        const loopStyle = kindInfo.loop_style ?? 'linear';
        this.bodySprite = new AnimatedSprite(bodyTextures, fps, loopStyle);
        this.bodySprite.setSpeedMultiplier(this.speedMultiplier);
        this.bodySprite.anchor.set(0.5, 0.5);
        
        const scale = kindInfo.screen_size ?? 1.0;
        this.bodySprite.scale.set(scale, scale);
        
        if (isOnFire) {
            this.bodySprite.tint = 0xFF8844;
        } else if (isCold) {
            this.bodySprite.tint = 0x88CCFF;
        }

        this.spriteContainer.addChild(this.bodySprite);

        // Setup Balloon
        if (balloonTextures && balloonTextures.length > 0) {
            this.balloonSprite = new Sprite(balloonTextures[0]);
            this.balloonSprite.anchor.set(0.5, 0.5);
            this.balloonSprite.rotation = 0;
            // The balloon is positioned relative to the monster's center, but in the previous code 
            // it was positioned globally. If we put it in the container, its offset is just Y = -10
            this.balloonSprite.y = -10;
            this.spriteContainer.addChild(this.balloonSprite);
        }
    }

    public isFinished(): boolean {
        return this.ratio >= 1.0;
    }

    public destroy() {
        this.spriteContainer.destroy({ children: true });
    }

    /**
     * @param dt Delta time in seconds
     * @param pos The position on the route
     */
    public update(dt: number, pos: { x: number, y: number }) {
        const dRatio = (this.maxSpeed * this.speedMultiplier / this.routeLength) * dt;
        this.ratio += dRatio;
        this.elapsedTime += dt;

        if (this.isFinished()) {
            return;
        }

        this.bodySprite.update(dt);

        let scaleY = this.kindInfo.screen_size ?? 1.0;
        let scaleX = scaleY;
        let rot = 0.0;
        
        let localYOffset = 0;
        let localXOffset = 0;

        const animType = this.kindInfo.anim_type;

        if (animType === 'rock') {
            rot = Math.sin(this.elapsedTime * 6.0) * 0.15;
        } else if (animType === 'boss_hop') {
            const hopY = Math.abs(Math.sin(this.elapsedTime * 4.0)) * 40;
            localYOffset -= hopY;
        } else if (animType === 'fly' || animType === 'boss_fly') {
            localYOffset -= (animType === 'boss_fly') ? 64 : 48;
            const floatAmp = (animType === 'boss_fly') ? 8.0 : 6.0;
            localYOffset -= Math.sin(this.elapsedTime * 3.0) * floatAmp;
        } else if (animType === 'scuttle') {
            localXOffset += Math.sin(this.elapsedTime * 20.0) * 1.5;
        }

        // Apply transformations to body sprite (container handles world position)
        this.bodySprite.x = localXOffset;
        this.bodySprite.y = localYOffset;
        this.bodySprite.scale.set(scaleX, scaleY);
        this.bodySprite.rotation = rot;

        // Container world position
        this.spriteContainer.x = pos.x;
        this.spriteContainer.y = pos.y;
        this.spriteContainer.zIndex = pos.y;

        // Balloon zIndex adjustments
        if (this.balloonSprite) {
            // Un-rotate and un-scale the balloon relative to the container if we wanted, 
            // but since balloon is a direct child of container (not bodySprite), 
            // it doesn't inherit bodySprite's rotations or scales!
            this.balloonSprite.zIndex = -0.1; 
            // In Pixi v8, to make a child sort behind another child, container.sortableChildren = true
            this.spriteContainer.sortableChildren = true;
        }
    }
}
