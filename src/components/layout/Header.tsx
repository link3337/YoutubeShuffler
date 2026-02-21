import { Group, Paper, Text, Title } from '@mantine/core';

export default function Header() {
  return (
    <Paper withBorder radius="xl" p="lg" className="panel">
      <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
        <div>
          <Title order={1} mb={6} className="title">
            YouTube Playlist Shuffler
          </Title>
          <Text c="dimmed">
            Import <b>yt-dlp</b> playlist dumps (recommended), YouTube playlist page source HTML
            (best-effort), or paste video IDs manually. Then shuffle + autoplay locally.
          </Text>
        </div>
      </Group>
    </Paper>
  );
}
