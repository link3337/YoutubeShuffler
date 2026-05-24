import { Anchor, Button, Card, Code, Group, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';

type ImportCardProps = {
  hasQueue: boolean;
  onImportYtdlp: () => void;
  onImportYtdlpById: (playlistInput: string) => void;
  onImportHtml: () => void;
  onReshuffle: () => void;
  onExportQueue: () => void;
  onToggleLoopCurrentSong: () => void;
};

export function ImportCard({
  hasQueue,
  onImportYtdlp,
  onImportYtdlpById,
  onImportHtml,
  onReshuffle,
  onExportQueue
}: ImportCardProps) {
  const [playlistInput, setPlaylistInput] = useState('');

  return (
    <Card withBorder radius="md">
      <Stack gap="sm">
        <Text size="xs" c="dimmed" fw={500}>
          Import
        </Text>

        <Group gap="xs" wrap="wrap">
          <Button variant="light" onClick={onImportYtdlp}>
            Import yt-dlp <Code>playlist.json</Code>
          </Button>
          <Button variant="light" onClick={onImportHtml}>
            Import playlist page source <Code>.html</Code>
          </Button>
        </Group>

        <Group gap="xs" align="end" wrap="wrap">
          <TextInput
            label="YouTube playlist ID or URL"
            placeholder="PL... or https://www.youtube.com/playlist?list=..."
            value={playlistInput}
            onChange={(event) => setPlaylistInput(event.currentTarget.value)}
            style={{ minWidth: 320, flex: 1 }}
          />
          <Button
            variant="light"
            disabled={!playlistInput.trim()}
            onClick={() => onImportYtdlpById(playlistInput)}
          >
            Auto-import via yt-dlp
          </Button>
        </Group>

        <Group gap="xs" wrap="wrap">
          <Button onClick={onReshuffle} disabled={!hasQueue}>
            Reshuffle
          </Button>
          <Button onClick={onExportQueue} disabled={!hasQueue}>
            Export queue JSON
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          <b>Recommended:</b> generate playlist.json via{' '}
          <Anchor href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer">
            yt-dlp
          </Anchor>
          <br />
          <Code>yt-dlp --flat-playlist -J "PLAYLIST_URL" &gt; playlist.json</Code>
        </Text>
      </Stack>
    </Card>
  );
}
