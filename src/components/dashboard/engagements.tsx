'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, where, onSnapshot, doc, updateDoc, or, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Engagement, PublicAdvisorProfile } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CircleX, FileText, Send, SquarePen, Star, ThumbsDown, ThumbsUp, Hourglass, CheckCircle, PencilRuler, Briefcase, Eye, Archive, ArchiveRestore, CheckSquare } from 'lucide-react';
import { RequestDetails, ProposalDetails } from './engagement-details';
import { ProposalBuilderDialog, RevisionRequestDialog, RejectedDetailsDialog } from './engagement-dialogs';
import { AdvisorDetailsModal } from './advisor-details-modal';
import { ItemDialog } from '@/components/discover/item-dialog';
import { UserProfile } from '@/types';

// Main Component
export default function Engagements() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'engagements'), or(
            where('developerId', '==', user.uid),
            where('advisorId', '==', user.uid)
        ));
        const unsubscribe = onSnapshot(q, snapshot => {
            const engs: Engagement[] = [];
            snapshot.forEach(doc => engs.push({ id: doc.id, ...doc.data() } as Engagement));
            setEngagements(engs);
        });
        return () => unsubscribe();
    }, [user]);

    const { developerEngagements, advisorEngagements, archivedDeveloperEngagements, archivedAdvisorEngagements } = useMemo(() => {
        if (!user) return { developerEngagements: [], advisorEngagements: [], archivedDeveloperEngagements: [], archivedAdvisorEngagements: [] };
        const nonArchived = engagements.filter(e => !e.archivedBy || !e.archivedBy.includes(user.uid));
        const archived = engagements.filter(e => e.archivedBy && e.archivedBy.includes(user.uid));
        return {
            developerEngagements: nonArchived.filter(e => e.developerId === user.uid),
            advisorEngagements: nonArchived.filter(e => e.advisorId === user.uid),
            archivedDeveloperEngagements: archived.filter(e => e.developerId === user.uid),
            archivedAdvisorEngagements: archived.filter(e => e.advisorId === user.uid),
        };
    }, [engagements, user]);

    const handleArchiveToggle = async (engagementId: string, archive: boolean) => {
        if(!user) return;
        const engagementRef = doc(db, 'engagements', engagementId);
        try {
            await updateDoc(engagementRef, { 
                archivedBy: archive ? arrayUnion(user.uid) : arrayRemove(user.uid) 
            });
            toast({ title: `Engagement ${archive ? 'Archived' : 'Restored'}` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update the engagement." });
        }
    };

    const hasArchivedEngagements = archivedDeveloperEngagements.length > 0 || archivedAdvisorEngagements.length > 0;

    return (
        <div className="space-y-6">
            <EngagementsListSection title="My Engagements" description="Engagements you have requested as a developer." Icon={Briefcase} engagements={developerEngagements} onArchiveToggle={handleArchiveToggle} userRole="developer" />
            {userProfile?.roles?.advisor && (
                 <EngagementsListSection title="Advisory Dashboard" description="Engagements where you are the advisor." Icon={Star} engagements={advisorEngagements} onArchiveToggle={handleArchiveToggle} userRole="advisor" />
            )}

            {hasArchivedEngagements && (
                 <Accordion type="single" collapsible onValueChange={(value) => setShowArchived(!!value)}>
                    <AccordionItem value="archived">
                        <AccordionTrigger className="text-base font-semibold">Archived Engagements</AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <EngagementsListSection title="My Engagements" engagements={archivedDeveloperEngagements} onArchiveToggle={handleArchiveToggle} userRole="developer" isArchivedList />
                            {userProfile?.roles?.advisor && (
                                <EngagementsListSection title="Advisory Dashboard" engagements={archivedAdvisorEngagements} onArchiveToggle={handleArchiveToggle} userRole="advisor" isArchivedList />
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    );
}

// List Section Component
function EngagementsListSection({ title, description, Icon, engagements, onArchiveToggle, userRole, isArchivedList = false }: { title: string, description?: string, Icon?: React.ElementType, engagements: Engagement[], onArchiveToggle: (id: string, archive: boolean) => void, userRole: 'developer' | 'advisor', isArchivedList?: boolean }) {
    const { user } = useAuth();
    if (engagements.length === 0) {
        if (isArchivedList) return null; // Don't show card if there are no archived items for a section
        return (
            <Card>
                <CardHeader>
                    {Icon && <CardTitle className="flex items-center gap-2 text-base"><Icon />{title}</CardTitle>}
                    {description && <CardDescription className="text-sm">{description}</CardDescription>}
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">You have no engagements here.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                {Icon && <CardTitle className="flex items-center gap-2 text-base"><Icon />{title}</CardTitle>}
                {!isArchivedList && description && <CardDescription className="text-sm">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
                {engagements.map(eng => {
                    const isArchived = eng.archivedBy?.includes(user!.uid) ?? false;
                    return userRole === 'developer' 
                        ? <DeveloperEngagementCard key={eng.id} engagement={eng} onArchiveToggle={(archive) => onArchiveToggle(eng.id, archive)} isArchived={isArchived} /> 
                        : <AdvisorEngagementCard key={eng.id} engagement={eng} onArchiveToggle={(archive) => onArchiveToggle(eng.id, archive)} isArchived={isArchived} />
                })}
            </CardContent>
        </Card>
    );
}


// Card Components
function DeveloperEngagementCard({ engagement, onArchiveToggle, isArchived }: { engagement: Engagement; onArchiveToggle: (archive: boolean) => void; isArchived: boolean; }) {
    const { toast } = useToast();
    const [showRevisionDialog, setShowRevisionDialog] = useState(false);
    const [showAdvisorModal, setShowAdvisorModal] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState<PublicAdvisorProfile | null>(null);

    const handleAdvisorNameClick = async () => {
        if (!engagement.advisorId || !engagement.advisorApplicationId) {
            toast({ variant: 'destructive', title: "Error", description: "This engagement is missing the required advisor or application ID." });
            return;
        }

        try {
            const functions = getFunctions();
            const getAdvisorApplication = httpsCallable(functions, 'getAdvisorApplicationForEngagement');
            const result = await getAdvisorApplication({ 
                advisorId: engagement.advisorId, 
                advisorApplicationId: engagement.advisorApplicationId 
            });
            
            if (result.data) {
                setSelectedAdvisor(result.data as PublicAdvisorProfile);
                setShowAdvisorModal(true);
            } else {
                throw new Error("No data returned from function");
            }
        } catch (error: any) {
            console.error("Error fetching advisor profile:", error);
            toast({ 
                variant: 'destructive', 
                title: "Error", 
                description: error.message || "An error occurred while fetching advisor details." 
            });
        }
    };
    
    const handleStatusUpdate = async (status: Engagement['status'], revisionNote?: string) => {
        const engagementRef = doc(db, 'engagements', engagement.id);
        try {
            const updatePayload: any = { status };
            if (status === 'revision_requested' && revisionNote) updatePayload.developerRevisionNote = revisionNote;
            if (status === 'active') updatePayload.activatedAt = new Date();
            await updateDoc(engagementRef, updatePayload);
            toast({ title: "Success", description: `Engagement status updated.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update the engagement." });
        }
    };

    const renderContent = () => {
        switch (engagement.status) {
            case 'pending_proposal':
                return <PendingProposalView participant={engagement.advisorName} participantRole="Advisor" onParticipantClick={handleAdvisorNameClick} />;
            case 'pending_developer_acceptance':
                return <ProposalReviewView engagement={engagement} onAccept={() => handleStatusUpdate('active')} onReject={() => handleStatusUpdate('rejected')} onRequestRevision={() => setShowRevisionDialog(true)} onParticipantClick={handleAdvisorNameClick} />;
            case 'revision_requested':
                return <RevisionRequestedView participant={engagement.advisorName} participantRole="Advisor" onParticipantClick={handleAdvisorNameClick} />;
            case 'active':
                return <ActiveEngagementView engagement={engagement} userRole="developer" onParticipantClick={handleAdvisorNameClick} />;
            case 'rejected':
            case 'closed':
                 return <StatusView engagement={engagement} userRole="developer" onArchiveToggle={onArchiveToggle} isArchived={isArchived} onParticipantClick={handleAdvisorNameClick} />;
            default:
                return <PendingProposalView participant={engagement.advisorName} participantRole="Advisor" onParticipantClick={handleAdvisorNameClick} />;
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            {renderContent()}
            {showRevisionDialog && <RevisionRequestDialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog} onSubmit={(note) => handleStatusUpdate('revision_requested', note)} />}
            {showAdvisorModal && selectedAdvisor && (
                <AdvisorDetailsModal advisor={selectedAdvisor} open={showAdvisorModal} onOpenChange={setShowAdvisorModal} />
            )}
        </div>
    );
}

function AdvisorEngagementCard({ engagement, onArchiveToggle, isArchived }: { engagement: Engagement; onArchiveToggle: (archive: boolean) => void; isArchived: boolean;}) {
    const { toast } = useToast();
    const [showProposalDialog, setShowProposalDialog] = useState(false);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [selectedDeveloper, setSelectedDeveloper] = useState<UserProfile | null>(null);

    const handleDeveloperNameClick = async () => {
        if (!engagement.developerId) {
            toast({ variant: 'destructive', title: "Error", description: "Developer ID is missing." });
            return;
        }
        try {
            const devDocRef = doc(db, 'users', engagement.developerId);
            const devDoc = await getDoc(devDocRef);
            if (devDoc.exists()) {
                setSelectedDeveloper(devDoc.data() as UserProfile);
                setIsItemDialogOpen(true);
            } else {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch developer profile." });
            }
        } catch (error) {
            console.error("Error fetching developer profile:", error);
            toast({ variant: 'destructive', title: "Error", description: "An error occurred while fetching developer details." });
        }
    };

    const handleReject = async () => {
        const engagementRef = doc(db, 'engagements', engagement.id);
        try {
            await updateDoc(engagementRef, { status: 'rejected' });
            toast({ title: "Engagement Rejected" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not reject the engagement." });
        }
    };

    const renderContent = () => {
        switch (engagement.status) {
            case 'pending_proposal':
                return <ProposalCreationView engagement={engagement} onPropose={() => setShowProposalDialog(true)} onReject={handleReject} onParticipantClick={handleDeveloperNameClick} />;
            case 'pending_developer_acceptance':
                return <PendingResponseView participant={engagement.developerName} participantRole="Developer" onParticipantClick={handleDeveloperNameClick} />;
            case 'revision_requested':
                return <ProposalCreationView engagement={engagement} onPropose={() => setShowProposalDialog(true)} onReject={handleReject} isRevision onParticipantClick={handleDeveloperNameClick} />;
            case 'active':
                return <ActiveEngagementView engagement={engagement} userRole="advisor" onParticipantClick={handleDeveloperNameClick} />;
            case 'rejected':
            case 'closed':
                return <StatusView engagement={engagement} userRole="advisor" onArchiveToggle={onArchiveToggle} isArchived={isArchived} onParticipantClick={handleDeveloperNameClick} />;
            default:
                 return <PendingResponseView participant={engagement.developerName} participantRole="Developer" onParticipantClick={handleDeveloperNameClick} />;
        }
    }

    return (
        <div className="p-4 border rounded-lg">
            {renderContent()}
            {showProposalDialog && <ProposalBuilderDialog open={showProposalDialog} onOpenChange={setShowProposalDialog} engagement={engagement} />}
            {isItemDialogOpen && selectedDeveloper && (
                <ItemDialog
                    open={isItemDialogOpen}
                    onOpenChange={setIsItemDialogOpen}
                    items={[selectedDeveloper]}
                    initialIndex={0}
                    viewMode="developers"
                />
            )}
        </div>
    )
}

// Reusable UI Components
const PendingProposalView = ({ participant, participantRole, onParticipantClick }: { participant: string, participantRole: string, onParticipantClick?: () => void }) => (
    <div className="flex items-center justify-between">
        <div>
            <p className="font-semibold text-sm">vs <span className={onParticipantClick ? 'cursor-pointer hover:underline' : ''} onClick={onParticipantClick}>{participant}</span></p>
            <p className="text-sm text-muted-foreground">Waiting for {participantRole} to create a proposal.</p>
        </div>
        <Hourglass className="h-5 w-5 text-yellow-500" />
    </div>
);

const ProposalCreationView = ({ engagement, onPropose, onReject, isRevision = false, onParticipantClick }: { engagement: Engagement, onPropose: () => void, onReject: () => void, isRevision?: boolean, onParticipantClick?: () => void }) => (
    <div>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <p className="font-semibold text-sm">Request from <span className="cursor-pointer hover:underline" onClick={onParticipantClick}>{engagement.developerName}</span></p>
                {isRevision && engagement.developerRevisionNote && (
                    <Alert variant="default" className="mt-2 bg-yellow-50 border-yellow-200">
                        <PencilRuler className="h-4 w-4" />
                        <AlertTitle className="text-sm font-semibold">Revision Requested</AlertTitle>
                        <AlertDescription className="text-xs text-yellow-800">{engagement.developerRevisionNote}</AlertDescription>
                    </Alert>
                )}
            </div>
            <Avatar className="ml-4"><AvatarImage src={engagement.developerPhotoURL} /><AvatarFallback>{engagement.developerName?.[0]}</AvatarFallback></Avatar>
        </div>
        <Accordion type="single" collapsible className="w-full mt-2"><AccordionItem value="request"><AccordionTrigger className="text-sm">View Developer's Request</AccordionTrigger><AccordionContent><RequestDetails engagement={engagement} /></AccordionContent></AccordionItem></Accordion>
        <CardFooter className="flex justify-end gap-2 pt-4 px-0 pb-0"><Button variant="destructive" onClick={onReject}>Reject</Button><Button onClick={onPropose}><SquarePen className="mr-2 h-4 w-4" />{isRevision ? 'Revise Proposal' : 'Create Proposal'}</Button></CardFooter>
    </div>
);

const ProposalReviewView = ({ engagement, onAccept, onReject, onRequestRevision, onParticipantClick }: { engagement: Engagement, onAccept: () => void, onReject: () => void, onRequestRevision: () => void, onParticipantClick?: () => void }) => (
    <div>
        <div className="flex items-center justify-between">
            <div><p className="font-semibold text-sm">Proposal from <span className={onParticipantClick ? 'cursor-pointer hover:underline' : ''} onClick={onParticipantClick}>{engagement.advisorName}</span></p><Alert variant="default" className="mt-2 bg-blue-50 border-blue-200"><FileText className="h-4 w-4" /><AlertTitle className="text-sm font-semibold">Action Required</AlertTitle><AlertDescription className="text-xs text-blue-800">Review the proposal and take action.</AlertDescription></Alert></div>
            <Avatar className="ml-4"><AvatarImage src={engagement.advisorPhotoURL} /><AvatarFallback>{engagement.advisorName?.[0]}</AvatarFallback></Avatar>
        </div>
        <Accordion type="single" collapsible className="w-full mt-4" defaultValue="proposal">
            <AccordionItem value="request"><AccordionTrigger className="text-sm font-semibold">Your Original Request</AccordionTrigger><AccordionContent><RequestDetails engagement={engagement} /></AccordionContent></AccordionItem>
            {engagement.developerRevisionNote && <AccordionItem value="revision"><AccordionTrigger className="text-sm font-semibold text-yellow-600">Your Revision Request</AccordionTrigger><AccordionContent><p className="p-3 bg-yellow-50 rounded-md text-yellow-800 text-sm border border-yellow-200">{engagement.developerRevisionNote}</p></AccordionContent></AccordionItem>}
            <AccordionItem value="proposal"><AccordionTrigger className="text-sm font-semibold">Advisor's Proposal</AccordionTrigger><AccordionContent><ProposalDetails engagement={engagement} /></AccordionContent></AccordionItem>
        </Accordion>
        <CardFooter className="flex justify-end gap-2 pt-4 px-0 pb-0"><Button variant="destructive" size="sm" onClick={onReject}><ThumbsDown className="mr-2 h-4 w-4"/>Reject</Button><Button variant="outline" size="sm" onClick={onRequestRevision} disabled={!!engagement.developerRevisionNote}><PencilRuler className="mr-2 h-4 w-4"/>Request Revision</Button><Button size="sm" onClick={onAccept}><ThumbsUp className="mr-2 h-4 w-4"/>Accept & Activate</Button></CardFooter>
    </div>
);

const RevisionRequestedView = ({ participant, participantRole, onParticipantClick }: { participant: string, participantRole: string, onParticipantClick?: () => void }) => (
    <div className="flex items-center justify-between">
        <div><p className="font-semibold text-sm">vs <span className={onParticipantClick ? 'cursor-pointer hover:underline' : ''} onClick={onParticipantClick}>{participant}</span></p><p className="text-sm text-muted-foreground">Revision requested. Waiting for {participantRole} to respond.</p></div>
        <PencilRuler className="h-5 w-5 text-yellow-500" />
    </div>
);

const PendingResponseView = ({ participant, participantRole, onParticipantClick }: { participant: string, participantRole: string, onParticipantClick?: () => void }) => (
    <div className="flex items-center justify-between">
        <div><p className="font-semibold text-sm">with <span className="cursor-pointer hover:underline" onClick={onParticipantClick}>{participant}</span></p><p className="text-sm text-muted-foreground">Proposal sent. Waiting for {participantRole} to respond.</p></div>
        <Send className="h-5 w-5 text-blue-500" />
    </div>
);

const ActiveEngagementView = ({ engagement, userRole, onParticipantClick }: { engagement: Engagement, userRole: 'developer' | 'advisor', onParticipantClick?: () => void }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
			<p className="font-semibold text-sm">{userRole === 'developer' ? <span className='cursor-pointer hover:underline' onClick={onParticipantClick}>{`vs ${engagement.advisorName}`}</span> : <span className="cursor-pointer hover:underline" onClick={onParticipantClick}>{`with ${engagement.developerName}`}</span>}</p>
			<Badge className="bg-green-100 text-green-800 hover:bg-green-100/80">Active</Badge>
		</div>
        <Button asChild><Link href={`/engagements/${engagement.id}`}>Enter Room</Link></Button>
    </div>
);

function StatusView({ engagement, userRole, onArchiveToggle, isArchived, onParticipantClick }: { engagement: Engagement, userRole: 'developer' | 'advisor', onArchiveToggle: (archive: boolean) => void, isArchived: boolean, onParticipantClick?: () => void }) {
    const [showDetails, setShowDetails] = useState(false);
    const participantName = userRole === 'developer' ? engagement.advisorName : engagement.developerName;
    // @ts-ignore
    const createdAtDate = engagement.createdAt?.toDate ? engagement.createdAt.toDate().toLocaleDateString() : '-';
    const statusConfig = {
        rejected: { Icon: CircleX, color: 'text-red-500', description: "This engagement was rejected." },
        closed: { Icon: CheckCircle, color: 'text-gray-500', description: "This engagement is closed." },
    };
    const { Icon, color, description } = statusConfig[engagement.status as 'rejected' | 'closed'] || { Icon: CircleX, color: 'text-gray-500', description: '' };

    return (
        <>
            <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">{userRole === 'developer' ? <span className='cursor-pointer hover:underline' onClick={onParticipantClick}>{`vs ${participantName}`}</span> : <span className="cursor-pointer hover:underline" onClick={onParticipantClick}>{`with ${participantName}`}</span>}</p>
                    {engagement.developerRequest?.subject && <p className="text-sm font-medium text-gray-700">Subject: {engagement.developerRequest.subject}</p>}
                    <p className="text-xs text-muted-foreground">Date: {createdAtDate}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                     {engagement.status === 'closed' && <Button variant="outline" size="sm" asChild><Link href={`/engagements/${engagement.id}`}><Eye className="mr-2 h-4 w-4"/>View</Link></Button>}
                    {engagement.status === 'rejected' && <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}><Eye className="mr-2 h-4 w-4"/>View Details</Button>}
                    {isArchived
                        ? <Button variant="outline" size="sm" onClick={() => onArchiveToggle(false)}><ArchiveRestore className="mr-2 h-4 w-4"/>Restore</Button>
                        : <Button variant="outline" size="sm" onClick={() => onArchiveToggle(true)}><Archive className="mr-2 h-4 w-4"/>Archive</Button>
                    }
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
            </div>
            {engagement.status === 'rejected' && <RejectedDetailsDialog open={showDetails} onOpenChange={setShowDetails} engagement={engagement} />}
        </>
    );
}
