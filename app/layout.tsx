import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI FAQ Generator POC',
  description: 'AI-driven FAQ generation using OpenAI Agents SDK and MCP tools',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

