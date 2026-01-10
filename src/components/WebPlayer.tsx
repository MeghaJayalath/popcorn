import React from 'react';

interface WebPlayerProps {
    tmdbId: string;
    season?: number;
    episode?: number;
    onClose: () => void;
}

const WebPlayer: React.FC<WebPlayerProps> = ({ tmdbId, season, episode, onClose }) => {
    // Construct VidSrc URL
    // Movie: https://vidsrc.xyz/embed/movie/{tmdb_id}
    // TV: https://vidsrc.xyz/embed/tv/{tmdb_id}/{season}/{episode}

    const src = (season && episode)
        ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.xyz/embed/movie/${tmdbId}`;

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
