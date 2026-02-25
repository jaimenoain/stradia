
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuspendedPage() {
  // Static lockout page - accessible without auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>Subscription Suspended</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your tenant&apos;s subscription has been suspended due to payment issues or inactivity.
            Please contact support to reactivate your account.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
                <a href="/login">Return to Login</a>
            </Button>
            <Button variant="default" asChild>
                <a href="mailto:support@example.com">Contact Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
