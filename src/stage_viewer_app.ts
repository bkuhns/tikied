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

    let archive: PJMArchive | null = null;
    let pkdFile: File | null = null;

    // Populate dropdown with grouped islands
    for (const island of ISLANDS) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = island.name;
        
        for (const stage of island.stages) {
            const option = document.createElement('option');
            option.value = stage.id.toString();
            // E.g., Stage 11: Easy 1 - The waves begin.
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

    async function loadStage(stageId: string) {
        if (!archive || !pkdFile) return;

        try {
            statusMsg.textContent = `Extracting Stage ${stageId} background...`;
            const path = `data-common/textures/bgdata/bg/stage${stageId}.dds`;
            
            const fileBytes = await archive.extractFile(pkdFile, path);
            if (!fileBytes) {
                throw new Error(`Background file '${path}' not found in the archive.`);
            }

            statusMsg.textContent = `Decoding DDS...`;
            DDSDecoder.drawToCanvas(fileBytes, stageCanvas);
            
            statusMsg.textContent = `Successfully loaded Stage ${stageId}!`;
        } catch (e: any) {
            statusMsg.textContent = "Error: " + e.message;
            console.error(e);
            
            // Clear canvas on error
            const ctx = stageCanvas.getContext('2d');
            ctx?.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
        }
    }
});
