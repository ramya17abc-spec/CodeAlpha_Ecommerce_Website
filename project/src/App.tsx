import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Loading } from '@/components/Loading';
import AppLayout, { type View } from '@/components/AppLayout';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import ProjectsPage from '@/pages/ProjectsPage';
import BoardView from '@/pages/BoardView';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import type { Project } from '@/types';

function AppContent() {
  const { loading, user } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-50"><Loading /></div>;
  if (!user) return <AuthPage />;

  if (activeProject) {
    return (
      <AppLayout currentView="projects" onViewChange={(v) => { setActiveProject(null); setView(v); }} searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <BoardView project={activeProject} onBack={() => setActiveProject(null)} searchQuery={searchQuery} />
      </AppLayout>
    );
  }

  return (
    <AppLayout currentView={view} onViewChange={setView} searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      {view === 'dashboard' && <Dashboard onViewChange={setView} />}
      {view === 'projects' && <ProjectsPage searchQuery={searchQuery} onOpenProject={(p) => setActiveProject(p)} />}
      {view === 'notifications' && <NotificationsPage />}
      {view === 'profile' && <ProfilePage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
