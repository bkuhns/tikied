import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';
import { ISLANDS, StageInfo } from './stages_data.js';
import { StageParser, StageSettings, WaveInfo } from './stage_parser.js';
import { RoutesRenderer } from './routes_renderer.js';

import { StageSelection, DIFFICULTY_LEVELS, DIFFICULTY_DATA } from './shared_components.js';

interface StageInfoAppProps {
    archive: PJMArchive;
    pkiFile: File;
    pkdFile: File;
    onBack: () => void;
}

export const StageInfoApp: React.FC<StageInfoAppProps> = ({ archive, pkdFile, onBack }) => {
    const [status, setStatus] = useState<string>('');
    
    const [selectedStage, setSelectedStage] = useState<StageInfo>(ISLANDS[0].stages.find(s => s.id === 11) || ISLANDS[0].stages[0]);
    const [difficultyIndex, setDifficultyIndex] = useState<number>(1);
    const [stageSettings, setStageSettings] = useState<StageSettings | null>(null);
    const [barIconsUrl, setBarIconsUrl] = useState<string | null>(null);
    const [barIconsSize, setBarIconsSize] = useState<{w: number, h: number} | null>(null);

    // Extract Bar Icons
    const extractBarIcons = async (arch: PJMArchive) => {
        try {
            const bytes = await arch.extractFile(pkdFile, "data-common/textures/frontend/shared/baricons.dds");
            if (bytes) {
                const imgData = DDSDecoder.decodeToImageData(bytes, true); // true = flipVert
                
                const canvas = document.createElement('canvas');
                canvas.width = imgData.width;
                canvas.height = imgData.height;
                const ctx = canvas.getContext('2d');
                ctx?.putImageData(imgData, 0, 0);
                
                setBarIconsSize({w: imgData.width, h: imgData.height});
                setBarIconsUrl(canvas.toDataURL());
            }
        } catch (e: any) {
            console.error("Failed to extract bar icons:", e);
        }
    };

    useEffect(() => {
        if (archive) extractBarIcons(archive);
    }, [archive]);

    // Load Stage Data
    useEffect(() => {
        if (!archive || !pkdFile) return;

        const loadData = async () => {
            setStatus(`Loading data for Stage ${selectedStage.id}...`);
            try {
                const itemPath = `data-common/stage_data/umd/stage${selectedStage.id}/item_data.txt`;
                const enemyPath = `data-common/stage_data/umd/stage${selectedStage.id}/enemy_data.txt`;
                
                const itemBytes = await archive.extractFile(pkdFile, itemPath);
                const enemyBytes = await archive.extractFile(pkdFile, enemyPath);
                
                if (!itemBytes || !enemyBytes) {
                    setStatus(`Failed to find data for stage ${selectedStage.id}.`);
                    setStageSettings(null);
                    return;
                }

                const decoder = new TextDecoder();
                const itemTxt = decoder.decode(itemBytes);
                const enemyTxt = decoder.decode(enemyBytes);

                const itemData = StageParser.parseItemData(itemTxt);
                const enemyData = StageParser.parseEnemyData(enemyTxt);
                const enemyWaves = enemyData.waves;

                // Build unified list of waves
                const waves: WaveInfo[] = [];
                for (let i = 1; i <= 20; i++) {
                    const waveId = `wave${i}`;
                    const waveData = enemyWaves[waveId];
                    if (waveData && waveData.subWaves.length > 0) {
                        waves.push({
                            id: waveId,
                            subWaves: waveData.subWaves,
                            coinsTotal: itemData.waveCoins[waveId] || 0,
                            gemsTotal: itemData.waveGems[waveId] || 0,
                            startTime: waveData.startTime,
                            balloons: waveData.balloons,
                            hpUp: enemyData.hpUp[i - 1]
                        });
                    }
                }

                setStageSettings({
                    coinWorth: itemData.coinWorth,
                    money1P: itemData.money1P,
                    money2P_1: itemData.money2P_1,
                    money2P_2: itemData.money2P_2,
                    waves: waves
                });
                setStatus(`Stage ${selectedStage.id} loaded.`);
            } catch (e: any) {
                setStatus('Error loading stage data: ' + e.message);
            }
        };

        loadData();
    }, [archive, selectedStage, pkdFile]);

    // Calculate Grand Totals
    let totalCoins = 0;
    let totalGems = 0;
    if (stageSettings) {
        for (const w of stageSettings.waves) {
            totalCoins += w.coinsTotal;
            totalGems += w.gemsTotal;
        }
    }

    // Compute active multipliers
    let currentIslandName = "TucTuc Island"; // Default fallback
    for (const island of ISLANDS) {
        if (island.stages.find(s => s.id === selectedStage.id)) {
            currentIslandName = island.name;
            break;
        }
    }
    
    // If island is past TucTuc (e.g. Gati Gati), it falls back to TucTuc multipliers
    const islandKey = currentIslandName as keyof typeof DIFFICULTY_DATA;
    const difficultyData = DIFFICULTY_DATA[islandKey];
    
    const bossMultiplier = difficultyData.boss[difficultyIndex];
    const hpMultiplier = difficultyData.multiply[difficultyIndex];
    const countMultiplier = difficultyData.count[difficultyIndex];

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
                        archive={archive} pkdFile={pkdFile}
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

            {stageSettings && (
                <>
                    <div className="section">
                        <h2>3. Difficulty Modifiers</h2>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li><strong>Boss HP Multiplier:</strong> {bossMultiplier.toFixed(2)}x</li>
                            <li><strong>Monster HP Multiplier:</strong> {hpMultiplier.toFixed(2)}x</li>
                            <li><strong>Monster Count Multiplier:</strong> {countMultiplier.toFixed(2)}x</li>
                        </ul>
                    </div>
                    <div className="section">
                        <h2>4. Stage Totals & Settings</h2>
                        <div style={{ display: 'flex', gap: '40px' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li><strong>Grand Total Coins:</strong> 🪙 {totalCoins}</li>
                                <li><strong>Grand Total Gems:</strong> 💎 {totalGems}</li>
                            </ul>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li><strong>Initial Coins:</strong> {stageSettings.money1P}</li>
                                <li><strong>Initial Coins (co-op):</strong> {stageSettings.money2P_1} (P1), {stageSettings.money2P_2} (P2)</li>
                                <li><strong>Coin Worth:</strong> {stageSettings.coinWorth}</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}

            {stageSettings && (
                <div className="section">
                    <h2>5. Waves ({stageSettings.waves.length})</h2>
                    {stageSettings.waves.map((wave, i) => {
                        // The icon shown for the wave uses the type of its very first sub-wave.
                        const firstMonster = wave.subWaves[0]?.monster;
                        
                        // Calculate background position
                        // barIcons has 5 columns, 4 rows.
                        let iconStyle = {};
                        let balloonStyle = {};
                        if (barIconsUrl && barIconsSize && firstMonster) {
                            const iconW = barIconsSize.w / 5;
                            const iconH = barIconsSize.h / 4;
                            
                            const col = firstMonster.iconIndex % 5;
                            const row = Math.floor(firstMonster.iconIndex / 5);
                            iconStyle = {
                                backgroundImage: `url(${barIconsUrl})`,
                                backgroundSize: `${barIconsSize.w}px ${barIconsSize.h}px`,
                                backgroundPosition: `-${col * iconW}px -${row * iconH}px`,
                                width: `${iconW}px`,
                                height: `${iconH}px`,
                                transform: `scale(${32 / iconW})`, // visually scale to 32px to fit UI nicely if native is larger
                                transformOrigin: 'top left'
                            };

                            // index 4 (row 0, col 4)
                            balloonStyle = {
                                ...iconStyle,
                                backgroundPosition: `-${4 * iconW}px -${0 * iconH}px`
                            };
                        }

                        return (
                            <div key={wave.id} className="wave-card">
                                <div className="wave-header" style={{ alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {barIconsUrl ? (
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                <div style={{ width: '32px', height: '32px' }}>
                                                    <div style={iconStyle} />
                                                </div>
                                                {wave.balloons && (
                                                    <div style={{ width: '32px', height: '32px' }}>
                                                        <div style={balloonStyle} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                        <span>Wave {i + 1}</span>
                                        <span style={{ fontSize: '0.85em', color: '#666', fontWeight: 'normal' }}>
                                            {wave.startTime !== undefined 
                                                ? `(Start Delay: ${wave.startTime}s)` 
                                                : ''}
                                        </span>
                                    </div>
                                    <span className="wave-details" style={{ fontSize: '0.9em' }}>
                                        {wave.hpUp !== undefined && <span style={{ marginRight: '15px' }}>HP Multiplier: {wave.hpUp}x</span>}
                                        Coins: 🪙 {wave.coinsTotal} | 
                                        Gems: 💎 {wave.gemsTotal}
                                    </span>
                                </div>
                                <table className="subwave-table">
                                    <thead>
                                        <tr>
                                            <th>Monster Name</th>
                                            <th>Count</th>
                                            <th>HP</th>
                                            <th>Route</th>
                                            <th>Start Time (s)</th>
                                            <th>Interval (s)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wave.subWaves.map((sub, j) => {
                                            const m = sub.monster;
                                            
                                            const nameElements: React.ReactNode[] = [<span key="base">{m.baseName}</span>];
                                            if (m.isShielded) nameElements.push(<span key="shielded" title="Shielded" style={{cursor: 'help'}}> 🟢</span>);
                                            if (m.isMagicResistant) nameElements.push(<span key="magic" title="Magic Resistant" style={{cursor: 'help'}}> 🔴</span>);
                                            if (m.isCold) nameElements.push(<span key="cold" title="Cold" style={{cursor: 'help'}}> ❄️</span>);
                                            if (m.isOnFire) nameElements.push(<span key="fire" title="On Fire" style={{cursor: 'help'}}> 🔥</span>);
                                            
                                            // Determine correct multiplier based on if it's a boss
                                            const isBoss = m.id.startsWith("boss");
                                            const globalMult = isBoss ? bossMultiplier : hpMultiplier;
                                            const waveMult = wave.hpUp !== undefined ? wave.hpUp : 1.0;
                                            
                                            const finalHp = m.baseHealth > 0 ? (m.baseHealth * waveMult * globalMult).toFixed(2) : '-';
                                            const finalCount = Math.floor(sub.count * countMultiplier);

                                            return (
                                                <tr key={j}>
                                                    <td><strong>{nameElements}</strong></td>
                                                    <td>{finalCount}</td>
                                                    <td>{finalHp}</td>
                                                    <td>
                                                        {sub.route !== undefined ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    backgroundColor: RoutesRenderer.getRouteColor(sub.route),
                                                                    border: '1px solid #000'
                                                                }}></div>
                                                                {sub.route}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td>{sub.startTime !== undefined ? sub.startTime : '-'}</td>
                                                    <td>{sub.weight !== undefined ? sub.weight : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

