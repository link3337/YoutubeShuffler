import {
  AppShell,
  Button,
  Container,
  Stack,
  useComputedColorScheme,
  useMantineColorScheme
} from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import { IconHome, IconSettings } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';
import Footer from './components/layout/Footer';

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const { width } = useViewportSize();

  const location = useLocation();
  const isHomeRoute = location.pathname.toLowerCase() === '/home';
  const footerHeight = width < 1100 ? 72 : width < 1500 ? 80 : 88;

  return (
    <AppShell
      navbar={{
        width: 72,
        breakpoint: 'sm',
        collapsed: { mobile: false }
      }}
      footer={{
        height: footerHeight,
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
            variant={!isHomeRoute ? 'light' : 'subtle'}
            justify="flex-start"
            aria-label="Settings"
          >
            <IconSettings size={18} />
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
