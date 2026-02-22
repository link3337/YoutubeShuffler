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
    twitchChannel,
    twitchOauthToken,
    shadowbannedUsers,
    blacklistedSongs,
    twitchConnected,
    requestCount,
    setTwitchChannel,
    setTwitchOauthToken,
    setShadowbannedUsers,
    setBlacklistedSongs,
    connectTwitchChat,
    disconnectTwitchChat,
    nowPlayingFolder,
    nowPlayingFilePath,
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

        <TwitchRequestCard
          channel={twitchChannel}
          oauthToken={twitchOauthToken}
          shadowbannedUsers={shadowbannedUsers}
          blacklistedSongs={blacklistedSongs}
          connected={twitchConnected}
          requestCount={requestCount}
          onChannelChange={setTwitchChannel}
          onOauthTokenChange={setTwitchOauthToken}
          onShadowbannedUsersChange={setShadowbannedUsers}
          onBlacklistedSongsChange={setBlacklistedSongs}
          onConnect={connectTwitchChat}
          onDisconnect={disconnectTwitchChat}
        />

        <NowPlayingOutputCard
          nowPlayingFolder={nowPlayingFolder}
          nowPlayingFilePath={nowPlayingFilePath}
          onChooseNowPlayingFolder={handleChooseNowPlayingFolder}
          onClearNowPlayingFolder={handleClearNowPlayingFolder}
        />
      </Stack>
    </>
  );
}
