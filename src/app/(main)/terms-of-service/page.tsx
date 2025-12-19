'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

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
          points: ["DevCollab Hub is owned and operated by NeuralAxis Labs. The platform helps software developers and tech professionals create profiles discover projects find collaborators and communicate with matched users."]
        }
      ]
    },
    {
      id: 2,
      title: "2. Eligibility",
      content: [
        {
          description: "To use the platform you must:",
          points: [
            "Be at least 16 years old",
            "Provide accurate and truthful information when registering",
            "Agree to comply with these Terms",
          ]
        }
      ]
    },
    {
      id: 3,
      title: "3. User Accounts",
      content: [
        {
          subtitle: "3.1 Responsibility for Your Account",
          description: "You are responsible for:",
          points: [
            "Maintaining the confidentiality of your login details",
            "All activities carried out through your account",
            "Ensuring your profile information is accurate and lawful",
          ]
        },
        {
          subtitle: "3.2 Prohibited Account Activities",
          description: "You must not:",
          points: [
            "Create fake or misleading profiles",
            "Impersonate any person or organization",
            "Share your account with others",
            "Use automated tools or bots to interact with the platform",
          ]
        }
      ]
    },
    {
      id: 4,
      title: "4. User Content",
      content: [
        {
          subtitle: "4.1 Ownership",
          points: ["You retain ownership of any content you upload including profile details project descriptions and messages."]
        },
        {
          subtitle: "4.2 License to Use",
          points: ["By posting content you grant NeuralAxis Labs a non-exclusive royalty-free worldwide license to display store process and transmit your content to operate and improve the service."]
        },
        {
          subtitle: "4.3 Prohibited Content",
          description: "You may not upload or transmit:",
          points: [
            "Harassing defamatory abusive or discriminatory content",
            "Spam or unauthorized promotional material",
            "Malicious code or harmful files",
            "Content that infringes intellectual property rights",
          ],
          footer: "NeuralAxis Labs may remove content that violates these rules."
        }
      ]
    },
    {
        id: 5,
        title: "5. Collaboration and Matching",
        content: [{
            description: "The platform enables users to:",
            points: [
                "Express interest in projects",
                "Match with project owners",
                "Communicate through private messaging",
            ],
            footer: "NeuralAxis Labs is not responsible for:\nThe outcome of collaborations\nDisputes between users\nThe accuracy of user-provided information\nUsers are encouraged to conduct due diligence before entering collaborations."
        }]
    },
    {
        id: 6,
        title: "6. AI Insights",
        content: [{
            description: "DevCollab Hub includes AI-powered recommendations for project owners. You acknowledge that:",
            points: [
                "Insights are generated from anonymized and aggregated data",
                "AI suggestions are informational and not guarantees",
                "NeuralAxis Labs is not responsible for decisions based on AI recommendations",
            ]
        }]
    },
    {
        id: 7,
        title: "7. Acceptable Use Policy",
        content: [{
            description: "You agree not to:",
            points: [
                "Interfere with platform functionality",
                "Attempt to access data that does not belong to you",
                "Use the service for illegal or harmful activities",
                "Reverse engineer the platform or its software",
                "Misuse messaging features or engage in harassment",
            ],
            footer: "Violations may lead to suspension or permanent account termination."
        }]
    },
    {
        id: 8,
        title: "8. Intellectual Property",
        content: [{
            points: ["All trademarks logos designs code and content created by NeuralAxis Labs remain its exclusive property. Users may not copy modify distribute or reproduce any platform elements without permission."]
        }]
    },
    {
        id: 9,
        title: "9. Termination",
        content: [{
            description: "NeuralAxis Labs may suspend or terminate your access if:",
            points: [
                "You violate these Terms",
                "You engage in fraudulent harmful or abusive behavior",
                "Required by law or security considerations",
            ],
            footer: "You may delete your account at any time."
        }]
    },
    {
        id: 10,
        title: "10. Disclaimers",
        content: [{
            description: "DevCollab Hub is provided “as is” without warranties of any kind including:",
            points: [
                "Availability",
                "Accuracy of content provided by users",
                "Fitness for a particular purpose",
            ],
            footer: "NeuralAxis Labs does not guarantee successful collaborations or matches."
        }]
    },
    {
        id: 11,
        title: "11. Limitation of Liability",
        content: [{
            description: "To the maximum extent permitted by law NeuralAxis Labs is not liable for:",
            points: [
                "Loss of data or content",
                "Damages resulting from interactions with other users",
                "Indirect incidental or consequential damages",
                "Losses arising from reliance on AI insights",
            ]
        }]
    },
    {
        id: 12,
        title: "12. Changes to the Terms",
        content: [{
            points: ["We may update these Terms from time to time. Continued use of the service after updates means you agree to the revised terms."]
        }]
    },
    {
        id: 13,
        title: "13. Governing Law",
        content: [{
            points: ["These Terms are governed by the laws of [Insert Jurisdiction]. Any disputes will be resolved under this jurisdiction’s courts."]
        }]
    },
    {
        id: 14,
        title: "14. Contact Information",
        content: [{
            description: "For questions about these Terms contact:",
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your agreement for using DevCollab Hub.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Badge variant="secondary">Last Updated: [Insert Date]</Badge>
          </div>
        </header>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-card-foreground">Welcome to DevCollab Hub. These Terms of Service govern your use of the platform. By creating an account or using the service you agree to these terms.</p>
        </div>


        <div className="mt-12 space-y-8">
          {sections.map((section) => (
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
                            <ShieldCheck className="h-5 w-5 mt-1 flex-shrink-0 text-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.footer && <p className="text-muted-foreground mt-4 whitespace-pre-line">{item.footer}</p>}
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
