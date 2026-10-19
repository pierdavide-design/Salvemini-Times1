import "./globals.css";

export const metadata = {
  title: "Salvemini Times",
  description: "La voce indipendente degli studenti del Salvemini",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className="dark">
      <body className="bg-[#0A0A0A] text-white antialiased">
        {children}
      </body>
    </html>
  );
}