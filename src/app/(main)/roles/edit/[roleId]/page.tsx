'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import RoleForm from '@/components/role-form';
import { Role } from '@/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditRolePage() {
  const { user } = useAuth();
  const params = useParams();
  const roleId = params.roleId as string;
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !roleId) return;

    const fetchRole = async () => {
      setLoading(true);
      try {
        const roleRef = doc(db, 'roles', roleId);
        const docSnap = await getDoc(roleRef);

        if (docSnap.exists()) {
          const roleData = { id: docSnap.id, ...docSnap.data() } as Role;
          if (roleData.ownerId === user.uid) {
            setRole(roleData);
          } else {
            setError('You do not have permission to edit this role.');
          }
        } else {
          setError('Role not found.');
        }
      } catch (e) {
        console.error("Error fetching role: ", e);
        setError('Failed to fetch role data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, roleId]);

  const FormSkeleton = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
       <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold font-headline">Edit Role</h1>
        <p className="text-muted-foreground">Update the details for your posted role.</p>
      </div>
      {loading ? (
        <FormSkeleton />
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : role ? (
        <RoleForm role={role} />
      ) : null}
    </div>
  );
}
