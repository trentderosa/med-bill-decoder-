export const DISCLAIMER_TEXT =
  "Demo only. Use fake sample bills — never upload real patient information. Nothing is stored. Educational, not legal or medical advice.";

export function Disclaimer() {
  return (
    <aside
      role="note"
      aria-label="Disclaimer"
      className="border-b border-amber-200 bg-amber-50 text-amber-900"
    >
      <p className="mx-auto max-w-5xl px-4 py-2 text-center text-sm leading-snug sm:px-6">
        {DISCLAIMER_TEXT}
      </p>
    </aside>
  );
}
