import "./globals.css";

export const metadata = {
  title: "City Skyline Day Cycle",
  description: "An animated skyline that changes with local time of day."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
