import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { ArchiveSelector } from './shared_components.js';
import { PJMArchiveGateway, GameDataGateway } from './editor_api.js';
import { StageInspectorApp } from './stage_inspector_app.js';
import { FluentProvider } from '@fluentui/react-components';
import { tikiedTheme } from './theme.js';

type ViewState = 'splash' | 'inspector';

const MainApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [status, setStatus] = useState<string>('');
    const [currentView, setCurrentView] = useState<ViewState>('splash');

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
            setStatus("Archives loaded!");
            setCurrentView('inspector'); // Auto-transition
        } catch (e: any) {
            setStatus("Error: " + e.message);
            console.error(e);
        }
    };

    if (currentView === 'inspector' && gateway && archive && pkdFile && pkiFile) {
        return (
            <StageInspectorApp 
                gateway={gateway} 
                archive={archive}
                pkiFile={pkiFile}
                pkdFile={pkdFile}
                onBackToSplash={() => {
                    setArchive(null);
                    setPkiFile(null);
                    setPkdFile(null);
                    setCurrentView('splash');
                }} 
            />
        );
    }

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'var(--neutral-bg-canvas)' 
        }}>
            <div style={{
                background: 'var(--neutral-bg-container)',
                border: '1px solid var(--neutral-stroke-1)',
                padding: '40px',
                borderRadius: '8px',
                textAlign: 'center',
                maxWidth: '600px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}>
                <img src="assets/images/logo-sm.png" alt="Tikied Logo" style={{ marginBottom: '20px', maxWidth: '300px' }} />
                <h1 style={{ margin: '0 0 15px 0', border: 'none' }}>Welcome to Tikied (tea-keyed)</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--neutral-fg-subtle)', marginBottom: '30px' }}>
                    An editor for the game PJM worthy of Tikiman himself!
                </p>

                <ArchiveSelector 
                    pkiFile={pkiFile} setPkiFile={setPkiFile}
                    pkdFile={pkdFile} setPkdFile={setPkdFile}
                    onLoadArchive={handleLoadArchive}
                    status={status}
                />
            </div>
        </div>
    );
};

const rootEl = document.getElementById('root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
        <FluentProvider theme={tikiedTheme}>
            <MainApp />
        </FluentProvider>
    );
}
