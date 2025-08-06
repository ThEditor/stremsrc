"use strict";
/*
written by github.com/cool-dev-guy
modified and updated by github.com/theditor
*/
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
exports.getUrl = getUrl;
exports.getStreamContent = getStreamContent;
const cheerio = __importStar(require("cheerio"));
const hls_utils_1 = require("./hls-utils");
let BASEDOM = "https://cloudnestra.com";
const SOURCE_URL = "https://vidsrc.xyz/embed";
const BASE_HEADERS = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1",
    "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "script",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "same-origin",
    'Sec-Fetch-Dest': 'iframe',
    "Referer": `${BASEDOM}/`,
    "Referrer-Policy": "origin",
};
function serversLoad(html) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const $ = cheerio.load(html);
        const servers = [];
        const title = (_a = $("title").text()) !== null && _a !== void 0 ? _a : "";
        const base = (_b = $("iframe").attr("src")) !== null && _b !== void 0 ? _b : "";
        BASEDOM = (_c = new URL(base.startsWith("//") ? "https:" + base : base).origin) !== null && _c !== void 0 ? _c : BASEDOM;
        $(".serversList .server").each((index, element) => {
            var _a;
            const server = $(element);
            servers.push({
                name: server.text().trim(),
                dataHash: (_a = server.attr("data-hash")) !== null && _a !== void 0 ? _a : null,
            });
        });
        return {
            servers: servers,
            title: title,
        };
    });
}
function PRORCPhandler(prorcp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prorcpFetch = yield fetch(`${BASEDOM}/prorcp/${prorcp}`, {
                headers: Object.assign({}, BASE_HEADERS),
            });
            if (!prorcpFetch.ok) {
                return null;
            }
            const prorcpResponse = yield prorcpFetch.text();
            const regex = /file:\s*'([^']*)'/gm;
            const match = regex.exec(prorcpResponse);
            if (match && match[1]) {
                return match[1];
            }
            return null;
        }
        catch (error) {
            return null;
        }
    });
}
function rcpGrabber(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const regex = /src:\s*'([^']*)'/;
        const match = html.match(regex);
        if (!match)
            return null;
        return {
            metadata: {
                image: "",
            },
            data: match[1],
        };
    });
}
function getObject(id) {
    const arr = id.split(':');
    return {
        id: arr[0],
        season: arr[1],
        episode: arr[2]
    };
}
function getUrl(id, type) {
    if (type == "movie") {
        return `${SOURCE_URL}/movie/${id}`;
    }
    else {
        // fallback to series
        const obj = getObject(id);
        return `${SOURCE_URL}/tv/${obj.id}/${obj.season}-${obj.episode}`;
    }
}
function getStreamContent(id, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = getUrl(id, type);
        const embed = yield fetch(url, {
            headers: Object.assign({}, BASE_HEADERS)
        });
        const embedResp = yield embed.text();
        // get some metadata
        const { servers, title } = yield serversLoad(embedResp);
        const rcpFetchPromises = servers.map(element => {
            return fetch(`${BASEDOM}/rcp/${element.dataHash}`, {
                headers: Object.assign(Object.assign({}, BASE_HEADERS), { 'Sec-Fetch-Dest': '' })
            });
        });
        const rcpResponses = yield Promise.all(rcpFetchPromises);
        const prosrcrcp = yield Promise.all(rcpResponses.map((response, i) => __awaiter(this, void 0, void 0, function* () {
            return rcpGrabber(yield response.text());
        })));
        const apiResponse = [];
        for (const item of prosrcrcp) {
            if (!item)
                continue;
            switch (item.data.substring(0, 8)) {
                case "/prorcp/":
                    const streamUrl = yield PRORCPhandler(item.data.replace("/prorcp/", ""));
                    if (streamUrl) {
                        // Check if this is an HLS master playlist
                        const hlsData = yield (0, hls_utils_1.fetchAndParseHLS)(streamUrl);
                        apiResponse.push({
                            name: title,
                            image: item.metadata.image,
                            mediaId: id,
                            stream: streamUrl,
                            referer: BASEDOM,
                            hlsData: hlsData,
                        });
                    }
                    break;
            }
        }
        return apiResponse;
    });
}
