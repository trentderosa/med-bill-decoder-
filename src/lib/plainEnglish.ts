// Plain-English versions of the code descriptors in the research notes
// (AMA E/M document, CMS NCCI Manual Ch. 1, CDC/NCHS ICD-10-CM files).

const CODE_EXPLANATIONS: Readonly<Record<string, string>> = {
  "99212": "An office visit for a returning patient. This level fits 10–19 minutes of total time.",
  "99213":
    "An office visit for a returning patient. This level fits low-complexity decision making or 20–29 minutes of total time.",
  "99215":
    "An office visit for a returning patient. This is the highest level: high-complexity decision making or 40–54 minutes of total time.",
  "58260":
    "Surgery to remove the uterus through the vagina (vaginal hysterectomy), for a uterus of 250 g or less.",
  "58720": "Surgery to remove a fallopian tube and ovary (salpingo-oophorectomy).",
  "58262":
    "Vaginal hysterectomy (uterus 250 g or less) that also removes the tube(s) and/or ovary(s) in the same surgery.",
};

const DX_EXPLANATIONS: Readonly<Record<string, string>> = {
  "J02.9": "Sore, inflamed throat (acute pharyngitis); the cause isn't specified.",
  "S93.401A":
    "Sprained right ankle; the specific ligament isn't named. “A” means the first visit for this injury.",
};

export function explainCode(code: string, fallback: string): string {
  return CODE_EXPLANATIONS[code] ?? fallback;
}

export function explainDx(code: string, fallback: string): string {
  return DX_EXPLANATIONS[code] ?? fallback;
}
