import React, { useState, useMemo, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { PJMArchive } from './pjm_archive.js';
import { ArchiveSelector, StageSelection } from './shared_components.js';
import { StageInfo, ISLANDS } from './stages_data.js';
import { PJMArchiveGateway, GameDataGateway } from './editor_api.js';
import { 
    Toaster, 
    useToastController, 
    useId, 
    Toast, 
    ToastTitle, 
    ToastBody,
    FluentProvider,
    Button
} from '@fluentui/react-components';
import { SlideGridRegular } from '@fluentui/react-icons';
import { tikiedTheme } from './theme.js';

const StageInspectorApp = lazy(() => import('./stage_inspector_app.js').then(m => ({ default: m.StageInspectorApp })));

type ViewState = 'splash' | 'inspector';

const MainApp: React.FC = () => {
    const [pkiFile, setPkiFile] = useState<File | null>(null);
    const [pkdFile, setPkdFile] = useState<File | null>(null);
    const [archive, setArchive] = useState<PJMArchive | null>(null);
    const [selectedStage, setSelectedStage] = useState<StageInfo | null>(null);
    const [isStageSelectOpen, setIsStageSelectOpen] = useState(false);
    const [currentView, setCurrentView] = useState<ViewState>('splash');

    const toasterId = useId();
    const { dispatchToast } = useToastController(toasterId);

    const gateway = useMemo<GameDataGateway | null>(() => {
        if (archive && pkdFile) {
            return new PJMArchiveGateway(archive, pkdFile);
        }
        return null;
    }, [archive, pkdFile]);

    const handleLoadArchive = async (pki: File, pkd: File) => {
        if (!pki || !pkd) {
            dispatchToast(
                <Toast>
                    <ToastTitle>Warning</ToastTitle>
                    <ToastBody>Please select both PKI and PKD files.</ToastBody>
                </Toast>,
                { intent: "warning" }
            );
            return;
        }
        try {
            const arch = await PJMArchive.parse(pki);
            setArchive(arch);
            dispatchToast(
                <Toast>
                    <ToastTitle>Success</ToastTitle>
                    <ToastBody>Archives loaded! Please select a stage.</ToastBody>
                </Toast>,
                { intent: "success" }
            );
            setIsStageSelectOpen(true); // Open stage selection popup
        } catch (e: any) {
            dispatchToast(
                <Toast>
                    <ToastTitle>Error</ToastTitle>
                    <ToastBody>{"Error loading archives: " + e.message}</ToastBody>
                </Toast>,
                { intent: "error" }
            );
            console.error(e);
        }
    };

    const handleSelectStageFromSplash = (stage: StageInfo) => {
        setSelectedStage(stage);
        setIsStageSelectOpen(false);
        setCurrentView('inspector');
    };

    if (currentView === 'inspector' && gateway && archive && pkdFile && pkiFile) {
        return (
            <Suspense fallback={
                <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--neutral-bg-canvas)', color: 'var(--neutral-fg-main)' }}>
                    <div>Loading Stage Viewer...</div>
                </div>
            }>
                <StageInspectorApp 
                    gateway={gateway} 
                    archive={archive}
                    pkiFile={pkiFile}
                    pkdFile={pkdFile}
                    initialStage={selectedStage}
                    onBackToSplash={() => {
                        setArchive(null);
                        setPkiFile(null);
                        setPkdFile(null);
                        setSelectedStage(null);
                        setIsStageSelectOpen(false);
                        setCurrentView('splash');
                    }} 
                />
            </Suspense>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: 'var(--neutral-bg-canvas)',
            padding: '30px 20px 20px 20px',
            boxSizing: 'border-box'
        }}>
            <Toaster toasterId={toasterId} position="bottom-start" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '20px 0' }}>
                <div style={{
                    background: 'var(--neutral-bg-container)',
                    border: '1px solid var(--neutral-stroke-1)',
                    padding: '40px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    maxWidth: '600px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                    <h1 style={{ margin: '0 0 15px 0', border: 'none' }}>
                        Welcome to...
                    </h1>

                    <img src="./logo-sm.png" alt="Tikied Logo" style={{ marginBottom: '20px', maxWidth: '300px' }} />

                    <p style={{ fontSize: '1.1rem', color: 'var(--neutral-fg-subtle)', marginBottom: '30px' }}>
                        An editor for the game PixelJunk™ Monsters Ultimate<br/>
                        worthy of Tikiman himself!
                    </p>

                    <ArchiveSelector 
                        pkiFile={pkiFile} setPkiFile={setPkiFile}
                        pkdFile={pkdFile} setPkdFile={setPkdFile}
                        onLoadArchive={handleLoadArchive}
                    />

                    {gateway && (
                        <div style={{ marginTop: '20px' }}>
                            <Button 
                                appearance="primary"
                                size="large"
                                icon={<SlideGridRegular />}
                                onClick={() => setIsStageSelectOpen(true)}
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                Select Stage
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {gateway && (
                <StageSelection 
                    gateway={gateway}
                    open={isStageSelectOpen}
                    onOpenChange={setIsStageSelectOpen}
                    onSelectStage={handleSelectStageFromSplash}
                    hideTrigger
                    allowClose={false}
                />
            )}
            
            <footer style={{
                maxWidth: '800px',
                textAlign: 'center',
                marginTop: '30px',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
            }}>
                <div style={{ 
                    fontSize: '0.78rem', 
                    lineHeight: '1.5', 
                    color: 'var(--neutral-fg-subtle)', 
                    opacity: 0.85,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <p style={{ margin: 0 }}>
                        Tikied is an unofficial, independent fan project and is not affiliated with, endorsed by, sponsored by, or approved by Q-Games Ltd.
                    </p>
                    <p style={{ margin: 0 }}>
                        This tool does not distribute, package, or contain any copyrighted game assets, proprietary code, audio, or artwork from PixelJunk™ Monsters Ultimate. It is strictly an editor utility intended to parse and modify legitimately owned, local game data supplied directly by the user.
                    </p>
                    <p style={{ margin: 0 }}>
                        PixelJunk™ Monsters Ultimate, PixelJunk, and all associated titles, logos, characters, and assets are trademarks or registered trademarks of Q-Games Ltd. All trademarks and copyrights belong to their respective owners.
                    </p>
                </div>

                <a 
                    href="https://github.com/bkuhns/tikied-poc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="View source on GitHub"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--neutral-fg-subtle)',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        opacity: 0.8,
                        marginTop: '4px',
                        transition: 'opacity 0.2s, color 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--brand-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.color = 'var(--neutral-fg-subtle)'; }}
                >
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span>bkuhns/tikied-poc</span>
                </a>
            </footer>
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
