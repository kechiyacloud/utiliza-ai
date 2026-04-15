export type AvatarConfig = {
  label: string | null;
  bgClass: string;
  textClass: string;
};

const PASTEL_STYLES = [
  { bgClass: "bg-rose-100", textClass: "text-rose-700" },
  { bgClass: "bg-orange-100", textClass: "text-orange-700" },
  { bgClass: "bg-amber-100", textClass: "text-amber-700" },
  { bgClass: "bg-lime-100", textClass: "text-lime-700" },
  { bgClass: "bg-emerald-100", textClass: "text-emerald-700" },
  { bgClass: "bg-cyan-100", textClass: "text-cyan-700" },
  { bgClass: "bg-sky-100", textClass: "text-sky-700" },
  { bgClass: "bg-indigo-100", textClass: "text-indigo-700" },
  { bgClass: "bg-violet-100", textClass: "text-violet-700" },
  { bgClass: "bg-pink-100", textClass: "text-pink-700" },
] as const;

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getProjectAvatar = (projectName?: string | null): AvatarConfig => {
  const normalizedName = projectName?.trim() ?? "";
  const style =
    PASTEL_STYLES[hashString(normalizedName || "fallback") % PASTEL_STYLES.length];

  if (!normalizedName) {
    return {
      label: null,
      bgClass: style.bgClass,
      textClass: style.textClass,
    };
  }

  return {
    label: normalizedName.charAt(0).toUpperCase(),
    bgClass: style.bgClass,
    textClass: style.textClass,
  };
};
