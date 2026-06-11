import "./globals.css";

export const metadata = {
  title: "Clinic Voice Desk",
  description: "Outbound AI doctor appointment receptionist"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

