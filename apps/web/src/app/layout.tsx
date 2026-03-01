import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@fontsource-variable/plus-jakarta-sans';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import { AuthProvider } from '../lib/auth-context';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';

export const metadata = {
  title: 'Fitsy — Family Fitness Tracker',
  description: 'Earn points for fitness activities and redeem rewards with your family',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6C5CE7" />
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no, viewport-fit=cover" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications position="top-right" />
          <AuthProvider>
            {children}
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
