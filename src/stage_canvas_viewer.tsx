import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameDataGateway, SpriteInstance } from './editor_api.js';
import { WebGLWaterRenderer } from './webgl_water.js';
import { RoutesRenderer, Route } from './routes_renderer.js';
import { Application, Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';

export interface ViewerToggles {
    showTrees: boolean;
    showRocks: boolean;
    showObjects: boolean;
    showBridges: boolean;
    showRoutes: boolean;
    showWater: boolean;
    showHudBar: boolean;
    showAnimations: boolean;
}

export interface RouteToggle {
    id: number;
    color: string;
    visible: boolean;
}

interface StageCanvasViewerProps {
    stageId: number;
    gateway: GameDataGateway;
    toggles: ViewerToggles;
    routeToggles: RouteToggle[];
    onRoutesLoaded?: (routes: RouteToggle[]) => void;
    onStatusChange?: (status: string) => void;
}

interface SpriteMeta {
    w: number;
    h: number;
}

const gridOverrides: Record<string, {cols: number, rows: number}> = {
    "tree_beach": { cols: 2, rows: 4 }
};

const SPRITE_SHEETS: Record<string, SpriteMeta> = {
    "tree_spring": { w: 128, h: 128 },
    "tree_summer": { w: 128, h: 128 },
    "tree_autumn": { w: 128, h: 128 },
    "tree_winter": { w: 128, h: 128 },
    "tree_swamp": { w: 128, h: 128 },
    "tree_bare": { w: 128, h: 128 },
    "tree_beach": { w: 128, h: 128 },
    "rock_1": { w: 128, h: 128 },
    "rock_1_winter": { w: 128, h: 128 },
    "log_obj": { w: 128, h: 128 },
    "stumps": { w: 128, h: 128 },
    "home": { w: 256, h: 128 },
    "home_grass": { w: 512, h: 128 },
    "gem_sign": { w: 128, h: 128 },
    "research_sign": { w: 128, h: 128 },
    "shadow": { w: 128, h: 64 },
    "bridge_s12": { w: 512, h: 256 },
    "bridge_s16": { w: 256, h: 256 },
    "bridge_s48": { w: 256, h: 256 },
    "bridge_s52a": { w: 256, h: 256 },
    "bridge_s52b": { w: 256, h: 256 },
    "stage79Bridge": { w: 1024, h: 128 },
    "new_wave": { w: 256, h: 256 },
    "hud_bar": { w: 2048, h: 128 }
};

const SPRITE_PATHS: Record<string, string> = {
    "tree_spring": "data-common/textures/bgdata/objects/TreeSet_spring.dds",
    "tree_summer": "data-common/textures/bgdata/objects/TreeSet_summer1.dds",
    "tree_autumn": "data-common/textures/bgdata/objects/TreeSet_autumn1.dds",
    "tree_winter": "data-common/textures/bgdata/objects/TreeSet_winter1.dds",
    "tree_swamp": "data-common/textures/bgdata/objects/TreeSet_swamp1.dds",
    "tree_bare": "data-common/textures/bgdata/objects/TreeSet_bare1.dds",
    "tree_beach": "data-common/textures/bgdata/objects/TreeSet_beach.dds",
    "rock_1": "data-common/textures/bgdata/objects/rockSet1.dds",
    "rock_1_winter": "data-common/textures/bgdata/objects/snowrocks.dds",
    "log_obj": "data-common/textures/bgdata/objects/Log.dds",
    "stumps": "data-common/textures/bgdata/objects/Stumps_2x2.dds",
    "home": "data-common/textures/bgdata/objects/House1.dds",
    "home_grass": "data-common/textures/bgdata/objects/House1_ground.dds",
    "gem_sign": "data-common/textures/ingameui/main/gemsign.dds",
    "research_sign": "data-common/textures/ingameui/resource/researchsign.dds",
    "shadow": "data-common/textures/bgdata/objects/shadow.dds",
    "bridge_s12": "data-common/textures/bgdata/objects/bridge_s12.dds",
    "bridge_s16": "data-common/textures/bgdata/objects/bridge_s16.dds",
    "bridge_s48": "data-common/textures/bgdata/objects/swampBridge.dds",
    "bridge_s52a": "data-common/textures/bgdata/objects/stage52BridgeA.dds",
    "bridge_s52b": "data-common/textures/bgdata/objects/stage52BridgeB.dds",
    "stage79Bridge": "data-common/textures/bgdata/objects/stage79Bridge.dds",
    "new_wave": "data-common/textures/effects/NewWave.dds",
    "hud_bar": "data-common/textures/frontend/shared/pixeljunkbar.dds"
};

const NEGATIVE_ROCK_MAPPING: Record<number, number> = {
    0: 0,
    "-1": 1,
    "-2": 6,
    "-3": 7,
    "-4": 8,
    "-5": 2,
    "-6": 3,
    "-7": 8
};

interface SwayableSprite extends Sprite {
    _timeOffset?: number;
    _treeStrength?: number;
    _drawHeight?: number;
    _baseDx?: number;
}

export const StageCanvasViewer: React.FC<StageCanvasViewerProps> = ({ 
    stageId, 
    gateway, 
    toggles, 
    routeToggles,
    onRoutesLoaded,
    onStatusChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<Application | null>(null);
    const webglWaterRenderer = useMemo(() => new WebGLWaterRenderer(), []);
    const routesRenderer = useMemo(() => new RoutesRenderer(), []);
    const spriteCache = useRef(new Map<string, HTMLCanvasElement>());
    const pixiTextureCache = useRef(new Map<string, Texture>());

    // Display objects refs
    const bgSpriteRef = useRef<Sprite | null>(null);
    const letterboxRef = useRef<Graphics | null>(null);
    const spritesContainerRef = useRef<Container | null>(null);
    const routesGraphicsRef = useRef<Graphics | null>(null);
    const hudSpriteRef = useRef<Sprite | null>(null);
    const animatedTreeSpritesRef = useRef<SwayableSprite[]>([]);

    // Textures for background and water
    const bgTextureRef = useRef<Texture | null>(null);
    const waterTextureRef = useRef<Texture | null>(null);

    // Callbacks refs
    const onRoutesLoadedRef = useRef(onRoutesLoaded);
    const onStatusChangeRef = useRef(onStatusChange);

    useEffect(() => {
        onRoutesLoadedRef.current = onRoutesLoaded;
        onStatusChangeRef.current = onStatusChange;
    }, [onRoutesLoaded, onStatusChange]);

    // Scene state ref
    const sceneRef = useRef({
        currentImageData: null as ImageData | null,
        bgCanvas: null as HTMLCanvasElement | null,
        treeInstances: [] as SpriteInstance[],
        rockInstances: [] as SpriteInstance[],
        bridgeInstances: [] as SpriteInstance[],
        objectInstances: [] as SpriteInstance[],
        sortedInstances: [] as SpriteInstance[],
        sortedInstancesKey: ''
    });

    const togglesRef = useRef({ toggles, routeToggles });

    useEffect(() => {
        togglesRef.current = { toggles, routeToggles };
    }, [toggles, routeToggles]);

    // Apply route toggles to the RouteRenderer directly when they change
    useEffect(() => {
        const routes = routesRenderer.getRoutes();
        if (routes.length === routeToggles.length) {
            routes.forEach((r, idx) => r.visible = routeToggles[idx].visible);
        }
    }, [routeToggles, routesRenderer]);

    // Init Shader
    useEffect(() => {
        const initShader = async () => {
            try {
                if (onStatusChangeRef.current) onStatusChangeRef.current("Extracting shader...");
                const shaderText = await gateway.getWaterShader();
                if (shaderText) {
                    webglWaterRenderer.initShaders(shaderText);
                }
                if (onStatusChangeRef.current) onStatusChangeRef.current("Shader loaded.");
            } catch (e: any) {
                if (onStatusChangeRef.current) onStatusChangeRef.current("Error initializing shader: " + e.message);
                console.error(e);
            }
        };
        initShader();
    }, [gateway, webglWaterRenderer]);

    // Initialize PixiJS Application
    useEffect(() => {
        let isMounted = true;
        let app: Application | null = null;

        const initPixi = async () => {
            if (!canvasRef.current) return;

            app = new Application();
            await app.init({
                canvas: canvasRef.current,
                width: 1024,
                height: 768,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
                backgroundColor: 0x000000
            });

            if (!isMounted) {
                app.destroy(true);
                return;
            }

            // Cap framerate
            app.ticker.maxFPS = 30;

            appRef.current = app;

            const bgSprite = new Sprite();
            const letterbox = new Graphics();
            const spritesContainer = new Container();
            const routesGraphics = new Graphics();
            const hudSprite = new Sprite();

            app.stage.addChild(bgSprite);
            app.stage.addChild(letterbox);
            app.stage.addChild(spritesContainer);
            app.stage.addChild(routesGraphics);
            app.stage.addChild(hudSprite);

            bgSpriteRef.current = bgSprite;
            letterboxRef.current = letterbox;
            spritesContainerRef.current = spritesContainer;
            routesGraphicsRef.current = routesGraphics;
            hudSpriteRef.current = hudSprite;

            // Pixi Ticker for water animation and tree sway
            app.ticker.add(() => {
                const { toggles: t } = togglesRef.current;
                const scene = sceneRef.current;

                if (!scene.currentImageData) return;

                let isAnimating = false;

                // 1. Water Texture update (only when water is active)
                if (t.showWater && waterTextureRef.current) {
                    webglWaterRenderer.updateAndDraw(t.showAnimations);
                    waterTextureRef.current.source.update();
                    if (bgSprite.texture !== waterTextureRef.current) {
                        bgSprite.texture = waterTextureRef.current;
                    }
                    if (t.showAnimations) isAnimating = true;
                } else if (bgTextureRef.current) {
                    if (bgSprite.texture !== bgTextureRef.current) {
                        bgSprite.texture = bgTextureRef.current;
                    }
                }

                // 2. Tree swaying animation (only when animations active)
                if (t.showAnimations && animatedTreeSpritesRef.current.length > 0) {
                    isAnimating = true;
                    const timeSec = performance.now() / 1000.0;
                    for (const sprite of animatedTreeSpritesRef.current) {
                        if (sprite._timeOffset !== undefined && sprite._treeStrength !== undefined && sprite._drawHeight !== undefined && sprite._baseDx !== undefined) {
                            const speed = 0.75;
                            const baseSway = Math.sin((timeSec * speed) + sprite._timeOffset);
                            const swayAngle = baseSway * 0.04 * sprite._treeStrength;
                            sprite.skew.x = swayAngle;
                            sprite.x = sprite._baseDx - (swayAngle * sprite._drawHeight);
                        }
                    }
                } else if (animatedTreeSpritesRef.current.length > 0) {
                    for (const sprite of animatedTreeSpritesRef.current) {
                        sprite.skew.x = 0;
                        if (sprite._baseDx !== undefined) {
                            sprite.x = sprite._baseDx;
                        }
                    }
                }

                // If no active animations, pause ticker to conserve CPU
                if (!isAnimating && appRef.current) {
                    appRef.current.ticker.stop();
                }
            });
        };

        initPixi();

        return () => {
            isMounted = false;
            if (app) {
                app.destroy(true);
                appRef.current = null;
            }
        };
    }, [webglWaterRenderer, routesRenderer]);

    // Update scene objects and dimensions when toggles or scene state change
    const updatePixiScene = () => {
        const app = appRef.current;
        const scene = sceneRef.current;
        const { toggles: t } = togglesRef.current;
        const spritesContainer = spritesContainerRef.current;
        const bgSprite = bgSpriteRef.current;
        const letterbox = letterboxRef.current;
        const hudSprite = hudSpriteRef.current;
        const routesGraphics = routesGraphicsRef.current;

        if (!app || !scene.currentImageData || !spritesContainer || !bgSprite || !letterbox || !hudSprite || !routesGraphics) {
            return;
        }

        const W = scene.currentImageData.width;
        let H = scene.currentImageData.height;
        if (t.showHudBar) {
            H = Math.round(W * (9 / 16));
        }

        if (app.renderer.width !== W || app.renderer.height !== H) {
            app.renderer.resize(W, H);
        }

        // Background texture
        if (t.showWater && waterTextureRef.current) {
            bgSprite.texture = waterTextureRef.current;
        } else if (bgTextureRef.current) {
            bgSprite.texture = bgTextureRef.current;
        }

        // Letterbox bar at bottom if H > bg image height
        if (H > scene.currentImageData.height) {
            letterbox.clear();
            letterbox.rect(0, scene.currentImageData.height, W, H - scene.currentImageData.height);
            letterbox.fill({ color: 0x000000 });
            letterbox.visible = true;
        } else {
            letterbox.visible = false;
            letterbox.clear();
        }

        // HUD Bar
        if (t.showHudBar && spriteCache.current.has('hud_bar')) {
            const barCanvas = spriteCache.current.get('hud_bar')!;
            let baseHudTexture = pixiTextureCache.current.get('hud_bar');
            if (!baseHudTexture) {
                baseHudTexture = Texture.from(barCanvas);
                pixiTextureCache.current.set('hud_bar', baseHudTexture);
            }

            const sw = Math.min(W, 2048);
            const sx = (2048 - sw) / 2;
            const dx = (W - sw) / 2;

            const hudFrame = new Texture({
                source: baseHudTexture.source,
                frame: new Rectangle(sx, 0, sw, 128)
            });

            hudSprite.texture = hudFrame;
            hudSprite.x = dx;
            hudSprite.y = H - 113;
            hudSprite.width = sw;
            hudSprite.height = 128;
            hudSprite.visible = true;
        } else {
            hudSprite.visible = false;
        }

        // Render routes (on-demand only, not every tick!)
        if (t.showRoutes) {
            routesGraphics.visible = true;
            routesRenderer.draw(routesGraphics);
        } else {
            routesGraphics.visible = false;
            routesGraphics.clear();
        }

        // Rebuild sorted instances list
        const key = `${t.showBridges ? 1 : 0}${t.showTrees ? 1 : 0}${t.showRocks ? 1 : 0}${t.showObjects ? 1 : 0}`;
        if (scene.sortedInstancesKey !== key) {
            const allInstances: SpriteInstance[] = [];
            if (t.showBridges) allInstances.push(...scene.bridgeInstances);
            if (t.showTrees) allInstances.push(...scene.treeInstances);
            if (t.showRocks) allInstances.push(...scene.rockInstances);
            if (t.showObjects) allInstances.push(...scene.objectInstances);

            allInstances.sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));
            scene.sortedInstances = allInstances;
            scene.sortedInstancesKey = key;

            // Rebuild PixiJS Sprites container
            spritesContainer.removeChildren();
            animatedTreeSpritesRef.current = [];

            for (const inst of scene.sortedInstances) {
                try {
                    const sheetCanvas = spriteCache.current.get(inst.type);
                    const meta = SPRITE_SHEETS[inst.type];
                    if (!sheetCanvas || !meta) continue;

                    const spriteWidth = meta.w;
                    const spriteHeight = meta.h;
                    let cols = Math.floor(sheetCanvas.width / spriteWidth);
                    let rows = Math.floor(sheetCanvas.height / spriteHeight);

                    if (gridOverrides[inst.type]) {
                        cols = gridOverrides[inst.type].cols;
                        rows = gridOverrides[inst.type].rows;
                    }

                    const totalFrames = cols * rows;

                    let ani = inst.ani;
                    if (inst.type.startsWith("rock") && ani < 0) {
                        ani = NEGATIVE_ROCK_MAPPING[ani] ?? 0;
                    }
                    ani = Math.max(0, ani) % Math.max(1, totalFrames);

                    let row = Math.floor(ani / cols);
                    let col = ani % cols;

                    const sx = col * spriteWidth;
                    row = (rows - 1) - row;
                    const sy = row * spriteHeight;

                    const scale = inst.scale ?? 1.0;
                    const drawWidth = spriteWidth * scale;
                    const drawHeight = spriteHeight * scale;

                    const dx = inst.x - (drawWidth / 2);
                    const dy = inst.y - (drawHeight / 2);

                    let baseTexture = pixiTextureCache.current.get(inst.type);
                    if (!baseTexture) {
                        baseTexture = Texture.from(sheetCanvas);
                        pixiTextureCache.current.set(inst.type, baseTexture);
                    }

                    const frameTexture = new Texture({
                        source: baseTexture.source,
                        frame: new Rectangle(sx, sy, spriteWidth, spriteHeight)
                    });

                    const sprite = new Sprite(frameTexture);
                    sprite.x = dx;
                    sprite.y = dy;
                    sprite.width = drawWidth;
                    sprite.height = drawHeight;

                    // Native GPU Tinting with clamping
                    const isTinted = inst.r < 0.99 || inst.g < 0.99 || inst.b < 0.99;
                    if (isTinted) {
                        const rFixed = Math.min(255, Math.max(0, Math.round((Number.isNaN(inst.r) ? 1 : inst.r) * 255)));
                        const gFixed = Math.min(255, Math.max(0, Math.round((Number.isNaN(inst.g) ? 1 : inst.g) * 255)));
                        const bFixed = Math.min(255, Math.max(0, Math.round((Number.isNaN(inst.b) ? 1 : inst.b) * 255)));

                        sprite.tint = (rFixed << 16) | (gFixed << 8) | bFixed;
                    }

                    if (inst.alpha !== undefined && inst.alpha < 0.99) {
                        sprite.alpha = inst.alpha;
                    }

                    if (inst.type.startsWith("tree_")) {
                        if ((inst as any)._timeOffset === undefined) {
                            const rand1 = Math.abs((Math.sin(inst.x * 12.9898 + inst.y * 78.233) * 43758.5453) % 1.0);
                            const rand2 = Math.abs((Math.cos(inst.x * 4.141 + inst.y * 67.342) * 23145.2413) % 1.0);
                            (inst as any)._timeOffset = rand1 * Math.PI * 2;
                            (inst as any)._treeStrength = 0.4 + (rand2 * 0.6);
                        }

                        const swaySprite = sprite as SwayableSprite;
                        swaySprite._timeOffset = (inst as any)._timeOffset;
                        swaySprite._treeStrength = (inst as any)._treeStrength;
                        swaySprite._drawHeight = drawHeight;
                        swaySprite._baseDx = dx;
                        animatedTreeSpritesRef.current.push(swaySprite);
                    }

                    spritesContainer.addChild(sprite);
                } catch (err) {
                    console.error("Error creating sprite for instance:", inst, err);
                }
            }
        }

        // Render static frame once, and start ticker only if animations or water active
        app.render();

        if ((t.showAnimations || t.showWater) && !app.ticker.started) {
            app.ticker.start();
        } else if (!t.showAnimations && !t.showWater && app.ticker.started) {
            app.ticker.stop();
        }
    };

    useEffect(() => {
        updatePixiScene();
    }, [toggles, routeToggles]);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            try {
                if (onStatusChangeRef.current) onStatusChangeRef.current(`Extracting Stage ${stageId} background...`);
                
                const bgImgData = await gateway.getStageBackground(stageId);
                if (!bgImgData) {
                    throw new Error(`Background for stage ${stageId} not found.`);
                }

                sceneRef.current.currentImageData = bgImgData;
                const bgCanvas = document.createElement('canvas');
                bgCanvas.width = bgImgData.width;
                bgCanvas.height = bgImgData.height;
                bgCanvas.getContext('2d')!.putImageData(bgImgData, 0, 0);
                sceneRef.current.bgCanvas = bgCanvas;
                bgTextureRef.current = Texture.from(bgCanvas);

                webglWaterRenderer.setStageTexture(bgImgData);
                
                const waveImgData = await gateway.getWaveTexture();
                if (waveImgData) {
                    webglWaterRenderer.setWaveTexture(waveImgData);
                }

                waterTextureRef.current = Texture.from(webglWaterRenderer.getCanvas());

                if (onStatusChangeRef.current) onStatusChangeRef.current(`Extracting Stage ${stageId} routes...`);
                const routes = await gateway.getStageRoutes(stageId);
                routesRenderer.clear();
                if (routes) {
                    routesRenderer.setRoutes(routes);
                    if (onRoutesLoadedRef.current) {
                        onRoutesLoadedRef.current(routes.map((r: Route, idx: number) => ({ id: idx, color: r.color, visible: true })));
                    }
                } else if (onRoutesLoadedRef.current) {
                    onRoutesLoadedRef.current([]);
                }

                if (onStatusChangeRef.current) onStatusChangeRef.current(`Extracting Stage ${stageId} trees and objects...`);
                const decorations = await gateway.getStageDecorations(stageId);
                if (decorations) {
                    sceneRef.current.sortedInstancesKey = '';
                    pixiTextureCache.current.clear();
                    sceneRef.current.treeInstances = decorations.trees;
                    sceneRef.current.bridgeInstances = decorations.bridges;
                    sceneRef.current.objectInstances = decorations.objects;
                    sceneRef.current.rockInstances = decorations.rocks;

                    if (onStatusChangeRef.current) onStatusChangeRef.current(`Loading sprite sheets...`);
                    for (const t of Array.from(decorations.typesToLoad)) {
                        const spritePath = SPRITE_PATHS[t];
                        if (!spriteCache.current.has(t) && spritePath) {
                            const imgData = await gateway.getSpriteSheet(t, spritePath);
                            if (imgData) {
                                const canvas = document.createElement('canvas');
                                canvas.width = imgData.width;
                                canvas.height = imgData.height;
                                canvas.getContext('2d')!.putImageData(imgData, 0, 0);
                                spriteCache.current.set(t, canvas);
                            }
                        }
                    }
                }

                if (onStatusChangeRef.current) onStatusChangeRef.current(`Successfully loaded Stage ${stageId}!`);
                updatePixiScene();
            } catch (e: any) {
                if (onStatusChangeRef.current) onStatusChangeRef.current("Error: " + e.message);
                console.error(e);
                
                sceneRef.current.currentImageData = null;
                sceneRef.current.treeInstances = [];
                sceneRef.current.rockInstances = [];
                sceneRef.current.bridgeInstances = [];
                sceneRef.current.objectInstances = [];
                updatePixiScene();
            }
        };

        loadData();
    }, [stageId, gateway, webglWaterRenderer, routesRenderer]);

    return (
        <div className="canvas-container">
            <canvas ref={canvasRef} id="stageCanvas"></canvas>
        </div>
    );
};
