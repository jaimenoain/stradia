import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signup } from '../login/actions';
import Link from 'next/link';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {Array.isArray(error) ? error[0] : error}
            </div>
          )}
          <form action={signup} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign Up
            </Button>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
