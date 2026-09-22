import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Button, 
    InlineDrawer, 
    DrawerHeader, 
    DrawerHeaderTitle, 
    DrawerBody,
    Slider,
    SpinButton,
    Dropdown,
    Option,
    Switch,
    Label,
    Toolbar,
    ToolbarButton,
    Spinner,
    Dialog,
    DialogSurface,
    DialogBody,
    DialogContent,
    FluentProvider
} from '@fluentui/react-components';
import { 
    FolderRegular, 
    DocumentImageRegular, 
    ChevronLeftRegular, 
    ChevronRightRegular, 
    PlayRegular, 
    PauseRegular, 
    PreviousRegular, 
    NextRegular, 
    DismissRegular,
    ArrowUpRegular,
    ArrowDownRegular
} from '@fluentui/react-icons';
import { GameDataGateway, DEFAULT_ANIMATION_FPS } from '../utils/editor_api.js';
import { tikiedTheme } from '../utils/theme.js';
import assetTreeData from '../data/asset_tree.json';

export interface AssetNode {
    name: string;
    path: string;
    type: 'folder' | 'file';
    children?: AssetNode[];
}

export type AnimationStrategy = 'rows' | 'rows_btt' | 'cols' | 'cols_btt' | 'single_row' | 'single_col' | 'manual';
export type LoopStyle = 'linear' | 'pingpong';
export type ScaleMode = 'fill' | '1:1';

interface AssetTreeItemProps {
    node: AssetNode;
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
    depth?: number;
}

