import "./globals.css";

export const metadata = {
  title: "Simple Spreadsheet App",
  description: "A tiny spreadsheet with live formula evaluation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
