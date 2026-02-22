import { useCallback, useEffect, useRef, useState } from 'react';
import { extractVideoIdFromLine } from '../../utils/playlist';
import { extractChatMessageFromIrcLine, extractRequestedVideoId } from '../../utils/twitch';

const TWITCH_CHANNEL_STORAGE_KEY = 'ytpl_twitch_channel';
const TWITCH_USERNAME_STORAGE_KEY = 'ytpl_twitch_username';
const TWITCH_TOKEN_STORAGE_KEY = 'ytpl_twitch_token';
const TWITCH_SHADOWBANNED_USERS_STORAGE_KEY = 'ytpl_twitch_shadowbanned_users';
const TWITCH_BLACKLISTED_SONGS_STORAGE_KEY = 'ytpl_twitch_blacklisted_songs';

type UseTwitchRequestsArgs = {
    updateMessage: (text: string, ok?: boolean) => void;
    setStatus: (text: string) => void;
    queueSongRequest: (videoId: string, requestedBy: string) => boolean;
    getCurrentSong: () => { title: string; videoId: string };
};

export function useTwitchRequests({
    updateMessage,
    setStatus,
    queueSongRequest,
    getCurrentSong
}: UseTwitchRequestsArgs) {
    const [twitchChannel, setTwitchChannel] = useState('');
    const [twitchUsername, setTwitchUsername] = useState('');
    const [twitchOauthToken, setTwitchOauthToken] = useState('');
    const [shadowbannedUsers, setShadowbannedUsers] = useState('');
    const [blacklistedSongs, setBlacklistedSongs] = useState('');
    const [twitchConnected, setTwitchConnected] = useState(false);
    const [requestCount, setRequestCount] = useState(0);

    const twitchSocketRef = useRef<WebSocket | null>(null);

    const parseListLines = useCallback((input: string): string[] => {
        return input
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    }, []);

    useEffect(() => {
        try {
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
                    throw new Error(
                        dropReason || sendPayload.message || 'Twitch rejected channel message send.'
                    );
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
        const shadowbannedUsersSet = new Set(
            parseListLines(shadowbannedUsers).map((user) => user.toLowerCase())
        );
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
                    const currentSong = getCurrentSong();
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
                    updateMessage(
                        `Blocked blacklisted song request (${requestedVideoId}) from ${chatMessage.username}.`
                    );
                    continue;
                }

                const accepted = queueSongRequest(requestedVideoId, chatMessage.username);
                if (accepted) {
                    setRequestCount((count) => count + 1);
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
        queueSongRequest
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
