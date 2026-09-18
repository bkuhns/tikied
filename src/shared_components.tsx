import React, { useState, useEffect } from 'react';
import { ISLANDS, StageInfo } from './stages_data.js';
import { GameDataGateway } from './editor_api.js';
import { 
    Button, 
    Dialog, 
    DialogTrigger, 
    DialogSurface, 
    DialogTitle, 
    DialogBody, 
    DialogContent 
} from '@fluentui/react-components';

export const DIFFICULTY_LEVELS = ["Casual", "Regular", "Hardcore"];

export const DIFFICULTY_DATA: Record<string, { boss: number[], multiply: number[], count: number[] }> = {
    "Tiki Island": {
        boss: [0.85, 1.00, 1.10],
        multiply: [0.90, 1.00, 1.35],
        count: [0.75, 1.00, 0.80]
    },
    "Toki Island": {
        boss: [0.75, 1.00, 1.05],
        multiply: [0.90, 1.00, 1.20],
        count: [0.75, 1.00, 0.85]
    },
    "TucTuc Island": {
        boss: [0.85, 1.00, 1.10],
        multiply: [0.90, 1.00, 1.35],
        count: [0.75, 1.00, 0.80]
    }
};

interface ArchiveSelectorProps {
    pkiFile: File | null;
    setPkiFile: (file: File | null) => void;
    pkdFile: File | null;
    setPkdFile: (file: File | null) => void;
    onLoadArchive: (pki: File, pkd: File) => void;
    status: string;
}

export const ArchiveSelector: React.FC<ArchiveSelectorProps> = ({ pkiFile, setPkiFile, pkdFile, setPkdFile, onLoadArchive, status }) => {
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        let newPki = pkiFile;
        let newPkd = pkdFile;

        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.pkiwin')) {
                newPki = file;
                setPkiFile(file);
            } else if (file.name.toLowerCase().endsWith('.pkdwin')) {
                newPkd = file;
                setPkdFile(file);
            }
        }

        if (newPki && newPkd) {
            onLoadArchive(newPki, newPkd);
        }
    };
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
                <label style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: 'var(--brand-primary, #6BB338)',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}>
                    Select Game Archives (monsters.pkiwin & monsters.pkdwin)
                    <input 
                        type="file" 
                        accept=".pkiwin,.pkdwin" 
                        multiple 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }}
                    />
                </label>
            </div>
            
            <div style={{ fontSize: '0.9em', color: 'var(--neutral-fg-subtle, #523C2A)' }}>
                <div><strong>PKI:</strong> {pkiFile ? pkiFile.name : 'Not selected'}</div>
                <div><strong>PKD:</strong> {pkdFile ? pkdFile.name : 'Not selected'}</div>
            </div>

            {status && <div id="status" className="status-msg">{status}</div>}
        </div>
    );
};

interface StageSelectionProps {
    gateway: GameDataGateway;
    onSelectStage: (stage: StageInfo) => void;
}

export const StageSelection: React.FC<StageSelectionProps> = ({ gateway, onSelectStage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [thumbnailsUrl, setThumbnailsUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!gateway || !isOpen || thumbnailsUrl) return;

        const loadThumbnails = async () => {
            try {
                const imgData = await gateway.getStageThumbnails();
                if (imgData) {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgData.width;
                    canvas.height = imgData.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.putImageData(imgData, 0, 0);
                    setThumbnailsUrl(canvas.toDataURL());
                }
            } catch (e) {
                console.error("Failed to load stage thumbnails", e);
            }
        };

        loadThumbnails();
    }, [gateway, isOpen, thumbnailsUrl]);

    const getThumbnailIndex = (stageId: number): number => {
        if (stageId >= 1 && stageId <= 21) return stageId - 1; // Tiki
        if (stageId >= 43 && stageId <= 57) return stageId - 22; // Toki
        if (stageId >= 73 && stageId <= 83) return stageId - 37; // TucTuc
        return 47; // Unknown
    };

    const getThumbnailStyle = (stageId: number): React.CSSProperties => {
        if (!thumbnailsUrl) {
            return {
                width: '192.5px', height: '97.5px',
                backgroundColor: 'var(--neutral-bg-surface, #E3DCBE)',
                display: 'inline-block'
            };
        }
        
        const thumb = getThumbnailIndex(stageId);
        const thumbX = thumb % 5;
        const thumbY = 9 - Math.floor(thumb / 5);
        
        const posX = -(thumbX * 192.5);
        const posY = -(thumbY * 100);

        return {
            width: '192.5px', 
            height: '97.5px',
            backgroundImage: `url(${thumbnailsUrl})`,
            backgroundSize: '962.5px 1000px',
            backgroundPosition: `${posX}px ${posY}px`,
            display: 'inline-block',
            flexShrink: 0,
            border: '2px solid var(--neutral-stroke-1, #D2C8A8)',
            borderRadius: '4px'
        };
    };

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => setIsOpen(data.open)}>
            <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary" onClick={() => setIsOpen(true)}>Select Stage</Button>
            </DialogTrigger>
            <DialogSurface style={{ maxWidth: '800px', width: '90vw' }}>
                <DialogBody>
                    <DialogTitle>Select Stage</DialogTitle>
                    <DialogContent style={{ maxHeight: '65vh', overflowY: 'auto', marginTop: '10px' }}>
                        {ISLANDS.map(island => (
                            <div key={island.id} style={{ marginBottom: '20px' }}>
                                <h3 style={{ borderBottom: '2px solid var(--neutral-stroke-2, #BEB28E)', paddingBottom: '5px' }}>{island.name}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {island.stages.map(stage => (
                                        <div 
                                            key={stage.id} 
                                            className="stage-row"
                                            onClick={() => {
                                                onSelectStage(stage);
                                                setIsOpen(false);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div style={getThumbnailStyle(stage.id)}></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{stage.difficulty}</div>
                                                <div style={{ fontSize: '1.1em', color: 'var(--neutral-fg-subtle, #523C2A)' }}>{stage.introduction}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </DialogContent>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};
