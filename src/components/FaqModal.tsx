import { Anchor, Code, Divider, List, Modal, Stack, Text } from '@mantine/core';

type FaqModalProps = {
  opened: boolean;
  onClose: () => void;
};

export function FaqModal({ opened, onClose }: FaqModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="FAQ" centered size="lg">
      <Stack gap="sm">
        <Text fw={600}>Get yt-dlp</Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Install from{' '}
            <Anchor href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer">
              github.com/yt-dlp/yt-dlp
            </Anchor>
            .
          </List.Item>
          <List.Item>
            Export a playlist JSON with{' '}
            <Code>yt-dlp --flat-playlist -J "PLAYLIST_URL" &gt; playlist.json</Code>
          </List.Item>
          <List.Item>Then use Import yt-dlp playlist.json in the app.</List.Item>
        </List>
        <Divider />
        <Text fw={600}>Generate Twitch token</Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Go to{' '}
            <Anchor href="https://twitchtokengenerator.com/" target="_blank" rel="noreferrer">
              twitchtokengenerator.com
            </Anchor>
            .
          </List.Item>
          <List.Item>Under Bot Chat Token, click Generate Token.</List.Item>
          <List.Item>Sign in with the Twitch account this app should use.</List.Item>
          <List.Item>
            Ensure these scopes are selected: <Code>chat:read</Code>, <Code>chat:edit</Code>,{' '}
            <Code>user:read:chat</Code>, <Code>user:write:chat</Code>.
          </List.Item>
          <List.Item>Approve authorization and copy the token.</List.Item>
          <List.Item>
            Paste it into OAuth token. If needed, prepend <Code>oauth:</Code>.
          </List.Item>
          <List.Item>
            Click connection. If connection fails, regenerate the token and try again.
          </List.Item>
        </List>

        <Text size="xs" c="dimmed">
          Keep this token private. Regenerate if connection fails.
        </Text>

        <Divider />

        <Text fw={600}>Request commands</Text>
        <List size="sm" spacing="xs">
          <List.Item>
            <Code>!sr https://www.youtube.com/watch?v=dQw4w9WgXcQ</Code>
          </List.Item>
          <List.Item>
            <Code>!songrequest dQw4w9WgXcQ</Code>
          </List.Item>
        </List>

        <Divider />

        <Text fw={600}>Hosted website + OBS text file output</Text>
        <List size="sm" spacing="xs">
          <List.Item>Open the hosted app in Chrome or Edge (HTTPS or localhost).</List.Item>
          <List.Item>Go to Settings and choose local output file in Now Playing Output.</List.Item>
          <List.Item>In OBS, configure a Text source to read that same local file.</List.Item>
          <List.Item>If browser file permission is lost, re-authorize in Settings.</List.Item>
        </List>

        <Text size="xs" c="dimmed">
          Desktop Tauri mode still supports folder-based current_song.txt output.
        </Text>
      </Stack>
    </Modal>
  );
}
