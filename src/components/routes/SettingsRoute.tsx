import { Stack, Switch } from '@mantine/core';
import { useOutletContext } from 'react-router-dom';
import { NowPlayingOutputCard } from '../NowPlayingOutputCard';
import type { PlaylistShufflerOutletContext } from '../PlaylistShufflerApp';
import { TwitchRequestCard } from '../TwitchRequestCard';
import SettingsHeader from '../layout/SettingsHeader';

export default function SettingsRoute() {
  const {
    isDarkMode,
    onToggleTheme,
    connectTwitchChat,
    disconnectTwitchChat,
    nowPlayingFolder,
    nowPlayingFilePath,
    nowPlayingTemplate,
    handleNowPlayingTemplateChange,
    handleResetNowPlayingTemplate,
    handleChooseNowPlayingFolder,
    handleClearNowPlayingFolder
  } = useOutletContext<PlaylistShufflerOutletContext>();

  return (
    <>
      <SettingsHeader />
      <Stack gap="md" mt="md">
        <Switch
          size="md"
          label={isDarkMode ? 'Dark mode' : 'Light mode'}
          checked={isDarkMode}
          onChange={(event) => onToggleTheme(event.currentTarget.checked)}
          onLabel="🌙"
          offLabel="☀️"
          className="theme-switch"
        />

        <TwitchRequestCard onConnect={connectTwitchChat} onDisconnect={disconnectTwitchChat} />

        <NowPlayingOutputCard
          nowPlayingFolder={nowPlayingFolder}
          nowPlayingFilePath={nowPlayingFilePath}
          nowPlayingTemplate={nowPlayingTemplate}
          onNowPlayingTemplateChange={handleNowPlayingTemplateChange}
          onResetNowPlayingTemplate={handleResetNowPlayingTemplate}
          onChooseNowPlayingFolder={handleChooseNowPlayingFolder}
          onClearNowPlayingFolder={handleClearNowPlayingFolder}
        />
      </Stack>
    </>
  );
}
