import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';
import { ISLANDS, IslandInfo, StageInfo } from './stages_data.js';
import { WebGLWaterRenderer } from './webgl_water.js';

document.addEventListener('DOMContentLoaded', () => {
    const pkiInput = document.getElementById('pkiInput') as HTMLInputElement;
    const pkdInput = document.getElementById('pkdInput') as HTMLInputElement;
    const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
    
    const viewerSection = document.getElementById('viewerSection') as HTMLDivElement;
    const stageSelect = document.getElementById('stageSelect') as HTMLSelectElement;
    const stageCanvas = document.getElementById('stageCanvas') as HTMLCanvasElement;
    const statusMsg = document.getElementById('status') as HTMLDivElement;

    const showTreesCheck = document.getElementById('showTreesCheck') as HTMLInputElement;
    const showRocksCheck = document.getElementById('showRocksCheck') as HTMLInputElement;
    const showWaterCheck = document.getElementById('showWaterCheck') as HTMLInputElement;
    const showHudBarCheck = document.getElementById('showHudBarCheck') as HTMLInputElement;
    const maximizeBtn = document.getElementById('maximizeBtn') as HTMLButtonElement;

    const gridOverrides: Record<string, {cols: number, rows: number}> = {
        "tree_beach": { cols: 2, rows: 4 }
    };

    maximizeBtn.addEventListener('click', () => {
        viewerSection.classList.toggle('maximized');
        if (viewerSection.classList.contains('maximized')) {
            maximizeBtn.textContent = 'Minimize View';
        } else {
            maximizeBtn.textContent = 'Maximize View';
        }
    });

    let archive: PJMArchive | null = null;
    let pkdFile: File | null = null;
    
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

    let currentImageData: ImageData | null = null;
    let treeInstances: SpriteInstance[] = [];
    let rockInstances: SpriteInstance[] = [];
    let bridgeInstances: SpriteInstance[] = [];

    interface SpriteMeta {
        path: string;
        w: number;
        h: number;
    }

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

    const spriteCache = new Map<string, HTMLCanvasElement>();
    const webglWaterRenderer = new WebGLWaterRenderer();

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

    // Populate dropdown with grouped islands
    for (const island of ISLANDS) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = island.name;
        
        for (const stage of island.stages) {
            const option = document.createElement('option');
            option.value = stage.id.toString();
            option.textContent = `Stage ${stage.id}: ${stage.difficulty} - ${stage.introduction}`;
            optgroup.appendChild(option);
        }
        
        stageSelect.appendChild(optgroup);
    }

    function checkInputs() {
        loadBtn.disabled = !(pkiInput.files?.length && pkdInput.files?.length);
    }

    pkiInput.addEventListener('change', checkInputs);
    pkdInput.addEventListener('change', checkInputs);

    showTreesCheck.addEventListener('change', render);
    showRocksCheck.addEventListener('change', render);
    showWaterCheck.addEventListener('change', render);
    showHudBarCheck.addEventListener('change', render);

    loadBtn.addEventListener('click', async () => {
        try {
            statusMsg.textContent = "Loading archives...";
            loadBtn.disabled = true;

            const pkiFile = pkiInput.files![0];
            pkdFile = pkdInput.files![0];

            archive = await PJMArchive.parse(pkiFile);
            
            // Extract water shader and initialize
            statusMsg.textContent = "Extracting shader...";
            const shaderBytes = await archive.extractFile(pkdFile, "shaders/ps_2dwater.hlsl");
            if (shaderBytes) {
                const hlslSource = new TextDecoder().decode(shaderBytes);
                webglWaterRenderer.initShaders(hlslSource);
            }

            viewerSection.classList.remove('hidden');
            statusMsg.textContent = "Archives loaded! Select a stage to view.";
            
            // Automatically maximize the viewer
            viewerSection.classList.add('maximized');
            maximizeBtn.textContent = 'Minimize View';
            
            // Trigger first load
            await loadStage(stageSelect.value);

        } catch (e: any) {
            statusMsg.textContent = "Error: " + e.message;
            console.error(e);
        } finally {
            loadBtn.disabled = false;
        }
    });

    stageSelect.addEventListener('change', () => {
        if (archive && pkdFile) {
            loadStage(stageSelect.value);
        }
    });

    async function ensureSpriteSheet(type: string) {
        if (spriteCache.has(type)) return;
        const meta = SPRITE_SHEETS[type];
        if (!meta || !archive || !pkdFile) return;

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

    // Pre-allocate a scratch canvas for tinting to avoid creating one per sprite
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = 128;
    scratchCanvas.height = 128;
    const scratchCtx = scratchCanvas.getContext('2d')!;

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

            ctx.globalAlpha = inst.alpha ?? 1.0;

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
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
        } catch (e: any) {
            console.error("Error drawing sprite:", e);
            statusMsg.textContent = "Error drawing sprite: " + e.message;
        }
    }

    let renderRafId: number | null = null;
    
    function render() {
        if (renderRafId) {
            cancelAnimationFrame(renderRafId);
        }

        if (!currentImageData) return;
        
        const W = currentImageData.width;
        let H = currentImageData.height;
        if (showHudBarCheck.checked) {
            H = Math.round(W * (9 / 16));
        }

        const ctx = stageCanvas.getContext('2d')!;
        stageCanvas.width = W;
        stageCanvas.height = H;
        
        if (showWaterCheck.checked) {
            // Update shader and draw to webgl canvas
            webglWaterRenderer.updateAndDraw();
            // Draw WebGL background to 2D canvas
            ctx.drawImage(webglWaterRenderer.getCanvas(), 0, 0);
        } else {
            // Draw raw background
            ctx.putImageData(currentImageData, 0, 0);
        }
        
        // Fill any empty space below the background texture with black
        if (H > currentImageData.height) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, currentImageData.height, W, H - currentImageData.height);
        }

        // Sort instances by Y coordinate for correct depth rendering (painter's algorithm)
        const allInstances: SpriteInstance[] = [];
        allInstances.push(...bridgeInstances); // Bridges are background elements, so push them first
        if (showTreesCheck.checked) allInstances.push(...treeInstances);
        if (showRocksCheck.checked) allInstances.push(...rockInstances);
        
        allInstances.sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));

        for (const inst of allInstances) {
            drawSprite(ctx, inst);
        }

        if (showHudBarCheck.checked && spriteCache.has('hud_bar')) {
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

    async function loadStage(stageId: string) {
        if (!archive || !pkdFile) return;

        try {
            statusMsg.textContent = `Extracting Stage ${stageId} background...`;
            const bgPath = `data-common/textures/bgdata/bg/stage${stageId}.dds`;
            
            const fileBytes = await archive.extractFile(pkdFile, bgPath);
            if (!fileBytes) {
                throw new Error(`Background file '${bgPath}' not found in the archive.`);
            }

            statusMsg.textContent = `Decoding DDS...`;
            currentImageData = DDSDecoder.decodeToImageData(fileBytes, true); // true = flip background vertically
            
            // Setup WebGL Background
            webglWaterRenderer.setStageTexture(currentImageData);
            const waveBytes = await archive.extractFile(pkdFile, "data-common/textures/effects/NewWave.dds");
            if (waveBytes) {
                const waveImgData = DDSDecoder.decodeToImageData(waveBytes, true);
                webglWaterRenderer.setWaveTexture(waveImgData);
            }

            // Extract trees and home position
            statusMsg.textContent = `Extracting Stage ${stageId} trees and home...`;
            const forestPath = `data-common/stage_data/umd/stage${stageId}/forestpos.txt`;
            const forestBytes = await archive.extractFile(pkdFile, forestPath);
            treeInstances = [];
            bridgeInstances = [];
            const typesToLoad = new Set<string>();
            typesToLoad.add('hud_bar');
            
            // Populate bridges
            if (BRIDGE_DATA[stageId]) {
                for (const bridge of BRIDGE_DATA[stageId]) {
                    typesToLoad.add(bridge.type);
                    bridgeInstances.push({ ...bridge }); // Clone so we don't mutate const
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
                    
                    // Push the generic shadow sprite right at the tree base
                    treeInstances.push({
                        x: treeX,
                        y: treeY + 55,
                        z: treeY - 1, // draw underneath tree
                        type: "shadow",
                        ani: 0,
                        r: 1,
                        g: 1,
                        b: 1,
                        alpha: 0.2
                    });
                    
                    treeInstances.push({
                        x: treeX,
                        y: treeY,
                        z: treeY,
                        type: type,
                        ani: parseInt(match[4], 10),
                        r: parseFloat(match[5]),
                        g: parseFloat(match[6]),
                        b: parseFloat(match[7])
                    });
                }
                
                // e.g. home.pos = vector(1728.000000,136.000000);
                const homeRegex = /home\.pos\s*=\s*vector\(([-0-9.]+),\s*([-0-9.]+)\);/g;
                const homeMatch = homeRegex.exec(text);
                if (homeMatch) {
                    const hx = parseFloat(homeMatch[1]);
                    const hy = parseFloat(homeMatch[2]);
                    
                    typesToLoad.add("home_grass");
                    typesToLoad.add("home");
                    typesToLoad.add("gem_sign");
                    typesToLoad.add("research_sign");
                    
                    // If the stage has winter trees, use frame 1 (winter variant) for the home and grass
                    const isWinter = typesToLoad.has("tree_winter");
                    const homeAni = isWinter ? 1 : 0;
                    
                    // Add home_grass (drawn first/lowest Z)
                    const grassX = hx; // The grass is visually centered on the home
                    const grassY = hy + 50; // The ground is visually below the home
                    treeInstances.push({ x: grassX, y: grassY, z: hy + 25, type: "home_grass", ani: homeAni, r: 1, g: 1, b: 1 });
                    
                    // Add home
                    treeInstances.push({ x: hx, y: hy, z: hy + 50, type: "home", ani: homeAni, r: 1, g: 1, b: 1 });
                    
                    // Add gem_sign (home.pos + (-120, 0))
                    // When it was drawn at 'hy', it was vertically aligned perfectly.
                    // The game engine's Z parameter (+50) ensures it sorts on top of the hut!
                    const gemX = hx - 120;
                    const gemY = hy + 50; 
                    treeInstances.push({ x: gemX, y: gemY, z: hy + 75, type: "gem_sign", ani: 0, r: 1, g: 1, b: 1 });

                    // Add research_sign (home_pos + (-122, -50))
                    // This visually sits 50 pixels above the gem_sign. 
                    // Its Z parameter (+100) ensures it sorts on top of everything!
                    const resX = hx - 122;
                    const resY = hy; 
                    treeInstances.push({ x: resX, y: resY, z: hy + 100, type: "research_sign", ani: 0, r: 1, g: 1, b: 1 });
                }
            }

            // Extract rocks
            statusMsg.textContent = `Extracting Stage ${stageId} rocks...`;
            const rockPath = `data-common/stage_data/umd/stage${stageId}/rockpos.txt`;
            const rockBytes = await archive.extractFile(pkdFile, rockPath);
            rockInstances = [];
            
            if (rockBytes) {
                const text = new TextDecoder().decode(rockBytes);
                // e.g. MakeStdObj( vector(1728,8),"rock_1",-4,vector(1,1,1),0);
                const regex = /MakeStdObj\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    let type = match[3];
                    if (type === "rock_1" && typesToLoad.has("tree_winter")) {
                        type = "rock_1_winter";
                    }
                    
                    typesToLoad.add(type);
                    rockInstances.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2]),
                        type: type,
                        ani: parseInt(match[4], 10),
                        r: parseFloat(match[5]),
                        g: parseFloat(match[6]),
                        b: parseFloat(match[7])
                    });
                }
            }
            
            statusMsg.textContent = `Loading sprite sheets...`;
            for (const t of typesToLoad) {
                await ensureSpriteSheet(t);
            }

            render();
            statusMsg.textContent = `Successfully loaded Stage ${stageId}! (${treeInstances.length} trees, ${rockInstances.length} rocks)`;
        } catch (e: any) {
            statusMsg.textContent = "Error: " + e.message;
            console.error(e);
            
            // Clear on error
            currentImageData = null;
            treeInstances = [];
            rockInstances = [];
            bridgeInstances = [];
            const ctx = stageCanvas.getContext('2d');
            ctx?.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
        }
    }
});
