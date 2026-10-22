export function UploadPlaceholder() {
  return (
    <section aria-labelledby="upload-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="upload-heading" className="text-lg font-semibold text-slate-900">
          Upload a bill or EOB
        </h2>
        <ComingSoonBadge />
      </div>
      <div
        aria-disabled="true"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center opacity-75"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-10 w-10 text-slate-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          />
        </svg>
        <p className="text-sm text-slate-600">
          Photo (JPG, PNG) or PDF of a medical bill or Explanation of Benefits
        </p>
        <label htmlFor="bill-upload" className="sr-only">
          Upload a medical bill or EOB (coming soon)
        </label>
        <input id="bill-upload" type="file" disabled className="sr-only" />
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Choose file — coming soon
        </button>
      </div>
    </section>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
      Coming soon
    </span>
  );
}
