export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🥬 Sabzzi</h1>
        <p className="text-muted-foreground">Your grocery tracker app</p>
        <div className="mt-8">
          <p className="text-sm text-green-600">✅ Dev mode active</p>
          <p className="text-sm text-muted-foreground">Logged in as Localhost Dev</p>
        </div>
      </div>
    </div>
  );
}
