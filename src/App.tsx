import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import VideoPlayer from './components/VideoPlayer';
import WebPlayer from './components/WebPlayer';
import PosterCard from './components/PosterCard';
import type { Movie } from './data/movies';
import logo from './assets/logo.png';
import './index.css';

interface CategorySection {
  title: string;
  movies: Movie[];
}

// ... (imports remain similar, will need DetailsPanel)
import DetailsPanel from './components/DetailsPanel';
import Top10Card from './components/Top10Card';

function App() {
  const [categories, setCategories] = useState<CategorySection[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);

  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [webStreamParams, setWebStreamParams] = useState<{ tmdbId: string, season?: number, episode?: number } | null>(null);
  const [playbackParams, setPlaybackParams] = useState<{ tmdbId: string, season?: number, episode?: number, magnet?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");



  // Side Panel State
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [watchHistory, setWatchHistory] = useState<any>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!window.electronAPI) return;

      try {
        // 1. Fetch Trending FIRST (Hero + First Row)
        const trendingRaw = await window.electronAPI.getTrending();
        const trendingMovies = mapMovies(trendingRaw);

        if (trendingMovies.length > 0) {
          // Hero Slideshow gets top 5 TRENDING
          setHeroMovies(trendingMovies.slice(0, 5));

          // Add "Trending Now" Row FIRST
          setCategories(prev => {
            // Filter out any existing to avoid dupes/reordering issues if re-run
            const next = prev.filter(p => p.title !== "Trending Now");
            return [{ title: "Trending Now", movies: trendingMovies }, ...next];
          });
        }

        // 2. Fetch Top 10 This Week
        const favoritesRaw = await (window.electronAPI as any).getTop10();
        const favMovies = mapMovies(favoritesRaw);

        if (favMovies.length > 0) {
          setCategories(prev => {
            if (prev.find(p => p.title === "Top 10 This Week")) return prev;
            return [...prev, { title: "Top 10 This Week", movies: favMovies }];
          });
        }

        // 3. Fetch Latest Releases
        const latestRaw = await window.electronAPI.getLatest();
        const latestMovies = mapMovies(latestRaw);

        if (latestMovies.length > 0) {
          setCategories(prev => {
            if (prev.find(p => p.title === "Latest Releases")) return prev;
            return [...prev, { title: "Latest Releases", movies: latestMovies }];
          });
        }

        // 0. Fetch History
        const history = await (window.electronAPI as any).getWatchHistory();
        console.log("Loaded Watch History:", history);
        setWatchHistory(history);

      } catch (e) {
        console.error("Failed to fetch content:", e);
      }
    }
    fetchContent();
  }, []);

  const handleRemoveFromHistory = async (movie: Movie) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.removeWatchProgress(movie.id.toString());
      const history = await window.electronAPI.getWatchHistory();
      setWatchHistory(history);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!watchHistory || !window.electronAPI) return;

    async function loadContinueWatching() {
      const candidates: any[] = [];

      // Movies
      if (watchHistory.movies) {
        Object.entries(watchHistory.movies).forEach(([id, data]: [string, any]) => {
          const pct = (data.progress / data.duration) * 100;
          if (pct > 1 && pct < 98) {
            candidates.push({ id, ...data, type: 'movie' });
          }
        });
      }

      // Shows
      if (watchHistory.shows) {
        Object.entries(watchHistory.shows).forEach(([id, eps]: [string, any]) => {
          // Find latest watched ep
          let latestVal = 0;
          let latestEp: any = null;
          Object.values(eps).forEach((ep: any) => {
            if (ep.lastWatched > latestVal) {
              latestVal = ep.lastWatched;
              latestEp = ep;
            }
          });

          if (latestEp) {
            const pct = (latestEp.progress / latestEp.duration) * 100;
            if (pct > 1 && pct < 98) {
              candidates.push({ id, ...latestEp, type: 'tv' });
            }
          }
        });
      }

      candidates.sort((a, b) => b.lastWatched - a.lastWatched);
      const top = candidates.slice(0, 10);

      if (top.length === 0) {
        setCategories(prev => prev.filter(c => c.title !== "Continue Watching"));
        return;
      }

      // Fetch details
      const movies = await Promise.all(top.map(async (c) => {
        try {
          const d = await window.electronAPI.getMovieDetails(c.id);
          return {
            id: d.id,
            title: d.title || d.name,
            posterUrl: d.image,
            year: d.year ? d.year.toString() : (d.release_date || d.first_air_date || '').split('-')[0],
            rating: d.rating || 'N/A',
            type: c.type,
            backdropUrl: d.backdrop,
            description: d.description,
            inCinemas: d.inCinemas,
            voteCount: d.voteCount || 0
          } as Movie;
        } catch (e) { return null; }
      }));

      const validMovies = movies.filter(Boolean) as Movie[];

      if (validMovies.length > 0) {
        setCategories(prev => {
          const filtered = prev.filter(c => c.title !== "Continue Watching");
          // Insert after Trending (index 0)
          const trending = filtered.find(c => c.title === "Trending Now");
          if (trending) {
            const others = filtered.filter(c => c.title !== "Trending Now");
            return [trending, { title: "Continue Watching", movies: validMovies }, ...others];
          }
          return [{ title: "Continue Watching", movies: validMovies }, ...filtered];
        });
      } else {
        setCategories(prev => prev.filter(c => c.title !== "Continue Watching"));
      }
    }
    loadContinueWatching();
  }, [watchHistory]);

  const mapMovies = (raw: any[]): Movie[] => {
    return raw.map((s: any) => ({
      id: s.id,
      title: s.title,
      year: s.year,
      posterUrl: s.image,
      rating: s.rating || 'N/A',
      voteCount: s.voteCount,
      description: "",
      backdropUrl: s.image,
      inCinemas: s.inCinemas,
      type: s.type,
    }));
  };

  const getProgress = (movie: Movie): number => {
    if (!watchHistory) return 0;

    // Handle TV Shows
    if (movie.type === 'tv') {
      if (!watchHistory.shows) return 0;
      const show = watchHistory.shows[movie.id.toString()];
      if (!show) return 0;

      // Find most recently watched episode
      let lastWatched = 0;
      let progress = 0;
      let duration = 0;

      Object.values(show).forEach((ep: any) => {
        if (ep.lastWatched > lastWatched) {
          lastWatched = ep.lastWatched;
          progress = ep.progress;
          duration = ep.duration;
        }
      });

      if (duration > 0) return (progress / duration) * 100;
      return 0;
    }

    // Handle Movies
    if (watchHistory.movies) {
      const entry = watchHistory.movies[movie.id.toString()];
      if (entry && entry.duration) return (entry.progress / entry.duration) * 100;
    }

    return 0;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.electronAPI) return;

    setIsSearching(true);
    setLoading(true);
    setLoadingMessage(`Searching IMDb for "${searchQuery}"...`);

    try {
      const results = await window.electronAPI.searchMovies(searchQuery);
      setSearchResults(mapMovies(results));
    } catch (err) {
      console.error("Search failed:", err);
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // OPEN PANEL on Poster Click instead of immediate play (optional, or separate button?)
  // User said "When an movie item is clicked ... it should open a side panel"
  const handlePosterClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsPanelOpen(true);
  };

  const handleMoreInfoClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsPanelOpen(true);
  };

  const startStream = async (magnet: string, season?: number, episode?: number) => {
    setLoading(true);
    setLoadingMessage("Buffering stream... (this may take a few seconds)");

    // Set ID for history tracking
    const targetMovie = selectedMovie;
    if (targetMovie) {
      setPlaybackParams({ tmdbId: targetMovie.id.toString(), season, episode, magnet });
    }

    try {
      const { url } = await window.electronAPI.startStream(magnet);
      setStreamUrl(url);
    } catch (err) {
      console.error("Stream failed:", err);
      alert("Failed to start stream.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleClosePlayer = async () => {
    setStreamUrl(null);
    setWebStreamParams(null);
    setPlaybackParams(null);
    if (window.electronAPI) {
      await window.electronAPI.stopStream();
      // Refetch history to update UI immediately
      const history = await window.electronAPI.getWatchHistory();
      setWatchHistory(history);
    }
  };

  const handleWebStream = (tmdbId: string, season?: number, episode?: number) => {
    setWebStreamParams({ tmdbId, season, episode });
    // Keep panel open underneath
  };

  return (
    <div className="App">
      {/* ... QualityModal and Loading Overlay ... */}


      {/* Loading Overlay ... */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          {/* ... spinner code ... */}
          <div style={{
            width: '50px', height: '50px',
            border: '4px solid #E50914', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#fff' }}>{loadingMessage}</p>
          {/* ... cancel button code ... */}
          <button
            onClick={async () => {
              setLoading(false);
              setLoadingMessage("");
              if (window.electronAPI) await window.electronAPI.stopStream();
            }}
            style={{
              marginTop: '2rem', padding: '8px 24px', background: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {streamUrl && (
        <VideoPlayer
          url={streamUrl}
          onClose={handleClosePlayer}
          tmdbId={playbackParams?.tmdbId}
          season={playbackParams?.season}
          episode={playbackParams?.episode}
          magnet={playbackParams?.magnet}
        />
      )}

      {webStreamParams && (
        <WebPlayer
          tmdbId={webStreamParams.tmdbId}
          season={webStreamParams.season}
          episode={webStreamParams.episode}
          onClose={() => setWebStreamParams(null)}
        />
      )}

      <div style={{ display: (streamUrl || webStreamParams) ? 'none' : 'block' }}>
        {/* ... Nav Bar ... */}
        <div style={{
          position: 'fixed', top: 0, width: '100%', padding: '20px 4rem',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 10%, transparent)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Click Logo to reset */}
            <div style={{ marginRight: '2rem', cursor: 'pointer' }} onClick={() => { setIsSearching(false); setSearchQuery(""); setIsPanelOpen(false); }}>
              <img src={logo} alt="Popcorn" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            {/* ... Links ... */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => setIsSearching(false)}>Home</span>
              <span>Movies</span>
              <span>TV Shows</span>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex' }}>
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: 'white',
                padding: '8px 12px', borderRadius: '4px', outline: 'none'
              }}
            />
          </form>
        </div>

        {/* Side Panel */}
        <DetailsPanel
          movie={selectedMovie}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onStream={startStream}
          onWebStream={handleWebStream}
          watchHistory={watchHistory}
        />

        {isSearching ? (
          <div style={{ paddingTop: '100px', paddingLeft: '4rem', paddingRight: '4rem' }}>
            <h2>Search Results: "{searchQuery}"</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '2rem', justifyContent: 'center' }}>
              {searchResults.length > 0 ? searchResults.map(movie => (
                <PosterCard key={movie.id} movie={movie} onPlay={() => handlePosterClick(movie)} progress={getProgress(movie)} />
              )) : (
                !loading && <p>No results found.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {heroMovies.length > 0 && (
              <Hero
                movies={heroMovies}
                onMoreInfo={handleMoreInfoClick}
                isPaused={isPanelOpen} // Pause Main Hero if panel is open
              />
            )}

            <div style={{ padding: '20px 0', marginTop: '-150px', position: 'relative', zIndex: 20 }}>
              {categories.length > 0 ? categories.map((cat, idx) => (
                <div key={idx} style={{ padding: '0 4rem', marginBottom: '3rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>{cat.title}</h3>

                  <div style={{
                    display: 'flex', gap: '1rem', overflowX: 'auto', padding: '20px 20px',
                    scrollBehavior: 'smooth'
                  }} className="hide-scrollbar">
                    {cat.movies.map((movie, mIdx) => (
                      cat.title === "Top 10 This Week" ? (
                        <Top10Card key={movie.id} movie={movie} rank={mIdx + 1} onPlay={() => handlePosterClick(movie)} />
                      ) : (
                        <PosterCard
                          key={movie.id}
                          movie={movie}
                          onPlay={() => handlePosterClick(movie)}
                          progress={getProgress(movie)}
                          onRemove={cat.title === "Continue Watching" ? handleRemoveFromHistory : undefined}
                        />
                      )
                    ))}
                  </div>
                </div>
              )) : (
                !loading && (
                  <div style={{ padding: '100px', textAlign: 'center' }}>
                    <h2>Loading Movies...</h2>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
