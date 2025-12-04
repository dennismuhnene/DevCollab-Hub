
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// Define a separate SVG component for the Google icon
const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.1 0 127.9 111.8 16 244 16c73.1 0 134.3 29.3 179.7 73.1l-63.8 62.1C333.6 116.3 294.4 96 244 96c-82.3 0-149.2 67.5-149.2 150.5S161.7 397 244 397c94.3 0 135.3-77.4 140.8-115.4H244V261.8h244z"></path>
    </svg>
);


const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(9, { message: 'Password must be at least 9 characters long' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            const userData = {
                uid: user.uid,
                name: user.displayName,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                skills: [],
                bio: '',
                openForCollaboration: true,
            };
            setDocumentNonBlocking(userDocRef, userData, { merge: false });
        }

        toast({
            title: 'Login successful!',
            description: "Welcome back to DevCollab Hub.",
        });
        router.push('/developers');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Google Sign-In failed',
            description: error.message,
        });
    } finally {
        setGoogleLoading(false);
    }
  };


  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      if (!userCredential.user.emailVerified) {
        // Automatically send a verification email for unverified users trying to log in.
        await sendEmailVerification(userCredential.user);
        
        toast({
            variant: 'destructive',
            title: 'Email Not Verified',
            description: 'A new verification email has been sent. You must verify your email address before logging in.',
        });
        
        router.push('/verify-email');
        setLoading(false);
        return;
      }

      toast({
        title: 'Login successful!',
        description: "Welcome back to DevCollab Hub.",
      });
      router.push('/developers');
      
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Cannot find a user with that email. Please sign up first.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
        <CardDescription>Sign in to continue to DevCollab Hub</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
            {googleLoading ? 'Signing in...' : <><GoogleIcon /> Continue with Google</>}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" passHref>
                  <Button variant="link" className="px-0 text-sm">Forgot password?</Button>
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? 'Signing in...' : 'Sign In'}
              <LogIn className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" passHref>
            <Button variant="link" className="px-0">Sign up</Button>
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
