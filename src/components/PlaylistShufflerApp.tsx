import { Box } from '@mantine/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import '../App.css';
import {
  selectCurrentIndex,
  selectLoopCurrentSong,
  selectNowPlaying,
  selectQueue,
  usePlaylistStore
} from '../stores/playlistStore';
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
import { safeInvoke } from '../utils/tauri';
import {
  canUseWebNowPlayingFileOutput,
  clearWebNowPlayingFileHandle,
  getWebNowPlayingFilePermission,
  loadWebNowPlayingFileHandle,
  pickWebNowPlayingFile,
  requestWebNowPlayingFilePermission,
  saveWebNowPlayingFileHandle,
  writeToWebNowPlayingFile
} from '../utils/webNowPlayingFile';
import { useTwitchRequests } from './hooks/useTwitchRequests';
import { PlayerQueueSection } from './PlayerQueueSection';

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
  loopCurrentSong: boolean;
  setLoopCurrentSong: (value: boolean) => void;
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
  connectTwitchChat: () => void;
  disconnectTwitchChat: () => void;
  nowPlayingFolder: string;
  nowPlayingFilePath: string;
  isWebNowPlayingMode: boolean;
  nowPlayingTemplate: string;
  needsWebNowPlayingReauth: boolean;
  handleNowPlayingTemplateChange: (value: string) => void;
  handleResetNowPlayingTemplate: () => void;
  handleChooseNowPlayingFolder: () => void;
  handleClearNowPlayingFolder: () => void;
  handleReauthorizeWebNowPlayingFile: () => void;
};

