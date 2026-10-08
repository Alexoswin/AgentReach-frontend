import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-bg",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReachConvert — AI Outreach Platform",
  description:
    "Personalized bulk email, autonomous AI calling agents, and real-time outreach analytics in one signal-driven workspace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser chrome follows the OS, matching the default 'system' theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#060b0d" },
  ],
};

/**
 * Applies the stored theme before first paint so there is no flash
 * of the wrong theme. 'system', unknown themes, and signed-out visitors
 * follow prefers-color-scheme. Must stay in sync with lib/localAuth
 * (normalizeUser, resolveTheme, applyTheme).
 */
const themeBootScript = `(function(){try{
var themes=["dark-midnight","dark-slate","dark-graphite","dark-violet","light-cloud","light-paper","light-mint","light-rose"];
var accents=["volt","emerald","sky","rose","amber","violet"];
var u=JSON.parse(localStorage.getItem("reachconvert_user")||"{}")||{};
var t=u.theme==="dark"?"dark-midnight":u.theme==="light"?"light-cloud":u.theme;
if(!u.email||themes.indexOf(t)<0)t=matchMedia("(prefers-color-scheme: light)").matches?"light-cloud":"dark-midnight";
var a=u.accentColor==="indigo"?"sky":accents.indexOf(u.accentColor)<0?"sky":u.accentColor;
var light=t.indexOf("light-")===0;
var d=document;
d.documentElement.classList.toggle("dark",!light);
d.documentElement.classList.toggle("light",light);
d.body.classList.toggle("theme-light",light);
d.body.dataset.theme=t;
d.body.dataset.accent=a;
}catch(e){}})();`;

const GA_MEASUREMENT_ID = "G-KJ0J7EL065";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased dark ${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <Providers>{children}</Providers>
        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
