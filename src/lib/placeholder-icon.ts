import {
  Armchair, Backpack, Bike, Boxes, Cable, Car, CircuitBoard, Coffee, Cog, Container, Droplets,
  FlaskConical, Footprints, Gem, Hammer, HardHat, Package, Plug, Scissors, Shirt, Sofa, Wheat, Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * A pictogram for a product or category, chosen from its own words. Better than a monogram: the
 * buyer reads the shape before the text. Matching is on the English title, so Vietnamese titles
 * fall back to the generic crate, which is honest rather than wrong.
 */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/backpack|rucksack|luggage|suitcase|\bbag\b|duffel/i, Backpack],
  [/shoe|boot|footwear|sandal|sneaker|slipper/i, Footprints],
  [/chair|stool|bench|sofa|couch|lounge/i, Sofa],
  [/table|desk|cabinet|wardrobe|nightstand|shelf|furniture|rattan/i, Armchair],
  [/jacket|shirt|apparel|garment|trouser|uniform|hoodie|knitwear|dress/i, Shirt],
  [/fabric|textile|twill|cotton|denim|yarn|woven|thread/i, Scissors],
  [/carton|pouch|packaging|box|crate|wrap|label|bottle cap/i, Package],
  [/coffee|\btea\b|cashew|pepper|spice|cocoa/i, Coffee],
  [/rice|grain|agri|cassava|starch|food|fruit|seafood/i, Wheat],
  [/circuit|pcb|electronic|sensor|semiconductor|led\b|smart/i, CircuitBoard],
  [/cable|wire|harness|connector/i, Cable],
  [/socket|switch|electrical|breaker|transformer/i, Plug],
  [/motor|machine|machinery|pump|compressor|bearing|gear|cnc|press/i, Cog],
  [/valve|pipe|fitting|rubber|plastic|resin|polymer|mould|mold/i, Droplets],
  [/chemical|solvent|coating|adhesive|paint|enzyme/i, FlaskConical],
  [/tool|hardware|screw|bolt|fastener|hinge|bracket/i, Wrench],
  [/steel|aluminium|aluminum|metal|alloy|weld|stamping|die/i, Hammer],
  [/helmet|safety|protective|glove|ppe\b/i, HardHat],
  [/motorcycle|scooter|bicycle|\bbike\b/i, Bike],
  [/\bcar\b|automotive|vehicle|truck|tyre|tire/i, Car],
  [/jewel|silver|gold|gem|stone|ceramic|porcelain|lacquer|handicraft/i, Gem],
  [/container|logistics|freight|pallet|shipping/i, Container],
  [/cosmetic|soap|shampoo|beauty|personal care/i, Droplets],
];

export function placeholderIcon(subject: string | null | undefined): LucideIcon {
  const s = (subject ?? "").trim();
  if (!s) return Boxes;
  for (const [re, icon] of RULES) if (re.test(s)) return icon;
  return Boxes;
}
