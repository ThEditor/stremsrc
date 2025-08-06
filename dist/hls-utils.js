"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHLSMaster = parseHLSMaster;
exports.fetchAndParseHLS = fetchAndParseHLS;
const m3u8_parser_1 = require("m3u8-parser");
function parseHLSMaster(masterPlaylistContent, baseUrl) {
    const parser = new m3u8_parser_1.Parser();
    parser.push(masterPlaylistContent);
    parser.end();
    const manifest = parser.manifest;
    const qualities = [];
    if (manifest.playlists && manifest.playlists.length > 0) {
        // Sort by bandwidth (highest first for better quality ordering)
        const sortedPlaylists = manifest.playlists.sort((a, b) => {
            var _a, _b;
            const bandwidthA = Number(((_a = a.attributes) === null || _a === void 0 ? void 0 : _a.BANDWIDTH) || 0);
            const bandwidthB = Number(((_b = b.attributes) === null || _b === void 0 ? void 0 : _b.BANDWIDTH) || 0);
            return bandwidthB - bandwidthA;
        });
        sortedPlaylists.forEach((playlist) => {
            const attributes = playlist.attributes;
            if (!attributes)
                return;
            const bandwidth = Number(attributes.BANDWIDTH || 0);
            const resolution = attributes.RESOLUTION ?
                `${attributes.RESOLUTION.width}x${attributes.RESOLUTION.height}` : undefined;
            const codecs = attributes.CODECS;
            const frameRate = attributes['FRAME-RATE'];
            // Construct the full URL
            const playlistUrl = playlist.uri.startsWith('http')
                ? playlist.uri
                : new URL(playlist.uri, baseUrl).toString();
            // Create a readable title
            let title = 'Unknown Quality';
            if (resolution && attributes.RESOLUTION) {
                const height = Number(attributes.RESOLUTION.height);
                if (height >= 1080) {
                    title = `${resolution} (1080p)`;
                }
                else if (height >= 720) {
                    title = `${resolution} (720p)`;
                }
                else if (height >= 480) {
                    title = `${resolution} (480p)`;
                }
                else if (height >= 360) {
                    title = `${resolution} (360p)`;
                }
                else {
                    title = `${resolution}`;
                }
            }
            else {
                // Fallback to bandwidth-based naming
                if (bandwidth > 5000000) {
                    title = 'High Quality';
                }
                else if (bandwidth > 2000000) {
                    title = 'Medium Quality';
                }
                else {
                    title = 'Low Quality';
                }
            }
            qualities.push({
                resolution,
                bandwidth,
                codecs,
                frameRate,
                url: playlistUrl,
                title
            });
        });
    }
    return {
        masterUrl: baseUrl,
        qualities
    };
}
function fetchAndParseHLS(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(url);
            if (!response.ok) {
                return null;
            }
            const content = yield response.text();
            // Check if this is a master playlist (contains #EXT-X-STREAM-INF)
            if (!content.includes('#EXT-X-STREAM-INF')) {
                return null;
            }
            return parseHLSMaster(content, url);
        }
        catch (error) {
            console.error('Failed to fetch and parse HLS:', error);
            return null;
        }
    });
}
