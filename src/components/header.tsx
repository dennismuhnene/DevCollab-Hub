'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogIn, UserPlus, Code2, User, LogOut, Sparkles, Users } from 'lucide-react';

export default function Header() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-7xl items-center">
        <div className="mr-4 flex">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="font-bold">DevCollab Hub</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/projects" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Projects
          </Link>
          {user && (
            <>
              <Link href="/discover" className="flex items-center gap-1.5 transition-colors hover:text-foreground/80 text-foreground/60">
                <Sparkles className="h-4 w-4 text-accent" />
                Discover
              </Link>
              <Link href="/developers" className="flex items-center gap-1.5 transition-colors hover:text-foreground/80 text-foreground/60">
                <Users className="h-4 w-4" />
                Developers
              </Link>
            </>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.photoURL} alt={userProfile?.name} />
                    <AvatarFallback>{userProfile?.name ? getInitials(userProfile.name) : 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
