"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    startStream: (magnetLink) => electron_1.ipcRenderer.invoke('start-stream', magnetLink),
    stopStream: () => electron_1.ipcRenderer.invoke('stop-stream'),
    getTrending: () => electron_1.ipcRenderer.invoke('get-trending'),
    getLatest: () => electron_1.ipcRenderer.invoke('get-latest'),
    getTop10: () => electron_1.ipcRenderer.invoke('get-top-10'),
    getTrailer: (id) => electron_1.ipcRenderer.invoke('get-trailer', id),
    searchMovies: (query) => electron_1.ipcRenderer.invoke('search-movies', query),
    getCategory: (genre) => electron_1.ipcRenderer.invoke('get-category', genre),
    getTorrents: (title, year) => electron_1.ipcRenderer.invoke('get-torrents', title, year),
    getMagnet: (title, year) => electron_1.ipcRenderer.invoke('get-magnet', title, year),
    getMovieDetails: (id, type) => electron_1.ipcRenderer.invoke('get-movie-details', id, type),
    getSeasonDetails: (tvId, seasonNumber) => electron_1.ipcRenderer.invoke('get-season-details', tvId, seasonNumber),
    getEpisodeTorrents: (title, season, episode) => electron_1.ipcRenderer.invoke('get-episode-torrents', title, season, episode),
    getWatchProgress: (tmdbId, season, episode) => electron_1.ipcRenderer.invoke('get-watch-progress', tmdbId, season, episode),
    updateWatchProgress: (tmdbId, progress, duration, season, episode, magnet) => electron_1.ipcRenderer.invoke('update-watch-progress', tmdbId, progress, duration, season, episode, magnet),
    removeWatchProgress: (tmdbId) => electron_1.ipcRenderer.invoke('remove-watch-progress', tmdbId),
    getWatchHistory: () => electron_1.ipcRenderer.invoke('get-watch-history'),
    addFavorite: (movie) => electron_1.ipcRenderer.invoke('add-favorite', movie),
    removeFavorite: (tmdbId) => electron_1.ipcRenderer.invoke('remove-favorite', tmdbId),
    getFavorites: () => electron_1.ipcRenderer.invoke('get-favorites'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url)
});
//# sourceMappingURL=preload.js.map