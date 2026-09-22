// Shared by the server layout and the client switcher. Kept out of the "use client" module
// on purpose: a server component importing from one gets a client-reference proxy, not the value.
export const PALETTE_COOKIE = "cang_palette";
export const PALETTES = [
{ id: "market", label: "Рынок и шёлк", dots: ["#da251d", "#ffcd00", "#0f9d6b"] },
{ id: "lacquer", label: "Лак", dots: ["#d5372b", "#e8b33c", "#1d1614"] },
{ id: "indigo", label: "Индиго и рис", dots: ["#1c2b54", "#d99a2b", "#b4523a"] },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"];
export const DEFAULT_PALETTE: PaletteId = "market";
export function resolvePalette(value: string | undefined): PaletteId {
return PALETTES.some((p) => p.id === value) ? (value as PaletteId) : DEFAULT_PALETTE;
}
// First-visit default from the browser's languages. Always a default, never a lock: the
// switcher writes a cookie and the cookie wins. Accept-Language describes the person rather
// than the network, so it survives VPNs and travel and needs no GeoIP database.
const EUROPEAN = new Set(["de","fr","it","es","nl","pl","pt","sv","da","fi","nb","no","cs","sk","sl","hr","hu","ro","bg","el","et","lv","lt","is","ga","sr","bs","sq","mk","uk","ru","be","tr","ca","eu","gl"]);
const ASIAN = new Set(["vi","zh","yue","ko","ja","th","id","ms","km","lo","my","tl","fil","bn","hi","ta","te","ur","ne","si"]);
export function paletteFromLanguages(acceptLanguage: string | null | undefined): PaletteId {
const tags = (acceptLanguage ?? "").toLowerCase().split(",").map((part) => part.split(";")[0]!.trim()).filter(Boolean);
for (const tag of tags) {
const [base, region] = tag.split("-");
if (!base) continue;
if (ASIAN.has(base)) return "market";
if (EUROPEAN.has(base)) return "lacquer";
if (base === "en") {
if (region === "us" || region === "ca") return "indigo";
if (region === "gb" || region === "ie") return "lacquer";
if (region === "sg" || region === "in" || region === "ph" || region === "hk") return "market";
if (region === "au" || region === "nz") return "indigo";
}
}
return DEFAULT_PALETTE;
}
