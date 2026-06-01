export type VideoItem = {
  videoId?: string;
  title?: string;
};

export type ImportedPlaylistSource = 'yt-dlp' | 'html';

export type ImportedPlaylistSummary = {
  id: string;
  name: string;
  source: ImportedPlaylistSource;
  importedAt: string;
  itemCount: number;
};

export type ImportedPlaylistRecord = ImportedPlaylistSummary & {
  items: VideoItem[];
};

export type MessageState = {
  text: string;
  ok: boolean;
};
