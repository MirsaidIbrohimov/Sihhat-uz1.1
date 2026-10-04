export type ChatTurn = { role: "user" | "assistant"; message: string };

function normalize(text: string) {
  const letters: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "j",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "x",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sh",
    ъ: "",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ў: "o",
    қ: "q",
    ғ: "g",
    ҳ: "h",
  };
  return text
    .toLocaleLowerCase()
    .replace(/[а-яёўқғҳ]/g, (c) => letters[c] ?? c)
    .replace(/['‘’ʻ`]/g, "")
    .replace(/[^\p{L}\p{N}.,/-]+/gu, " ")
    .trim();
}

const greeting =
  /^(?:salom|salomlar|assalom|assalomu? (?:alaykum|aleykum)|salom (?:alaykum|aleykum)|hello|hi)[\s.!?,]*$/i;
export function greetingReply(message: string) {
  const text = normalize(message)
    .replace(/[.,]+$/g, "")
    .trim();
  if (!greeting.test(text)) return null;
  return /alaykum|aleykum/.test(text) ? "Va alaykum assalom!" : "Salom!";
}
export function salutation(message: string) {
  const text = normalize(message);
  if (
    /^(?:assalomu? (?:alaykum|aleykum)|salom (?:alaykum|aleykum))(?:\b|[.,!])/.test(
      text,
    )
  )
    return "Va alaykum assalom!";
  return /^(?:salom|salomlar|assalom|hello|hi)(?:\b|[.,!])/.test(text)
    ? "Salom!"
    : null;
}
export function thanksReply(message: string) {
  return /^(?:rahmat|katta rahmat|raxmat|spasibo|thank you|thanks)[\s.,!]*$/.test(
    normalize(message),
  )
    ? "Arzimaydi! Safaringizni rejalashtirishda yana yordam kerak bo‘lsa, yozing."
    : null;
}

// These labels recognize an intended region even when the public catalog has no match.
const regions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Toshkent",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Farg‘ona",
  "Namangan",
  "Jizzax",
  "Qashqadaryo",
  "Surxondaryo",
  "Sirdaryo",
  "Navoiy",
  "Xorazm",
  "Qoraqalpog‘iston",
];
function budget(text: string, allowBare: boolean) {
  const value = normalize(text).replace(
    /^(?:byudjet(?:im)?|kuniga|bir kunga|kunlik)\s*[:=-]?\s*/,
    "",
  );
  const amount =
    allowBare &&
    /^\d[\d\s.,]*(?:\s*(?:ming|mln|million))?(?:\s*(?:som|uzs|sum))?(?:gacha)?$/.test(
      value,
    )
      ? value.match(
          /^(\d[\d\s.,]*?)\s*(ming|mln|million)?(?:\s*(?:som|uzs|sum))?(?:gacha)?$/,
        )
      : (value.match(
          /(?:^|\s)(\d[\d\s.,]*?)\s*(ming|mln|million)(?:\s*(?:som|uzs|sum))?(?:gacha)?(?=[\s.,]|$)/,
        ) ??
        value.match(
          /(?:^|\s)(\d[\d\s.,]*?)\s*(som|uzs|sum)(?:gacha)?(?=[\s.,]|$)/,
        ));
  if (!amount) return null;
  const scale =
    amount[2] === "ming"
      ? 1000n
      : ["mln", "million"].includes(amount[2])
        ? 1000000n
        : 1n;
  let digits = amount[1].replace(/\s/g, "");
  // Grouped thousands are whole so‘m; fractional large units (1,5 mln) stay exact.
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(digits))
    digits = digits.replace(/[.,]/g, "");
  const parts = /^(\d{1,15})(?:[.,](\d{1,2}))?$/.exec(digits);
  if (!parts) return null;
  const minor =
    (BigInt(parts[1]) * 100n + BigInt((parts[2] ?? "").padEnd(2, "0"))) * scale;
  return minor > 0n && minor <= 9_000_000_000_000_000_000n
    ? minor.toString()
    : null;
}

