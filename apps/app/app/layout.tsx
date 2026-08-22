import type { Metadata } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/query-provider";
import { VersionPrompt } from "@/components/version-prompt";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const title = "Oak | Supervised operations for service businesses";
const description =
  "Delegate routine customer work while keeping human control over the decisions and commitments that matter.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bo.builtby.vin"),
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <VersionPrompt />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
