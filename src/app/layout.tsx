import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubjTitute | Teacher matching",
  description:
    "Subject-specific substitute teacher matching for Northview Senior High.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
