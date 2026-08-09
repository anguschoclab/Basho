/**
 * SplashScreen.tsx — Branded loading screen shown while BardEngine domains load.
 * Dark background matching the app theme-color (#0f172a) from index.html.
 */

export function SplashScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-background"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-serif font-bold tracking-wide text-foreground">
          Basho
        </h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm">Loading narrative engine…</span>
        </div>
      </div>
    </div>
  );
}
