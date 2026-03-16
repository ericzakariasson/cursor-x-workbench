import "./globals.css";

export const metadata = {
  title: "Mood to Abstract Painting",
  description: "Type a sentence and watch it become mood-based abstract art."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
