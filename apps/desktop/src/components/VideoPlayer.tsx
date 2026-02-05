import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
    url: string;
    onClose: () => void;
    onWebStream?: (tmdbId: string, season?: number, episode?: number, provider?: 'vidking' | 'vidsrc') => void;
    tmdbId?: string;
    season?: number;
    episode?: number;
    magnet?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onClose, onWebStream, tmdbId, season, episode, magnet }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastUpdateRef = useRef(0);

    // 1. Resume Progress
    useEffect(() => {
        if (!tmdbId || !window.electronAPI) return;

        async function loadProgress() {
            try {
                const progress = await window.electronAPI.getWatchProgress(tmdbId!, season, episode);
                if (progress && videoRef.current) {
                    console.log("Resuming from:", progress.progress);
                    // Only resume if progress is substantial (>10s) and not near end (<95%)
                    if (progress.progress > 10 && (progress.progress / progress.duration) < 0.95) {
                        videoRef.current.currentTime = progress.progress;
                    }
                }
            } catch (e) {
                console.error("Failed to load progress:", e);
            }
        }
        loadProgress();
    }, [tmdbId, season, episode]);

    // 2. Save Progress (Throttled)
    const handleTimeUpdate = () => {
        if (!videoRef.current || !tmdbId || !window.electronAPI) return;

        const now = Date.now();
        // Throttle updates to every 5 seconds
        if (now - lastUpdateRef.current > 5000) {
            window.electronAPI.updateWatchProgress(
                tmdbId,
                videoRef.current.currentTime,
                videoRef.current.duration,
                season,
                episode,
                magnet
            );
            lastUpdateRef.current = now;
        }
    };

    // Save on Unmount / Close
    useEffect(() => {
        return () => {
            if (videoRef.current && tmdbId && window.electronAPI) {
                // Force save on unmount
                window.electronAPI.updateWatchProgress(
                    tmdbId,
                    videoRef.current.currentTime,
                    videoRef.current.duration,
                    season,
                    episode,
                    magnet
                );
            }
        };
    }, [tmdbId, season, episode, magnet]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.error("Auto-play failed", e));
        }
    }, [url]);

    const [showOptions, setShowOptions] = React.useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(url);
        setShowOptions(false);
        alert("Stream URL copied! Open it in VLC (Media > Open Network Stream).");
    };



    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: '1rem',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxSizing: 'border-box',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                zIndex: 1001,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: '1px solid white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    ← Back
                </button>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <span>Stream Options</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>

                    {showOptions && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            background: '#1f1f1f',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            minWidth: '200px',
                            zIndex: 1002,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#888', borderBottom: '1px solid #333' }}>
                                Audio Issues? Try these:
                            </div>
                            <button
                                onClick={handleCopyLink}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '10px 12px', background: 'transparent', color: '#eee',
                                    cursor: 'pointer', fontSize: '0.9rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Copy Stream URL
                            </button>
                            <button
                                onClick={() => {
                                    if (onWebStream && tmdbId) {
                                        onWebStream(tmdbId, season, episode, 'vidking');
                                        setShowOptions(false);
                                    } else {
                                        alert("Web Stream not available for this title.");
                                    }
                                }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '10px 12px', background: 'transparent', color: '#eee',
                                    cursor: 'pointer', fontSize: '0.9rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Play via Vidking
                            </button>
                            <button
                                onClick={() => {
                                    if (onWebStream && tmdbId) {
                                        onWebStream(tmdbId, season, episode, 'vidsrc');
                                        setShowOptions(false);
                                    } else {
                                        alert("Web Stream not available for this title.");
                                    }
                                }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '10px 12px', background: 'transparent', color: '#eee',
                                    cursor: 'pointer', fontSize: '0.9rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Play via VidSrc
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <video
                ref={videoRef}
                src={url}
                controls
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default VideoPlayer;
