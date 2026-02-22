import { Button, Card, Code, Group, Stack, Text } from '@mantine/core';

type NowPlayingOutputCardProps = {
  nowPlayingFolder: string;
  nowPlayingFilePath: string;
  onChooseNowPlayingFolder: () => void;
  onClearNowPlayingFolder: () => void;
};

export function NowPlayingOutputCard({
  nowPlayingFolder,
  nowPlayingFilePath,
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
      </Stack>
    </Card>
  );
}
