import { Modal, SimpleGrid } from '@mantine/core';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ImportCard } from '../ImportCard';
import { ImportedPlaylistsCard } from '../ImportedPlaylistsCard';
import { ManualInputCard } from '../ManualInputCard';
import type { PlaylistShufflerOutletContext } from '../PlaylistShufflerApp';
import { StatusMessage } from '../StatusMessage';
import Header from '../layout/Header';

export default function HomeRoute() {
  const [manualModalOpened, setManualModalOpened] = useState(false);

  const {
    manualInput,
    setManualInput,
    queue,
    loopCurrentSong,
    setLoopCurrentSong,
    status,
    message,
    handleImportYtdlp,
    handleImportHtml,
    reshuffleKeepCurrent,
    handleExportQueue,
    handleLoadManual,
    handleClear,
    importedPlaylists,
    handleLoadImportedPlaylist,
    handleDeleteImportedPlaylist,
    handleRenameImportedPlaylist
  } = useOutletContext<PlaylistShufflerOutletContext>();

  return (
    <>
      <Header />
      <SimpleGrid cols={{ base: 1, md: 2, xl: 2 }} spacing="md" mt="md">
        <ImportCard
          hasQueue={queue.length > 0}
          onImportYtdlp={handleImportYtdlp}
          onImportHtml={handleImportHtml}
          onReshuffle={reshuffleKeepCurrent}
          onExportQueue={handleExportQueue}
          onOpenManualInput={() => setManualModalOpened(true)}
          onToggleLoopCurrentSong={() => setLoopCurrentSong(!loopCurrentSong)}
        />

        <ImportedPlaylistsCard
          playlists={importedPlaylists}
          onLoadPlaylist={handleLoadImportedPlaylist}
          onDeletePlaylist={handleDeleteImportedPlaylist}
          onRenamePlaylist={handleRenameImportedPlaylist}
        />
      </SimpleGrid>

      <Modal
        opened={manualModalOpened}
        onClose={() => setManualModalOpened(false)}
        title="Manual Input"
        size="lg"
      >
        <ManualInputCard
          value={manualInput}
          onChange={setManualInput}
          onLoad={handleLoadManual}
          onClear={handleClear}
        />
      </Modal>

      <StatusMessage status={status} message={message} />
    </>
  );
}
