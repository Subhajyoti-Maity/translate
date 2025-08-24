import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real-time Chat Application",
  description: "A Next.js real-time chat application with modern features",
  keywords: ["chat", "real-time", "nextjs", "socket.io", "messaging"],
  authors: [{ name: "Chat App Team" }],
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
