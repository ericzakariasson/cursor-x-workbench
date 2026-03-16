import "./globals.css";

export const metadata = {
  title: "Voice Sand Garden",
  description: "Mic-reactive 3D terrain sculpting with exportable STL."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
