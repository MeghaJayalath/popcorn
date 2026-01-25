"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyStore = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class HistoryStore {
    constructor() {
        this.path = path_1.default.join(electron_1.app.getPath('userData'), 'watch-history.json');
        this.data = this.load();
    }
    load() {
        try {
            if (fs_1.default.existsSync(this.path)) {
                return JSON.parse(fs_1.default.readFileSync(this.path, 'utf-8'));
            }
        }
        catch (e) {
            console.error("Failed to load history:", e);
        }
        return { movies: {}, shows: {}, favorites: {} };
    }
    save() {
        try {
            fs_1.default.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
        }
        catch (e) {
            console.error("Failed to save history:", e);
        }
    }
    getProgress(tmdbId, season, episode) {
        if (season !== undefined && episode !== undefined) {
            const show = this.data.shows[tmdbId];
            if (!show)
                return null;
            const key = `s${season}e${episode}`;
            return show[key] || null;
        }
        else {
            return this.data.movies[tmdbId] || null;
        }
    }
    updateProgress(tmdbId, progress, duration, season, episode, magnet) {
        const entry = {
            progress,
            duration,
            lastWatched: Date.now(),
            magnet // Added magnet to the entry
        };
        if (season !== undefined && episode !== undefined) {
            if (!this.data.shows[tmdbId])
                this.data.shows[tmdbId] = {};
            const key = `s${season}e${episode}`;
            this.data.shows[tmdbId][key] = entry;
        }
        else {
            this.data.movies[tmdbId] = entry;
        }
        this.save();
    }
    getHistory() {
        return this.data;
    }
    removeProgress(tmdbId) {
        if (this.data.movies[tmdbId]) {
            delete this.data.movies[tmdbId];
        }
        if (this.data.shows[tmdbId]) {
            delete this.data.shows[tmdbId];
        }
        this.save();
    }
    // Favorites Logic
    addFavorite(movie) {
        if (!this.data.favorites)
            this.data.favorites = {};
        this.data.favorites[movie.id.toString()] = movie;
        this.save();
    }
    removeFavorite(tmdbId) {
        if (this.data.favorites && this.data.favorites[tmdbId]) {
            delete this.data.favorites[tmdbId];
            this.save();
        }
    }
    getFavorites() {
        return this.data.favorites || {};
    }
}
exports.historyStore = new HistoryStore();
//# sourceMappingURL=store.js.map