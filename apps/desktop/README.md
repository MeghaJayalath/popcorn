# StreamHub

A Stremio-like desktop application with a Netflix-inspired UI, built with Electron, React, and WebTorrent.

## Prerequisites
- Node.js (v18 or higher recommended)
- Git

## Installation

```bash
cd p:\PERSONAL\IDEAS\streamhub
npm install
```

## Running in Development Mode

To start the application in development mode (with hot-reload for both Renderer and Main process):

```bash
npm run dev
```

This command runs:
1.  **Vite Dev Server** (Frontend) on port 5173.
2.  **Electron Main Process** (Backend) which loads the Vite URL.

## Building for Production

To build the executable (exe):

```bash
npm run build
```

The output will be in the `dist` directory.

## Troubleshooting

-   **Port 5173 in use**: The app requires port 5173 for the Vite server. If you see an error, ensure no other instance is running.
-   **Electron build errors**: Ensure you have C++ build tools installed if `webtorrent` native dependencies fail (though we are using a version that should be compatible).
