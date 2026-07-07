import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Sky Yoga Daily Fitness Report",
  description: "Daily yoga check-ins and seven day reports"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="appChrome">
          <header className="topBar">
            <Link href="/" className="brand">
              SKY Yoga Daily Fitness Report
            </Link>
            <nav className="navLinks" aria-label="Primary navigation">
              <Link href="/">Check-in</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
