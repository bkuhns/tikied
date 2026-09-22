import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WaveInfo } from '../core/stage_parser.js';
import { GameDataGateway, SpriteInstance, DEFAULT_ANIMATION_FPS } from '../utils/editor_api.js';
import { WebGLWaterRenderer } from '../core/webgl_water.js';
import { RoutesRenderer, Route } from '../core/routes_renderer.js';
import { Application, Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import type { PreviewCommand } from '../pages/stage_inspector_page.js';
import { ENEMY_KIND_MAP, ENEMY_GRID_DIVISIONS } from '../data/enemy_data.js';
import { TextureUtils, TreeSprite, StaticSprite } from '../utils/pixi_utils.js';
import { Monster } from '../core/entities.js';
import { WaveDirector, QueuedMonsterSpawn } from '../core/wave_director.js';
import { SPRITE_SHEETS, SPRITE_PATHS, NEGATIVE_ROCK_MAPPING, gridOverrides, SpriteMeta } from '../data/sprite_data.js';

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

interface StageViewerProps {
    stageId: number;
    gateway: GameDataGateway;
    toggles: ViewerToggles;
    routeToggles: RouteToggle[];
    previewCommand?: PreviewCommand | null;
    onPreviewEnd?: () => void;
    onActiveWaveChange?: (waveIndex: number | null) => void;
    onActiveRouteTogglesChange?: (toggles: RouteToggle[] | null) => void;
    onRoutesLoaded?: (routes: RouteToggle[]) => void;
    onStatusChange?: (status: string) => void;
}



export const StageViewer: React.FC<StageViewerProps> = ({ 
    stageId, 
    gateway, 
    toggles, 
    routeToggles,
    previewCommand,
    onPreviewEnd,
    onActiveWaveChange,
    onActiveRouteTogglesChange,
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
    const enemiesContainerRef = useRef<Container | null>(null);
    const routesGraphicsRef = useRef<Graphics | null>(null);
    const hudSpriteRef = useRef<Sprite | null>(null);
    const animatedTreeSpritesRef = useRef<TreeSprite[]>([]);

    // Preview state refs
    const activeMonstersRef = useRef<Monster[]>([]);
    const waveDirectorRef = useRef<WaveDirector>(new WaveDirector());
    const isPreviewingRef = useRef<boolean>(false);
    const loadedEnemyTexturesRef = useRef<Map<string, Texture[]>>(new Map());

    // Textures for background and water
    const bgTextureRef = useRef<Texture | null>(null);
    const waterTextureRef = useRef<Texture | null>(null);

    // Callbacks refs
    const onRoutesLoadedRef = useRef(onRoutesLoaded);
    const onStatusChangeRef = useRef(onStatusChange);
    const onPreviewEndRef = useRef(onPreviewEnd);
    const onActiveWaveChangeRef = useRef(onActiveWaveChange);
    const onActiveRouteTogglesChangeRef = useRef(onActiveRouteTogglesChange);

    useEffect(() => {
        onRoutesLoadedRef.current = onRoutesLoaded;
        onStatusChangeRef.current = onStatusChange;
        onPreviewEndRef.current = onPreviewEnd;
        onActiveWaveChangeRef.current = onActiveWaveChange;
        onActiveRouteTogglesChangeRef.current = onActiveRouteTogglesChange;
    }, [onRoutesLoaded, onStatusChange, onPreviewEnd, onActiveWaveChange, onActiveRouteTogglesChange]);

    const sceneRef = useRef({
        currentImageData: null as ImageData | null,
        bgCanvas: null as HTMLCanvasElement | null,
        treeInstances: [] as SpriteInstance[],
        rockInstances: [] as SpriteInstance[],
        bridgeInstances: [] as SpriteInstance[],
        objectInstances: [] as SpriteInstance[],
        sortedInstances: [] as SpriteInstance[],
        sortedInstancesKey: '',
        environmentPixiSprites: [] as Sprite[]
    });

    const togglesRef = useRef({ toggles, routeToggles });

    useEffect(() => {
        togglesRef.current = { toggles, routeToggles };
    }, [toggles, routeToggles]);

    const updateRouteVisibility = () => {
        const routes = routesRenderer.getRoutes();
        if (routes.length === 0) return;

        let activeRouteIndices: Set<number> | null = null;
        if (isPreviewingRef.current && waveDirectorRef.current.currentWave) {
            activeRouteIndices = new Set(
                waveDirectorRef.current.currentWave.subWaves.map(sw => sw.route ?? 0)
            );
        }

        const effectiveToggles: RouteToggle[] = [];

        routes.forEach((r, idx) => {
            const userVisible = routeToggles[idx] ? routeToggles[idx].visible : true;
            const color = routeToggles[idx] ? routeToggles[idx].color : (r.color || '#ffffff');
            const isVisible = activeRouteIndices !== null ? (userVisible && activeRouteIndices.has(idx)) : userVisible;

            r.visible = isVisible;
            effectiveToggles.push({
                id: idx + 1,
                color,
                visible: isVisible
            });
        });

        if (routesGraphicsRef.current) {
            if (togglesRef.current.toggles.showRoutes) {
                routesGraphicsRef.current.visible = true;
                routesRenderer.draw(routesGraphicsRef.current);
            } else {
                routesGraphicsRef.current.visible = false;
                routesGraphicsRef.current.clear();
            }
        }

        if (onActiveRouteTogglesChangeRef.current) {
            if (activeRouteIndices !== null) {
                onActiveRouteTogglesChangeRef.current(effectiveToggles);
            } else {
                onActiveRouteTogglesChangeRef.current(null);
            }
        }
    };

    // Apply route toggles to the RouteRenderer directly when they change
    useEffect(() => {
        updateRouteVisibility();
    }, [routeToggles, toggles.showRoutes]);

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
                resolution: 1,
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
            spritesContainer.sortableChildren = true;
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
            enemiesContainerRef.current = spritesContainer; // Enemies now share the sortable sprites container
            routesGraphicsRef.current = routesGraphics;
            hudSpriteRef.current = hudSprite;

            // Pixi Ticker for water animation, tree sway, and wave preview
            app.ticker.add((ticker) => {
                const { toggles: t } = togglesRef.current;
                const scene = sceneRef.current;

                if (!scene.currentImageData) return;

                // 1. Water Texture update
                if (t.showWater && waterTextureRef.current && t.showAnimations) {
                    webglWaterRenderer.updateAndDraw(true);
                    waterTextureRef.current.source.update();
                    if (bgSprite.texture !== waterTextureRef.current) {
                        bgSprite.texture = waterTextureRef.current;
                    }
                } else if (bgTextureRef.current && bgSprite.texture !== bgTextureRef.current) {
                    bgSprite.texture = bgTextureRef.current;
                }

                const dt = ticker.elapsedMS / 1000.0;
                const timeSec = performance.now() / 1000.0;

                // 2. Tree swaying animation
                for (const tree of animatedTreeSpritesRef.current) {
                    tree.update(dt, timeSec, t.showAnimations);
                }

                // 3. Wave Preview Animation Step
            if (waveDirectorRef.current && isPreviewingRef.current) {
                waveDirectorRef.current.update(dt, () => activeMonstersRef.current.length);
                
                const active = activeMonstersRef.current;
                
                // Advance active monsters
                for (let i = active.length - 1; i >= 0; i--) {
                    const m = active[i];
                    if (m.isFinished()) {
                        m.destroy();
                        active.splice(i, 1);
                    } else {
                        const pos = routesRenderer.getPointOnRoute(m.routeIndex, m.ratio);
                        const nextPos = routesRenderer.getPointOnRoute(m.routeIndex, Math.min(1.0, m.ratio + 0.005));
                        
                        if (pos) {
                            const isFlipped = nextPos ? (nextPos.x - pos.x) < -0.01 : false;
                            m.update(dt, pos, isFlipped);
                        }
                    }
                }
            }

                // If animations and preview are off, pause ticker to conserve CPU
                if (!t.showAnimations && !isPreviewingRef.current && appRef.current) {
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

    // Handle Preview Command (Run Preview)
    useEffect(() => {
        let isCancelled = false;

        const stopAndClearPreview = () => {
            const active = activeMonstersRef.current;
            for (const m of active) {
                m.destroy();
            }
            activeMonstersRef.current = [];
            waveDirectorRef.current.stopPreview();
            isPreviewingRef.current = false;
            updateRouteVisibility();
            if (onActiveWaveChangeRef.current) {
                onActiveWaveChangeRef.current(null);
            }
        };

        stopAndClearPreview();

        if (!previewCommand) return;

        const runPreview = async () => {
            const settings = await gateway.getStageSettings(stageId);
            if (!settings || isCancelled) return;

            if (appRef.current && !appRef.current.ticker.started) {
                appRef.current.ticker.start();
            }

            let wavesToRun = settings.waves;
            if (previewCommand.type === 'WAVE' && previewCommand.waveIndex !== undefined) {
                const w = settings.waves[previewCommand.waveIndex];
                wavesToRun = w ? [w] : [];
            }

            if (wavesToRun.length === 0) return;

            const requiredSpriteTypes = new Set<string>();
            requiredSpriteTypes.add("balloon");

            for (const wave of wavesToRun) {
                for (const subWave of wave.subWaves) {
                    const kindInfo = ENEMY_KIND_MAP[subWave.monster.id] || ENEMY_KIND_MAP["basic_ground"];
                    requiredSpriteTypes.add(kindInfo.sprite_type);
                }
            }

            for (const spriteType of requiredSpriteTypes) {
                if (!loadedEnemyTexturesRef.current.has(spriteType)) {
                    const imgData = await gateway.getEnemySpriteTexture(spriteType);
                    if (imgData && !isCancelled) {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgData.width;
                        canvas.height = imgData.height;
                        const ctx = canvas.getContext('2d');
                        ctx?.putImageData(imgData, 0, 0);
                        
                        const fullTexture = Texture.from(canvas);
                        const div = ENEMY_GRID_DIVISIONS[spriteType];
                        const frames: Texture[] = [];
                        if (div && div.cols && div.rows) {
                            frames.push(...TextureUtils.sliceSpriteSheet(fullTexture, imgData.width, imgData.height, div.rows, div.cols));
                        } else {
                            frames.push(fullTexture);
                        }
                        loadedEnemyTexturesRef.current.set(spriteType, frames);
                    }
                }
            }

            if (isCancelled) return;

            const wd = waveDirectorRef.current;
            wd.onSpawnMonster = (item: QueuedMonsterSpawn) => {
                const kindInfo = ENEMY_KIND_MAP[item.type] || ENEMY_KIND_MAP["basic_ground"];
                const bodyTextures = loadedEnemyTexturesRef.current.get(kindInfo.sprite_type);
                const balloonTextures = item.carry ? loadedEnemyTexturesRef.current.get("balloon") : undefined;

                if (bodyTextures && bodyTextures.length > 0 && enemiesContainerRef.current) {
                    const routeLength = routesRenderer.getRouteLength(item.routeIndex);
                    const monster = new Monster(
                        kindInfo,
                        bodyTextures,
                        balloonTextures,
                        item.routeIndex,
                        routeLength,
                        item.isOnFire,
                        item.isCold
                    );
                    enemiesContainerRef.current.addChild(monster.spriteContainer);
                    activeMonstersRef.current.push(monster);
                }
            };

            wd.onActiveWaveChange = (idx: number | null) => {
                if (onActiveWaveChangeRef.current) {
                    let absoluteIdx = idx;
                    if (idx !== null && previewCommand && previewCommand.type === 'WAVE' && previewCommand.waveIndex !== undefined) {
                        absoluteIdx = previewCommand.waveIndex;
                    }
                    onActiveWaveChangeRef.current(absoluteIdx);
                }
                updateRouteVisibility();
            };

            wd.onPreviewComplete = () => {
                isPreviewingRef.current = false;
                if (onPreviewEndRef.current) {
                    onPreviewEndRef.current();
                }
            };

            wd.startPreview(wavesToRun);
            isPreviewingRef.current = true;
        };

        runPreview();

        return () => {
            isCancelled = true;
            stopAndClearPreview();
        };
    }, [previewCommand, stageId, gateway]);

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
            webglWaterRenderer.updateAndDraw(t.showAnimations);
            waterTextureRef.current.source.update();
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

            const hudFrameKey = `hud_bar_frame_${sx}_0_${sw}_128`;
            let hudFrame = pixiTextureCache.current.get(hudFrameKey);
            if (!hudFrame) {
                hudFrame = new Texture({
                    source: baseHudTexture.source,
                    frame: new Rectangle(sx, 0, sw, 128)
                });
                pixiTextureCache.current.set(hudFrameKey, hudFrame);
            }

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
            for (const sprite of scene.environmentPixiSprites) {
                if (sprite.parent) sprite.parent.removeChild(sprite);
                sprite.destroy();
            }
            scene.environmentPixiSprites = [];
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

                    const frameKey = `${inst.type}_frame_${sx}_${sy}_${spriteWidth}_${spriteHeight}`;
                    let frameTexture = pixiTextureCache.current.get(frameKey);
                    if (!frameTexture) {
                        frameTexture = new Texture({
                            source: baseTexture.source,
                            frame: new Rectangle(sx, sy, spriteWidth, spriteHeight)
                        });
                        pixiTextureCache.current.set(frameKey, frameTexture);
                    }

                    let sprite: Sprite;
                    if (inst.type.startsWith("tree_")) {
                        if ((inst as any)._timeOffset === undefined) {
                            const rand1 = Math.abs((Math.sin(inst.x * 12.9898 + inst.y * 78.233) * 43758.5453) % 1.0);
                            const rand2 = Math.abs((Math.cos(inst.x * 4.141 + inst.y * 67.342) * 23145.2413) % 1.0);
                            (inst as any)._timeOffset = rand1 * Math.PI * 2;
                            (inst as any)._treeStrength = 0.4 + (rand2 * 0.6);
                        }

                        const swaySprite = new TreeSprite(
                            frameTexture,
                            (inst as any)._timeOffset,
                            (inst as any)._treeStrength,
                            drawHeight,
                            dx
                        );
                        animatedTreeSpritesRef.current.push(swaySprite);
                        sprite = swaySprite;
                    } else {
                        sprite = new StaticSprite(frameTexture);
                    }

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

                    sprite.zIndex = inst.z ?? inst.y;
                    spritesContainer.addChild(sprite);
                    scene.environmentPixiSprites.push(sprite);
                } catch (err) {
                    console.error("Error creating sprite for instance:", inst, err);
                }
            }
        }

        // Render static frame once, and start ticker only if animations active
        app.render();

        if (t.showAnimations && !app.ticker.started) {
            app.ticker.start();
        } else if (!t.showAnimations && app.ticker.started) {
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
