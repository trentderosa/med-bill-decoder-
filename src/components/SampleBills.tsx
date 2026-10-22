import { ComingSoonBadge } from "./UploadPlaceholder";

type SampleBill = {
  id: string;
  title: string;
  issue: string;
  tone: "flag" | "ok";
};

export const SAMPLE_BILLS: readonly SampleBill[] = [
  { id: "er-duplicate", title: "ER visit", issue: "Duplicate charge", tone: "flag" },
  { id: "mri-upcoded", title: "Outpatient MRI", issue: "Possibly upcoded", tone: "flag" },
  { id: "surgery-unbundled", title: "Surgery", issue: "Unbundled labs", tone: "flag" },
  {
    id: "anesthesia-balance",
    title: "Out-of-network anesthesia",
    issue: "Balance bill — No Surprises Act",
    tone: "flag",
  },
  { id: "clean-eob", title: "Clean EOB", issue: "No issues found", tone: "ok" },
];

export function SampleBills() {
  return (
    <section aria-labelledby="samples-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="samples-heading" className="text-lg font-semibold text-slate-900">
          Try a sample bill
        </h2>
        <ComingSoonBadge />
      </div>
      <p className="text-sm text-slate-600">
        Fake, pre-made bills that show what the decoder catches.
      </p>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {SAMPLE_BILLS.map((bill) => (
          <li
            key={bill.id}
            className="w-60 shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-4 sm:w-auto"
          >
            <p className="font-medium text-slate-900">{bill.title}</p>
            <p
              className={
                bill.tone === "ok"
                  ? "mt-1 text-sm text-teal-700"
                  : "mt-1 text-sm text-rose-700"
              }
            >
              {bill.issue}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-600">
              Coming soon
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
