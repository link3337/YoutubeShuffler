import { useCallback, useEffect, useRef } from 'react';
import { useTwitchStore } from '../../stores/twitchStore';
import { extractVideoIdFromLine } from '../../utils/playlist';
import { extractChatMessageFromIrcLine, extractRequestedVideoId } from '../../utils/twitch';

type UseTwitchRequestsArgs = {
  updateMessage: (text: string, ok?: boolean) => void;
  setStatus: (text: string) => void;
  queueSongRequest: (
    videoId: string,
    requestedBy: string
  ) => { accepted: boolean; reason?: string };
  getCurrentSong: () => { title: string; videoId: string };
};

export function useTwitchRequests({
  updateMessage,
  setStatus,
  queueSongRequest,
  getCurrentSong
}: UseTwitchRequestsArgs) {
  const twitchChannel = useTwitchStore((state) => state.twitchChannel);
  const twitchUsername = useTwitchStore((state) => state.twitchUsername);
  const twitchOauthToken = useTwitchStore((state) => state.twitchOauthToken);
  const shadowbannedUsers = useTwitchStore((state) => state.shadowbannedUsers);
  const blacklistedSongs = useTwitchStore((state) => state.blacklistedSongs);
  const twitchConnected = useTwitchStore((state) => state.twitchConnected);
  const requestCount = useTwitchStore((state) => state.requestCount);

  const setTwitchChannel = useTwitchStore((state) => state.setTwitchChannel);
  const setTwitchOauthToken = useTwitchStore((state) => state.setTwitchOauthToken);
  const setShadowbannedUsers = useTwitchStore((state) => state.setShadowbannedUsers);
  const setBlacklistedSongs = useTwitchStore((state) => state.setBlacklistedSongs);
  const setTwitchConnected = useTwitchStore((state) => state.setTwitchConnected);
  const incrementRequestCount = useTwitchStore((state) => state.incrementRequestCount);

  const twitchSocketRef = useRef<WebSocket | null>(null);

  const parseListLines = useCallback((input: string): string[] => {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, []);

  useEffect(() => {
    return () => {
      if (twitchSocketRef.current && twitchSocketRef.current.readyState <= WebSocket.OPEN) {
        twitchSocketRef.current.close();
      }
    };
  }, []);

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
      const normalizedChannel = channelName.trim().replace(/^#/, '').toLowerCase();
      const sanitizedText = text
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 450);

      if (!accessToken) {
        updateMessage('Cannot send message: missing OAuth token.');
        return;
      }

      if (!normalizedChannel) {
        updateMessage('Cannot send message: missing Twitch channel.');
        return;
      }

      if (!sanitizedText) {
        return;
      }

      const ircSocket = twitchSocketRef.current;
      updateMessage(
        `[twitch-debug] sending chat message to #${normalizedChannel}: ${sanitizedText}`
      );
      if (ircSocket && ircSocket.readyState === WebSocket.OPEN) {
        // Prefer IRC send path when connected; this works with standard chat OAuth scopes.
        ircSocket.send(`PRIVMSG #${normalizedChannel} :${sanitizedText}`);
        updateMessage('[twitch-debug] sent via IRC PRIVMSG.', true);
        return;
      }

      updateMessage('[twitch-debug] IRC socket not open, attempting Helix fallback.');

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
        if (validation.login?.toLowerCase() === normalizedChannel) {
          broadcasterId = validation.user_id;
        } else {
          const userLookupResponse = await fetch(
            `https://api.twitch.tv/helix/users?login=${encodeURIComponent(normalizedChannel)}`,
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
            message: sanitizedText
          })
        });

        const sendPayload = (await sendResponse.json()) as {
          message?: string;
          data?: Array<{ is_sent?: boolean; drop_reason?: { message?: string } }>;
        };

        const sent = sendPayload.data?.[0]?.is_sent;
        if (!sendResponse.ok || !sent) {
          const dropReason = sendPayload.data?.[0]?.drop_reason?.message;
          throw new Error(
            dropReason || sendPayload.message || 'Twitch rejected channel message send.'
          );
        }

        updateMessage('[twitch-debug] sent via Helix chat/messages.', true);
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
    const oauthTokenForIrc = normalizedToken
      ? normalizedToken.toLowerCase().startsWith('oauth:')
        ? normalizedToken
        : `oauth:${normalizedToken}`
      : '';
    const shadowbannedUsersSet = new Set(
      parseListLines(shadowbannedUsers).map((user) => user.toLowerCase())
    );
    const blacklistedVideoIds = new Set(
      parseListLines(blacklistedSongs)
        .map((line) => extractVideoIdFromLine(line) || line)
        .map((value) => value.trim())
        .filter(Boolean)
    );

    const hasOauth = Boolean(oauthTokenForIrc);
    const anonymousNick = `bingoman${Math.floor(100000 + Math.random() * 900000)}`;
    const nick = cleanedUsername || anonymousNick;
    const pass = hasOauth ? oauthTokenForIrc : 'e';

    if (twitchSocketRef.current && twitchSocketRef.current.readyState <= WebSocket.OPEN) {
      disconnectTwitchChat();
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

        const trimmedText = chatMessage.text.trim();

        if (/^!currentsong\b/i.test(trimmedText)) {
          const currentSong = getCurrentSong();
          const title = currentSong.title || '(nothing)';
          const videoId = currentSong.videoId;
          const response = videoId
            ? `Now playing: ${title} https://youtu.be/${videoId}`
            : `Now playing: ${title}`;
          void sendMessageToTwitchChannel(channel, response);
          continue;
        }

        const isSongRequestCommand = /^!(?:sr|songrequest)\b/i.test(trimmedText);
        if (isSongRequestCommand) {
          const hasRequestArgument = /^!(?:sr|songrequest)\s+.+/i.test(trimmedText);
          if (!hasRequestArgument && hasOauth) {
            void sendMessageToTwitchChannel(
              channel,
              `@${chatMessage.username} usage: !sr <youtube url or id>`
            );
          }
        }

        const requestedVideoId = extractRequestedVideoId(chatMessage.text);
        if (!requestedVideoId) {
          if (isSongRequestCommand && hasOauth) {
            void sendMessageToTwitchChannel(
              channel,
              `@${chatMessage.username} could not parse that YouTube URL/ID.`
            );
          }
          continue;
        }

        const requester = (chatMessage.username || '').trim().toLowerCase();
        if (requester && shadowbannedUsersSet.has(requester)) {
          continue;
        }

        if (blacklistedVideoIds.has(requestedVideoId)) {
          updateMessage(
            `Blocked blacklisted song request (${requestedVideoId}) from ${chatMessage.username}.`
          );
          if (hasOauth) {
            void sendMessageToTwitchChannel(
              channel,
              `@${chatMessage.username} that song is blacklisted and cannot be requested.`
            );
          }
          continue;
        }

        const result = queueSongRequest(requestedVideoId, chatMessage.username);
        if (result.accepted) {
          incrementRequestCount();
          if (hasOauth) {
            void sendMessageToTwitchChannel(
              channel,
              `@${chatMessage.username} song request successfully added.`
            );
          }
        } else if (hasOauth) {
          const reason = result.reason || 'request could not be added.';
          void sendMessageToTwitchChannel(channel, `@${chatMessage.username} ${reason}`);
        }
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
    twitchChannel,
    twitchUsername,
    twitchOauthToken,
    shadowbannedUsers,
    blacklistedSongs,
    parseListLines,
    disconnectTwitchChat,
    setStatus,
    updateMessage,
    sendMessageToTwitchChannel,
    getCurrentSong,
    queueSongRequest,
    incrementRequestCount
  ]);

  return {
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
  };
}
