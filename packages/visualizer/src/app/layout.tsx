import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'algo-jit Visualizer',
  description: 'Live code visualization for algorithms',
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
