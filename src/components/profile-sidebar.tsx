'use client';

import { Button } from '@/components/ui/button';
import { User, FileText, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface ProfileSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function ProfileSidebar({ activeView, setActiveView, isCollapsed, setIsCollapsed }: ProfileSidebarProps) {
  return (
    <div className={`flex flex-col space-y-2 transition-all duration-300 ${isCollapsed ? 'items-center' : ''}`}>
      <Button
        variant="ghost"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full justify-start"
      >
        {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 mx-auto" />
        ) : (
            <div className="flex items-center">
                <PanelLeftClose className="mr-2 h-4 w-4" />
                <span>Collapse</span>
            </div>
        )}
      </Button>
      <Button
        variant={activeView === 'profile' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('profile')}
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}>
        <User className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
        {!isCollapsed && <span>Profile</span>}
      </Button>
      <Button
        variant={activeView === 'advisory-applications' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('advisory-applications')}
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}>
        <FileText className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
        {!isCollapsed && <span>Advisory</span>}
      </Button>
      <Button
        variant={activeView === 'settings' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('settings')}
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}>
        <Settings className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
        {!isCollapsed && <span>Settings</span>}
      </Button>
    </div>
  );
}
