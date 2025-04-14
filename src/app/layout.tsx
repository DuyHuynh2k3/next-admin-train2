"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "styled-components";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "../components/Layout/Layout";
import { GlobalStyle } from "../styles/globalStyles";
import { lightTheme, darkTheme } from "../styles/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDarkMode = false;
  const pathname = usePathname(); // Lấy đường dẫn hiện tại

  const isLoginPage = pathname.startsWith("/LoginTicket"); // Kiểm tra nếu là trang Login

  return (
    <html lang="en">
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <GlobalStyle />
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* Nếu là trang Login thì không bọc trong Layout */}
          {isLoginPage ? children : <Layout>{children}</Layout>}
        </body>
      </ThemeProvider>
    </html>
  );
}
