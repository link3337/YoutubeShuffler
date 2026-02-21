import { Badge, Box, Card, Group, ScrollArea, SimpleGrid, Text } from '@mantine/core';
import type { RefObject } from 'react';
import type { VideoItem } from '../types';

type PlayerQueueSectionProps = {
  playerRef: RefObject<HTMLDivElement | null>;
  queue: VideoItem[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
};

export function PlayerQueueSection({
  playerRef,
  queue,
  currentIndex,
  onPlayIndex
}: PlayerQueueSectionProps) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
      <Box>
        <div id="player" ref={playerRef} />
        <Text c="dimmed" size="xs" mt="xs">
          Unplayable/private/region-blocked videos are auto-skipped.
        </Text>
      </Box>

      <Box>
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs">
            <Text fw={700}>Queue</Text>
            <Badge variant="light">{queue.length}</Badge>
          </Group>
          <Text c="dimmed" size="xs">
            Click any item to play it
          </Text>
        </Group>

        <Card withBorder radius="md" p={0}>
          <ScrollArea h={520}>
            {queue.map((item, index) => (
              <Box
                key={`${item.videoId}-${index}`}
                className={`queue-item ${index === currentIndex ? 'now' : ''}`}
                title={item.videoId}
                onClick={() => onPlayIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPlayIndex(index);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {index + 1}. {item.title || item.videoId}
              </Box>
            ))}
          </ScrollArea>
        </Card>
      </Box>
    </SimpleGrid>
  );
}
