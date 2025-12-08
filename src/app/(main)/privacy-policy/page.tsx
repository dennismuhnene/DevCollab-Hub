'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const policySections = [
    {
      id: 1,
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "1.1 Account Information",
          points: [
            "Email address (used for authentication and communication)",
            "Hashed password stored securely",
            "Full name",
            "Profile picture (photoURL)",
          ]
        },
        {
          subtitle: "1.2 Professional Profile Information",
          description: "Users may add optional professional details including:",
          points: [
            "Biographical summary (bio)",
            "Technologies they use (techStack)",
            "Professional skills (skills)",
            "Years of experience",
            "Collaboration status (open or closed to collaboration)",
            "Collaboration goals (e.g., seeking paid work, finding a co-founder)",
            "Commitment level (e.g., part-time, full-time)",
            "External links (e.g., GitHub, portfolio, social media)",
          ]
        },
        {
          subtitle: "1.3 Project Information",
          description: "When you create or manage a project we collect:",
          points: [
            "Project title and description",
            "Project image",
            "Required tech stack",
            "Required professional skills",
            "Minimum years of experience for collaborators",
            "Project collaboration status",
          ]
        },
        {
          subtitle: "1.4 Interaction and Collaboration Data",
          description: "We collect information related to how you interact with other users and projects including:",
          points: [
            "Interested users lists on projects",
            "Match records where two users mutually agree to collaborate",
            "Private messages exchanged between matched users",
            "In-app notifications related to interest matches and messages",
          ]
        },
        {
          subtitle: "1.5 AI Insights Data",
          description: "To generate on-demand, AI-powered insights for project owners, the platform processes aggregated and anonymized data from your own profile and the profiles of developers who have shown interest in your projects. This data includes:",
          points: [
            "Professional details such as skills, tech stack, years of experience, collaboration goals, and commitment levels.",
            "This feature is user-initiated and does not run automatically.",
            "The analysis does not access private message content and does not identify individual users in its output.",
          ]
        },
        {
          subtitle: "1.6 Automatically Collected Information",
          description: "We may collect standard technical information such as:",
          points: [
            "Device type and operating system",
            "Usage logs and interaction events",
            "IP address and browser information",
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
            "Create and maintain your account",
            "Display your professional profile to other users",
            "Enable project creation and collaboration features",
            "Facilitate matches and communication between users",
            "Send notifications related to activity on the platform",
            "Provide AI-based insights for project owners",
            "Improve platform functionality and user experience",
            "Maintain security and prevent fraudulent activity",
          ]
        }
      ]
    },
    {
      id: 3,
      title: "3. How We Share Your Information",
      content: [
        {
            description: "We may share information in the following situations:",
        },
        {
          subtitle: "3.1 With Other Users",
          points: [
            "Your public profile and project details are visible to any user on the platform",
            "Private messages are visible only to participants in the conversation",
          ]
        },
        {
          subtitle: "3.2 With Service Providers",
          points: [
            "We may use third-party services including hosting providers analytics tools and authentication services. These providers process data only to support the platform.",
          ]
        },
        {
          subtitle: "3.3 For Legal Compliance",
          points: [
            "We may disclose information if required to comply with laws regulations or lawful requests.",
          ]
        },
        {
          subtitle: "3.4 In Business Transfers",
          points: [
            "If NeuralAxis Labs undergoes a merger acquisition or restructuring your information may be transferred as part of the business assets.",
          ]
        }
      ]
    },
    {
      id: 4,
      title: "4. Data Storage and Security",
      content: [
        {
          points: [
            "Data is stored in secure cloud infrastructure including Firestore",
            "Passwords are stored using strong hashing algorithms",
            "We use industry-standard measures to protect against unauthorized access loss or misuse",
            "While we implement best practices no system is completely secure. Users are encouraged to protect their login credentials.",
          ]
        }
      ]
    },
    {
        id: 5,
        title: "5. Data Retention",
        content: [{
            points: ["We retain your information for as long as your account is active or as needed to provide the services. You may request account deletion which will remove or anonymize your personal data unless retention is required for legal reasons."]
        }]
    },
    {
        id: 6,
        title: "6. Your Rights",
        content: [{
            description: "Depending on your location you may have rights to:",
            points: [
                "Access your personal information",
                "Correct or update your data",
                "Request deletion of your account",
                "Withdraw consent for optional data",
                "Restrict certain processing activities",
            ],
            footer: "To exercise these rights contact us at: [Insert Contact Email]"
        }]
    },
    {
        id: 7,
        title: "7. Children’s Privacy",
        content: [{
            points: ["DevCollab Hub is not intended for individuals under the age of 16. We do not knowingly collect data from minors. If we learn that a minor has registered we will take steps to delete the account promptly."]
        }]
    },
    {
        id: 8,
        title: "8. Changes to This Policy",
        content: [{
            points: ["We may update this Privacy Policy from time to time. Changes will take effect when posted on the platform. Continued use of the service means you accept the updated policy."]
        }]
    },
    {
        id: 9,
        title: "9. Contact Information",
        content: [{
            description: "For questions or concerns about this Privacy Policy contact:",
            points: [
                "NeuralAxis Labs",
                "Email: [Insert Email]",
            ]
        }]
    }
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            How NeuralAxis Labs handles your data on DevCollab Hub.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Badge variant="secondary">Last Updated: [Insert Date]</Badge>
            <Badge variant="secondary">Effective Date: [Insert Date]</Badge>
          </div>
        </header>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-card-foreground">DevCollab Hub is a social and professional networking platform designed for software developers and tech professionals. This Privacy Policy explains how NeuralAxis Labs collects uses stores and protects your personal information when you use DevCollab Hub.</p>
            <p className="text-muted-foreground">By creating an account or accessing the platform you agree to the practices described in this Privacy Policy.</p>
        </div>


        <div className="mt-12 space-y-8">
          {policySections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.content.map((item, index) => (
                  <div key={index}>
                    {item.subtitle && <h4 className="font-semibold text-lg mb-3">{item.subtitle}</h4>}
                    {item.description && <p className="text-muted-foreground mb-4">{item.description}</p>}
                    {item.points && (
                      <ul className="space-y-3">
                        {item.points.map((point, pIndex) => (
                          <li key={pIndex} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0 text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.footer && <p className="text-muted-foreground mt-4">{item.footer}</p>}
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
