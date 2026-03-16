import "./globals.css";

export const metadata = {
  title: "Generative Kimono Pattern Designer",
  description: "Interactive kimono textile pattern playground with deep slider controls."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
