import React from 'react';

interface MaintenanceOverlayProps {
    message?: string;
}

const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({ message }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#141414',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <div style={{ marginBottom: '2rem' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Under Maintenance</h1>
            <p style={{ fontSize: '1.2rem', color: '#aaa', maxWidth: '600px' }}>
                {message || "We are currently upgrading our servers to verify streams faster. We'll be back shortly!"}
            </p>
        </div>
    );
};

export default MaintenanceOverlay;
