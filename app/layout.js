import "./globals.css";

export const metadata = {
  title: "Generative Piano Canvas",
  description: "A web piano that paints live particles, waves, and fractals with audio-reactive visuals."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
