'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Role } from '@/types';
import RoleCardEdit from '@/components/role-card-edit';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyRolesPage() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRoles = async () => {
      setLoading(true);
      try {
        const rolesQuery = query(collection(db, 'roles'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(rolesQuery);
        const userRoles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
        setRoles(userRoles);
      } catch (error) {
        console.error("Error fetching roles: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const ListSkeleton = () => (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-2xl font-semibold leading-none tracking-tight mb-4 sm:mb-0">My Posted Roles</h1>
        <Button asChild>
          <Link href="/roles/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Role
          </Link>
        </Button>
      </div>

      {authLoading || loading ? (
        <ListSkeleton />
      ) : roles.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <RoleCardEdit key={role.id} role={role} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">You haven't posted any roles yet.</h2>
          <p className="text-muted-foreground mt-2">Click the button above to create a role and find collaborators.</p>
        </div>
      )}
    </div>
  );
}
