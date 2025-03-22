import Link from "next/link"

import {
  DynaFormFieldPassword,
  DynaFormFieldText,
} from "@/shared/ui/form"

import { registerAction } from "../sa"
import { AuthFormLayout } from "../ui"

export const SignUpForm = () => {

  return (
    <AuthFormLayout
      title="Sign Up"
      description={
        "Create your account to get started!"
      }
      fields={[
        { name: "name", label: "Name", fieldTypeId: DynaFormFieldText },
        { name: "email", label: "Email", fieldTypeId: DynaFormFieldText },
        { name: "password", label: "Password", fieldTypeId: DynaFormFieldPassword },
      ]}
      submit="Sign Up"
      formAction={registerAction}
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?&nbsp;
          <Link href="/auth/sign-in">
            <span className="text-blue-700">Sign In</span>
          </Link>
        </p>
      }
      cardClasses="max-w-md"
    />
  )
}
