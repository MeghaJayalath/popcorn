import React, { useState, useEffect, useRef } from 'react';
import type { Movie } from '../data/movies';
import ReactPlayer from 'react-player';

interface DetailsPanelProps {
    movie: Movie | null;
    isOpen: boolean;
    onClose: () => void;
    onStream: (magnet: string, season?: number, episode?: number) => void;
    onWebStream?: (tmdbId: string, season?: number, episode?: number) => void;
    watchHistory?: any;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ movie, isOpen, onClose, onStream, onWebStream, watchHistory }) => {
    const [trailerId, setTrailerId] = useState<string | null>(null);
    const [trailerError, setTrailerError] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [torrents, setTorrents] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const panelRef = useRef<HTMLDivElement>(null);
    const parallaxRef = useRef<HTMLDivElement>(null);

    // Helper to compare magnets by hash
    const extractHash = (magnet: string) => {
        try {
            const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
            return match ? match[1].toLowerCase() : null;
        } catch (e) { return null; }
    };

    // Progress Helpers
    const getEpisodeProgress = (season: number, epNum: number, magnet?: string): number => {
        if (!watchHistory || !watchHistory.shows || !movie) return 0;
        const show = watchHistory.shows[movie.id.toString()];
        if (!show) return 0;

        const key = `s${season}e${epNum}`;
        const ep = show[key];

        if (!ep || !ep.duration) return 0;

        if (magnet && ep.magnet) {
            const h1 = extractHash(magnet);
            const h2 = extractHash(ep.magnet);
            if (h1 && h2 && h1 !== h2) return 0;
        }

        return (ep.progress / ep.duration) * 100;
    };

    const getMovieProgress = (magnet?: string): number => {
        if (!watchHistory || !watchHistory.movies || !movie || movie.type === 'tv') return 0;
        const entry = watchHistory.movies[movie.id.toString()];
        if (!entry || !entry.duration) return 0;

        if (magnet && entry.magnet) {
            const h1 = extractHash(magnet);
            const h2 = extractHash(entry.magnet);
            if (h1 && h2 && h1 !== h2) return 0;
        } else if (magnet && !entry.magnet) {
            // allow mismatch if old history? strict for now
        }

        return (entry.progress / entry.duration) * 100;
    };

    // TV Series State
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    const [episodeTorrents, setEpisodeTorrents] = useState<any[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [loadingEpisodeTorrents, setLoadingEpisodeTorrents] = useState(false);

    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
    const seasonDropdownRef = useRef<HTMLDivElement>(null);

    // Close season dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target as Node)) {
                setIsSeasonDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen for YouTube Player Errors (150, 152, etc)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                // Determine if message is from our iframe? Hard to know strict origin sometimes, but we can parse.
                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    // Check for standard YouTube error events
                    if (data.event === 'onError') {
                        setTrailerError(true);
                    }
                    // Sometimes errors (especially 150/152) come via infoDelivery
                    if (data.event === 'infoDelivery' && data.info) {
                        if (data.info.code === 150 || data.info.code === 152 ||
                            data.info.error === 150 || data.info.error === 152) {
                            setTrailerError(true);
                        }
                    }
                }
            } catch (e) { /* non-json message */ }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Fetch Episodes when season changes
    useEffect(() => {
        if (!movie || !isOpen || movie.type !== 'tv') return;

        let active = true;
        setLoadingEpisodes(true);

        async function fetchEps() {
            if (!window.electronAPI || !movie) return;
            try {
                const eps = await (window.electronAPI as any).getSeasonDetails(movie.id, selectedSeason);
                if (active && eps) setEpisodes(eps);
            } catch (e) { console.error(e); }
            finally { if (active) setLoadingEpisodes(false); }
        }
        fetchEps();
        return () => { active = false; };
    }, [movie, isOpen, selectedSeason]);

    const handleEpisodeClick = async (ep: any) => {
        if (!movie) return;
        if (expandedEpisode === ep.id) {
            setExpandedEpisode(null);
            return;
        }
        setExpandedEpisode(ep.id);
        setEpisodeTorrents([]);
        setLoadingEpisodeTorrents(true);

        try {
            const list = await (window.electronAPI as any).getEpisodeTorrents(movie.title, selectedSeason, ep.episode_number);
            setEpisodeTorrents(list);
        } catch (e) { console.error(e); }
        finally { setLoadingEpisodeTorrents(false); }
    };

    // Parallax
    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const handleScroll = () => {
            if (parallaxRef.current) {
                const scrolled = panel.scrollTop;
                if (scrolled < 800) { // Limit
                    parallaxRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
                }
            }
        };
        panel.addEventListener('scroll', handleScroll, { passive: true });
        return () => panel.removeEventListener('scroll', handleScroll);
    }, [isOpen]); // Re-attach when opened likely

    useEffect(() => {
        let active = true;
        setTrailerId(null);
        setTrailerError(false);
        setDetails(null);
        setTorrents([]);
        setIsLoading(true);

        // Reset TV State
        setEpisodes([]);
        setSelectedSeason(1);
        setExpandedEpisode(null);

        if (!movie || !isOpen) return;

        async function fetchData() {
            if (!window.electronAPI || !movie) return;
            try {
                await new Promise(r => setTimeout(r, 600));
                if (!active || !isOpen) return;

                // Basic Fetch
                const trailerPromise = window.electronAPI.getTrailer(movie.id);
                const detailsPromise = (window.electronAPI as any).getMovieDetails(movie.id);

                // Conditional Torrent Fetch
                const torrentPromise = (movie.type !== 'tv')
                    ? window.electronAPI.getTorrents(movie.title, movie.year)
                    : Promise.resolve([]);

                const [id, meta, torrentList] = await Promise.all([trailerPromise, detailsPromise, torrentPromise]);

                if (active) {
                    if (id) setTrailerId(id);
                    if (meta && !meta.error) setDetails(meta);
                    if (torrentList) setTorrents(torrentList);
                }
            } catch (e) {
                console.error("Data fetch failed", e);
            } finally {
                if (active) setIsLoading(false);
            }
        }
        fetchData();
        return () => { active = false; };
    }, [movie, isOpen]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    // Lock Body Scroll when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!movie) return null;

    const description = details?.description || movie.description;
    const genres = details?.genres ? details.genres.join(', ') : "Loading...";
    const cast = details?.cast ? details.cast.join(', ') : "Loading...";


    return (
        <>
            {/* Backdrop Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 200, // Higher than navbar
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 0.4s ease-in-out'
                }}
            />

            {/* Sliding Panel */}
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: 0, right: 0, bottom: 0,
                    width: '45vw', // Slightly narrower
                    minWidth: '500px',
                    maxWidth: '100vw',
                    backgroundColor: '#181818',
                    zIndex: 201,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    overflowY: 'auto',
                    boxShadow: '-8px 0 25px rgba(0,0,0,0.7)'
                }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '15px', right: '15px',
                        zIndex: 30,
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none', color: 'white',
                        borderRadius: '50%', width: '36px', height: '36px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                {isLoading ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', color: '#777'
                    }}>
                        <div style={{
                            width: '40px', height: '40px',
                            border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e50914',
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem'
                        }} />
                        <p>Loading details...</p>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <>
                        {/* Hero Section */}
                        <div style={{
                            position: 'relative',
                            height: '38vh',
                            width: '100%',
                            overflow: 'hidden', // Fixes gradient and video containment
                            backgroundColor: '#000' // Gap fix
                        }}>
                            <div style={{ position: 'absolute', inset: 0 }}>
                                {/* Parallax Wrapper */}
                                <div ref={parallaxRef} style={{ position: 'absolute', inset: 0, zIndex: 0, willChange: 'transform' }}>
                                    {/* Background Image (Always) */}
                                    <div style={{
                                        position: 'absolute', inset: 0, zIndex: 0,
                                        backgroundImage: `url(${movie.backdropUrl})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center'
                                    }} />

                                    {/* Trailer (Overlay) */}
                                    {trailerId && !trailerError && (
                                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                                            <div style={{ width: '100%', height: '100%', transform: 'scale(1.5)' }}>
                                                {(() => {
                                                    const Player = ReactPlayer as any;
                                                    return <Player
                                                        url={`https://www.youtube.com/watch?v=${trailerId}`}
                                                        playing={true}
                                                        muted={isMuted}
                                                        loop={true}
                                                        controls={false}
                                                        width="100%"
                                                        height="100%"
                                                        config={{
                                                            youtube: {
                                                                playerVars: { showinfo: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, origin: 'https://www.youtube.com' }
                                                            }
                                                        }}
                                                        onError={() => setTrailerError(true)}
                                                    />
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Gradient Overlay */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0, left: 0, right: 0, zIndex: 2,
                                    height: '60%',
                                    background: 'linear-gradient(to bottom, transparent 0%, rgba(24,24,24,0.5) 60%, #181818 100%)',
                                    pointerEvents: 'none'
                                }} />
                            </div>

                            <div style={{
                                position: 'absolute', bottom: '25px', left: '30px', right: '30px',
                                zIndex: 10,
                                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'
                            }}>
                                {details?.logoUrl ? (
                                    <img
                                        src={details.logoUrl}
                                        alt={movie.title}
                                        style={{
                                            maxWidth: '250px',
                                            maxHeight: '100px',
                                            objectFit: 'contain',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                                            marginBottom: '0.5rem'
                                        }}
                                    />
                                ) : (
                                    <h1 style={{
                                        fontSize: '2.2rem',
                                        lineHeight: '1.2',
                                        fontWeight: 800,
                                        marginBottom: 0,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                                    }}>
                                        {movie.title}
                                    </h1>
                                )}

                                {/* Mute Toggle Small */}
                                <button
                                    onClick={toggleMute}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.6)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {isMuted ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div style={{ padding: '0 30px 40px', color: '#ccc' }}>
                            <p style={{
                                fontSize: '1rem', lineHeight: '1.5', color: 'white',
                                marginBottom: '1.5rem', marginTop: '0'
                            }}>
                                {description || "Loading details..."}
                            </p>

                            <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                                <p><span style={{ color: '#777' }}>Cast:</span> <span style={{ color: 'white' }}>{cast}</span></p>
                                <p><span style={{ color: '#777' }}>Genres:</span> <span style={{ color: 'white' }}>{genres}</span></p>
                            </div>

                            {/* Streams / Episodes Section */}
                            <div style={{ marginTop: '2rem' }}>
                                {movie.type === 'tv' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 style={{ fontSize: '1.4rem', color: '#eee', margin: 0, fontWeight: 600 }}>Episodes</h3>
                                            {details?.seasons && details.seasons.length > 0 && (
                                                <div ref={seasonDropdownRef} style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.05)', color: '#fff',
                                                            padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '8px', cursor: 'pointer',
                                                            fontSize: '0.95rem', fontWeight: 500,
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            transition: 'all 0.2s',
                                                            backdropFilter: 'blur(10px)'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    >
                                                        Season {selectedSeason}
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                                                            style={{ transform: isSeasonDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                        </svg>
                                                    </button>

                                                    {isSeasonDropdownOpen && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                                            background: '#1f1f1f', border: '1px solid #333', borderRadius: '8px',
                                                            overflow: 'hidden', zIndex: 100, minWidth: '180px', maxHeight: '300px', overflowY: 'auto',
                                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                                            animation: 'fadeIn 0.2s'
                                                        }}>
                                                            {details.seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
                                                                <button
                                                                    key={s.season_number}
                                                                    onClick={() => {
                                                                        setSelectedSeason(s.season_number);
                                                                        setIsSeasonDropdownOpen(false);
                                                                    }}
                                                                    style={{
                                                                        display: 'block', width: '100%', textAlign: 'left',
                                                                        padding: '12px 16px', background: selectedSeason === s.season_number ? 'rgba(229, 9, 20, 0.1)' : 'transparent',
                                                                        color: selectedSeason === s.season_number ? '#e50914' : '#ddd',
                                                                        border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                                                                        borderBottom: '1px solid #2a2a2a', transition: 'background 0.2s'
                                                                    }}
                                                                    onMouseEnter={e => { if (selectedSeason !== s.season_number) e.currentTarget.style.background = '#2a2a2a'; }}
                                                                    onMouseLeave={e => { if (selectedSeason !== s.season_number) e.currentTarget.style.background = 'transparent'; }}
                                                                >
                                                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                                    <span style={{ fontSize: '0.8rem', color: '#777', marginLeft: '6px' }}>({s.episode_count} eps)</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {loadingEpisodes ? (
                                                <p style={{ color: '#777', fontStyle: 'italic' }}>Loading season details...</p>
                                            ) : (
                                                episodes.map(ep => (
                                                    <div key={ep.id} style={{ background: '#161616', padding: '16px', borderRadius: '4px', transition: 'background 0.2s' }}>
                                                        <div
                                                            onClick={() => handleEpisodeClick(ep)}
                                                            style={{ display: 'flex', cursor: 'pointer', alignItems: 'center' }}
                                                        >
                                                            <span style={{ fontSize: '1.1rem', color: '#777', width: '35px', marginRight: '10px', textAlign: 'center' }}>{ep.episode_number}</span>
                                                            <div style={{ flex: 1, marginRight: '1rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#eee', fontWeight: 500 }}>{ep.name}</h4>
                                                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                                                </div>
                                                                {getEpisodeProgress(selectedSeason, ep.episode_number) > 0 && (
                                                                    <div style={{
                                                                        width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)',
                                                                        marginTop: '4px', borderRadius: '2px', overflow: 'hidden'
                                                                    }}>
                                                                        <div style={{
                                                                            height: '100%', width: `${getEpisodeProgress(selectedSeason, ep.episode_number)}%`,
                                                                            background: '#e50914'
                                                                        }} />
                                                                    </div>
                                                                )}
                                                                {expandedEpisode !== ep.id && (
                                                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '35vw' }}>
                                                                        {ep.overview}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button style={{
                                                                background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer'
                                                            }}>
                                                                {expandedEpisode === ep.id ? (
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                                                ) : (
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Expanded View */}
                                                        {expandedEpisode === ep.id && (
                                                            <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                                    {ep.still_path && <img src={ep.still_path} alt={ep.name} style={{ width: '180px', borderRadius: '4px', objectFit: 'cover' }} />}
                                                                    <p style={{ fontSize: '0.9rem', color: '#bfbfbf', lineHeight: '1.5', flex: 1 }}>{ep.overview || "No description available."}</p>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                    <h5 style={{ color: '#eee', margin: 0, fontSize: '0.9rem' }}>Select Source:</h5>
                                                                    {onWebStream && (
                                                                        <button
                                                                            onClick={() => onWebStream(movie.id, selectedSeason, ep.episode_number)}
                                                                            style={{
                                                                                background: '#e50914', border: 'none', color: 'white',
                                                                                padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem',
                                                                                cursor: 'pointer', fontWeight: 600
                                                                            }}
                                                                        >
                                                                            Play via Web (Fast)
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {loadingEpisodeTorrents ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#777' }}>
                                                                        <div style={{ width: '16px', height: '16px', border: '2px solid #555', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                                        <span>Searching high-quality streams...</span>
                                                                    </div>
                                                                ) : (
                                                                    episodeTorrents.length > 0 ? (
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                                            {episodeTorrents.map((t, i) => (
                                                                                <button
                                                                                    key={i}
                                                                                    onClick={() => onStream(t.magnet, selectedSeason, ep.episode_number)}
                                                                                    style={{
                                                                                        background: '#333', border: '1px solid #444', borderRadius: '4px',
                                                                                        padding: '10px', textAlign: 'left', cursor: 'pointer', width: '100%',
                                                                                        transition: 'background 0.2s', position: 'relative', overflow: 'hidden'
                                                                                    }}
                                                                                    onMouseEnter={e => e.currentTarget.style.background = '#444'}
                                                                                    onMouseLeave={e => e.currentTarget.style.background = '#333'}
                                                                                >
                                                                                    <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                                                                                        {t.quality}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{t.size} • {t.seeds} seeds</div>

                                                                                    {getEpisodeProgress(selectedSeason, ep.episode_number, t.magnet) > 0 && (
                                                                                        <div style={{
                                                                                            position: 'absolute', bottom: 0, left: 0, height: '4px',
                                                                                            background: '#e50914', width: `${getEpisodeProgress(selectedSeason, ep.episode_number, t.magnet)}%`
                                                                                        }} />
                                                                                    )}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : <p style={{ color: '#d64d4d', fontSize: '0.9rem' }}>No streams found for this episode.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )))}
                                        </div>
                                        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', color: '#eee', margin: 0 }}>Available Streams</h3>
                                            {onWebStream && (
                                                <button
                                                    onClick={() => !movie.inCinemas && onWebStream(movie.id)}
                                                    disabled={!!movie.inCinemas}
                                                    style={{
                                                        background: movie.inCinemas ? '#333' : '#e50914',
                                                        border: 'none', color: 'white',
                                                        padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem',
                                                        cursor: movie.inCinemas ? 'not-allowed' : 'pointer',
                                                        fontWeight: 600,
                                                        opacity: movie.inCinemas ? 0.5 : 1
                                                    }}
                                                    title={movie.inCinemas ? "Not available while in cinemas" : ""}
                                                >
                                                    Play via Web (Fast)
                                                </button>
                                            )}
                                        </div>
                                        {movie.inCinemas ? (
                                            <div style={{
                                                padding: '2rem', border: '1px border #333', background: 'rgba(255,0,0,0.1)',
                                                borderRadius: '8px', textAlign: 'center', color: '#ffaaaa'
                                            }}>
                                                <h4 style={{ marginBottom: '0.5rem' }}>Only In Theaters</h4>
                                                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                                    This title is currently exclusive to cinemas. <br />
                                                    Digital release is expected in ~45 days.
                                                </p>
                                            </div>
                                        ) : (
                                            torrents.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                    {torrents.map((t: any, i: number) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => onStream(t.magnet)}
                                                            style={{
                                                                background: '#333', border: '1px solid #444', borderRadius: '4px',
                                                                padding: '10px', textAlign: 'left', cursor: 'pointer',
                                                                transition: 'background 0.2s',
                                                                minWidth: '140px', position: 'relative', overflow: 'hidden'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#444'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#333'}
                                                        >
                                                            <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                                                                {t.quality}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{t.size} • {t.seeds} seeds</div>
                                                            {getMovieProgress(t.magnet) > 0 && (
                                                                <div style={{
                                                                    position: 'absolute', bottom: 0, left: 0, height: '4px',
                                                                    background: '#e50914', width: `${getMovieProgress(t.magnet)}%`
                                                                }} />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ color: '#777', fontStyle: 'italic' }}>Searching for streams...</p>
                                            )
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div >
        </>
    );
};

export default DetailsPanel;
