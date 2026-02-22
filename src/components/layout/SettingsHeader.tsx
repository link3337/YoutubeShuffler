import { Group, Paper, Text, Title } from '@mantine/core';

export default function SettingsHeader() {
  return (
    <Paper withBorder radius="xl" p="lg" className="panel">
      <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
        <div>
          <Title order={1} mb={6} className="title">
            Settings
          </Title>
          <Text c="dimmed">Configure Twitch song requests, theme, and other options.</Text>
        </div>
      </Group>
    </Paper>
  );
}
