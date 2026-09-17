import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';
import { WebGLWaterRenderer } from './webgl_water.js';
import { RoutesRenderer } from './routes_renderer.js';
import { ArchiveSelector, StageSelector } from './shared_components.js';

interface SpriteInstance {
    x: number;
    y: number;
    z?: number;
    type: string;
    ani: number;
    r: number;
    g: number;
    b: number;
    alpha?: number;
    scale?: number;
}

interface SpriteMeta {
    path: string;
    w: number;
    h: number;
}

const gridOverrides: Record<string, {cols: number, rows: number}> = {
    "tree_beach": { cols: 2, rows: 4 }
};

const SPRITE_SHEETS: Record<string, SpriteMeta> = {
    "tree_spring": { path: "data-common/textures/bgdata/objects/TreeSet_spring.dds", w: 128, h: 128 },
    "tree_summer": { path: "data-common/textures/bgdata/objects/TreeSet_summer1.dds", w: 128, h: 128 },
    "tree_autumn": { path: "data-common/textures/bgdata/objects/TreeSet_autumn1.dds", w: 128, h: 128 },
    "tree_winter": { path: "data-common/textures/bgdata/objects/TreeSet_winter1.dds", w: 128, h: 128 },
    "tree_swamp": { path: "data-common/textures/bgdata/objects/TreeSet_swamp1.dds", w: 128, h: 128 },
    "tree_bare": { path: "data-common/textures/bgdata/objects/TreeSet_bare1.dds", w: 128, h: 128 },
    "tree_beach": { path: "data-common/textures/bgdata/objects/TreeSet_beach.dds", w: 128, h: 128 },
    "rock_1": { path: "data-common/textures/bgdata/objects/rockSet1.dds", w: 128, h: 128 },
    "rock_1_winter": { path: "data-common/textures/bgdata/objects/snowrocks.dds", w: 128, h: 128 },
    "log_obj": { path: "data-common/textures/bgdata/objects/Log.dds", w: 128, h: 128 },
    "stumps": { path: "data-common/textures/bgdata/objects/Stumps_2x2.dds", w: 128, h: 128 },
    "home": { path: "data-common/textures/bgdata/objects/House1.dds", w: 256, h: 128 },
    "home_grass": { path: "data-common/textures/bgdata/objects/House1_ground.dds", w: 512, h: 128 },
    "gem_sign": { path: "data-common/textures/ingameui/main/gemsign.dds", w: 128, h: 128 },
    "research_sign": { path: "data-common/textures/ingameui/resource/researchsign.dds", w: 128, h: 128 },
    "shadow": { path: "data-common/textures/bgdata/objects/shadow.dds", w: 128, h: 64 },
    // Bridges
    "bridge_s12": { path: "data-common/textures/bgdata/objects/bridge_s12.dds", w: 512, h: 256 },
    "bridge_s16": { path: "data-common/textures/bgdata/objects/bridge_s16.dds", w: 256, h: 256 },
    "bridge_s48": { path: "data-common/textures/bgdata/objects/swampBridge.dds", w: 256, h: 256 },
    "bridge_s52a": { path: "data-common/textures/bgdata/objects/stage52BridgeA.dds", w: 256, h: 256 },
    "bridge_s52b": { path: "data-common/textures/bgdata/objects/stage52BridgeB.dds", w: 256, h: 256 },
    "stage79Bridge": { path: "data-common/textures/bgdata/objects/stage79Bridge.dds", w: 1024, h: 128 },
    "new_wave": { path: "data-common/textures/effects/NewWave.dds", w: 256, h: 256 },
    "hud_bar": { path: "data-common/textures/frontend/shared/pixeljunkbar.dds", w: 2048, h: 128 }
};

