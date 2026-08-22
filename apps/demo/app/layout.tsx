import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { QueryProvider } from "@/components/query-provider";
import { DemoResetGuard } from "@/components/demo-reset-guard";
import { VersionPrompt } from "@/components/version-prompt";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const title = "Oak & Pine | Thoughtful care for your home";
const description =
  "Trusted home cleaning and repair services across San Francisco. Straightforward booking, exceptional care, and one dependable team.";

export const metadata: Metadata = {
  metadataBase: new URL("https://oak.builtby.vin"),
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image.png"] },
};

export const viewport: Viewport = {
  themeColor: "#173b32",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <QueryProvider>
          {children}
          <DemoResetGuard />
          <VersionPrompt />
        </QueryProvider>
      </body>
    </html>
  );
}
