import { Button, Card, Code, Group, Stack, Text } from '@mantine/core';

type ImportCardProps = {
  hasQueue: boolean;
  onImportYtdlp: () => void;
  onImportHtml: () => void;
  onNext: () => void;
  onReshuffle: () => void;
  onExportQueue: () => void;
};

export function ImportCard({
  hasQueue,
  onImportYtdlp,
  onImportHtml,
  onNext,
  onReshuffle,
  onExportQueue
}: ImportCardProps) {
  return (
    <Card withBorder radius="md" miw={380}>
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
          <Button onClick={onNext} disabled={!hasQueue}>
            Next
          </Button>
          <Button onClick={onReshuffle} disabled={!hasQueue}>
            Reshuffle
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
