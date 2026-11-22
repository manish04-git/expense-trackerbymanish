export default function SetupRequired() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-lg space-y-3 rounded-2xl border bg-surface p-6">
        <h1 className="text-lg font-semibold">Firebase is not configured</h1>
        <p className="text-sm text-muted">
          Copy <code className="rounded bg-bg px-1">.env.example</code> to <code className="rounded bg-bg px-1">.env.local</code>,
          fill in your Firebase web app values, then restart <code className="rounded bg-bg px-1">npm run dev</code>.
          The README has the step-by-step guide.
        </p>
      </div>
    </div>
  )
}
