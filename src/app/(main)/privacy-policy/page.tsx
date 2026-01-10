'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const policySections: {
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
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "1.1 Account Information",
          points: [
            "Full name",
            "Email address",
            "Hashed password (if signing up with email)",
            "Profile picture (photoURL)",
            "If you sign up using Google OAuth, we collect your name, email, and profile picture from your Google account to create your DevCollab Hub profile."
          ]
        },
        {
          subtitle: "1.2 User-Generated Profile Information",
          description: "You can voluntarily add more details to your profile to enhance your network presence, including:",
          points: [
            "Biographical summary (bio)",
            "Location, years of experience, and technologies you use (techStack)",
            "Professional skills (up to 5)",
            "Your collaboration status, goals, and commitment level",
            "Links to external sites like GitHub, a personal portfolio, or social media",
          ]
        },
        {
            subtitle: "1.3 Project and Role Information",
            description: "When you create a public Project or a more confidential Role, we collect the information you provide, such as:",
            points: [
              "Project/Role title and description",
              "Required skills and technologies",
              "Collaboration details like experience level and commitment",
            ]
        },
        {
            subtitle: "1.4 Advisor and Engagement Information",
            description: "For our Expert Advisory Marketplace, we collect information related to the entire engagement lifecycle:",
            points: [
                "Advisor Applications: If you apply to be an advisor, we collect your proposed specialties, credentials, and professional headline.",
                "Engagement Requests: When a user requests a session, we collect their problem statement and session goals to provide context to the advisor.",
                "Reviews and Feedback: After an engagement is completed, we collect ratings and written testimonials from both the user and the advisor."
            ]
        },
        {
          subtitle: "1.5 Interaction and Collaboration Data",
          points: [
            "Records of interest shown in projects or roles",
            "Match records when two users agree to connect",
            "Private messages exchanged between matched users",
            "Notifications related to platform activity",
          ]
        },
        {
          subtitle: "1.6 AI Insights Data",
          description: "To generate on-demand AI insights, we process data from your profile and the profiles of users who have engaged with your projects. This data includes:",
          points: [
            "Aggregated professional details like skills, tech stack, and experience.",
            "This feature is user-initiated and the analysis does not access private messages or identify individual users in its output.",
          ]
        },
        {
            subtitle: "1.7 Google Calendar Data",
            description: "To facilitate scheduling for our advisory service, we request access to your Google Calendar for the sole purpose of creating events. Use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
            points: [
                "We request permission for the 'https://www.googleapis.com/auth/calendar.events' scope.",
                "When an advisory engagement is confirmed, our application uses this permission to create a calendar event with the session details and a Google Meet link on both the user's and the advisor's calendars.",
                "The application ONLY creates events for confirmed engagements. It DOES NOT read, update, or delete any other existing events from your Google Calendar."
            ]
        },
        {
          subtitle: "1.8 Automatically Collected Technical Information",
          points: [
            "Device and browser information",
            "IP address",
            "Usage logs and analytics events to help us understand platform usage",
          ]
        }
      ]
    },
    {
      id: 2,
      title: "2. How We Use Your Information",
      content: [
        {
          description: "NeuralAxis Labs uses your information to:",
          points: [
            "Create, maintain, and secure your account",
            "Display your profile and projects to other users to enable connections",
            "Facilitate the matching process and enable direct messaging",
            "Operate the Expert Advisory Marketplace, from vetting advisor applications to enabling engagement reviews",
            "Schedule advisory sessions on your Google Calendar when you are part of a confirmed engagement",
            "Provide AI-powered insights to help you understand your collaboration potential",
            "Send you important notifications about platform activity",
            "Improve the platform, monitor performance, and prevent fraudulent activity",
          ]
        }
      ]
    },
    {
        id: 3,
        title: "3. How We Share Your Information",
        content: [
          {
              subtitle: "3.1 With Other Users",
              points: [
                "Your public profile, created projects, and any advisor profile details (if applicable) are visible to other users.",
                "Your confidential Roles are only visible in the discovery hub and do not link back to your public profile until you decide to match.",
                "Reviews you leave for an advisor are displayed publicly on that advisor's profile.",
                "Private messages are visible only to the participants in that specific chat.",
              ]
          },
          {
            subtitle: "3.2 With Service Providers",
            points: [
              "We use third-party services for hosting (e.g., Firebase), analytics, and other essential services. These providers only process data on our behalf to support the platform.",
            ]
          },
          {
            subtitle: "3.3 For Legal Compliance or Business Transfers",
            points: [
              "We may disclose information if required by law or as part of a business transaction like a merger or acquisition.",
            ]
          }
        ]
      },
      {
        id: 4,
        title: "4. Data Storage, Security, and Retention",
        content: [
          {
            points: [
              "All data is stored securely in Firebase/Google Cloud infrastructure.",
              "We retain your information as long as your account is active. When you request account deletion, we initiate a process to permanently delete your personal profile and associated content, including projects, roles, and matches, in accordance with our data deletion functions.",
              "While we implement industry-standard security practices, no system is perfectly secure. We encourage you to use a strong password and protect your account credentials.",
            ]
          }
        ]
      },
      {
          id: 5,
          title: "5. Your Rights and Choices",
          content: [{
              points: [
                  "You have the right to access and update your profile information at any time through the '/profile' page.",
                  "You can create or delete your projects and roles at any time.",
                  "You can request the permanent deletion of your account and associated data by contacting us.",
              ],
              footer: "To exercise these rights, please visit the "
          }]
      },
      {
          id: 6,
          title: "6. Children’s Privacy",
          content: [{
              points: ["DevCollab Hub is not intended for individuals under the age of 16. We do not knowingly collect data from minors."]
          }]
      },
      {
          id: 7,
          title: "7. Changes to This Policy",
          content: [{
              points: ["We may update this Privacy Policy to reflect changes in our platform. We will notify you of significant changes, and your continued use of the service means you accept the updated policy."]
          }]
      },
      {
          id: 8,
          title: "8. Contact Information",
          content: [{
              description: "For questions about this Privacy Policy, please visit the ",
          }]
      }
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center">Privacy Policy</CardTitle>
              <CardDescription className="text-sm text-center">How NeuralAxis Labs handles your data on DevCollab Hub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>This Privacy Policy explains how NeuralAxis Labs ("we," "us," or "our") collects, uses, and protects your information when you use the DevCollab Hub platform and its services.</p>
              <p>By creating an account or using our platform, you agree to the practices described in this policy.</p>
              <Badge variant="secondary">Last Updated: January 9, 2026</Badge>
            </CardContent>
          </Card>

          {policySections.map((section) => (
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
                            {section.id === 8 && (
                                <Link href="/#contact" scroll={false} className="text-primary hover:underline">contact form</Link>
                            )}
                        </p>
                    )}
                    {item.points && (
                      <ul className="space-y-2">
                        {item.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.footer && (
                        <p className="text-sm text-muted-foreground mt-3">
                            {item.footer}
                            {section.id === 5 && (
                                <Link href="/#contact" scroll={false} className="text-primary hover:underline">contact form</Link>
                            )}
                        </p>
                    )}
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
