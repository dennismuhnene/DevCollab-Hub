
'use client';

import { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Mail, Phone, MapPin, Send, Linkedin, Github } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendEmail } from '@/app/(main)/contact/actions';
import { useToast } from '@/hooks/use-toast';
import { useActionState as useReactActionState } from 'react';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'dennis_chomba@outlook.com',
    href: 'mailto:dennis_chomba@outlook.com',
  },
  {
    icon: Phone,
    title: 'Phone',
    value: '+254 (112) 078 119',
    href: 'tel:+254112078119',
  },
  {
    icon: MapPin,
    title: 'Location',
    value: 'Global',
    href: null,
  },
];

const socialLinks = [
  { icon: Github, href: 'https://github.com/chombadennis', label: 'GitHub' },
  {
    icon: Linkedin,
    href: 'https://www.linkedin.com/in/lukk3vdebarezz99l8yy/',
    label: 'LinkedIn',
  },
];

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


export default function ContactPage() {
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
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Get In Touch
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Have a question about the platform, a feature suggestion, or need support with your account? Fill out the form below and the DevCollab Hub team will get back to you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
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
                      placeholder="Project discussion, collaboration, etc."
                      required
                    />
                     {state.errors?.subject && <p className="text-sm text-destructive">{state.errors.subject[0]}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell me about your project or what you'd like to discuss..."
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

          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactInfo.map((info) => (
                <Card key={info.title} className="border-border/50 hover:border-primary/20 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <info.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{info.title}</h3>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="text-muted-foreground hover:text-primary transition-colors break-words"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">{info.value}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-center">
                  Connect With Me
                </h3>
                <div className="flex justify-center space-x-4">
                  {socialLinks.map((social) => (
                    <Button
                      key={social.label}
                      variant="outline"
                      size="lg"
                      className="rounded-full h-12 w-12 p-0 hover:border-primary/40 hover:bg-primary/5"
                      asChild
                    >
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                      >
                        <social.icon className="h-5 w-5" />
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
