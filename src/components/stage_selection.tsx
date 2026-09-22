import React, { useState, useEffect } from 'react';
import { ISLANDS, StageInfo, getBaseStageId } from '../data/stages_data.js';
import { GameDataGateway } from '../utils/editor_api.js';
import { 
    Button, 
    Dialog, 
    DialogTrigger, 
    DialogSurface, 
    DialogTitle, 
    DialogBody, 
    DialogContent,
    DialogActions,
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    Badge
} from '@fluentui/react-components';
import { SlideGridRegular } from '@fluentui/react-icons';

interface StageSelectionProps {
    gateway: GameDataGateway;
    onSelectStage: (stage: StageInfo) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
    allowClose?: boolean;
}
interface StageCardProps {
    stage: StageInfo;
    thumbnailsUrl: string | null;
    onSelectStage: (stage: StageInfo) => void;
    handleOpenChange: (open: boolean) => void;
}
const StageCard = React.memo(({ stage, thumbnailsUrl, onSelectStage, handleOpenChange }: StageCardProps) => {
    const getThumbnailIndex = (stageId: number): number => {
        const mappedId = getBaseStageId(stageId);

        if (mappedId >= 1 && mappedId <= 21) return mappedId - 1; // Tiki
        if (mappedId >= 43 && mappedId <= 57) return mappedId - 22; // Toki
        if (mappedId >= 73 && mappedId <= 83) return mappedId - 37; // Gati Gati
        return 47; // Unknown
    };

    const getThumbnailStyle = (stageId: number): React.CSSProperties => {
        if (!thumbnailsUrl) {
            return {
                width: '192.5px', height: '97.5px',
                backgroundColor: 'var(--neutral-bg-surface, #E3DCBE)',
                display: 'inline-block'
            };
        }
        
        const thumb = getThumbnailIndex(stageId);
        const thumbX = thumb % 5;
        const thumbY = 9 - Math.floor(thumb / 5);
        
        const posX = -(thumbX * 192.5);
        const posY = -(thumbY * 100);

        return {
            width: '192.5px', 
            height: '97.5px',
            backgroundImage: `url(${thumbnailsUrl})`,
            backgroundSize: '962.5px 1000px',
            backgroundPosition: `${posX}px ${posY}px`,
            display: 'inline-block',
            flexShrink: 0,
            border: '2px solid var(--neutral-stroke-1, #D2C8A8)',
            borderRadius: '4px'
        };
    };

    return (
        <div 
            className="stage-row"
            onClick={() => {
                onSelectStage(stage);
                handleOpenChange(false);
            }}
            style={{ 
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--neutral-stroke-1, #D2C8A8)',
                backgroundColor: 'var(--neutral-bg-subtle, #F5F0DC)',
                transition: 'all 0.15s ease'
            }}
        >
            <div style={getThumbnailStyle(stage.id)}></div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.15em', fontWeight: 'bold' }}>{stage.difficulty}</div>
                <div style={{ fontSize: '0.95em', color: 'var(--neutral-fg-subtle, #523C2A)', marginTop: '4px' }}>{stage.introduction}</div>
            </div>
        </div>
    );
});

