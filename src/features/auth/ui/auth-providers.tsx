import { FaGithub, FaGoogle } from "react-icons/fa"

import { Button } from "@/shared/shadcn-ui/button"

import authConfig from "../auth.config"

export const AuthProviders = () => {
  // const func__ = "AuthProviders"

  const providers = authConfig.providers

  // console.log(func__, { providers })

  const ProviderIcon = ({ providerId }: { providerId: string }) => {
    switch (providerId) {
      case "github":
        return <FaGithub className="mr-2 size-6" />
      case "google":
        return <FaGoogle className="mr-2 size-6" />
      default:
        return null
    }
  }

  return providers.length > 0 ? (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {providers.map(provider => (
        <Button
          key={provider.id}
          variant="outline"
          type="button"
        // disabled={isLoading}
        >
          {
            // isLoading ? (
            //   <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            // ) : (
            // <Icons.gitHub className="mr-2 h-4 w-4" />
            // )
          }
          <ProviderIcon providerId={provider.id} />
          {" "}
          {provider.name}
        </Button>
      ))}

    </>
  ) : null
}
