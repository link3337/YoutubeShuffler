import { SimpleGrid } from '@mantine/core';
import { useOutletContext } from 'react-router-dom';
import { ImportCard } from '../ImportCard';
import { ManualInputCard } from '../ManualInputCard';
import type { PlaylistShufflerOutletContext } from '../PlaylistShufflerApp';
import { StatusMessage } from '../StatusMessage';
import Header from '../layout/Header';

export default function HomeRoute() {
  const {
    manualInput,
    setManualInput,
    queue,
    loopCurrentSong,
    setLoopCurrentSong,
    status,
    message,
    handleImportYtdlp,
    handleImportYtdlpById,
    handleImportHtml,
    reshuffleKeepCurrent,
    handleExportQueue,
    handleLoadManual,
    handleClear
  } = useOutletContext<PlaylistShufflerOutletContext>();

  return (
    <>
      <Header />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <ImportCard
          hasQueue={queue.length > 0}
          onImportYtdlp={handleImportYtdlp}
          onImportYtdlpById={handleImportYtdlpById}
          onImportHtml={handleImportHtml}
          onReshuffle={reshuffleKeepCurrent}
          onExportQueue={handleExportQueue}
          onToggleLoopCurrentSong={() => setLoopCurrentSong(!loopCurrentSong)}
        />
        <ManualInputCard
          value={manualInput}
          onChange={setManualInput}
          onLoad={handleLoadManual}
          onClear={handleClear}
        />
      </SimpleGrid>
      <StatusMessage status={status} message={message} />
    </>
  );
}
