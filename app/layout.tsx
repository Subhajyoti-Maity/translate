import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Translate - Real-time Multilingual Chat App",
  description: "A Next.js real-time chat application with automatic language translation powered by Google Translate API",
  keywords: ["chat", "translation", "multilingual", "real-time", "nextjs", "socket.io"],
  authors: [{ name: "Chat Translate Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
