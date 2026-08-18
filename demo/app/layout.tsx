import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Oak & Pine | Thoughtful care for your home",
  description:
    "Trusted home cleaning and repair services across San Francisco. Straightforward booking, exceptional care, and one dependable team.",
};

export const viewport: Viewport = {
  themeColor: "#173b32",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
