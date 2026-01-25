import { app } from 'electron';
import path from 'path';
import fs from 'fs';

interface MediaProgress {
    progress: number; // Seconds
    duration: number; // Seconds
    lastWatched: number; // Timestamp
    magnet?: string;
}

interface HistoryStoreData {
    movies: Record<string, MediaProgress>; // Key: tmdbId
    shows: Record<string, Record<string, MediaProgress>>; // Key: tmdbId -> s{X}e{Y}
    favorites: Record<string, any>; // Key: tmdbId, Value: Movie Object
}

class HistoryStore {
    private path: string;
    private data: HistoryStoreData;

    constructor() {
        this.path = path.join(app.getPath('userData'), 'watch-history.json');
        this.data = this.load();
    }

    private load(): HistoryStoreData {
        try {
            if (fs.existsSync(this.path)) {
                return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
            }
        } catch (e) {
            console.error("Failed to load history:", e);
        }
        return { movies: {}, shows: {}, favorites: {} };
    }

    private save() {
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    }

    public getProgress(tmdbId: string, season?: number, episode?: number): MediaProgress | null {
        if (season !== undefined && episode !== undefined) {
            const show = this.data.shows[tmdbId];
            if (!show) return null;
            const key = `s${season}e${episode}`;
            return show[key] || null;
        } else {
            return this.data.movies[tmdbId] || null;
        }
    }

    public updateProgress(tmdbId: string, progress: number, duration: number, season?: number, episode?: number, magnet?: string) {
        const entry: MediaProgress = {
            progress,
            duration,
            lastWatched: Date.now(),
            magnet // Added magnet to the entry
        };

        if (season !== undefined && episode !== undefined) {
            if (!this.data.shows[tmdbId]) this.data.shows[tmdbId] = {};
            const key = `s${season}e${episode}`;
            this.data.shows[tmdbId][key] = entry;
        } else {
            this.data.movies[tmdbId] = entry;
        }
        this.save();
    }
    public getHistory() {
        return this.data;
    }
    public removeProgress(tmdbId: string) {
        if (this.data.movies[tmdbId]) {
            delete this.data.movies[tmdbId];
        }
        if (this.data.shows[tmdbId]) {
            delete this.data.shows[tmdbId];
        }
        this.save();
    }

    // Favorites Logic
    public addFavorite(movie: any) {
        if (!this.data.favorites) this.data.favorites = {};
        this.data.favorites[movie.id.toString()] = movie;
        this.save();
    }

    public removeFavorite(tmdbId: string) {
        if (this.data.favorites && this.data.favorites[tmdbId]) {
            delete this.data.favorites[tmdbId];
            this.save();
        }
    }

    public getFavorites() {
        return this.data.favorites || {};
    }
}

export const historyStore = new HistoryStore();
