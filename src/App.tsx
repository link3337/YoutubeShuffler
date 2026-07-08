import {
  AppShell,
  Burger,
  Button,
  Container,
  Group,
  Stack,
  Text,
  useComputedColorScheme,
  useMantineColorScheme
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconHome, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';
import Footer from './components/layout/Footer';

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const [mobileNavOpened, mobileNavHandlers] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();
  const isHomeRoute = currentPath === '/home';
  const isSettingsRoute = currentPath === '/settings';
  const isAboutRoute = currentPath === '/about';

  useEffect(() => {
    mobileNavHandlers.close();
  }, [currentPath, mobileNavHandlers]);

  return (
    <AppShell
      navbar={{
        width: { base: 260, sm: 72 },
        breakpoint: 'sm',
        collapsed: { mobile: !mobileNavOpened }
      }}
      header={{ height: 60 }}
      footer={{
        height: 40,
        collapsed: isMobile
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileNavOpened}
              onClick={mobileNavHandlers.toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Text fw={700} visibleFrom="sm">
              YouTube Playlist Shuffler
            </Text>
            <Text fw={700} hiddenFrom="sm">
              Playlist Shuffler
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Stack gap="xs">
          <Button
            component={Link}
            to="/home"
            variant={isHomeRoute ? 'light' : 'subtle'}
            justify="flex-start"
            fullWidth
            aria-label="Home"
            onClick={mobileNavHandlers.close}
          >
            <Group gap="sm" wrap="nowrap">
              <IconHome size={18} />
              <Text hiddenFrom="sm">Home</Text>
            </Group>
          </Button>
          <Button
            component={Link}
            to="/settings"
            variant={isSettingsRoute ? 'light' : 'subtle'}
            justify="flex-start"
            fullWidth
            aria-label="Settings"
            onClick={mobileNavHandlers.close}
          >
            <Group gap="sm" wrap="nowrap">
              <IconSettings size={18} />
              <Text hiddenFrom="sm">Settings</Text>
            </Group>
          </Button>
          <Button
            component={Link}
            to="/about"
            variant={isAboutRoute ? 'light' : 'subtle'}
            justify="flex-start"
            fullWidth
            aria-label="About"
            onClick={mobileNavHandlers.close}
          >
            <Group gap="sm" wrap="nowrap">
              <IconInfoCircle size={18} />
              <Text hiddenFrom="sm">About</Text>
            </Group>
          </Button>
        </Stack>
      </AppShell.Navbar>

      {!isMobile && (
        <AppShell.Footer p="xs">
          <Footer />
        </AppShell.Footer>
      )}

      <AppShell.Main>
        <Container
          size="xl"
          py={{ base: 'sm', sm: 'md' }}
          px={{ base: 'xs', sm: 'md' }}
          className="app"
        >
          <AppRoutes
            isDarkMode={computedColorScheme === 'dark'}
            onToggleTheme={(isDark) => setColorScheme(isDark ? 'dark' : 'light')}
          />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
