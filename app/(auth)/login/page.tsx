"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/provider";
import { MockSessionUser, UserRole } from "@/lib/auth/types";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Data Contract: LoginSchema
export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [authError, setAuthError] = useState<string>("");
  const { login, devLogin, isLoading } = useAuth();
  const router = useRouter();
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const routeUser = (user: MockSessionUser) => {
     if (user.role === UserRole.GLOBAL_ADMIN || user.role === UserRole.SUPERVISOR) {
        router.push("/overview");
     } else if (user.role === UserRole.LOCAL_USER) {
        if (user.market_id) {
           router.push(`/markets/${user.market_id}/board`);
        } else {
           console.error("Local user missing market_id");
           setAuthError("Configuration Error: No market assigned");
        }
     } else {
        router.push("/overview");
     }
  };

  const handleFormSubmit = async (data: LoginFormValues) => {
    setAuthError("");
    try {
      const user = await login(data.email, data.password);
      if (user) {
        routeUser(user);
      } else {
         setAuthError("Authentication Failed: Invalid email or password");
      }
    } catch (err: any) {
      setAuthError("Authentication Failed: Invalid email or password");
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setAuthError("");
    try {
      const user = await devLogin(role);
      if (user) {
        routeUser(user);
      } else {
        setAuthError("Failed to login");
      }
    } catch (err) {
      setAuthError("Failed to login");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input
                id="email"
                type="email"
                placeholder={useMocks ? "m@example.com" : "name@example.com"}
                disabled={isSubmitting || isLoading}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
              <Input
                id="password"
                type="password"
                disabled={isSubmitting || isLoading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {authError}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) ? "Authenticating..." : "Sign In"}
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
                  disabled={isLoading || isSubmitting}
                  className="w-full text-xs"
                >
                  Global Admin
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.SUPERVISOR)}
                  disabled={isLoading || isSubmitting}
                  className="w-full text-xs"
                >
                  Supervisor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.LOCAL_USER)}
                  disabled={isLoading || isSubmitting}
                  className="w-full text-xs"
                >
                  Local User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin(UserRole.READ_ONLY)}
                  disabled={isLoading || isSubmitting}
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
