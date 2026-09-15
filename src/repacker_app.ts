import { PJMArchive, ReplacementFile } from './pjm_archive.js';
declare const pako: any;

document.addEventListener('DOMContentLoaded', () => {
    const pkiInput = document.getElementById('pkiInput') as HTMLInputElement;
    const pkdInput = document.getElementById('pkdInput') as HTMLInputElement;
    const replaceFileInput = document.getElementById('replaceFile') as HTMLInputElement;
    const replacePathInput = document.getElementById('replacePath') as HTMLInputElement;
    const repackBtn = document.getElementById('repackBtn') as HTMLButtonElement;
    
    const statusMsg = document.getElementById('status') as HTMLDivElement;
    const downloadSection = document.getElementById('downloadSection') as HTMLDivElement;
    const downloadPkiBtn = document.getElementById('downloadPkiBtn') as HTMLButtonElement;
    const downloadPkdBtn = document.getElementById('downloadPkdBtn') as HTMLButtonElement;

    // Store the resulting blobs so they can be downloaded
    let finalPkiBlob: Blob | null = null;
    let finalPkdBlob: Blob | null = null;

    function checkInputs() {
        if (pkiInput.files?.length && pkdInput.files?.length && replaceFileInput.files?.length) {
            repackBtn.disabled = false;
        } else {
            repackBtn.disabled = true;
        }
    }

    pkiInput.addEventListener('change', checkInputs);
    pkdInput.addEventListener('change', checkInputs);
    replaceFileInput.addEventListener('change', checkInputs);

    repackBtn.addEventListener('click', async () => {
        try {
            statusMsg.textContent = "Parsing original archives...";
            downloadSection.classList.add('hidden');
            repackBtn.disabled = true;

            const pkiFile = pkiInput.files![0];
            const pkdFile = pkdInput.files![0];
            const modFile = replaceFileInput.files![0];
            const targetPath = replacePathInput.value.trim();

            if (!targetPath) {
                throw new Error("Target internal path is required.");
            }

            // 1. Parse the original PKIWIN
            const archive = await PJMArchive.parse(pkiFile);

            // 2. Prepare the modified file
            statusMsg.textContent = "Compressing modified file...";
            const rawBuffer = await modFile.arrayBuffer();
            const rawUint8 = new Uint8Array(rawBuffer);
            
            // Compress using pako (ZLIB format, matching Python's zlib.compress)
            const compressedUint8 = pako.deflate(rawUint8);

            const hash = PJMArchive.fnv1(targetPath);
            const replacements = new Map<number, ReplacementFile>();
            replacements.set(hash, {
                uncompressedSize: rawUint8.length,
                compressedSize: compressedUint8.length,
                compressedData: compressedUint8
            });

            // Ensure the file actually existed in the archive
            if (!archive.entries.some(e => e.hash === hash)) {
                throw new Error(`The target path "${targetPath}" (hash: ${hash}) was not found in the original archive index!`);
            }

            // 3. Repack
            statusMsg.textContent = "Repacking archive (Zero-memory streaming)...";
            const { pkiBlob, pkdBlob } = await archive.repack(pkdFile, replacements);

            finalPkiBlob = pkiBlob;
            finalPkdBlob = pkdBlob;

            // 4. Try Native File System Access API for seamless "Save As"
            if ('showSaveFilePicker' in window) {
                statusMsg.textContent = "Prompting for save locations...";
                try {
                    await saveFilePicker(finalPkiBlob, "monsters.pkiwin");
                    await saveFilePicker(finalPkdBlob, "monsters.pkdwin");
                    statusMsg.textContent = "Files saved successfully!";
                    repackBtn.disabled = false;
                    return; // Done!
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        statusMsg.textContent = "Save cancelled by user.";
                        repackBtn.disabled = false;
                        return;
                    }
                    console.warn("File System Access API failed, falling back to download links", err);
                }
            }

            // 5. Fallback for Firefox / unsecure contexts
            statusMsg.textContent = "Repack complete. Click the buttons below to download.";
            downloadSection.classList.remove('hidden');

        } catch (e: any) {
            statusMsg.textContent = "Error: " + e.message;
            console.error(e);
        } finally {
            repackBtn.disabled = false;
        }
    });

    async function saveFilePicker(blob: Blob, suggestedName: string) {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
            suggestedName,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    }

    function triggerDownload(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    downloadPkiBtn.addEventListener('click', () => {
        if (finalPkiBlob) triggerDownload(finalPkiBlob, "monsters.pkiwin");
    });

    downloadPkdBtn.addEventListener('click', () => {
        if (finalPkdBlob) triggerDownload(finalPkdBlob, "monsters.pkdwin");
    });
});
