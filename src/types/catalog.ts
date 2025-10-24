// TMDB specific interfaces
interface Trailer {
  source: string;
  type: string;
}

interface TrailerStream {
  title: string;
  ytId: string;
}

interface Link {
  name: string;
  category: string;
  url: string;
}

interface BehaviorHints {
  defaultVideoId: string | null;
  hasScheduledVideos: boolean;
}

interface TmdbCast {
  name: string;
  character: string;
  photo: string | null;
}

interface TmdbVideo {
  id: string;
  name: string;
  season: number;
  number: number;
  episode: number;
  thumbnail: string;
  overview: string;
  description: string;
  rating: string;
  firstAired: string;
  released: string;
}

interface TmdbAppExtras {
  cast: TmdbCast[];
}

// Base meta interface with common properties
interface BaseMeta {
  id: string;
  imdb_id: string;
  name: string;
  description: string;
  poster: string;
  background: string;
  runtime: string;
  trailers: Trailer[];
  imdbRating: string;
  country: string;
  slug: string;
  behaviorHints: BehaviorHints;
  logo: string;
  genre: string[];
  director: string[];
  writer: string[];
  year: string;
  released: string;
  genres: string[];
  ageRating: string | null;
  releaseInfo: string;
  trailerStreams: TrailerStream[];
  links: Link[];
  app_extras: TmdbAppExtras;
}

// TMDB Movie Meta
interface TmdbMovieMeta extends BaseMeta {
  type: "movie";
}

// TMDB Series Meta
interface TmdbSeriesMeta extends BaseMeta {
  type: "tv";
  status: string;
  videos: TmdbVideo[];
}

// Union types
type TmdbMeta = TmdbMovieMeta | TmdbSeriesMeta;

// Main data interface
export interface MediaData {
  meta: TmdbMeta;
}

// Type guards
export function isTmdbMovie(meta: TmdbMeta): meta is TmdbMovieMeta {
  return meta.type === 'movie';
}

export function isTmdbSeries(meta: TmdbMeta): meta is TmdbSeriesMeta {
  return meta.type === 'tv';
}
