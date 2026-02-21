import { Container, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import PlaylistShufflerApp from './components/PlaylistShufflerApp';

function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });

  return (
    <Container size="xl" py="md" className="app">
      <Header />
      <PlaylistShufflerApp />
      <Footer
        isDarkMode={computedColorScheme === 'dark'}
        onToggleTheme={(isDark) => setColorScheme(isDark ? 'dark' : 'light')}
      />
    </Container>
  );
}

export default App;
