import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { ArchiveSelector } from './shared_components.js';
import { PJMArchiveGateway, GameDataGateway } from './editor_api.js';

import { StageInfoApp } from './stage_info_app.js';
import { StageViewerApp } from './stage_viewer_app.js';
import { RepackerApp } from './repacker_app.js';

type ViewState = 'hub' | 'info' | 'viewer' | 'repacker';

const MainApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [status, setStatus] = useState<string>('');
    const [currentView, setCurrentView] = useState<ViewState>('hub');

    const gateway = useMemo<GameDataGateway | null>(() => {
        if (archive && pkdFile) {
            return new PJMArchiveGateway(archive, pkdFile);
        }
        return null;
    }, [archive, pkdFile]);

    const handleLoadArchive = async (pki: File, pkd: File) => {
        if (!pki || !pkd) {
            setStatus('Please select both PKI and PKD files.');
            return;
        }
        try {
            setStatus("Parsing original archives...");
            const arch = await PJMArchive.parse(pki);
            setArchive(arch);
            setStatus("Archives loaded! Select an experiment below.");
        } catch (e: any) {
            setStatus("Error: " + e.message);
            console.error(e);
        }
    };

    if (currentView === 'info' && gateway) {
        return <StageInfoApp gateway={gateway} onBack={() => setCurrentView('hub')} />;
    }
    
    if (currentView === 'viewer' && gateway) {
        return <StageViewerApp gateway={gateway} onBack={() => setCurrentView('hub')} />;
    }
    
    if (currentView === 'repacker' && archive && pkdFile && pkiFile) {
        return <RepackerApp archive={archive} pkdFile={pkdFile} pkiFile={pkiFile} onBack={() => setCurrentView('hub')} />;
    }

    return (
        <div className="container">
            <h1>Experiments with PixelJunk Monsters Ultimate</h1>
            <p className="intro">
                Welcome! This is a suite of browser-based "experiements", working towards a full web-based level editor for <strong>PixelJunk Monsters Ultimate</strong> on PC. Each
                experiment works directly off your own copy of the game's <code>.pkiwin</code>/<code>.pkdwin</code> files.
            </p>

            <div className="section">
                <h2>1. Select Game Archives</h2>
                <ArchiveSelector 
                    pkiFile={pkiFile} setPkiFile={setPkiFile}
                    pkdFile={pkdFile} setPkdFile={setPkdFile}
                    onLoadArchive={handleLoadArchive}
                    status={status}
                />
            </div>

            <div className="section" style={{ opacity: archive ? 1 : 0.5, pointerEvents: archive ? 'auto' : 'none' }}>
                <h2>2. Available Experiments</h2>
                <div className="poc-grid">
                    <a href="#" className="poc-card" onClick={(e) => { e.preventDefault(); setCurrentView('info'); }}>
                        <h3>Stage Info</h3>
                        <p>View info about a stage's waves and coin/gem payouts.</p>
                    </a>

                    <a href="#" className="poc-card" onClick={(e) => { e.preventDefault(); setCurrentView('viewer'); }}>
                        <h3>Stage Viewer</h3>
                        <p>Interactive viewer for rendering game stages, routes, and object placement.</p>
                    </a>

                    <a href="#" className="poc-card" onClick={(e) => { e.preventDefault(); setCurrentView('repacker'); }}>
                        <h3>Archive Repacker</h3>
                        <p>Load and repack game archives. Allows injecting modified assets.</p>
                    </a>
                </div>
            </div>
        </div>
    );
};

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<MainApp />);
}
