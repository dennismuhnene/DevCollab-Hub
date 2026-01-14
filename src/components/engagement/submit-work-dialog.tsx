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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface SubmitWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: any;
  engagementId: string;
}

const SUMMARY_CHAR_LIMIT = 1500;

export default function SubmitWorkDialog({ open, onOpenChange, milestone, engagementId }: SubmitWorkDialogProps) {
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();
  const functions = getFunctions();

  const handleSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    try {
      const submitMilestoneForReview = httpsCallable(functions, 'submitMilestoneForReview');
      await submitMilestoneForReview({
        engagementId: engagementId,
        milestoneId: milestone.id,
        summary: summary.trim(),
      });

      toast({ title: 'Success', description: 'Work submitted for review.' });
      onOpenChange(false);
      setSummary(''); 
    } catch (error: any) {
      console.error("Error submitting work:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit work. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSubmitConfirmation = () => {
    if (!summary.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Summary cannot be empty.' });
        return;
    }
    if (summary.length > SUMMARY_CHAR_LIMIT) {
        toast({ variant: 'destructive', title: 'Error', description: `Summary must be ${SUMMARY_CHAR_LIMIT} characters or less.` });
        return;
    }
    setShowConfirmation(true);
  }

  return (
    <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submit Work for Milestone: {milestone?.description}</DialogTitle>
                    <DialogDescription>
                        Provide a summary of the work you have completed for this milestone. You can save your progress here before submitting.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid w-full gap-2">
                    <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Summarize your work here... The submit button will activate once you start writing."
                        disabled={isSubmitting}
                        rows={6}
                        maxLength={SUMMARY_CHAR_LIMIT}
                    />
                    <p className="text-sm text-muted-foreground text-right">{summary.length} / {SUMMARY_CHAR_LIMIT}</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleOpenSubmitConfirmation} disabled={isSubmitting || !summary.trim()}>
                        {isSubmitting ? 'Submitting...' : 'Submit Work'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action is final and should only be done when work is complete. You cannot edit your summary after submission.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Confirm & Submit</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
