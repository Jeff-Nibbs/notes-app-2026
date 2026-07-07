import { Nav } from "@/components/nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4">
        {children}
      </main>
    </>
  );
}
