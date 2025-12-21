export const metadata = {
  title: "Chainova Dashboard",
  description: "Blockchain Security Monitoring Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0, background: "#0b1020", color: "#e6e8ef" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
          <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Chainova</div>
              <div style={{ opacity: 0.75 }}>Blockchain Security Monitoring Dashboard</div>
            </div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              API: <code style={{ background: "#141a33", padding: "2px 6px", borderRadius: 6 }}>http://localhost:3001</code>
            </div>
          </header>
          <main style={{ marginTop: 18 }}>{children}</main>
          <footer style={{ marginTop: 24, opacity: 0.6, fontSize: 12 }}>
            Demo project — rule-based + time-series anomaly detection + optional Gemini batch analysis.
          </footer>
        </div>
      </body>
    </html>
  );
}
