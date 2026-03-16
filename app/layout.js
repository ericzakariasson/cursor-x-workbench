import "./globals.css";

export const metadata = {
  title: "Web Piano Painter",
  description: "A Web Audio piano with generative canvas visuals and GIF export."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
