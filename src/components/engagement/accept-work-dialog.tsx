'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AcceptWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: any;
  engagementId: string;
}

const SUMMARY_CHAR_LIMIT = 1500;

export default function AcceptWorkDialog({ open, onOpenChange, milestone, engagementId }: AcceptWorkDialogProps) {
  const [reflection, setReflection] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const { toast } = useToast();
  const functions = getFunctions();

  const handleSubmit = async () => {
    if (reflection.length > SUMMARY_CHAR_LIMIT) {
        toast({ variant: 'destructive', title: 'Error', description: `Reflection must be ${SUMMARY_CHAR_LIMIT} characters or less.` });
        return;
    }

    setIsAccepting(true);
    try {
      const acceptMilestone = httpsCallable(functions, 'acceptMilestoneAndLogOutcome');
      await acceptMilestone({
        engagementId: engagementId,
        milestoneId: milestone.id,
        developerReflection: reflection.trim(),
      });

      toast({ title: 'Success', description: 'Milestone accepted and your reflection has been saved.' });
      onOpenChange(false);
      setReflection('');
    } catch (error: any) {
      console.error("Error accepting work:", error);
      toast({
        variant: 'destructive',
        title: 'Error', 
        description: error.message || 'Failed to accept milestone. Please try again.',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Accept Milestone & Provide Reflection</DialogTitle>
          <DialogDescription>
            Review the advisor's summary and provide your own reflection on this milestone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Advisor's Summary</CardTitle>
                    <CardDescription>{milestone.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-wrap' }}>
                        {milestone.advisorSummary || 'No summary was provided.'}
                    </p>
                </CardContent>
            </Card>
            <div className="grid w-full gap-2">
                <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What did you learn? How did this milestone contribute to your project? (Optional)"
                    disabled={isAccepting}
                    rows={5}
                    maxLength={SUMMARY_CHAR_LIMIT}
                />
                <p className="text-sm text-muted-foreground text-right">{reflection.length} / {SUMMARY_CHAR_LIMIT}</p>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAccepting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isAccepting}>
            {isAccepting ? 'Accepting...' : 'Accept & Complete Milestone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
