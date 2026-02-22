import { Box } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import '../App.css';
import type { MessageState, VideoItem } from '../types';
import {
  downloadJson,
  extractVideoIdFromLine,
  fisherYatesShuffle,
  parsePlaylistHtml,
  parseYtDlpJson,
  sanitizeTitleForTextFile,
  uniqueBy
} from '../utils/playlist';
import { useTwitchRequests } from './hooks/useTwitchRequests';
import { PlayerQueueSection } from './PlayerQueueSection';

const STORAGE_KEY = 'ytpl_last';
const NOW_PLAYING_FOLDER_STORAGE_KEY = 'ytpl_now_playing_folder';
const NOW_PLAYING_FILE_NAME = 'current_song.txt';
const MAX_REQUESTS_PER_USER = 5;

type YTPlayerInstance = {
  loadVideoById: (args: { videoId: string }) => void;
};

type YTPlayerReadyEvent = {
  target: YTPlayerInstance;
};

type YTNamespace = {
  Player: new (
    element: HTMLDivElement,
    options: {
      videoId: string;
      playerVars?: { autoplay?: number; controls?: number; rel?: number };
      events?: {
        onReady?: (event: YTPlayerReadyEvent) => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState: {
    ENDED: number;
  };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type PlaylistShufflerAppProps = {
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
};

export type PlaylistShufflerOutletContext = {
  manualInput: string;
  setManualInput: (value: string) => void;
  queue: VideoItem[];
  currentIndex: number;
  status: string;
  message: MessageState | null;
  nowPlaying: { title: string; videoId: string };
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  playIndex: (index: number) => void;
  handleImportYtdlp: () => void;
  handleImportHtml: () => void;
  previousVideo: () => void;
  nextVideo: () => void;
  reshuffleKeepCurrent: () => void;
  handleExportQueue: () => void;
  handleLoadManual: () => void;
  handleClear: () => void;
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
  twitchChannel: string;
  twitchOauthToken: string;
  shadowbannedUsers: string;
  blacklistedSongs: string;
  twitchConnected: boolean;
  requestCount: number;
  setTwitchChannel: (value: string) => void;
  setTwitchOauthToken: (value: string) => void;
  setShadowbannedUsers: (value: string) => void;
  setBlacklistedSongs: (value: string) => void;
  connectTwitchChat: () => void;
  disconnectTwitchChat: () => void;
  nowPlayingFolder: string;
  nowPlayingFilePath: string;
  handleChooseNowPlayingFolder: () => void;
  handleClearNowPlayingFolder: () => void;
};

export default function PlaylistShufflerApp({
  isDarkMode,
  onToggleTheme
}: PlaylistShufflerAppProps) {
  const location = useLocation();
  const isSettingsRoute = location.pathname.toLowerCase() === '/settings';

  const [manualInput, setManualInput] = useState('');
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; videoId: string }>({
    title: '(nothing)',
    videoId: ''
  });
  const [nowPlayingFolder, setNowPlayingFolder] = useState('');

  const queueRef = useRef<VideoItem[]>(queue);
  const currentIndexRef = useRef(currentIndex);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingPlayIndexRef = useRef<number | null>(null);
  const nowPlayingRef = useRef(nowPlaying);
  const userRequestCountsRef = useRef<Record<string, number>>({});

  const fileInputYtdlpRef = useRef<HTMLInputElement | null>(null);
  const fileInputHtmlRef = useRef<HTMLInputElement | null>(null);

  const resolveNowPlayingPath = useCallback((folder: string) => {
    if (!folder) {
      return NOW_PLAYING_FILE_NAME;
    }

    if (folder.endsWith('/') || folder.endsWith('\\')) {
      return `${folder}${NOW_PLAYING_FILE_NAME}`;
    }

    const separator = folder.includes('\\') ? '\\' : '/';
    return `${folder}${separator}${NOW_PLAYING_FILE_NAME}`;
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOW_PLAYING_FOLDER_STORAGE_KEY);
      if (stored) {
        setNowPlayingFolder(stored);
      }
    } catch {
      // Ignore localStorage failures.
    }
  }, []);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  const updateMessage = useCallback((text: string, ok = false) => {
    setMessage(text ? { text, ok } : null);
  }, []);

  const reportNowPlaying = useCallback(
    async (item: { title: string; videoId: string }) => {
      setNowPlaying({
        title: item.title || '(unknown)',
        videoId: item.videoId
      });

      const outPath = resolveNowPlayingPath(nowPlayingFolder);

      if (item) {
        try {
          await invoke('write_now_playing', {
            title: sanitizeTitleForTextFile(item.title || ''),
            path: outPath
          });
        } catch (error) {
          updateMessage(`Could not write now playing file: ${String(error)}`);
        }
      }
    },
    [nowPlayingFolder, resolveNowPlayingPath, updateMessage]
  );

  const playIndex = useCallback(
    (index: number) => {
      const player = playerRef.current;
      const currentQueue = queueRef.current;

      if (!player || !playerReadyRef.current || typeof player.loadVideoById !== 'function') {
        pendingPlayIndexRef.current = index;
        return;
      }
      if (index < 0 || index >= currentQueue.length) {
        return;
      }

      setCurrentIndex(index);

      const item = currentQueue[index];
      if (!item) {
        return;
      }

      const videoId = item.videoId ?? '';
      if (!videoId) {
        return;
      }
      const title = item.title ?? videoId;

      void reportNowPlaying({
        title,
        videoId
      });

      player?.loadVideoById({ videoId });

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            queue: currentQueue,
            currentIndex: index
          })
        );
      } catch {
        // Ignore localStorage failures.
      }
    },
    [reportNowPlaying]
  );

  const nextVideo = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }
    const next = (currentIndexRef.current + 1) % currentQueue.length;
    playIndex(next);
  }, [playIndex]);

  const previousVideo = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }

    const prev = (currentIndexRef.current - 1 + currentQueue.length) % currentQueue.length;
    playIndex(prev);
  }, [playIndex]);

  const reshuffleKeepCurrent = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }

    const currentVideoId = currentQueue[currentIndexRef.current]?.videoId;
    const shuffled = fisherYatesShuffle([...currentQueue]);
    const newIndex = shuffled.findIndex((item) => item.videoId === currentVideoId);

    setQueue(shuffled);
    setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    updateMessage('Reshuffled.', true);
  }, [updateMessage]);

  const setQueueAndPlay = useCallback(
    (items: VideoItem[], sourceLabel: string) => {
      const cleaned = uniqueBy(items, (item) => item.videoId);
      if (!cleaned.length) {
        throw new Error('No playable items found.');
      }

      const shuffled = fisherYatesShuffle([...cleaned]);
      queueRef.current = shuffled;
      setQueue(shuffled);
      setCurrentIndex(0);
      setStatus(`${sourceLabel}: loaded ${cleaned.length} videos. Shuffled + playing.`);
      updateMessage('Loaded successfully.', true);

      if (playerRef.current) {
        playIndex(0);
      } else {
        pendingPlayIndexRef.current = 0;
      }
    },
    [playIndex, updateMessage]
  );

  const queueSongRequest = useCallback(
    (videoId: string, requestedBy: string): boolean => {
      const requesterKey = (requestedBy || '').trim().toLowerCase();
      const currentUserCount = requesterKey ? (userRequestCountsRef.current[requesterKey] ?? 0) : 0;
      if (requesterKey && currentUserCount >= MAX_REQUESTS_PER_USER) {
        updateMessage(
          `Request ignored: ${requestedBy} reached the ${MAX_REQUESTS_PER_USER} song limit.`,
          true
        );
        return false;
      }

      const currentQueue = queueRef.current;
      if (currentQueue.some((item) => item.videoId === videoId)) {
        updateMessage(`Ignored duplicate request (${videoId}) from ${requestedBy}.`);
        return false;
      }

      const requestedItem: VideoItem = {
        videoId,
        title: `[Request by ${requestedBy}] ${videoId}`
      };

      const insertIndex = Math.min(Math.max(currentIndexRef.current + 1, 0), currentQueue.length);
      const nextQueue = [
        ...currentQueue.slice(0, insertIndex),
        requestedItem,
        ...currentQueue.slice(insertIndex)
      ];
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      if (requesterKey) {
        userRequestCountsRef.current[requesterKey] = currentUserCount + 1;
      }
      setStatus(`Added song request from ${requestedBy}: ${videoId} (up next)`);
      updateMessage(`Song request queued as next song (${videoId}).`, true);

      if (!currentQueue.length) {
        setCurrentIndex(0);
        if (playerRef.current) {
          playIndex(0);
        } else {
          pendingPlayIndexRef.current = 0;
        }
        return true;
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            queue: nextQueue,
            currentIndex: currentIndexRef.current
          })
        );
      } catch {
        // Ignore localStorage failures.
      }

      return true;
    },
    [playIndex, updateMessage]
  );

  const {
    twitchChannel,
    twitchOauthToken,
    shadowbannedUsers,
    blacklistedSongs,
    twitchConnected,
    requestCount,
    setTwitchChannel,
    setTwitchOauthToken,
    setShadowbannedUsers,
    setBlacklistedSongs,
    connectTwitchChat,
    disconnectTwitchChat
  } = useTwitchRequests({
    updateMessage,
    setStatus,
    queueSongRequest,
    getCurrentSong: () => nowPlayingRef.current
  });

  useEffect(() => {
    if (!playerRef.current || pendingPlayIndexRef.current === null || !queue.length) {
      return;
    }

    const index = Math.min(Math.max(pendingPlayIndexRef.current, 0), queue.length - 1);
    pendingPlayIndexRef.current = null;
    playIndex(index);
  }, [queue, playIndex]);

  useEffect(() => {
    const initializePlayer = () => {
      if (!window.YT || !playerContainerRef.current || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: '',
        playerVars: { autoplay: 1, controls: 1, rel: 0 },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            const pendingIndex = pendingPlayIndexRef.current;
            if (pendingIndex !== null && queueRef.current.length) {
              pendingPlayIndexRef.current = null;
              playIndex(Math.min(Math.max(pendingIndex, 0), queueRef.current.length - 1));
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.ENDED) {
              nextVideo();
            }
          },
          onError: () => {
            nextVideo();
          }
        }
      });

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { queue?: VideoItem[]; currentIndex?: number };
          if (Array.isArray(saved.queue) && saved.queue.length) {
            const restoredQueue = saved.queue;
            const restoredIndex = Math.min(
              Math.max(saved.currentIndex ?? 0, 0),
              restoredQueue.length - 1
            );

            setQueue(restoredQueue);
            setCurrentIndex(restoredIndex);
            pendingPlayIndexRef.current = restoredIndex;
            setStatus(`Restored last session (${restoredQueue.length} videos).`);
            updateMessage('Restored from last session.', true);
            return;
          }
        }
      } catch {
        // Ignore restore failures.
      }

      setStatus('Ready. Import yt-dlp playlist.json to start.');
    };

    if (window.YT?.Player) {
      initializePlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      initializePlayer();
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, [nextVideo, playIndex, updateMessage]);

  const handleImportYtdlp = useCallback(() => {
    fileInputYtdlpRef.current?.click();
  }, []);

  const handleChooseNowPlayingFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: nowPlayingFolder || undefined
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      setNowPlayingFolder(selected);
      localStorage.setItem(NOW_PLAYING_FOLDER_STORAGE_KEY, selected);
      updateMessage(`Now playing folder set: ${selected}`, true);
    } catch (error) {
      updateMessage(`Unable to choose folder: ${String(error)}`);
    }
  }, [nowPlayingFolder, updateMessage]);

  const handleClearNowPlayingFolder = useCallback(() => {
    setNowPlayingFolder('');
    try {
      localStorage.removeItem(NOW_PLAYING_FOLDER_STORAGE_KEY);
    } catch {
      // Ignore localStorage failures.
    }
    updateMessage('Now playing folder reset to default app path.', true);
  }, [updateMessage]);

  const handleImportHtml = useCallback(() => {
    fileInputHtmlRef.current?.click();
  }, []);

  const handleYtdlpFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) {
        return;
      }

      try {
        updateMessage('');
        setStatus('Reading yt-dlp JSON...');
        const text = await file.text();
        const items = parseYtDlpJson(text);
        setQueueAndPlay(items, 'yt-dlp import');
      } catch (error) {
        setStatus('');
        updateMessage(String(error instanceof Error ? error.message : error));
      }
    },
    [setQueueAndPlay, updateMessage]
  );

  const handleHtmlFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) {
        return;
      }

      try {
        updateMessage('');
        setStatus('Reading playlist HTML...');
        const text = await file.text();
        const items = await parsePlaylistHtml(text);
        setQueueAndPlay(items, 'HTML import (best-effort)');
      } catch (error) {
        setStatus('');
        updateMessage(String(error instanceof Error ? error.message : error));
      }
    },
    [setQueueAndPlay, updateMessage]
  );

  const handleLoadManual = useCallback(() => {
    try {
      updateMessage('');
      const lines = manualInput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const ids = uniqueBy(
        lines
          .map(extractVideoIdFromLine)
          .filter((id): id is string => Boolean(id))
          .map((id) => ({ videoId: id, title: id })),
        (item) => item.videoId
      );

      if (!ids.length) {
        throw new Error('Paste at least one video ID or YouTube URL.');
      }

      setQueueAndPlay(ids, 'Manual IDs');
    } catch (error) {
      setStatus('');
      updateMessage(String(error instanceof Error ? error.message : error));
    }
  }, [manualInput, setQueueAndPlay, updateMessage]);

  const handleClear = useCallback(() => {
    setManualInput('');
    setQueue([]);
    setCurrentIndex(-1);
    setStatus('');
    updateMessage('Cleared.', true);
    setNowPlaying({ title: '(nothing)', videoId: '' });
    pendingPlayIndexRef.current = null;
    userRequestCountsRef.current = {};

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage failures.
    }
  }, [updateMessage]);

  const handleExportQueue = useCallback(() => {
    if (!queue.length) {
      return;
    }

    const payload = {
      kind: 'ytpl-queue',
      createdAt: new Date().toISOString(),
      currentIndex,
      items: queue
    };

    downloadJson(payload, `queue-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    updateMessage('Exported queue JSON.', true);
  }, [currentIndex, queue, updateMessage]);

  const outletContext: PlaylistShufflerOutletContext = {
    manualInput,
    setManualInput,
    queue,
    currentIndex,
    status,
    message,
    nowPlaying,
    playerContainerRef,
    playIndex,
    handleImportYtdlp,
    handleImportHtml,
    previousVideo,
    nextVideo,
    reshuffleKeepCurrent,
    handleExportQueue,
    handleLoadManual,
    handleClear,
    isDarkMode,
    onToggleTheme,
    twitchChannel,
    twitchOauthToken,
    shadowbannedUsers,
    blacklistedSongs,
    twitchConnected,
    requestCount,
    setTwitchChannel,
    setTwitchOauthToken,
    setShadowbannedUsers,
    setBlacklistedSongs,
    connectTwitchChat,
    disconnectTwitchChat,
    nowPlayingFolder,
    nowPlayingFilePath: resolveNowPlayingPath(nowPlayingFolder),
    handleChooseNowPlayingFolder,
    handleClearNowPlayingFolder
  };

  return (
    <>
      <Outlet context={outletContext} />

      <Box mt="md" style={isSettingsRoute ? { display: 'none' } : undefined}>
        <PlayerQueueSection
          nowPlaying={nowPlaying}
          playerRef={playerContainerRef}
          queue={queue}
          currentIndex={currentIndex}
          onPlayIndex={playIndex}
        />
      </Box>

      <div className="hidden-inputs">
        <input
          ref={fileInputYtdlpRef}
          type="file"
          accept=".json,application/json"
          onChange={handleYtdlpFileChange}
        />
        <input
          ref={fileInputHtmlRef}
          type="file"
          accept=".html,text/html"
          onChange={handleHtmlFileChange}
        />
      </div>
    </>
  );
}
