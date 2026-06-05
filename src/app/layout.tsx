import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DDM AGENTS · Canvas infinito de IA',
  description: 'Orquestração de múltiplos agentes, terminais, esboços e notas em um canvas infinito.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full min-h-0 bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
