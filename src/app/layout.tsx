import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospital San Juan de Dios — Sistema FARO",
  description: "Sistema Integrado de Gestión Hospitalaria — EHR, HIS, Triage, LIS, RIS, Farmacia. Estándar HL7/FHIR R4.",
  keywords: "hospital, EHR, HIS, gestión médica, historia clínica, FHIR, HL7, emergencias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