const BRIDGE_DATA: Record<string, SpriteInstance[]> = {
    "12": [ { type: "bridge_s12", x: 929, y: 852, z: 1, ani: 0, r: 1, g: 1, b: 1 } ],
    "16": [ { type: "bridge_s16", x: 920, y: 640, z: 1, ani: 0, r: 1, g: 1, b: 1 } ],
    "48": [
        { type: "bridge_s48", x: 164 - 160, y: 212 - 192, z: 1, ani: 0, r: 1, g: 1, b: 1 },
        { type: "bridge_s48", x: 164, y: 212, z: 1, ani: 0, r: 1, g: 1, b: 1 }
    ],
    "52": [
        { type: "bridge_s52a", x: 648, y: 544, z: 0, ani: 0, r: 1, g: 1, b: 1 },
        { type: "bridge_s52b", x: 1196, y: 628, z: 0, ani: 0, r: 1, g: 1, b: 1 }
    ],
    "79": [ { type: "stage79Bridge", x: 960 + 40, y: 512 + 412, z: 0, ani: 0, r: 1, g: 1, b: 1 } ],
    "91": [ { type: "stage79Bridge", x: 960 + 40, y: 512 + 412, z: 0, ani: 0, r: 1, g: 1, b: 1 } ]
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

// Module-level singletons for performance and to avoid recreating them
const scratchCanvas = document.createElement('canvas');
scratchCanvas.width = 128;
scratchCanvas.height = 128;
const scratchCtx = scratchCanvas.getContext('2d')!;

const webglWaterRenderer = new WebGLWaterRenderer();
const routesRenderer = new RoutesRenderer();
const spriteCache = new Map<string, HTMLCanvasElement>();

async function ensureSpriteSheet(type: string, archive: PJMArchive, pkdFile: File) {
    if (spriteCache.has(type)) return;
    const meta = SPRITE_SHEETS[type];
    if (!meta) return;

    const bytes = await archive.extractFile(pkdFile, meta.path);
    if (!bytes) return;

    try {
        const imgData = DDSDecoder.decodeToImageData(bytes, true); // flipVert = true
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        canvas.getContext('2d')!.putImageData(imgData, 0, 0);
        spriteCache.set(type, canvas);
    } catch (e) {
        console.warn(`Failed to decode sprite sheet ${type}:`, e);
    }
}

function drawSprite(ctx: CanvasRenderingContext2D, inst: SpriteInstance) {
    try {
        const sheet = spriteCache.get(inst.type);
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
        // Apply hardcoded negative mapping for rocks
        if (inst.type.startsWith("rock") && ani < 0) {
            ani = NEGATIVE_ROCK_MAPPING[ani] ?? 0;
        }

        // Apply modulo wrapping for out-of-bounds indices (like ani=9 for an 8-frame rock sheet)
        ani = Math.max(0, ani) % Math.max(1, totalFrames);

        let row = Math.floor(ani / cols);
        let col = ani % cols;
        
        const sx = col * spriteWidth;
        
        row = (rows - 1) - row;  // Always invert rows.
        const sy = row * spriteHeight;

        // Apply scale (default 1)
        const scale = inst.scale ?? 1.0;
        const drawWidth = spriteWidth * scale;
        const drawHeight = spriteHeight * scale;

        // The engine appears to use Center anchoring (0.5, 0.5) by default
        const dx = inst.x - (drawWidth / 2);
        const dy = inst.y - (drawHeight / 2);

        ctx.save();
        ctx.globalAlpha = inst.alpha ?? 1.0;

        if (inst.type.startsWith("tree_")) {
            const time = performance.now() / 1000.0;
            
            // Deterministic pseudo-random values based on tree position (0.0 to 1.0)
            const rand1 = Math.abs((Math.sin(inst.x * 12.9898 + inst.y * 78.233) * 43758.5453) % 1.0);
            const rand2 = Math.abs((Math.cos(inst.x * 4.141 + inst.y * 67.342) * 23145.2413) % 1.0);
            
            // Add randomness so trees don't sway in perfect unison
            const timeOffset = rand1 * Math.PI * 2;
            
            // Vary the maximum lean of each tree (e.g. some lean 100%, some lean 40%)
            const treeStrength = 0.4 + (rand2 * 0.6);
            
            // Slow down the overall animation (increases loop duration by ~2 seconds)
            const speed = 0.75; 
            
            // Modified sine function: fast near middle, slow at far ends
            let baseSway = Math.sin((time * speed) + timeOffset);
            // Math.tanh smoothly flattens the peaks without creating an infinite derivative at the center (which caused the "jump")
            // Multiplying baseSway drives it deeper into the flat part of the tanh curve, extending the pause!
            let shapedSway = Math.tanh(baseSway * 2.5);
            
            // Apply final amplitude (0.05 is the max skew angle)
            const swayAngle = shapedSway * 0.05 * treeStrength;

            // Skew anchored at the bottom of the tree
            const swayAnchorX = inst.x;
            const swayAnchorY = inst.y + (drawHeight / 2);

            ctx.translate(swayAnchorX, swayAnchorY);
            // a, b, c, d, e, f => 1, 0, Math.tan(swayAngle), 1, 0, 0
            ctx.transform(1, 0, Math.tan(swayAngle), 1, 0, 0);
            ctx.translate(-swayAnchorX, -swayAnchorY);
        }

        if (inst.r >= 0.99 && inst.g >= 0.99 && inst.b >= 0.99) {
            // Fast path: no tinting needed
            ctx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
        } else {
            // Resize scratch canvas if needed to avoid clipping
            if (scratchCanvas.width < spriteWidth || scratchCanvas.height < spriteHeight) {
                scratchCanvas.width = spriteWidth;
                scratchCanvas.height = spriteHeight;
            }
            
            scratchCtx.clearRect(0, 0, spriteWidth, spriteHeight);
            
            // Draw the specific sprite frame to the scratch canvas
            scratchCtx.globalCompositeOperation = 'source-over';
            scratchCtx.drawImage(
                sheet,
                sx, sy, spriteWidth, spriteHeight,
                0, 0, spriteWidth, spriteHeight
            );

            // Apply tint
            scratchCtx.globalCompositeOperation = 'multiply';
            scratchCtx.fillStyle = `rgb(${inst.r * 255}, ${inst.g * 255}, ${inst.b * 255})`;
            scratchCtx.fillRect(0, 0, spriteWidth, spriteHeight);

            // Apply alpha mask
            scratchCtx.globalCompositeOperation = 'destination-in';
            scratchCtx.drawImage(
                sheet,
                sx, sy, spriteWidth, spriteHeight,
                0, 0, spriteWidth, spriteHeight
            );

            ctx.drawImage(scratchCanvas, 0, 0, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
        }
        
        ctx.restore();
    } catch (e: any) {
        console.error("Error drawing sprite:", e);
    }
}

const StageViewerApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [status, setStatus] = useState<string>('');
    const [selectedStage, setSelectedStage] = useState<string>("11");
    const [isMaximized, setIsMaximized] = useState<boolean>(false);

    // Toggles state
    const [showTrees, setShowTrees] = useState<boolean>(true);
    const [showRocks, setShowRocks] = useState<boolean>(true);
    const [showObjects, setShowObjects] = useState<boolean>(true);
    const [showBridges, setShowBridges] = useState<boolean>(true);
    const [showRoutes, setShowRoutes] = useState<boolean>(true);
    const [showWater, setShowWater] = useState<boolean>(true);
    const [showHudBar, setShowHudBar] = useState<boolean>(true);

    const [routeToggles, setRouteToggles] = useState<{id: number, color: string, visible: boolean}[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Keep scene state in refs so the 60fps render loop always has latest data without triggering re-renders
    const sceneRef = useRef({
        currentImageData: null as ImageData | null,
        treeInstances: [] as SpriteInstance[],
        rockInstances: [] as SpriteInstance[],
        bridgeInstances: [] as SpriteInstance[],
        objectInstances: [] as SpriteInstance[]
    });

    const togglesRef = useRef({
        showTrees, showRocks, showObjects, showBridges, showRoutes, showWater, showHudBar, routeToggles
    });

    // Sync React state to refs
    useEffect(() => {
        togglesRef.current = { showTrees, showRocks, showObjects, showBridges, showRoutes, showWater, showHudBar, routeToggles };
    }, [showTrees, showRocks, showObjects, showBridges, showRoutes, showWater, showHudBar, routeToggles]);

    // Apply route toggles to the RouteRenderer directly when they change
    useEffect(() => {
        const routes = routesRenderer.getRoutes();
        if (routes.length === routeToggles.length) {
            routes.forEach((r, idx) => r.visible = routeToggles[idx].visible);
        }
    }, [routeToggles]);

    const handleLoadArchive = async () => {
        if (!pkiFile || !pkdFile) {
            setStatus('Please select both PKI and PKD files.');
            return;
        }
        try {
            setStatus("Loading archives...");
            const arch = await PJMArchive.parse(pkiFile);
            setArchive(arch);
            
            // Extract water shader and initialize
            setStatus("Extracting shader...");
            const shaderBytes = await arch.extractFile(pkdFile, "shaders/ps_2dwater.hlsl");
            if (shaderBytes) {
                const hlslSource = new TextDecoder().decode(shaderBytes);
                webglWaterRenderer.initShaders(hlslSource);
            }

            setStatus("Archives loaded! Select a stage to view.");
            setIsMaximized(true);
        } catch (e: any) {
            setStatus("Error: " + e.message);
            console.error(e);
        }
    };

    // Render loop
    useEffect(() => {
        let renderRafId: number | null = null;
        
        function render() {
            if (renderRafId) {
                cancelAnimationFrame(renderRafId);
            }

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const scene = sceneRef.current;
            const t = togglesRef.current;

            if (!canvas || !ctx || !scene.currentImageData) {
                renderRafId = requestAnimationFrame(render);
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
                // Update shader and draw to webgl canvas
                webglWaterRenderer.updateAndDraw();
                // Draw WebGL background to 2D canvas
                ctx.drawImage(webglWaterRenderer.getCanvas(), 0, 0);
            } else {
                // Draw raw background
                ctx.putImageData(scene.currentImageData, 0, 0);
            }
            
            // Fill any empty space below the background texture with black
            if (H > scene.currentImageData.height) {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, scene.currentImageData.height, W, H - scene.currentImageData.height);
            }

            // Sort instances by Y coordinate for correct depth rendering (painter's algorithm)
            const allInstances: SpriteInstance[] = [];
            if (t.showBridges) allInstances.push(...scene.bridgeInstances);
            if (t.showTrees) allInstances.push(...scene.treeInstances);
            if (t.showRocks) allInstances.push(...scene.rockInstances);
            if (t.showObjects) allInstances.push(...scene.objectInstances);
            
            allInstances.sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));

            for (const inst of allInstances) {
                drawSprite(ctx, inst);
            }

            // Draw routes on top of the stage art but behind the HUD bar
            if (t.showRoutes) {
                routesRenderer.draw(ctx);
            }

            if (t.showHudBar && spriteCache.has('hud_bar')) {
                const barCanvas = spriteCache.get('hud_bar')!;
                // The HUD bar is 2048x128. Draw the center W pixels of it, at 1:1 scale (no vertical stretch).
                // If W > 2048, center the 2048 bar in the W-wide space.
                const sw = Math.min(W, 2048);
                const sx = (2048 - sw) / 2;
                const dx = (W - sw) / 2;
                ctx.drawImage(barCanvas, sx, 0, sw, 128, dx, H - 113, sw, 128);
            }
            
            renderRafId = requestAnimationFrame(render);
        }

        renderRafId = requestAnimationFrame(render);
        return () => {
            if (renderRafId) cancelAnimationFrame(renderRafId);
        };
    }, []);

    // Load Stage Data
    useEffect(() => {
        if (!archive || !pkdFile) return;

        const loadData = async () => {
            try {
                setStatus(`Extracting Stage ${selectedStage} background...`);
                const bgPath = `data-common/textures/bgdata/bg/stage${selectedStage}.dds`;
                
                const fileBytes = await archive.extractFile(pkdFile, bgPath);
                if (!fileBytes) {
                    throw new Error(`Background file '${bgPath}' not found in the archive.`);
                }

                setStatus(`Decoding DDS...`);
                sceneRef.current.currentImageData = DDSDecoder.decodeToImageData(fileBytes, true); // true = flip background vertically
                
                // Setup WebGL Background
                webglWaterRenderer.setStageTexture(sceneRef.current.currentImageData);
                const waveBytes = await archive.extractFile(pkdFile, "data-common/textures/effects/NewWave.dds");
                if (waveBytes) {
                    const waveImgData = DDSDecoder.decodeToImageData(waveBytes, true);
                    webglWaterRenderer.setWaveTexture(waveImgData);
                }

                // Extract routes
                setStatus(`Extracting Stage ${selectedStage} routes...`);
                const roadPath = `data-common/stage_data/umd/stage${selectedStage}/road.txt`;
                const roadBytes = await archive.extractFile(pkdFile, roadPath);
                routesRenderer.clear();
                if (roadBytes) {
                    const text = new TextDecoder().decode(roadBytes);
                    routesRenderer.parseRoadTxt(text);
                    const parsedRoutes = routesRenderer.getRoutes();
                    setRouteToggles(parsedRoutes.map((r, idx) => ({ id: idx, color: r.color, visible: true })));
                } else {
                    setRouteToggles([]);
                }

                // Extract trees and home position
                setStatus(`Extracting Stage ${selectedStage} trees and home...`);
                const forestPath = `data-common/stage_data/umd/stage${selectedStage}/forestpos.txt`;
                const forestBytes = await archive.extractFile(pkdFile, forestPath);
                const typesToLoad = new Set<string>();
                typesToLoad.add('hud_bar');
                
                sceneRef.current.treeInstances = [];
                sceneRef.current.bridgeInstances = [];
                sceneRef.current.objectInstances = [];

                // Populate bridges
                if (BRIDGE_DATA[selectedStage]) {
                    for (const bridge of BRIDGE_DATA[selectedStage]) {
                        typesToLoad.add(bridge.type);
                        sceneRef.current.bridgeInstances.push({ ...bridge }); // Clone
                    }
                }
                
                if (forestBytes) {
                    const text = new TextDecoder().decode(forestBytes);
                    // e.g. MakeForest( vector(968,24),"tree_spring",0,vector(1.000000,1.000000,1.000000),0.000000);
                    const regex = /MakeForest\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        const type = match[3];
                        typesToLoad.add(type);
                        typesToLoad.add("shadow");
                        
                        const treeX = parseFloat(match[1]);
                        const treeY = parseFloat(match[2]);
                        
                        sceneRef.current.treeInstances.push({
                            x: treeX, y: treeY + 55, z: treeY - 1, type: "shadow", ani: 0, r: 1, g: 1, b: 1, alpha: 0.2
                        });
                        sceneRef.current.treeInstances.push({
                            x: treeX, y: treeY, z: treeY, type: type, ani: parseInt(match[4], 10), r: parseFloat(match[5]), g: parseFloat(match[6]), b: parseFloat(match[7])
                        });
                    }
                    
                    const homeRegex = /home\.pos\s*=\s*vector\(([-0-9.]+),\s*([-0-9.]+)\);/g;
                    const homeMatch = homeRegex.exec(text);
                    if (homeMatch) {
                        const hx = parseFloat(homeMatch[1]);
                        const hy = parseFloat(homeMatch[2]);
                        
                        typesToLoad.add("home_grass");
                        typesToLoad.add("home");
                        typesToLoad.add("gem_sign");
                        typesToLoad.add("research_sign");
                        
                        const isWinter = typesToLoad.has("tree_winter");
                        const homeAni = isWinter ? 1 : 0;
                        
                        const grassX = hx; 
                        const grassY = hy + 50; 
                        sceneRef.current.objectInstances.push({ x: grassX, y: grassY, z: -1, type: "home_grass", ani: homeAni, r: 1, g: 1, b: 1 });
                        sceneRef.current.objectInstances.push({ x: hx, y: hy, z: hy + 50, type: "home", ani: homeAni, r: 1, g: 1, b: 1 });
                        
                        const gemX = hx - 120;
                        const gemY = hy + 50; 
                        sceneRef.current.objectInstances.push({ x: gemX, y: gemY, z: hy + 75, type: "gem_sign", ani: 0, r: 1, g: 1, b: 1 });

                        const resX = hx - 122;
                        const resY = hy; 
                        sceneRef.current.objectInstances.push({ x: resX, y: resY, z: hy + 100, type: "research_sign", ani: 0, r: 1, g: 1, b: 1 });
                    }
                }

                // Extract rocks
                setStatus(`Extracting Stage ${selectedStage} rocks...`);
                const rockPath = `data-common/stage_data/umd/stage${selectedStage}/rockpos.txt`;
                const rockBytes = await archive.extractFile(pkdFile, rockPath);
                sceneRef.current.rockInstances = [];
                
                if (rockBytes) {
                    const text = new TextDecoder().decode(rockBytes);
                    const regex = /MakeStdObj\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        let type = match[3];
                        if (type === "rock_1" && typesToLoad.has("tree_winter")) {
                            type = "rock_1_winter";
                        }
                        
                        typesToLoad.add(type);
                        sceneRef.current.rockInstances.push({
                            x: parseFloat(match[1]), y: parseFloat(match[2]), type: type, ani: parseInt(match[4], 10), r: parseFloat(match[5]), g: parseFloat(match[6]), b: parseFloat(match[7])
                        });
                    }
                }
                
                setStatus(`Loading sprite sheets...`);
                for (const t of typesToLoad) {
                    await ensureSpriteSheet(t, archive, pkdFile);
                }

                setStatus(`Successfully loaded Stage ${selectedStage}! (${sceneRef.current.treeInstances.length} trees, ${sceneRef.current.rockInstances.length} rocks)`);
            } catch (e: any) {
                setStatus("Error: " + e.message);
                console.error(e);
                
                sceneRef.current.currentImageData = null;
                sceneRef.current.treeInstances = [];
                sceneRef.current.rockInstances = [];
                sceneRef.current.bridgeInstances = [];
                sceneRef.current.objectInstances = [];
            }
        };

        loadData();
    }, [archive, selectedStage, pkdFile]);

    return (
        <div className="container">
            <nav className="breadcrumb">
                <a href="index.html">← Back to Hub</a>
            </nav>
            <h1>Stage Viewer</h1>
            <p>Instantly extract and view stages directly from the game archives.</p>
            
            <div className="section">
                <h2>1. Select Game Archives</h2>
                <ArchiveSelector 
                    pkiFile={pkiFile} setPkiFile={setPkiFile}
                    pkdFile={pkdFile} setPkdFile={setPkdFile}
                    onLoadArchive={handleLoadArchive}
                    status={status}
                />
            </div>

            {archive && (
                <div id="viewerSection" className={`section ${isMaximized ? 'maximized' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ marginBottom: 0 }}>2. View Stage</h2>
                        <button onClick={() => setIsMaximized(!isMaximized)} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                            {isMaximized ? 'Minimize View' : 'Maximize View'}
                        </button>
                    </div>

                    <StageSelector 
                        selectedStage={selectedStage} setSelectedStage={setSelectedStage}
                        showDifficulty={false}
                    />

                    <div className="form-group">
                        <label>Show features:</label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showTrees} onChange={e => setShowTrees(e.target.checked)} />
                            Trees
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showRocks} onChange={e => setShowRocks(e.target.checked)} />
                            Rocks
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showObjects} onChange={e => setShowObjects(e.target.checked)} />
                            Objects
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showBridges} onChange={e => setShowBridges(e.target.checked)} />
                            Bridges
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showRoutes} onChange={e => setShowRoutes(e.target.checked)} />
                            Routes
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                            <input type="checkbox" checked={showWater} onChange={e => setShowWater(e.target.checked)} />
                            Water
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showHudBar} onChange={e => setShowHudBar(e.target.checked)} />
                            HUD Bar
                        </label>
                    </div>
                    
                    {routeToggles.length > 0 && (
                        <div className="form-group">
                            <label>Stage routes:</label>
                            <div id="routeTogglesContainer" style={{ marginBottom: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {routeToggles.map((rt, idx) => (
                                    <label key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: rt.color, fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>
                                        <input type="checkbox" checked={rt.visible} onChange={(e) => {
                                            const newToggles = [...routeToggles];
                                            newToggles[idx].visible = e.target.checked;
                                            setRouteToggles(newToggles);
                                        }} />
                                        Route {idx + 1}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="canvas-container">
                        <canvas ref={canvasRef} id="stageCanvas"></canvas>
                    </div>
                </div>
            )}
        </div>
    );
};

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<StageViewerApp />);
}

