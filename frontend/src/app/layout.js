import "@fontsource/inter"; // Import the font
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "Healthcare Platform",
  description:
    "AI-Enabled Smart Healthcare Appointment & Telemedicine Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
