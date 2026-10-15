export const metadata = {
  title: 'Totally Mods',
  description: 'Brick Rigs mods',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
