import React, { useState, useEffect } from 'react';
import { StageSettings } from './stage_parser.js';
import { GameDataGateway } from './editor_api.js';
import { RoutesRenderer } from './routes_renderer.js';
import { DIFFICULTY_DATA } from './shared_components.js';

interface WaveTableProps {
    stageId: number;
    islandName: string;
    difficultyIndex: number;
    gateway: GameDataGateway;
}

export const WaveTable: React.FC<WaveTableProps> = ({ stageId, islandName, difficultyIndex, gateway }) => {
    const [status, setStatus] = useState<string>('');
    const [stageSettings, setStageSettings] = useState<StageSettings | null>(null);
    const [barIconsUrl, setBarIconsUrl] = useState<string | null>(null);
    const [barIconsSize, setBarIconsSize] = useState<{w: number, h: number} | null>(null);

    // Load Data
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            setStatus(`Loading data for Stage ${stageId}...`);
            try {
                // Load bar icons
                const imgData = await gateway.getBarIconsImageData();
                if (imgData && isMounted) {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgData.width;
                    canvas.height = imgData.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.putImageData(imgData, 0, 0);
                    
                    setBarIconsSize({w: imgData.width, h: imgData.height});
                    setBarIconsUrl(canvas.toDataURL());
                }

                // Load stage settings
                const settings = await gateway.getStageSettings(stageId);
                if (settings && isMounted) {
                    setStageSettings(settings);
                    setStatus(`Stage ${stageId} loaded.`);
                } else if (isMounted) {
                    setStatus(`Failed to find data for stage ${stageId}.`);
                    setStageSettings(null);
                }
            } catch (e: any) {
                if (isMounted) {
                    setStatus('Error loading stage data: ' + e.message);
                }
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [stageId, gateway]);

    // Calculate Grand Totals
    let totalCoins = 0;
    let totalGems = 0;
    if (stageSettings) {
        for (const w of stageSettings.waves) {
            totalCoins += w.coinsTotal;
            totalGems += w.gemsTotal;
        }
    }

    const islandKey = islandName as keyof typeof DIFFICULTY_DATA;
    // Fallback to TucTuc Island if not found (like in original)
    const difficultyData = DIFFICULTY_DATA[islandKey] || DIFFICULTY_DATA["TucTuc Island"];
    
    const bossMultiplier = difficultyData.boss[difficultyIndex];
    const hpMultiplier = difficultyData.multiply[difficultyIndex];
    const countMultiplier = difficultyData.count[difficultyIndex];

    if (!stageSettings) {
        return <div>{status}</div>;
    }

    return (
        <div>
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

            <div className="section">
                <h2>5. Waves ({stageSettings.waves.length})</h2>
                {stageSettings.waves.map((wave, i) => {
                    const firstMonster = wave.subWaves[0]?.monster;
                    
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
                            transform: `scale(${32 / iconW})`, 
                            transformOrigin: 'top left'
                        };

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
        </div>
    );
};
