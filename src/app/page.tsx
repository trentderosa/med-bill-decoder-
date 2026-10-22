import { SampleBills } from "@/components/SampleBills";
import { UploadPlaceholder } from "@/components/UploadPlaceholder";

const FEATURES = [
  { title: "Plain-English line items", body: "Every code and charge, explained." },
  { title: "Error flags", body: "Duplicates, upcoding, unbundling, surprise bills." },
  { title: "What you actually owe", body: "An estimate based on your coverage." },
  { title: "Dispute letter", body: "A ready-to-edit letter for anything flagged." },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section aria-labelledby="hero-heading" className="space-y-4">
        <h1
          id="hero-heading"
          className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          Understand your medical bill.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Upload a photo or PDF of a medical bill or EOB and get plain-English
          line items, flags for likely errors, an estimate of what you actually
          owe, and a dispute letter you can send.
        </p>
        <ul className="grid gap-3 pt-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="font-medium text-slate-900">{f.title}</p>
              <p className="mt-1 text-sm text-slate-600">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <UploadPlaceholder />
      <SampleBills />
    </div>
  );
}
