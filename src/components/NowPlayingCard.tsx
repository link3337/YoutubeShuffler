import { Card, Text } from '@mantine/core';

type NowPlayingCardProps = {
  title: string;
  videoId: string;
};

export function NowPlayingCard({ title, videoId }: NowPlayingCardProps) {
  return (
    <Card withBorder radius="md" mt="md">
      <Text size="sm">
        Now playing: <b>{title || '(nothing)'}</b>
      </Text>
      <Text c="dimmed" size="xs" mt={6}>
        {videoId ? `Video ID: ${videoId}` : ''}
      </Text>
    </Card>
  );
}
