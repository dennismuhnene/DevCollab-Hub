'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function AdvisorProfileSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (Advisor Details) */}
        <div className="md:col-span-1 flex flex-col items-center bg-card p-6 rounded-lg border">
          <Skeleton className="h-32 w-32 rounded-full mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="w-full space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-10 w-full mt-6" />
        </div>

        {/* Right Column (Tabs) */}
        <div className="md:col-span-2">
          <div className="w-full border-b">
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="mt-6 space-y-6">
            {/* Placeholder for tab content */}
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
