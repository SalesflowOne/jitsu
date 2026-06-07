import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk-config";
import "../styles/globals.css";

const App: NextPage<AppProps> = ({ Component, pageProps }) => {
  const content = (
    <>
      <Head>
        <title>Salesflow Attribution</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );

  if (isClerkEnabled()) {
    return <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>{content}</ClerkProvider>;
  }

  return content;
};

export default App;
