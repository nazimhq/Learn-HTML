import './globals.css';
import Shell from '@/components/Shell';

export const metadata = {
  title: 'Hizli Inventory',
  description: 'Photo-first inventory and warehouse management'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
