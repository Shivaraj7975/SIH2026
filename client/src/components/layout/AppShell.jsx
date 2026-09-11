import React, { useState } from 'react';
import Navbar from '../Navbar.jsx';
import DailyChallengeModal from '../DailyChallengeModal.jsx';
import ScenarioDemoModal from '../ScenarioDemoModal.jsx';

export default function AppShell({ children, className = '' }) {
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-purple-600 selection:text-white">

      <Navbar
        onOpenChallenge={() => setIsChallengeModalOpen(true)}
        onOpenDemo={() => setIsDemoModalOpen(true)}
      />

      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 ${className}`}>
        {children}
      </main>

      {/* Global Action Modals */}
      {isChallengeModalOpen && (
        <DailyChallengeModal onClose={() => setIsChallengeModalOpen(false)} />
      )}
      {isDemoModalOpen && (
        <ScenarioDemoModal
          onClose={() => setIsDemoModalOpen(false)}
          onScenarioRun={() => setIsDemoModalOpen(false)}
        />
      )}
    </div>
  );
}
