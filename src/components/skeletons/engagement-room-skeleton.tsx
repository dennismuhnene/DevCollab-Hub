'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EngagementRoomSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-5 w-1/3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Chat and Milestones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-7 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-6 w-6" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                   <Skeleton className="h-4 w-1/2" />
                </div>
                 <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
          
          {/* Chat */}
          <Card className="flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle><Skeleton className="h-7 w-32" /></CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-hidden">
                <div className="flex items-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-12 w-48 rounded-lg" />
                </div>
                 <div className="flex items-end gap-2 justify-end">
                    <Skeleton className="h-16 w-64 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                 <div className="flex items-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
            </CardContent>
            <div className="p-4 border-t">
                 <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>

        {/* Sidebar: Details and Outcome Log */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-7 w-40" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-7 w-36" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
