import { CodeHighlight } from '@mantine/code-highlight';
import { Anchor, Button, Card, Code, Group, Stack, Text } from '@mantine/core';

type ImportCardProps = {
  hasQueue: boolean;
  onImportYtdlp: () => void;
  onImportHtml: () => void;
  onReshuffle: () => void;
  onExportQueue: () => void;
  onOpenManualInput: () => void;
  onToggleLoopCurrentSong: () => void;
};

export function ImportCard({
  hasQueue,
  onImportYtdlp,
  onImportHtml,
  onReshuffle,
  onExportQueue,
  onOpenManualInput
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
          <Button onClick={onReshuffle} disabled={!hasQueue}>
            Reshuffle
          </Button>
          <Button onClick={onExportQueue} disabled={!hasQueue}>
            Export queue JSON
          </Button>
          <Button variant="default" onClick={onOpenManualInput}>
            Open Manual Input
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          <b>Recommended: Faster export without metadata:</b> generate playlist.json via{' '}
          <Anchor href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer">
            yt-dlp
          </Anchor>
        </Text>
        <CodeHighlight
          language="bash"
          code={'yt-dlp.exe --flat-playlist -J "PLAYLIST_URL" > playlist.json'}
          styles={{
            codeHighlight: { overflow: 'visible' },
            pre: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              borderRadius: 'var(--mantine-radius-sm)',
              overflow: 'hidden'
            },
            controls: {
              top: 'calc(-1 * var(--mantine-spacing-lg))',
              borderRadius: 'var(--mantine-radius-sm)',
              right: 0
            }
          }}
        />
        <Text size="xs" c="dimmed">
          <b>For playlist including metadata (duration, etc.):</b>
        </Text>
        <CodeHighlight
          language="bash"
          code={
            'yt-dlp.exe --skip-download --dump-single-json --no-warnings "PLAYLIST_URL" > playlist.json'
          }
          styles={{
            codeHighlight: { overflow: 'visible' },
            pre: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              borderRadius: 'var(--mantine-radius-sm)',
              overflow: 'hidden'
            },
            controls: {
              top: 'calc(-1 * var(--mantine-spacing-lg))',
              borderRadius: 'var(--mantine-radius-sm)',
              right: 0
            }
          }}
        />
      </Stack>
    </Card>
  );
}
