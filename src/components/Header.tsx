export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-lg font-semibold text-white"
        >
          ₵
        </span>
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          Med Bill Decoder
        </span>
      </div>
    </header>
  );
}
