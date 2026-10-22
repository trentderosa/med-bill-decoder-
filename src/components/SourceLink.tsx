import type { Source } from "@/lib/sources";

export function SourceLink({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words text-teal-800 underline underline-offset-2 hover:text-teal-900"
    >
      {source.label} <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
