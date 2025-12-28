
'use client';

import { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendEmail } from '@/app/(main)/actions';
import { useToast } from '@/hooks/use-toast';
import { useActionState as useReactActionState } from 'react';
import { cn } from '@/lib/utils';

const WavyDividerInverted = ({ className }: { className?: string }) => (
    <div className={cn("absolute top-0 left-0 w-full overflow-hidden leading-none", className)}>
        <svg
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block h-[60px] md:h-[120px] w-[calc(100%+1.3px)]"
        >
            <path
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                className="fill-background"
            ></path>
        </svg>
    </div>
);

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Sending...
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Send Message
        </>
      )}
    </Button>
  );
}


export default function ContactForm() {
    const { toast } = useToast();
    const [state, formAction] = useReactActionState(sendEmail, {
        message: '',
        errors: undefined,
    });
    
    useEffect(() => {
        if (state.message) {
            if(state.errors && Object.keys(state.errors).length > 0) {
                 toast({
                    title: 'Error',
                    description: state.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Success!',
                    description: state.message,
                });
            }
        }
    }, [state, toast]);


  return (
    <div id="contact" className="relative bg-muted/20 text-foreground">
        <WavyDividerInverted className="fill-muted/20" />
      <div className="container mx-auto max-w-7xl px-4 pt-28 md:pt-40 pb-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Contact Us
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl mx-auto mt-4">
            Have a question about the platform, a feature suggestion, or need support with your account? Fill out the form below and the DevCollab Hub team will get back to you.
          </p>
        </div>

        <div className="grid lg:grid-cols-1 gap-12 max-w-3xl mx-auto">
          <div>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Send className="h-5 w-5 mr-2" />
                  Send a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={formAction} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your full name"
                        required
                      />
                       {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                      />
                       {state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="The subject of your message"
                      required
                    />
                     {state.errors?.subject && <p className="text-sm text-destructive">{state.errors.subject[0]}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us something. Type here"
                      rows={6}
                      required
                    />
                     {state.errors?.message && <p className="text-sm text-destructive">{state.errors.message[0]}</p>}
                  </div>

                  <div className="w-full">
                    <SubmitButton />
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
