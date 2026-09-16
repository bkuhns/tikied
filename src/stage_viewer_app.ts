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
        type: string;
        ani: number;
    }

    let currentImageData: ImageData | null = null;
    let treeInstances: SpriteInstance[] = [];
    let rockInstances: SpriteInstance[] = [];

    const SPRITE_SHEETS: Record<string, string> = {
        "tree_spring": "data-common/textures/bgdata/objects/TreeSet_spring.dds",
        "tree_summer": "data-common/textures/bgdata/objects/TreeSet_summer1.dds",
        "tree_autumn": "data-common/textures/bgdata/objects/TreeSet_autumn1.dds",
        "tree_winter": "data-common/textures/bgdata/objects/TreeSet_winter1.dds",
        "tree_swamp": "data-common/textures/bgdata/objects/TreeSet_swamp1.dds",
        "tree_bare": "data-common/textures/bgdata/objects/TreeSet_bare1.dds",
        "tree_beach": "data-common/textures/bgdata/objects/TreeSet_beach.dds",
        "rock_1": "data-common/textures/bgdata/objects/rockSet1.dds",
        "log_obj": "data-common/textures/bgdata/objects/Log.dds",
        "stumps": "data-common/textures/bgdata/objects/Stumps_2x2.dds"
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
        const path = SPRITE_SHEETS[type];
        if (!path || !archive || !pkdFile) return;

        const bytes = await archive.extractFile(pkdFile, path);
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

    function drawSprite(ctx: CanvasRenderingContext2D, inst: SpriteInstance) {
        const sheet = spriteCache.get(inst.type);
        if (!sheet) return;

        // Sprites are typically 128x128 in a 4x4 grid (512x512 texture)
        const spriteSize = 128;
        const cols = Math.floor(sheet.width / spriteSize);
        
        let ani = inst.ani;
        // Apply hardcoded negative mapping for rocks
        if (inst.type.startsWith("rock") && ani < 0) {
            ani = NEGATIVE_ROCK_MAPPING[ani] ?? 0;
        }

        const sx = (ani % cols) * spriteSize;
        
        // Because we flipped the entire sprite sheet vertically to fix the upside-down rendering,
        // the original "Row 0" is now at the bottom of the canvas. We must invert the row index!
        const rows = Math.floor(sheet.height / spriteSize);
        const row = Math.floor(ani / cols);
        const invertedRow = (rows - 1) - row;
        
        const sy = invertedRow * spriteSize;

        // Bottom-center anchor
        const dx = inst.x - (spriteSize / 2);
        const dy = inst.y - spriteSize;

        ctx.drawImage(sheet, sx, sy, spriteSize, spriteSize, dx, dy, spriteSize, spriteSize);
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
        
        allInstances.sort((a, b) => a.y - b.y);

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
            
            // Extract trees
            statusMsg.textContent = `Extracting Stage ${stageId} trees...`;
            const forestPath = `data-common/stage_data/umd/stage${stageId}/forestpos.txt`;
            const forestBytes = await archive.extractFile(pkdFile, forestPath);
            treeInstances = [];
            const typesToLoad = new Set<string>();
            
            if (forestBytes) {
                const text = new TextDecoder().decode(forestBytes);
                // e.g. MakeForest( vector(968,24),"tree_spring",0,vector(1.000000,1.000000,1.000000),0.000000);
                const regex = /MakeForest\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const type = match[3];
                    typesToLoad.add(type);
                    treeInstances.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2]),
                        type: type,
                        ani: parseInt(match[4], 10)
                    });
                }
            }

            // Extract rocks
            statusMsg.textContent = `Extracting Stage ${stageId} rocks...`;
            const rockPath = `data-common/stage_data/umd/stage${stageId}/rockpos.txt`;
            const rockBytes = await archive.extractFile(pkdFile, rockPath);
            rockInstances = [];
            
            if (rockBytes) {
                const text = new TextDecoder().decode(rockBytes);
                // e.g. MakeStdObj( vector(1728,8),"rock_1",-4,...);
                const regex = /MakeStdObj\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\),\s*"([^"]+)",\s*([-0-9]+)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const type = match[3];
                    typesToLoad.add(type);
                    rockInstances.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2]),
                        type: type,
                        ani: parseInt(match[4], 10)
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
