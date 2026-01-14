import React, { useState, useEffect } from 'react';
import type { Movie } from '../data/movies';

interface HeroProps {
    movies: Movie[];
    onMoreInfo: (movie: Movie) => void;
    isPaused: boolean;
}

const Hero: React.FC<HeroProps> = ({ movies, onMoreInfo }) => {
    const movie = movies[0];
    const [heroDetails, setHeroDetails] = useState<any>(null); // Store full details
    const [isLoading, setIsLoading] = useState(true);
    const parallaxRef = React.useRef<HTMLDivElement>(null);

    // Parallax Effect
    useEffect(() => {
        const handleScroll = () => {
            if (parallaxRef.current) {
                const scrolled = window.scrollY;
                if (scrolled < 1500) {
                    parallaxRef.current.style.transform = `translateY(${scrolled * 0.4}px)`; // 0.4 speed
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch trailer and logo for the top trending movie
    // Fetch Data (Only when movie changes)
    useEffect(() => {
        let active = true;
        setHeroDetails(null);
        setIsLoading(true);

        async function fetchData() {
            if (!window.electronAPI || !movie) {
                if (active) setIsLoading(false); // If no movie or API, stop loading
                return;
            }
            try {
                // Short delay to let fade animation start or component mount
                await new Promise(r => setTimeout(r, 500));

                if (!active) return;

                // Fetch Details (for Logo & Description)
                const details = await (window.electronAPI as any).getMovieDetails(movie.id);

                if (active) {
                    if (details) setHeroDetails(details);
                }
            } catch (e) {
                console.error("Hero data fetch failed", e);
            } finally {
                if (active) setIsLoading(false);
            }
        }
        fetchData();
        return () => { active = false; };
    }, [movie]); // Removed isPaused



    // toggleMute removed

    if (!movie) return null;

    const description = heroDetails?.description || movie.description;

    return (
        <div
            style={{
                height: '95vh', // Taller, Netflix-like
                width: '100vw',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column', // Stack content
                justifyContent: 'center', // Center vertically
                overflow: 'hidden',
                left: '50%',
                marginLeft: '-50vw',
                backgroundColor: '#141414' // Ensure background is black to hide parallax gap
            }}
        >
            {/* Parallax Container (Image + Trailer) */}
            <div ref={parallaxRef} style={{ position: 'absolute', inset: 0, zIndex: 0, willChange: 'transform' }}>
                {/* Background: Image (Always Visible) */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    backgroundImage: `url(${movie.backdropUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top'
                }} />

                {/* Trailer (Overlay on top of image) */}

            </div>

            {/* Dark Overlay Gradient (Lighter, Netflix-style) - Fixed, not parallaxed */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                background: 'linear-gradient(to top, #141414 0%, transparent 40%), linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 50%)'
            }} />

            <div style={{ marginLeft: '4rem', maxWidth: '40%', zIndex: 10, marginTop: '10vh' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                        <div style={{
                            width: '30px', height: '30px',
                            border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-color)',
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                        }} />
                        <span style={{ fontSize: '1.2rem' }}>Loading preview...</span>
                    </div>
                ) : (
                    <>
                        {heroDetails?.logoUrl ? (
                            <img
                                src={heroDetails.logoUrl}
                                alt={movie.title}
                                style={{
                                    maxWidth: '500px', // Slightly larger again
                                    maxHeight: '200px',
                                    objectFit: 'contain',
                                    marginBottom: '1.5rem',
                                    display: 'block',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                }}
                            />
                        ) : (
                            <h1 style={{
                                fontSize: '4.5rem', marginBottom: '1.5rem',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                lineHeight: '1.1',
                                fontWeight: 800,
                                textTransform: 'uppercase'
                            }}>
                                {movie.title}
                            </h1>
                        )}

                        {/* Description */}
                        <p style={{
                            color: '#e5e5e5',
                            fontSize: '1.2rem',
                            fontWeight: 400,
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                            marginBottom: '1.5rem',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            maxWidth: '700px'
                        }}>
                            {description}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => onMoreInfo(movie)}
                                style={{
                                    padding: '0.8rem 2.0rem',
                                    fontSize: '1.4rem',
                                    fontWeight: 'bold',
                                    backgroundColor: 'rgba(109, 109, 109, 0.7)',
                                    color: 'white',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    border: 'none',
                                    zIndex: 20,
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Info Icon SVG */}
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4" />
                                    <path d="M12 8h.01" />
                                </svg>
                                More Info
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Right Side Interaction (Mute & Age) */}
            <div style={{
                position: 'absolute',
                right: 0,
                bottom: '35%', // Approx height based on image
                display: 'flex',
                alignItems: 'center',
                zIndex: 20
            }}>

                <div style={{
                    borderLeft: '3px solid #dcdcdc',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '0.4rem 1rem',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                }}>
                    {heroDetails?.certification || heroDetails?.mpaa || 'PG-13'}
                </div>
            </div>
        </div>
    );
};

export default Hero;
