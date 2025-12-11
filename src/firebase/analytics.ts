import { sendGAEvent } from '@next/third-parties/google';

/**
 * Logs an analytics event.
 * 
 * @param eventName The name of the event.
 * @param eventParams Optional custom parameters.
 */
export const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, any>) => {
    try {
        sendGAEvent(eventName, eventParams || {});
    } catch (err) {
        console.error("GA event send failed:", err);
    }
};
