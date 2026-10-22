"use client";

import { useRef, useState } from "react";
import { buildLetters, letterFileName, type Letter, type LetterBill } from "@/lib/letters";
import { SourceLink } from "./SourceLink";

const BUTTON =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

function LetterDetail({ bill, letter }: { bill: LetterBill; letter: Letter }) {
  const textRef = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState("");

  function selectText() {
    const node = textRef.current;
    const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
    if (!node || !selection) return false;
    // Focus first: focusing afterward can collapse the selection.
    node.focus();
    selection.selectAllChildren(node);
    return true;
  }

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(letter.text);
      setStatus("Copied the letter to your clipboard.");
    } catch {
      setStatus(
        selectText()
          ? "Couldn't copy automatically. The letter text is selected; press Ctrl+C (or ⌘C) to copy it."
          : "Couldn't copy automatically. Select the letter text and copy it by hand.",
      );
    }
  }

  function download() {
    if (typeof URL.createObjectURL !== "function") {
      setStatus("Download isn't available in this browser. Copy the text instead.");
      return;
    }
    const fileName = letterFileName(bill, letter);
    const url = URL.createObjectURL(new Blob([letter.text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${fileName}.`);
  }

  function print() {
    if (typeof window.print !== "function") {
      setStatus("Printing isn't available in this browser.");
      return;
    }
    // globals.css hides everything but the letter text while this attribute is set.
    const root = document.documentElement;
    root.dataset.printing = "letter";
    const done = () => delete root.dataset.printing;
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    done();
  }

  const headingId = `letter-${letter.type}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-xl border border-slate-200 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h5 id={headingId} className="font-semibold text-slate-900">
          {letter.title}
        </h5>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          {letter.label}
        </span>
      </div>
      <p className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">Send to:</span> {letter.recipient}
      </p>
      <p className="text-sm leading-relaxed text-slate-700">{letter.whenToUse}</p>
      <div className="text-sm">
        <p className="font-medium text-slate-900">Deadlines</p>
        {letter.deadlines.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
            {letter.deadlines.map((deadline) => (
              <li key={deadline.citation} data-deadline-citation={deadline.citation}>
                {deadline.text} (
                <a
                  href={deadline.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${deadline.citation} (opens in a new tab)`}
                  className="text-teal-800 underline underline-offset-2 hover:text-teal-900"
                >
                  {deadline.citation}
                </a>
                )
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-slate-700">{letter.noDeadlineNote}</p>
        )}
      </div>
      <p role="note" className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {letter.notOfficialNote}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={BUTTON}>
          Copy to clipboard
        </button>
        <button type="button" onClick={download} className={BUTTON}>
          Download .txt
        </button>
        <button type="button" onClick={print} className={BUTTON}>
          Print
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-teal-900">
        {status}
      </p>
      <pre
        ref={textRef}
        tabIndex={0}
        aria-label={`${letter.title} letter text`}
        data-letter-text=""
        className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-stone-50 p-4 font-mono text-sm leading-relaxed text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        {letter.text}
      </pre>
      <p className="text-sm text-slate-700">
        Sources:{" "}
        {letter.sources.map((source, i) => (
          <span key={source.url}>
            {i > 0 && " · "}
            <SourceLink source={source} />
          </span>
        ))}
      </p>
    </section>
  );
}

export function LetterDrafts({ bill }: { bill: LetterBill }) {
  const letters = buildLetters(bill);
  const [selectedType, setSelectedType] = useState(letters[0]?.type);
  const selected = letters.find((letter) => letter.type === selectedType) ?? letters[0];

  return (
    <section aria-labelledby="letters-heading" className="space-y-3">
      <h4 id="letters-heading" className="font-semibold text-slate-900">
        Letter drafts
      </h4>
      {selected ? (
        <>
          <p className="text-sm text-slate-600">
            Drafts based on this bill&apos;s flags. Fill in every [BRACKETED] item before sending.
          </p>
          <ul aria-label="Available letters" className="grid gap-2 sm:grid-cols-2">
            {letters.map((letter) => {
              const pressed = letter.type === selected.type;
              return (
                <li key={letter.type}>
                  <button
                    type="button"
                    aria-pressed={pressed}
                    data-letter-type={letter.type}
                    onClick={() => setSelectedType(letter.type)}
                    className={`flex h-full w-full flex-col items-start rounded-lg border bg-white p-3 text-left hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      pressed ? "border-teal-600 ring-2 ring-teal-600" : "border-slate-200"
                    }`}
                  >
                    <span className="font-medium text-slate-900">{letter.title}</span>
                    <span className="text-sm text-slate-600">To: {letter.recipient}</span>
                    {letter.secondary && (
                      <span className="mt-1 text-xs text-slate-600">
                        Secondary option, only in some cases
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <LetterDetail key={selected.type} bill={bill} letter={selected} />
        </>
      ) : (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          No letter needed. Nothing on this bill was flagged.
        </p>
      )}
    </section>
  );
}
