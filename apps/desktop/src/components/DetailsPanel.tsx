import React, { useState, useEffect, useRef } from 'react';
import type { Movie } from '../data/movies';
import placeholder from '../assets/placeholder.png';


const RATING_DESCRIPTIONS: Record<string, string> = {
    // MPAA (Movies)
    'G': 'General Audiences. All ages admitted.',
    'PG': 'Parental Guidance Suggested. Some material may not be suitable for children.',
    'PG-13': 'Parents Strongly Cautioned. Some material may be inappropriate for children under 13.',
    'R': 'Restricted. Under 17 requires accompanying parent or adult guardian.',
    'NC-17': 'Adults Only. No One 17 and Under Admitted.',
    'NR': 'Not Rated.',

    // TV Parental Guidelines
    'TV-Y': 'All Children. Intended for children ages 2 to 6.',
    'TV-Y7': 'Directed to Older Children. Intended for children age 7 and above.',
    'TV-G': 'General Audience. Suitable for all ages.',
    'TV-PG': 'Parental Guidance Suggested.',
    'TV-14': 'Parents Strongly Cautioned. Intended for children over 14 years of age.',
    'TV-MA': 'Mature Audience Only. Intended for adults and may be unsuitable for children under 17.',
};

interface DetailsPanelProps {
    movie: Movie | null;
    isOpen: boolean;
    onClose: () => void;
    onStream: (magnet: string, season?: number, episode?: number) => void;
    onWebStream?: (tmdbId: string, season?: number, episode?: number) => void;
    watchHistory?: any;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ movie, isOpen, onClose, onStream, onWebStream, watchHistory }) => {
    const [details, setDetails] = useState<any>(null);
    const [torrents, setTorrents] = useState<any[]>([]);
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
    const getEpisodeProgress = (season: number, epNum: number, sourceId?: string): number => {
        if (!watchHistory || !watchHistory.shows || !movie) return 0;
        const show = watchHistory.shows[movie.id.toString()];
        if (!show) return 0;

        const key = `s${season}e${epNum}`;
        const ep = show[key];

        if (!ep || !ep.duration) return 0;

        if (sourceId) {
            const storedMagnet = ep.magnet;
            if (!storedMagnet) return 0;

            const isHash = storedMagnet.startsWith('magnet:?xt=urn:btih:');

            if (isHash) {
                // Stored is Torrent
                const h1 = extractHash(sourceId); // sourceId is magnet
                const h2 = extractHash(storedMagnet);
                if (h1 && h2 && h1 !== h2) return 0;
                if (!h1) return 0; // sourceId wasn't magnet but stored is
            } else {
                // Stored is Web Provider (string)
                if (storedMagnet !== sourceId) return 0;
            }
        }

        return (ep.progress / ep.duration) * 100;
    };

    const isEpisodeReleased = (dateString?: string) => {
        if (!dateString) return false;
        const releaseDate = new Date(dateString);
        const today = new Date();
        return today >= releaseDate;
    };

    const getMovieProgress = (sourceId?: string): number => {
        if (!watchHistory || !watchHistory.movies || !movie || movie.type === 'tv') return 0;
        const entry = watchHistory.movies[movie.id.toString()];
        if (!entry || !entry.duration) return 0;

        if (sourceId) {
            const storedMagnet = entry.magnet;
            if (!storedMagnet) return 0;

            const isHash = storedMagnet.startsWith('magnet:?xt=urn:btih:');

            if (isHash) {
                // Stored is Torrent
                const h1 = extractHash(sourceId);
                const h2 = extractHash(storedMagnet);
                if (h1 && h2 && h1 !== h2) return 0;
                if (!h1) return 0;
            } else {
                // Stored is Web Provider (string)
                if (storedMagnet !== sourceId) return 0;
            }
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
        if (!isEpisodeReleased(ep.air_date)) return;

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
                const detailsPromise = (window.electronAPI as any).getMovieDetails(movie.id, movie.type);

                // Conditional Torrent Fetch
                const torrentPromise = (movie.type !== 'tv')
                    ? window.electronAPI.getTorrents(movie.title, movie.year)
                    : Promise.resolve([]);

                const [meta, torrentList] = await Promise.all([detailsPromise, torrentPromise]);

                if (active) {
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

                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

                {isLoading ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', color: '#777'
                    }}>
                        <div style={{
                            width: '40px', height: '40px',
                            border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-color)',
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem'
                        }} />
                        <p>Loading details...</p>
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
                                        backgroundImage: `url(${movie.backdropUrl || placeholder})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center'
                                    }} />


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


                            </div>

                            <div style={{
                                position: 'absolute',
                                right: 0,
                                bottom: '25px',
                                borderLeft: '3px solid #dcdcdc',
                                background: 'rgba(0,0,0,0.4)',
                                padding: '0.4rem 1rem',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                zIndex: 20,
                                cursor: 'help'
                            }}
                                title={RATING_DESCRIPTIONS[details?.certification || details?.mpaa || ''] || "Rating"}
                            >
                                {details?.certification || details?.mpaa || 'PG-13'}
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
                                <p><span style={{ color: '#777' }}>TMDB Rating:</span> <span style={{ color: '#f5c518', fontWeight: 'bold' }}>{movie.rating || details?.vote_average || 'N/A'}</span></p>
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
                                                                        padding: '12px 16px', background: selectedSeason === s.season_number ? 'rgba(181, 150, 110, 0.1)' : 'transparent',
                                                                        color: selectedSeason === s.season_number ? 'var(--primary-color)' : '#ddd',
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

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2px', width: '100%' }}>
                                            {loadingEpisodes ? (
                                                <p style={{ color: '#777', fontStyle: 'italic' }}>Loading season details...</p>
                                            ) : (
                                                episodes.map(ep => (
                                                    <div key={ep.id} style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#161616',
                                                        padding: '16px',
                                                        borderRadius: '4px',
                                                        transition: 'background 0.2s',
                                                        opacity: isEpisodeReleased(ep.air_date) ? 1 : 0.5,
                                                        pointerEvents: isEpisodeReleased(ep.air_date) ? 'auto' : 'none' // Actually we want to allow click but maybe just show it's disabled? NO, user asked for disabled dropdowns.
                                                    }}>
                                                        <div
                                                            onClick={() => isEpisodeReleased(ep.air_date) && handleEpisodeClick(ep)}
                                                            style={{
                                                                display: 'flex',
                                                                width: '100%',
                                                                cursor: isEpisodeReleased(ep.air_date) ? 'pointer' : 'default',
                                                                alignItems: 'center'
                                                            }}
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
                                                                            background: 'var(--primary-color)'
                                                                        }} />
                                                                    </div>
                                                                )}
                                                                {expandedEpisode !== ep.id && (
                                                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '35vw' }}>
                                                                        {isEpisodeReleased(ep.air_date)
                                                                            ? ep.overview
                                                                            : (ep.air_date
                                                                                ? `Available on: ${new Date(ep.air_date).toLocaleDateString('en-GB')}`
                                                                                : "Release date yet to be announced.")}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button style={{
                                                                background: 'transparent', border: 'none', color: '#aaa', cursor: isEpisodeReleased(ep.air_date) ? 'pointer' : 'default'
                                                            }}>
                                                                {expandedEpisode === ep.id ? (
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                                                ) : (
                                                                    isEpisodeReleased(ep.air_date) ? (
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                                    ) : (
                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                                                                            <circle cx="12" cy="12" r="10"></circle>
                                                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                                        </svg>
                                                                    )
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Expanded View */}
                                                        {expandedEpisode === ep.id && (
                                                            <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                                    <img src={ep.still_path || placeholder} alt={ep.name} style={{ width: '180px', borderRadius: '4px', objectFit: 'cover' }} />
                                                                    <p style={{ fontSize: '0.9rem', color: '#bfbfbf', lineHeight: '1.5', flex: 1 }}>{ep.overview || "No description available."}</p>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                    <h5 style={{ color: '#eee', margin: 0, fontSize: '0.9rem' }}>Select Source:</h5>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                                    {onWebStream && (
                                                                        <button
                                                                            onClick={() => onWebStream(movie.id, selectedSeason, ep.episode_number)}
                                                                            style={{
                                                                                background: '#333', border: '1px solid #444', borderRadius: '4px',
                                                                                padding: '10px', textAlign: 'left', cursor: 'pointer', width: '100%',
                                                                                transition: 'background 0.2s', position: 'relative', overflow: 'hidden'
                                                                            }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = '#444'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = '#333'}
                                                                        >
                                                                            <div style={{ fontWeight: 'bold', color: '#8A2BE2', marginBottom: '4px' }}>
                                                                                Play via Web
                                                                            </div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Fast Stream (Vidking)</div>
                                                                            {getEpisodeProgress(selectedSeason, ep.episode_number, 'vidking') > 0 && (
                                                                                <div style={{
                                                                                    position: 'absolute', bottom: 0, left: 0, height: '4px',
                                                                                    background: 'var(--primary-color)', width: `${getEpisodeProgress(selectedSeason, ep.episode_number, 'vidking')}%`
                                                                                }} />
                                                                            )}
                                                                        </button>
                                                                    )}
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
                                                                                    background: 'var(--primary-color)', width: `${getEpisodeProgress(selectedSeason, ep.episode_number, t.magnet)}%`
                                                                                }} />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {loadingEpisodeTorrents && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#777', marginTop: '10px' }}>
                                                                        <div style={{ width: '16px', height: '16px', border: '2px solid #555', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                                        <span>Searching high-quality streams...</span>
                                                                    </div>
                                                                )}
                                                                {!loadingEpisodeTorrents && episodeTorrents.length === 0 && !onWebStream && <p style={{ color: '#d64d4d', fontSize: '0.9rem', marginTop: '10px' }}>No streams found for this episode.</p>}
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
                                        </div>
                                        {movie.inCinemas ? (
                                            <div style={{
                                                padding: '2rem', border: '1px border #333', background: 'rgba(181,150,110,0.1)',
                                                borderRadius: '8px', textAlign: 'center', color: '#FDEDAD'
                                            }}>
                                                <h4 style={{ marginBottom: '0.5rem' }}>Only In Theaters</h4>
                                                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                                    This title is currently exclusive to cinemas. <br />
                                                    Digital release is expected in ~45 days.
                                                </p>
                                            </div>
                                        ) : (
                                            (torrents.length > 0 || (!movie.inCinemas && onWebStream)) ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                    {onWebStream && !movie.inCinemas && (
                                                        <button
                                                            onClick={() => onWebStream(movie.id)}
                                                            style={{
                                                                background: '#333', border: '1px solid #444', borderRadius: '4px',
                                                                padding: '10px', textAlign: 'left', cursor: 'pointer',
                                                                transition: 'background 0.2s',
                                                                minWidth: '140px', position: 'relative', overflow: 'hidden'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#444'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#333'}
                                                        >
                                                            <div style={{ fontWeight: 'bold', color: '#8A2BE2', marginBottom: '4px' }}>
                                                                Play via Web
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Fast Stream (Vidking)</div>
                                                            {getMovieProgress('vidking') > 0 && (
                                                                <div style={{
                                                                    position: 'absolute', bottom: 0, left: 0, height: '4px',
                                                                    background: 'var(--primary-color)', width: `${getMovieProgress('vidking')}%`
                                                                }} />
                                                            )}
                                                        </button>
                                                    )}
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
                                                                    background: 'var(--primary-color)', width: `${getMovieProgress(t.magnet)}%`
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
