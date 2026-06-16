import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { MeasurePage } from './pages/MeasurePage';
import { ProtocolPage } from './pages/ProtocolPage';
import { SettingsPage } from './pages/SettingsPage';
import { SpeakersPage } from './pages/SpeakersPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="speakers" element={<SpeakersPage />} />
          <Route path="measure" element={<MeasurePage />} />
          <Route path="protocol" element={<ProtocolPage />} />
          <Route path="export" element={<Navigate to="/protocol" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
