import {
  AppShell,
  Button,
  Container,
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

  return (
    <AppShell>
      <AppShell.Navbar p="md">
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

      <AppShell.Main>
        <Container size="xl" py="md" className="app">
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
