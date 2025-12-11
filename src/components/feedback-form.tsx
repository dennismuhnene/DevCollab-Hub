import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!feedback.trim() || !user) return;

    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        feedback: feedback,
        createdAt: new Date(),
        url: window.location.href,
      });
      logAnalyticsEvent('feedback_submitted', { user_id: user.uid });
      setFeedback('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback: ', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Feedback</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
        </DialogHeader>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your thoughts, suggestions, or report an issue..."
        />
        <Button onClick={handleSubmit} disabled={!feedback.trim()}>
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  );
}
