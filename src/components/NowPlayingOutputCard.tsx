import { Button, Card, Code, Group, Stack, Text, TextInput } from '@mantine/core';

type NowPlayingOutputCardProps = {
  nowPlayingFolder: string;
  nowPlayingFilePath: string;
  isWebNowPlayingMode: boolean;
  nowPlayingTemplate: string;
  needsWebNowPlayingReauth: boolean;
  onNowPlayingTemplateChange: (value: string) => void;
  onResetNowPlayingTemplate: () => void;
  onChooseNowPlayingFolder: () => void;
  onClearNowPlayingFolder: () => void;
  onReauthorizeWebNowPlayingFile: () => void;
};

export function NowPlayingOutputCard({
  nowPlayingFolder,
  nowPlayingFilePath,
  isWebNowPlayingMode,
  nowPlayingTemplate,
  needsWebNowPlayingReauth,
  onNowPlayingTemplateChange,
  onResetNowPlayingTemplate,
  onChooseNowPlayingFolder,
  onClearNowPlayingFolder,
  onReauthorizeWebNowPlayingFile
}: NowPlayingOutputCardProps) {
  return (
    <Card withBorder radius="md" mt="md">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" fw={500}>
          Now Playing Output
        </Text>
        <Group gap="xs" wrap="wrap">
          <Button variant="default" onClick={onChooseNowPlayingFolder}>
            {isWebNowPlayingMode ? 'Choose local output file' : 'Choose now playing folder'}
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={onClearNowPlayingFolder}
            disabled={
              isWebNowPlayingMode ? nowPlayingFilePath === 'Not selected' : !nowPlayingFolder
            }
          >
            {isWebNowPlayingMode ? 'Clear local file' : 'Use default'}
          </Button>
        </Group>
        <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
          <b>{isWebNowPlayingMode ? 'Selected file:' : 'Output file:'}</b>{' '}
          <Code>{nowPlayingFilePath}</Code>
        </Text>
        {isWebNowPlayingMode ? (
          <Text size="xs" c="dimmed">
            Hosted web mode writes directly to the file you choose here, so OBS can read it.
          </Text>
        ) : null}
        {isWebNowPlayingMode && nowPlayingFilePath !== 'Not selected' ? (
          <Group gap="xs" wrap="wrap">
            <Button
              variant={needsWebNowPlayingReauth ? 'filled' : 'default'}
              color={needsWebNowPlayingReauth ? 'orange' : 'gray'}
              onClick={onReauthorizeWebNowPlayingFile}
            >
              Re-authorize file access
            </Button>
            {needsWebNowPlayingReauth ? (
              <Text size="xs" c="yellow">
                Required after some refreshes/browser restarts.
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                File access permission looks good.
              </Text>
            )}
          </Group>
        ) : null}

        <TextInput
          label="Now playing template"
          description="Use <title> where the song title should appear."
          placeholder="Now playing: <title>"
          value={nowPlayingTemplate}
          onChange={(event) => onNowPlayingTemplateChange(event.currentTarget.value)}
        />
        <Group gap="xs" wrap="wrap">
          <Button variant="subtle" color="gray" onClick={onResetNowPlayingTemplate}>
            Reset template
          </Button>
          <Text size="xs" c="dimmed">
            Preview example:{' '}
            <Code>
              {(nowPlayingTemplate || '<title>').replace(/<title>/g, 'Never Gonna Give You Up')}
            </Code>
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
