import {
  AppShell,
  Button,
  Container,
  Stack,
  useComputedColorScheme,
  useMantineColorScheme
} from '@mantine/core';
import { IconHome, IconInfoCircle, IconSettings } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';
import Footer from './components/layout/Footer';

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });

  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();
  const isHomeRoute = currentPath === '/home';
  const isSettingsRoute = currentPath === '/settings';
  const isAboutRoute = currentPath === '/about';

  return (
    <AppShell
      navbar={{
        width: 72,
        breakpoint: 'sm',
        collapsed: { mobile: false }
      }}
      footer={{
        height: 40,
        collapsed: false
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
            variant={isSettingsRoute ? 'light' : 'subtle'}
            justify="flex-start"
            aria-label="Settings"
          >
            <IconSettings size={18} />
          </Button>
          <Button
            component={Link}
            to="/about"
            variant={isAboutRoute ? 'light' : 'subtle'}
            justify="flex-start"
            aria-label="About"
          >
            <IconInfoCircle size={18} />
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Footer p="xs">
        <Footer />
      </AppShell.Footer>

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
