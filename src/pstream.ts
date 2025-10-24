import {
  makeProviders,
  makeStandardFetcher,
  targets,
  ScrapeMedia
} from "@p-stream/providers";
import { ContentType, Stream } from "stremio-addon-sdk";
import { isTmdbMovie, MediaData } from "./types/catalog";
import { fetchAndParseHLS } from "./hls-utils";
import { TMDB_META_URL } from "./constants";

const f = makeStandardFetcher(fetch);

const p = makeProviders({
  fetcher: f,
  target: targets.ANY,
});

async function getScrapeMedia(id: string, type: ContentType): Promise<ScrapeMedia | null> {
  let args = id.split(':');
  if (args[0] === "tmdb")
    args = [`${args[0]}:${args[1]}`, args[2], args[3]];
  
  const url = `${TMDB_META_URL}/${type}/${args[0]}.json`;
  const r = await (await fetch(url)).json().catch(() => null) as MediaData | null;

  if (!r) return null;

  if (isTmdbMovie(r.meta))
    return {
      type: "movie",
      title: r.meta.name,
      releaseYear: (new Date(r.meta.released)).getUTCFullYear(),
      tmdbId: r.meta.id.split(':')[1],
      imdbId: r.meta.imdb_id,
    }

  const vid = r.meta.videos.find(v => v.id === `${r.meta.imdb_id}:${args[1]}:${args[2]}`);
  if (!vid) return null;

  return {
    type: "show",
    title: r.meta.name,
    episode: {
      number: vid.episode,
      tmdbId: vid.id
    },
    releaseYear: (new Date(r.meta.released)).getUTCFullYear(),
    season: {
      number: vid.season,
      title: vid.name,
      tmdbId: vid.id,
    },
    tmdbId: r.meta.id.split(':')[1],
    imdbId: r.meta.imdb_id,
  }
}

async function getStreamContent(id: string, type: ContentType): Promise<Stream[]> {
  const media = await getScrapeMedia(id, type);
  if (!media) return [];
  
  const result = await p.runAll({
    media,
  });
  
  if (!result) return [];
  
  // Convert RunOutput to Stream format expected by Stremio
  const streams: Stream[] = [];
  
  if (result.stream.type === 'hls') {
    // First add the master playlist as "Auto Quality"
    streams.push({
      title: `${media.title} - ${result.sourceId} (Auto Quality)`,
      url: result.stream.playlist,
      behaviorHints: { notWebReady: true },
    });

    // Try to parse HLS master playlist for individual qualities
    const hlsData = await fetchAndParseHLS(result.stream.playlist);
    if (hlsData && hlsData.qualities.length > 0) {
      for (const quality of hlsData.qualities) {
        streams.push({
          title: `${media.title} - ${result.sourceId} (${quality.title})`,
          url: quality.url,
          behaviorHints: { notWebReady: true },
        });
      }
    }
  } else if (result.stream.type === 'file') {
    // Add streams for each available quality
    const qualities = result.stream.qualities;
    
    for (const q of Object.entries(qualities)) {
      const quality = q[1];
      if (quality?.url) {
        const qualityLabel = q[0] === 'unknown' ? 'Unknown Quality' : `${q[0]}p`;
        streams.push({
          title: `${media.title} - ${result.sourceId} (${qualityLabel})`,
          url: quality.url,
          behaviorHints: { notWebReady: true },
        });
      }
    }
  }
  
  // If no specific qualities were found, return the original stream as fallback
  if (streams.length === 0) {
    const fallbackUrl = result.stream.type === 'hls' 
      ? result.stream.playlist 
      : Object.values(result.stream.qualities || {})[0]?.url || '';
    
    if (fallbackUrl) {
      streams.push({
        title: `${media.title} - ${result.sourceId}`,
        url: fallbackUrl,
        behaviorHints: { notWebReady: true },
      });
    }
  }
  
  return streams;
};

export { getStreamContent };
