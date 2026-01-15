'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/use-auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { questions } from '@/lib/questions';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface FeedbackData {
  answers: { [key: string]: string | number | string[] };
  hasBeenUpdated?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | number | string[] }>({});
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const TEXTAREA_MAX_LENGTH = 500;
  const TEXT_INPUT_MAX_LENGTH = 150;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchPreviousSubmission = async () => {
      if (user && isOpen) {
        setIsLoading(true);
        const feedbackDocRef = doc(db, 'feedback', user.uid);
        try {
          const docSnap = await getDoc(feedbackDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as FeedbackData;
            setFeedbackData(data);
            setAnswers(data.answers || {});
          } else {
            setFeedbackData(null);
            setAnswers({}); // Reset answers for a new submission
          }
        } catch (error) {
          console.error("Failed to check for previous submissions:", error);
          setFeedbackData(null); // Assume no submission if there's a permission error
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPreviousSubmission();
  }, [user, isOpen]);

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleCheckboxChange = (questionId: string, option: string, isChecked: boolean) => {
    const currentAnswers = (answers[questionId] as string[] || []);
    let newAnswers;
    if (isChecked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter((item) => item !== option);
    }
    setAnswers({ ...answers, [questionId]: newAnswers });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);

    const feedbackDocRef = doc(db, 'feedback', user.uid);

    try {
      const submissionData: any = {
        userId: user.uid,
        answers,
        updatedAt: serverTimestamp(),
        url: window.location.href,
      };

      if (isEditing) {
        submissionData.hasBeenUpdated = true;
      } else if (!feedbackData) { // Only set these on initial creation
        submissionData.createdAt = serverTimestamp();
        submissionData.hasBeenUpdated = false;
      }

      await setDoc(feedbackDocRef, submissionData, { merge: true });

      logAnalyticsEvent(isEditing ? 'feedback_updated' : 'feedback_submitted', { user_id: user.uid });
      setSubmissionStatus('success');
    } catch (error) {
      console.error('Error submitting feedback: ', error);
      if (error instanceof Error && (error.message.includes('offline') || error.message.includes('network'))) {
          setErrorMessage("It seems you're offline. Please check your network connection and try again.");
      } else {
          setErrorMessage("Sorry, something went wrong on our end. Please try again later.");
      }
      setSubmissionStatus('error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setFormStarted(true);
    setSubmissionStatus('idle');
  };

  const resetForm = () => {
    setIsOpen(false);
    setTimeout(() => {
        setCurrentQuestionIndex(0);
        setFormStarted(false);
        setSubmissionStatus('idle');
        setIsEditing(false);
    }, 300);
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = (currentQuestionIndex / (questions.length - 1)) * 100;

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    return <div key={currentQuestion.id}>{renderQuestionSwitch()}</div>;
  };

  const renderQuestionSwitch = () => {
    switch (currentQuestion.type) {
        case 'text': {
            const value = (answers[currentQuestion.id] as string) || '';
            return (
              <div>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  maxLength={TEXT_INPUT_MAX_LENGTH}
                  placeholder="Your answer..."
                />
                <div className="text-right text-sm text-muted-foreground mt-1">
                  {TEXT_INPUT_MAX_LENGTH - value.length} characters remaining
                </div>
              </div>
            );
        }
      case 'textarea': {
        const value = (answers[currentQuestion.id] as string) || '';
        return (
          <div>
            <Textarea
              value={value}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="Your detailed feedback..."
              className="min-h-[120px]"
              maxLength={TEXTAREA_MAX_LENGTH}
            />
            <div className="text-right text-sm text-muted-foreground mt-1">
                {TEXTAREA_MAX_LENGTH - value.length} characters remaining
            </div>
          </div>
        );
    }
      case 'multiple-choice':
        return (
          <RadioGroup
            value={(answers[currentQuestion.id] as string) || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            {currentQuestion.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${currentQuestion.id}-${option}`} />
                <Label htmlFor={`${currentQuestion.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${currentQuestion.id}-${option}`}
                  checked={((answers[currentQuestion.id] as string[]) || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(currentQuestion.id, option, !!checked)}
                />
                <Label htmlFor={`${currentQuestion.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      case 'slider':
        return (
          <div className="flex flex-col gap-4 pt-2">
            <Slider
              value={[(answers[currentQuestion.id] as number) || currentQuestion.min || 0]}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value[0])}
              min={currentQuestion.min}
              max={currentQuestion.max}
              step={1}
            />
            <div className="flex justify-between text-xs text-center text-gray-500 gap-1">
              {currentQuestion.labels?.map((label: string, index: number) => (
                 <span key={index} className="flex-1">{label}</span>
              ))}
            </div>
          </div>
        );
      case 'nps':
        return (
            <div className="flex flex-wrap gap-2 justify-center">
                {[...Array(11).keys()].map(value => (
                    <Button 
                        key={value} 
                        variant={answers[currentQuestion.id] === value ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(currentQuestion.id, value)}
                        className="w-8 h-8 sm:w-10 sm:h-10"
                    >
                        {value}
                    </Button>
                ))}
            </div>
        )
      default:
        return null;
    }
  }

  if (!isClient) {
    return <Button variant="outline">Feedback</Button>;
  }

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="p-4 sm:p-8 flex items-center justify-center h-full">
                <DialogTitle className="sr-only">Loading</DialogTitle>
                <DialogDescription className="sr-only">Loading previous feedback submission.</DialogDescription>
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    if (submissionStatus === 'success') {
        return (
           <div className="p-4 sm:p-8 text-center flex flex-col items-center justify-center h-full">
               <DialogTitle className="text-2xl font-bold mb-2">Response Saved!</DialogTitle>
               <DialogDescription className="mb-6">
                   Thank you for your valuable feedback. It helps us make DevCollab Hub better for everyone.
               </DialogDescription>
               <Button onClick={resetForm}>Close</Button>
           </div>
        );
   }
   if (submissionStatus === 'error') {
        return (
           <div className="p-4 sm:p-8 text-center flex flex-col items-center justify-center h-full">
               <DialogTitle className="text-2xl font-bold mb-2 text-red-600">Submission Failed</DialogTitle>
               <DialogDescription className="mb-6">
                   {errorMessage || "An unexpected error occurred. Please try again."}
               </DialogDescription>
               <Button onClick={() => setSubmissionStatus('idle')}>Try Again</Button>
           </div>
        );
   }
    // User has submitted and already updated their feedback once.
    if (feedbackData && feedbackData.hasBeenUpdated) {
        return (
            <div className="p-4 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                <DialogTitle className="text-2xl font-bold mb-2">Thank You!</DialogTitle>
                <DialogDescription className="mb-6">
                    We have recorded your updated feedback. Thank you for helping us improve.
                </DialogDescription>
                <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
        );
    }
    // User has submitted but has NOT updated their feedback yet.
    if (feedbackData && !isEditing) {
        return (
            <div className="p-4 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                <DialogTitle className="text-xl font-bold mb-2">Thank you for your feedback</DialogTitle>
                <DialogDescription asChild>
                  <div className="mb-6">
                    We have a record of your previous responses.
                    <p className="font-semibold text-orange-600 mt-4">Please note: This will be the only update to your responses.</p>
                  </div>
                </DialogDescription>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                    <Button onClick={startEditing}>Update My Answers</Button>
                </div>
            </div>
        );
    }
    // This is the first time the user is giving feedback.
    if (!formStarted) {
      return (
        <div className="p-4 sm:p-8 text-center flex flex-col items-center justify-center h-full">
            <DialogTitle className="text-m font-bold mb-2">We Value Your Feedback!</DialogTitle>
            <DialogDescription className="mb-6">
                Thank you for helping us improve DevCollab Hub. This should only take about 3-4 minutes.
            </DialogDescription>
            <Button onClick={() => setFormStarted(true)}>Start Feedback</Button>
        </div>
      )
    }
    // The main form for submitting or editing.
    return (
        <div className="p-4 sm:p-8 flex flex-col h-full">
            <DialogHeader className="mb-4">
                <DialogTitle>Question {currentQuestionIndex + 1} of {questions.length}</DialogTitle>
                {currentQuestion && <DialogDescription className="sr-only">{currentQuestion.question}</DialogDescription>}
            </DialogHeader>
            <div className="flex-grow">
                <p className="mb-4 font-medium text-lg">{currentQuestion.question}</p>
                {renderQuestion()}
            </div>
            <div className="mt-8">
                <Progress value={progress} className="mb-4" />
                <div className="flex justify-between items-center">
                {currentQuestionIndex > 0 ? (
                    <Button variant="outline" onClick={handlePrevious}>
                    Previous
                    </Button>
                ) : <div />}
                
                {currentQuestionIndex < questions.length - 1 ? (
                    <Button onClick={handleNext}>Next</Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Saving...' : isEditing ? 'Save & Finalize Update' : 'Save Responses'}
                    </Button>
                )}
                </div>
            </div>
        </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Feedback</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full grid md:grid-cols-2 gap-0 p-0">
        <div className="bg-gray-100 p-8 flex-col items-center justify-center text-center hidden md:flex">
          <Image
            src="/images/devcollab-logo.png"
            alt="DevCollab Logo"
            width={140}
            height={140}
          />
          <h3 className="text-2xl font-bold">DevCollab</h3>
          <p className="text-sm text-gray-600">Find your Crew, build your vision.</p>
        </div>
        <div className='min-h-[500px]'>
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
