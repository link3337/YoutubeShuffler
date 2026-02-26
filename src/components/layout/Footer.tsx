import { ActionIcon, Anchor, Text } from '@mantine/core';
import { IconBrandMantine, IconBrandReact, IconHeartFilled } from '@tabler/icons-react';

export default function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        whiteSpace: 'nowrap'
      }}
    >
      <Text fw={700} size="sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center' }}>
        Made with
        <IconHeartFilled
          size={14}
          style={{ color: 'var(--mantine-color-red-6)', margin: '0 6px' }}
        />
        by
        <Anchor
          href="https://github.com/link3337"
          target="_blank"
          rel="noreferrer"
          style={{ margin: '0 6px' }}
        >
          link3337
        </Anchor>
        and
      </Text>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ActionIcon
          variant="subtle"
          color="yellow"
          aria-label="Vite"
          size="sm"
          component="a"
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/vite.svg" alt="Vite" width={18} height={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="orange"
          aria-label="Tauri"
          size="sm"
          component="a"
          href="https://tauri.app"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/tauri.svg" alt="Tauri" width={18} height={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="cyan"
          aria-label="React"
          size="sm"
          component="a"
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandReact size={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          aria-label="Zustand"
          size="sm"
          component="a"
          href="https://zustand.docs.pmnd.rs"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/zustand.svg" alt="Zustand" width={18} height={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="blue"
          aria-label="Mantine"
          size="sm"
          component="a"
          href="https://mantine.dev"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandMantine size={18} />
        </ActionIcon>
      </div>
    </div>
  );
}
