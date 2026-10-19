import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
});

export const metadata = {
  title: "Campus Voice",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={playfair.className}>
        {children}
      </body>
    </html>
  );
}