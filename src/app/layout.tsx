import { Provider } from '@shared/ui/provider';
import { Box } from '@chakra-ui/react';
import Link from 'next/link';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Provider>
          <Box>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </Box>
          {children}
        </Provider>
      </body>
    </html>
  );
}
