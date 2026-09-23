import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// We intentionally do NOT use the Prisma adapter here: sessions are JWT-based
// (stateless), and on first sign-in we look up (or create) the matching row
// in our own `User` table by email, so `User` can stay shaped around our
// domain fields (role, approver1Id, approver2Id) instead of the adapter's
// generic shape.

// DEV-ONLY: lets you sign in as any seeded user (e.g. approver.a@example.com,
// approver.b@example.com) with one shared password, so you can test the
// approval flow locally without setting up real Google OAuth. Never enabled
// outside development — see the NODE_ENV guard below.
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "devpassword";

// Anyone signing in with Google using this email domain is auto-provisioned
// as a new EMPLOYEE on first sign-in — no admin pre-provisioning step
// needed. (The dev-login credentials provider above is unaffected: it
// still only works for users that already exist, since it's for testing
// against known seeded fixtures.)
const SELF_SIGNUP_EMAIL_DOMAIN = "@shipsy.io";

// Every self-signed-up employee defaults to these two as Approver 1/2,
// unless they *are* one of these two people. An admin can still change
// either assignment later from /admin/employees.
const DEFAULT_APPROVER_EMAILS: string[] = ["prem@shipsy.io", "naresh.reddy@shipsy.io"];

async function getDefaultApproverIds(): Promise<[string, string]> {
  const approvers = await Promise.all(
    DEFAULT_APPROVER_EMAILS.map((email) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: email.split("@")[0], role: "EMPLOYEE" },
      })
    )
  );
  return [approvers[0].id, approvers[1].id];
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(process.env.NODE_ENV !== "production"
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev login (local testing only)",
            credentials: {
              email: { label: "Email", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const email = credentials?.email as string | undefined;
              const password = credentials?.password as string | undefined;
              if (!email || password !== DEV_LOGIN_PASSWORD) return null;
              const user = await prisma.user.findUnique({ where: { email } });
              if (!user) return null;
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "google" && user.email.endsWith(SELF_SIGNUP_EMAIL_DOMAIN)) {
        return true;
      }
      // Everyone else (dev-login, or a Google account outside the company
      // domain) must already exist as a User row.
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return Boolean(existing);
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (
          !dbUser &&
          account?.provider === "google" &&
          user.email.endsWith(SELF_SIGNUP_EMAIL_DOMAIN)
        ) {
          // The very first person ever to sign in becomes ADMIN, so a fresh
          // deployment has someone able to reach /admin/employees without
          // any manual DB bootstrap step. Everyone after that is EMPLOYEE.
          const isFirstUser = (await prisma.user.count()) === 0;
          const isDefaultApprover = DEFAULT_APPROVER_EMAILS.includes(user.email);
          const [approver1Id, approver2Id] = isDefaultApprover
            ? [null, null]
            : await getDefaultApproverIds();
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email,
              role: isFirstUser ? "ADMIN" : "EMPLOYEE",
              approver1Id,
              approver2Id,
            },
          });
        }
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as "EMPLOYEE" | "ADMIN";
      }
      return session;
    },
  },
});
