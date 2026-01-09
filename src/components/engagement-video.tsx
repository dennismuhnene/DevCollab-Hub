'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Engagement, Meeting } from '@/types/advisor';
import { useFirebase } from '@/firebase/provider';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react';

interface EngagementVideoProps {
  engagement: Engagement;
}

async function callManageMeeting(body: any) {
  const functions = getFunctions();
  const manageMeeting = httpsCallable(functions, 'manageMeeting');
  const response = await manageMeeting(body);
  return response.data;
}

export default function EngagementVideo({ engagement }: EngagementVideoProps) {
  const { toast } = useToast();
  const { user: currentUser } = useFirebase();

  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState<string>("09:00");

  const isUserTheAdvisor = currentUser?.uid === engagement.advisorId;
  const isEngagementActive = engagement.status === 'active';

  const meetings: Meeting[] = engagement.meetings ? Object.values(engagement.meetings).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) : [];
  const meetingLimitReached = meetings.length >= 3;

  const handleGoogleCalendarAuth = async () => {
    setIsLoading(true);
    try {
        const functions = getFunctions();
        const getGoogleAuthUrl = httpsCallable(functions, 'getGoogleAuthUrl');
        const result = await getGoogleAuthUrl();
        const { url } = result.data as { url: string };
        window.open(url, 'google-auth', 'width=600,height=700');
        setIsLoading(false);
        setIsPermissionModalOpen(false);
        toast({ title: 'Permissions window opened', description: 'Please complete the authentication in the popup and try your action again.' });
    } catch (error: any) {
        console.error("Google Calendar auth error:", error);
        toast({ variant: 'destructive', title: 'Connection Error', description: error.message || 'Failed to connect Google Calendar.' });
        setIsLoading(false);
    }
  };

  const handleManageMeeting = async () => {
    if (!scheduleDate || !scheduleTime || !currentUser) return;
    setIsLoading(true);
    const action = editingMeeting ? 'reschedule' : 'schedule';

    try {
        if (action === 'schedule' && meetingLimitReached) {
            throw new Error('You can only schedule a maximum of 3 meetings.');
        }
        const currentRescheduleCount = editingMeeting?.rescheduleCount || 0;
        if (action === 'reschedule' && currentRescheduleCount >= 5) {
            throw new Error('This meeting has been rescheduled the maximum number of times.');
        }

        const [hours, minutes] = scheduleTime.split(':').map(Number);
        const startTime = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(), hours, minutes);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const result = await callManageMeeting({
            engagementId: engagement.id,
            action,
            meeting: {
                ...editingMeeting,
                id: editingMeeting?.id,
                eventId: editingMeeting?.eventId,
                title: `DevCollab Session: ${engagement.developerName} & ${engagement.advisorName}`,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                timezone: timezone,
            },
        }) as { message: string };
      
      toast({ title: 'Success', description: result.message });
      setIsScheduleModalOpen(false);
      setEditingMeeting(null);

    } catch (error: any) {
        if (error.code === 'functions/failed-precondition' && !error.message.includes('limit') && !error.message.includes('maximum')) {
            setIsScheduleModalOpen(false);
            setIsPermissionModalOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Action Denied',
                description: error.message || 'Could not perform this action. Please check the rules and try again.',
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelMeeting = async (meeting: Meeting) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const result = await callManageMeeting({
        engagementId: engagement.id,
        action: 'cancel',
        meeting: { id: meeting.id, eventId: meeting.eventId, startTime: meeting.startTime, endTime: meeting.endTime },
      }) as { message: string };
      toast({ title: 'Success', description: result.message });
    } catch (error: any) {
        if (error.code === 'functions/failed-precondition') {
            setIsPermissionModalOpen(true);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not cancel meeting.' });
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleEditClick = (meeting: Meeting) => {
    const rescheduleLimitReached = (meeting.rescheduleCount || 0) >= 5;
    if (rescheduleLimitReached) {
        toast({ variant: 'destructive', title: 'Reschedule Limit Reached', description: 'This meeting cannot be rescheduled again.'});
        return;
    }
    setEditingMeeting(meeting);
    const localDate = new Date(meeting.startTime);
    setScheduleDate(localDate);
    setScheduleTime(`${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`);
    setIsScheduleModalOpen(true);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Video Sessions</CardTitle>
          <CardDescription>
            {isUserTheAdvisor
              ? "Schedule and manage video meetings with your client. A maximum of 3 meetings can be scheduled."
              : "Here are your scheduled video meetings with your advisor."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUserTheAdvisor && isEngagementActive && (
              <div className="space-y-2">
                <Button onClick={() => { setEditingMeeting(null); setScheduleDate(new Date()); setScheduleTime("09:00"); setIsScheduleModalOpen(true); }} disabled={isLoading || meetingLimitReached}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Schedule New Call
                </Button>
                {meetingLimitReached && <p className='text-sm text-amber-600 font-medium'>You have reached the maximum of 3 meetings. To schedule a new one, please cancel or reschedule an existing meeting.</p>}
              </div>
          )}
          <div className="space-y-3">
            {meetings.length > 0 ? (
              meetings.map((meeting) => {
                const rescheduleCount = meeting.rescheduleCount || 0;
                const rescheduleLimitReached = rescheduleCount >= 5;
                return (
                    <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                            <p className="font-semibold">{meeting.title}</p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(meeting.startTime).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className={`text-xs mt-1 ${rescheduleLimitReached ? 'text-destructive' : 'text-muted-foreground'}`}>
                                Rescheduled {rescheduleCount} {rescheduleCount === 1 ? 'time' : 'times'}. {rescheduleLimitReached && "(Limit reached)"}
                            </p>
                            {meeting.meetLink && (
                            <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-2 block">
                                Join Meeting
                            </a>
                            )}
                        </div>
                        {isUserTheAdvisor && isEngagementActive && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEditClick(meeting)} disabled={isLoading || rescheduleLimitReached}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleCancelMeeting(meeting)} disabled={isLoading}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
              )
            ) : (
              <p className="text-sm text-muted-foreground">No meetings scheduled yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMeeting ? 'Reschedule Meeting' : 'Schedule a New Meeting'}</DialogTitle>
            <DialogDescription>Select a date and time for your meeting. Times are shown in your local timezone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} className="rounded-md border" disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} />
            <Select onValueChange={setScheduleTime} defaultValue={scheduleTime}>
              <SelectTrigger><SelectValue placeholder="Select a time" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 * 2 }, (_, i) => {
                  const hour = Math.floor(i / 2);
                  const minute = (i % 2) * 30;
                  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                  return <SelectItem key={time} value={time}>{new Date(new Date().setHours(hour, minute)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
             <Button onClick={() => setIsScheduleModalOpen(false)} variant="ghost">Cancel</Button>
            <Button onClick={handleManageMeeting} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : (editingMeeting ? 'Confirm Reschedule' : 'Confirm Schedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Calendar Permissions Needed</DialogTitle>
            <DialogDescription>To schedule meetings, this application needs permission to access your Google Calendar. Please connect your account to continue.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
             <Button onClick={() => setIsPermissionModalOpen(false)} variant="ghost">Cancel</Button>
            <Button onClick={handleGoogleCalendarAuth} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Connect Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
