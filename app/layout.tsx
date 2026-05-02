export const metadata = {
  title: 'IDE',
  description: 'A barebones in-browser C/C++ IDE powered by @jtrb/runtime',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          background: '#0a0a0a',
          color: '#e5e5e5',
        }}
      >
        {children}
      </body>
    </html>
  );
}
