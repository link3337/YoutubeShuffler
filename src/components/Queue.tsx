import { Badge, Box, Card, Checkbox, Group, ScrollArea, Text, TextInput } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import type { VideoItem } from '../types';
import copyTextToClipboard from '../utils/util';
import './Queue.css';
import QueueContextMenu from './QueueContextMenu';

type QueueProps = {
  queue: VideoItem[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
  onRemoveIndex: (index: number) => void;
  isDarkMode?: boolean;
};

export function Queue({ queue, currentIndex, onPlayIndex, onRemoveIndex, isDarkMode }: QueueProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [useRegexSearch, setUseRegexSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    index: number | null;
    message?: string;
  }>({ visible: false, x: 0, y: 0, index: null });

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const indexedQueue = queue.map((item, index) => ({ item, index }));
    if (!query) return indexedQueue;

    let titleRegex: RegExp | null = null;
    if (useRegexSearch) {
      try {
        titleRegex = new RegExp(searchQuery.trim(), 'i');
      } catch {
        titleRegex = null;
      }
    }

    return indexedQueue.filter(({ item }) => {
      const rawTitle = item.title || '';
      const title = rawTitle.toLowerCase();
      const videoId = (item.videoId || '').toLowerCase();

      if (titleRegex) {
        return titleRegex.test(rawTitle);
      }

      return title.includes(query) || videoId.includes(query);
    });
  }, [queue, searchQuery, useRegexSearch]);

  useEffect(() => {
    if (currentIndex == null || currentIndex < 0) return;
    const selector = `[data-queue-index=\"${currentIndex}\"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentIndex]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!contextMenu.visible) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest && target.closest('.queue-context-menu')) return;
      setContextMenu({ visible: false, x: 0, y: 0, index: null });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, index: null });
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [contextMenu.visible]);

  return (
    <Box className="queue-column">
      <Card withBorder radius="md" p={0} className="queue-card">
        <Box p="xs" pb={0}>
          <Group justify="space-between" align="center" mb="xs">
            <Group gap="xs">
              <Text fw={700}>Queue</Text>
              <Badge variant="light">{queue.length}</Badge>
            </Group>
            <Checkbox
              label="Regex"
              size="xs"
              checked={useRegexSearch}
              onChange={(event) => setUseRegexSearch(event.currentTarget.checked)}
            />
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
                data-queue-index={index}
                className={`queue-item ${index === currentIndex ? 'now' : ''}`}
                title={item.videoId}
                onClick={() => onPlayIndex(index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ visible: true, x: e.clientX, y: e.clientY, index });
                }}
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
        {contextMenu.visible && contextMenu.index != null && (
          <QueueContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isDarkMode={!!isDarkMode}
            onCopyLink={async () => {
              const idx = contextMenu.index as number;
              const item = queue[idx];
              if (!item || !item.videoId) return;
              const url = `https://youtu.be/${item.videoId}`;
              const ok = await copyTextToClipboard(url);
              setContextMenu({
                visible: false,
                x: 0,
                y: 0,
                index: null,
                message: ok ? 'Copied' : 'Failed'
              });
            }}
            onRemove={() => {
              const idx = contextMenu.index;
              if (idx == null || idx < 0) return;
              setContextMenu({ visible: false, x: 0, y: 0, index: null });
              onRemoveIndex(idx);
            }}
          />
        )}
      </Card>
    </Box>
  );
}

export default Queue;
