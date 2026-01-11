'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  const sections: {
    id: number;
    title: string;
    content: {
        subtitle?: string;
        description?: string;
        points?: string[];
        footer?: string;
    }[];
  }[] = [
    {
      id: 1,
      title: "1. About the Service",
      content: [
        {
          points: ["DevCollab Hub is owned and operated by NeuralAxis Labs. The platform is designed to help software developers, tech professionals, and experts connect. Its features include user profiles, a discovery hub for projects and roles, a matching system, direct messaging, and a marketplace for expert advisory services."]
        }
      ]
    },
    {
      id: 2,
      title: "2. Eligibility and Accounts",
      content: [
        {
          description: "To use the platform, you must be at least 16 years old and agree to provide accurate information. You are responsible for all activities under your account and must not share your login credentials.",
          points: [
            "Accounts can be created via email/password or Google OAuth.",
            "You must not create misleading profiles, impersonate others, or use automated tools to access the service.",
          ]
        }
      ]
    },
    {
      id: 3,
      title: "3. User Content and Conduct",
      content: [
        {
          subtitle: "3.1 Content Ownership",
          points: ["You retain ownership of all content you post, including your profile details, project descriptions, role postings, and messages. By posting, you grant NeuralAxis Labs a license to display and process this content to operate the platform."]
        },
        {
          subtitle: "3.2 Prohibited Content and Actions",
          description: "You agree not to upload content or engage in behavior that is harassing, defamatory, illegal, or infringing on intellectual property. You must not interfere with the platform’s operation, attempt to access data you don’t own, or misuse the messaging or advisory features.",
          footer: "Violations can result in content removal, account suspension, or permanent termination."
        }
      ]
    },
    {
      id: 4,
      title: "4. Platform Features",
      content: [
        {
          subtitle: "4.1 Projects vs. Roles",
          points: ["The platform allows you to create public-facing Projects to build a team around an idea, and more discreet Roles for specific, targeted needs. You are responsible for the accuracy and legality of the content in your listings."]
        },
        {
          subtitle: "4.2 AI Insights",
          points: ["The AI-powered insights are for informational purposes only. They are generated from aggregated data and are not a guarantee of success. NeuralAxis Labs is not liable for any decisions you make based on these AI suggestions."]
        },
        {
            subtitle: "4.3 Collaboration and Matching",
            points: ["The platform facilitates connections but does not guarantee the success or quality of any collaboration. NeuralAxis Labs is not a party to any agreement between users and is not responsible for disputes. We encourage you to perform your own due diligence before collaborating."]
        },
      ]
    },
    {
        id: 5,
        title: "5. Expert Advisory Marketplace",
        content: [
            {
                subtitle: "5.1 For Advisors",
                points: [
                    "If you apply to be an advisor, you agree to provide accurate information about your skills and credentials.",
                    "Approved advisors are part of the marketplace but are not employees or agents of NeuralAxis Labs.",
                    "You agree to engage with users professionally and ethically.",
                ]
            },
            {
                subtitle: "5.2 For Users Seeking Advice",
                points: [
                    "The advisors on our platform are independent experts. NeuralAxis Labs vets applications but does not endorse any specific advisor or guarantee the quality or accuracy of their advice.",
                    "You are responsible for any fees or agreements made with an advisor.",
                    "Engagements are governed by the terms agreed upon between you and the advisor."
                ]
            },
            {
                subtitle: "5.3 Scheduling and Google Calendar Integration",
                points: [
                    "To schedule advisory sessions, our application will request permission to create an event on your Google Calendar.",
                    "This feature is solely for scheduling confirmed engagements. By authorizing access, you allow the app to add an event with the session details and a Google Meet link to your calendar. The app will not read, modify, or delete other events.",
                    "Use of this feature is subject to Google’s terms and privacy policies."
                ]
            }
        ]
    },
    {
        id: 6,
        title: "6. Intellectual Property",
        content: [{
            points: ["All platform code, designs, logos, and content created by NeuralAxis Labs are its exclusive property. You may not copy, modify, or reproduce any part of our platform without explicit permission."]
        }]
    },
    {
        id: 7,
        title: "7. Disclaimers and Limitation of Liability",
        content: [{
            description: "The DevCollab Hub service is provided 'as is.' NeuralAxis Labs is not liable for any damages arising from your use of the platform, including but not limited to:",
            points: [
                "Loss of data or profits.",
                "Disputes or damages resulting from interactions with other users or advisors.",
                "Inaccuracies in user-generated content or AI-generated insights.",
            ],
        }]
    },
    {
        id: 8,
        title: "8. Termination",
        content: [{
            points: [
                "NeuralAxis Labs reserves the right to suspend or terminate your account for violations of these Terms.",
                "You may delete your account at any time by contacting us."
            ]
        }]
    },
    {
        id: 9,
        title: "9. Governing Law",
        content: [{
            points: ["These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles."]
        }]
    },
    {
        id: 10,
        title: "10. Contact Information",
        content: [{
            description: "For questions about these Terms, please visit the "
        }]
    }
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center">Terms of Service</CardTitle>
              <CardDescription className="text-sm text-center">Your agreement for using DevCollab Hub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Welcome to DevCollab Hub. These Terms of Service ('Terms') govern your access to and use of the platform and its services. By creating an account or using DevCollab Hub, you agree to be bound by these Terms.</p>
              <Badge variant="secondary">Last Updated: January 9, 2026</Badge>
            </CardContent>
          </Card>

          {sections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.content.map((item, index) => (
                  <div key={index}>
                    {item.subtitle && <h4 className="font-semibold text-sm mb-2">{item.subtitle}</h4>}
                    {item.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                            {item.description}
                            {section.id === 10 && (
                                <Link href="/#contact" className="text-primary hover:underline">contact form</Link>
                            )}
                        </p>
                    )}
                    {item.points && (
                      <ul className="space-y-2">
                        {item.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.footer && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{item.footer}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
