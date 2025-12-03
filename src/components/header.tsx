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
import { LogIn, UserPlus, User, LogOut, MessageSquare, Users, LayoutDashboard, Menu, Contact, PenSquare } from 'lucide-react';
import Notifications from './notifications';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import Image from 'next/image';

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
        <div className="flex items-center space-x-2">
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
        </div>
    );
  }
  return <>{children}</>;
}


export default function Header() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isAdmin = user?.email === 'dennis.cmuhnene@gmail.com';

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      router.push('/');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const navLinks = [
    { href: "/developers", label: "Discover", icon: Users },
    { href: "/projects", label: "My Projects", icon: LayoutDashboard },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/blogs", label: "Blog", icon: PenSquare },
    { href: "/contact", label: "Contact", icon: Contact },
  ];
  
  const mobileNavLinks = [
    ...navLinks,
  ];

  return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center px-4">
          <nav className="flex flex-1 items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-2 md:space-x-6 text-sm font-medium">
              <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2">
                <Image src="/images/devcollab-logo.png" alt="DevCollab Hub Logo" width={32} height={32} className="h-8 w-8" />
                <span className="font-bold hidden sm:inline-block text-[#c5a35a] text-lg">DevCollab Hub</span>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <ClientOnly>
                  {user && (
                    <>
                      {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground/80 text-foreground/60">
                          {link.label}
                        </Link>
                      ))}
                    </>
                  )}
                </ClientOnly>
              </div>
            </div>

            {/* Center (only for logged-out users on desktop) */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
                <ClientOnly>
                    {!user && (
                        <Link href="/blogs" className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60">Blog</Link>
                    )}
                </ClientOnly>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              <ClientOnly>
                {loading ? (
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
                ) : user ? (
                  <>
                    <Notifications />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="relative h-8 w-8 rounded-full"
                        >
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
                         <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/profile')}>
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/messages')}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>Messages</span>
                        </DropdownMenuItem>
                         {isAdmin && (
                            <DropdownMenuItem onSelect={() => router.push('/d_blog')}>
                                <PenSquare className="mr-2 h-4 w-4" />
                                <span>Blog Dashboard</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className='hidden md:flex items-center space-x-2'>
                    <Button variant="ghost" asChild>
                        <Link href="/contact">
                        Contact
                        </Link>
                    </Button>
                    <div className="w-px h-6 bg-border"></div>
                    <Button variant="ghost" asChild>
                      <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/signup">
                        Sign Up
                      </Link>
                    </Button>
                  </div>
                )}
              </ClientOnly>
              <div className="md:hidden">
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-3/4">
                       <SheetTitle className="sr-only">Menu</SheetTitle>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center border-b p-4">
                                <Link href="/" className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
                                    <Image src="/images/devcollab-logo.png" alt="DevCollab Hub Logo" width={32} height={32} className="h-8 w-8" />
                                    <span className="font-bold text-[#c5a35a]">DevCollab Hub</span>
                                </Link>
                            </div>
                            <div className="flex flex-col space-y-2 p-4 flex-1">
                                {user ? (
                                     mobileNavLinks.map((link) => (
                                        <SheetClose asChild key={link.href}>
                                            <Link href={link.href} className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center gap-2 py-2">
                                                <link.icon className="h-5 w-5" />
                                                {link.label}
                                            </Link>
                                        </SheetClose>
                                    ))
                                ) : (
                                    <>
                                        <SheetClose asChild>
                                            <Link href="/blogs" className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center gap-2 py-2">
                                                <PenSquare className="h-5 w-5" />
                                                Blog
                                            </Link>
                                        </SheetClose>
                                         <SheetClose asChild>
                                            <Link href="/contact" className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center gap-2 py-2">
                                                <Contact className="h-5 w-5" />
                                                Contact
                                            </Link>
                                        </SheetClose>
                                    </>
                                )}
                            </div>
                            <div className="mt-auto border-t p-4">
                               <ClientOnly>
                                {!user && (
                                    <div className="flex flex-col space-y-2">
                                        <SheetClose asChild>
                                            <Button variant="ghost" asChild>
                                            <Link href="/login">
                                                <LogIn className="mr-2 h-4 w-4" />
                                                Sign In
                                            </Link>
                                            </Button>
                                        </SheetClose>
                                        <SheetClose asChild>
                                            <Button asChild>
                                            <Link href="/signup">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Sign Up
                                            </Link>
                                            </Button>
                                        </SheetClose>
                                    </div>
                                )}
                               </ClientOnly>
                            </div>
                        </div>
                    </SheetContent>
                  </Sheet>
              </div>
            </div>
          </nav>
        </div>
      </header>
  );
}
