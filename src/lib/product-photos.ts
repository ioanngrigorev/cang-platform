/**
 * Stock product photography for catalogue entries that have no picture of their own.
 *
 * The seed catalogue was authored against a hotlinked image service that is gone, so a product
 * with a dead image URL used to show a tinted wash and a pictogram. These photographs, chosen by
 * product type from the words in the title, are the next step up: a real object instead of a
 * symbol. They are generic stock photos (Unsplash licence, self-hosted under /img/products) and
 * make no claim about the supplier's own goods; the moment a seller uploads a photo it wins.
 *
 * Matching is on the English title. The first rule that matches decides the pool; the picture
 * within the pool is picked from a hash of the subject plus the slot, so a gallery with three dead
 * images shows three different photos of the same kind of thing rather than one three times.
 */

const P = "/img/products/";

const POOLS: Record<string, string[]> = {
  "backpack-hiking": ["8sjBzL1IyMo", "bQl2kRQyUE8"],
  "backpack-urban": ["DWTzfqz9S1A", "1Frndjy7tkM"],
  suitcase: ["ji5XMfO3dXY", "166umbWL6Ec"],
  duffel: ["nL5Li3oJkJk"],
  tote: ["smTDI-z1rlY", "-zBSu3rYjNs"],
  drawstring: ["8mvGoEYMugA"],
  tent: ["y8Ngwq34_Ak", "wTVr4HR4SBI"],
  sneaker: ["CX3LtR-AilA", "tpUdwgqbGSA"],
  "canvas-shoe": ["JqSgHDUf9_o"],
  "work-boot": ["s8TQiOfGlz0", "2u9aALMdPnI"],
  "hard-hat": ["9OB46apMbC4", "cigfVTfU39I"],
  tshirt: ["8ACmRoleM24", "xPJYL0l5Ii8"],
  polo: ["rpiH-Z9ohmk", "WagwAh8U6LU"],
  hoodie: ["kJXGTOY1wLQ", "SbHt5T4C1Ys"],
  jacket: ["7d7ftGJ5Gns"],
  leggings: ["xn2Zh8b4yqw", "K_w5UNRxh-8"],
  "sports-bra": ["0hko-xWvyW8"],
  cycling: ["5bCF12W6XsI"],
  trousers: ["0tDuW9e-tc4", "_nKR-qjgXDE"],
  shirt: ["DRM_6zFkPFw", "BKYeLLB1OxI"],
  fabric: ["stb9o3RE5lI", "IOJH65NuhXY"],
  denim: ["I2WQQaXSy-k", "UP9DtTjRYpI"],
  towel: ["qPNgpYUCW0c", "0Qv4fUvlSrI"],
  bedding: ["hdD3g9NYM0U"],
  bathrobe: ["lC0SPakhZwM"],
  "dining-table": ["dpv12vxg_aw", "SOeq3VXKfQE"],
  chair: ["Or3zn5zbgzE", "iBxQvOLuKb4"],
  cabinet: ["4DqsMC4-QQc", "cZpobOqgntA"],
  bookshelf: ["YbLitAY8bPA", "o2fc-C-Uotw"],
  bed: ["4Wlp6m8hroE", "Z4jDp5qnZ8k"],
  nightstand: ["GqbU78bdJFM", "F15bs8uuo0I"],
  "outdoor-sofa": ["TQk_VeOofiE", "a7uEP8MYOws"],
  parasol: ["Lp5GGwnqwTM", "Se-rkXMOpwk"],
  "sun-lounger": ["HhXZW8V2r_s", "oYUc5ifQEPg"],
  "outdoor-dining": ["sA_OaZXEsng", "eYNP6VHIT3Q"],
  dinnerware: ["NK19f93xX88", "sG-PR0BNwb4"],
  mug: ["Ha5_JcYArf0", "n42ogaQn32o"],
  bowl: ["zCYO9HxEAjI", "YA2E3d7a9Wo"],
  planter: ["7-6iniVCEvk", "1iS_6_MgjcA"],
  tiles: ["NUNCMVc6Bwg", "CEr4ljpMSh4"],
  marble: ["fcWAwPKpkTU", "8GUOLtII7ig"],
  mosaic: ["jR4Zf-riEjI", "orEnWh0zdyw"],
  terrazzo: ["Y0uQ-YxYjOs", "qEQTujie8vg"],
  "coffee-green": ["3X6VozzbL6w", "IJyQ1us6MVM"],
  "coffee-roasted": ["TD4DBagg2wE", "obV_LM0KjxY"],
  shrimp: ["UNefAhXPvf4", "cAGB3DoWIm8"],
  fish: ["nwSCt6ImBZQ", "GIpcS2IXsdc"],
  carton: ["3l19r5EOZaw", "qO2ztAz5g7A"],
  "mailer-box": ["2w-EQD1SkuY", "7KKy7-TeeVs"],
  pouch: ["QosVSNhPA9M"],
  "paper-bag": ["UCB3WeYYwx4", "Tp6z6HFF2kw"],
  cutlery: ["VRj_eDFZNNs", "lLIn2-GPQ5o"],
  caps: ["Qtj5RYq10vA"],
  "storage-box": ["F2JwUVuRz2I", "Uxj5sQmK_ug"],
  "led-panel": ["fVKBJ39ehSM", "IkOUpzgt-C8"],
  "street-light": ["D6xxk3_qZss"],
  "flood-light": ["gjsmCH39sPI", "fNR24kT8RZo"],
  warehouse: ["D7A6CiIFVk8", "bYcnue7qKNk"],
  racking: ["jcav1COVvOc", "I-_wYj9yOzw"],
  pcb: ["jXd2FSvcRr8", "pfR18JNEMv8"],
  "smart-plug": ["nBfTARHPxiU", "exfrR9KkzlE"],
  "smart-device": ["JxgSbyAqUlk"],
  router: ["hXVVNB6Qctg", "mhA3QOXME5M"],
  "ev-charger": ["r8Em_4mTkJ4"],
  cable: ["hokONTrHIAQ", "ioAUyH-MkYs"],
  harness: ["3TeMciP8iLM"],
  switchboard: ["oj1zW_PNI4k", "maXnRLszYY0"],
  battery: ["CH7kRmyBQ4I"],
  machine: ["nyAzMQ6Ejgs", "E_B09LIHS9Q"],
  cnc: ["eaanLTG7TCU", "sxtClAGwRck"],
  "metal-parts": ["SRqJ3eli-4I", "qCmbTEsdvOw"],
  welding: ["9Q_pLLP_jmA", "Ws8SCmDS9mw"],
  "steel-structure": ["dSRhwPe6v9c", "wFFw_xUTXOY"],
  "plastic-parts": ["gZQOtJrks9s"],
  "tool-set": ["48LxRVIpv7Q"],
  pruner: ["yYC-hPnhksU"],
  hammer: ["sm0Bkoj5bnA", "0V_Da1pHqEk"],
  pliers: ["nfEfNysTGgQ"],
  wrench: ["dh3zAdGGOIY", "wbx3FeGOEQ0"],
  "socket-set": ["lJj2QwH8twE", "8OIt6HQ_wkI"],
  paint: ["xqKYEM_INNc", "wgaV2vE5kp8"],
  "floor-coating": ["4yCaHDEfgfk", "NADTQRbS0s4"],
  adhesive: ["q5EjOjgxP7c"],
  chemical: ["B5SLyGtYdbk", "ALUBtrDWZ_s"],
  skincare: ["WdJ4WnLxyDs", "CJFG-GOAeVk"],
  rubber: ["6-y14RTxDbw", "wEMZ1zM2C8I"],
  logistics: ["I-_wYj9yOzw", "qO2ztAz5g7A", "jcav1COVvOc"],
};

