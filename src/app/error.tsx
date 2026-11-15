"use client";

// Shown instead of a blank page if something in the app crashes.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-medium text-slate-900">Something went wrong</h1>
      <p className="mt-3 text-slate-600">
        Your profile and tracker are saved in your browser, so nothing is lost. Try again, or reload the page.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <button onClick={() => location.reload()} className="btn-secondary">Reload</button>
      </div>
    </main>
  );
}
