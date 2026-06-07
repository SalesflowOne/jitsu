import { SignUp } from "@clerk/nextjs";
import Head from "next/head";
import Link from "next/link";
import { isClerkEnabled } from "@/lib/clerk-config";

export default function SignUpPage() {
  if (!isClerkEnabled()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <Link href="/dashboard" className="btn-primary">
          Continue to demo dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign up — Salesflow Attribution</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/dashboard" />
      </div>
    </>
  );
}
