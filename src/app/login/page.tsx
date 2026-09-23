import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const devLoginEnabled = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-navy">Overtime Tracker</h1>
        <p className="mb-6 text-sm text-navy/50">
          Sign in with your company Google account to continue.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in with Google
          </button>
        </form>

        {devLoginEnabled && (
          <>
            <div className="my-6 flex items-center gap-2 text-xs text-navy/40">
              <div className="h-px flex-1 bg-line" />
              DEV LOGIN (local testing only)
              <div className="h-px flex-1 bg-line" />
            </div>
            <form
              action={async (formData: FormData) => {
                "use server";
                await signIn("dev-login", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/",
                });
              }}
              className="space-y-2 text-left"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="approver.a@example.com"
                className="w-full rounded border border-line px-3 py-2 text-sm"
              />
              <input
                name="password"
                type="password"
                required
                defaultValue="devpassword"
                className="w-full rounded border border-line px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-tint"
              >
                Dev sign in
              </button>
              <p className="text-xs text-navy/40">
                Seeded accounts: approver.a@example.com, approver.b@example.com,
                employee.one@example.com, employee.two@example.com, admin@example.com
                &middot; password: devpassword
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
