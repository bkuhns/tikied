import React, { useState, useEffect } from 'react';
import { ISLANDS, StageInfo } from './stages_data.js';
import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';

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
    onLoadArchive: () => void;
    status: string;
}

export const ArchiveSelector: React.FC<ArchiveSelectorProps> = ({ pkiFile, setPkiFile, pkdFile, setPkdFile, onLoadArchive, status }) => {
    return (
        <>
            <div className="form-group">
                <label>Original <code>monsters.pkiwin</code>:</label>
                <input type="file" accept=".pkiwin" onChange={e => setPkiFile(e.target.files?.[0] || null)} />
            </div>
            <div className="form-group">
                <label>Original <code>monsters.pkdwin</code>:</label>
                <input type="file" accept=".pkdwin" onChange={e => setPkdFile(e.target.files?.[0] || null)} />
            </div>
            <button 
                onClick={onLoadArchive} 
                disabled={!pkiFile || !pkdFile}
            >
                Load archives
            </button>
            {status && <div id="status" className="status-msg">{status}</div>}
        </>
    );
};

interface StageSelectionProps {
    archive: PJMArchive | null;
    pkdFile: File | null;
    onSelectStage: (stage: StageInfo) => void;
}

export const StageSelection: React.FC<StageSelectionProps> = ({ archive, pkdFile, onSelectStage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [thumbnailsUrl, setThumbnailsUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!archive || !pkdFile || !isOpen || thumbnailsUrl) return;

        const loadThumbnails = async () => {
            try {
                const bytes = await archive.extractFile(pkdFile, "data-common/textures/frontend/map/stage_thumbnails.dds");
                if (bytes) {
                    const imgData = DDSDecoder.decodeToImageData(bytes, true); // true = flipVert
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
    }, [archive, pkdFile, isOpen, thumbnailsUrl]);

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
                backgroundColor: '#eee',
                display: 'inline-block'
            };
        }
        
        const thumb = getThumbnailIndex(stageId);
        const thumbX = thumb % 5;
        const thumbY = 9 - Math.floor(thumb / 5);
        
        // Exact pixel positioning to allow cropping
        // Full width: 192.5 * 5 = 962.5px
        // Full height: 100 * 10 = 1000px
        const posX = -(thumbX * 192.5);
        const posY = -(thumbY * 100);

        return {
            width: '192.5px', 
            height: '97.5px', // cropped from 100px (5px native)
            backgroundImage: `url(${thumbnailsUrl})`,
            backgroundSize: '962.5px 1000px',
            backgroundPosition: `${posX}px ${posY}px`,
            display: 'inline-block',
            flexShrink: 0,
            border: '2px solid #ccc',
            borderRadius: '4px'
        };
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)}>Select Stage</button>

            {isOpen && (
                <div className="modal-overlay" onClick={() => setIsOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Select Stage</h2>
                            <button onClick={() => setIsOpen(false)}>Close</button>
                        </div>
                        
                        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {ISLANDS.map(island => (
                                <div key={island.id} style={{ marginBottom: '20px' }}>
                                    <h3 style={{ borderBottom: '2px solid #666', paddingBottom: '5px' }}>{island.name}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {island.stages.map(stage => (
                                            <div 
                                                key={stage.id} 
                                                className="stage-row"
                                                onClick={() => {
                                                    onSelectStage(stage);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                <div style={getThumbnailStyle(stage.id)}></div>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{stage.difficulty}</div>
                                                    <div style={{ fontSize: '1.1em', color: '#555' }}>{stage.introduction}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
