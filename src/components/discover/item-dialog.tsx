'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DeveloperProfileContent } from '../../app/(main)/developers/[id]/page';
import { ProjectDetailsContent } from '../../app/(main)/projects/[id]/page';
import { RoleDetailsContent } from '../../app/(main)/roles/[roleId]/page';
import { useDrag } from '@use-gesture/react';

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
    if(open) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, open]);

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, items.length - 1));
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const bind = useDrag(
    ({ down, swipe: [swipeX] }) => {
      if (down) return;
      if (swipeX) {
        swipeX < 0 ? handleNext() : handlePrevious();
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      swipe: { distance: 10 },
    }
  );
  
  const item = items[currentIndex];
  
  if (!item) {
    return null;
  }

  const title = viewMode === 'developers' ? item.name : item.title;
  const description = viewMode === 'developers' ? `Viewing profile for ${item.name}` : `Viewing details for ${item.title}`;

  const renderContent = () => {
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
        className="max-w-4xl h-[90vh] flex flex-col p-0 relative"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Mobile Navigation Arrows */}
        <div className="md:hidden absolute top-1/2 -translate-y-1/2 left-1 z-20">
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="rounded-full h-8 w-8 bg-black/20 text-white hover:bg-black/40 disabled:bg-transparent disabled:text-gray-400"
            >
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </div>
        <div className="md:hidden absolute top-1/2 -translate-y-1/2 right-1 z-20">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === items.length - 1}
                className="rounded-full h-8 w-8 bg-black/20 text-white hover:bg-black/40 disabled:bg-transparent disabled:text-gray-400"
            >
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>

        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto relative">
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
