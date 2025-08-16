/*
written by github.com/cool-dev-guy
modified and updated by github.com/theditor
*/

import { ContentType } from "stremio-addon-sdk";
import * as cheerio from "cheerio";
import { fetchAndParseHLS, ParsedHLSStream } from "./hls-utils";

let BASEDOM = "https://cloudnestra.com";
const SOURCE_URL = "https://vidsrc.xyz/embed";

// Array of realistic user agents to rotate through
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"
];

// Function to get sec-ch-ua based on user agent
function getSecChUa(userAgent: string): string {
  if (userAgent.includes('Chrome') && userAgent.includes('Edg')) {
    // Edge
    return '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128"';
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    // Chrome
    return '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"';
  } else if (userAgent.includes('Firefox')) {
    // Firefox doesn't send sec-ch-ua
    return '';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    // Safari doesn't send sec-ch-ua
    return '';
  }
  // Default to Chrome
  return '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"';
}

// Function to get sec-ch-ua-platform based on user agent
function getSecChUaPlatform(userAgent: string): string {
  if (userAgent.includes('Windows')) {
    return '"Windows"';
  } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
    return '"macOS"';
  } else if (userAgent.includes('Linux')) {
    return '"Linux"';
  }
  return '"Windows"'; // Default
}

// Function to get a random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Function to get headers with randomized user agent
function getRandomizedHeaders() {
  const userAgent = getRandomUserAgent();
  const secChUa = getSecChUa(userAgent);
  const secChUaPlatform = getSecChUaPlatform(userAgent);
  
  const headers: Record<string, string> = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "script",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "same-origin",
    'Sec-Fetch-Dest': 'iframe',
    "Referer": `${BASEDOM}/`,
    "Referrer-Policy": "origin",
    "User-Agent": userAgent,
  };

  // Only add sec-ch-ua headers for Chromium-based browsers
  if (secChUa) {
    headers["sec-ch-ua"] = secChUa;
    headers["sec-ch-ua-platform"] = secChUaPlatform;
  }

  return headers;
}

interface Servers {
  name: string | null;
  dataHash: string | null;
}
interface APIResponse {
  name: string | null;
  image: string | null;
  mediaId: string | null;
  stream: string | null;
  referer: string;
  hlsData?: ParsedHLSStream | null;
}
interface RCPResponse {
  metadata: {
    image: string;
  };
  data: string;
}
async function serversLoad(html: string): Promise<{ servers: Servers[]; title: string }> {
  const $ = cheerio.load(html);
  const servers: Servers[] = [];
  const title = $("title").text() ?? "";
  const base = $("iframe").attr("src") ?? "";
  BASEDOM = new URL(base.startsWith("//") ? "https:" + base : base).origin ?? BASEDOM;
  $(".serversList .server").each((index, element) => {
    const server = $(element);
    servers.push({
      name: server.text().trim(),
      dataHash: server.attr("data-hash") ?? null,
    });
  });
  return {
    servers: servers,
    title: title,
  };
}

async function PRORCPhandler(prorcp: string): Promise<string | null> {
  try {
    const prorcpFetch = await fetch(`${BASEDOM}/prorcp/${prorcp}`, {
      headers: {
        ...getRandomizedHeaders(),
      },
    });
    if (!prorcpFetch.ok) {
      return null;
    }
    const prorcpResponse = await prorcpFetch.text();
    const regex = /file:\s*'([^']*)'/gm;
    const match = regex.exec(prorcpResponse);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function rcpGrabber(html: string): Promise<RCPResponse | null> {
  const regex = /src:\s*'([^']*)'/;
  const match = html.match(regex);
  if (!match) return null;
  return {
    metadata: {
      image: "",
    },
    data: match[1],
  };
}

function getObject(id: string) {
  const arr = id.split(':');
  return {
    id: arr[0],
    season: arr[1],
    episode: arr[2]
  }
}

export function getUrl(id: string, type: ContentType) {
  if (type == "movie") {
    return `${SOURCE_URL}/movie/${id}`;
  } else {
    // fallback to series
    const obj = getObject(id);
    return `${SOURCE_URL}/tv/${obj.id}/${obj.season}-${obj.episode}`;
  }
}

async function getStreamContent(id: string, type: ContentType) {
  const url = getUrl(id, type);
  const embed = await fetch(url, {
    headers: {
      ...getRandomizedHeaders()
    }
  });
  const embedResp = await embed.text();

  // get some metadata
  const { servers, title } = await serversLoad(embedResp);

  const rcpFetchPromises = servers.map(element => {
    return fetch(`${BASEDOM}/rcp/${element.dataHash}`, {
      headers: {
        ...getRandomizedHeaders(),
        'Sec-Fetch-Dest': '',
      }
    });
  });
  const rcpResponses = await Promise.all(rcpFetchPromises);

  const prosrcrcp = await Promise.all(rcpResponses.map(async (response, i) => {
    return rcpGrabber(await response.text());
  }));

  const apiResponse: APIResponse[] = [];
  for (const item of prosrcrcp) {
    if (!item) continue;
    switch (item.data.substring(0, 8)) {
      case "/prorcp/":
        const streamUrl = await PRORCPhandler(item.data.replace("/prorcp/", ""));
        if (streamUrl) {
          // Check if this is an HLS master playlist
          const hlsData = await fetchAndParseHLS(streamUrl);
          
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
}
export { getStreamContent };
