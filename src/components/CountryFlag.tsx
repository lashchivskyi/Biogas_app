/** Local SVG assets also display correctly on systems without flag emoji fonts. */
export function CountryFlag({ code }: { code: string }) {
  return <span aria-hidden="true" className="inline-block h-[18px] w-6 shrink-0 rounded-sm bg-cover bg-center ring-1 ring-black/10" style={{ backgroundImage: `url(/flags/${code.toLowerCase()}.svg)` }} />;
}
