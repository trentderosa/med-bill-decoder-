"use client";

import { Fragment, type Ref } from "react";
import type { LineItem, SampleBill } from "@/data/sampleBills";
import {
  ADVICE_NOTE,
  ESTIMATE_LABEL,
  billTotal,
  computeFlags,
  estimateOwed,
  type Flag,
  type FlagType,
} from "@/lib/flagEngine";
import { formatCents, formatDate } from "@/lib/format";
import { explainCode, explainDx } from "@/lib/plainEnglish";
import { LetterDrafts } from "./LetterDrafts";
import { SourceLink } from "./SourceLink";

const FLAG_LABELS: Record<FlagType, string> = {
  duplicate: "Possible duplicate",
  upcoding: "Possible upcoding",
  unbundling: "Possible unbundling",
  "balance-billing": "Possible balance bill",
  "gfe-overage": "Over Good Faith Estimate",
};

function Party({ label, name, note }: { label: string; name: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{name}</dd>
      {note && <dd className="text-sm text-slate-600">{note}</dd>}
    </div>
  );
}

function FlagCard({ flag }: { flag: Flag }) {
  return (
    <li
      data-flag-type={flag.type}
      className="space-y-2 rounded-lg border border-slate-200 border-l-4 border-l-amber-600 bg-white p-4"
    >
      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        {FLAG_LABELS[flag.type]}
      </span>
      <p className="font-medium text-slate-900">{flag.message}</p>
      <p className="text-sm leading-relaxed text-slate-700">{flag.explanation}</p>
      <p className="text-sm text-slate-700">
        Source: <SourceLink source={flag.source} />
        {flag.relatedSources.map((source) => (
          <span key={source.url}>
            {" · "}
            <SourceLink source={source} />
          </span>
        ))}
      </p>
      <p className="text-xs text-slate-600">{ADVICE_NOTE}</p>
    </li>
  );
}

function LineItemRow({ item, flags }: { item: LineItem; flags: Flag[] }) {
  const flagged = flags.length > 0;
  return (
    <li
      className={`rounded-lg border p-4 md:rounded-none md:border-0 md:border-t md:px-0 md:py-3 ${
        flagged ? "border-amber-300 bg-amber-50/50 md:bg-transparent" : "border-slate-200"
      }`}
    >
      <dl className="md:grid md:grid-cols-[7rem_5rem_1fr_7rem_7rem] md:gap-4">
        <div className="flex justify-between gap-2 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Date</dt>
          <dd className="text-sm text-slate-800">{formatDate(item.date)}</dd>
        </div>
        <div className="mt-1 flex justify-between gap-2 md:mt-0 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Code</dt>
          <dd className="text-sm text-slate-900">
            <span className="font-mono font-medium">{item.code}</span>
            <span className="ml-2 text-xs text-slate-600 md:ml-0 md:block">
              {item.units} {item.units === 1 ? "unit" : "units"}
            </span>
          </dd>
        </div>
        <div className="mt-2 md:mt-0">
          <dt className="sr-only">Description</dt>
          <dd className="text-sm text-slate-800">{item.description}</dd>
          <dt className="sr-only">In plain English</dt>
          <dd className="mt-1 text-sm text-slate-600">
            {explainCode(item.code, item.description)}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-2 md:mt-0 md:block">
          <dt className="text-sm text-slate-600 md:sr-only">Dx</dt>
          <dd className="text-right text-sm text-slate-800 md:text-left">
            {item.dx ? (
              <>
                <span className="font-mono font-medium">{item.dx.code}</span>
                <span className="block text-xs text-slate-600">
                  {explainDx(item.dx.code, item.dx.description)}
                </span>
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
      {flagged && (
        <ul aria-label="Flags on this line" className="mt-3 flex flex-wrap gap-2 md:mt-2">
          {flags.map((flag) => (
            <li
              key={flag.type}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
            >
              Flagged: {FLAG_LABELS[flag.type]}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function BillView({ bill, ref }: { bill: SampleBill; ref?: Ref<HTMLHeadingElement> }) {
  const flags = computeFlags(bill);
  const estimate = estimateOwed(bill);
  const total = billTotal(bill);
  const flaggedIds = new Set(flags.flatMap((flag) => flag.lineItemIds));
  const comparisons = [
    { label: "EOB patient balance", cents: bill.context.eobPatientBalanceCents },
    { label: "Good Faith Estimate total", cents: bill.context.gfeTotalCents },
  ].filter((c): c is { label: string; cents: number } => c.cents !== undefined);

  return (
    <article
      aria-labelledby="bill-view-heading"
      className="mt-6 scroll-mt-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
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

      <section aria-labelledby="flags-heading" className="space-y-2">
        <h4 id="flags-heading" className="font-semibold text-slate-900">
          What we flagged
        </h4>
        {flags.length ? (
          <ul className="space-y-3">
            {flags.map((flag) => (
              <FlagCard key={`${flag.type}:${flag.lineItemIds.join(",")}`} flag={flag} />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            No issues flagged. None of our checks matched this bill.
          </p>
        )}
      </section>

      <section aria-labelledby="line-items-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 id="line-items-heading" className="font-semibold text-slate-900">
            Line items
          </h4>
          <p className={flaggedIds.size ? "text-sm text-amber-900" : "text-sm text-teal-800"}>
            {flaggedIds.size
              ? `${flaggedIds.size} ${flaggedIds.size === 1 ? "item" : "items"} flagged`
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
            <LineItemRow
              key={item.id}
              item={item}
              flags={flags.filter((flag) => flag.lineItemIds.includes(item.id))}
            />
          ))}
        </ul>
        <dl className="space-y-1 pt-2 text-sm">
          <div className="flex justify-between gap-4 md:justify-end">
            <dt className="font-semibold text-slate-900">Bill total (illustrative)</dt>
            <dd className="w-28 text-right font-semibold tabular-nums text-slate-900">
              {formatCents(total)}
            </dd>
          </div>
          {comparisons.map((comparison) => {
            const difference = total - comparison.cents;
            return (
              <Fragment key={comparison.label}>
                <div className="flex justify-between gap-4 md:justify-end">
                  <dt className="text-slate-700">{comparison.label} (illustrative)</dt>
                  <dd className="w-28 text-right tabular-nums text-slate-800">
                    {formatCents(comparison.cents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 md:justify-end">
                  <dt className="text-slate-700">Difference</dt>
                  <dd
                    className={`w-28 text-right font-medium tabular-nums ${
                      difference > 0 ? "text-amber-900" : "text-teal-800"
                    }`}
                  >
                    {difference > 0 ? `${formatCents(difference)} over` : "Matches"}
                  </dd>
                </div>
              </Fragment>
            );
          })}
        </dl>
      </section>

      <section
        aria-labelledby="estimate-heading"
        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <h4 id="estimate-heading" className="font-semibold text-slate-900">
          {ESTIMATE_LABEL}
        </h4>
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {estimate.amountCents === null ? "Can't be estimated" : formatCents(estimate.amountCents)}
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
          {estimate.steps.map((step, i) => (
            <li key={`${i}:${step}`}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-slate-600">{ADVICE_NOTE}</p>
      </section>

      <LetterDrafts key={bill.id} bill={bill} />

      <section aria-labelledby="sources-heading" className="space-y-2">
        <h4 id="sources-heading" className="font-semibold text-slate-900">
          Sources
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {bill.sources.map((source) => (
            <li key={source.url}>
              <SourceLink source={source} />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
