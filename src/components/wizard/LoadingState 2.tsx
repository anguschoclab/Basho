/**
 * LoadingState.tsx
 *
 * Loading state for world seed generation.
 */

export function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 hero-gradient">
      <div className="h-16 w-16 bg-primary rounded-full animate-ping opacity-20 mb-6" />
      <p className="text-sm font-display font-black uppercase tracking-widest opacity-50">
        Forging World Seed...
      </p>
    </div>
  );
}
