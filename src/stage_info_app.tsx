import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { DDSDecoder } from './dds_decoder.js';
import { ISLANDS } from './stages_data.js';
import { StageParser, StageSettings, WaveInfo } from './stage_parser.js';



const StageInfoApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [status, setStatus] = useState<string>('Select PKI and PKD files.');
    
    const [selectedStage, setSelectedStage] = useState<string>("11");
    const [stageSettings, setStageSettings] = useState<StageSettings | null>(null);
    const [barIconsUrl, setBarIconsUrl] = useState<string | null>(null);
    const [barIconsSize, setBarIconsSize] = useState<{w: number, h: number} | null>(null);

    // Initialize archive when files are selected
    useEffect(() => {
        if (pkiFile && pkdFile) {
            setStatus('Loading archive...');
            PJMArchive.parse(pkiFile).then((newArchive) => {
                setArchive(newArchive);
                setStatus('Archive loaded.');
                extractBarIcons(newArchive);
            }).catch((e: any) => setStatus('Error loading archive: ' + e.message));
        }
    }, [pkiFile, pkdFile]);

    // Extract Bar Icons
    const extractBarIcons = async (arch: PJMArchive) => {
        try {
            const bytes = await arch.extractFile(pkdFile!, 'data-common/textures/frontend/shared/baricons.dds');
            if (bytes) {
                const imgData = DDSDecoder.decodeToImageData(bytes, true);
                const canvas = document.createElement('canvas');
                canvas.width = imgData.width;
                canvas.height = imgData.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.putImageData(imgData, 0, 0);
                    setBarIconsUrl(canvas.toDataURL());
                    setBarIconsSize({ w: imgData.width, h: imgData.height });
                }
            }
        } catch (e) {
            console.error("Failed to extract bar icons", e);
        }
    };

    // Load Stage Data
    useEffect(() => {
        if (!archive || !pkdFile) return;

        const loadData = async () => {
            setStatus(`Loading data for Stage ${selectedStage}...`);
            try {
                const itemPath = `data-common/stage_data/umd/stage${selectedStage}/item_data.txt`;
                const enemyPath = `data-common/stage_data/umd/stage${selectedStage}/enemy_data.txt`;
                
                const itemBytes = await archive.extractFile(pkdFile, itemPath);
                const enemyBytes = await archive.extractFile(pkdFile, enemyPath);
                
                if (!itemBytes || !enemyBytes) {
                    setStatus(`Failed to find data for stage ${selectedStage}.`);
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
                    p1Money: itemData.p1Money,
                    p2Money: itemData.p2Money,
                    waves: waves
                });
                setStatus(`Stage ${selectedStage} loaded.`);
            } catch (e: any) {
                setStatus('Error loading stage data: ' + e.message);
            }
        };

        loadData();
    }, [archive, selectedStage]);

    // Calculate Grand Totals
    let totalCoins = 0;
    let totalGems = 0;
    if (stageSettings) {
        for (const wave of stageSettings.waves) {
            totalCoins += wave.coinsTotal;
            totalGems += wave.gemsTotal;
        }
    }

    return (
        <div className="container">
            <nav className="breadcrumb">
                <a href="index.html">← Back to Hub</a>
            </nav>
            <h1>Stage Info</h1>
            <p>View enemy waves and stage settings.</p>
            
            <div className="section">
                <h2>1. Select Game Archives</h2>
                <div className="form-group">
                    <label>Original <code>monsters.pkiwin</code>:</label>
                    <input type="file" accept=".pkiwin" onChange={e => setPkiFile(e.target.files?.[0] || null)} />
                </div>
                <div className="form-group">
                    <label>Original <code>monsters.pkdwin</code>:</label>
                    <input type="file" accept=".pkdwin" onChange={e => setPkdFile(e.target.files?.[0] || null)} />
                </div>
                <div id="status" className="status-msg">{status}</div>
            </div>

            {archive && (
                <div className="section">
                    <h2>2. Select Stage</h2>
                    <div className="form-group">
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
                </div>
            )}

            {stageSettings && (
                <div className="section">
                    <h2>3. Stage Totals & Settings</h2>
                    <div style={{ display: 'flex', gap: '40px' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li><strong>Grand Total Coins:</strong> 🪙 {totalCoins}</li>
                            <li><strong>Grand Total Gems:</strong> 💎 {totalGems}</li>
                        </ul>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li><strong>1P Initial Money:</strong> {stageSettings.p1Money}</li>
                            <li><strong>2P Initial Money:</strong> {stageSettings.p2Money}</li>
                            <li><strong>Coin Value:</strong> {stageSettings.coinWorth}</li>
                        </ul>
                    </div>
                </div>
            )}

            {stageSettings && (
                <div className="section">
                    <h2>4. Waves ({stageSettings.waves.length})</h2>
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
                                    <span style={{ fontSize: '0.9em' }}>
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
                                            <th>HP (per monster)</th>
                                            <th>Start Time (s)</th>
                                            <th>Interval (s)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wave.subWaves.map((sub, j) => {
                                            const m = sub.monster;
                                            let displayName = m.baseName;
                                            if (m.isShielded) displayName += " (shielded)";
                                            if (m.isMagicResistant) displayName += " (magic resistant)";
                                            if (m.isCold) displayName += " (cold)";
                                            if (m.isOnFire) displayName += " 🔥 (on fire)";
                                            
                                            const waveMult = wave.hpUp !== undefined ? wave.hpUp : 1.0;
                                            const finalHp = m.baseHealth > 0 ? (m.baseHealth * waveMult).toFixed(2) : '-';

                                            return (
                                                <tr key={j}>
                                                    <td><strong>{displayName}</strong></td>
                                                    <td>{sub.count}</td>
                                                    <td>{finalHp}</td>
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

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<StageInfoApp />);
}