import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';

const STAGES = [
  { id: "1", name: "Tiki Island - tutorial" },
  { id: "11", name: "Tiki Island - Easy 1" },
  { id: "15", name: "Tiki Island - Easy 2" },
  { id: "10", name: "Tiki Island - Easy 3" },
  { id: "6", name: "Tiki Island - Easy 4" },
  { id: "5", name: "Tiki Island - Medium 1" },
  { id: "8", name: "Tiki Island - Medium 2" },
  { id: "4", name: "Tiki Island - Medium 3" },
  { id: "12", name: "Tiki Island - Medium 4" },
  { id: "9", name: "Tiki Island - Medium 5" },
  { id: "2", name: "Tiki Island - Medium 6" },
  { id: "7", name: "Tiki Island - Medium 7" },
  { id: "3", name: "Tiki Island - Hard 1" },
  { id: "13", name: "Tiki Island - Hard 2" },
  { id: "14", name: "Tiki Island - Hard 3" },
  { id: "19", name: "Tiki Island - Hard 4" },
  { id: "16", name: "Tiki Island - Hard 5" },
  { id: "18", name: "Tiki Island - Hard 6" },
  { id: "17", name: "Tiki Island - Secret 1" },
  { id: "20", name: "Tiki Island - Secret 2" },
  { id: "21", name: "Tiki Island - Secret 3" },
  { id: "50", name: "Toki Island - Easy 1" },
  { id: "53", name: "Toki Island - Easy 4" },
  { id: "51", name: "Toki Island - Easy 2" },
  { id: "44", name: "Toki Island - Medium 1" },
  { id: "46", name: "Toki Island - Easy 3" },
  { id: "48", name: "Toki Island - Special 1" },
  { id: "45", name: "Toki Island - Medium 2" },
  { id: "43", name: "Toki Island - Hard 1" },
  { id: "49", name: "Toki Island - Medium 3" },
  { id: "57", name: "Toki Island - Medium 4" },
  { id: "55", name: "Toki Island - Special 2" },
  { id: "52", name: "Toki Island - Hard 2" },
  { id: "54", name: "Toki Island - Hard 3" },
  { id: "47", name: "Toki Island - Special 3" },
  { id: "56", name: "Toki Island - Final Stage" },
  { id: "74", name: "TucTuc Island - Gatepos" },
  { id: "75", name: "TucTuc Island - Sand On Left" },
  { id: "79", name: "TucTuc Island - Top One Near Waterfall Platau" },
  { id: "82", name: "TucTuc Island - Swamp One On Right" }
];

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

    // Populate dropdown
    for (const stage of STAGES) {
        const option = document.createElement('option');
        option.value = stage.id;
        option.textContent = `Stage ${stage.id}: ${stage.name}`;
        stageSelect.appendChild(option);
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
