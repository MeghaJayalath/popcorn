import React, { useEffect, useState } from 'react';
import logo from '../assets/logo.png';

interface SplashScreenProps {
    isReady: boolean;
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onComplete }) => {
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Minimum time to show splash (e.g. 2s)
        const timeout = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 2000);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        // Only start fade out when both data is ready AND min time elapsed
        if (isReady && minTimeElapsed) {
            setIsVisible(false);
            const t = setTimeout(onComplete, 500); // Wait for transition
            return () => clearTimeout(t);
        }
    }, [isReady, minTimeElapsed, onComplete]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#000',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            pointerEvents: 'none'
        }}>
            <div style={{ position: 'relative', width: '300px' }}>
                <img
                    src={logo}
                    alt="Popcorn"
                    style={{
                        width: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 20px rgba(229, 9, 20, 0.3))'
                    }}
                />

                {/* Shimmer Effect */}
                <div className="logo-shimmer" style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                    transform: 'skewX(-20deg) translateX(-150%)',
                    animation: 'shimmer 2s infinite',
                    pointerEvents: 'none',
                    mixBlendMode: 'overlay'
                }} />
            </div>

            {/* Loading Indicator */}
            <div style={{
                marginTop: '40px',
                width: '40px', height: '40px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#e50914',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />

            <style>{`
                @keyframes shimmer {
                    0% { transform: skewX(-20deg) translateX(-150%); }
                    60% { transform: skewX(-20deg) translateX(150%); }
                    100% { transform: skewX(-20deg) translateX(150%); }
                }
                @keyframes spin { 
                    0% { transform: rotate(0deg); } 
                    100% { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
