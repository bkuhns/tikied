import React from 'react';
import { RouteToggle } from './stage_canvas_viewer.js';
import { Button, Checkbox } from '@fluentui/react-components';
import { SelectAllOnRegular, SelectAllOffRegular } from '@fluentui/react-icons';

export interface RouteTogglePanelProps {
    routeToggles: RouteToggle[];
    onToggleChange: (newToggles: RouteToggle[]) => void;
}

export const RouteTogglePanel: React.FC<RouteTogglePanelProps> = ({ routeToggles, onToggleChange }) => {
    if (!routeToggles || routeToggles.length === 0) {
        return <div style={{ padding: '10px' }}>No routes for this stage.</div>;
    }

    const setAll = (state: boolean) => {
        onToggleChange(routeToggles.map(rt => ({ ...rt, visible: state })));
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px' }}>
            {/* Left cell: Action buttons */}
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <Button size="small" icon={<SelectAllOnRegular />} title="Select All Routes" aria-label="Select All Routes" onClick={() => setAll(true)} />
                <Button size="small" icon={<SelectAllOffRegular />} title="Select No Routes" aria-label="Select No Routes" onClick={() => setAll(false)} />
            </div>
            
            {/* Right cell: Inline checkboxes */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', flex: 1 }}>
                {routeToggles.map((rt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', color: rt.color, fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        <Checkbox 
                            checked={rt.visible} 
                            onChange={(_, data) => {
                                const newToggles = [...routeToggles];
                                newToggles[idx] = { ...newToggles[idx], visible: !!data.checked };
                                onToggleChange(newToggles);
                            }}
                            label={`Route ${idx + 1}`}
                            style={{ color: 'inherit' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
