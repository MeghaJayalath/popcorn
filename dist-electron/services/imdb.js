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
exports.getTrendingMovies = getTrendingMovies;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const IMDB_BASE_URL = 'https://www.imdb.com';
async function getTrendingMovies() {
    try {
        // Using a more layout-agnostic approach if possible, but IMDb is tough.
        // Targeting "Most Popular Movies" page.
        const { data } = await axios_1.default.get(`${IMDB_BASE_URL}/chart/moviemeter/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const movies = [];
        // IMDb's new list structure (usually in __NEXT_DATA__ JSON blob, but let's try scraping DOM first)
        // Actually, scraping the JSON blob is much more reliable.
        const jsonBlob = $('#__NEXT_DATA__').html();
        if (jsonBlob) {
            const jsonData = JSON.parse(jsonBlob);
            // Navigate deeply to find the list. The path changes often.
            // Usually: props.pageProps.pageData.chartTitles.edges
            // Or similar.
            // Let's try to find the edges generically
            const findEdges = (obj) => {
                if (!obj)
                    return [];
                if (obj.edges && Array.isArray(obj.edges))
                    return obj.edges;
                // recursive search? too risky for performance.
                // Let's try known paths.
                return obj?.props?.pageProps?.pageData?.chartTitles?.edges || [];
            };
            const edges = findEdges(jsonData);
            edges.forEach((edge) => {
                const node = edge.node;
                if (!node)
                    return;
                movies.push({
                    id: node.id,
                    title: node.titleText?.text || 'Unknown Title',
                    year: node.releaseYear?.year || 0,
                    image: node.primaryImage?.url || '',
                    rating: node.ratingsSummary?.aggregateRating || 'N/A'
                });
            });
            return movies.slice(0, 20);
        }
        // Fallback to DOM scraping if JSON blob fails (Old layout)
        $('.ipc-metadata-list-summary-item').each((i, el) => {
            if (i >= 20)
                return;
            const titleElement = $(el).find('.ipc-title__text');
            const title = titleElement.text().replace(/^\d+\.\s+/, ''); // Remove sizing rank
            const image = $(el).find('img').attr('src') || '';
            const year = parseInt($(el).find('.cli-title-metadata-item').first().text()) || 0;
            const rating = $(el).find('.ipc-rating-star--base').text() || 'N/A';
            movies.push({
                id: `imdb-${i}`,
                title,
                year,
                image,
                rating
            });
        });
        return movies;
    }
    catch (err) {
        console.error("Error scraping IMDb:", err);
        return [];
    }
}
//# sourceMappingURL=imdb.js.map