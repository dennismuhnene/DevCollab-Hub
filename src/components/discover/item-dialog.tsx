'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DeveloperProfileContent } from '../../app/(main)/developers/[id]/page';
import { ProjectDetailsContent } from '../../app/(main)/projects/[id]/page';
import { RoleDetailsContent } from '../../app/(main)/roles/[roleId]/page';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  viewMode: 'developers' | 'projects' | 'posts';
}

export function ItemDialog({ open, onOpenChange, item, viewMode }: ItemDialogProps) {
  if (!item) {
    return null;
  }

  const title = viewMode === 'developers' ? item.name : item.title;
  const description = viewMode === 'developers' ? `Viewing profile for ${item.name}` : `Viewing details for ${item.title}`;

  const renderContent = () => {
    switch (viewMode) {
      case 'developers':
        return <DeveloperProfileContent developer={item} />;
      case 'projects':
        return <ProjectDetailsContent project={item} />;
      case 'posts':
        return <RoleDetailsContent role={item} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
