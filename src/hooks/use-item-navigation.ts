'use client';

import { useEffect } from 'react';

type KeyboardNavigationProps = {
    isOpen: boolean;
    onNext: () => void;
    onPrevious: () => void;
    onGoToFirst: () => void;
    onGoToLast: () => void;
};

export const useItemNavigation = ({
    isOpen,
    onNext,
    onPrevious,
    onGoToFirst,
    onGoToLast,
}: KeyboardNavigationProps) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    onNext();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    onPrevious();
                    break;
                case 'Home':
                    event.preventDefault();
                    onGoToFirst();
                    break;
                case 'PageDown': // As requested by user
                case 'End':
                    event.preventDefault();
                    onGoToLast();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onNext, onPrevious, onGoToFirst, onGoToLast]);
};