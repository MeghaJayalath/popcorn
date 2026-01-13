import axios from 'axios';
import * as cheerio from 'cheerio';

const IMDB_BASE_URL = 'https://www.imdb.com';

export interface ScrapedMovie {
    id: string;
    title: string;
    year: number;
    image: string;
    rating: string;
}

export async function getTrendingMovies(): Promise<ScrapedMovie[]> {
    try {
        // Using a more layout-agnostic approach if possible, but IMDb is tough.
        // Targeting "Most Popular Movies" page.
        const { data } = await axios.get(`${IMDB_BASE_URL}/chart/moviemeter/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const movies: ScrapedMovie[] = [];

        // IMDb's new list structure (usually in __NEXT_DATA__ JSON blob, but let's try scraping DOM first)
        // Actually, scraping the JSON blob is much more reliable.
        const jsonBlob = $('#__NEXT_DATA__').html();

        if (jsonBlob) {
            const jsonData = JSON.parse(jsonBlob);
            // Navigate deeply to find the list. The path changes often.
            // Usually: props.pageProps.pageData.chartTitles.edges
            // Or similar.

            // Let's try to find the edges generically
            const findEdges = (obj: any): any[] => {
                if (!obj) return [];
                if (obj.edges && Array.isArray(obj.edges)) return obj.edges;
                // recursive search? too risky for performance.
                // Let's try known paths.
                return obj?.props?.pageProps?.pageData?.chartTitles?.edges || [];
            };

            const edges = findEdges(jsonData);

            edges.forEach((edge: any) => {
                const node = edge.node;
                if (!node) return;

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
            if (i >= 20) return;
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

    } catch (err) {
        console.error("Error scraping IMDb:", err);
        return [];
    }
}
