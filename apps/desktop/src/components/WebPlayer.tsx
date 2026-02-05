import React from 'react';

interface WebPlayerProps {
    tmdbId: string;
    season?: number;
    episode?: number;
    onClose: () => void;
    provider?: 'vidking' | 'vidsrc';
}

const WebPlayer: React.FC<WebPlayerProps> = ({ tmdbId, season, episode, onClose, provider = 'vidking' }) => {
    // Listen for Vidking Progress Events
    React.useEffect(() => {
        let lastUpdate = 0;

        const handleMessage = (event: MessageEvent) => {
            // Vidking sends JSON data
            // Structure: { type: "PLAYER_EVENT", data: { event: "timeupdate", currentTime, duration, ... } }
            try {
                // User example says "if (typeof event.data === 'string') ... JSON.parse(event.data)"
                if (typeof event.data !== 'string') return;

                const payload = JSON.parse(event.data);

                if (payload && payload.type === 'PLAYER_EVENT' && payload.data) {
                    const { event: evtName, currentTime, duration } = payload.data;

                    if (evtName === 'timeupdate' || evtName === 'pause') {
                        const now = Date.now();
                        // Throttle updates to every 5 seconds (matching VideoPlayer.tsx)
                        // Always save on pause
                        if (evtName === 'pause' || (now - lastUpdate > 5000)) {
                            // Match updateWatchProgress signature:
                            // updateWatchProgress(tmdbId, currentSeconds, duration, season, episode, magnet?)

                            if (window.electronAPI && currentTime > 0) {
                                window.electronAPI.updateWatchProgress(
                                    tmdbId,
                                    currentTime,
                                    duration,
                                    season,
                                    episode,
                                    'vidking' // Hardcoded provider ID
                                ).catch(e => console.error("Failed to sync progress", e));
                                lastUpdate = now;
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing errors for other messages
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [tmdbId, season, episode]);

    // Customize player color to match app theme (FDEDAD)
    const primaryColor = 'FDEDAD'; // without hash

    let src = '';

    if (provider === 'vidsrc') {
        if (season && episode) {
            // TV Show: https://vidsrc.xyz/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}
            src = `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
        } else {
            // Movie: https://vidsrc.xyz/embed/movie?tmdb={tmdb_id}
            src = `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;
        }
    } else {
        // Default: VidKing
        if (season && episode) {
            // TV Show: https://vidking.net/embed/tv/{tmdb_id}/{season}/{episode}?color={hex}
            src = `https://vidking.net/embed/tv/${tmdbId}/${season}/${episode}?color=${primaryColor}`;
        } else {
            // Movie: https://vidking.net/embed/movie/{tmdb_id}?color={hex}
            src = `https://vidking.net/embed/movie/${tmdbId}?color=${primaryColor}`;
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'black', display: 'flex', flexDirection: 'column'
        }}>
            {/* Header / Back Button */}
            <div style={{
                padding: '20px', display: 'flex', alignItems: 'center',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                position: 'absolute', top: 0, width: '100%'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(0,0,0,0.6)', border: '1px solid #555', color: 'white',
                        padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Popcorn
                </button>
            </div>

            <iframe
                src={src}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="origin"
            />
        </div>
    );
};

export default WebPlayer;
