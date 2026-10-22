"use client";

import type { Ref } from "react";
import type { FlagType, LineItem, SampleBill } from "@/data/sampleBills";
import { billTotalCents, formatCents } from "@/data/sampleBills";

const FLAG_LABELS: Record<FlagType, string> = {
  duplicate: "Possible duplicate",
  upcoding: "Possible upcoding",
  unbundling: "Possible unbundling",
  "balance-billing": "Possible balance bill",
  "gfe-overage": "Over Good Faith Estimate",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`));
}

function Party({ label, name, note }: { label: string; name: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{name}</dd>
      {note && <dd className="text-sm text-slate-600">{note}</dd>}
    </div>
  );
}

function LineItemRow({ item }: { item: LineItem }) {
  const flag = item.expectedFlag;
  return (
    <li
      className={`rounded-lg border p-4 md:rounded-none md:border-0 md:border-t md:px-0 md:py-3 ${
        flag ? "border-rose-200 bg-rose-50/40 md:bg-transparent" : "border-slate-200"
      }`}
    >
      <dl className="md:grid md:grid-cols-[7rem_5rem_1fr_7rem_7rem] md:gap-4">
        <div className="flex justify-between gap-2 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Date</dt>
          <dd className="text-sm text-slate-800">{formatDate(item.date)}</dd>
        </div>
        <div className="mt-1 flex justify-between gap-2 md:mt-0 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Code</dt>
          <dd className="font-mono text-sm font-medium text-slate-900">{item.code}</dd>
        </div>
        <div className="mt-2 md:mt-0">
          <dt className="sr-only">Description</dt>
          <dd className="text-sm text-slate-800">{item.description}</dd>
        </div>
        <div className="mt-2 flex justify-between gap-2 md:mt-0 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Dx</dt>
          <dd className="text-sm text-slate-800">
            {item.dx ? (
              <>
                <span className="font-mono font-medium">{item.dx.code}</span>
                <span className="block text-xs text-slate-600">{item.dx.description}</span>
              </>
            ) : (
              <span className="text-slate-600">None assigned</span>
            )}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-2 md:mt-0 md:block md:text-right">
          <dt className="text-sm text-slate-600 md:sr-only">Amount (illustrative)</dt>
          <dd className="text-sm font-medium tabular-nums text-slate-900">
            {formatCents(item.amountCents)}
          </dd>
        </div>
      </dl>
      {flag && (
        <p
          className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900 ring-1 ring-rose-200 md:mt-2"
          data-flag-type={flag.type}
        >
          <span className="mr-2 inline-block rounded-full bg-rose-700 px-2 py-0.5 text-xs font-medium text-white">
            {FLAG_LABELS[flag.type]}
          </span>
          {flag.message}
        </p>
      )}
    </li>
  );
}

export function BillView({ bill, ref }: { bill: SampleBill; ref?: Ref<HTMLHeadingElement> }) {
  const total = billTotalCents(bill);
  const flagCount = bill.lineItems.filter((item) => item.expectedFlag).length;
  const comparison = bill.comparison;
  const difference = comparison ? total - comparison.amountCents : 0;

  return (
    <article
      aria-labelledby="bill-view-heading"
      className="mt-6 scroll-mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
    >
      <div className="space-y-3">
        <h3
          id="bill-view-heading"
          ref={ref}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight text-slate-900 focus:outline-none"
        >
          {bill.title}
        </h3>
        <p
          role="note"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
        >
          {bill.disclaimerLabel}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Party label="Patient" name={bill.patient.name} note={bill.patient.note} />
          <Party label="Provider" name={bill.provider.name} note={bill.provider.note} />
          {bill.facility && (
            <Party label="Facility" name={bill.facility.name} note={bill.facility.note} />
          )}
        </dl>
        {bill.notes?.map((note) => (
          <p key={note} className="text-sm text-slate-700">
            {note}
          </p>
        ))}
      </div>

      <section aria-labelledby="line-items-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 id="line-items-heading" className="font-semibold text-slate-900">
            Line items
          </h4>
          <p className={flagCount ? "text-sm text-rose-800" : "text-sm text-teal-800"}>
            {flagCount
              ? `${flagCount} ${flagCount === 1 ? "item" : "items"} flagged`
              : "No issues flagged"}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="hidden text-xs font-medium uppercase tracking-wide text-slate-600 md:grid md:grid-cols-[7rem_5rem_1fr_7rem_7rem] md:gap-4"
        >
          <span>Date</span>
          <span>Code</span>
          <span>Description</span>
          <span>Dx</span>
          <span className="text-right">Amount (illustrative)</span>
        </div>
        <ul className="space-y-3 md:space-y-0 md:border-b md:border-slate-200">
          {bill.lineItems.map((item) => (
            <LineItemRow key={item.id} item={item} />
          ))}
        </ul>
        <dl className="space-y-1 pt-2 text-sm">
          <div className="flex justify-between gap-4 md:justify-end">
            <dt className="font-semibold text-slate-900">Bill total (illustrative)</dt>
            <dd className="w-28 text-right font-semibold tabular-nums text-slate-900">
              {formatCents(total)}
            </dd>
          </div>
          {comparison && (
            <>
              <div className="flex justify-between gap-4 md:justify-end">
                <dt className="text-slate-700">{comparison.label} (illustrative)</dt>
                <dd className="w-28 text-right tabular-nums text-slate-800">
                  {formatCents(comparison.amountCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 md:justify-end">
                <dt className="text-slate-700">Difference</dt>
                <dd
                  className={`w-28 text-right font-medium tabular-nums ${
                    difference > 0 ? "text-rose-800" : "text-teal-800"
                  }`}
                >
                  {difference > 0 ? `${formatCents(difference)} over` : "Matches"}
                </dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section aria-labelledby="sources-heading" className="space-y-2">
        <h4 id="sources-heading" className="font-semibold text-slate-900">
          Sources
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {bill.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-teal-800 underline underline-offset-2 hover:text-teal-900"
              >
                {source.label}{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
