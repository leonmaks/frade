export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {

  return <>
    <main className="min-h-screen flex items-center justify-center">
      {/* <div className="container py-6"> */}
      {/* <div className="overflow-hidden rounded-[0.5rem] border bg-background shadow"> */}
      {/* <div className="flex flex-col items-center justify-center md:pt-8"> */}
      {children}
      {/* </div> */}
      {/* </div> */}
    </main>
  </>
}
