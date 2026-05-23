import { Button, Card, Code, Group, Stack, Text, TextInput } from '@mantine/core';

type NowPlayingOutputCardProps = {
  nowPlayingFolder: string;
  nowPlayingFilePath: string;
  nowPlayingTemplate: string;
  onNowPlayingTemplateChange: (value: string) => void;
  onResetNowPlayingTemplate: () => void;
  onChooseNowPlayingFolder: () => void;
  onClearNowPlayingFolder: () => void;
};

export function NowPlayingOutputCard({
  nowPlayingFolder,
  nowPlayingFilePath,
  nowPlayingTemplate,
  onNowPlayingTemplateChange,
  onResetNowPlayingTemplate,
  onChooseNowPlayingFolder,
  onClearNowPlayingFolder
}: NowPlayingOutputCardProps) {
  return (
    <Card withBorder radius="md" mt="md">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" fw={500}>
          Now Playing Output
        </Text>
        <Group gap="xs" wrap="wrap">
          <Button variant="default" onClick={onChooseNowPlayingFolder}>
            Choose now playing folder
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={onClearNowPlayingFolder}
            disabled={!nowPlayingFolder}
          >
            Use default
          </Button>
        </Group>
        <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
          <b>Output file:</b> <Code>{nowPlayingFilePath}</Code>
        </Text>

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
            Preview example: <Code>{(nowPlayingTemplate || '<title>').replace(/<title>/g, 'Never Gonna Give You Up')}</Code>
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
