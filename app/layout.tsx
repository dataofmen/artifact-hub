import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Artifact Hub",
  description: "바이브 코딩 산출물을 한곳에 모아두는 개인 보관함",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <ClerkProvider>
          <header className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
              <Link href="/" className="font-semibold tracking-tight">
                Artifact Hub
              </Link>
              <nav className="text-sm text-zinc-500 dark:text-zinc-400">
                <Show when="signed-in">
                  <Link href="/upload" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    올리기
                  </Link>
                </Show>
              </nav>
              <div className="ms-auto flex items-center gap-3">
                <Show when="signed-out">
                  <SignInButton />
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
