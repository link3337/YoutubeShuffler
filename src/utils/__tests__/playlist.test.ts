import { describe, expect, it, vi } from 'vitest';
import {
  extractVideoIdFromLine,
  fisherYatesShuffle,
  parsePlaylistHtml,
  parseYtDlpJson,
  sanitizeTitleForTextFile,
  uniqueBy
} from '../playlist';

describe('playlist utils', () => {
  it('shuffles in place with predictable random', () => {
    const original = [1, 2, 3, 4];
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = fisherYatesShuffle(original);

    expect(result).toBe(original);
    expect(result).toEqual([2, 3, 4, 1]);

    randomSpy.mockRestore();
  });

  it('uniqueBy drops null keys and duplicates', () => {
    const result = uniqueBy(
      [
        { id: 'a', value: 1 },
        { id: null, value: 2 },
        { id: 'a', value: 3 },
        { id: 'b', value: 4 }
      ],
      (item) => item.id
    );

    expect(result).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 4 }
    ]);
  });

  it('extractVideoIdFromLine understands common formats', () => {
    expect(extractVideoIdFromLine('abcd1234')).toBe('abcd1234');
    expect(extractVideoIdFromLine('https://www.youtube.com/watch?v=wxyz9876')).toBe('wxyz9876');
    expect(extractVideoIdFromLine('https://youtu.be/efgh5678')).toBe('efgh5678');
    expect(extractVideoIdFromLine('https://www.youtube.com/embed/ijkl9012')).toBe('ijkl9012');
    expect(extractVideoIdFromLine('not a video')).toBeNull();
  });

  it('sanitizeTitleForTextFile trims and normalizes spaces', () => {
    expect(sanitizeTitleForTextFile('  Song   Title  ')).toBe('Song Title');
  });

  it('parseYtDlpJson parses playlist entries', () => {
    const payload = JSON.stringify({
      entries: [
        { id: 'abcd1234', title: 'Song A' },
        { url: 'efgh5678', title: 'Song B' }
      ]
    });

    expect(parseYtDlpJson(payload)).toEqual([
      { videoId: 'abcd1234', title: 'Song A' },
      { videoId: 'efgh5678', title: 'Song B' }
    ]);
  });

  it('parseYtDlpJson throws on missing entries', () => {
    expect(() => parseYtDlpJson('{}')).toThrow(/missing entries/i);
  });

  it('parseYtDlpJson throws on empty entries', () => {
    const payload = JSON.stringify({ entries: [{ id: null }] });
    expect(() => parseYtDlpJson(payload)).toThrow(/No items/i);
  });

  it('parsePlaylistHtml uses ytInitialData when present', async () => {
    const data = {
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            {
                              playlistVideoRenderer: {
                                videoId: 'abcd1234',
                                title: { simpleText: 'Song A' }
                              }
                            },
                            {
                              playlistVideoRenderer: {
                                videoId: 'abcd1234',
                                title: { simpleText: 'Song A' }
                              }
                            },
                            {
                              playlistVideoRenderer: {
                                videoId: 'efgh5678',
                                title: { runs: [{ text: 'Song ' }, { text: 'B' }] }
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    };

    const html = `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;

    const result = await parsePlaylistHtml(html);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { videoId: 'abcd1234', title: 'Song A' },
        { videoId: 'efgh5678', title: 'Song B' }
      ])
    );
  });
});
