import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WaveInfo } from './stage_parser.js';
import { GameDataGateway, SpriteInstance, DEFAULT_ANIMATION_FPS } from './editor_api.js';
import { WebGLWaterRenderer } from './webgl_water.js';
import { RoutesRenderer, Route } from './routes_renderer.js';
import { Application, Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import type { PreviewCommand } from './stage_inspector_app.js';
import { ENEMY_KIND_MAP, ENEMY_GRID_DIVISIONS } from './enemy_data.js';

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
    previewCommand?: PreviewCommand | null;
    onPreviewEnd?: () => void;
    onActiveWaveChange?: (waveIndex: number | null) => void;
    onActiveRouteTogglesChange?: (toggles: RouteToggle[] | null) => void;
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
    const animatedTreeSpritesRef = useRef<SwayableSprite[]>([]);

    // Preview state refs
    interface QueuedMonsterSpawn {
        spawnTime: number;
        type: string;
        routeIndex: number;
        carry: boolean;
        isOnFire: boolean;
        isCold: boolean;
    }

    interface ActiveMonster {
        sprite: Sprite;
        balloon?: Sprite;
        routeIndex: number;
        ratio: number;
        routeLength: number;
        maxSpeed: number;
        speedMultiplier: number;
        frameTextures: Texture[];
        balloonTextures?: Texture[];
        elapsedTime: number;
        kindInfo: any;
        isOnFire: boolean;
        isCold: boolean;
    }

    const activeMonstersRef = useRef<ActiveMonster[]>([]);
    const queuedSpawnsRef = useRef<QueuedMonsterSpawn[]>([]);
    const allWavesRef = useRef<WaveInfo[]>([]);
    const pendingWavesRef = useRef<WaveInfo[]>([]);
    const currentWaveRef = useRef<WaveInfo | null>(null);
    const waveDelayTimerRef = useRef<number>(0);
    const waveTimeRef = useRef<number>(0);
    const previewTimeRef = useRef<number>(0);
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
        if (isPreviewingRef.current && currentWaveRef.current) {
            activeRouteIndices = new Set(
                currentWaveRef.current.subWaves.map(sw => sw.route ?? 0)
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

                // 1. Water Texture update (only when water + animations are active)
                if (t.showWater && waterTextureRef.current && t.showAnimations) {
                    webglWaterRenderer.updateAndDraw(true);
                    waterTextureRef.current.source.update();
                    if (bgSprite.texture !== waterTextureRef.current) {
                        bgSprite.texture = waterTextureRef.current;
                    }
                } else if (bgTextureRef.current && bgSprite.texture !== bgTextureRef.current) {
                    bgSprite.texture = bgTextureRef.current;
                }

                // 2. Tree swaying animation (only when animations active)
                if (t.showAnimations && animatedTreeSpritesRef.current.length > 0) {
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

                // 3. Wave Preview Animation Step
                if (isPreviewingRef.current) {
                    const dt = ticker.elapsedMS / 1000.0;

                    // Check if we need to start the next wave
                    if (!currentWaveRef.current && pendingWavesRef.current.length > 0) {
                        if (waveDelayTimerRef.current > 0) {
                            waveDelayTimerRef.current -= dt;
                        } else {
                            // Start wave!
                            const nextWave = pendingWavesRef.current.shift()!;
                            currentWaveRef.current = nextWave;
                            updateRouteVisibility();
                            
                            const waveIdx = allWavesRef.current.indexOf(nextWave);
                            if (onActiveWaveChangeRef.current) {
                                onActiveWaveChangeRef.current(waveIdx >= 0 ? waveIdx : null);
                            }
                            
                            const queued: QueuedMonsterSpawn[] = [];
                            const waveStartTime = 0;

                            for (const subWave of nextWave.subWaves) {
                                const subWaveStart = waveStartTime + (subWave.startTime ?? 0);
                                const count = subWave.count;
                                const interval = subWave.weight ?? 1.0;
                                const routeIndex = subWave.route ?? 0;
                                const monsterDef = subWave.monster;

                                for (let k = 0; k < count; k++) {
                                    queued.push({
                                        spawnTime: subWaveStart + (k * interval),
                                        type: monsterDef.id,
                                        routeIndex,
                                        carry: subWave.carry ?? false,
                                        isOnFire: monsterDef.isOnFire,
                                        isCold: monsterDef.isCold
                                    });
                                }
                            }

                            queued.sort((a, b) => a.spawnTime - b.spawnTime);
                            queuedSpawnsRef.current = queued;
                            waveTimeRef.current = 0;
                        }
                    }

                    if (currentWaveRef.current) {
                        waveTimeRef.current += dt;

                        const queued = queuedSpawnsRef.current;
                        const active = activeMonstersRef.current;
                        const container = enemiesContainerRef.current;

                        // Spawn ready monsters for current wave
                        while (queued.length > 0 && queued[0].spawnTime <= waveTimeRef.current) {
                            const item = queued.shift()!;
                            const kindInfo = ENEMY_KIND_MAP[item.type] || ENEMY_KIND_MAP["basic_ground"];
                            const texs = loadedEnemyTexturesRef.current.get(kindInfo.sprite_type);
                            const balloonTexs = loadedEnemyTexturesRef.current.get("balloon");

                            if (texs && texs.length > 0 && container) {
                                const sprite = new Sprite(texs[0]);
                                sprite.anchor.set(0.5, 0.5);

                                const scale = kindInfo.screen_size ?? 1.0;
                                sprite.scale.set(scale, scale);

                                if (item.isOnFire) {
                                    sprite.tint = 0xFF8844;
                                } else if (item.isCold) {
                                    sprite.tint = 0x88CCFF;
                                }

                                let balloon: Sprite | undefined = undefined;

                                if (item.carry && balloonTexs && balloonTexs.length > 0) {
                                    balloon = new Sprite(balloonTexs[0]);
                                    balloon.anchor.set(0.5, 0.5);
                                    balloon.rotation = 0;
                                    container.addChild(balloon);
                                }

                                container.addChild(sprite);

                                const routeLength = routesRenderer.getRouteLength(item.routeIndex);
                                let speedMultiplier = 1.0;
                                if (item.isOnFire) speedMultiplier = 1.5;
                                else if (item.isCold) speedMultiplier = 0.5;

                                active.push({
                                    sprite,
                                    balloon,
                                    routeIndex: item.routeIndex,
                                    ratio: 0.0,
                                    routeLength,
                                    maxSpeed: kindInfo.max_speed,
                                    speedMultiplier,
                                    frameTextures: texs,
                                    balloonTextures: balloonTexs,
                                    elapsedTime: 0.0,
                                    kindInfo,
                                    isOnFire: item.isOnFire,
                                    isCold: item.isCold
                                });
                            }
                        }

                        // Advance active monsters
                        for (let i = active.length - 1; i >= 0; i--) {
                            const m = active[i];
                            const dRatio = (m.maxSpeed * m.speedMultiplier / m.routeLength) * dt;
                            m.ratio += dRatio;
                            m.elapsedTime += dt;

                            if (m.ratio >= 1.0) {
                                if (m.sprite.parent) m.sprite.parent.removeChild(m.sprite);
                                m.sprite.destroy();

                                if (m.balloon) {
                                    if (m.balloon.parent) m.balloon.parent.removeChild(m.balloon);
                                    m.balloon.destroy();
                                }
                                active.splice(i, 1);
                            } else {
                                const pos = routesRenderer.getPointOnRoute(m.routeIndex, m.ratio);
                                const nextPos = routesRenderer.getPointOnRoute(m.routeIndex, Math.min(1.0, m.ratio + 0.005));

                                if (pos) {
                                    let posX = pos.x;
                                    let posY = pos.y;
                                    const scale = m.kindInfo.screen_size ?? 1.0;
                                    let scaleX = scale;
                                    let scaleY = scale;
                                    let rot = 0.0;

                                    // Direction Mirroring (flip horizontally if moving left)
                                    if (nextPos && (nextPos.x - pos.x) < -0.01) {
                                        scaleX = -scale;
                                    }

                                    // Frame Tileset Cycling
                                    const fps = m.kindInfo.fps ?? DEFAULT_ANIMATION_FPS;
                                    const loopStyle = m.kindInfo.loop_style ?? 'linear';
                                    const numFrames = m.frameTextures.length;
                                    if (numFrames > 1 && fps > 0) {
                                        let frameIdx = 0;
                                        if (loopStyle === 'pingpong') {
                                            const cycleLen = 2 * (numFrames - 1);
                                            const step = Math.floor(m.elapsedTime * fps * m.speedMultiplier) % cycleLen;
                                            frameIdx = step < numFrames ? step : cycleLen - step;
                                        } else {
                                            frameIdx = Math.floor(m.elapsedTime * fps * m.speedMultiplier) % numFrames;
                                        }

                                        if (m.sprite.texture !== m.frameTextures[frameIdx]) {
                                            m.sprite.texture = m.frameTextures[frameIdx];
                                        }
                                    }

                                    // Balloon: Frame 0 (3 balloons), static during preview, 10px up from monster center
                                    if (m.balloon) {
                                        m.balloon.x = posX;
                                        m.balloon.y = posY - 10;
                                        m.balloon.rotation = 0;
                                        m.balloon.zIndex = pos.y - 0.1;
                                    }

                                    // Procedural Transforms by Anim Type
                                    const animType = m.kindInfo.anim_type;

                                    if (animType === 'rock') {
                                        // Giant rocking stride
                                        rot = Math.sin(m.elapsedTime * 6.0) * 0.15;
                                    } else if (animType === 'boss_hop') {
                                        // Boss 1 parabolic hopping + ground squish
                                        const hopY = Math.abs(Math.sin(m.elapsedTime * 4.0)) * 40;
                                        posY -= hopY;
                                        const squish = Math.cos(m.elapsedTime * 8.0) * 0.15;
                                        if (hopY < 5) {
                                            scaleY = scale * (1.0 - Math.abs(squish));
                                        }
                                    } else if (animType === 'fly' || animType === 'boss_fly') {
                                        // Flying float (Bats, Sycamores, Boss 4)
                                        // Offset base posY because the texture flip puts their pixels at the bottom of a tall frame
                                        posY -= (animType === 'boss_fly') ? 64 : 48;
                                        const floatAmp = (animType === 'boss_fly') ? 8.0 : 6.0;
                                        posY -= Math.sin(m.elapsedTime * 3.0) * floatAmp;
                                    } else if (animType === 'scuttle') {
                                        // Spider micro-jitter
                                        posX += Math.sin(m.elapsedTime * 20.0) * 1.5;
                                    } else if (animType === 'boss_pulse') {
                                        // Boss 2 golem pulse
                                        scaleY = scale * (1.0 + Math.sin(m.elapsedTime * 4.0) * 0.10);
                                    }

                                    m.sprite.x = posX;
                                    m.sprite.y = posY;
                                    m.sprite.scale.set(scaleX, scaleY);
                                    m.sprite.rotation = rot;
                                    m.sprite.zIndex = pos.y; // Ground zIndex

                                    if (m.balloon) {
                                        m.balloon.x = posX;
                                        m.balloon.y = posY - 10;
                                        m.balloon.zIndex = pos.y - 0.1;
                                    }
                                }
                            }
                        }

                        // Check if current wave is finished (all spawned AND all cleared)
                        if (queued.length === 0 && active.length === 0) {
                            currentWaveRef.current = null;
                            updateRouteVisibility();
                            if (onActiveWaveChangeRef.current) {
                                onActiveWaveChangeRef.current(null);
                            }

                            if (pendingWavesRef.current.length > 0) {
                                const nextWave = pendingWavesRef.current[0];
                                waveDelayTimerRef.current = nextWave.startTime !== undefined ? nextWave.startTime : 5.0;
                            } else {
                                isPreviewingRef.current = false;
                                if (onPreviewEndRef.current) {
                                    onPreviewEndRef.current();
                                }
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

    // Handle Wave Preview Commands
    useEffect(() => {
        let isCancelled = false;

        const stopAndClearPreview = () => {
            for (const m of activeMonstersRef.current) {
                if (m.sprite.parent) m.sprite.parent.removeChild(m.sprite);
                m.sprite.destroy();
                if (m.balloon) {
                    if (m.balloon.parent) m.balloon.parent.removeChild(m.balloon);
                    m.balloon.destroy();
                }
            }
            activeMonstersRef.current = [];
            queuedSpawnsRef.current = [];
            pendingWavesRef.current = [];
            currentWaveRef.current = null;
            waveDelayTimerRef.current = 0;
            waveTimeRef.current = 0;
            previewTimeRef.current = 0;
            isPreviewingRef.current = false;
            if (onActiveWaveChangeRef.current) {
                onActiveWaveChangeRef.current(null);
            }
            updateRouteVisibility();
        };

        stopAndClearPreview();

        if (!previewCommand) return;

        const runPreview = async () => {
            const settings = await gateway.getStageSettings(stageId);
            if (!settings || isCancelled) return;

            allWavesRef.current = settings.waves;

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
                            const fw = imgData.width / div.cols;
                            const fh = imgData.height / div.rows;
                            // ignore target_row for now, just animate all rows
                            //const startRow = div.target_row !== undefined ? div.target_row : 0;
                            //const endRow = div.target_row !== undefined ? div.target_row : div.rows;
                            //for (let r = endRow - 1; r >= startRow; r--) {  //< Always animate bottom-to-top.
                            for (let r = div.rows - 1; r > 0; r--) {  //< Always populate frames bottom-to-top.
                                for (let c = 0; c < div.cols; c++) {
                                    frames.push(new Texture({
                                        source: fullTexture.source,
                                        frame: new Rectangle(c * fw, r * fh, fw, fh)
                                    }));
                                }
                            }
                        } else {
                            frames.push(fullTexture);
                        }
                        loadedEnemyTexturesRef.current.set(spriteType, frames);
                    }
                }
            }

            if (isCancelled) return;

            pendingWavesRef.current = [...wavesToRun];
            currentWaveRef.current = null;
            
            const firstWave = wavesToRun[0];
            waveDelayTimerRef.current = firstWave.startTime !== undefined ? firstWave.startTime : 0.0;

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
