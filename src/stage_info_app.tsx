import React, { useState } from 'react';
import { ISLANDS, StageInfo } from './stages_data.js';
import { StageSelection, DIFFICULTY_LEVELS } from './shared_components.js';
import { GameDataGateway } from './editor_api.js';
import { WaveTable } from './wave_table.js';

interface StageInfoAppProps {
    gateway: GameDataGateway;
    onBack: () => void;
}

export const StageInfoApp: React.FC<StageInfoAppProps> = ({ gateway, onBack }) => {
    const [selectedStage, setSelectedStage] = useState<StageInfo>(ISLANDS[0].stages.find(s => s.id === 11) || ISLANDS[0].stages[0]);
    const [difficultyIndex, setDifficultyIndex] = useState<number>(1);

    let currentIslandName = "Toki Island"; // Default fallback
    for (const island of ISLANDS) {
        if (island.stages.find(s => s.id === selectedStage.id)) {
            currentIslandName = island.name;
            break;
        }
    }

    return (
        <div className="container">
            <nav className="breadcrumb">
                <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>← Back to Hub</a>
            </nav>
            <h1>Stage Info</h1>
            <p>View enemy waves and stage settings.</p>

            <div className="section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <StageSelection 
                        gateway={gateway}
                        onSelectStage={setSelectedStage}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label>Difficulty:</label>
                        <select value={difficultyIndex} onChange={e => setDifficultyIndex(parseInt(e.target.value))}>
                            {DIFFICULTY_LEVELS.map((level, idx) => (
                                <option key={idx} value={idx}>{level}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <h2 style={{ marginTop: '10px' }}>Stage {selectedStage.id}: {selectedStage.difficulty} - {selectedStage.introduction}</h2>
            </div>

            <WaveTable 
                stageId={selectedStage.id}
                islandName={currentIslandName}
                difficultyIndex={difficultyIndex}
                gateway={gateway}
            />
        </div>
    );
};
