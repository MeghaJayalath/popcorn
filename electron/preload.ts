import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    startStream: (magnetLink: string) => ipcRenderer.invoke('start-stream', magnetLink),
    stopStream: () => ipcRenderer.invoke('stop-stream'),
    getTrending: () => ipcRenderer.invoke('get-trending'),
    getLatest: () => ipcRenderer.invoke('get-latest'),
    getTop10: () => ipcRenderer.invoke('get-top-10'),
    getTrailer: (id: string) => ipcRenderer.invoke('get-trailer', id),
    searchMovies: (query: string) => ipcRenderer.invoke('search-movies', query),
    getCategory: (genre: string) => ipcRenderer.invoke('get-category', genre),
    getTorrents: (title: string, year: number) => ipcRenderer.invoke('get-torrents', title, year),
    getMagnet: (title: string, year: number) => ipcRenderer.invoke('get-magnet', title, year),
    getMovieDetails: (id: string) => ipcRenderer.invoke('get-movie-details', id),
    getSeasonDetails: (tvId: string, seasonNumber: number) => ipcRenderer.invoke('get-season-details', tvId, seasonNumber),
    getEpisodeTorrents: (title: string, season: number, episode: number) => ipcRenderer.invoke('get-episode-torrents', title, season, episode),
    getWatchProgress: (tmdbId: string, season?: number, episode?: number) => ipcRenderer.invoke('get-watch-progress', tmdbId, season, episode),
    updateWatchProgress: (tmdbId: string, progress: number, duration: number, season?: number, episode?: number, magnet?: string) => ipcRenderer.invoke('update-watch-progress', tmdbId, progress, duration, season, episode, magnet),
    removeWatchProgress: (tmdbId: string) => ipcRenderer.invoke('remove-watch-progress', tmdbId),
    getWatchHistory: () => ipcRenderer.invoke('get-watch-history')
});
