import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Suraksha AI — Proactive Intelligent Protection",
  description: "AI-assisted personal safety platform providing discreet emergency detection, instant response coordination, and continuous trusted circle connectivity.",
  icons: {
    icon: "/Assets/shield_logo.svg",
    apple: "/Assets/shield_logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F8FAFC] text-[#0F172A]`}
      style={{ colorScheme: 'light' }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
