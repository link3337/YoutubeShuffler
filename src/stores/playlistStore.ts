import { create } from 'zustand';
import type { MessageState, VideoItem } from '../types';

type NowPlaying = { title: string; videoId: string };
type SavedQueueSession = { queue: VideoItem[]; currentIndex: number };

const DEFAULT_NOW_PLAYING: NowPlaying = {
  title: '(nothing)',
  videoId: ''
};
const STORAGE_KEY = 'ytpl_last';
const NOW_PLAYING_FOLDER_STORAGE_KEY = 'ytpl_now_playing_folder';
const LOOP_CURRENT_SONG_STORAGE_KEY = 'ytpl_loop_current_song';

const readLoopCurrentSongPreference = (): boolean => {
  try {
    return localStorage.getItem(LOOP_CURRENT_SONG_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

type PlaylistStoreState = {
  manualInput: string;
  queue: VideoItem[];
  currentIndex: number;
  loopCurrentSong: boolean;
  status: string;
  message: MessageState | null;
  nowPlaying: NowPlaying;
  nowPlayingFolder: string;
  setManualInput: (value: string) => void;
  setQueue: (value: VideoItem[]) => void;
  setCurrentIndex: (value: number) => void;
  setLoopCurrentSong: (value: boolean) => void;
  setStatus: (value: string) => void;
  updateMessage: (text: string, ok?: boolean) => void;
  setNowPlaying: (value: NowPlaying) => void;
  setNowPlayingFolder: (value: string) => void;
  initializeNowPlayingFolder: () => void;
  setNowPlayingFolderAndPersist: (value: string) => void;
  clearNowPlayingFolderAndPersist: () => void;
  saveQueueSession: (queue: VideoItem[], currentIndex: number) => void;
  restoreQueueSession: () => SavedQueueSession | null;
  clearQueueSession: () => void;
  resetPlaylistState: () => void;
};

export const usePlaylistStore = create<PlaylistStoreState>()((set) => ({
  manualInput: '',
  queue: [],
  currentIndex: -1,
  loopCurrentSong: readLoopCurrentSongPreference(),
  status: '',
  message: null,
  nowPlaying: DEFAULT_NOW_PLAYING,
  nowPlayingFolder: '',
  setManualInput: (value) => set({ manualInput: value }),
  setQueue: (value) => set({ queue: value }),
  setCurrentIndex: (value) => set({ currentIndex: value }),
  setLoopCurrentSong: (value) => {
    set({ loopCurrentSong: value });
    try {
      localStorage.setItem(LOOP_CURRENT_SONG_STORAGE_KEY, String(value));
    } catch {
      // Ignore localStorage failures.
    }
  },
  setStatus: (value) => set({ status: value }),
  updateMessage: (text, ok = false) => set({ message: text ? { text, ok } : null }),
  setNowPlaying: (value) => set({ nowPlaying: value }),
  setNowPlayingFolder: (value) => set({ nowPlayingFolder: value }),
  initializeNowPlayingFolder: () => {
    try {
      const stored = localStorage.getItem(NOW_PLAYING_FOLDER_STORAGE_KEY);
      if (stored) {
        set({ nowPlayingFolder: stored });
      }
    } catch {
      // Ignore localStorage failures.
    }
  },
  setNowPlayingFolderAndPersist: (value) => {
    set({ nowPlayingFolder: value });
    try {
      localStorage.setItem(NOW_PLAYING_FOLDER_STORAGE_KEY, value);
    } catch {
      // Ignore localStorage failures.
    }
  },
  clearNowPlayingFolderAndPersist: () => {
    set({ nowPlayingFolder: '' });
    try {
      localStorage.removeItem(NOW_PLAYING_FOLDER_STORAGE_KEY);
    } catch {
      // Ignore localStorage failures.
    }
  },
  saveQueueSession: (queue, currentIndex) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          queue,
          currentIndex
        })
      );
    } catch {
      // Ignore localStorage failures.
    }
  },
  restoreQueueSession: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw) as { queue?: VideoItem[]; currentIndex?: number };
      if (!Array.isArray(saved.queue) || !saved.queue.length) {
        return null;
      }

      const restoredQueue = saved.queue;
      const restoredIndex = Math.min(
        Math.max(saved.currentIndex ?? 0, 0),
        restoredQueue.length - 1
      );

      return {
        queue: restoredQueue,
        currentIndex: restoredIndex
      };
    } catch {
      return null;
    }
  },
  clearQueueSession: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage failures.
    }
  },
  resetPlaylistState: () =>
    ((): void => {
      try {
        localStorage.setItem(LOOP_CURRENT_SONG_STORAGE_KEY, 'false');
      } catch {
        // Ignore localStorage failures.
      }

      set({
        manualInput: '',
        queue: [],
        currentIndex: -1,
        loopCurrentSong: false,
        status: '',
        message: null,
        nowPlaying: DEFAULT_NOW_PLAYING
      });
    })()
}));

export const selectQueue = (s: PlaylistStoreState) => s.queue;
export const selectCurrentIndex = (s: PlaylistStoreState) => s.currentIndex;
export const selectLoopCurrentSong = (s: PlaylistStoreState) => s.loopCurrentSong;
export const selectNowPlaying = (s: PlaylistStoreState) => s.nowPlaying;

export const getPlaylistStoreState = () => usePlaylistStore.getState();
export const getQueue = () => usePlaylistStore.getState().queue;
export const setQueueState = (q: VideoItem[]) => usePlaylistStore.getState().setQueue(q);
export const getCurrentIndex = () => usePlaylistStore.getState().currentIndex;
export const setCurrentIndexState = (i: number) => usePlaylistStore.getState().setCurrentIndex(i);
export const toggleLoopCurrentSong = () => {
  const s = usePlaylistStore.getState();
  s.setLoopCurrentSong(!s.loopCurrentSong);
};

