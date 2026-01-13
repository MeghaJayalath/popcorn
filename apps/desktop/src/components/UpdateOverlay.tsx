import React from 'react';

const UpdateOverlay: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#e50914' }}>Update Required</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
                A new version of Popcorn is available. This update includes critical fixes and new features.
                Please update to continue watching.
            </p>

            <button
                onClick={() => {
                    // Direct user to download page - replace with your actual URL
                    require('electron').shell.openExternal('https://popcorn-app.com'); // Or your repo releases page
                }}
                style={{
                    padding: '12px 30px',
                    fontSize: '1.1rem',
                    backgroundColor: '#e50914',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Download Update
            </button>
        </div>
    );
};

export default UpdateOverlay;
