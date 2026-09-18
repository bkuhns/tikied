import React, { useState } from 'react';
import { ISLANDS, StageInfo } from './stages_data.js';
import { StageSelection } from './shared_components.js';
import { GameDataGateway } from './editor_api.js';
import { StageCanvasViewer, ViewerToggles, RouteToggle } from './stage_canvas_viewer.js';
import { RouteTogglePanel } from './route_toggle_panel.js';

interface StageViewerAppProps {
    gateway: GameDataGateway;
    onBack: () => void;
}

export const StageViewerApp: React.FC<StageViewerAppProps> = ({ gateway, onBack }) => {
    const [status, setStatus] = useState<string>('');
    const [selectedStage, setSelectedStage] = useState<StageInfo>(ISLANDS[0].stages.find(s => s.id === 11) || ISLANDS[0].stages[0]);
    const [isMaximized, setIsMaximized] = useState<boolean>(false);

    // Toggles state
    const [toggles, setToggles] = useState<ViewerToggles>({
        showTrees: true,
        showRocks: true,
        showObjects: true,
        showBridges: true,
        showRoutes: true,
        showWater: true,
        showHudBar: true
    });

    const [routeToggles, setRouteToggles] = useState<RouteToggle[]>([]);

    const updateToggle = (key: keyof ViewerToggles, value: boolean) => {
        setToggles(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="container">
            <nav className="breadcrumb">
                <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>← Back to Hub</a>
            </nav>
            <h1>Stage Viewer</h1>
            <p>Instantly extract and view stages directly from the game archives.</p>
            
            <div id="viewerSection" className={`section ${isMaximized ? 'maximized' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ marginBottom: 0 }}>View Stage</h2>
                    <button onClick={() => setIsMaximized(!isMaximized)} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>
                        {isMaximized ? 'Minimize View' : 'Maximize View'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <StageSelection 
                        gateway={gateway}
                        onSelectStage={setSelectedStage}
                    />
                    <h2 style={{ margin: 0 }}>Stage {selectedStage.id}: {selectedStage.difficulty} - {selectedStage.introduction}</h2>
                </div>

                <div className="form-group">
                    <label>Show features:</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showTrees} onChange={e => updateToggle('showTrees', e.target.checked)} />
                        Trees
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showRocks} onChange={e => updateToggle('showRocks', e.target.checked)} />
                        Rocks
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showObjects} onChange={e => updateToggle('showObjects', e.target.checked)} />
                        Objects
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showBridges} onChange={e => updateToggle('showBridges', e.target.checked)} />
                        Bridges
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showRoutes} onChange={e => updateToggle('showRoutes', e.target.checked)} />
                        Routes
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '15px' }}>
                        <input type="checkbox" checked={toggles.showWater} onChange={e => updateToggle('showWater', e.target.checked)} />
                        Water
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={toggles.showHudBar} onChange={e => updateToggle('showHudBar', e.target.checked)} />
                        HUD Bar
                    </label>
                </div>
                
                <RouteTogglePanel 
                    routeToggles={routeToggles} 
                    onToggleChange={setRouteToggles} 
                />
                
                <StageCanvasViewer 
                    stageId={selectedStage.id}
                    gateway={gateway}
                    toggles={toggles}
                    routeToggles={routeToggles}
                    onRoutesLoaded={setRouteToggles}
                    onStatusChange={setStatus}
                />
            </div>
            
            {status && (
                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                    {status}
                </div>
            )}
        </div>
    );
};
