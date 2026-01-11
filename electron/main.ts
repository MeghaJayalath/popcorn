import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import WebTorrent from 'webtorrent';
// import { getTrendingMovies } from './services/imdb';
// import { initScraper, getTrendingIMDb, searchIMDb, getMoviesByGenre, getLatestMovies, getYouTubeTrailer, getTop10ThisWeek, getMovieDetails } from './services/scraper';
import {
    getTrendingTMDB,
    searchTMDB,
    getMoviesByGenre,
    getLatestTMDB,
    getTrailerTMDB,
    getPopularTMDB,
    getMovieDetailsTMDB,
    getSeasonDetailsTMDB
} from './services/tmdb';
import { getBestMagnet, getMovieTorrents, getEpisodeTorrents } from './services/torrent';

// Spoof Chrome User Agent for YouTube
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_UA;

// Define the absolute path to the HTML file or URL
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = 'index.html';

import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const client = new WebTorrent();
let currentMagnet: string | null = null;

function cleanup() {
    const tempPath = path.join(app.getPath('temp'), 'streamhub');
    if (fs.existsSync(tempPath)) {
        try {
            fs.rmSync(tempPath, { recursive: true, force: true });
            console.log("Cleanup successful");
        } catch (e) {
            console.log("Cleanup failed:", e);
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Popcorn',
        icon: path.join(__dirname, '../public/icon.png'),
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true,
            devTools: !app.isPackaged
        },
        backgroundColor: '#000000',
        autoHideMenuBar: true,
    });

    mainWindow.setMenuBarVisibility(false);

    // Fix YouTube Restriction/Error 150/153 in Production
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['*://*.youtube.com/*', '*://*.googlevideo.com/*'] },
        (details, callback) => {
            details.requestHeaders['Referer'] = 'https://www.youtube.com/';
            details.requestHeaders['Origin'] = 'https://www.youtube.com';
            details.requestHeaders['User-Agent'] = CHROME_UA;
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        }
    );

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        mainWindow.removeMenu();
    }

    mainWindow.setMenuBarVisibility(false);

    // Disable Developer Shortcuts in Production
    if (app.isPackaged) {
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
ipcMain.handle('get-trending', async () => {
    return await getTrendingTMDB();
});

ipcMain.handle('search-movies', async (event, query) => {
    return await searchTMDB(query);
});

ipcMain.handle('get-category', async (event, genre) => {
    return await getMoviesByGenre(genre);
});



// ...

ipcMain.handle('get-latest', async () => {
    return await getLatestTMDB();
});

ipcMain.handle('get-top-10', async () => {
    return await getPopularTMDB();
});



ipcMain.handle('get-movie-details', async (event, imdbId) => {
    return await getMovieDetailsTMDB(imdbId);
});

ipcMain.handle('get-trailer', async (event, id) => {
    return await getTrailerTMDB(id);
});

ipcMain.handle('get-magnet', async (event, title, year) => {
    return await getBestMagnet(title, year);
});

ipcMain.handle('get-torrents', async (event, title, year) => {
    return await getMovieTorrents(title, year);
});

ipcMain.handle('get-season-details', async (event, tvId, seasonNumber) => {
    return await getSeasonDetailsTMDB(tvId, seasonNumber);
});

ipcMain.handle('get-episode-torrents', async (event, title, season, episode) => {
    return await getEpisodeTorrents(title, season, episode);
});

ipcMain.handle('start-stream', async (event, magnetLink) => {
    console.log('Received magnet link:', magnetLink);
    currentMagnet = magnetLink;

    return new Promise((resolve, reject) => {

        // Helper to add torrent
        const addTorrent = () => {
            const downloadPath = path.join(app.getPath('temp'), 'streamhub');

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

            client.add(magnetLink, opts, (torrent: any) => {
                console.log('Torrent added, looking for video file...');

                // Find the largest file (likely the movie)
                const file = torrent.files.find((f: any) => f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.avi'));

                let targetFile = file;
                if (!targetFile) {
                    // If no obvious video, pick largest
                    const largest = torrent.files.reduce((a: any, b: any) => a.length > b.length ? a : b);
                    console.log('Selected largest file:', largest.name);
                    targetFile = largest;
                }

                // Deselect all others to prioritize
                torrent.files.forEach((f: any) => f.deselect());
                targetFile.select();

                const server = torrent.createServer();
                server.listen(0, () => {
                    const port = (server.address() as any).port;
                    const url = `http://localhost:${port}/${torrent.files.indexOf(targetFile)}`;
                    console.log('Stream URL:', url);
                    resolve({ url, filename: targetFile.name });
                });
            });
        };

        // Clean up existing if any
        const existing = client.get(magnetLink);
        // Cast to unknown then boolean to avoid "always true" error if types are wrong
        if (existing as unknown as boolean) {
            console.log("Removing existing torrent to restart...");
            (client as any).remove(magnetLink, (err: any) => {
                if (err) console.error("Error removing:", err);
                addTorrent();
            });
        } else {
            addTorrent();
        }
    });
});

ipcMain.handle('stop-stream', async () => {
    console.log("Stopping stream...");
    if (currentMagnet) {
        return new Promise((resolve) => {
            // destroyStore: true -> Deletes files from disk
            client.remove(currentMagnet!, { destroyStore: true }, (err) => {
                if (err) console.error("Error cleaning up torrent:", err);
                else console.log("Torrent removed and files deleted.");
                currentMagnet = null;
                resolve(true);
            });
        });
    }
    return true;
});

// Watch History Handlers
import { historyStore } from './services/store';

ipcMain.handle('get-watch-progress', async (event, tmdbId, season, episode) => {
    return historyStore.getProgress(tmdbId, season, episode);
});

ipcMain.handle('update-watch-progress', async (event, tmdbId, progress, duration, season, episode, magnet) => {
    historyStore.updateProgress(tmdbId, progress, duration, season, episode, magnet);
});

ipcMain.handle('get-watch-history', async () => {
    return historyStore.getHistory();
});

ipcMain.handle('remove-watch-progress', async (event, tmdbId) => {
    historyStore.removeProgress(tmdbId);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    cleanup();
    if ((process.platform as any) !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
