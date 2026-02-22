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

type TwitchRequestCardProps = {
  channel: string;
  oauthToken: string;
  shadowbannedUsers: string;
  blacklistedSongs: string;
  connected: boolean;
  requestCount: number;
  onChannelChange: (value: string) => void;
  onOauthTokenChange: (value: string) => void;
  onShadowbannedUsersChange: (value: string) => void;
  onBlacklistedSongsChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function TwitchRequestCard({
  channel,
  oauthToken,
  shadowbannedUsers,
  blacklistedSongs,
  connected,
  requestCount,
  onChannelChange,
  onOauthTokenChange,
  onShadowbannedUsersChange,
  onBlacklistedSongsChange,
  onConnect,
  onDisconnect
}: TwitchRequestCardProps) {
  return (
    <Card withBorder radius="md" style={{ flex: 1, minWidth: 320 }}>
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
