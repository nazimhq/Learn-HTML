import './globals.css';
import Shell from '@/components/Shell';

export const metadata = {
  title: 'Hizli Inventory',
  description: 'Photo-first inventory, warehouse and e-commerce management'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"/>
      <meta name="theme-color" content="#05070d"/>
    </head>
    <body><Shell>{children}</Shell></body>
  </html>;
}
