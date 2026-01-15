'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AdvisorCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-auto pt-4 space-y-2">
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-wrap gap-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-32" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
