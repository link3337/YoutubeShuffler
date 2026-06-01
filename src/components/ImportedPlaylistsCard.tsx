import { Badge, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import type { ImportedPlaylistSummary } from '../types';

type ImportedPlaylistsCardProps = {
  playlists: ImportedPlaylistSummary[];
  onLoadPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRenamePlaylist: (id: string, nextName: string) => void;
};

function formatImportedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

export function ImportedPlaylistsCard({
  playlists,
  onLoadPlaylist,
  onDeletePlaylist,
  onRenamePlaylist
}: ImportedPlaylistsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const beginEditing = (playlist: ImportedPlaylistSummary) => {
    setEditingId(playlist.id);
    setDraftName(playlist.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveEditing = () => {
    if (!editingId) {
      return;
    }

    const trimmedName = draftName.trim();
    if (!trimmedName) {
      return;
    }

    onRenamePlaylist(editingId, trimmedName);
    cancelEditing();
  };

  return (
    <Card withBorder radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed" fw={500}>
            Quick Load Imported Playlists
          </Text>
          <Badge variant="light">{playlists.length}</Badge>
        </Group>

        {!playlists.length ? (
          <Text size="sm" c="dimmed">
            No imported playlists saved yet. Import a yt-dlp JSON or playlist HTML to save it here.
          </Text>
        ) : (
          <Stack gap="xs">
            {playlists.map((playlist) => (
              <Card key={playlist.id} withBorder radius="sm" p="sm">
                <Stack gap={6}>
                  <Group justify="space-between" align="center" gap="xs" wrap="wrap">
                    {editingId === playlist.id ? (
                      <TextInput
                        value={draftName}
                        onChange={(event) => setDraftName(event.currentTarget.value)}
                        size="xs"
                        placeholder="Playlist name"
                        style={{ flex: 1, minWidth: 180 }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveEditing();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                      />
                    ) : (
                      <Text fw={600} size="sm">
                        {playlist.name}
                      </Text>
                    )}
                    <Badge variant="outline">{playlist.source}</Badge>
                  </Group>

                  <Text size="xs" c="dimmed">
                    {playlist.itemCount} items • imported {formatImportedAt(playlist.importedAt)}
                  </Text>

                  <Group gap="xs" wrap="wrap">
                    <Button size="compact-sm" onClick={() => onLoadPlaylist(playlist.id)}>
                      Load + Shuffle
                    </Button>
                    {editingId === playlist.id ? (
                      <>
                        <Button size="compact-sm" variant="light" onClick={saveEditing}>
                          Save Name
                        </Button>
                        <Button size="compact-sm" variant="default" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="compact-sm"
                        variant="light"
                        onClick={() => beginEditing(playlist)}
                      >
                        Edit Name
                      </Button>
                    )}
                    <Button
                      size="compact-sm"
                      variant="default"
                      color="red"
                      onClick={() => onDeletePlaylist(playlist.id)}
                    >
                      Remove
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
