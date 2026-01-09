'use client';

import { Button } from '@/components/ui/button';
import { Eye, Handshake, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface DashboardSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function DashboardSidebar({ activeView, setActiveView, isCollapsed, setIsCollapsed }: DashboardSidebarProps) {
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
        variant={activeView === 'insights' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('insights')}
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}>
        <Eye className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
        {!isCollapsed && <span>Seen & Insights</span>}
      </Button>
      <Button
        variant={activeView === 'engagements' ? 'secondary' : 'ghost'}
        onClick={() => setActiveView('engagements')}
        className={`w-full justify-start ${isCollapsed ? 'justify-center' : ''}`}>
        <Handshake className={`h-4 w-4 ${!isCollapsed ? 'mr-2' : ''}`} />
        {!isCollapsed && <span>Engagements</span>}
      </Button>
    </div>
  );
}
