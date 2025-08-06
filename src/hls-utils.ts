import { Parser } from 'm3u8-parser';

export interface QualityStream {
  resolution?: string;
  bandwidth: number;
  codecs?: string;
  frameRate?: number;
  url: string;
  title: string;
}

export interface ParsedHLSStream {
  masterUrl: string;
  qualities: QualityStream[];
}

export function parseHLSMaster(masterPlaylistContent: string, baseUrl: string): ParsedHLSStream {
  const parser = new Parser();
  parser.push(masterPlaylistContent);
  parser.end();

  const manifest = parser.manifest;
  const qualities: QualityStream[] = [];

  if (manifest.playlists && manifest.playlists.length > 0) {
    // Sort by bandwidth (highest first for better quality ordering)
    const sortedPlaylists = manifest.playlists.sort((a: any, b: any) => {
      const bandwidthA = Number(a.attributes?.BANDWIDTH || 0);
      const bandwidthB = Number(b.attributes?.BANDWIDTH || 0);
      return bandwidthB - bandwidthA;
    });

    sortedPlaylists.forEach((playlist: any) => {
      const attributes = playlist.attributes;
      if (!attributes) return;

      const bandwidth = Number(attributes.BANDWIDTH || 0);
      const resolution = attributes.RESOLUTION ? 
        `${attributes.RESOLUTION.width}x${attributes.RESOLUTION.height}` : undefined;
      const codecs = attributes.CODECS as string | undefined;
      const frameRate = attributes['FRAME-RATE'] as number | undefined;

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
        } else if (height >= 720) {
          title = `${resolution} (720p)`;
        } else if (height >= 480) {
          title = `${resolution} (480p)`;
        } else if (height >= 360) {
          title = `${resolution} (360p)`;
        } else {
          title = `${resolution}`;
        }
      } else {
        // Fallback to bandwidth-based naming
        if (bandwidth > 5000000) {
          title = 'High Quality';
        } else if (bandwidth > 2000000) {
          title = 'Medium Quality';
        } else {
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

export async function fetchAndParseHLS(url: string): Promise<ParsedHLSStream | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const content = await response.text();
    
    // Check if this is a master playlist (contains #EXT-X-STREAM-INF)
    if (!content.includes('#EXT-X-STREAM-INF')) {
      return null;
    }

    return parseHLSMaster(content, url);
  } catch (error) {
    console.error('Failed to fetch and parse HLS:', error);
    return null;
  }
}
