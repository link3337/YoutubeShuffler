import { Paper, Switch } from '@mantine/core';

type FooterProps = {
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
};

export default function Footer({ isDarkMode, onToggleTheme }: FooterProps) {
  return (
    <Paper withBorder radius="xl" p="md" mt="md">
      <Switch
        size="md"
        label={isDarkMode ? 'Dark mode' : 'Light mode'}
        checked={isDarkMode}
        onChange={(event) => onToggleTheme(event.currentTarget.checked)}
        onLabel="🌙"
        offLabel="☀️"
        className="theme-switch"
      />
    </Paper>
  );
}
