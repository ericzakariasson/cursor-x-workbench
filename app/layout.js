import "./globals.css";

export const metadata = {
  title: "Cursor X Workbench",
  description: "A super vanilla Next.js app."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <div className="app-shell__content">{children}</div>
        <footer className="app-shell__footer">
          <span>Built with Cursor</span>
          <a href="https://cursor.com/agents" target="_blank" rel="noreferrer">
            cursor.com/agents
          </a>
        </footer>
      </body>
    </html>
  );
}
