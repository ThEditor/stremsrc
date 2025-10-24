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
exports.getStreamContent = getStreamContent;
const providers_1 = require("@p-stream/providers");
const catalog_1 = require("./types/catalog");
const hls_utils_1 = require("./hls-utils");
const constants_1 = require("./constants");
const f = (0, providers_1.makeStandardFetcher)(fetch);
const p = (0, providers_1.makeProviders)({
    fetcher: f,
    target: providers_1.targets.ANY,
});
function getScrapeMedia(id, type) {
    return __awaiter(this, void 0, void 0, function* () {
        let args = id.split(":");
        if (args[0] === "tmdb")
            args = [`${args[0]}:${args[1]}`, args[2], args[3]];
        const url = `${constants_1.TMDB_META_URL}/${type}/${args[0]}.json`;
        const r = (yield (yield fetch(url))
            .json()
            .catch(() => null));
        if (!r)
            return null;
        if ((0, catalog_1.isTmdbMovie)(r.meta))
            return {
                type: "movie",
                title: r.meta.name,
                releaseYear: new Date(r.meta.released).getUTCFullYear(),
                tmdbId: r.meta.id.split(":")[1],
                imdbId: r.meta.imdb_id,
            };
        const vid = r.meta.videos.find((v) => v.id === `${r.meta.imdb_id}:${args[1]}:${args[2]}`);
        if (!vid)
            return null;
        return {
            type: "show",
            title: r.meta.name,
            episode: {
                number: vid.episode,
                tmdbId: vid.id,
            },
            releaseYear: new Date(r.meta.released).getUTCFullYear(),
            season: {
                number: vid.season,
                title: vid.name,
                tmdbId: vid.id,
            },
            tmdbId: r.meta.id.split(":")[1],
            imdbId: r.meta.imdb_id,
        };
    });
}
function getStreamContent(id, type) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const media = yield getScrapeMedia(id, type);
        if (!media)
            return [];
        const result = yield p.runAll({
            media,
        });
        if (!result)
            return [];
        // Convert RunOutput to Stream format expected by Stremio
        const streams = [];
        if (result.stream.type === "hls") {
            // First add the master playlist as "Auto Quality"
            streams.push({
                title: `${media.title} - ${result.sourceId} (Auto Quality)`,
                url: result.stream.playlist,
                behaviorHints: {
                    // @ts-ignore
                    proxyHeaders: {
                        request: Object.assign(Object.assign({}, result.stream.headers), result.stream.preferredHeaders),
                    },
                    notWebReady: true,
                },
            });
            // Try to parse HLS master playlist for individual qualities
            const hlsData = yield (0, hls_utils_1.fetchAndParseHLS)(result.stream.playlist);
            if (hlsData && hlsData.qualities.length > 0) {
                for (const quality of hlsData.qualities) {
                    streams.push({
                        title: `${media.title} - ${result.sourceId} (${quality.title})`,
                        url: quality.url,
                        behaviorHints: {
                            // @ts-ignore
                            proxyHeaders: {
                                request: Object.assign(Object.assign({}, result.stream.headers), result.stream.preferredHeaders),
                            },
                            notWebReady: true,
                        },
                    });
                }
            }
        }
        else if (result.stream.type === "file") {
            // Add streams for each available quality
            const qualities = result.stream.qualities;
            for (const q of Object.entries(qualities)) {
                const quality = q[1];
                if (quality === null || quality === void 0 ? void 0 : quality.url) {
                    const qualityLabel = q[0] === "unknown" ? "Unknown Quality" : `${q[0]}p`;
                    streams.push({
                        title: `${media.title} - ${result.sourceId} (${qualityLabel})`,
                        url: quality.url,
                        behaviorHints: {
                            // @ts-ignore
                            proxyHeaders: {
                                request: Object.assign(Object.assign({}, result.stream.headers), result.stream.preferredHeaders),
                            },
                            notWebReady: true,
                        },
                    });
                }
            }
        }
        // If no specific qualities were found, return the original stream as fallback
        if (streams.length === 0) {
            const fallbackUrl = result.stream.type === "hls"
                ? result.stream.playlist
                : ((_a = Object.values(result.stream.qualities || {})[0]) === null || _a === void 0 ? void 0 : _a.url) || "";
            if (fallbackUrl) {
                streams.push({
                    title: `${media.title} - ${result.sourceId}`,
                    url: fallbackUrl,
                    behaviorHints: {
                        // @ts-ignore
                        proxyHeaders: {
                            request: Object.assign(Object.assign({}, result.stream.headers), result.stream.preferredHeaders),
                        },
                        notWebReady: true,
                    },
                });
            }
        }
        return streams;
    });
}
