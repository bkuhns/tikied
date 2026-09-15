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
    
    let currentImageData: ImageData | null = null;
    let treePositions: {x: number, y: number}[] = [];
    let rockPositions: {x: number, y: number}[] = [];

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

    function render() {
        if (!currentImageData) return;
        
        const ctx = stageCanvas.getContext('2d')!;
        stageCanvas.width = currentImageData.width;
        stageCanvas.height = currentImageData.height;
        ctx.putImageData(currentImageData, 0, 0);

        if (showTreesCheck.checked && treePositions.length > 0) {
            ctx.fillStyle = 'rgba(46, 204, 113, 0.8)'; // Semi-transparent green
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            for (const pos of treePositions) {
                // Draw a triangle at pos.x, pos.y (assuming bottom center)
                const size = 30; // height of triangle
                const width = 20; // base width
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y - size); // top tip
                ctx.lineTo(pos.x - width / 2, pos.y); // bottom left
                ctx.lineTo(pos.x + width / 2, pos.y); // bottom right
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        if (showRocksCheck.checked && rockPositions.length > 0) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // Semi-transparent red
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            for (const pos of rockPositions) {
                // Draw a circle. Assuming bottom center for rocks as well.
                const radius = 10;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - radius, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
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
            currentImageData = DDSDecoder.decodeToImageData(fileBytes);
            
            // Extract trees
            statusMsg.textContent = `Extracting Stage ${stageId} trees...`;
            const forestPath = `data-common/stage_data/umd/stage${stageId}/forestpos.txt`;
            const forestBytes = await archive.extractFile(pkdFile, forestPath);
            treePositions = [];
            
            if (forestBytes) {
                const text = new TextDecoder().decode(forestBytes);
                const regex = /MakeForest\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    treePositions.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2])
                    });
                }
            }

            // Extract rocks
            statusMsg.textContent = `Extracting Stage ${stageId} rocks...`;
            const rockPath = `data-common/stage_data/umd/stage${stageId}/rockpos.txt`;
            const rockBytes = await archive.extractFile(pkdFile, rockPath);
            rockPositions = [];
            
            if (rockBytes) {
                const text = new TextDecoder().decode(rockBytes);
                // e.g. MakeStdObj( vector(1728,8),"rock_1",-4,...);
                const regex = /MakeStdObj\(\s*vector\(([-0-9.]+),\s*([-0-9.]+)\)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    rockPositions.push({
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2])
                    });
                }
            }
            
            render();
            statusMsg.textContent = `Successfully loaded Stage ${stageId}! (${treePositions.length} trees, ${rockPositions.length} rocks)`;
        } catch (e: any) {
            statusMsg.textContent = "Error: " + e.message;
            console.error(e);
            
            // Clear on error
            currentImageData = null;
            treePositions = [];
            rockPositions = [];
            const ctx = stageCanvas.getContext('2d');
            ctx?.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
        }
    }
});
