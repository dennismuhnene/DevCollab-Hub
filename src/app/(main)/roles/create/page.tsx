'use client';

import RoleForm from '@/components/role-form';

export default function CreateRolePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold font-headline">Create a New Role</h1>
        <p className="text-muted-foreground">
          Post a role to find the perfect collaborator for your project. Your project details remain private.
        </p>
      </div>
      <RoleForm />
    </div>
  );
}
