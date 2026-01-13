"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTorrent = searchTorrent;
exports.getBestMagnet = getBestMagnet;
exports.getMovieTorrents = getMovieTorrents;
exports.getEpisodeTorrents = getEpisodeTorrents;
const torrent_search_api_1 = __importDefault(require("torrent-search-api"));
// Enable public providers
torrent_search_api_1.default.enablePublicProviders();
// Helper to guess quality
function parseQuality(title) {
    const t = title.toLowerCase();
    if (t.includes('2160p') || t.includes('4k'))
        return '4K';
    if (t.includes('1080p'))
        return '1080p';
    if (t.includes('720p'))
        return '720p';
    if (t.includes('480p'))
        return '480p';
    if (t.includes('cam'))
        return 'CAM';
    return 'Unknown';
}
async function searchTorrent(query) {
    console.log(`Searching for: ${query}`);
    try {
        const magnets = await torrent_search_api_1.default.search(query, 'Video', 20); // Limit to 20
        return magnets.map((m) => ({
            title: m.title,
            size: m.size,
            magnet: m.magnet,
            seeds: m.seeds,
            quality: parseQuality(m.title)
        }));
    }
    catch (err) {
        console.error("Torrent search error:", err);
        return [];
    }
}
async function getBestMagnet(titlet, year) {
    const torrents = await getMovieTorrents(titlet, year);
    if (torrents.length > 0)
        return torrents[0].magnet;
    return null;
}
async function getMovieTorrents(title, year) {
    const query = `${title} ${year}`;
    const results = await searchTorrent(query);
    // Sort by seeds
    return results
        .filter((r) => r.magnet) // Ensure magnet link
        .filter((r) => {
        const t = r.title.toLowerCase();
        // Aggressive Bad Quality Filter
        // \b ensures we don't match "camera" inside "cameraman" (unlikely in movie titles but good practice)
        // But "cam" often appears as "HDCAM", so we need to be careful with word boundaries.
        // "TS" is dangerous (Taylor Swift?), so match " TS " or "HDTS".
        const badKeywords = [
            'cam', 'hdcam', 'camrip',
            'telesync', 'ts', 'hdts',
            'hardcoded', 'hc', // hardcoded subs usually implies early rip
            'screener', 'scr', 'dvdscr', 'dvdscreener',
            'korsub', 'hcsub',
            'workprint', 'wp'
        ];
        // Check for specific substrings that definitely mean bad quality
        const isBad = badKeywords.some(k => {
            // Check boundary or specific formatting
            if (t.includes(k)) {
                // Verify it's not a false positive like "Dreams" containing "ms" (not relevant here)
                // "TS" is short, check spaces.
                if (k === 'ts')
                    return /\bts\b/.test(t) || t.includes('hdts');
                if (k === 'cam')
                    return /\bcam\b/.test(t) || t.includes('hdcam') || t.includes('webcam');
                return true;
            }
            return false;
        });
        if (isBad) {
            console.log(`[Filter] Dropped partial/CAM torrent: ${r.title}`);
        }
        return !isBad;
    })
        .sort((a, b) => b.seeds - a.seeds);
}
async function getEpisodeTorrents(title, season, episode) {
    const s = season.toString().padStart(2, '0');
    const e = episode.toString().padStart(2, '0');
    const query = `${title} S${s}E${e}`;
    const results = await searchTorrent(query);
    return results
        .filter((r) => r.magnet)
        .sort((a, b) => b.seeds - a.seeds);
}
//# sourceMappingURL=torrent.js.map