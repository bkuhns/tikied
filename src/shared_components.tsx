import React from 'react';
import { ISLANDS } from './stages_data.js';

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

interface StageSelectorProps {
    selectedStage: string;
    setSelectedStage: (val: string) => void;
    difficultyIndex?: number;
    setDifficultyIndex?: (val: number) => void;
    showDifficulty?: boolean;
}

export const StageSelector: React.FC<StageSelectorProps> = ({ selectedStage, setSelectedStage, difficultyIndex = 1, setDifficultyIndex, showDifficulty = true }) => {
    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            <div className="form-group" style={{ flex: 1 }}>
                <label>Stage:</label>
                <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
                    {ISLANDS.map(island => (
                        <optgroup key={island.id} label={island.name}>
                            {island.stages.map(stage => (
                                <option key={stage.id} value={stage.id}>
                                    Stage {stage.id}: {stage.difficulty} - {stage.introduction}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
            {showDifficulty && setDifficultyIndex && (
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Difficulty:</label>
                    <select value={difficultyIndex} onChange={e => setDifficultyIndex(parseInt(e.target.value))}>
                        {DIFFICULTY_LEVELS.map((level, idx) => (
                            <option key={idx} value={idx}>{level}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};
