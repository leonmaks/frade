"use client"

import { User } from "next-auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Input } from "@/shared/shadcn-ui/input"
import { Button } from "@/shared/shadcn-ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/shadcn-ui/form"

import { updateUserProfileSchema, UpdateUserProfileValues } from "@/features/user-profile"

import { updateUserProfile } from "../../features/user-profile/sa/update-user-profile"

type UserSettingsProps = {
  user: User
}

export default function UserSettings({
  user,
}: UserSettingsProps) {
  // const { toast } = useToast()

  const form = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: { name: user.name || "" },
  })

  async function onSubmit(data: UpdateUserProfileValues) {
    try {
      await updateUserProfile(data)
      toast.success("Profile updated.")
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    }
  }

  return (
    <main className="px-3 py-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-sm space-y-2.5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a username" {...field} />
                  </FormControl>
                  <FormDescription>Your public username</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Submit
            </Button>
          </form>
        </Form>
      </section>
    </main>
  )
}