/** Ordered: the specific before the general, because "polo shirt fabric" is fabric, not a polo. */
const RULES: Array<[RegExp, keyof typeof POOLS]> = [
  // materials first, so garments made of them are not caught by garment words
  [/\b(fabrics?|jersey \d+|interlock|piqué fabric|pique fabric|french terry \d+|downproof|ripstop fabric|yarns?|knit(?:ted)? fabric|textiles?)\b/i, "fabric"],
  [/\bdenim\b/i, "denim"],
  // bags and luggage
  [/\b(tents?|tarps?|dry bags?|bivy)\b/i, "tent"],
  [/\b(duffels?|duffles?|weekender|holdall)\b/i, "duffel"],
  [/\b(hydration|vest pack|trekking backpack|hiking backpack)\b|\b(trek|hik|trail|summit|atlas|ridge|camp)\w*\b.*\bbackpack/i, "backpack-hiking"],
  [/\b(backpacks?|rucksacks?|daypacks?|school bags?|bookbags?)\b/i, "backpack-urban"],
  [/\b(suitcases?|luggage|trolley|spinner|pilot case|cabin case|carry-on)\b/i, "suitcase"],
  [/\b(drawstring|gym sacks?)\b/i, "drawstring"],
  [/\b(totes?|shopping bags?|shopper|jute bags?|non-woven|cooler bags?|cooler tote)\b/i, "tote"],
  [/\b(kraft paper bags?|paper bags?|carrier bags?)\b/i, "paper-bag"],
  // footwear and PPE
  [/\b(ppe|hard hats?|helmets?|hi-vis|safety vests?)\b/i, "hard-hat"],
  [/\b(safety (?:shoes?|boots?|trainers?|footwear)|rigger boots?|work boots?|steel toe|composite toe|s[123]p?\b.*\b(?:shoes?|boots?|trainers?))/i, "work-boot"],
  [/\b(canvas sneakers?|vulcani[sz]ed|high-top|hi-top|plimsolls?)\b/i, "canvas-shoe"],
  [/\b(sneakers?|running shoes?|trail running|knit runners?|trainers?|loafers?|footwear|shoes?|sandals?|slippers?)\b/i, "sneaker"],
  // apparel
  [/\b(polos?)\b/i, "polo"],
  [/\b(hoodies?|hooded|sweatshirts?|pullovers?|fleece)\b/i, "hoodie"],
  [/\b(jackets?|parkas?|raincoats?|windbreakers?|coats?|anoraks?|shell)\b/i, "jacket"],
  [/\b(sports bras?|bralette)\b/i, "sports-bra"],
  [/\b(cycling|bib shorts)\b/i, "cycling"],
  [/\b(leggings|tights|yoga pants)\b/i, "leggings"],
  [/\b(trousers|chinos?|pants|shorts|jeans)\b/i, "trousers"],
  [/\b(t-shirts?|tees?|tank tops?|singlets?)\b/i, "tshirt"],
  [/\b(shirts?|blouses?|uniforms?|workwear)\b/i, "shirt"],
  // home textiles
  [/\b(bathrobes?|robes?)\b/i, "bathrobe"],
  [/\b(towels?)\b/i, "towel"],
  [/\b(bed sheets?|sheet sets?|duvets?|pillows?|bedding|comforters?|sateen)\b/i, "bedding"],
  // electronics and electrical (before furniture and packaging: "battery cabinet", "cable ties in carton")
  [/\b(street ?lights?|road lamps?)\b/i, "street-light"],
  [/\b(flood ?lights?|stadium|explosion-proof|luminaires?)\b/i, "flood-light"],
  [/\b(socket sets?|ratchets?)\b/i, "socket-set"],
  [/\b(hex keys?|allen|bit sets?|screwdrivers?|tool sets?|toolkits?)\b/i, "tool-set"],
  [/\b(pruners?|shears|secateurs|garden tools?)\b/i, "pruner"],
  [/\b(hammers?|mallets?)\b/i, "hammer"],
  [/\b(pliers|cutters?|nippers?)\b/i, "pliers"],
  [/\b(wrench(?:es)?|spanners?)\b/i, "wrench"],
  [/\b(hand tools?|tools?)\b/i, "tool-set"],
  [/\b(mailer box(?:es)?|mailers?|gift box(?:es)?|rigid box(?:es)?|display trays?|shelf-ready)\b/i, "mailer-box"],
  [/\b(sun loungers?|loungers?|daybeds?|chaise)\b/i, "sun-lounger"],
  [/\b(parasols?|umbrellas?|cantilever)\b/i, "parasol"],
  [/\b(outdoor|patio|garden|rattan|aluminium|aluminum)\b.*\b(sofas?|lounge|sectional|seating)\b|\b(lounge sets?|rope lounge)\b/i, "outdoor-sofa"],
  [/\b(outdoor|patio|garden|teak|aluminium)\b.*\b(dining|table sets?|bistro)\b/i, "outdoor-dining"],
  [/\b(dining tables?|kitchen tables?|coffee tables?|tables?)\b/i, "dining-table"],
  [/\b(chairs?|stools?|bench(?:es)?|armchairs?)\b/i, "chair"],
  [/\b(sofas?|couch(?:es)?|sectional|loveseats?)\b/i, "outdoor-sofa"],
  [/\b(nightstands?|bedside)\b/i, "nightstand"],
  [/\b(bed frames?|platform beds?|beds?)\b/i, "bed"],
  [/\b(bookcases?|bookshel(?:f|ves)|shelving units?|shelf|shelves)\b/i, "bookshelf"],
  [/^(?!.*batter)(?=.*\b(sideboards?|cabinets?|tv units?|tv stands?|wardrobes?|dressers?|credenzas?|consoles?)\b)/i, "cabinet"],
  [/\b(routers?|gateways?|access points?|modems?)\b/i, "router"],
  [/\b(sensors?|trackers?|smart home|zigbee|thermostats?)\b/i, "smart-device"],
  [/\b(smart plugs?|sockets?|power strips?|adapters?)\b/i, "smart-plug"],
  [/\b(ev chargers?|on-board chargers?|charging stations?|wallbox)\b/i, "ev-charger"],
  [/\b(batter(?:y|ies)|bms|swapping)\b/i, "battery"],
  [/\b(harness|cable assembl(?:y|ies)|cable ties?|connectors?)\b/i, "harness"],
  [/\b(cables?|wires?|cords?|conductors?)\b/i, "cable"],
  [/\b(distribution boards?|switchboards?|breakers?|switchgear|panel boards?|control panels?)\b/i, "switchboard"],
  [/\b(cnc|machined|machining|turned parts|milled)\b/i, "cnc"],
  [/\b(pcba?|circuit|smt|modules?|soc|controllers?|driver boards?|electronics?|iot)\b/i, "pcb"],
  // industrial
  [/\b(cartons?|corrugated|shipping box(?:es)?|inserts|dividers|cardboard)\b/i, "carton"],
  [/\b(pouch(?:es)?|sachets?|zipper bags?|quad-seal|retort|vffs|mono-pe|degassing|roll stock)\b/i, "pouch"],
  [/\b(cutlery|forks?|spoons?|knives|knife|utensils?)\b/i, "cutlery"],
  [/\b(storage box(?:es)?|crates?|bins?)\b/i, "storage-box"],
  [/\b(closures?|caps?|flip-top|lids?)\b/i, "caps"],
  [/\b(racking|racks?|mezzanine|shelving)\b/i, "racking"],
  [/\b(gaskets?|bushings?|anti-vibration|rubber|silicone|epdm|nbr|rollers?)\b/i, "rubber"],
  [/\b(injection|moulded plastic|molded plastic|plastic parts?|plastics)\b/i, "plastic-parts"],
  [/\b(steel structures?|steel buildings?|warehouse buildings?|pre-engineered|structural steel|clear span|conveyor support)\b/i, "steel-structure"],
  [/\b(welded|welding|weld|fabricated|fabrication|gantr\w*)\b/i, "welding"],
  [/\b(stamped|stamping|brackets?|heat shields?|metal parts?|sheet metal|hangers?|fasteners?|screws?|bolts?)\b/i, "metal-parts"],
  [/\b(moulds?|molds?|tooling|dies?)\b/i, "cnc"],
  [/\b(machines?|machinery|sealers?|fillers?|filling|milling line|dryers?|shellers?|conveyors?|equipment|e-coating|coating service)\b/i, "machine"],
  // tools
  // packaging
  // food
  [/\b(roasted)\b/i, "coffee-roasted"],
  [/\b(green coffee|arabica|robusta|coffee beans?|microlot|honey-processed|washed|coffee)\b/i, "coffee-green"],
  [/\b(shrimps?|prawns?)\b/i, "shrimp"],
  [/\b(pangasius|fillets?|fish|seafood|tuna|salmon)\b/i, "fish"],
  // furniture
  // ceramics, tiles and stone
  [/\b(planters?|garden pots?|flower pots?|plant pots?)\b/i, "planter"],
  [/\b(mugs?|cups?)\b/i, "mug"],
  [/\b(bowls?)\b/i, "bowl"],
  [/\b(dinnerware|plates?|tableware|dinner sets?|stoneware|porcelain sets?)\b/i, "dinnerware"],
  [/\b(mosaics?)\b/i, "mosaic"],
  [/\b(terrazzo)\b/i, "terrazzo"],
  [/\b(quartz|marble|granite|slabs?|countertops?)\b/i, "marble"],
  [/\b(tiles?|planks?)\b/i, "tiles"],
  // lighting
  [/\b(high bay|highbay|warehouse lights?|industrial lights?)\b/i, "warehouse"],
  [/\b(led panels?|panel lights?|tubes?|linear|trunking|downlights?|ceiling lights?|lamps?|led|lighting)\b/i, "led-panel"],
  // chemicals and coatings
  [/\b(toners?|cleansers?|serums?|sunscreens?|sheet masks?|masks?|skincare|cosmetics?|lotions?|creams?|shampoos?|soaps?|beauty)\b/i, "skincare"],
  [/\b(floor coatings?|epoxy floor|self-levell?ing)\b/i, "floor-coating"],
  [/\b(adhesives?|glue|sealants?|resins?)\b/i, "adhesive"],
  [/\b(topcoats?|paints?|coatings?|primers?|varnish(?:es)?|lacquers?)\b/i, "paint"],
  [/\b(degreasers?|chemicals?|solvents?|detergents?|cip|enzymes?|acids?)\b/i, "chemical"],
  // category names (homepage tiles) and other broad words
  [/\b(apparel|garments?|clothing|activewear|sportswear)\b/i, "tshirt"],
  [/\b(luggage|bags & luggage)\b/i, "suitcase"],
  [/\b(garden|outdoor|patio|hospitality)\b.*\bfurniture\b/i, "outdoor-sofa"],
  [/\b(living room)\b/i, "outdoor-sofa"],
  [/\b(furniture)\b/i, "dining-table"],
  [/\b(home decor|decor)\b/i, "planter"],
  [/\b(ev|e-mobility)\b/i, "battery"],
  [/\b(ems|contract manufacturing)\b/i, "pcb"],
  [/\b(electrical)\b/i, "switchboard"],
  [/\b(machinery|industrial equipment)\b/i, "machine"],
  [/\b(automotive|motorcycle|vehicle)\b/i, "metal-parts"],
  [/\b(construction|building materials?|stone)\b/i, "tiles"],
  [/\b(agriculture|food)\b/i, "coffee-green"],
  [/\b(household)\b/i, "storage-box"],
  [/\b(hardware|mro|maintenance|distributor)\b/i, "tool-set"],
  [/\b(logistics|shipments?|incoterms?|export documents?|sourcing|buyer's guide|supplier's guide)\b/i, "logistics"],
  [/\b(sporting|sports|toys?|camping)\b/i, "tent"],
  [/\b(services?|engineering|design)\b/i, "cnc"],
  [/\b(flexible packaging|flexible)\b/i, "pouch"],
  [/\b(packaging)\b/i, "carton"],
  // last resort for anything that is at least a bag or a pack
  [/\b(packs?|bags?)\b/i, "pouch"],
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The pool key for a subject, or null when none of the rules recognise it. */
export function productPhotoKey(subject: string | null | undefined): string | null {
  const s = (subject ?? "").trim();
  if (!s) return null;
  // The head of a title or tagline names the thing ("Camping backpacks, tents and technical
  // textiles" is a backpack maker), so the first comma-separated segment gets the first say.
  const head = s.split(/[,;]/)[0];
  for (const text of head === s ? [s] : [head, s]) {
    for (const [re, key] of RULES) if (re.test(text)) return key;
  }
  return null;
}

/**
 * A stock photo path for `subject`, or null. `slot` distinguishes several images of the same
 * product (a gallery), so each slot draws a different picture when the pool has more than one.
 */
export function productPhoto(subject: string | null | undefined, slot = ""): string | null {
  const key = productPhotoKey(subject);
  if (!key) return null;
  const pool = POOLS[key];
  const i = hash(`${subject}|${slot}`) % pool.length;
  return `${P}${pool[i]}.webp`;
}

export const PRODUCT_PHOTO_POOLS = POOLS;
