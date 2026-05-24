import { Navigate, Route, Routes } from 'react-router-dom';
import PlaylistShufflerApp from './PlaylistShufflerApp';
import AboutRoute from './routes/AboutRoute';
import HomeRoute from './routes/HomeRoute';
import SettingsRoute from './routes/SettingsRoute';

type AppRoutesProps = {
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
};

export default function AppRoutes({ isDarkMode, onToggleTheme }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route
        element={<PlaylistShufflerApp isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />}
      >
        <Route path="/home" element={<HomeRoute />} />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/about" element={<AboutRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
