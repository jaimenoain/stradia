"use client";

import { useState } from "react";
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
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ResetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  // Supabase auth handles updating the user when they click the link from the email
  // The link will bring them to this page with an access_token in the URL hash, which supabase
  // will process automatically and update the session. Then they can update their password.
  const handleFormSubmit = async (data: ResetPasswordFormValues) => {
    setError("");
    setSuccess(false);
    try {
      if (useMocks) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSuccess(true);
      } else {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          password: data.password
        });

        if (error) {
          throw error;
        }
        setSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to reset password");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your password has been reset successfully.
                </AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">New Password</label>
                <Input
                  id="password"
                  type="password"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Confirm Password</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  disabled={isSubmitting}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
           <Link href="/login" className="hover:underline">Back to Login</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
