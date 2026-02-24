"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/provider";
import { UserRole } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMockUserByEmail } from "@/lib/auth/mock";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (useMocks) {
      const user = getMockUserByEmail(email);
      if (!user) {
        setError("Invalid email or password");
        return;
      }

      try {
        await login(user.role);
        router.push("/overview");
      } catch (err) {
        setError("Failed to login");
      }
    } else {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message || "Failed to login");
      } else {
        router.push("/overview");
      }
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError("");
    try {
      await login(role);
      router.push("/overview");
    } catch (err) {
      setError("Failed to login");
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input
                id="email"
                type="email"
                placeholder={useMocks ? "m@example.com" : "name@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {useMocks && (
            <>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with (Dev Mode)
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.GLOBAL_ADMIN)}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  Global Admin
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.SUPERVISOR)}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  Supervisor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.LOCAL_USER)}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  Local User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.READ_ONLY)}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  Read Only
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
           <p>Don&apos;t have an account? Contact admin.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
