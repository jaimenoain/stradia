import { createOrganization } from './actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Stradia</CardTitle>
          <CardDescription>
            To get started, please create an organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganization} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="organizationName"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Organization Name
              </label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="Acme Corp"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create Organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
