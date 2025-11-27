'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(9, { message: 'Password must be at least 9 characters long' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      // NON-BLOCKING: We don't await the result.
      // The onAuthStateChanged listener will handle the redirect.
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Login successful!',
        description: "Welcome back to DevCollab Hub.",
      });
      router.push('/developers');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: errorMessage,
      });
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
            <LogIn className="ml-2 h-4 w-4" />
          </Button>
        </form>
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
