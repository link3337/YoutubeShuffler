import {
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Textarea
} from '@mantine/core';
import { useTwitchStore } from '../stores/twitchStore';

type TwitchRequestCardProps = {
  onConnect: () => void;
  onDisconnect: () => void;
};

export function TwitchRequestCard({
  onConnect,
  onDisconnect
}: TwitchRequestCardProps) {
  const channel = useTwitchStore((state) => state.twitchChannel);
  const oauthToken = useTwitchStore((state) => state.twitchOauthToken);
  const shadowbannedUsers = useTwitchStore((state) => state.shadowbannedUsers);
  const blacklistedSongs = useTwitchStore((state) => state.blacklistedSongs);
  const connected = useTwitchStore((state) => state.twitchConnected);
  const requestCount = useTwitchStore((state) => state.requestCount);

  const onChannelChange = useTwitchStore((state) => state.setTwitchChannel);
  const onOauthTokenChange = useTwitchStore((state) => state.setTwitchOauthToken);
  const onShadowbannedUsersChange = useTwitchStore((state) => state.setShadowbannedUsers);
  const onBlacklistedSongsChange = useTwitchStore((state) => state.setBlacklistedSongs);

  return (
    <Card withBorder radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed" fw={500}>
            Twitch song requests
          </Text>
          <Group gap="xs">
            <Badge color={connected ? 'green' : 'gray'} variant="light">
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="light">{requestCount} added</Badge>
          </Group>
        </Group>

        <TextInput
          label="Channel"
          placeholder="your_channel"
          value={channel}
          onChange={(event) => onChannelChange(event.currentTarget.value)}
          disabled={connected}
        />

        <PasswordInput
          label="OAuth token"
          placeholder="oauth:xxxxxxxxxxxxxxxx"
          value={oauthToken}
          onChange={(event) => onOauthTokenChange(event.currentTarget.value)}
          disabled={connected}
        />

        <Textarea
          label="Shadowbanned users (one username per line)"
          placeholder={'baduser1\nbaduser2'}
          value={shadowbannedUsers}
          onChange={(event) => onShadowbannedUsersChange(event.currentTarget.value)}
          autosize
          minRows={3}
        />

        <Textarea
          label="Blacklisted songs (YouTube ID or URL, one per line)"
          placeholder={'dQw4w9WgXcQ\nhttps://youtu.be/J---aiyznGQ'}
          value={blacklistedSongs}
          onChange={(event) => onBlacklistedSongsChange(event.currentTarget.value)}
          autosize
          minRows={3}
        />

        <Group gap="xs" wrap="wrap">
          <Button onClick={onConnect} disabled={connected}>
            Connect chat
          </Button>
          <Button variant="default" onClick={onDisconnect} disabled={!connected}>
            Disconnect
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Viewers can request with <b>!sr</b> or <b>!songrequest</b> followed by a YouTube URL/ID.
        </Text>
      </Stack>
    </Card>
  );
}
