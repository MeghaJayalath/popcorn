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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScraper = initScraper;
exports.searchIMDb = searchIMDb;
exports.getMoviesByGenre = getMoviesByGenre;
exports.getLatestMovies = getLatestMovies;
exports.getYouTubeTrailer = getYouTubeTrailer;
exports.getTrendingIMDb = getTrendingIMDb;
exports.getTop10ThisWeek = getTop10ThisWeek;
exports.getMovieDetails = getMovieDetails;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let scraperWindow = null;
let CACHE_FILE = '';
// Minimal In-Memory Cache for fast repeated access in same session
let memCache = {};
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 Hours
// Lazy init cache path
function getCachePath() {
    if (!CACHE_FILE) {
        try {
            CACHE_FILE = path.join(electron_1.app.getPath('userData'), 'content_cache.json');
        }
        catch (e) {
            console.error("Could not get userData path:", e);
            // Fallback to temp if userData fails (rare)
            CACHE_FILE = path.join(electron_1.app.getPath('temp'), 'streamhub_cache.json');
        }
    }
    return CACHE_FILE;
}
function getCached(key) {
    const cachePath = getCachePath();
    if (!cachePath)
        return null;
    // 1. Check Memory
    if (memCache[key] && (Date.now() - memCache[key].timestamp < CACHE_TTL)) {
        return memCache[key].data;
    }
    // 2. Check Disk
    try {
        if (fs.existsSync(cachePath)) {
            const raw = fs.readFileSync(cachePath, 'utf-8');
            const fileCache = JSON.parse(raw);
            if (fileCache[key] && (Date.now() - fileCache[key].timestamp < CACHE_TTL)) {
                // Populate mem cache
                memCache[key] = fileCache[key];
                return fileCache[key].data;
            }
        }
    }
    catch (e) {
        console.error("Cache read error:", e);
    }
    return null;
}
function setCached(key, data) {
    const cachePath = getCachePath();
    if (!cachePath)
        return;
    const entry = { timestamp: Date.now(), data };
    memCache[key] = entry;
    // Persist to Disk
    try {
        let fileCache = {};
        if (fs.existsSync(cachePath)) {
            try {
                fileCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
            }
            catch { }
        }
        fileCache[key] = entry;
        fs.writeFileSync(cachePath, JSON.stringify(fileCache));
    }
    catch (e) {
        console.error("Cache write error:", e);
    }
}
const requestQueue = [];
let isProcessing = false;
function initScraper() {
    scraperWindow = new electron_1.BrowserWindow({
        show: false, // Hidden
        width: 1024, // Wider for better loading
        height: 768,
        webPreferences: {
            offscreen: true,
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'scraper_mem' // In-memory only, avoids disk cache locks
        }
    });
    // Keep it alive
    scraperWindow.on('closed', () => {
        scraperWindow = null;
    });
}
async function processQueue() {
    if (isProcessing || requestQueue.length === 0)
        return;
    if (!scraperWindow) {
        initScraper();
    }
    isProcessing = true;
    const req = requestQueue.shift();
    console.log(`Processing scraper request: ${req.url}`);
    // Safety timeout
    const timeout = setTimeout(() => {
        if (isProcessing) {
            console.error("Scraper timed out");
            // checking if req is still pending? 
        }
    }, 25000);
    try {
        // Ensure clean state
        try {
            await scraperWindow.loadURL('about:blank');
        }
        catch (e) { /* ignore */ }
        try {
            await scraperWindow.loadURL(req.url, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
        }
        catch (e) {
            // ERR_ABORTED (-3) happens on redirects (e.g. YouTube consent/theme refresh)
            // We ignore it and assume the redirect target will load.
            if (e.code === 'ERR_ABORTED' || e.errno === -3) {
                console.log(`[Scraper] Navigation aborted/redirected for ${req.url} - continuing...`);
            }
            else {
                throw e;
            }
        }
        // Wait a bit for dynamic content (YouTube)
        if (req.url.includes('youtube')) {
            await new Promise(r => setTimeout(r, 2500));
        }
        const result = await scraperWindow.webContents.executeJavaScript(req.script);
        // Debug logging
        if (Array.isArray(result)) {
            console.log(`Scraped ${result.length} items from ${req.url}`);
            if (result.length > 0)
                console.log(`Sample: ${JSON.stringify(result[0])}`);
        }
        else {
            console.log(`Scraper result from ${req.url}:`, typeof result === 'string' ? result.substring(0, 50) : result);
        }
        req.resolve(result);
    }
    catch (err) {
        console.error("Scraper failed:", err);
        req.reject(err);
    }
    finally {
        clearTimeout(timeout);
        isProcessing = false;
        setTimeout(processQueue, 500);
    }
}
function enqueueRequest(url, script) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ url, script, resolve, reject });
        processQueue();
    });
}
const GENERIC_EXTRACTOR_SCRIPT = `
    (function() {
        try {
            const results = [];
            const upgradeImg = (url) => {
                if (!url) return '';
                // Replace specific crop/size params with a high-quality width (UX600 is good for posters)
                // Default often has _V1_... .jpg
                // We want to keep _V1_ but change the rest.
                return url.replace(/_V1_.*\\.jpg$/, "_V1_FMjpg_UX600_.jpg");
            };

            const items = document.querySelectorAll('.ipc-metadata-list-summary-item');
            items.forEach(item => {
                // Title Strategy: 1. Class 2. Link Text 3. Image Alt
                let titleEl = item.querySelector('.ipc-title__text') 
                           || item.querySelector('.ipc-metadata-list-summary-item__t');
                
                let title = titleEl ? titleEl.textContent : '';
                
                if (!title || title.trim() === '') {
                     const img = item.querySelector('img');
                     if (img) title = img.alt;
                }
                
                // Clean title
                title = title ? title.trim().replace(/^\\d+\\.\\s+/, '') : '';

                const link = item.querySelector('a.ipc-metadata-list-summary-item__t, a.ipc-title-link-wrapper')?.getAttribute('href');
                const idMatch = link?.match(/tt\\d+/);
                const img = item.querySelector('img')?.src;
                
                const metadataItems = item.querySelectorAll('.ipc-metadata-list-summary-item__li, .cli-title-metadata-item');
                let year = "0";
                metadataItems.forEach(m => {
                    const txt = m.textContent || "";
                    const match = txt.match(/\b(\d{4})\b/);
                    if (match) year = match[1];
                });

                // Extract Rating & Votes
                let rating = 'N/A';
                let voteCount = 0;
                const ratingEl = item.querySelector('.ipc-rating-star');
                if (ratingEl) {
                    const text = ratingEl.textContent; // "7.5 (25K)"
                    // Debug
                    // console.log("Rating Text:", text);
                    
                    const match = text.match(/^(\\d+(\\.\\d+)?)/);
                    if (match) rating = match[1];
                    
                    // Vote count regex was failing?
                    // text might be "7.5 (25K)" or "7.5" or just "(25K)"
                    const voteMatch = text.match(/\\(([^)]+)\\)/); // extract inside parens "25K"
                    if (voteMatch) {
                        let v = voteMatch[1].toUpperCase();
                        // Filter out non-vote text if any
                        // Sometimes it says "(Rate)"
                        if (/\d/.test(v)) { 
                            let mult = 1;
                            if (v.includes('K')) { mult = 1000; v = v.replace('K',''); }
                            else if (v.includes('M')) { mult = 1000000; v = v.replace('M',''); }
                            
                            // remove any non-numeric chars left like spaces or commas
                            v = v.replace(/[^\d.]/g, '');
                            
                            const parsed = parseFloat(v);
                            if (!isNaN(parsed)) {
                                voteCount = parsed * mult;
                            }
                        }
                    }
                }
                
                // Fallback for rating: aria-label?
                if (rating === 'N/A') {
                     const aria = ratingEl?.getAttribute('aria-label');
                     if (aria) {
                         const match = aria.match(/Rating: ([\d.]+)/);
                         if (match) rating = match[1];
                     }
                }
                
                if (title && title.length > 1 && idMatch) {
                    results.push({
                        id: idMatch[0],
                        title: title,
                        image: upgradeImg(img),
                        year: parseInt(year) || 0,
                        rating: rating,
                        voteCount: voteCount
                    });
                }
            });
            return results;
        } catch(err) {
            return { error: err.toString() };
        }
    })()
`;
function searchIMDb(query) {
    const url = `https://www.imdb.com/find/?q=${encodeURIComponent(query)}&s=tt&ttype=ft&ref_=fn_ft`;
    return enqueueRequest(url, GENERIC_EXTRACTOR_SCRIPT);
}
function getMoviesByGenre(genre) {
    // Top 50 by genre (e.g. action, comedy)
    const url = `https://www.imdb.com/search/title/?genres=${genre.toLowerCase()}&sort=user_rating,desc&title_type=feature&num_votes=25000,`;
    return enqueueRequest(url, GENERIC_EXTRACTOR_SCRIPT);
}
async function getLatestMovies() {
    const cached = getCached('latest_mixed');
    if (cached) {
        console.log("[Cache] Serving Latest Movies from disk.");
        return cached;
    }
    // Latest Releases (2024-2025)
    // sort=release_date,desc ensures we get the newest
    // title_type=feature,tv_series,tv_miniseries ensures MOVIES + TV
    const url = 'https://www.imdb.com/search/title/?title_type=feature,tv_series,tv_miniseries&release_date=2024-01-01,&sort=release_date,desc&num_votes=500,';
    const res = await enqueueRequest(url, GENERIC_EXTRACTOR_SCRIPT);
    if (res && res.length > 0) {
        setCached('latest_mixed', res);
    }
    return res;
}
// ... trailer cache ...
const trailerCache = new Map();
async function getYouTubeTrailer(title, year) {
    const cacheKey = `${title}-${year}`;
    if (trailerCache.has(cacheKey)) {
        return trailerCache.get(cacheKey);
    }
    const query = encodeURIComponent(`${title} ${year} official trailer -concept -fan`);
    // 'sp=EgIQAQ%253D%253D' filters for VIDEO only (no channels/playlists)
    const url = `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`;
    const script = `
        (async function() {
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            try {
                // Attempt to handle Consent Popup
                const buttons = Array.from(document.querySelectorAll('button'));
                const acceptBtn = buttons.find(b => {
                    const text = (b.textContent || '').toLowerCase();
                    return text.includes('accept all') || text.includes('i agree') || text.includes('reject all');
                });
                if (acceptBtn) { acceptBtn.click(); await wait(800); }

                // Wait for results
                let videoRenderers = document.querySelectorAll('ytd-video-renderer');
                if (videoRenderers.length === 0) {
                    await wait(1000);
                    videoRenderers = document.querySelectorAll('ytd-video-renderer');
                }

                // Known Fake/Concept Trailer Channels
                const channelBlocklist = [
                    'screen culture', 'teaser pro', 'kh studio', 'foxstar media', 
                    'darth trailer', 'concept trailer', 'fan made', 'stryder hd', 
                    'rob long', 'sluurp'
                ];

                // Official Studio Channels to Prioritize (MUST BE LOWERCASE)
                const officialChannels = [
                    'walt disney', 'warner bros', 'universal pictures', 'sony pictures', 
                    'paramount pictures', 'studiocanal', 'toho', 'cj entertainment', 
                    'yash raj films', 'dharma productions', 'a24', 'lionsgate', 
                    'neon', 'netflix', 'prime video', 'hbo max', 'apple tv', 'disney', 'hulu', 'amazon prime', 'ign'
                ];

                const candidates = [];

                // Iterate and collect valid candidates
                for (let renderer of videoRenderers) {
                    const link = renderer.querySelector('a#video-title');
                    if (!link) continue;

                    const titleText = (link.getAttribute('title') || link.textContent || '').toLowerCase();
                    const href = link.getAttribute('href');
                    
                    // 1. Title Filter: Reject obvious fan-made content
                    if (titleText.includes('concept') || titleText.includes('fan made') || titleText.includes('fan-made')) {
                        continue;
                    }

                    // 2. Channel Filter: Reject known fake channels
                    let channelName = '';
                    const channelElem = renderer.querySelector('#channel-info #text-container') || 
                                        renderer.querySelector('.ytd-channel-name a') ||
                                        renderer.querySelector('.ytd-channel-name');
                    
                    if (channelElem) {
                        channelName = (channelElem.textContent || '').trim().toLowerCase();
                    }

                    if (channelBlocklist.some(bad => channelName.includes(bad))) {
                        console.log('Skipping blocked channel:', channelName);
                        continue; // Skip fake channels
                    }

                    if (href && href.includes('/watch?v=')) {
                        const match = href.match(/v=([^&]+)/);
                        if (match && match[1]) {
                             candidates.push({ id: match[1], channel: channelName });
                        }
                    }
                }
                
                console.log('Found candidates:', JSON.stringify(candidates));

                // 3. Selection Logic
                // Priority A: Match Official Channel
                const officialMatch = candidates.find(c => officialChannels.some(oc => c.channel.includes(oc)));
                if (officialMatch) {
                    console.log('Selected Official Match:', officialMatch.channel);
                    return officialMatch.id;
                }

                // Priority B: First valid result
                if (candidates.length > 0) {
                     console.log('Selected Best Fallback:', candidates[0].channel);
                     return candidates[0].id;
                }
                
                return null;
            } catch (e) { return null; }
        })()
    `;
    const result = await enqueueRequest(url, script);
    if (result) {
        trailerCache.set(cacheKey, result);
    }
    return result;
}
async function getTrendingIMDb() {
    const cached = getCached('trending_mixed');
    if (cached) {
        console.log("[Cache] Serving Trending from disk.");
        return cached;
    }
    // Trending Now (Popularity)
    // Movies + TV Series
    const url = 'https://www.imdb.com/search/title/?title_type=feature,tv_series,tv_miniseries&sort=moviemeter,asc&num_votes=15000,';
    const res = await enqueueRequest(url, GENERIC_EXTRACTOR_SCRIPT);
    if (Array.isArray(res) && res.length > 0) {
        setCached('trending_mixed', res);
    }
    return res;
}
async function getTop10ThisWeek() {
    const cached = getCached('favorites_mixed');
    if (cached) {
        console.log("[Cache] Serving Favorites from disk.");
        return cached;
    }
    // Fan Favourites: Now "Top 10 on IMDb this week" (MovieMeter)
    // sort=moviemeter,asc gets the most popular right now
    // Movies + TV Series
    const url = 'https://www.imdb.com/search/title/?title_type=feature,tv_series,tv_miniseries&sort=moviemeter,asc&num_votes=1000,';
    const res = await enqueueRequest(url, GENERIC_EXTRACTOR_SCRIPT);
    // Limit to Top 10 as requested
    const top10 = (res && Array.isArray(res)) ? res.slice(0, 10) : [];
    if (top10.length > 0) {
        setCached('favorites_mixed', top10);
    }
    return top10;
}
async function getMovieDetails(imdbId) {
    const cacheKey = `details-${imdbId}`;
    const cached = getCached(cacheKey);
    if (cached)
        return cached;
    const url = `https://www.imdb.com/title/${imdbId}/`;
    // Detailed extraction script
    const script = `
        (function() {
            try {
                const getTxt = (sel) => {
                    const el = document.querySelector(sel);
                    return el ? el.textContent.trim() : null;
                };

                const getList = (sel, max = 5) => {
                    return Array.from(document.querySelectorAll(sel))
                        .slice(0, max)
                        .map(el => el.textContent.trim())
                        .filter(t => t.length > 0);
                };

                // Description
                // Try multiple selectors as IMDb changes A/B tests
                let items = {};
                
                items.description = getTxt('[data-testid="plot-xl"]') || 
                                    getTxt('[data-testid="plot-l"]') || 
                                    getTxt('.sc-eb51e184-0'); // fallback class

                // Genres
                items.genres = getList('[data-testid="genres"] a span', 4);
                if (items.genres.length === 0) items.genres = getList('[data-testid="genres"] a', 4);

                // Cast
                items.cast = getList('[data-testid="title-cast-item__actor"]', 5);

                // Runtime & Rating
                // Lists in the hero section: 2h 2m | PG-13 | ...
                const metaItems = Array.from(document.querySelectorAll('[data-testid="hero-title-block__metadata"] li'));
                
                // Usually ordering is Year, Rating, Runtime. But verify.
                metaItems.forEach(li => {
                    const txt = li.textContent;
                    if (txt.match(/\\d+h|\\d+m/)) items.runtime = txt;
                    else if (txt.match(/PG|R|G|TV-/)) items.mpaa = txt;
                });

                return items;
            } catch (e) {
                return { error: e.toString() };
            }
        })()
    `;
    const res = await enqueueRequest(url, script);
    if (res && !res.error) {
        setCached(cacheKey, res);
    }
    return res;
}
//# sourceMappingURL=scraper.js.map