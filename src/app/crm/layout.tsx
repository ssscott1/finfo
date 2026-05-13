import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finfo CRM',
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f7f5' }}>
        {children}
      </body>
    </html>
  );
}
