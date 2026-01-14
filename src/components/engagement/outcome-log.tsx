'use client';

import type { Engagement } from '@/types/advisor';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


interface OutcomeLogProps {
  engagement: Engagement;
}

export default function OutcomeLog({ engagement }: OutcomeLogProps) {
  if (!engagement.outcomeLog || engagement.outcomeLog.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No outcomes have been logged for this engagement yet.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-3">
      {engagement.outcomeLog.map((logEntry, index) => (
        <AccordionItem value={`item-${index}`} key={logEntry.milestoneId || index} className="border-b-0">
            <div className="border rounded-lg bg-background">
                <AccordionTrigger className="p-4 text-left font-semibold hover:no-underline text-sm">
                    {logEntry.milestoneDescription}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <div className="mt-2 border-t pt-4">
                        <p className="font-semibold">Advisor's Summary:</p>
                        <p className="text-sm text-muted-foreground mt-1" style={{ whiteSpace: 'pre-wrap' }}>{logEntry.advisorSummary}</p>
                    </div>
                    {logEntry.developerReflection && (
                        <div className="mt-4 border-t pt-4">
                        <p className="font-semibold">Developer's Reflection:</p>
                        <p className="text-sm text-muted-foreground mt-1" style={{ whiteSpace: 'pre-wrap' }}>{logEntry.developerReflection}</p>
                        </div>
                    )}
                </AccordionContent>
            </div>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
