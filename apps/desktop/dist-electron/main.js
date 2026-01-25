"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const webtorrent_1 = __importDefault(require("webtorrent"));
// import { getTrendingMovies } from './services/imdb';
// import { initScraper, getTrendingIMDb, searchIMDb, getMoviesByGenre, getLatestMovies, getYouTubeTrailer, getTop10ThisWeek, getMovieDetails } from './services/scraper';
const tmdb_1 = require("./services/tmdb");
const torrent_1 = require("./services/torrent");
// Spoof Chrome User Agent for YouTube
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
electron_1.app.userAgentFallback = CHROME_UA;
// Define the absolute path to the HTML file or URL
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = 'index.html';
const fs_1 = __importDefault(require("fs"));
let mainWindow = null;
const client = new webtorrent_1.default();
let currentMagnet = null;
function cleanup() {
    const tempPath = path_1.default.join(electron_1.app.getPath('temp'), 'streamhub');
    if (fs_1.default.existsSync(tempPath)) {
        try {
            fs_1.default.rmSync(tempPath, { recursive: true, force: true });
            console.log("Cleanup successful");
        }
        catch (e) {
            console.log("Cleanup failed:", e);
        }
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        title: 'Popcorn',
        icon: path_1.default.join(__dirname, '../public/icon.png'),
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path_1.default.join(__dirname, 'preload.js'),
            webviewTag: true,
            devTools: !electron_1.app.isPackaged
        },
        backgroundColor: '#000000',
        autoHideMenuBar: true,
    });
    mainWindow.setMenuBarVisibility(false);
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
        mainWindow.removeMenu();
    }
    mainWindow.setMenuBarVisibility(false);
    // Disable Developer Shortcuts in Production
    if (electron_1.app.isPackaged) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                event.preventDefault();
            }
            if (input.key === 'F12') {
                event.preventDefault();
            }
            if (input.control && input.shift && input.key.toLowerCase() === 'r') {
                event.preventDefault();
            }
        });
    }
    // Block all popups (Native AdBlock)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log("Blocked Popup:", url);
        return { action: 'deny' };
    });
}
// Initialize Scraper when app is ready - No longer needed for TMDB
// app.whenReady().then(() => {
//     initScraper();
// });
// IPC Handlers
electron_1.ipcMain.handle('open-external', async (_, url) => {
    return await electron_1.shell.openExternal(url);
});
electron_1.ipcMain.handle('get-trending', async () => {
    return await (0, tmdb_1.getTrendingTMDB)();
});
electron_1.ipcMain.handle('search-movies', async (event, query) => {
    return await (0, tmdb_1.searchTMDB)(query);
});
electron_1.ipcMain.handle('get-category', async (event, genre) => {
    return await (0, tmdb_1.getMoviesByGenre)(genre);
});
// ...
electron_1.ipcMain.handle('get-latest', async () => {
    return await (0, tmdb_1.getLatestTMDB)();
});
electron_1.ipcMain.handle('get-top-10', async () => {
    return await (0, tmdb_1.getPopularTMDB)();
});
electron_1.ipcMain.handle('get-movie-details', async (event, id, type) => {
    return await (0, tmdb_1.getMovieDetailsTMDB)(id, type);
});
electron_1.ipcMain.handle('get-trailer', async (event, id) => {
    return await (0, tmdb_1.getTrailerTMDB)(id);
});
electron_1.ipcMain.handle('get-magnet', async (event, title, year) => {
    return await (0, torrent_1.getBestMagnet)(title, year);
});
electron_1.ipcMain.handle('get-torrents', async (event, title, year) => {
    return await (0, torrent_1.getMovieTorrents)(title, year);
});
electron_1.ipcMain.handle('get-season-details', async (event, tvId, seasonNumber) => {
    return await (0, tmdb_1.getSeasonDetailsTMDB)(tvId, seasonNumber);
});
electron_1.ipcMain.handle('get-episode-torrents', async (event, title, season, episode) => {
    return await (0, torrent_1.getEpisodeTorrents)(title, season, episode);
});
electron_1.ipcMain.handle('start-stream', async (event, magnetLink) => {
    console.log('Received magnet link:', magnetLink);
    currentMagnet = magnetLink;
    return new Promise((resolve, reject) => {
        // Helper to add torrent
        const addTorrent = () => {
            const downloadPath = path_1.default.join(electron_1.app.getPath('temp'), 'streamhub');
            const trackers = [
                "udp://tracker.opentrackr.org:1337/announce",
                "udp://open.demonii.com:1337/announce",
                "udp://tracker.openbittorrent.com:80/announce",
                "udp://tracker.coppersurfer.tk:6969/announce",
                "udp://tracker.leechers-paradise.org:6969/announce",
                "udp://9.rarbg.to:2710/announce",
                "udp://9.rarbg.me:2710/announce",
                "udp://tracker.internetwarriors.net:1337/announce",
                "udp://tracker.cyberia.is:6969/announce",
                "udp://exodus.desync.com:6969/announce",
                "udp://open.stealth.si:80/announce",
                "udp://tracker.torrent.eu.org:451/announce",
                "udp://tracker.tiny-vps.com:6969/announce",
                "udp://tracker.moeking.me:6969/announce",
                "udp://opentracker.i2p.rocks:6969/announce",
                "udp://open.tracker.cl:1337/announce",
                "udp://explodie.org:6969/announce",
                "udp://ch3oh.ru:6969/announce",
                "wss://tracker.openwebtorrent.com",
                "wss://tracker.btorrent.xyz",
                "wss://tracker.webtorrent.io"
            ];
            const opts = {
                path: downloadPath,
                announce: trackers
            };
            client.add(magnetLink, opts, (torrent) => {
                console.log('Torrent added, looking for video file...');
                // Find the largest file (likely the movie)
                const file = torrent.files.find((f) => f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.avi'));
                let targetFile = file;
                if (!targetFile) {
                    // If no obvious video, pick largest
                    const largest = torrent.files.reduce((a, b) => a.length > b.length ? a : b);
                    console.log('Selected largest file:', largest.name);
                    targetFile = largest;
                }
                // Deselect all others to prioritize
                torrent.files.forEach((f) => f.deselect());
                targetFile.select();
                const server = torrent.createServer();
                server.listen(0, () => {
                    const port = server.address().port;
                    const url = `http://localhost:${port}/${torrent.files.indexOf(targetFile)}`;
                    console.log('Stream URL:', url);
                    resolve({ url, filename: targetFile.name });
                });
            });
        };
        // Clean up existing if any
        const existing = client.get(magnetLink);
        // Cast to unknown then boolean to avoid "always true" error if types are wrong
        if (existing) {
            console.log("Removing existing torrent to restart...");
            client.remove(magnetLink, (err) => {
                if (err)
                    console.error("Error removing:", err);
                addTorrent();
            });
        }
        else {
            addTorrent();
        }
    });
});
electron_1.ipcMain.handle('stop-stream', async () => {
    console.log("Stopping stream...");
    if (currentMagnet) {
        return new Promise((resolve) => {
            // destroyStore: true -> Deletes files from disk
            client.remove(currentMagnet, { destroyStore: true }, (err) => {
                if (err)
                    console.error("Error cleaning up torrent:", err);
                else
                    console.log("Torrent removed and files deleted.");
                currentMagnet = null;
                resolve(true);
            });
        });
    }
    return true;
});
// Watch History Handlers
const store_1 = require("./services/store");
electron_1.ipcMain.handle('get-watch-progress', async (event, tmdbId, season, episode) => {
    return store_1.historyStore.getProgress(tmdbId, season, episode);
});
electron_1.ipcMain.handle('update-watch-progress', async (event, tmdbId, progress, duration, season, episode, magnet) => {
    store_1.historyStore.updateProgress(tmdbId, progress, duration, season, episode, magnet);
});
electron_1.ipcMain.handle('get-watch-history', async () => {
    return store_1.historyStore.getHistory();
});
electron_1.ipcMain.handle('remove-watch-progress', async (event, tmdbId) => {
    store_1.historyStore.removeProgress(tmdbId);
});
// Favorites Handlers
electron_1.ipcMain.handle('add-favorite', async (event, movie) => {
    store_1.historyStore.addFavorite(movie);
});
electron_1.ipcMain.handle('remove-favorite', async (event, tmdbId) => {
    store_1.historyStore.removeFavorite(tmdbId);
});
electron_1.ipcMain.handle('get-favorites', async () => {
    return store_1.historyStore.getFavorites();
});
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    cleanup();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map