import { Badge, Box, Card, Group, ScrollArea, Text, TextInput } from '@mantine/core';
import { useMemo, useState } from 'react';
import type { VideoItem } from '../types';
import './Queue.css';

type QueueProps = {
  queue: VideoItem[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
};

export function Queue({ queue, currentIndex, onPlayIndex }: QueueProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const indexedQueue = queue.map((item, index) => ({ item, index }));
    if (!query) return indexedQueue;
    return indexedQueue.filter(({ item }) => {
      const title = (item.title || '').toLowerCase();
      const videoId = (item.videoId || '').toLowerCase();
      return title.includes(query) || videoId.includes(query);
    });
  }, [queue, searchQuery]);

  return (
    <Box className="queue-column">
      <Card withBorder radius="md" p={0} className="queue-card">
        <Box p="xs" pb={0}>
          <Group justify="space-between" align="center" mb="xs">
            <Group gap="xs">
              <Text fw={700}>Queue</Text>
              <Badge variant="light">{queue.length}</Badge>
            </Group>
          </Group>
          <TextInput
            placeholder="Search queue by title or video ID"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
          />
        </Box>
        <ScrollArea className="queue-scroll">
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
  );
}

export default Queue;
