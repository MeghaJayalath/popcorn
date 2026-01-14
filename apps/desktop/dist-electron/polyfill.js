"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
// Polyfill globals for dependencies that expect a browser-like environment
global.WebSocket = ws_1.default;
global.self = global;
//# sourceMappingURL=polyfill.js.map