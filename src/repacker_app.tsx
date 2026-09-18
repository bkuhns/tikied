import React, { useState } from 'react';
import { PJMArchive, ReplacementFile } from './pjm_archive.js';
import { 
    Dialog, DialogSurface, DialogTitle, DialogBody, DialogContent, DialogActions,
    Button, Input, Label 
} from '@fluentui/react-components';

declare const pako: any;

export interface RepackerModalProps {
    isOpen: boolean;
    onClose: () => void;
    archive: PJMArchive;
    pkdFile: File;
    onToast: (message: string, intent?: "success" | "error" | "info") => void;
}

export const RepackerModal: React.FC<RepackerModalProps> = ({ isOpen, onClose, archive, pkdFile, onToast }) => {
    const [modFile, setModFile] = useState<File | null>(null);
    const [targetPath, setTargetPath] = useState<string>("data-common/textures/bgdata/bg/stage11.dds");
    const [status, setStatus] = useState<string>('');
    const [isRepacking, setIsRepacking] = useState<boolean>(false);

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

    const handleRepack = async () => {
        if (!archive || !pkdFile || !modFile || !targetPath.trim()) return;

        try {
            setStatus("Compressing modified file...");
            setIsRepacking(true);

            const rawBuffer = await modFile.arrayBuffer();
            const rawUint8 = new Uint8Array(rawBuffer);
            
            // Compress using pako
            const compressedUint8 = pako.deflate(rawUint8);

            const hash = PJMArchive.fnv1(targetPath.trim());
            const replacements = new Map<number, ReplacementFile>();
            replacements.set(hash, {
                uncompressedSize: rawUint8.length,
                compressedSize: compressedUint8.length,
                compressedData: compressedUint8
            });

            if (!archive.entries.some(e => e.hash === hash)) {
                throw new Error(`The target path "${targetPath}" (hash: ${hash}) was not found in the original archive index!`);
            }

            setStatus("Repacking archive (Zero-memory streaming)...");
            const { pkiBlob, pkdBlob } = await archive.repack(pkdFile, replacements);

            if ('showSaveFilePicker' in window) {
                setStatus("Prompting for save locations...");
                try {
                    // @ts-ignore
                    const pkiHandle = await window.showSaveFilePicker({ suggestedName: "monsters.pkiwin" });
                    const pkiWritable = await pkiHandle.createWritable();
                    await pkiWritable.write(pkiBlob);
                    await pkiWritable.close();

                    // @ts-ignore
                    const pkdHandle = await window.showSaveFilePicker({ suggestedName: "monsters.pkdwin" });
                    const pkdWritable = await pkdHandle.createWritable();
                    await pkdWritable.write(pkdBlob);
                    await pkdWritable.close();
                    
                    onToast("Files saved successfully!", "success");
                    onClose();
                    return;
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        setStatus("Save cancelled by user.");
                        setIsRepacking(false);
                        return;
                    }
                    console.warn("File System Access API failed, falling back to download links", err);
                }
            }

            // Fallback for Firefox / unsecure contexts
            triggerDownload(pkiBlob, "monsters.pkiwin");
            triggerDownload(pkdBlob, "monsters.pkdwin");
            onToast("Archive repacked and downloaded!", "success");
            onClose();

        } catch (e: any) {
            setStatus("Error: " + e.message);
            onToast("Repack Failed: " + e.message, "error");
            console.error(e);
        } finally {
            setIsRepacking(false);
        }
    };

    const canRepack = archive !== null && pkdFile !== null && modFile !== null && targetPath.trim() !== '';

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>Archive Repacker</DialogTitle>
                    <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                        <p>Modify the game's data archive entirely in your browser without unpacking to your drive.</p>
                        
                        <div>
                            <Label weight="semibold">Modified File</Label>
                            <input type="file" onChange={e => setModFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: '5px' }} />
                        </div>

                        <div>
                            <Label weight="semibold">Target Internal Path</Label>
                            <Input 
                                value={targetPath} 
                                onChange={(e, data) => setTargetPath(data.value)}
                                style={{ width: '100%', marginTop: '5px' }}
                            />
                        </div>

                        {status && <div style={{ color: 'var(--brand-accent)', fontSize: '0.9em' }}>{status}</div>}
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={onClose}>Close</Button>
                        <Button appearance="primary" disabled={!canRepack || isRepacking} onClick={handleRepack}>
                            {isRepacking ? "Repacking..." : "Repack"}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};
