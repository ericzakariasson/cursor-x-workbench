import "./globals.css";

export const metadata = {
  title: "Time of Day Skyline",
  description: "A city skyline scene that changes with the time of day."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
