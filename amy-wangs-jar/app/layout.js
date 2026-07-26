import { Instrument_Serif, Roboto } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Taskbar from "@/components/Taskbar";
import Footer from "@/components/Footer";
import SocialColumn from "@/components/SocialColumn";

const singsong = localFont({
  src: "../public/fonts/singsong/Singsong.otf",
  variable: "--font-singsong",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata = {
  title: "Amy Wang's Jar",
  description: "A little corner of the internet.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${singsong.variable} ${instrumentSerif.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-roboto">
        <Taskbar />
        <SocialColumn />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
