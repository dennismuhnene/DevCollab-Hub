
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/use-auth';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { AdvisorApplication } from '@/types/advisor';
import { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TagInput } from '@/components/tag-input';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  headline: z.string().min(10, 'Headline must be at least 10 characters.'),
  bio: z.string().min(50, 'Bio must be at least 50 characters.'),
  credentials: z.array(z.string()).min(1, 'Please list at least one credential.'),
  specialties: z.array(z.string()).min(1, 'Please list at least one specialty.'),
});

const ADMIN_UID = 'Jv4XV8flpAgUqJpd2P7SKr3PijX2';
const MAX_SUBMISSIONS = 3;

async function sendAdminNotification(applicantName: string, applicantId: string, applicationDocId: string, isResubmission: boolean) {
    try {
        const notificationsColRef = collection(db, 'users', ADMIN_UID, 'notifications');
        
        const title = isResubmission ? 'Advisor Application Resubmitted' : 'New Advisor Application';
        const message = isResubmission 
            ? `${applicantName} has resubmitted their advisor application for review.`
            : `${applicantName} has submitted a new application for review.`;

        await addDoc(notificationsColRef, {
            type: 'system',
            title: title,
            message: message,
            link: `/admin/applications/${applicantId}/${applicationDocId}`,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending admin notification: ", error);
    }
}

interface AdvisorApplicationFormProps {
  userProfile: UserProfile;
  application: AdvisorApplication | null;
  isNewApplication: boolean;
  onFormSubmit: () => void; // <-- FIXED: Added the missing prop
}

export function AdvisorApplicationForm({ userProfile, application: initialApplication, isNewApplication, onFormSubmit }: AdvisorApplicationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [application, setApplication] = useState(initialApplication);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: application?.headline || '',
      bio: application?.bio || '',
      credentials: application?.credentials || [],
      specialties: application?.specialties || [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !application) return; // Return if application is null
    setIsSubmitting(true);

    const currentSubmissionCount = application?.submissionCount || 0;

    const applicationData: Omit<AdvisorApplication, 'id'> = {
      ...values,
      slot: application.slot, // <-- FIXED: Ensure slot is always included
      verificationStatus: 'pending',
      submissionCount: isNewApplication ? 1 : currentSubmissionCount + 1,
      editCount: application?.editCount ? application.editCount + 1 : 1,
      createdAt: application?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (isNewApplication && !application.id) { // Ensure we are creating a new doc
        const newAppRef = await addDoc(collection(db, 'users', user.uid, 'advisorApplications'), applicationData);
        setApplication({ id: newAppRef.id, ...applicationData } as AdvisorApplication);
        await sendAdminNotification(userProfile.name || 'Anonymous', user.uid, newAppRef.id, false);
        toast({ title: 'Application Submitted Successfully!' });
      } else if (application?.id) {
        const appRef = doc(db, 'users', user.uid, 'advisorApplications', application.id);
        await updateDoc(appRef, { ...applicationData });
        setApplication(prev => ({ ...prev!, ...applicationData }));
        await sendAdminNotification(userProfile.name || 'Anonymous', user.uid, application.id, true);
        toast({ title: 'Application Updated and Resubmitted' });
      }
      onFormSubmit(); // <-- FIXED: Call the callback on success
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({ variant: 'destructive', title: 'Error submitting application.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const submissionCount = application?.submissionCount || 0;
  const remainingSubmissions = MAX_SUBMISSIONS - submissionCount;

  if (application?.verificationStatus === 'pending') {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Application Pending</CardTitle>
                <CardDescription>Your application has been submitted and is awaiting review by our team.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>You will be notified once the review process is complete. Thank you for your patience.</p>
            </CardContent>
        </Card>
      );
  }

  if (application?.verificationStatus === 'verified') {
    return (
      <Card className="border-green-500">
        <CardHeader>
            <CardTitle className="text-green-600">Application Approved</CardTitle>
            <CardDescription>Congratulations! Your advisor profile is now active and visible to others.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (application?.verificationStatus === 'rejected' && remainingSubmissions <= 0) {
    return (
      <Card className="border-red-500">
        <CardHeader>
            <CardTitle className="text-red-600">Application Rejected</CardTitle>
            <CardDescription>You have used all of your submission attempts for this application.</CardDescription>
        </CardHeader>
         <CardContent>
            <p>Please contact support for further assistance or to appeal this decision.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNewApplication ? 'Become an Advisor' : 'Update Your Application'}</CardTitle>
        {application?.verificationStatus === 'rejected' && (
             <CardDescription className="text-orange-600">
                Your previous application was rejected. You have {remainingSubmissions} attempt(s) remaining. Please review your details and resubmit.
             </CardDescription>
        )}
        {isNewApplication && (
            <CardDescription>Complete the form below to apply. You have {remainingSubmissions} submission attempts.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="headline" render={({ field }) => (<FormItem><FormLabel>Headline</FormLabel><FormControl><Input placeholder="e.g., Go-to-Market Strategist for SaaS Startups" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Advisor Bio</FormLabel><FormControl><Textarea placeholder="Tell us about your experience, your areas of expertise, and what makes you a great advisor." className="resize-none" rows={5} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="credentials" render={({ field }) => (<FormItem><FormLabel>Credentials</FormLabel><FormControl><TagInput {...field} placeholder="Type a credential (e.g., PhD, MBA) and press Enter" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="specialties" render={({ field }) => (<FormItem><FormLabel>Specialties</FormLabel><FormControl><TagInput {...field} placeholder="Type a specialty (e.g., Marketing, Fundraising) and press Enter" /></FormControl><FormMessage /></FormItem>)} />
            
            <Button type="submit" disabled={isSubmitting || remainingSubmissions <= 0}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                application?.verificationStatus === 'rejected' ? 'Resubmit Application' : 'Submit Application'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
