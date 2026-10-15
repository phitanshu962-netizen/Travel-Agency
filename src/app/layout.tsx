import type { Metadata, Viewport } from "next";
import { Poppins, Inter, Playfair_Display, DM_Sans, Plus_Jakarta_Sans, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { injectImageStyles } from '@/lib/imageStyles';
import { GA_MEASUREMENT_ID } from "@/lib/gtag";
import MicrosoftClarity from "@/components/MicrosoftClarity";

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "TripDM: Direct Message. Better Travel.",
  description: "TripDM connects travelers directly with trusted travel agents through instant messaging.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TripDM",
  },
  verification: {
    google: "w1V-GlWBQftzDwWc-qjkfD9-W384Q5be7h465tV5cF4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inject image loading styles
  injectImageStyles();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        <MicrosoftClarity />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} ${inter.variable} ${playfair.variable} ${dmSans.variable} ${jakarta.variable} ${outfit.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ComparisonProvider>
            {children}
          </ComparisonProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
