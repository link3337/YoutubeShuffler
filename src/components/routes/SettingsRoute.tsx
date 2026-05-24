import { Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaqModal } from '../FaqModal';
import { NowPlayingOutputCard } from '../NowPlayingOutputCard';
import type { PlaylistShufflerOutletContext } from '../PlaylistShufflerApp';
import { TwitchRequestCard } from '../TwitchRequestCard';
import SettingsHeader from '../layout/SettingsHeader';

export default function SettingsRoute() {
  const [faqOpened, setFaqOpened] = useState(false);

  const {
    isDarkMode,
    onToggleTheme,
    connectTwitchChat,
    disconnectTwitchChat,
    nowPlayingFolder,
    nowPlayingFilePath,
    isWebNowPlayingMode,
    nowPlayingTemplate,
    needsWebNowPlayingReauth,
    handleNowPlayingTemplateChange,
    handleResetNowPlayingTemplate,
    handleChooseNowPlayingFolder,
    handleClearNowPlayingFolder,
    handleReauthorizeWebNowPlayingFile
  } = useOutletContext<PlaylistShufflerOutletContext>();

  return (
    <>
      <SettingsHeader onOpenFaq={() => setFaqOpened(true)} />
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
          isWebNowPlayingMode={isWebNowPlayingMode}
          nowPlayingTemplate={nowPlayingTemplate}
          needsWebNowPlayingReauth={needsWebNowPlayingReauth}
          onNowPlayingTemplateChange={handleNowPlayingTemplateChange}
          onResetNowPlayingTemplate={handleResetNowPlayingTemplate}
          onChooseNowPlayingFolder={handleChooseNowPlayingFolder}
          onClearNowPlayingFolder={handleClearNowPlayingFolder}
          onReauthorizeWebNowPlayingFile={handleReauthorizeWebNowPlayingFile}
        />

        {isWebNowPlayingMode && (
          <Text size="xs" c="dimmed">
            Browser media keys are best-effort. Play/pause usually works, but next/previous may be
            limited by Chrome/OS media focus or another active media app/tab.
          </Text>
        )}
      </Stack>
      <FaqModal opened={faqOpened} onClose={() => setFaqOpened(false)} />
    </>
  );
}
