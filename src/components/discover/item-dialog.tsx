'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DeveloperProfileContent } from '../../app/(main)/developers/[id]/page';
import { ProjectDetailsContent } from '../../app/(main)/projects/[id]/page';
import { RoleDetailsContent } from '../../app/(main)/roles/[roleId]/page';
import { useDrag } from '@use-gesture/react';
import { animated } from '@react-spring/web';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  initialIndex: number;
  viewMode: 'developers' | 'projects' | 'posts';
}

export function ItemDialog({ open, onOpenChange, items, initialIndex, viewMode }: ItemDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    // When the dialog is reopened with a new item, reset the index
    if(open) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, open]);

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const bind = useDrag(
    ({ down, swipe: [swipeX] }) => {
      if (down) return; // a swipe is only registered when the pointer is released
      if (swipeX) {
        swipeX < 0 ? handleNext() : handlePrevious();
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      swipe: { distance: 50 },
    }
  );
  
  const item = items[currentIndex];
  
  // If there's no item (e.g., list is empty), don't render the dialog content
  if (!item) {
    return null;
  }

  const title = viewMode === 'developers' ? item.name : item.title;
  const description = viewMode === 'developers' ? `Viewing profile for ${item.name}` : `Viewing details for ${item.title}`;

  const renderContent = () => {
    // Add a key to the content to ensure it re-renders and resets state (like scroll position) when the item changes.
    switch (viewMode) {
      case 'developers':
        return <DeveloperProfileContent key={item.uid} developer={item} />;
      case 'projects':
        return <ProjectDetailsContent key={item.id} project={item} />;
      case 'posts':
        return <RoleDetailsContent key={item.id} role={item} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        {...bind()} 
        className="max-w-4xl h-[90vh] flex flex-col p-0" 
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          {renderContent()}
        </div>
        <DialogFooter className="hidden md:flex mt-auto p-6 pt-4 border-t flex-shrink-0">
          <div className="flex justify-between w-full">
            <Button onClick={handlePrevious} disabled={currentIndex === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <Button onClick={handleNext} disabled={currentIndex === items.length - 1}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
