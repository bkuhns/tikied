import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameDataGateway, SpriteInstance } from './editor_api.js';
import { WebGLWaterRenderer } from './webgl_water.js';
import { RoutesRenderer, Route } from './routes_renderer.js';

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

// Global scratch canvas
let scratchCanvas: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;
if (typeof document !== 'undefined') {
    scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = 128;
    scratchCanvas.height = 128;
    scratchCtx = scratchCanvas.getContext('2d');
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
    const webglWaterRenderer = useMemo(() => new WebGLWaterRenderer(), []);
    const routesRenderer = useMemo(() => new RoutesRenderer(), []);
    const spriteCache = useRef(new Map<string, HTMLCanvasElement>());

    // Refs for callbacks
    const onRoutesLoadedRef = useRef(onRoutesLoaded);
    const onStatusChangeRef = useRef(onStatusChange);

    useEffect(() => {
        onRoutesLoadedRef.current = onRoutesLoaded;
        onStatusChangeRef.current = onStatusChange;
    }, [onRoutesLoaded, onStatusChange]);

    // Scene state ref
    const sceneRef = useRef({
        currentImageData: null as ImageData | null,
        treeInstances: [] as SpriteInstance[],
        rockInstances: [] as SpriteInstance[],
        bridgeInstances: [] as SpriteInstance[],
        objectInstances: [] as SpriteInstance[]
    });

    const togglesRef = useRef({ toggles, routeToggles });
    const renderRef = useRef<() => void>(() => {});

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

    // Render loop
    useEffect(() => {
        let renderRafId: number | null = null;
        let isCancelled = false;

        function drawSprite(ctx: CanvasRenderingContext2D, inst: SpriteInstance) {
            if (!scratchCanvas || !scratchCtx) return;

            try {
                const sheet = spriteCache.current.get(inst.type);
                const meta = SPRITE_SHEETS[inst.type];
                if (!sheet || !meta) return;

                const spriteWidth = meta.w;
                const spriteHeight = meta.h;
                let cols = Math.floor(sheet.width / spriteWidth);
                let rows = Math.floor(sheet.height / spriteHeight);
                
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

                ctx.save();
                ctx.globalAlpha = inst.alpha ?? 1.0;

                const { toggles: t } = togglesRef.current;

                if (t.showAnimations && inst.type.startsWith("tree_")) {
                    const time = performance.now() / 1000.0;
                    const rand1 = Math.abs((Math.sin(inst.x * 12.9898 + inst.y * 78.233) * 43758.5453) % 1.0);
                    const rand2 = Math.abs((Math.cos(inst.x * 4.141 + inst.y * 67.342) * 23145.2413) % 1.0);
                    const timeOffset = rand1 * Math.PI * 2;
                    const treeStrength = 0.4 + (rand2 * 0.6);
                    const speed = 0.75; 
                    
                    let baseSway = Math.sin((time * speed) + timeOffset);
                    let shapedSway = Math.tanh(baseSway * 2.5);
                    const swayAngle = shapedSway * 0.05 * treeStrength;

                    const swayAnchorX = inst.x;
                    const swayAnchorY = inst.y + (drawHeight / 2);

                    ctx.translate(swayAnchorX, swayAnchorY);
                    ctx.transform(1, 0, Math.tan(swayAngle), 1, 0, 0);
                    ctx.translate(-swayAnchorX, -swayAnchorY);
                }

                if (inst.r >= 0.99 && inst.g >= 0.99 && inst.b >= 0.99) {
                    ctx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
                } else {
                    if (scratchCanvas.width < spriteWidth || scratchCanvas.height < spriteHeight) {
                        scratchCanvas.width = spriteWidth;
                        scratchCanvas.height = spriteHeight;
                    }
                    
                    scratchCtx.clearRect(0, 0, spriteWidth, spriteHeight);
                    scratchCtx.globalCompositeOperation = 'source-over';
                    scratchCtx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
                    
                    scratchCtx.globalCompositeOperation = 'multiply';
                    scratchCtx.fillStyle = `rgb(${inst.r * 255}, ${inst.g * 255}, ${inst.b * 255})`;
                    scratchCtx.fillRect(0, 0, spriteWidth, spriteHeight);

                    scratchCtx.globalCompositeOperation = 'destination-in';
                    scratchCtx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);

                    ctx.drawImage(scratchCanvas, 0, 0, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
                }
                
                ctx.restore();
            } catch (e: any) {
                console.error("Error drawing sprite:", e);
            }
        }
        
        function render() {
            if (isCancelled) return;
            if (renderRafId) {
                cancelAnimationFrame(renderRafId);
                renderRafId = null;
            }

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const scene = sceneRef.current;
            const { toggles: t } = togglesRef.current;

            if (!canvas || !ctx || !scene.currentImageData) {
                if (t.showAnimations) {
                    renderRafId = requestAnimationFrame(render);
                }
                return;
            }
            
            const W = scene.currentImageData.width;
            let H = scene.currentImageData.height;
            if (t.showHudBar) {
                H = Math.round(W * (9 / 16));
            }

            canvas.width = W;
            canvas.height = H;
            
            if (t.showWater) {
                webglWaterRenderer.updateAndDraw(t.showAnimations);
                ctx.drawImage(webglWaterRenderer.getCanvas(), 0, 0);
            } else {
                ctx.putImageData(scene.currentImageData, 0, 0);
            }
            
            if (H > scene.currentImageData.height) {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, scene.currentImageData.height, W, H - scene.currentImageData.height);
            }

            const allInstances: SpriteInstance[] = [];
            if (t.showBridges) allInstances.push(...scene.bridgeInstances);
            if (t.showTrees) allInstances.push(...scene.treeInstances);
            if (t.showRocks) allInstances.push(...scene.rockInstances);
            if (t.showObjects) allInstances.push(...scene.objectInstances);
            
            allInstances.sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));

            for (const inst of allInstances) {
                drawSprite(ctx, inst);
            }

            if (t.showRoutes) {
                routesRenderer.draw(ctx);
            }

            if (t.showHudBar && spriteCache.current.has('hud_bar')) {
                const barCanvas = spriteCache.current.get('hud_bar')!;
                const sw = Math.min(W, 2048);
                const sx = (2048 - sw) / 2;
                const dx = (W - sw) / 2;
                ctx.drawImage(barCanvas, sx, 0, sw, 128, dx, H - 113, sw, 128);
            }
            
            if (t.showAnimations) {
                renderRafId = requestAnimationFrame(render);
            }
        }

        renderRef.current = render;
        render();

        return () => {
            isCancelled = true;
            if (renderRafId) cancelAnimationFrame(renderRafId);
        };
    }, [toggles, routeToggles, webglWaterRenderer, routesRenderer]);

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
                webglWaterRenderer.setStageTexture(bgImgData);
                
                const waveImgData = await gateway.getWaveTexture();
                if (waveImgData) {
                    webglWaterRenderer.setWaveTexture(waveImgData);
                }

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
                renderRef.current();
            } catch (e: any) {
                if (onStatusChangeRef.current) onStatusChangeRef.current("Error: " + e.message);
                console.error(e);
                
                sceneRef.current.currentImageData = null;
                sceneRef.current.treeInstances = [];
                sceneRef.current.rockInstances = [];
                sceneRef.current.bridgeInstances = [];
                sceneRef.current.objectInstances = [];
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
