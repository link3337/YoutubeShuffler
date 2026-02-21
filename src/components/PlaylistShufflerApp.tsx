import { SimpleGrid } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
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
import { extractChatMessageFromIrcLine, extractRequestedVideoId } from '../utils/twitch';
import { ImportCard } from './ImportCard';
import { ManualInputCard } from './ManualInputCard';
import { NowPlayingOutputCard } from './NowPlayingOutputCard';
import { PlayerQueueSection } from './PlayerQueueSection';
import { StatusMessage } from './StatusMessage';
import { TwitchRequestCard } from './TwitchRequestCard';

const STORAGE_KEY = 'ytpl_last';
const NOW_PLAYING_FOLDER_STORAGE_KEY = 'ytpl_now_playing_folder';
const NOW_PLAYING_FILE_NAME = 'current_song.txt';
const TWITCH_CHANNEL_STORAGE_KEY = 'ytpl_twitch_channel';
const TWITCH_USERNAME_STORAGE_KEY = 'ytpl_twitch_username';
const TWITCH_TOKEN_STORAGE_KEY = 'ytpl_twitch_token';
const TWITCH_SHADOWBANNED_USERS_STORAGE_KEY = 'ytpl_twitch_shadowbanned_users';
const TWITCH_BLACKLISTED_SONGS_STORAGE_KEY = 'ytpl_twitch_blacklisted_songs';
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

