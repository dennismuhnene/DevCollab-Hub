'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Engagement } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { Trash2 } from 'lucide-react';
import { RequestDetails, ProposalDetails, CharacterCounter } from './engagement-details';

// Dialog for Advisor to Build Proposal
export function ProposalBuilderDialog({ open, onOpenChange, engagement }: { open: boolean, onOpenChange: (open: boolean) => void, engagement: Engagement }) {
    const { toast } = useToast();
    const [milestones, setMilestones] = useState(engagement.advisorProposal?.milestones || [{ id: nanoid(8), description: '', deliverable: '', timeline: '', status: 'pending'}]);
    const [notes, setNotes] = useState(engagement.advisorProposal?.notes || '');
    const NOTE_MAX_LENGTH = 2500;
    const MILESTONE_DESC_MAX_LENGTH = 2500;
    const MILESTONE_DELIVERABLE_MAX_LENGTH = 2500;
    const MILESTONE_TIMELINE_MAX_LENGTH = 2500;

    const handleSubmit = async () => {
        if (milestones.some(m => !m.description || !m.deliverable || !m.timeline)) {
            toast({ variant: 'destructive', title: "Incomplete Milestones", description: "Please fill out all fields for each milestone." });
            return;
        }
        const engagementRef = doc(db, 'engagements', engagement.id);
        try {
            await updateDoc(engagementRef, {
                status: 'pending_developer_acceptance',
                advisorProposal: { milestones, notes }
            });
            toast({ title: "Proposal Sent!", description: "The developer has been notified." });
            onOpenChange(false);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not send the proposal." });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create Proposal</DialogTitle>
                    <DialogDescription>Review the developer's request and define the milestones for this engagement.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4 space-y-6">
                    <Accordion type="single" collapsible defaultValue='item-1'>
                        <AccordionItem value="item-1">
                            <AccordionTrigger className='text-sm font-semibold text-slate-600'>Developer's Request</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 p-4 border rounded-lg bg-slate-50">
                                    <RequestDetails engagement={engagement} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-600">Your Proposal</h3>
                        <Accordion type="multiple" className="w-full space-y-3">
                            {milestones.map((m, i) => (
                                <AccordionItem value={`milestone-${i}`} key={m.id} className="border-none">
                                    <div className="flex items-center w-full border rounded-lg bg-white p-0">
                                        <AccordionTrigger className="p-3 flex-1 text-left font-semibold hover:no-underline text-sm">
                                            <span>Milestone {i + 1}</span>
                                        </AccordionTrigger>
                                        {i > 0 && 
                                            <div className="pr-3">
                                                <Button variant="destructive" size="sm" className="h-8" onClick={() => setMilestones(milestones.filter(stone => stone.id !== m.id))}>
                                                    <Trash2 className="h-4 w-4 mr-1"/> Remove
                                                </Button>
                                            </div>
                                        }
                                    </div>
                                    <AccordionContent className="p-4 bg-gray-50 rounded-b-lg mt-1 border">
                                        <div className="space-y-4">
                                            <div>
                                                <Textarea rows={5} maxLength={MILESTONE_DESC_MAX_LENGTH} placeholder={`Milestone ${i + 1} Description`} value={m.description} onChange={e => {
                                                    const newMilestones = [...milestones];
                                                    newMilestones[i].description = e.target.value;
                                                    setMilestones(newMilestones);
                                                }} className="font-semibold" />
                                                <CharacterCounter value={m.description} maxLength={MILESTONE_DESC_MAX_LENGTH} />
                                            </div>
                                            <div>
                                                <Textarea rows={5} maxLength={MILESTONE_DELIVERABLE_MAX_LENGTH} placeholder="Deliverable" value={m.deliverable} onChange={e => {
                                                    const newMilestones = [...milestones];
                                                    newMilestones[i].deliverable = e.target.value;
                                                    setMilestones(newMilestones);
                                                }} />
                                                <CharacterCounter value={m.deliverable} maxLength={MILESTONE_DELIVERABLE_MAX_LENGTH} />
                                            </div>
                                            <div>
                                                <Textarea rows={2} maxLength={MILESTONE_TIMELINE_MAX_LENGTH} placeholder="Timeline (e.g., 1 week)" value={m.timeline} onChange={e => {
                                                    const newMilestones = [...milestones];
                                                    newMilestones[i].timeline = e.target.value;
                                                    setMilestones(newMilestones);
                                                }} />
                                                <CharacterCounter value={m.timeline} maxLength={MILESTONE_TIMELINE_MAX_LENGTH} />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <Button variant="outline" onClick={() => setMilestones([...milestones, { id: nanoid(8), description: '', deliverable: '', timeline: '', status: 'pending' }])}>+ Add Milestone</Button>
                        
                        <Accordion type="single" collapsible className="w-full">
                             <AccordionItem value="notes">
                                <AccordionTrigger className="p-3 border rounded-lg bg-white font-semibold hover:no-underline text-sm">Additional Notes (Optional)</AccordionTrigger>
                                <AccordionContent className="p-4 bg-gray-50 rounded-b-lg">
                                    <Textarea rows={8} maxLength={NOTE_MAX_LENGTH} placeholder="Provide any extra context or details here..." value={notes} onChange={e => setNotes(e.target.value)} />
                                    <CharacterCounter value={notes} maxLength={NOTE_MAX_LENGTH} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
                <DialogFooter className="mt-auto">
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit}>Send Proposal</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// Dialog for Developer to Request Revision
export function RevisionRequestDialog({ open, onOpenChange, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (note: string) => void }) {
    const [note, setNote] = useState('');
    const { toast } = useToast();
    const NOTE_MAX_LENGTH = 500;

    const handleSubmit = () => {
        if (!note.trim()) {
            toast({ variant: 'destructive', title: "Empty Note", description: "Please provide feedback for the advisor." });
            return;
        }
        onSubmit(note);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request Revision</DialogTitle>
                    <DialogDescription>Explain what you'd like the advisor to change. This is your only revision request for this engagement.</DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <Textarea maxLength={NOTE_MAX_LENGTH} placeholder="E.g., Can we split milestone 2 into two parts?" value={note} onChange={e => setNote(e.target.value)} />
                    <CharacterCounter value={note} maxLength={NOTE_MAX_LENGTH} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit}>Send Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog to show final details of a rejected engagement
export function RejectedDetailsDialog({ open, onOpenChange, engagement }: { open: boolean, onOpenChange: (open: boolean) => void, engagement: Engagement }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Rejected Engagement Details</DialogTitle>
                    <DialogDescription>
                        This engagement request was rejected. Here is the final state of the negotiation.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-2">Original Developer Request</h3>
                        <RequestDetails engagement={engagement} />
                    </div>
                    {engagement.advisorProposal && (
                        <div>
                             <h3 className="text-sm font-semibold text-gray-500 my-2">Advisor's Final Proposal</h3>
                             <ProposalDetails engagement={engagement} />
                        </div>
                    )}
                     {engagement.developerRevisionNote && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 my-2">Developer's Revision Note</h3>
                            <p className="p-3 bg-yellow-50 rounded-md text-yellow-800 text-sm border border-yellow-200">{engagement.developerRevisionNote}</p>
                        </div>
                    )}
                </div>
                <DialogFooter className="mt-auto">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
