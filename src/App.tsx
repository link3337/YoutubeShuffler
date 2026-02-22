import {
  AppShell,
  Button,
  Container,
  Group,
  Stack,
  useComputedColorScheme,
  useMantineColorScheme
} from '@mantine/core';
import { IconHome, IconSettings } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });

  const location = useLocation();
  const isHomeRoute = location.pathname.toLowerCase() === '/home';
  const isSettingsRoute = location.pathname.toLowerCase() === '/settings';
  const showMobileFooterNav = isHomeRoute || isSettingsRoute;

  return (
    <AppShell
      navbar={{
        width: 72,
        breakpoint: 'sm',
        collapsed: { mobile: showMobileFooterNav }
      }}
      footer={{
        height: 58,
        collapsed: !showMobileFooterNav
      }}
    >
      <AppShell.Navbar p="xs">
        <Stack gap="xs">
          <Button
            component={Link}
            to="/home"
            variant={isHomeRoute ? 'light' : 'subtle'}
            justify="flex-start"
            aria-label="Home"
          >
            <IconHome size={18} />
          </Button>
          <Button
            component={Link}
            to="/settings"
            variant={!isHomeRoute ? 'light' : 'subtle'}
            justify="flex-start"
            aria-label="Settings"
          >
            <IconSettings size={18} />
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Footer p="xs">
        <Group grow wrap="nowrap">
          <Button
            component={Link}
            to="/home"
            variant={isHomeRoute ? 'light' : 'subtle'}
            aria-label="Home"
          >
            <IconHome size={18} />
          </Button>
          <Button
            component={Link}
            to="/settings"
            variant={!isHomeRoute ? 'light' : 'subtle'}
            aria-label="Settings"
          >
            <IconSettings size={18} />
          </Button>
        </Group>
      </AppShell.Footer>

      <AppShell.Main>
        <Container size="xl" py={{ base: 'sm', sm: 'md' }} px={{ base: 'xs', sm: 'md' }} className="app">
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
