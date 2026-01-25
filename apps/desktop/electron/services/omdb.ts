import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// --- Environment Variable Loading (Duplicated from tmdb.ts for now, or could move to shared) ---
let OMDB_API_KEY = process.env.OMDB_API_KEY || '';

if (!OMDB_API_KEY) {
    try {
        const envPath = path.join(app.getAppPath(), '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
            for (const line of lines) {
                const [key, val] = line.split('=');
                if (key && (key.trim() === 'OMDB_API_KEY' || key.trim() === 'VITE_OMDB_API_KEY')) {
                    OMDB_API_KEY = val ? val.trim() : '';
                    break;
                }
            }
        }
    } catch (e) {
        console.error("Failed to load .env manually for OMDB:", e);
    }
}

// Set a default key if none found - typically you'd want the user to provide this
// if (!OMDB_API_KEY) OMDB_API_KEY = "YOUR_FALLBACK_KEY"; 

const BASE_URL = 'http://www.omdbapi.com/';

export interface OmdbRatings {
    imdb?: string;
    rottenTomatoes?: string;
    metacritic?: string;
}

export async function getOMDBRatings(imdbId: string): Promise<OmdbRatings> {
    if (!imdbId || !OMDB_API_KEY) return {};

    try {
        const res = await axios.get(BASE_URL, {
            params: {
                apikey: OMDB_API_KEY,
                i: imdbId
            }
        });

        const data = res.data;
        if (data.Response === 'False') {
            return {};
        }

        const ratings: OmdbRatings = {
            imdb: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : undefined,
            metacritic: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : undefined
        };

        if (data.Ratings && Array.isArray(data.Ratings)) {
            const rt = data.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
            if (rt) {
                ratings.rottenTomatoes = rt.Value;
            }
        }

        return ratings;
    } catch (e) {
        console.error("OMDB Fetch Error:", e);
        return {};
    }
}
