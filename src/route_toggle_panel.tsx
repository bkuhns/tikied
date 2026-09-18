import React from 'react';
import { RouteToggle } from './stage_canvas_viewer.js';
import { Button, Checkbox } from '@fluentui/react-components';

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
        <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Stage Routes</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Button size="small" onClick={() => setAll(true)}>All</Button>
                <Button size="small" onClick={() => setAll(false)}>None</Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {routeToggles.map((rt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', color: rt.color, fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        <Checkbox 
                            checked={rt.visible} 
                            onChange={(_, data) => {
                                const newToggles = [...routeToggles];
                                newToggles[idx].visible = !!data.checked;
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
