'use client';

import Link from 'next/link';
import type { PublicAdvisorProfile } from '@/types/advisor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const getAsArray = (data: string | string[] | undefined | null): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') return data.split(',').map(s => s.trim()).filter(Boolean);
    return [];
};

export const AdvisorDetailsModal = ({ advisor, open, onOpenChange }: { advisor: PublicAdvisorProfile, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const modalSpecialties = getAsArray(advisor.specialties);
    const modalCredentials = getAsArray(advisor.credentials);
    const modalDeliverables = getAsArray(advisor.standardDeliverables);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
                <DialogHeader className="pr-12">
                    <div className="flex items-start gap-4">
                        <Avatar className="w-20 h-20 border">
                            <AvatarImage src={advisor.photoURL || undefined} alt={advisor.name || 'Advisor'} />
                            <AvatarFallback>{(advisor.name || 'A')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="pt-2">
                            <DialogTitle className="text-lg">
                                <Link href={`/advisory/${advisor.uid}`} className="hover:underline">
                                    {advisor.name}
                                </Link>
                            </DialogTitle>
                            <DialogDescription>{advisor.headline}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4 overflow-y-auto px-6">
                    <div>
                        <h3 className="font-semibold text-base mb-2">About Me</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{advisor.bio}</p>
                    </div>
                    
                    {modalSpecialties.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-base mb-2">Specialties</h3>
                            <div className="flex flex-wrap gap-2">
                                {modalSpecialties.map((spec: string) => (
                                    <Badge key={spec} variant="secondary">{spec}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {modalCredentials.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-base mb-2">Credentials</h3>
                            <div className="flex flex-wrap gap-2">
                                {modalCredentials.map((cred: string) => (
                                    <Badge key={cred} variant="outline">{cred}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {modalDeliverables && modalDeliverables.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-base mb-2">Standard Deliverables</h3>
                            <div className="flex flex-wrap gap-2">
                                {modalDeliverables.map((del: string) => (
                                    <Badge key={del}>{del}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};