import { extractVideoIdFromLine } from './playlist';

export type TwitchChatMessage = {
  username: string;
  text: string;
};

export type TwitchPkceAuthRequest = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
};

export type TwitchPkceAuthResult = {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
};

export type TwitchAuthCallbackPayload = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

export type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string[];
  token_type: string;
};

type ParsedIrc = {
  tags: Record<string, string>;
  command: string;
  params: string[];
  trailing: string;
};

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!raw) {
    return tags;
  }

  for (const pair of raw.split(';')) {
    const [key, value = ''] = pair.split('=');
    if (!key) {
      continue;
    }
    tags[key] = value;
  }

  return tags;
}

function parseIrcLine(line: string): ParsedIrc | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  let cursor = trimmed;
  let tags: Record<string, string> = {};

  if (cursor.startsWith('@')) {
    const firstSpace = cursor.indexOf(' ');
    if (firstSpace < 0) {
      return null;
    }
    tags = parseTags(cursor.slice(1, firstSpace));
    cursor = cursor.slice(firstSpace + 1).trim();
  }

  if (cursor.startsWith(':')) {
    const firstSpace = cursor.indexOf(' ');
    if (firstSpace < 0) {
      return null;
    }
    cursor = cursor.slice(firstSpace + 1).trim();
  }

  let trailing = '';
  const trailingMarker = cursor.indexOf(' :');
  if (trailingMarker >= 0) {
    trailing = cursor.slice(trailingMarker + 2);
    cursor = cursor.slice(0, trailingMarker).trim();
  }

  const parts = cursor.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const [command, ...params] = parts;

  return {
    tags,
    command,
    params,
    trailing
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toBase64Url(new Uint8Array(digest));
}

export async function createTwitchPkceAuthRequest(
  request: TwitchPkceAuthRequest
): Promise<TwitchPkceAuthResult> {
  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', request.clientId.trim());
  url.searchParams.set('redirect_uri', request.redirectUri.trim());
  url.searchParams.set('scope', request.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return {
    authorizeUrl: url.toString(),
    state,
    codeVerifier
  };
}

export function parseTwitchAuthCallbackPayload(input: string): TwitchAuthCallbackPayload {
  const text = input.trim();
  if (!text) {
    return {};
  }

  let params: URLSearchParams | null = null;

  try {
    const url = new URL(text);
    params = url.searchParams;
  } catch {
    const plainParams = new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
    params = plainParams;
  }

  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    errorDescription: params.get('error_description') || undefined
  };
}

export async function exchangeTwitchCodeForToken(args: {
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<TwitchTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId.trim(),
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri.trim(),
    code_verifier: args.codeVerifier
  });

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const payload = (await response.json()) as TwitchTokenResponse & {
    message?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message || 'Unable to exchange Twitch authorization code for token.');
  }

  return payload;
}

export async function validateTwitchToken(accessToken: string): Promise<{ login?: string }> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: {
      Authorization: `OAuth ${accessToken}`
    }
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as { login?: string };
  return payload;
}

export function extractChatMessageFromIrcLine(line: string): TwitchChatMessage | null {
  const parsed = parseIrcLine(line);
  if (!parsed || parsed.command !== 'PRIVMSG') {
    return null;
  }

  const username = parsed.tags['display-name'] || parsed.tags['login'];
  if (!username || !parsed.trailing) {
    return null;
  }

  return {
    username,
    text: parsed.trailing
  };
}

export function extractRequestedVideoId(message: string): string | null {
  const normalized = message.trim();
  if (!normalized) {
    return null;
  }

  const requestMatch = normalized.match(/^!(?:sr|songrequest)\s+(.+)$/i);
  if (!requestMatch?.[1]) {
    return null;
  }

  return extractVideoIdFromLine(requestMatch[1]);
}
