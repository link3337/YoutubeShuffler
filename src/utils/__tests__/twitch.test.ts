import { describe, expect, it } from 'vitest';
import {
  extractChatMessageFromIrcLine,
  extractRequestedVideoId,
  normalizeTwitchChannelInput,
  parseTwitchAuthCallbackPayload
} from '../twitch';

describe('twitch utils', () => {
  it('parseTwitchAuthCallbackPayload accepts URLs and raw query', () => {
    const urlPayload = parseTwitchAuthCallbackPayload(
      'https://example.com/callback?code=abc123&state=xyz'
    );
    const rawPayload = parseTwitchAuthCallbackPayload('code=abc123&state=xyz');

    expect(urlPayload).toEqual({
      code: 'abc123',
      state: 'xyz',
      error: undefined,
      errorDescription: undefined
    });
    expect(rawPayload.code).toBe('abc123');
    expect(rawPayload.state).toBe('xyz');
  });

  it('extractChatMessageFromIrcLine parses PRIVMSG lines', () => {
    const line =
      '@badge-info=;badges=;display-name=Streamer;login=streamer :streamer!streamer@streamer.tmi.twitch.tv PRIVMSG #channel :Hello there';

    expect(extractChatMessageFromIrcLine(line)).toEqual({
      username: 'Streamer',
      text: 'Hello there'
    });
  });

  it('extractRequestedVideoId parses song request commands', () => {
    expect(extractRequestedVideoId('!sr https://youtu.be/abcd1234')).toBe('abcd1234');
    expect(extractRequestedVideoId('!songrequest https://www.youtube.com/watch?v=wxyz9876')).toBe(
      'wxyz9876'
    );
    expect(extractRequestedVideoId('hello')).toBeNull();
  });

  it('normalizeTwitchChannelInput accepts channel URLs', () => {
    expect(normalizeTwitchChannelInput('https://www.twitch.tv/MyChannel')).toBe('mychannel');
    expect(normalizeTwitchChannelInput('https://twitch.tv/AnotherOne/')).toBe('anotherone');
    expect(normalizeTwitchChannelInput('www.twitch.tv/SomeUser?x=1')).toBe('someuser');
    expect(normalizeTwitchChannelInput('justAChannel')).toBe('justachannel');
  });

  it('normalizeTwitchChannelInput rejects invalid channel formats', () => {
    expect(normalizeTwitchChannelInput('https://youtube.com/someone')).toBe('');
    expect(normalizeTwitchChannelInput('https://www.twitch.tv/')).toBe('');
    expect(normalizeTwitchChannelInput('not a channel')).toBe('');
    expect(normalizeTwitchChannelInput('name/with/slash')).toBe('');
  });
});
