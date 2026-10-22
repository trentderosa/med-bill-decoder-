"use client";

import { useEffect, useRef, useState } from "react";
import { SAMPLE_BILLS } from "@/data/sampleBills";
import { BillView } from "./BillView";

export function SampleBills() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const viewRef = useRef<HTMLHeadingElement>(null);
  const selected = SAMPLE_BILLS.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    const heading = viewRef.current;
    if (!selectedId || !heading) return;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }, [selectedId]);

  return (
    <section aria-labelledby="samples-heading" className="space-y-3">
      <h2 id="samples-heading" className="text-lg font-semibold text-slate-900">
        Try a sample bill
      </h2>
      <p className="text-sm text-slate-600">
        Fake, pre-made bills that show what the decoder catches. Pick one to view it.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_BILLS.map((bill) => {
          const flagged = bill.lineItems.some((item) => item.expectedFlag);
          const pressed = bill.id === selectedId;
          return (
            <li key={bill.id}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelectedId(bill.id)}
                className={`flex h-full w-full flex-col items-start rounded-xl border bg-white p-4 text-left transition-colors hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  pressed ? "border-teal-600 ring-2 ring-teal-600" : "border-slate-200"
                }`}
              >
                <span className="font-medium text-slate-900">{bill.title}</span>
                <span
                  className={flagged ? "mt-1 text-sm text-rose-700" : "mt-1 text-sm text-teal-700"}
                >
                  {bill.summary}
                </span>
                <span className="mt-3 text-xs text-slate-600">Patient: {bill.patient.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected && <BillView ref={viewRef} bill={selected} />}
    </section>
  );
}