export function planConversation(
  message: string,
  history: ChatTurn[],
  catalog: any[],
  explicitRegion?: string,
) {
  const userMessages = [
    ...history.filter((t) => t.role === "user").map((t) => t.message),
    message,
  ];
  const names = [
    ...new Set([...catalog.map((s) => String(s.region)), ...regions]),
  ].sort((a, b) => b.length - a.length);
  const facilities = [
    ...new Set<string>(
      catalog.flatMap((s) => [...(s.amenities ?? []), ...(s.services ?? [])]),
    ),
  ];
  let region = explicitRegion ?? "",
    regionAnswered = Boolean(explicitRegion);
  let maxPrice: string | null = null,
    budgetAnswered = false,
    period = "",
    periodAnswered = false;
  let amenities: string[] = [],
    facilitiesAnswered = false;
  const guidedGreeting = userMessages.some((text) => salutation(text) !== null);
  for (const raw of userMessages) {
    if (greetingReply(raw) || thanksReply(raw)) continue;
    const text = normalize(raw);
    const found = names.find((name) => {
      const term = normalize(name),
        at = text.indexOf(term);
      return (
        at >= 0 &&
        !/^(?:ga|da|dagi)?\s+emas/.test(
          text.slice(at + term.length, at + term.length + 24),
        )
      );
    });
    if (found) {
      region = found;
      regionAnswered = true;
    }
    const money = budget(raw, regionAnswered && !budgetAnswered);
    if (money) {
      maxPrice = money;
      budgetAnswered = true;
    }
    const date = text.match(
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./]\d{1,2}[./]\d{4}\b|\b\d{1,2}[- ]+(?:yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|sentyabr|oktabr|oktyabr|noyabr|dekabr)(?:dan|da|ga)?\b|\b\d{1,3}\s*kun(?:ga|lik)?\b/,
    );
    if (date) {
      period = date[0];
      periodAnswered = true;
    }
    const mentioned = facilities.filter((name) =>
      text.includes(normalize(name)),
    );
    const picked = mentioned.filter((name) => {
      const term = normalize(name),
        at = text.indexOf(term);
      return (
        at >= 0 &&
        !text
          .slice(at + term.length, at + term.length + 18)
          .match(/^(?:siz|\s+(?:kerak emas|shart emas))/)
      );
    });
    if (mentioned.length) {
      amenities = [
        ...new Set([
          ...(text.includes("faqat")
            ? []
            : amenities.filter((a) => !mentioned.includes(a))),
          ...picked,
        ]),
      ];
      facilitiesAnswered = true;
    }
    if (
      /^(?:farqi yoq|ahamiyati yoq|shart emas|istalgan|cheklov yoq|bilmayman)[.,]*$/.test(
        text,
      )
    ) {
      if (!regionAnswered) {
        regionAnswered = true;
        region = "";
      } else if (!budgetAnswered) {
        budgetAnswered = true;
        maxPrice = null;
      } else if (!periodAnswered) periodAnswered = true;
      else {
        facilitiesAnswered = true;
        amenities = [];
      }
    }
  }
  const requested = /variant|tavsiya|korsat|topib ber|izlab ber/i.test(
    normalize(message),
  );
  const guided =
    guidedGreeting ||
    regionAnswered ||
    budgetAnswered ||
    periodAnswered ||
    facilitiesAnswered;
  let question = "";
  if (guided && !requested) {
    if (!regionAnswered) question = "Qaysi hududga bormoqchisiz?";
    else if (!budgetAnswered)
      question = "Bir kun uchun taxminan qancha byudjet ajratmoqchisiz (so‘m)?";
    else if (!periodAnswered)
      question = "Safarni qachon yoki necha kunga rejalashtirgansiz?";
    else if (!facilitiesAnswered)
      question = "Sanatoriyada siz uchun qaysi sharoitlar muhim?";
  }
  const candidates = catalog.filter((s) => {
    const actual = normalize(String(s.region));
    return (
      (!region ||
        actual === normalize(region) ||
        actual.startsWith(normalize(region) + " ")) &&
      (!maxPrice ||
        (s.from_amount != null && BigInt(s.from_amount) <= BigInt(maxPrice))) &&
      amenities.every((a) =>
        [...(s.amenities ?? []), ...(s.services ?? [])].includes(a),
      )
    );
  });
  const preferences = [
    region && `Hudud: ${region}`,
    maxPrice && `Kunlik byudjet: ${BigInt(maxPrice) / 100n} so‘m`,
    period && `Safar: ${period}`,
    amenities.length && `Sharoitlar: ${amenities.join(", ")}`,
  ]
    .filter(Boolean)
    .join(". ");
  return {
    question,
    candidates,
    preferences,
    guided,
    searchMessage: [preferences, message].filter(Boolean).join("\n"),
    medical: userMessages.some((text) =>
      /kasal|davola|tashxis|muolaja|diagnoz|dori|диагноз|лечен|лекарств/i.test(
        text,
      ),
    ),
  };
}
