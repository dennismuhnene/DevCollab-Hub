import ProjectForm from '@/components/project-form';

export default function NewProjectPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create a New Project</h1>
        <p className="text-muted-foreground">
          Fill out the details below to find collaborators for your next big idea.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
