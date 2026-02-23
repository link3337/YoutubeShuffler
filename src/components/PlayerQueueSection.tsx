import { SimpleGrid } from '@mantine/core';
import type { RefObject } from 'react';
import type { VideoItem } from '../types';
import PlayerArea from './PlayerArea';
import Queue from './Queue';

type PlayerQueueSectionProps = {
  nowPlaying: {
    title: string;
    videoId: string;
  };
  playerRef: RefObject<HTMLDivElement | null>;
  queue: VideoItem[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  loopCurrentSong: boolean;
  onToggleLoopCurrentSong: () => void;
};

export function PlayerQueueSection({
  nowPlaying,
  playerRef,
  queue,
  currentIndex,
  onPlayIndex,
  onPrev,
  onNext,
  loopCurrentSong,
  onToggleLoopCurrentSong
}: PlayerQueueSectionProps) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 'sm', md: 'md' }} mt="md">
      <PlayerArea
        nowPlaying={nowPlaying}
        playerRef={playerRef}
        queueLength={queue.length}
        onPrev={onPrev}
        onNext={onNext}
        loopCurrentSong={loopCurrentSong}
        onToggleLoopCurrentSong={onToggleLoopCurrentSong}
      />

      <Queue queue={queue} currentIndex={currentIndex} onPlayIndex={onPlayIndex} />
    </SimpleGrid>
  );
}
