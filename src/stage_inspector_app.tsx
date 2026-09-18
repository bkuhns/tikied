import React, { useState, useId } from 'react';
import { ISLANDS, StageInfo } from './stages_data.js';
import { StageSelection, DIFFICULTY_LEVELS } from './shared_components.js';
import { GameDataGateway } from './editor_api.js';
import { StageCanvasViewer, ViewerToggles, RouteToggle } from './stage_canvas_viewer.js';
import { RouteTogglePanel } from './route_toggle_panel.js';
import { WaveTable } from './wave_table.js';
import { tikiedTheme } from './theme.js';
import { PJMArchive } from './pjm_archive.js';
import { RepackerModal } from './repacker_app.js';
import { 
    FluentProvider, 
    Button, 
    Menu, 
    MenuTrigger, 
    MenuPopover, 
    MenuList, 
    MenuItem,
    Checkbox,
    Toaster,
    useToastController,
    Toast,
    ToastTitle,
    ToastBody
} from '@fluentui/react-components';

interface StageInspectorAppProps {
    gateway: GameDataGateway;
    archive: PJMArchive;
    pkiFile: File;
    pkdFile: File;
    onBackToSplash: () => void;
}

export const StageInspectorApp: React.FC<StageInspectorAppProps> = ({ gateway, archive, pkiFile, pkdFile, onBackToSplash }) => {
    const [selectedStage, setSelectedStage] = useState<StageInfo>(ISLANDS[0].stages.find(s => s.id === 11) || ISLANDS[0].stages[0]);
    const [difficultyIndex, setDifficultyIndex] = useState<number>(1);
    const [isRepackerOpen, setIsRepackerOpen] = useState(false);
    
    const toasterId = useId();
    const { dispatchToast } = useToastController(toasterId);

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

    let currentIslandName = "Toki Island";
    for (const island of ISLANDS) {
        if (island.stages.find(s => s.id === selectedStage.id)) {
            currentIslandName = island.name;
            break;
        }
    }

    const toggleFeature = (feature: keyof ViewerToggles) => {
        setToggles(prev => ({ ...prev, [feature]: !prev[feature] }));
    };

    const handleStatusChange = (statusStr: string, intent: "success" | "error" | "info" = "success") => {
        if (statusStr.startsWith("Error")) {
            dispatchToast(
                <Toast>
                    <ToastTitle>Error</ToastTitle>
                    <ToastBody>{statusStr}</ToastBody>
                </Toast>,
                { intent: "error" }
            );
        } else {
            dispatchToast(
                <Toast>
                    <ToastTitle>{intent === 'success' ? 'Success' : 'Notice'}</ToastTitle>
                    <ToastBody>{statusStr}</ToastBody>
                </Toast>,
                { intent }
            );
        }
    };

    return (
        <FluentProvider theme={tikiedTheme} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Toaster toasterId={toasterId} position="bottom-start" />
            
            {/* Top Toolbar */}
            <header style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px', 
                padding: '10px 20px', 
                backgroundColor: tikiedTheme.colorNeutralBackground2, 
                borderBottom: `1px solid ${tikiedTheme.colorNeutralStroke1}`,
                flexShrink: 0
            }}>
                <Button onClick={onBackToSplash}>Load archives</Button>
                
                <div style={{ flex: 1 }} />
                
                <Button appearance="primary" onClick={() => setIsRepackerOpen(true)}>Repack Assets</Button>
            </header>

            {/* Main Application Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Main Area: Vertical Stack (Stage Title, Viewer, Routes View) */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#111' }}>
                    {/* 1. Stage Title Bar */}
                    <div style={{ 
                        padding: '12px 20px', 
                        backgroundColor: tikiedTheme.colorNeutralBackground1, 
                        borderBottom: `1px solid ${tikiedTheme.colorNeutralStroke1}`, 
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <StageSelection 
                            gateway={gateway} 
                            onSelectStage={setSelectedStage} 
                        />
                        
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: tikiedTheme.colorNeutralForeground1, flex: 1 }}>
                            Stage {selectedStage.id}: {selectedStage.difficulty} - {selectedStage.introduction}
                        </h2>

                        <Menu closeOnScroll>
                            <MenuTrigger disableButtonEnhancement>
                                <Button>View Features ▾</Button>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    <MenuItem onClick={() => toggleFeature('showTrees')}>
                                        <Checkbox checked={toggles.showTrees} label="Trees" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showRocks')}>
                                        <Checkbox checked={toggles.showRocks} label="Rocks" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showObjects')}>
                                        <Checkbox checked={toggles.showObjects} label="Objects" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showBridges')}>
                                        <Checkbox checked={toggles.showBridges} label="Bridges" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showRoutes')}>
                                        <Checkbox checked={toggles.showRoutes} label="Routes" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showWater')}>
                                        <Checkbox checked={toggles.showWater} label="Water" readOnly />
                                    </MenuItem>
                                    <MenuItem onClick={() => toggleFeature('showHudBar')}>
                                        <Checkbox checked={toggles.showHudBar} label="HUD Bar" readOnly />
                                    </MenuItem>
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </div>

                    {/* 2. Primary Canvas Viewer (Fills all available vertical space) */}
                    <div style={{ 
                        flex: 1, 
                        minHeight: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#111',
                        position: 'relative'
                    }}>
                        <StageCanvasViewer 
                            stageId={selectedStage.id}
                            gateway={gateway}
                            toggles={toggles}
                            routeToggles={routeToggles}
                            onRoutesLoaded={setRouteToggles}
                            onStatusChange={(msg) => handleStatusChange(msg)}
                        />
                    </div>

                    {/* 3. Stage Routes Panel (Shrinks to content height) */}
                    <div style={{ flexShrink: 0, backgroundColor: '#111', color: '#fff' }}>
                        <RouteTogglePanel 
                            routeToggles={routeToggles}
                            onToggleChange={setRouteToggles}
                        />
                    </div>
                </main>

                {/* Right Sidebar: Wave Info (Fills vertical height, flexible width) */}
                <aside style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderLeft: `1px solid ${tikiedTheme.colorNeutralStroke1}`, 
                    backgroundColor: tikiedTheme.colorNeutralBackground1,
                    overflowY: 'auto',
                    padding: '15px'
                }}>
                    <div style={{ marginBottom: '15px' }}>
                        <Menu closeOnScroll>
                            <MenuTrigger disableButtonEnhancement>
                                <Button style={{ width: '100%' }}>Difficulty: {DIFFICULTY_LEVELS[difficultyIndex]} ▾</Button>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    {DIFFICULTY_LEVELS.map((level, idx) => (
                                        <MenuItem key={idx} onClick={() => setDifficultyIndex(idx)}>
                                            {level}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </div>

                    <WaveTable 
                        stageId={selectedStage.id}
                        islandName={currentIslandName}
                        difficultyIndex={difficultyIndex}
                        gateway={gateway}
                    />
                </aside>
            </div>
            
            <RepackerModal 
                isOpen={isRepackerOpen} 
                onClose={() => setIsRepackerOpen(false)} 
                archive={archive} 
                pkdFile={pkdFile} 
                onToast={handleStatusChange} 
            />
        </FluentProvider>
    );
};
