import React, { useState, useRef } from 'react';
import { Button } from '@fluentui/react-components';
import { DismissSquareRegular, CheckmarkSquareFilled, FolderOpenRegular } from '@fluentui/react-icons';

interface ArchiveSelectorProps {
    pkiFile: File | null;
    setPkiFile: (file: File | null) => void;
    pkdFile: File | null;
    setPkdFile: (file: File | null) => void;
    onLoadArchive: (pki: File, pkd: File) => void;
}
export const ArchiveSelector: React.FC<ArchiveSelectorProps> = ({ pkiFile, setPkiFile, pkdFile, setPkdFile, onLoadArchive }) => {
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        let newPki = pkiFile;
        let newPkd = pkdFile;

        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.pkiwin')) {
                newPki = file;
                setPkiFile(file);
            } else if (file.name.toLowerCase().endsWith('.pkdwin')) {
                newPkd = file;
                setPkdFile(file);
            }
        }

        if (newPki && newPkd) {
            onLoadArchive(newPki, newPkd);
        }
    };
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Button 
                    appearance="primary"
                    size="large"
                    icon={<FolderOpenRegular />}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: isHovered ? 'var(--brand-primary, #6BB338)' : '#234C13',
                        color: 'white',
                        fontSize: '1.5rem',
                        height: 'auto',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    Select Game Archives
                </Button>

                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pkiwin,.pkdwin" 
                    multiple 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                />
                
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-fg-subtle, #523C2A)', marginTop: '6px', opacity: 0.85 }}>
                    (monsters.pkiwin &amp; monsters.pkdwin)
                </div>
            </div>
            
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '24px', 
                fontSize: '0.95em', 
                color: 'var(--neutral-fg-subtle, #523C2A)',
                marginTop: '4px'
            }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <strong>PKI:</strong>
                    {pkiFile ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckmarkSquareFilled style={{ color: 'var(--brand-primary, #6BB338)', fontSize: '1.2em' }} />
                        </div>
                    ) : (
                        <DismissSquareRegular style={{ color: 'var(--neutral-fg-subtle, #523C2A)', fontSize: '1.2em', opacity: 0.6 }} />
                    )}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <strong>PKD:</strong>
                    {pkdFile ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckmarkSquareFilled style={{ color: 'var(--brand-primary, #6BB338)', fontSize: '1.2em' }} />
                        </div>
                    ) : (
                        <DismissSquareRegular style={{ color: 'var(--neutral-fg-subtle, #523C2A)', fontSize: '1.2em', opacity: 0.6 }} />
                    )}
                </div>
            </div>
        </div>
    );
};