export default function PlaylistShufflerApp({
  isDarkMode,
  onToggleTheme
}: PlaylistShufflerAppProps) {
  const location = useLocation();
  const isHomeRoute = location.pathname.toLowerCase() === '/home';
  const isTauriRuntime =
    typeof window !== 'undefined' &&
    Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
  const isWebNowPlayingMode = !isTauriRuntime;

  const manualInput = usePlaylistStore((state) => state.manualInput);
  const setManualInput = usePlaylistStore((state) => state.setManualInput);
  const queue = usePlaylistStore(selectQueue);
  const setQueue = usePlaylistStore((state) => state.setQueue);
  const currentIndex = usePlaylistStore(selectCurrentIndex);
  const setCurrentIndex = usePlaylistStore((state) => state.setCurrentIndex);
  const loopCurrentSong = usePlaylistStore(selectLoopCurrentSong);
  const setLoopCurrentSong = usePlaylistStore((state) => state.setLoopCurrentSong);
  const status = usePlaylistStore((state) => state.status);
  const setStatus = usePlaylistStore((state) => state.setStatus);
  const message = usePlaylistStore((state) => state.message);
  const nowPlaying = usePlaylistStore(selectNowPlaying);
  const setNowPlaying = usePlaylistStore((state) => state.setNowPlaying);
  const nowPlayingFolder = usePlaylistStore((state) => state.nowPlayingFolder);
  const nowPlayingTemplate = usePlaylistStore((state) => state.nowPlayingTemplate);
  const updateMessage = usePlaylistStore((state) => state.updateMessage);
  const resetPlaylistState = usePlaylistStore((state) => state.resetPlaylistState);
  const initializeNowPlayingFolder = usePlaylistStore((state) => state.initializeNowPlayingFolder);
  const initializeNowPlayingTemplate = usePlaylistStore(
    (state) => state.initializeNowPlayingTemplate
  );
  const setNowPlayingFolderAndPersist = usePlaylistStore(
    (state) => state.setNowPlayingFolderAndPersist
  );
  const setNowPlayingTemplateAndPersist = usePlaylistStore(
    (state) => state.setNowPlayingTemplateAndPersist
  );
  const resetNowPlayingTemplateAndPersist = usePlaylistStore(
    (state) => state.resetNowPlayingTemplateAndPersist
  );
  const clearNowPlayingFolderAndPersist = usePlaylistStore(
    (state) => state.clearNowPlayingFolderAndPersist
  );
  const saveQueueSession = usePlaylistStore((state) => state.saveQueueSession);
  const restoreQueueSession = usePlaylistStore((state) => state.restoreQueueSession);
  const clearQueueSession = usePlaylistStore((state) => state.clearQueueSession);

  const queueRef = useRef<VideoItem[]>(queue);
  const currentIndexRef = useRef(currentIndex);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingPlayIndexRef = useRef<number | null>(null);
  const nowPlayingRef = useRef(nowPlaying);
  const loopCurrentSongRef = useRef(loopCurrentSong);
  const playIndexHandlerRef = useRef<(index: number) => void>(() => { });
  const nextVideoHandlerRef = useRef<() => void>(() => { });
  const failedVideoIdsRef = useRef<Set<string>>(new Set());
  const userRequestCountsRef = useRef<Record<string, number>>({});
  const webNowPlayingFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const [webNowPlayingFileLabel, setWebNowPlayingFileLabel] = useState('Not selected');
  const [needsWebNowPlayingReauth, setNeedsWebNowPlayingReauth] = useState(false);

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
    initializeNowPlayingFolder();
  }, [initializeNowPlayingFolder]);

  useEffect(() => {
    initializeNowPlayingTemplate();
  }, [initializeNowPlayingTemplate]);

  useEffect(() => {
    if (!isWebNowPlayingMode) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const handle = await loadWebNowPlayingFileHandle();
        if (cancelled || !handle) {
          return;
        }

        webNowPlayingFileHandleRef.current = handle;
        setWebNowPlayingFileLabel(handle.name || 'Selected local file');
        const permission = await getWebNowPlayingFilePermission(handle);
        setNeedsWebNowPlayingReauth(permission !== 'granted');
      } catch {
        // Ignore IndexedDB read failures.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isWebNowPlayingMode]);

  const applyNowPlayingTemplate = useCallback((template: string, title: string) => {
    const sanitizedTitle = sanitizeTitleForTextFile(title || '');
    const normalizedTemplate = (template || '<title>').replace(/[\r\n]+/g, ' ').trim();
    const templated = normalizedTemplate.includes('<title>')
      ? normalizedTemplate.split('<title>').join(sanitizedTitle)
      : `${normalizedTemplate} ${sanitizedTitle}`;

    return sanitizeTitleForTextFile(templated);
  }, []);

  useEffect(() => {
    queueRef.current = queue;

    // Prune failed IDs that no longer exist in the queue.
    const queueIds = new Set(queue.map((item) => item.videoId).filter((id): id is string => Boolean(id)));
    for (const failedId of failedVideoIdsRef.current) {
      if (!queueIds.has(failedId)) {
        failedVideoIdsRef.current.delete(failedId);
      }
    }
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    loopCurrentSongRef.current = loopCurrentSong;
  }, [loopCurrentSong]);

  const reportNowPlaying = useCallback(
    async (item: { title: string; videoId: string }) => {
      setNowPlaying({
        title: item.title || '(unknown)',
        videoId: item.videoId
      });

      const outPath = resolveNowPlayingPath(nowPlayingFolder);

      if (item) {
        try {
          const renderedTitle = applyNowPlayingTemplate(nowPlayingTemplate, item.title || '');
          if (isWebNowPlayingMode) {
            const handle = webNowPlayingFileHandleRef.current;
            if (!handle) {
              updateMessage('Choose a local now playing output file in Settings first.');
              return;
            }

            await writeToWebNowPlayingFile(handle, `${renderedTitle}\n`);
            setNeedsWebNowPlayingReauth(false);
            return;
          }

          await safeInvoke('write_now_playing', {
            title: renderedTitle,
            path: outPath
          });
        } catch (error) {
          updateMessage(`Could not write now playing file: ${String(error)}`);
        }
      }
    },
    [
      applyNowPlayingTemplate,
      isWebNowPlayingMode,
      nowPlayingFolder,
      nowPlayingTemplate,
      resolveNowPlayingPath,
      updateMessage
    ]
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

      saveQueueSession(currentQueue, index);
    },
    [reportNowPlaying, saveQueueSession]
  );

  const findAdjacentPlayableIndex = useCallback(
    (startIndex: number, direction: 1 | -1): number => {
      const currentQueue = queueRef.current;
      const total = currentQueue.length;
      if (!total) {
        return -1;
      }

      for (let step = 1; step <= total; step += 1) {
        const candidate = (startIndex + direction * step + total) % total;
        const videoId = currentQueue[candidate]?.videoId ?? '';
        if (!videoId) {
          continue;
        }
        if (!failedVideoIdsRef.current.has(videoId)) {
          return candidate;
        }
      }

      return -1;
    },
    []
  );

  const nextVideo = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }

    const next = findAdjacentPlayableIndex(currentIndexRef.current, 1);
    if (next < 0) {
      updateMessage('No playable videos available in queue.');
      return;
    }
    playIndex(next);
  }, [findAdjacentPlayableIndex, playIndex, updateMessage]);

  const previousVideo = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }

    const prev = findAdjacentPlayableIndex(currentIndexRef.current, -1);
    if (prev < 0) {
      updateMessage('No playable videos available in queue.');
      return;
    }
    playIndex(prev);
  }, [findAdjacentPlayableIndex, playIndex, updateMessage]);

  useEffect(() => {
    playIndexHandlerRef.current = playIndex;
  }, [playIndex]);

  useEffect(() => {
    nextVideoHandlerRef.current = nextVideo;
  }, [nextVideo]);

  const reshuffleKeepCurrent = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      return;
    }

    const shuffled = fisherYatesShuffle([...currentQueue]);
    queueRef.current = shuffled;
    setQueue(shuffled);
    setCurrentIndex(0);
    playIndex(0);
    updateMessage('Reshuffled.', true);
  }, [playIndex, updateMessage]);

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

      saveQueueSession(nextQueue, currentIndexRef.current);

      return true;
    },
    [playIndex, saveQueueSession, updateMessage]
  );

  const { connectTwitchChat, disconnectTwitchChat } = useTwitchRequests({
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
              playIndexHandlerRef.current(
                Math.min(Math.max(pendingIndex, 0), queueRef.current.length - 1)
              );
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.ENDED) {
              if (loopCurrentSongRef.current && currentIndexRef.current >= 0) {
                playIndexHandlerRef.current(currentIndexRef.current);
                return;
              }
              nextVideoHandlerRef.current();
            }
          },
          onError: () => {
            const failedItem = queueRef.current[currentIndexRef.current];
            const failedVideoId = failedItem?.videoId ?? '';
            if (failedVideoId) {
              failedVideoIdsRef.current.add(failedVideoId);
            }
            console.log('Error playing video, skipping to next playable.');
            nextVideoHandlerRef.current();
          }
        }
      });

      const restored = restoreQueueSession();
      if (restored) {
        setQueue(restored.queue);
        setCurrentIndex(restored.currentIndex);
        pendingPlayIndexRef.current = restored.currentIndex;
        setStatus(`Restored last session (${restored.queue.length} videos).`);
        updateMessage('Restored from last session.', true);
        return;
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
  }, [nextVideo, playIndex, restoreQueueSession, updateMessage]);

  const handleImportYtdlp = useCallback(() => {
    fileInputYtdlpRef.current?.click();
  }, []);

  const handleChooseNowPlayingFolder = useCallback(async () => {
    if (isWebNowPlayingMode) {
      try {
        if (!canUseWebNowPlayingFileOutput()) {
          updateMessage(
            'Local file output is unavailable here. Use Chrome/Edge over HTTPS (or localhost).'
          );
          return;
        }

        const handle = await pickWebNowPlayingFile();
        await saveWebNowPlayingFileHandle(handle);
        webNowPlayingFileHandleRef.current = handle;
        setWebNowPlayingFileLabel(handle.name || 'Selected local file');
        const permission = await requestWebNowPlayingFilePermission(handle);
        setNeedsWebNowPlayingReauth(permission !== 'granted');
        updateMessage(`Now playing output file set: ${handle.name}`, true);
      } catch (error) {
        updateMessage(`Unable to choose local output file: ${String(error)}`);
      }
      return;
    }

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: nowPlayingFolder || undefined
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      setNowPlayingFolderAndPersist(selected);
      updateMessage(`Now playing folder set: ${selected}`, true);
    } catch (error) {
      updateMessage(`Unable to choose folder: ${String(error)}`);
    }
  }, [isWebNowPlayingMode, nowPlayingFolder, setNowPlayingFolderAndPersist, updateMessage]);

  const handleClearNowPlayingFolder = useCallback(() => {
    if (isWebNowPlayingMode) {
      webNowPlayingFileHandleRef.current = null;
      setWebNowPlayingFileLabel('Not selected');
      setNeedsWebNowPlayingReauth(false);
      void clearWebNowPlayingFileHandle();
      updateMessage('Local now playing output file cleared.', true);
      return;
    }

    clearNowPlayingFolderAndPersist();
    updateMessage('Now playing folder reset to default app path.', true);
  }, [clearNowPlayingFolderAndPersist, isWebNowPlayingMode, updateMessage]);

  const handleNowPlayingTemplateChange = useCallback(
    (value: string) => {
      setNowPlayingTemplateAndPersist(value);
    },
    [setNowPlayingTemplateAndPersist]
  );

  const handleResetNowPlayingTemplate = useCallback(() => {
    resetNowPlayingTemplateAndPersist();
    updateMessage('Now playing template reset to default.', true);
  }, [resetNowPlayingTemplateAndPersist, updateMessage]);

  const handleReauthorizeWebNowPlayingFile = useCallback(() => {
    if (!isWebNowPlayingMode) {
      return;
    }

    const handle = webNowPlayingFileHandleRef.current;
    if (!handle) {
      updateMessage('Choose a local now playing output file first.');
      return;
    }

    void (async () => {
      try {
        const permission = await requestWebNowPlayingFilePermission(handle);
        const granted = permission === 'granted';
        setNeedsWebNowPlayingReauth(!granted);
        if (granted) {
          updateMessage('Local file access re-authorized.', true);
          return;
        }

        updateMessage('File access was not granted.');
      } catch (error) {
        updateMessage(`Could not re-authorize file access: ${String(error)}`);
      }
    })();
  }, [isWebNowPlayingMode, updateMessage]);

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
    resetPlaylistState();
    updateMessage('Cleared.', true);
    pendingPlayIndexRef.current = null;
    failedVideoIdsRef.current.clear();
    userRequestCountsRef.current = {};
    clearQueueSession();
  }, [clearQueueSession, resetPlaylistState, updateMessage]);

  const removeQueueItem = useCallback(
    (removeIndex: number) => {
      const currentQueue = queueRef.current;
      if (removeIndex < 0 || removeIndex >= currentQueue.length) {
        return;
      }

      const nextQueue = currentQueue.filter((_, idx) => idx !== removeIndex);
      queueRef.current = nextQueue;

      if (!nextQueue.length) {
        setQueue([]);
        setCurrentIndex(-1);
        setNowPlaying({ title: '(nothing)', videoId: '' });
        clearQueueSession();
        setStatus('Queue is empty.');
        updateMessage('Removed song from current queue.', true);
        return;
      }

      const previousCurrent = currentIndexRef.current;

      if (removeIndex < previousCurrent) {
        const nextIndex = previousCurrent - 1;
        setQueue(nextQueue);
        setCurrentIndex(nextIndex);
        saveQueueSession(nextQueue, nextIndex);
        updateMessage('Removed song from current queue.', true);
        return;
      }

      if (removeIndex === previousCurrent) {
        const nextIndex = Math.min(removeIndex, nextQueue.length - 1);
        setQueue(nextQueue);
        setCurrentIndex(nextIndex);
        saveQueueSession(nextQueue, nextIndex);
        playIndex(nextIndex);
        updateMessage('Removed current song and continued playback.', true);
        return;
      }

      setQueue(nextQueue);
      saveQueueSession(nextQueue, previousCurrent);
      updateMessage('Removed song from current queue.', true);
    },
    [
      clearQueueSession,
      playIndex,
      saveQueueSession,
      setCurrentIndex,
      setNowPlaying,
      setQueue,
      setStatus,
      updateMessage
    ]
  );

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
    loopCurrentSong,
    setLoopCurrentSong,
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
    connectTwitchChat,
    disconnectTwitchChat,
    nowPlayingFolder,
    nowPlayingFilePath: isWebNowPlayingMode
      ? webNowPlayingFileLabel
      : resolveNowPlayingPath(nowPlayingFolder),
    isWebNowPlayingMode,
    nowPlayingTemplate,
    needsWebNowPlayingReauth,
    handleNowPlayingTemplateChange,
    handleResetNowPlayingTemplate,
    handleChooseNowPlayingFolder,
    handleClearNowPlayingFolder,
    handleReauthorizeWebNowPlayingFile
  };

  return (
    <>
      <Outlet context={outletContext} />

      <Box mt="md" style={!isHomeRoute ? { display: 'none' } : undefined}>
        <PlayerQueueSection
          nowPlaying={nowPlaying}
          playerRef={playerContainerRef}
          queue={queue}
          currentIndex={currentIndex}
          onPlayIndex={playIndex}
          onRemoveIndex={removeQueueItem}
          onPrev={previousVideo}
          onNext={nextVideo}
          loopCurrentSong={loopCurrentSong}
          onToggleLoopCurrentSong={() => setLoopCurrentSong(!loopCurrentSong)}
          isDarkMode={isDarkMode}
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
