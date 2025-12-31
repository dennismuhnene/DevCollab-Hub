'use client';

import { Button } from '@/components/ui/button';
import { User, FileText, Settings } from 'lucide-react';

interface ProfileSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function ProfileSidebar({ activeView, setActiveView }: ProfileSidebarProps) {
  return (
    <nav className="flex flex-col space-y-2">
      <Button
        variant={activeView === 'profile' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('profile')}
        className="justify-start"
      >
        <User className="mr-2 h-4 w-4" />
        Profile
      </Button>
      <Button
        variant={activeView === 'advisory-applications' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('advisory-applications')}
        className="justify-start"
      >
        <FileText className="mr-2 h-4 w-4" />
        Advisory
      </Button>
      <Button
        variant={activeView === 'settings' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('settings')}
        className="justify-start"
      >
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </Button>
    </nav>
  );
}
