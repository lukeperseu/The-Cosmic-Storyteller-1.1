import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'The Cosmic Storyteller',
  description: 'The Cosmic Storyteller - RPG Engine',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-black text-slate-100 font-sans antialiased flex h-screen overflow-hidden relative" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

