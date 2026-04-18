import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AccessPage from './pages/AccessPage';
import ModeSelect from './pages/ModeSelect';
import VerifyPage from './pages/VerifyPage';
import PremiumPage from './pages/PremiumPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AccessPage />} />
        <Route path="/select" element={<ModeSelect />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
