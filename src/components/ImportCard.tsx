import { Button, Card, Code, Group, Stack, Text } from '@mantine/core';

type ImportCardProps = {
  hasQueue: boolean;
  loopCurrentSong: boolean;
  onImportYtdlp: () => void;
  onImportHtml: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReshuffle: () => void;
  onExportQueue: () => void;
  onToggleLoopCurrentSong: () => void;
};

export function ImportCard({
  hasQueue,
  loopCurrentSong,
  onImportYtdlp,
  onImportHtml,
  onPrev,
  onNext,
  onReshuffle,
  onExportQueue,
  onToggleLoopCurrentSong
}: ImportCardProps) {
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

        <Group gap="xs" wrap="wrap">
          <Button onClick={onPrev} disabled={!hasQueue}>
            Prev
          </Button>
          <Button onClick={onNext} disabled={!hasQueue}>
            Next
          </Button>
          <Button onClick={onReshuffle} disabled={!hasQueue}>
            Reshuffle
          </Button>
          <Button
            variant={loopCurrentSong ? 'filled' : 'default'}
            onClick={onToggleLoopCurrentSong}
            disabled={!hasQueue}
          >
            {loopCurrentSong ? 'Loop current: On' : 'Loop current: Off'}
          </Button>
          <Button onClick={onExportQueue} disabled={!hasQueue}>
            Export queue JSON
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          <b>Recommended:</b> generate playlist.json via
          <br />
          <Code>yt-dlp --flat-playlist -J "PLAYLIST_URL" &gt; playlist.json</Code>
        </Text>
      </Stack>
    </Card>
  );
}
