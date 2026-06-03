import { info } from '@tauri-apps/plugin-log';
import type { VideoItem } from '../types';

export function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function uniqueBy<T>(arr: T[], keyFn: (item: T) => string | null | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of arr) {
    const key = keyFn(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }

  return out;
}

export function extractVideoIdFromLine(line: string): string | null {
  const text = line.trim();
  if (!text) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{8,}$/.test(text) && !text.includes('http')) {
    return text;
  }

  const watchMatch = text.match(/[?&]v=([a-zA-Z0-9_-]{8,})/);
  if (watchMatch) {
    return watchMatch[1];
  }

  const shortMatch = text.match(/youtu\.be\/([a-zA-Z0-9_-]{8,})/);
  if (shortMatch) {
    return shortMatch[1];
  }

  const embedMatch = text.match(/\/embed\/([a-zA-Z0-9_-]{8,})/);
  if (embedMatch) {
    return embedMatch[1];
  }

  return null;
}

export function sanitizeTitleForTextFile(title: string): string {
  return String(title).replace(/\s+/g, ' ').trim();
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{8,}$/;
const youtubeTitleCache = new Map<string, string>();

type YouTubeTitleLookupDebug = {
  status: 'invalid-id' | 'cache-hit' | 'request-start' | 'http-error' | 'empty-title' | 'success' | 'exception';
  videoId: string;
  message: string;
  httpStatus?: number;
};

export async function fetchYouTubeVideoTitle(
  videoId: string
): Promise<string | null> {
  const logLookup = (event: YouTubeTitleLookupDebug) => {
    const status = event.httpStatus ? `${event.status}(${event.httpStatus})` : event.status;
    void info(`[youtube-title-lookup] ${status} ${event.videoId} - ${event.message}`);
  };

  const normalizedVideoId = String(videoId || '').trim();
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(normalizedVideoId)) {
    logLookup({
      status: 'invalid-id',
      videoId: normalizedVideoId,
      message: 'Skipped title lookup: invalid YouTube video ID format.'
    });
    return null;
  }

  const cached = youtubeTitleCache.get(normalizedVideoId);
  if (cached) {
    logLookup({
      status: 'cache-hit',
      videoId: normalizedVideoId,
      message: `Resolved title from cache: ${cached}`
    });
    return cached;
  }

  const watchUrl = `https://www.youtube.com/watch?v=${normalizedVideoId}`;
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  logLookup({
    status: 'request-start',
    videoId: normalizedVideoId,
    message: 'Fetching title via YouTube oEmbed.'
  });

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      logLookup({
        status: 'http-error',
        videoId: normalizedVideoId,
        message: `YouTube oEmbed returned HTTP ${response.status}.`,
        httpStatus: response.status
      });
      return null;
    }

    const payload = (await response.json()) as { title?: string };
    const title = sanitizeTitleForTextFile(payload.title ?? '');
    if (!title) {
      logLookup({
        status: 'empty-title',
        videoId: normalizedVideoId,
        message: 'YouTube oEmbed returned an empty title.'
      });
      return null;
    }

    youtubeTitleCache.set(normalizedVideoId, title);
    logLookup({
      status: 'success',
      videoId: normalizedVideoId,
      message: `Resolved title from YouTube oEmbed: ${title}`
    });
    return title;
  } catch (error) {
    logLookup({
      status: 'exception',
      videoId: normalizedVideoId,
      message: `YouTube title lookup failed: ${String(error)}`
    });
    return null;
  }
}

export function isPrivateVideoTitle(title: string | null | undefined): boolean {
  const normalized = sanitizeTitleForTextFile(String(title ?? '')).toLowerCase();
  return (
    normalized === '[private video]' ||
    normalized === 'private video' ||
    normalized === '[deleted video]' ||
    normalized === 'deleted video'
  );
}

export function parseYtDlpJson(text: string): VideoItem[] {
  const data = JSON.parse(text) as {
    entries?: Array<{ id?: string; url?: string; title?: string } | null>;
  };

  if (!data || !Array.isArray(data.entries)) {
    throw new Error("This doesn't look like yt-dlp -J playlist JSON (missing entries[]).");
  }

  const items: VideoItem[] = [];
  for (const entry of data.entries) {
    if (!entry) {
      continue;
    }
    const id = entry.id ?? entry.url;
    if (!id) {
      continue;
    }
    items.push({
      videoId: id,
      title: entry.title ?? id
    });
  }

  if (!items.length) {
    throw new Error('No items found in yt-dlp JSON.');
  }

  return items;
}

function extractYtInitialData(htmlText: string): Record<string, unknown> | null {
  const patterns = [
    /var\s+ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s,
    /window\["ytInitialData"\]\s*=\s*(\{.*?\});\s*<\/script>/s
  ];

  for (const regex of patterns) {
    const match = htmlText.match(regex);
    if (!match) {
      continue;
    }

    try {
      return JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
      // Ignore and continue.
    }
  }

  const startKeyword = htmlText.search(/ytInitialData/);
  if (startKeyword < 0) {
    return null;
  }

  const startBrace = htmlText.indexOf('{', startKeyword);
  if (startBrace < 0) {
    return null;
  }

  let depth = 0;
  for (let i = startBrace; i < htmlText.length; i += 1) {
    const ch = htmlText[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      const candidate = htmlText.slice(startBrace, i + 1);
      try {
        return JSON.parse(candidate) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function collectVideoIdTitlePairs(obj: unknown): VideoItem[] {
  const out: VideoItem[] = [];
  const stack: unknown[] = [obj];

  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item);
      }
      continue;
    }

    if (typeof current !== 'object') {
      continue;
    }

    const record = current as {
      playlistVideoRenderer?: {
        videoId?: string;
        title?: { simpleText?: string; runs?: Array<{ text?: string }> };
      };
      [key: string]: unknown;
    };

    if (record.playlistVideoRenderer?.videoId) {
      const renderer = record.playlistVideoRenderer;
      const title =
        renderer.title?.simpleText ??
        (Array.isArray(renderer.title?.runs)
          ? renderer.title.runs.map((run) => run.text ?? '').join('')
          : undefined) ??
        renderer.videoId;

      out.push({
        videoId: renderer.videoId,
        title
      });
    }

    for (const key of Object.keys(record)) {
      stack.push(record[key]);
    }
  }

  return uniqueBy(out, (item) => item.videoId);
}

export async function parsePlaylistHtml(text: string): Promise<VideoItem[]> {
  const data = extractYtInitialData(text);
  if (data) {
    const pairs = collectVideoIdTitlePairs(data);
    if (pairs.length) {
      return pairs;
    }
  }

  const matches = [...text.matchAll(/"videoId":"([a-zA-Z0-9_-]{8,})"/g)];
  const ids = uniqueBy(
    matches.map((match) => ({ videoId: match[1], title: match[1] })),
    (item) => item.videoId
  );

  if (!ids.length) {
    throw new Error(
      "Couldn't find video IDs in that HTML. Make sure it's playlist *page source* (Ctrl+U). "
    );
  }

  return ids;
}

export function downloadJson(obj: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
