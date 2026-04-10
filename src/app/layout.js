import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CAMPIFY - Campus Connect",
  description: "Your all-in-one campus management platform for events, marketplace, notes, lost & found, and team collaboration",
  manifest: "/manifest.json",
  themeColor: "#2f5d56",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CAMPIFY",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#2f5d56",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: '80px',
          }}
          containerClassName="md:!bottom-auto md:!top-4 md:!right-4"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fbf7f0',
              color: '#2f2a26',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid #d9cdbb',
              boxShadow: '0 8px 20px rgba(77, 64, 49, 0.12)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
