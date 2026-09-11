import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const ActivityPage = lazy(() => import('./pages/ActivityPage.jsx'));
const ChallengePage = lazy(() => import('./pages/ChallengePage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#00f2fe]" />
      <span className="text-xs font-mono text-cyan-400 font-bold tracking-wider animate-pulse uppercase">
        Loading GeoFit Grid...
      </span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
