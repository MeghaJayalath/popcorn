import WebSocket from 'ws';

// Polyfill globals for dependencies that expect a browser-like environment
global.WebSocket = WebSocket as any;
global.self = global as any;