export default function PlaylistShufflerApp() {
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
  const [twitchChannel, setTwitchChannel] = useState('');
  const [twitchUsername, setTwitchUsername] = useState('');
  const [twitchOauthToken, setTwitchOauthToken] = useState('');
  const [shadowbannedUsers, setShadowbannedUsers] = useState('');
  const [blacklistedSongs, setBlacklistedSongs] = useState('');
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const queueRef = useRef<VideoItem[]>(queue);
  const currentIndexRef = useRef(currentIndex);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingPlayIndexRef = useRef<number | null>(null);
  const twitchSocketRef = useRef<WebSocket | null>(null);
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

      const storedChannel = localStorage.getItem(TWITCH_CHANNEL_STORAGE_KEY);
      if (storedChannel) {
        setTwitchChannel(storedChannel);
      }

      const storedUsername = localStorage.getItem(TWITCH_USERNAME_STORAGE_KEY);
      if (storedUsername) {
        setTwitchUsername(storedUsername);
      }

      const storedToken = localStorage.getItem(TWITCH_TOKEN_STORAGE_KEY);
      if (storedToken) {
        setTwitchOauthToken(storedToken);
      }

      const storedShadowbannedUsers = localStorage.getItem(TWITCH_SHADOWBANNED_USERS_STORAGE_KEY);
      if (storedShadowbannedUsers) {
        setShadowbannedUsers(storedShadowbannedUsers);
      }

      const storedBlacklistedSongs = localStorage.getItem(TWITCH_BLACKLISTED_SONGS_STORAGE_KEY);
      if (storedBlacklistedSongs) {
        setBlacklistedSongs(storedBlacklistedSongs);
      }
    } catch {
      // Ignore localStorage failures.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TWITCH_SHADOWBANNED_USERS_STORAGE_KEY, shadowbannedUsers);
    } catch {
      // Ignore localStorage failures.
    }
  }, [shadowbannedUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(TWITCH_BLACKLISTED_SONGS_STORAGE_KEY, blacklistedSongs);
    } catch {
      // Ignore localStorage failures.
    }
  }, [blacklistedSongs]);

  useEffect(() => {
    return () => {
      if (twitchSocketRef.current && twitchSocketRef.current.readyState <= WebSocket.OPEN) {
        twitchSocketRef.current.close();
      }
    };
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

  const parseListLines = useCallback((input: string): string[] => {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
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
    (videoId: string, requestedBy: string) => {
      const requesterKey = (requestedBy || '').trim().toLowerCase();
      const currentUserCount = requesterKey ? (userRequestCountsRef.current[requesterKey] ?? 0) : 0;
      if (requesterKey && currentUserCount >= MAX_REQUESTS_PER_USER) {
        updateMessage(
          `Request ignored: ${requestedBy} reached the ${MAX_REQUESTS_PER_USER} song limit.`,
          true
        );
        return;
      }

      const currentQueue = queueRef.current;
      if (currentQueue.some((item) => item.videoId === videoId)) {
        updateMessage(`Ignored duplicate request (${videoId}) from ${requestedBy}.`);
        return;
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
      setRequestCount((count) => count + 1);
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
        return;
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
    },
    [playIndex, updateMessage]
  );

  const disconnectTwitchChat = useCallback(() => {
    const socket = twitchSocketRef.current;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
    twitchSocketRef.current = null;
    setTwitchConnected(false);
    updateMessage('Disconnected from Twitch chat.', true);
  }, [updateMessage]);

  const sendMessageToTwitchChannel = useCallback(
    async (channelName: string, text: string) => {
      const normalizedToken = twitchOauthToken.trim();
      const accessToken = normalizedToken.toLowerCase().startsWith('oauth:')
        ? normalizedToken.slice(6)
        : normalizedToken;

      if (!accessToken) {
        updateMessage('Cannot send message: missing OAuth token.');
        return;
      }

      try {
        const validateResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
          headers: {
            Authorization: `OAuth ${accessToken}`
          }
        });

        if (!validateResponse.ok) {
          throw new Error('Token validation failed. Re-authenticate Twitch and try again.');
        }

        const validation = (await validateResponse.json()) as {
          client_id?: string;
          user_id?: string;
          login?: string;
          scopes?: string[];
        };

        if (!validation.client_id || !validation.user_id) {
          throw new Error('Token is missing required Twitch identity data.');
        }

        const scopes = validation.scopes || [];
        if (!scopes.includes('user:write:chat')) {
          throw new Error('Token missing user:write:chat scope. Re-login with chat write scope.');
        }

        let broadcasterId = '';
        if (validation.login?.toLowerCase() === channelName.toLowerCase()) {
          broadcasterId = validation.user_id;
        } else {
          const userLookupResponse = await fetch(
            `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelName)}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Client-Id': validation.client_id
              }
            }
          );

          if (!userLookupResponse.ok) {
            throw new Error('Unable to resolve target Twitch channel.');
          }

          const userLookup = (await userLookupResponse.json()) as {
            data?: Array<{ id?: string }>;
          };

          broadcasterId = userLookup.data?.[0]?.id || '';
          if (!broadcasterId) {
            throw new Error('Channel not found for chat message send.');
          }
        }

        const sendResponse = await fetch('https://api.twitch.tv/helix/chat/messages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': validation.client_id,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            broadcaster_id: broadcasterId,
            sender_id: validation.user_id,
            message: text
          })
        });

        const sendPayload = (await sendResponse.json()) as {
          message?: string;
          data?: Array<{ is_sent?: boolean; drop_reason?: { message?: string } }>;
        };

        const sent = sendPayload.data?.[0]?.is_sent;
        if (!sendResponse.ok || !sent) {
          const dropReason = sendPayload.data?.[0]?.drop_reason?.message;
          throw new Error(dropReason || sendPayload.message || 'Twitch rejected channel message send.');
        }
      } catch (error) {
        updateMessage(`Could not send channel message: ${String(error)}`);
      }
    },
    [twitchOauthToken, updateMessage]
  );

  const connectTwitchChat = useCallback(() => {
    const channel = twitchChannel.trim().replace(/^#/, '').toLowerCase();
    if (!channel) {
      updateMessage('Enter a Twitch channel name before connecting.');
      return;
    }

    const cleanedUsername = twitchUsername.trim().toLowerCase();
    const normalizedToken = twitchOauthToken.trim();
    const shadowbannedUsersSet = new Set(parseListLines(shadowbannedUsers).map((user) => user.toLowerCase()));
    const blacklistedVideoIds = new Set(
      parseListLines(blacklistedSongs)
        .map((line) => extractVideoIdFromLine(line) || line)
        .map((value) => value.trim())
        .filter(Boolean)
    );

    const hasOauth = normalizedToken.toLowerCase().startsWith('oauth:');
    const anonymousNick = `justinfan${Math.floor(100000 + Math.random() * 900000)}`;
    const nick = cleanedUsername || anonymousNick;
    const pass = hasOauth ? normalizedToken : 'SCHMOOPIIE';

    if (twitchSocketRef.current && twitchSocketRef.current.readyState <= WebSocket.OPEN) {
      disconnectTwitchChat();
    }

    try {
      localStorage.setItem(TWITCH_CHANNEL_STORAGE_KEY, channel);
      localStorage.setItem(TWITCH_USERNAME_STORAGE_KEY, cleanedUsername);
      localStorage.setItem(TWITCH_TOKEN_STORAGE_KEY, normalizedToken);
    } catch {
      // Ignore localStorage failures.
    }

    const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    twitchSocketRef.current = socket;

    socket.onopen = () => {
      socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
      socket.send(`PASS ${pass}`);
      socket.send(`NICK ${nick}`);
      socket.send(`JOIN #${channel}`);
      setTwitchConnected(true);
      setStatus(`Connected to Twitch chat: #${channel}`);
      updateMessage(
        hasOauth
          ? `Listening for !sr and !currentsong in #${channel}`
          : `Listening for !sr in #${channel} (anonymous mode: replies disabled)`,
        true
      );
    };

    socket.onmessage = (event) => {
      const raw = String(event.data || '');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('PING')) {
          socket.send(`PONG ${line.slice(5)}`);
          continue;
        }

        if (line.includes(' NOTICE ')) {
          const notice = line.split(' :')[1] || line;
          updateMessage(`Twitch notice: ${notice}`);
          continue;
        }

        const chatMessage = extractChatMessageFromIrcLine(line);
        if (!chatMessage) {
          continue;
        }

        if (/^!currentsong\b/i.test(chatMessage.text.trim())) {
          const currentSong = nowPlayingRef.current;
          const title = currentSong.title || '(nothing)';
          const videoId = currentSong.videoId;
          const response = videoId
            ? `Now playing: ${title} https://youtu.be/${videoId}`
            : `Now playing: ${title}`;
          void sendMessageToTwitchChannel(channel, response);
          continue;
        }

        const requestedVideoId = extractRequestedVideoId(chatMessage.text);
        if (!requestedVideoId) {
          continue;
        }

        const requester = (chatMessage.username || '').trim().toLowerCase();
        if (requester && shadowbannedUsersSet.has(requester)) {
          continue;
        }

        if (blacklistedVideoIds.has(requestedVideoId)) {
          updateMessage(`Blocked blacklisted song request (${requestedVideoId}) from ${chatMessage.username}.`);
          continue;
        }

        queueSongRequest(requestedVideoId, chatMessage.username);
      }
    };

    socket.onerror = () => {
      setTwitchConnected(false);
      updateMessage('Twitch chat connection error. Verify channel/login/token and retry.');
    };

    socket.onclose = () => {
      setTwitchConnected(false);
      if (twitchSocketRef.current === socket) {
        twitchSocketRef.current = null;
      }
    };
  }, [
    disconnectTwitchChat,
    queueSongRequest,
    twitchChannel,
    shadowbannedUsers,
    blacklistedSongs,
    twitchOauthToken,
    twitchUsername,
    sendMessageToTwitchChannel,
    parseListLines,
    updateMessage
  ]);

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

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <ImportCard
          hasQueue={queue.length > 0}
          onImportYtdlp={handleImportYtdlp}
          onImportHtml={handleImportHtml}
          onNext={nextVideo}
          onReshuffle={reshuffleKeepCurrent}
          onExportQueue={handleExportQueue}
        />
        <ManualInputCard
          value={manualInput}
          onChange={setManualInput}
          onLoad={handleLoadManual}
          onClear={handleClear}
        />
      </SimpleGrid>

      <StatusMessage status={status} message={message} />

      <PlayerQueueSection
        nowPlaying={nowPlaying}
        playerRef={playerContainerRef}
        queue={queue}
        currentIndex={currentIndex}
        onPlayIndex={playIndex}
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <TwitchRequestCard
          channel={twitchChannel}
          oauthToken={twitchOauthToken}
          shadowbannedUsers={shadowbannedUsers}
          blacklistedSongs={blacklistedSongs}
          connected={twitchConnected}
          requestCount={requestCount}
          onChannelChange={setTwitchChannel}
          onOauthTokenChange={setTwitchOauthToken}
          onShadowbannedUsersChange={setShadowbannedUsers}
          onBlacklistedSongsChange={setBlacklistedSongs}
          onConnect={connectTwitchChat}
          onDisconnect={disconnectTwitchChat}
        />
      </SimpleGrid>

      <NowPlayingOutputCard
        nowPlayingFolder={nowPlayingFolder}
        nowPlayingFilePath={resolveNowPlayingPath(nowPlayingFolder)}
        onChooseNowPlayingFolder={handleChooseNowPlayingFolder}
        onClearNowPlayingFolder={handleClearNowPlayingFolder}
      />

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
