import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';
import { ISLANDS, IslandInfo, StageInfo } from './stages_data.js';

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
        scale?: number;
    }

    let currentImageData: ImageData | null = null;
    let treeInstances: SpriteInstance[] = [];
    let rockInstances: SpriteInstance[] = [];

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
        "log_obj": { path: "data-common/textures/bgdata/objects/Log.dds", w: 128, h: 128 },
        "stumps": { path: "data-common/textures/bgdata/objects/Stumps_2x2.dds", w: 128, h: 128 },
        "home": { path: "data-common/textures/bgdata/objects/House1.dds", w: 256, h: 128 },
        "home_grass": { path: "data-common/textures/bgdata/objects/House1_ground.dds", w: 512, h: 128 },
        "gem_sign": { path: "data-common/textures/ingameui/main/gemsign.dds", w: 128, h: 128 },
        "research_sign": { path: "data-common/textures/ingameui/resource/researchsign.dds", w: 128, h: 128 }
    };

    const spriteCache = new Map<string, HTMLCanvasElement>();

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

    loadBtn.addEventListener('click', async () => {
        try {
            statusMsg.textContent = "Loading archives...";
            loadBtn.disabled = true;

            const pkiFile = pkiInput.files![0];
            pkdFile = pkdInput.files![0];

            archive = await PJMArchive.parse(pkiFile);
            
            viewerSection.classList.remove('hidden');
            statusMsg.textContent = "Archives loaded! Select a stage to view.";
            
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
            const imgData = DDSDecoder.decodeToImageData(bytes, true); // true = flip sprite sheet vertically
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
        const sheet = spriteCache.get(inst.type);
        const meta = SPRITE_SHEETS[inst.type];
        if (!sheet || !meta) return;

        const spriteWidth = meta.w;
        const spriteHeight = meta.h;
        const cols = Math.floor(sheet.width / spriteWidth);
        const rows = Math.floor(sheet.height / spriteHeight);
        const totalFrames = cols * rows;
        
        let ani = inst.ani;
        // Apply hardcoded negative mapping for rocks
        if (inst.type.startsWith("rock") && ani < 0) {
            ani = NEGATIVE_ROCK_MAPPING[ani] ?? 0;
        }

        // Apply modulo wrapping for out-of-bounds indices (like ani=9 for an 8-frame rock sheet)
        ani = Math.max(0, ani) % Math.max(1, totalFrames);

        const sx = (ani % cols) * spriteWidth;
        
        // Because we flipped the entire sprite sheet vertically to fix the upside-down rendering,
        // the original "Row 0" is now at the bottom of the canvas. We must invert the row index!
        const row = Math.floor(ani / cols);
        const invertedRow = (rows - 1) - row;
        
        const sy = invertedRow * spriteHeight;

        // Apply scale (default 1)
        const scale = inst.scale ?? 1.0;
        const drawWidth = spriteWidth * scale;
        const drawHeight = spriteHeight * scale;

        // The engine appears to use Center anchoring (0.5, 0.5) by default
        const dx = inst.x - (drawWidth / 2);
        const dy = inst.y - (drawHeight / 2);

        if (inst.r >= 0.99 && inst.g >= 0.99 && inst.b >= 0.99) {
            // Fast path: no tinting needed
            ctx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
        } else {
            // Tinting path
            scratchCanvas.width = spriteWidth;
            scratchCanvas.height = spriteHeight;
            scratchCtx.clearRect(0, 0, spriteWidth, spriteHeight);
            
            // 1. Draw the raw sprite
            scratchCtx.globalCompositeOperation = 'source-over';
            scratchCtx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
            
            // 2. Apply multiply tint to everything (this turns transparent areas colored, which is bad)
            scratchCtx.globalCompositeOperation = 'multiply';
            scratchCtx.fillStyle = `rgb(${Math.floor(inst.r * 255)}, ${Math.floor(inst.g * 255)}, ${Math.floor(inst.b * 255)})`;
            scratchCtx.fillRect(0, 0, spriteWidth, spriteHeight);
            
            // 3. Mask out the transparent areas by using destination-in against the original sprite shape
            scratchCtx.globalCompositeOperation = 'destination-in';
            scratchCtx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);

            // 4. Draw the tinted result to the main canvas
            ctx.drawImage(scratchCanvas, 0, 0, spriteWidth, spriteHeight, dx, dy, drawWidth, drawHeight);
        }
    }

    function render() {
        if (!currentImageData) return;
        
        const ctx = stageCanvas.getContext('2d')!;
        stageCanvas.width = currentImageData.width;
        stageCanvas.height = currentImageData.height;
        ctx.putImageData(currentImageData, 0, 0);

        // Sort instances by Y coordinate for correct depth rendering (painter's algorithm)
        const allInstances: SpriteInstance[] = [];
        if (showTreesCheck.checked) allInstances.push(...treeInstances);
        if (showRocksCheck.checked) allInstances.push(...rockInstances);
        
        allInstances.sort((a, b) => {
            const zA = a.z ?? a.y;
            const zB = b.z ?? b.y;
            return zA - zB;
        });

        for (const inst of allInstances) {
            drawSprite(ctx, inst);
        }
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
            
            // Extract trees and home position
            statusMsg.textContent = `Extracting Stage ${stageId} trees and home...`;
            const forestPath = `data-common/stage_data/umd/stage${stageId}/forestpos.txt`;
            const forestBytes = await archive.extractFile(pkdFile, forestPath);
            treeInstances = [];
            const typesToLoad = new Set<string>();
            
            if (forestBytes) {
                const text = new TextDecoder().decode(forestBytes);
                // e.g. MakeForest( vector(968,24),"tree_spring",0,vector(1.000000,1.000000,1.000000),0.000000);
                const regex = /MakeForest\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+),\s*vector\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const type = match[3];
                    typesToLoad.add(type);
                    treeInstances.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2]),
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
                    const type = match[3];
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
            const ctx = stageCanvas.getContext('2d');
            ctx?.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
        }
    }
});