export const StageSelection: React.FC<StageSelectionProps> = ({ 
    gateway, 
    onSelectStage, 
    open: externalOpen, 
    onOpenChange: externalOnOpenChange,
    hideTrigger = false,
    allowClose = true
}) => {
    const modalType = allowClose ? 'modal' : 'alert';
    const [internalOpen, setInternalOpen] = useState(false);
    const [thumbnailsUrl, setThumbnailsUrl] = useState<string | null>(null);
    const [openItems, setOpenItems] = useState<string[]>(["island-0"]);

    const isControlled = externalOpen !== undefined;
    const isOpen = isControlled ? externalOpen : internalOpen;

    const handleOpenChange = (newOpen: boolean) => {
        if (isControlled) {
            externalOnOpenChange?.(newOpen);
        } else {
            setInternalOpen(newOpen);
        }
    };

    const handleAccordionToggle = (
        _event: React.SyntheticEvent, 
        data: { openItems: unknown[] }
    ) => {
        const nextOpen = data.openItems as string[];
        if (nextOpen.length > 0) {
            setOpenItems(nextOpen);
        }
    };

    useEffect(() => {
        if (!gateway || !isOpen || thumbnailsUrl) return;

        const loadThumbnails = async () => {
            try {
                const imgData = await gateway.getStageThumbnails();
                if (imgData) {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgData.width;
                    canvas.height = imgData.height;
                    const ctx = canvas.getContext('2d');
                    ctx?.putImageData(imgData, 0, 0);
                    canvas.toBlob((blob) => { if (blob) setThumbnailsUrl(URL.createObjectURL(blob)); });
                }
            } catch (e) {
                console.error("Failed to load stage thumbnails", e);
            }
        };

        loadThumbnails();
    }, [gateway, isOpen, thumbnailsUrl]);

    const dialogContent = (
        <DialogBody style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DialogTitle>Select Stage</DialogTitle>
            <DialogContent style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 0 0 0', marginTop: '10px' }}>
                <Accordion
                    openItems={openItems}
                    onToggle={handleAccordionToggle}
                    collapsible={false}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        overflow: 'hidden',
                        gap: '8px'
                    }}
                >
                    {ISLANDS.map(island => {
                        const itemValue = `island-${island.id}`;
                        const isExpanded = openItems.includes(itemValue);

                        return (
                            <AccordionItem
                                key={island.id}
                                value={itemValue}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    flex: isExpanded ? '1 1 auto' : '0 0 auto',
                                    borderRadius: '6px',
                                    border: '1px solid var(--neutral-stroke-2, #BEB28E)',
                                    backgroundColor: 'var(--neutral-bg-surface, #FAF7EE)'
                                }}
                            >
                                <AccordionHeader size="large">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '12px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{island.name}</span>
                                        <Badge appearance="tint" color="brand" shape="rounded">
                                            {island.stages.length} Stages
                                        </Badge>
                                    </div>
                                </AccordionHeader>
                                <AccordionPanel style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
                                        {island.stages.map((stage, idx) => (
                                            <StageCard 
                                                key={`${island.id}-${stage.id}-${idx}`}
                                                stage={stage}
                                                thumbnailsUrl={thumbnailsUrl}
                                                onSelectStage={onSelectStage}
                                                handleOpenChange={handleOpenChange}
                                            />
                                        ))}
                                    </div>
                                </AccordionPanel>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </DialogContent>
            {allowClose && (
                <DialogActions position="end" style={{ paddingTop: '12px', flexShrink: 0 }}>
                    <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
                    </DialogTrigger>
                </DialogActions>
            )}
        </DialogBody>
    );

    const dialogSurfaceStyle: React.CSSProperties = {
        maxWidth: '850px',
        width: '90vw',
        height: '75vh',
        maxHeight: '700px',
        display: 'flex',
        flexDirection: 'column'
    };

    if (hideTrigger) {
        return (
            <Dialog modalType={modalType} open={isOpen} onOpenChange={(_, data) => handleOpenChange(data.open)}>
                <DialogSurface style={dialogSurfaceStyle}>
                    {dialogContent}
                </DialogSurface>
            </Dialog>
        );
    }

    return (
        <Dialog modalType={modalType} open={isOpen} onOpenChange={(_, data) => handleOpenChange(data.open)}>
            <DialogTrigger disableButtonEnhancement>
                <Button onClick={() => handleOpenChange(true)} icon={<SlideGridRegular />}>Select Stage</Button>
            </DialogTrigger>
            <DialogSurface style={dialogSurfaceStyle}>
                {dialogContent}
            </DialogSurface>
        </Dialog>
    );
};
