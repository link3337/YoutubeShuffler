import { SimpleGrid } from '@mantine/core';
import { useOutletContext } from 'react-router-dom';
import { ImportCard } from '../ImportCard';
import { ManualInputCard } from '../ManualInputCard';
import { PlayerQueueSection } from '../PlayerQueueSection';
import type { PlaylistShufflerOutletContext } from '../PlaylistShufflerApp';
import { StatusMessage } from '../StatusMessage';
import Header from '../layout/Header';

export default function HomeRoute() {
  const {
    manualInput,
    setManualInput,
    queue,
    currentIndex,
    status,
    message,
    nowPlaying,
    playerContainerRef,
    playIndex,
    handleImportYtdlp,
    handleImportHtml,
    nextVideo,
    reshuffleKeepCurrent,
    handleExportQueue,
    handleLoadManual,
    handleClear
  } = useOutletContext<PlaylistShufflerOutletContext>();

  return (
    <>
      {' '}
      <Header />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <ImportCard
          hasQueue={queue.length > 0}
          onImportYtdlp={handleImportYtdlp}
          onImportHtml={handleImportHtml}
          onNext={nextVideo}
          onReshuffle={reshuffleKeepCurrent}
          onExportQueue={handleExportQueue}
        />
        <ManualInputCard
          value={manualInput}
          onChange={setManualInput}
          onLoad={handleLoadManual}
          onClear={handleClear}
        />
      </SimpleGrid>
      <StatusMessage status={status} message={message} />
      <PlayerQueueSection
        nowPlaying={nowPlaying}
        playerRef={playerContainerRef}
        queue={queue}
        currentIndex={currentIndex}
        onPlayIndex={playIndex}
      />
    </>
  );
}
