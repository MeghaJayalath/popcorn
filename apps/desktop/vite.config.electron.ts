import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
    define: {
        // Fix "ReferenceError: self is not defined" for dependencies that expect browser-like env
        self: 'global',
    },
    build: {
        outDir: 'dist-electron',
        emptyOutDir: true,
        minify: false,
        commonjsOptions: {
            ignoreTryCatch: false,
            transformMixedEsModules: true,
        },
        lib: {
            entry: {
                main: 'electron/main.ts',
                preload: 'electron/preload.ts',
            },
            formats: ['cjs'],
        },
        target: 'node18',
        rollupOptions: {
            external: [
                'electron',
                'webtorrent',
                'torrent-search-api',
                'cheerio',
                'axios',
                'semver',
                ...builtinModules,
                ...builtinModules.map((m) => `node:${m}`),
            ],
            output: {
                entryFileNames: '[name].js',
            },
        },
    },
});
