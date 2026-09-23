import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth, signOut } from "@/lib/auth";
import { canAccessExport } from "@/lib/authz";
import Link from "next/link";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Overtime Tracker",
  description: "Log and approve employee overtime",
};

async function NavBar() {
  const session = await auth();
  if (!session?.user) return null;
  const showExport = await canAccessExport(session.user.id, session.user.role);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-5 text-sm font-medium text-navy">
          <Link href="/" className="hover:text-accent">
            My Overtime
          </Link>
          <Link href="/approvals" className="hover:text-accent">
            Approvals
          </Link>
          {session.user.role === "ADMIN" && (
            <Link href="/admin/employees" className="hover:text-accent">
              Approver Setup
            </Link>
          )}
          {showExport && (
            <Link href="/export" className="hover:text-accent">
              Export
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm text-navy/70">
          <span>{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="rounded border border-line px-3 py-1 hover:bg-tint">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
