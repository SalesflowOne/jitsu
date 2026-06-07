import { SignIn } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import { isClerkEnabled } from "@/lib/clerk-config";

export default function SignInPage() {
  if (!isClerkEnabled()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-600">
          Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Continue to demo dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign in — Salesflow Attribution</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/dashboard" />
      </div>
    </>
  );
}
