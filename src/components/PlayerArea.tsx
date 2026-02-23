import { Box, Button, Group, Text } from '@mantine/core';
import { IconPlayerSkipBack, IconPlayerSkipForward, IconRepeat } from '@tabler/icons-react';
import type { RefObject } from 'react';
import { NowPlayingCard } from './NowPlayingCard';
import './PlayerArea.css';

type PlayerAreaProps = {
  nowPlaying: { title: string; videoId: string };
  playerRef: RefObject<HTMLDivElement | null>;
  queueLength: number;
  onPrev: () => void;
  onNext: () => void;
  loopCurrentSong: boolean;
  onToggleLoopCurrentSong: () => void;
};

export function PlayerArea({
  nowPlaying,
  playerRef,
  queueLength,
  onPrev,
  onNext,
  loopCurrentSong,
  onToggleLoopCurrentSong
}: PlayerAreaProps) {
  return (
    <Box className="player-area">
      <NowPlayingCard title={nowPlaying.title} videoId={nowPlaying.videoId} />
      <Group gap="xs" my="md" wrap="wrap">
        <Button onClick={onPrev} disabled={!queueLength} aria-label="Previous">
          <IconPlayerSkipBack size={16} />
        </Button>
        <Button onClick={onNext} disabled={!queueLength} aria-label="Next">
          <IconPlayerSkipForward size={16} />
        </Button>
        <Button
          variant={loopCurrentSong ? 'filled' : 'default'}
          onClick={onToggleLoopCurrentSong}
          disabled={!queueLength}
          aria-pressed={loopCurrentSong}
          aria-label="Toggle loop"
        >
          <IconRepeat size={16} />
        </Button>
      </Group>

      <div id="player" ref={playerRef} className="player-iframe" />

      <Text c="dimmed" size="xs" mt="xs">
        Unplayable/private/region-blocked videos are auto-skipped.
      </Text>
    </Box>
  );
}

export default PlayerArea;
