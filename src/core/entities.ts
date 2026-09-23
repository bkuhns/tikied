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
    public isShielded: boolean;
    public isMagicResistant: boolean;
    
    private elapsedTime: number = 0;

    constructor(
        kindInfo: EnemyKindInfo,
        bodyTextures: Texture[],
        balloonTextures: Texture[] | undefined,
        routeIndex: number,
        routeLength: number,
        isOnFire: boolean,
        isCold: boolean,
        isShielded: boolean,
        isMagicResistant: boolean
    ) {
        this.kindInfo = kindInfo;
        this.routeIndex = routeIndex;
        this.ratio = 0.0;
        this.routeLength = routeLength;
        this.maxSpeed = kindInfo.max_speed;
        
        this.isOnFire = isOnFire;
        this.isCold = isCold;
        this.isShielded = isShielded;
        this.isMagicResistant = isMagicResistant;
        
        this.speedMultiplier = 1.0;
        if (isOnFire) this.speedMultiplier = 1.5;

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
        } else if (isShielded) {
            this.bodySprite.tint = 0x99FF99;
        } else if (isMagicResistant) {
            this.bodySprite.tint = 0xFF9999;
        }

        this.spriteContainer.addChild(this.bodySprite);

        // Setup Balloon
        if (balloonTextures && balloonTextures.length > 0) {
            this.balloonSprite = new Sprite(balloonTextures[balloonTextures.length - 1]);
            this.balloonSprite.anchor.set(0.5, 0.5);
            this.balloonSprite.rotation = 0;
            this.balloonSprite.y = -((this.bodySprite.height / 2) + 20);
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

        if (!this.balloonSprite) {
            this.bodySprite.update(dt);
        }

        let scaleY = this.kindInfo.screen_size ?? 1.0;
        let scaleX = scaleY;
        let rot = 0.0;
        
        let localYOffset = 0;
        let localXOffset = 0;

        if (this.balloonSprite) {
            // Apply rocking animation when carried by balloon
            rot = Math.sin(this.elapsedTime * 3.0) * 0.15;
            
            const hoverHeight = 40;
            // Calculate distance based on actual sprite height rather than a fixed value
            const attachDist = (this.bodySprite.height / 2) + 20;
            
            this.balloonSprite.rotation = rot;
            // The balloon stays attached to the top of the rotating monster
            this.balloonSprite.x = Math.sin(rot) * attachDist;
            this.balloonSprite.y = -hoverHeight - (Math.cos(rot) * attachDist);
            
            // Monster hovers in the air
            localYOffset -= hoverHeight;
        } else {
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
            }
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
