import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Books for the twenty-first century',
  description: 'AI-powered idea generation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
