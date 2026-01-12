'use client';

import type { Engagement } from '@/types/advisor';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Helper to display character counts for textareas
export const CharacterCounter = ({ value, maxLength }: { value: string; maxLength: number }) => (
    <p className="text-xs text-right text-muted-foreground mt-1">
        {value.length} / {maxLength}
    </p>
);

// Helper component to show original request details
export const RequestDetails = ({ engagement }: { engagement: Engagement }) => (
    <div className="space-y-3 text-sm p-3 bg-gray-50/50 rounded-lg border">
        {engagement.developerRequest?.subject && <><p className="font-medium">Subject:</p><p className="font-semibold">{engagement.developerRequest.subject}</p></>}
        <p className="font-medium">Message:</p>
        <p className="whitespace-pre-wrap p-2 bg-gray-100 rounded-md text-gray-700">{engagement.developerRequest?.message}</p>
        <p className="font-medium">Selected Deliverables:</p>
        <div className="flex flex-wrap gap-2">
            {engagement.developerRequest?.selectedDeliverables.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
        </div>
        <div><p className="font-medium">Proposed Timeline:</p><p>{engagement.developerRequest?.proposedTimeline}</p></div>
        {engagement.developerRequest?.constraints && <><div><p className="font-medium">Constraints:</p><p>{engagement.developerRequest.constraints}</p></div></>}
    </div>
);

// Helper component to show proposal details with collapsible milestones
export const ProposalDetails = ({ engagement }: { engagement: Engagement }) => (
    <div className="space-y-4 text-sm p-3 bg-blue-50/30 rounded-lg border border-blue-200">
        {engagement.advisorProposal?.notes && (
            <div>
                <p className="font-semibold">Notes from Advisor:</p>
                <p className="whitespace-pre-wrap p-2 bg-blue-50 rounded-md text-blue-800">
                    {engagement.advisorProposal.notes}
                </p>
            </div>
        )}
        <p className="font-semibold">Milestones:</p>
        <Accordion type="single" collapsible className="w-full">
            {engagement.advisorProposal?.milestones.map((m, i) => (
                <AccordionItem value={`milestone-${i}`} key={m.id}>
                    <AccordionTrigger className="font-semibold text-sm text-left">Milestone {i + 1}</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2 pl-2">
                        <div>
                            <p className="font-semibold">Description:</p>
                            <p className="whitespace-pre-wrap">{m.description}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Deliverable:</p>
                            <p className="whitespace-pre-wrap">{m.deliverable}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Timeline:</p>
                            <p>{m.timeline}</p>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
);
