/** Local SVG assets also display correctly on systems without flag emoji fonts. */
export const CURRENCY_FLAGS: Readonly<Record<string, string>> = { EUR: "EU", USD: "US" };

export function CountryFlag({ code }: { code: string }) {
  return <span aria-hidden="true" className="inline-block h-3 w-4 shrink-0 rounded-sm bg-cover bg-center ring-1 ring-black/10" style={{ backgroundImage: `url(/flags/${code.toLowerCase()}.svg)` }} />;
}
