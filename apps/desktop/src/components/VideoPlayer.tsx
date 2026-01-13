import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
    url: string;
    onClose: () => void;
    tmdbId?: string;
    season?: number;
    episode?: number;
    magnet?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onClose, tmdbId, season, episode, magnet }) => {
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

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.error("Auto-play failed", e));
        }
    }, [url]);

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
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                zIndex: 1001
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: '1px solid white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    ← Back
                </button>
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
