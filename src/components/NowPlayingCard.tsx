import { Card, Text } from '@mantine/core';
import './PlayerArea.css';

type NowPlayingCardProps = {
  title: string;
  videoId: string;
  positionInQueue?: number; // 1-based
  queueLength?: number;
};

export function NowPlayingCard({
  title,
  videoId,
  positionInQueue,
  queueLength
}: NowPlayingCardProps) {
  return (
    <Card withBorder radius="md" className="now-playing-card">
      <Text size="sm">
        Now playing: <b>{title || '(nothing)'}</b>
      </Text>
      <Text c="dimmed" size="xs" mt={6}>
        {videoId ? `Video ID: ${videoId}` : ''}
      </Text>
      {typeof positionInQueue === 'number' && (
        <Text size="xs" mt={6}>
          Position in queue: <b>{positionInQueue}</b>
          {typeof queueLength === 'number' ? ` of ${queueLength}` : ''}
        </Text>
      )}
    </Card>
  );
}
