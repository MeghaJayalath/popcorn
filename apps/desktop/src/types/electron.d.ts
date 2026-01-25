export interface ElectronAPI {
    startStream: (magnetLink: string) => Promise<{ url: string; filename: string }>;
    stopStream: () => Promise<boolean>;
    getTrending: () => Promise<any[]>;
    getLatest: () => Promise<any[]>;
    getTop10: () => Promise<any[]>;
    getTrailer: (id: string) => Promise<string | null>;
    searchMovies: (query: string) => Promise<any[]>;
    getCategory: (genre: string) => Promise<any[]>;
    getTorrents: (title: string, year: number) => Promise<any[]>;
    getMagnet: (title: string, year: number) => Promise<string | null>;
    getMovieDetails: (id: string, type?: string) => Promise<any>;
    getSeasonDetails: (tvId: string, seasonNumber: number) => Promise<any>;
    getEpisodeTorrents: (title: string, season: number, episode: number) => Promise<any[]>;
    getWatchProgress: (tmdbId: string, season?: number, episode?: number) => Promise<{ progress: number; duration: number; lastWatched: number } | null>;
    updateWatchProgress: (tmdbId: string, progress: number, duration: number, season?: number, episode?: number, magnet?: string) => Promise<void>;
    removeWatchProgress: (tmdbId: string) => Promise<void>;
    getWatchHistory: () => Promise<any>;
    addFavorite: (movie: any) => Promise<void>;
    removeFavorite: (tmdbId: string) => Promise<void>;
    getFavorites: () => Promise<any>;
    openExternal: (url: string) => Promise<void>;
}


declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
