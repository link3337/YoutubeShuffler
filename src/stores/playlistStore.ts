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

type PlaylistStoreState = {
    manualInput: string;
    queue: VideoItem[];
    currentIndex: number;
    status: string;
    message: MessageState | null;
    nowPlaying: NowPlaying;
    nowPlayingFolder: string;
    setManualInput: (value: string) => void;
    setQueue: (value: VideoItem[]) => void;
    setCurrentIndex: (value: number) => void;
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
    status: '',
    message: null,
    nowPlaying: DEFAULT_NOW_PLAYING,
    nowPlayingFolder: '',
    setManualInput: (value) => set({ manualInput: value }),
    setQueue: (value) => set({ queue: value }),
    setCurrentIndex: (value) => set({ currentIndex: value }),
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
        set({
            manualInput: '',
            queue: [],
            currentIndex: -1,
            status: '',
            message: null,
            nowPlaying: DEFAULT_NOW_PLAYING
        })
}));
