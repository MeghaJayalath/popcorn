"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOMDBRatings = getOMDBRatings;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
// --- Environment Variable Loading (Duplicated from tmdb.ts for now, or could move to shared) ---
let OMDB_API_KEY = process.env.OMDB_API_KEY || '';
if (!OMDB_API_KEY) {
    try {
        const envPath = path.join(electron_1.app.getAppPath(), '.env');
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
    }
    catch (e) {
        console.error("Failed to load .env manually for OMDB:", e);
    }
}
// Set a default key if none found - typically you'd want the user to provide this
// if (!OMDB_API_KEY) OMDB_API_KEY = "YOUR_FALLBACK_KEY"; 
const BASE_URL = 'http://www.omdbapi.com/';
async function getOMDBRatings(imdbId) {
    if (!imdbId || !OMDB_API_KEY)
        return {};
    try {
        const res = await axios_1.default.get(BASE_URL, {
            params: {
                apikey: OMDB_API_KEY,
                i: imdbId
            }
        });
        const data = res.data;
        if (data.Response === 'False') {
            return {};
        }
        const ratings = {
            imdb: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : undefined,
            metacritic: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : undefined
        };
        if (data.Ratings && Array.isArray(data.Ratings)) {
            const rt = data.Ratings.find((r) => r.Source === 'Rotten Tomatoes');
            if (rt) {
                ratings.rottenTomatoes = rt.Value;
            }
        }
        return ratings;
    }
    catch (e) {
        console.error("OMDB Fetch Error:", e);
        return {};
    }
}
//# sourceMappingURL=omdb.js.map