const AssetTreeItem: React.FC<AssetTreeItemProps> = ({ node, selectedPath, onSelectFile, depth = 0 }) => {
    // Only expand first 2 levels (depth 0 and depth 1) by default
    const [isOpen, setIsOpen] = useState(depth < 2);

    if (node.type === 'file') {
        const isSelected = selectedPath === node.path;
        return (
            <div 
                onClick={() => onSelectFile(node.path)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px 4px 20px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: isSelected ? tikiedTheme.colorNeutralBackground3 : 'transparent',
                    color: isSelected ? tikiedTheme.colorCompoundBrandStroke : tikiedTheme.colorNeutralForeground1,
                    fontWeight: isSelected ? 600 : 400,
                    userSelect: 'none',
                    fontSize: '0.85rem'
                }}
            >
                <DocumentImageRegular style={{ fontSize: '1rem', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
            </div>
        );
    }

    return (
        <div style={{ userSelect: 'none' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: tikiedTheme.colorNeutralForeground1,
                    fontSize: '0.85rem'
                }}
            >
                {isOpen ? <ChevronRightRegular style={{ transform: 'rotate(90deg)', fontSize: '0.8rem' }} /> : <ChevronRightRegular style={{ fontSize: '0.8rem' }} />}
                <FolderRegular style={{ color: '#d97706', fontSize: '1rem', flexShrink: 0 }} />
                <span>{node.name}</span>
            </div>
            {isOpen && node.children && (
                <div style={{ paddingLeft: '12px', borderLeft: `1px solid ${tikiedTheme.colorNeutralStroke1}`, marginLeft: '12px' }}>
                    {node.children.map(child => (
                        <AssetTreeItem 
                            key={child.path} 
                            node={child} 
                            selectedPath={selectedPath} 
                            onSelectFile={onSelectFile} 
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export interface TextureViewerProps {
    gateway: GameDataGateway;
    onClose?: () => void;
}

export const TextureViewer: React.FC<TextureViewerProps> = ({ gateway, onClose }) => {
    // Drawers visibility state
    const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
    const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

    // Delayed chevron expansion button display to wait for drawer slide animation
    const [showLeftChevron, setShowLeftChevron] = useState(false);
    const [showRightChevron, setShowRightChevron] = useState(false);

    useEffect(() => {
        if (isLeftDrawerOpen) {
            setShowLeftChevron(false);
        } else {
            const timer = setTimeout(() => setShowLeftChevron(true), 300);
            return () => clearTimeout(timer);
        }
    }, [isLeftDrawerOpen]);

    useEffect(() => {
        if (isRightDrawerOpen) {
            setShowRightChevron(false);
        } else {
            const timer = setTimeout(() => setShowRightChevron(true), 300);
            return () => clearTimeout(timer);
        }
    }, [isRightDrawerOpen]);

    // Selected file & image data
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Canvas view mode
    const [scaleMode, setScaleMode] = useState<ScaleMode>('fill');
    const [isAnimated, setIsAnimated] = useState(false);

    // Animation settings
    const [cols, setCols] = useState(1);
    const [rows, setRows] = useState(1);
    const [totalFrames, setTotalFrames] = useState(1);
    const [fps, setFps] = useState(DEFAULT_ANIMATION_FPS);
    const [strategy, setStrategy] = useState<AnimationStrategy>('rows');
    const [loopStyle, setLoopStyle] = useState<LoopStyle>('linear');
    const [manualFrames, setManualFrames] = useState<number[]>([]);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isPingPongReversingRef = useRef(false);

    // Helper: Compute ordered frame sequence based on strategy
    const computeStrategyFrames = (c: number, r: number, tot: number, strat: AnimationStrategy): number[] => {
        const sequence: number[] = [];
        const maxAvailable = c * r;
        const count = Math.min(tot, maxAvailable);

        if (strat === 'rows') {
            for (let row = 0; row < r; row++) {
                for (let col = 0; col < c; col++) {
                    const idx = row * c + col;
                    if (sequence.length < count && idx < maxAvailable) {
                        sequence.push(idx);
                    }
                }
            }
        } else if (strat === 'rows_btt') {
            for (let row = r - 1; row >= 0; row--) {
                for (let col = 0; col < c; col++) {
                    const idx = row * c + col;
                    if (sequence.length < count && idx < maxAvailable) {
                        sequence.push(idx);
                    }
                }
            }
        } else if (strat === 'cols') {
            for (let col = 0; col < c; col++) {
                for (let row = 0; row < r; row++) {
                    const idx = row * c + col;
                    if (sequence.length < count && idx < maxAvailable) {
                        sequence.push(idx);
                    }
                }
            }
        } else if (strat === 'cols_btt') {
            for (let col = 0; col < c; col++) {
                for (let row = r - 1; row >= 0; row--) {
                    const idx = row * c + col;
                    if (sequence.length < count && idx < maxAvailable) {
                        sequence.push(idx);
                    }
                }
            }
        } else if (strat === 'single_row') {
            for (let col = 0; col < Math.min(c, count); col++) {
                sequence.push(col);
            }
        } else if (strat === 'single_col') {
            for (let row = 0; row < Math.min(r, count); row++) {
                sequence.push(row * c);
            }
        } else if (strat === 'manual') {
            for (let i = 0; i < count; i++) sequence.push(i);
        }

        return sequence.length > 0 ? sequence : [0];
    };

    // Update active frame order when grid/strategy changes
    const activeFrameSequence = useMemo(() => {
        if (strategy === 'manual' && manualFrames.length > 0) {
            return manualFrames;
        }
        return computeStrategyFrames(cols, rows, totalFrames, strategy);
    }, [cols, rows, totalFrames, strategy, manualFrames]);

    // Update manual list whenever strategy changes
    const handleStrategyChange = (newStrat: AnimationStrategy) => {
        setStrategy(newStrat);
        const computed = computeStrategyFrames(cols, rows, totalFrames, newStrat);
        setManualFrames(computed);
        setCurrentFrameIndex(0);
        isPingPongReversingRef.current = false;
        setIsPlaying(true);
    };

    // Auto-update totalFrames when cols or rows change
    const handleColsChange = (newCols: number) => {
        const c = Math.max(1, newCols);
        setCols(c);
        const newTot = c * rows;
        setTotalFrames(newTot);
        setManualFrames(computeStrategyFrames(c, rows, newTot, strategy));
        setCurrentFrameIndex(0);
    };

    const handleRowsChange = (newRows: number) => {
        const r = Math.max(1, newRows);
        setRows(r);
        const newTot = cols * r;
        setTotalFrames(newTot);
        setManualFrames(computeStrategyFrames(cols, r, newTot, strategy));
        setCurrentFrameIndex(0);
    };

    // Load texture file when path changes
    useEffect(() => {
        if (!selectedPath) return;

        let isCancelled = false;
        setIsLoading(true);
        setErrorMsg(null);

        gateway.getTextureAsImageData(selectedPath)
            .then(data => {
                if (isCancelled) return;
                if (!data) {
                    setErrorMsg(`Failed to extract DDS file: ${selectedPath}`);
                    setImageData(null);
                } else {
                    setImageData(data);
                    setCols(1);
                    setRows(1);
                    setTotalFrames(1);
                    setStrategy('rows');
                    setManualFrames([0]);
                    setCurrentFrameIndex(0);
                    isPingPongReversingRef.current = false;
                }
            })
            .catch(err => {
                if (isCancelled) return;
                setErrorMsg(`Error loading texture: ${err.message}`);
                setImageData(null);
            })
            .finally(() => {
                if (!isCancelled) setIsLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [selectedPath, gateway]);

    // Canvas rendering logic (Static & Animated)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = imageData.width;
        srcCanvas.height = imageData.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return;
        srcCtx.putImageData(imageData, 0, 0);

        const container = canvas.parentElement;
        const containerW = container ? container.clientWidth : 800;
        const containerH = container ? container.clientHeight : 600;

        if (!isAnimated) {
            canvas.width = containerW;
            canvas.height = containerH;
            ctx.clearRect(0, 0, containerW, containerH);

            let drawW = imageData.width;
            let drawH = imageData.height;
            let drawX = (containerW - drawW) / 2;
            let drawY = (containerH - drawH) / 2;

            if (scaleMode === 'fill') {
                const scale = Math.min(containerW / imageData.width, containerH / imageData.height);
                drawW = imageData.width * scale;
                drawH = imageData.height * scale;
                drawX = (containerW - drawW) / 2;
                drawY = (containerH - drawH) / 2;
            }

            ctx.drawImage(srcCanvas, 0, 0, imageData.width, imageData.height, drawX, drawY, drawW, drawH);
        } else {
            canvas.width = containerW;
            canvas.height = containerH;
            ctx.clearRect(0, 0, containerW, containerH);

            const frameW = imageData.width / cols;
            const frameH = imageData.height / rows;

            const seq = activeFrameSequence;
            const targetFrameIndex = seq[currentFrameIndex % seq.length] ?? 0;

            const frameCol = targetFrameIndex % cols;
            const frameRow = Math.floor(targetFrameIndex / cols);

            const srcX = frameCol * frameW;
            const srcY = frameRow * frameH;

            let drawW = frameW;
            let drawH = frameH;
            let drawX = (containerW - drawW) / 2;
            let drawY = (containerH - drawH) / 2;

            if (scaleMode === 'fill') {
                const scale = Math.min(containerW / frameW, containerH / frameH);
                drawW = frameW * scale;
                drawH = frameH * scale;
                drawX = (containerW - drawW) / 2;
                drawY = (containerH - drawH) / 2;
            }

            ctx.drawImage(srcCanvas, srcX, srcY, frameW, frameH, drawX, drawY, drawW, drawH);
        }
    }, [imageData, scaleMode, isAnimated, cols, rows, currentFrameIndex, activeFrameSequence]);

    // Animation timer loop
    useEffect(() => {
        if (!isAnimated || !isPlaying || activeFrameSequence.length <= 1) return;

        const intervalMs = 1000 / Math.max(1, fps);
        const timer = setInterval(() => {
            setCurrentFrameIndex(prevIdx => {
                const maxIdx = activeFrameSequence.length - 1;

                if (loopStyle === 'linear') {
                    return (prevIdx + 1) % activeFrameSequence.length;
                } else {
                    if (isPingPongReversingRef.current) {
                        if (prevIdx <= 0) {
                            isPingPongReversingRef.current = false;
                            return Math.min(1, maxIdx);
                        }
                        return prevIdx - 1;
                    } else {
                        if (prevIdx >= maxIdx) {
                            isPingPongReversingRef.current = true;
                            return Math.max(0, maxIdx - 1);
                        }
                        return prevIdx + 1;
                    }
                }
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isAnimated, isPlaying, fps, loopStyle, activeFrameSequence]);

    // Manual list reorder handlers
    const moveManualFrame = (idx: number, direction: 'up' | 'down') => {
        const updated = [...manualFrames];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= updated.length) return;
        const temp = updated[idx];
        updated[idx] = updated[targetIdx];
        updated[targetIdx] = temp;
        setManualFrames(updated);
    };

    return (
        <div style={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            backgroundColor: tikiedTheme.colorNeutralBackground1, 
            color: tikiedTheme.colorNeutralForeground1 
        }}>
            {/* Left/Start Inline Drawer: Asset Tree */}
            <InlineDrawer 
                open={isLeftDrawerOpen} 
                position="start" 
                style={{ 
                    width: '280px', 
                    flexShrink: 0, 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    borderRight: `1px solid ${tikiedTheme.colorNeutralStroke1}` 
                }}
            >
                <DrawerHeader style={{ borderBottom: `1px solid ${tikiedTheme.colorNeutralStroke1}`, padding: '10px 15px' }}>
                    <DrawerHeaderTitle 
                        action={<Button appearance="subtle" icon={<DismissRegular />} onClick={() => setIsLeftDrawerOpen(false)} />}
                    >
                        Archive Assets (.dds)
                    </DrawerHeaderTitle>
                </DrawerHeader>
                <DrawerBody style={{ padding: '10px', overflowY: 'auto' }}>
                    {(assetTreeData as AssetNode[]).map(node => (
                        <AssetTreeItem 
                            key={node.path} 
                            node={node} 
                            selectedPath={selectedPath} 
                            onSelectFile={setSelectedPath} 
                        />
                    ))}
                </DrawerBody>
            </InlineDrawer>

            {/* Left expand toggle button shown AFTER slide-out animation finishes */}
            {!isLeftDrawerOpen && showLeftChevron && (
                <div style={{ 
                    borderRight: `1px solid ${tikiedTheme.colorNeutralStroke1}`, 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    display: 'flex', 
                    alignItems: 'center' 
                }}>
                    <Button 
                        appearance="subtle" 
                        icon={<ChevronRightRegular />} 
                        title="Expand Asset Tree"
                        onClick={() => setIsLeftDrawerOpen(true)} 
                    />
                </div>
            )}

            {/* Main Viewing Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* Unified Top Controls & Modal Title Header Bar */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 16px', 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    borderBottom: `1px solid ${tikiedTheme.colorNeutralStroke1}` 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: tikiedTheme.colorNeutralForeground1, flexShrink: 0 }}>
                            Texture Viewer
                        </h3>
                        <span style={{ 
                            fontSize: '0.85rem', 
                            color: tikiedTheme.colorNeutralForeground2, 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                        }}>
                            {selectedPath ? `— ${selectedPath}` : '— Select a texture from the asset tree'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Label size="small">Scale:</Label>
                            <Button 
                                size="small" 
                                appearance={scaleMode === 'fill' ? 'primary' : 'outline'}
                                onClick={() => setScaleMode('fill')}
                            >
                                Fill
                            </Button>
                            <Button 
                                size="small" 
                                appearance={scaleMode === '1:1' ? 'primary' : 'outline'}
                                onClick={() => setScaleMode('1:1')}
                            >
                                1:1
                            </Button>
                        </div>

                        <Switch 
                            label="Animated Tileset"
                            checked={isAnimated}
                            onChange={(e, data) => {
                                setIsAnimated(data.checked);
                                if (data.checked && !isRightDrawerOpen) {
                                    setIsRightDrawerOpen(true);
                                }
                            }}
                        />

                        {onClose && (
                            <Button 
                                appearance="subtle" 
                                icon={<DismissRegular />} 
                                title="Close Texture Viewer"
                                onClick={onClose} 
                            />
                        )}
                    </div>
                </div>

                {/* Main Canvas Container (Dark background for crisp DDS contrast) */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' }}>
                    {isLoading && <Spinner label="Loading texture DDS..." />}
                    {errorMsg && <div style={{ color: '#dc2626', padding: '20px' }}>{errorMsg}</div>}
                    {!selectedPath && !isLoading && (
                        <div style={{ color: '#9ca3af', fontSize: '1rem' }}>
                            Select a texture file on the left sidebar to preview.
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: (selectedPath && !isLoading && !errorMsg) ? 'block' : 'none' }} />
                </div>

                {/* Bottom Playback Toolbar */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '6px 12px', 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    borderTop: `1px solid ${tikiedTheme.colorNeutralStroke1}` 
                }}>
                    <Toolbar style={{ minHeight: 'unset' }}>
                        <ToolbarButton 
                            icon={isPlaying ? <PauseRegular /> : <PlayRegular />} 
                            title={isPlaying ? "Pause" : "Play"}
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={!isAnimated}
                        />
                        <ToolbarButton 
                            icon={<PreviousRegular />} 
                            title="Previous Frame"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(prev => (prev - 1 + activeFrameSequence.length) % activeFrameSequence.length);
                            }}
                            disabled={!isAnimated}
                        />
                        <div style={{ padding: '0 10px', fontSize: '0.85rem', fontWeight: 600, color: tikiedTheme.colorNeutralForeground1, fontFamily: 'monospace' }}>
                            Frame {activeFrameSequence.length > 0 ? (activeFrameSequence[currentFrameIndex % activeFrameSequence.length] ?? 0) : 0} ({currentFrameIndex + 1}/{activeFrameSequence.length})
                        </div>
                        <ToolbarButton 
                            icon={<NextRegular />} 
                            title="Next Frame"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(prev => (prev + 1) % activeFrameSequence.length);
                            }}
                            disabled={!isAnimated}
                        />
                    </Toolbar>

                    <Button 
                        appearance="subtle" 
                        icon={isRightDrawerOpen ? <ChevronRightRegular /> : <ChevronLeftRegular />}
                        title={isRightDrawerOpen ? "Hide Settings" : "Show Settings"}
                        onClick={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
                    >
                        Settings
                    </Button>
                </div>
            </div>

            {/* Right expand toggle button shown AFTER slide-out animation finishes */}
            {!isRightDrawerOpen && showRightChevron && (
                <div style={{ 
                    borderLeft: `1px solid ${tikiedTheme.colorNeutralStroke1}`, 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    display: 'flex', 
                    alignItems: 'center' 
                }}>
                    <Button 
                        appearance="subtle" 
                        icon={<ChevronLeftRegular />} 
                        title="Expand Settings Sidebar"
                        onClick={() => setIsRightDrawerOpen(true)} 
                    />
                </div>
            )}

            {/* Right/End Inline Drawer: Animation Settings */}
            <InlineDrawer 
                open={isRightDrawerOpen} 
                position="end" 
                style={{ 
                    width: '280px', 
                    flexShrink: 0, 
                    backgroundColor: tikiedTheme.colorNeutralBackground2, 
                    borderLeft: `1px solid ${tikiedTheme.colorNeutralStroke1}` 
                }}
            >
                <DrawerHeader style={{ borderBottom: `1px solid ${tikiedTheme.colorNeutralStroke1}`, padding: '10px 15px' }}>
                    <DrawerHeaderTitle 
                        action={<Button appearance="subtle" icon={<DismissRegular />} onClick={() => setIsRightDrawerOpen(false)} />}
                    >
                        Animation Settings
                    </DrawerHeaderTitle>
                </DrawerHeader>
                <DrawerBody style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
                    {/* Columns & Rows */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <Label size="small">Columns</Label>
                            <SpinButton 
                                value={cols} 
                                min={1} 
                                max={64}
                                onChange={(e, data) => {
                                    if (data.value !== undefined && data.value !== null) handleColsChange(data.value);
                                }}
                            />
                        </div>
                        <div>
                            <Label size="small">Rows</Label>
                            <SpinButton 
                                value={rows} 
                                min={1} 
                                max={64}
                                onChange={(e, data) => {
                                    if (data.value !== undefined && data.value !== null) handleRowsChange(data.value);
                                }}
                            />
                        </div>
                    </div>

                    {/* Total Frames */}
                    <div>
                        <Label size="small">Total Frames</Label>
                        <SpinButton 
                            value={totalFrames} 
                            min={1} 
                            max={cols * rows}
                            onChange={(e, data) => {
                                if (data.value !== undefined && data.value !== null) {
                                    const tot = Math.max(1, Math.min(cols * rows, data.value));
                                    setTotalFrames(tot);
                                    setManualFrames(computeStrategyFrames(cols, rows, tot, strategy));
                                }
                            }}
                        />
                    </div>

                    {/* Playback Speed Slider */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Label size="small">Speed (FPS)</Label>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: tikiedTheme.colorNeutralForeground1 }}>{fps} FPS</span>
                        </div>
                        <Slider 
                            min={1} 
                            max={60} 
                            value={fps} 
                            onChange={(e, data) => setFps(data.value)} 
                        />
                    </div>

                    {/* Animation Strategy */}
                    <div>
                        <Label size="small">Strategy</Label>
                        <Dropdown 
                            value={
                                strategy === 'rows' ? 'Rows (Top to Bottom)' :
                                strategy === 'rows_btt' ? 'Rows (Bottom to Top)' :
                                strategy === 'cols' ? 'Columns (Top to Bottom)' :
                                strategy === 'cols_btt' ? 'Columns (Bottom to Top)' :
                                strategy === 'single_row' ? 'Single Row' :
                                strategy === 'single_col' ? 'Single Column' : 'Manual List'
                            }
                            onOptionSelect={(e, data) => {
                                if (data.optionValue) {
                                    handleStrategyChange(data.optionValue as AnimationStrategy);
                                }
                            }}
                        >
                            <Option value="rows">Rows (Top to Bottom)</Option>
                            <Option value="rows_btt">Rows (Bottom to Top)</Option>
                            <Option value="cols">Columns (Top to Bottom)</Option>
                            <Option value="cols_btt">Columns (Bottom to Top)</Option>
                            <Option value="single_row">Single Row</Option>
                            <Option value="single_col">Single Column</Option>
                            <Option value="manual">Manual List</Option>
                        </Dropdown>
                    </div>

                    {/* Loop Style */}
                    <div>
                        <Label size="small">Loop Style</Label>
                        <Dropdown 
                            value={loopStyle === 'linear' ? 'Linear Loop' : 'Ping-Pong'}
                            onOptionSelect={(e, data) => {
                                if (data.optionValue) {
                                    setLoopStyle(data.optionValue as LoopStyle);
                                    isPingPongReversingRef.current = false;
                                }
                            }}
                        >
                            <Option value="linear">Linear Loop</Option>
                            <Option value="pingpong">Ping-Pong</Option>
                        </Dropdown>
                    </div>

                    {/* Manual Frame List (only when strategy === 'manual') */}
                    {strategy === 'manual' && (
                        <div style={{ marginTop: '10px' }}>
                            <Label size="small" style={{ marginBottom: '6px', display: 'block' }}>Re-sortable Frame List</Label>
                            <div style={{ 
                                maxHeight: '180px', 
                                overflowY: 'auto', 
                                border: `1px solid ${tikiedTheme.colorNeutralStroke1}`, 
                                borderRadius: '4px', 
                                padding: '4px',
                                backgroundColor: tikiedTheme.colorNeutralBackground1
                            }}>
                                {manualFrames.map((frameIdx, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        padding: '2px 6px',
                                        fontSize: '0.8rem',
                                        color: tikiedTheme.colorNeutralForeground1,
                                        borderBottom: i < manualFrames.length - 1 ? `1px solid ${tikiedTheme.colorNeutralStroke1}` : 'none'
                                    }}>
                                        <span>Slot #{i + 1} &rarr; Frame {frameIdx}</span>
                                        <div>
                                            <Button 
                                                size="small" 
                                                appearance="subtle" 
                                                icon={<ArrowUpRegular />} 
                                                disabled={i === 0}
                                                onClick={() => moveManualFrame(i, 'up')}
                                            />
                                            <Button 
                                                size="small" 
                                                appearance="subtle" 
                                                icon={<ArrowDownRegular />} 
                                                disabled={i === manualFrames.length - 1}
                                                onClick={() => moveManualFrame(i, 'down')}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DrawerBody>
            </InlineDrawer>
        </div>
    );
};

export interface TextureViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    gateway: GameDataGateway;
}

export const TextureViewerModal: React.FC<TextureViewerModalProps> = ({ isOpen, onClose, gateway }) => {
    return (
        <Dialog open={isOpen} onOpenChange={(e, data) => { if (!data.open) onClose(); }}>
            <DialogSurface style={{ maxWidth: '90vw', width: '1200px', height: '85vh', padding: 0, overflow: 'hidden' }}>
                <FluentProvider theme={tikiedTheme} style={{ height: '100%', width: '100%' }}>
                    <DialogBody style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <DialogContent style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                            <TextureViewer gateway={gateway} onClose={onClose} />
                        </DialogContent>
                    </DialogBody>
                </FluentProvider>
            </DialogSurface>
        </Dialog>
    );
};
