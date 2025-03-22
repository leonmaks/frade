// "use client"

import {
  ReactNode,
  // useActionState,
  // useEffect
} from "react"

// import Link from "next/link"
// import { useForm } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { toast } from "sonner"

// import { FcGoogle } from "react-icons/fc"
// import { FaGithub } from "react-icons/fa"

// import { Input } from "@/shared/shadcn-ui/input"
// import { Button } from "@/shared/shadcn-ui/button"
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormMessage
// } from "@/shared/shadcn-ui/form"

// import { DottedSeparator } from "@/shared/ui/separator/dotted-separator"

// import { loginSchema, LoginSchemaType } from "../schema"
// import { loginAction } from "../sa"

import {
  CardWrapper
} from "@/shared/ui/card"

import {
  DynaForm,
  DynaFormFieldDef,
  FormAction
} from "@/shared/ui/form"
import { AuthProviders } from "./auth-providers"

type AuthFormLayoutProps = {
  title: string
  description?: string
  fields: DynaFormFieldDef[]
  submit?: ReactNode | string
  formAction: FormAction
  footer?: ReactNode
  cardClasses?: string
}

export const AuthFormLayout = async ({
  title,
  description,
  fields,
  submit,
  formAction,
  footer,
  cardClasses,
}: AuthFormLayoutProps) => {
  // const func__ = "AuthFormLayout"

  // const defaultValues = {
  //   email: "",
  //   password: "",
  // }

  // const form = useForm<LoginSchemaType>({
  //   mode: "onBlur",
  //   resolver: zodResolver(loginSchema),
  //   defaultValues
  // })

  // const [
  //   state, action, isPending
  // ] = useActionState(loginAction, undefined)

  // useEffect(() => {

  //   if (state?.fieldErrors) {
  //     for (const [f, errs] of Object.entries(state.fieldErrors)) {
  //       errs?.forEach(message => {
  //         form.setError(
  //           f as keyof LoginSchemaType,
  //           { message }
  //         )
  //       })
  //     }
  //   }

  //   if (state?.formError) {
  //     toast.error(state.formError)
  //   }
  // }, [state])

  return <>
    <CardWrapper
      title={title}
      description={description}
      footer={footer}
      cardClasses={cardClasses}
    >
      <div className="grid gap-6">

        <DynaForm
          fields={fields}
          formAction={formAction}
          submit={submit}
        />

        <AuthProviders />

      </div>

      {/* <Form {...form}>
        <form
          action={action}
          className="space-y-4"
        >

          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isPending}
                    type="email"
                    placeholder="Email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isPending}
                    type="password"
                    placeholder="Password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {actions}
        </form>
      </Form> */}

      {/* </CardContent>

        <div className="px-7">
          <DottedSeparator />
        </div>

        <CardContent className="flex flex-col p-7 gap-y-4">

          <Button
            disabled={isPending}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <FcGoogle className="mr-2 size-5" />
            Login with Google
          </Button>

          <Button
            disabled={isPending}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <FaGithub className="mr-2 size-5" />
            Login with GitHub
          </Button>
        </CardContent>

        <div className="px-7">
          <DottedSeparator />
        </div>

        <CardFooter className="flex items-center justify-center p-7">
          <p>
            Don&apos;t have an account?&nbsp;
            <Link href="/auth/sign-up">
              <span className="text-blue-700">Sign Up</span>
            </Link>
          </p>
        </CardFooter>
      </Card> */}
    </CardWrapper>
  </>
}
