import { Button, Group, useMantineTheme } from '@mantine/core';

type QueueContextMenuProps = {
  x: number;
  y: number;
  isDarkMode: boolean;
  onCopyLink: () => void;
  onRemove: () => void;
};

export function QueueContextMenu({
  x,
  y,
  isDarkMode,
  onCopyLink,
  onRemove
}: QueueContextMenuProps) {
  const theme = useMantineTheme();

  return (
    <div
      className="queue-context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 2000,
        background: isDarkMode ? theme.colors.dark[7] : '#ffffff',
        color: isDarkMode ? theme.colors.dark[0] : undefined,
        border: `1px solid ${isDarkMode ? theme.colors.dark[5] : 'rgba(0,0,0,0.12)'}`,
        borderRadius: theme.radius.sm,
        padding: 8,
        boxShadow: theme.shadows.md
      }}
    >
      <Group>
        <Button
          autoFocus
          variant="subtle"
          onClick={onCopyLink}
          aria-label="Copy link"
          role="menuitem"
        >
          Copy link
        </Button>
        <Button
          variant="subtle"
          color="red"
          onClick={onRemove}
          aria-label="Remove from queue"
          role="menuitem"
        >
          Remove
        </Button>
      </Group>
    </div>
  );
}

export default QueueContextMenu;
