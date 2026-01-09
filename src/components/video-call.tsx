'use client';

import { useEffect, useRef } from 'react';
import { DailyProvider, useCallFrame } from '@daily-co/daily-react';

interface VideoCallProps {
  roomUrl: string;
  token: string;
  name: string;
  onLeave: () => void; 
}

/**
 * React-safe Daily Prebuilt integration.
 * This is the ONLY supported way to avoid duplicate iframe errors
 * in React + Next.js applications.
 */
export const VideoCall = ({ roomUrl, token, name, onLeave }: VideoCallProps) => {
  const containerRef = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement>;

  const callFrame = useCallFrame({
    parentElRef: containerRef,
    options: {
      showLeaveButton: true,
      iframeStyle: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: '0',
        left: '0',
        border: '0',
        zIndex: '10',
      },
    },
  });

  useEffect(() => {
    if (!callFrame) return;

    callFrame.join({
      url: roomUrl,
      userName: name,
      token,
    });

    const handleLeftMeeting = () => {
        onLeave();
    }

    callFrame.on('left-meeting', handleLeftMeeting);

    // --- Cleanup function ---
    return () => {
      // The useCallFrame hook manages the lifecycle of the call object.
      // We are only responsible for cleaning up the event listeners we manually added.
      callFrame.off('left-meeting', handleLeftMeeting);
    };
  }, [callFrame, roomUrl, token, name, onLeave]);

  return (
    <DailyProvider callObject={callFrame}>
      <div ref={containerRef} className="w-full h-full relative" />
    </DailyProvider>
  );
};
