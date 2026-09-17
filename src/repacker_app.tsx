import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive, ReplacementFile } from './pjm_archive.js';
import { ArchiveSelector } from './shared_components.js';

declare const pako: any;

const RepackerApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [modFile, setModFile] = useState<File | null>(null);
    const [targetPath, setTargetPath] = useState<string>("data-common/textures/bgdata/bg/stage11.dds");
    const [status, setStatus] = useState<string>('');
    const [isRepacking, setIsRepacking] = useState<boolean>(false);
    
    const [finalPkiBlob, setFinalPkiBlob] = useState<Blob | null>(null);
    const [finalPkdBlob, setFinalPkdBlob] = useState<Blob | null>(null);

    const handleLoadArchive = async () => {
        if (!pkiFile || !pkdFile) {
            setStatus('Please select both PKI and PKD files.');
            return;
        }
        try {
            setStatus("Parsing original archives...");
            const arch = await PJMArchive.parse(pkiFile);
            setArchive(arch);
            setStatus("Archives loaded! Select a replacement file.");
        } catch (e: any) {
            setStatus("Error: " + e.message);
            console.error(e);
        }
    };

    const handleRepack = async () => {
        if (!archive || !pkdFile || !modFile || !targetPath.trim()) return;

        try {
            setStatus("Compressing modified file...");
            setFinalPkiBlob(null);
            setFinalPkdBlob(null);
            setIsRepacking(true);

            const rawBuffer = await modFile.arrayBuffer();
            const rawUint8 = new Uint8Array(rawBuffer);
            
            // Compress using pako (ZLIB format, matching Python's zlib.compress)
            const compressedUint8 = pako.deflate(rawUint8);

            const hash = PJMArchive.fnv1(targetPath.trim());
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
            setStatus("Repacking archive (Zero-memory streaming)...");
            const { pkiBlob, pkdBlob } = await archive.repack(pkdFile, replacements);

            setFinalPkiBlob(pkiBlob);
            setFinalPkdBlob(pkdBlob);

            // 4. Try Native File System Access API for seamless "Save As"
            if ('showSaveFilePicker' in window) {
                setStatus("Prompting for save locations...");
                try {
                    await saveFilePicker(pkiBlob, "monsters.pkiwin");
                    await saveFilePicker(pkdBlob, "monsters.pkdwin");
                    setStatus("Files saved successfully!");
                    setIsRepacking(false);
                    return; // Done!
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        setStatus("Save cancelled by user.");
                        setIsRepacking(false);
                        return;
                    }
                    console.warn("File System Access API failed, falling back to download links", err);
                }
            }

            // 5. Fallback for Firefox / unsecure contexts
            setStatus("Repack complete. Click the buttons below to download.");

        } catch (e: any) {
            setStatus("Error: " + e.message);
            console.error(e);
        } finally {
            setIsRepacking(false);
        }
    };

    const saveFilePicker = async (blob: Blob, suggestedName: string) => {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({ suggestedName });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    };

    const triggerDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    const canRepack = archive !== null && pkdFile !== null && modFile !== null && targetPath.trim() !== '';

    return (
        <div className="container">
            <nav className="breadcrumb">
                <a href="index.html">← Back to Hub</a>
            </nav>
            <h1>Archive Repacker</h1>
            <p>Modify the game's data archive entirely in your browser without unpacking to your drive.</p>
            
            <div className="section">
                <h2>1. Original Archives</h2>
                <ArchiveSelector 
                    pkiFile={pkiFile} setPkiFile={setPkiFile}
                    pkdFile={pkdFile} setPkdFile={setPkdFile}
                    onLoadArchive={handleLoadArchive}
                    status={status}
                />
            </div>

            {archive && (
                <>
                    <div className="section">
                        <h2>2. Replacement Data</h2>
                        <p>Select a modified file to inject into the repacked archive.</p>
                        <div className="form-group">
                            <label>Modified File:</label>
                            <input type="file" onChange={e => setModFile(e.target.files?.[0] || null)} />
                        </div>
                        <div className="form-group">
                            <label>Target Internal Path:</label>
                            <input 
                                type="text" 
                                value={targetPath} 
                                onChange={e => setTargetPath(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div className="section">
                        <h2>3. Repack & Download</h2>
                        <button 
                            onClick={handleRepack} 
                            disabled={!canRepack || isRepacking}
                        >
                            Repack Archive
                        </button>
                        
                        {(finalPkiBlob || finalPkdBlob) && (
                            <div id="downloadSection" style={{ marginTop: '15px' }}>
                                <p>Repack successful! Download your files:</p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => finalPkiBlob && triggerDownload(finalPkiBlob, "monsters.pkiwin")}>
                                        Download monsters.pkiwin
                                    </button>
                                    <button onClick={() => finalPkdBlob && triggerDownload(finalPkdBlob, "monsters.pkdwin")}>
                                        Download monsters.pkdwin
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<RepackerApp />);
}
