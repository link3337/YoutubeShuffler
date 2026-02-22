import { ActionIcon, Anchor, Group, Stack, Text } from '@mantine/core';
import {
  IconBrandMantine,
  IconBrandReact,
  IconHeartFilled
} from '@tabler/icons-react';

export default function Footer() {
  return (
    <Stack gap={6} align="center" justify="center" h="100%">
      <Text fw={700} size="lg" ta="center">
        Made with <IconHeartFilled size={16} style={{ color: 'var(--mantine-color-red-6)' }} /> by{' '}
        <Anchor href="https://github.com/link3337" target="_blank" rel="noreferrer">
          link3337
        </Anchor>{' '}
        and
      </Text>

      <Group gap="xs" justify="center">
        <ActionIcon variant="subtle" color="yellow" aria-label="Vite" size="lg">
          <img src="/vite.svg" alt="Vite" width={24} height={24} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="orange" aria-label="Tauri" size="lg">
          <img src="/tauri.svg" alt="Tauri" width={24} height={24} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="cyan" aria-label="React" size="lg">
          <IconBrandReact size={24} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" aria-label="Zustand" size="lg">
          <img src="/zustand.svg" alt="Zustand" width={24} height={24} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="blue" aria-label="Mantine" size="lg">
          <IconBrandMantine size={24} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
