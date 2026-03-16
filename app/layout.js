import "./globals.css";

export const metadata = {
  title: "Type Anatomy Explorer",
  description: "Interactive typography anatomy explorer with font comparison and quiz mode.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
