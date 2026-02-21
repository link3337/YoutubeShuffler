import { Badge, Box, Card, Group, ScrollArea, SimpleGrid, Text, TextInput } from '@mantine/core';
import { useMemo, useState, type RefObject } from 'react';
import type { VideoItem } from '../types';
import { NowPlayingCard } from './NowPlayingCard';

type PlayerQueueSectionProps = {
  nowPlaying: {
    title: string;
    videoId: string;
  };
  playerRef: RefObject<HTMLDivElement | null>;
  queue: VideoItem[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
};

export function PlayerQueueSection({
  nowPlaying,
  playerRef,
  queue,
  currentIndex,
  onPlayIndex
}: PlayerQueueSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const indexedQueue = queue.map((item, index) => ({ item, index }));
    if (!query) {
      return indexedQueue;
    }

    return indexedQueue.filter(({ item }) => {
      const title = (item.title || '').toLowerCase();
      const videoId = (item.videoId || '').toLowerCase();
      return title.includes(query) || videoId.includes(query);
    });
  }, [queue, searchQuery]);

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
      <Box>
        <NowPlayingCard title={nowPlaying.title} videoId={nowPlaying.videoId} />

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
        </Group>

        <Card withBorder radius="md" p={0}>
          <Box p="xs" pb={0}>
            <TextInput
              placeholder="Search queue by title or video ID"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
            />
          </Box>
          <ScrollArea h={520}>
            {filteredQueue.length ? (
              filteredQueue.map(({ item, index }) => (
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
              ))
            ) : (
              <Text c="dimmed" size="sm" p="md">
                No matching queue items.
              </Text>
            )}
          </ScrollArea>
        </Card>
      </Box>
    </SimpleGrid>
  );
}
