/**
 * Composes the long-form English / Vietnamese copy of the demo dataset (company profiles, product
 * descriptions, SEO fields) from the structured data in `data/suppliers.ts` and `data/products*.ts`.
 * Everything here is deterministic — no randomness — so the same input always yields the same text.
 */
import type { ProductSeed } from "../data/products";
import type { SupplierSeed } from "../data/suppliers";

const BUSINESS_TYPE_EN: Record<string, string> = {
  MANUFACTURER: "manufacturer",
  OEM_MANUFACTURER: "OEM manufacturer",
  ODM_MANUFACTURER: "ODM manufacturer",
  WHOLESALER: "wholesaler",
  EXPORTER: "exporter",
  DISTRIBUTOR: "distributor",
  INDUSTRIAL_SUPPLIER: "industrial supplier",
  TRADING_COMPANY: "trading company",
};
const BUSINESS_TYPE_VI: Record<string, string> = {
  MANUFACTURER: "nhà sản xuất",
  OEM_MANUFACTURER: "nhà sản xuất OEM",
  ODM_MANUFACTURER: "nhà sản xuất ODM",
  WHOLESALER: "nhà bán buôn",
  EXPORTER: "doanh nghiệp xuất khẩu",
  DISTRIBUTOR: "nhà phân phối",
  INDUSTRIAL_SUPPLIER: "nhà cung cấp công nghiệp",
  TRADING_COMPANY: "công ty thương mại",
};

const EMPLOYEES_EN: Record<string, string> = {
  R_1_10: "fewer than 10",
  R_11_50: "11–50",
  R_51_200: "51–200",
  R_201_500: "201–500",
  R_501_1000: "501–1,000",
  R_1001_5000: "1,001–5,000",
  R_5000_PLUS: "more than 5,000",
};
const EMPLOYEES_VI: Record<string, string> = {
  R_1_10: "dưới 10",
  R_11_50: "11–50",
  R_51_200: "51–200",
  R_201_500: "201–500",
  R_501_1000: "501–1.000",
  R_1001_5000: "1.001–5.000",
  R_5000_PLUS: "trên 5.000",
};

const REGION_PORT: Record<string, { en: string; vi: string; port: string }> = {
  North: { en: "Hai Phong port (Lach Huyen / Dinh Vu)", vi: "cảng Hải Phòng (Lạch Huyện / Đình Vũ)", port: "Hai Phong" },
  Central: { en: "Da Nang port (Tien Sa)", vi: "cảng Đà Nẵng (Tiên Sa)", port: "Da Nang" },
  South: { en: "Cat Lai or Cai Mep port, Ho Chi Minh City", vi: "cảng Cát Lái hoặc Cái Mép, TP.HCM", port: "Cat Lai" },
};

const NORTH = new Set(["hanoi", "bac-ninh", "hai-phong", "bac-giang", "vinh-phuc", "hai-duong", "hung-yen", "thai-binh", "nam-dinh", "quang-ninh"]);
const CENTRAL = new Set(["da-nang", "thanh-hoa", "nghe-an", "quang-nam", "binh-dinh", "khanh-hoa", "lam-dong"]);

const CITY_VI: Record<string, string> = {
  "Ho Chi Minh City": "TP. Hồ Chí Minh",
  Hanoi: "Hà Nội",
  "Da Nang": "Đà Nẵng",
  "Hai Phong": "Hải Phòng",
  "Nam Dinh": "Nam Định",
  "Thai Binh": "Thái Bình",
  "Bien Hoa": "Biên Hoà",
  "Duc Hoa": "Đức Hoà",
  "Ben Cat": "Bến Cát",
  "Nhon Trach": "Nhơn Trạch",
  "Que Vo": "Quế Võ",
  "Viet Yen": "Việt Yên",
  "Binh Xuyen": "Bình Xuyên",
  "Hai Duong": "Hải Dương",
  "Chon Thanh": "Chơn Thành",
  "Ben Luc": "Bến Lức",
  "Di An": "Dĩ An",
  "Trang Bom": "Trảng Bom",
  "Bao Loc": "Bảo Lộc",
  "Can Tho": "Cần Thơ",
  "Tan Uyen": "Tân Uyên",
  "Thuan An": "Thuận An",
};

export function cityVi(city: string): string {
  return CITY_VI[city] ?? city;
}

const SPEC_NAME_VI: Record<string, string> = {
  Capacity: "Dung tích",
  "Main fabric": "Vải chính",
  "Base fabric": "Vải đáy",
  Fabric: "Vải",
  Weight: "Trọng lượng",
  "Weight (M)": "Trọng lượng (cỡ M)",
  Dimensions: "Kích thước",
  Size: "Kích thước",
  Sizes: "Cỡ",
  Frame: "Khung",
  Zippers: "Khoá kéo",
  Zip: "Khoá kéo",
  Material: "Chất liệu",
  Materials: "Chất liệu",
  Composition: "Thành phần",
  Construction: "Cấu trúc",
  Finish: "Hoàn thiện",
  Colours: "Màu sắc",
  Color: "Màu",
  Printing: "In ấn",
  Packing: "Đóng gói",
  Packaging: "Đóng gói",
  Standard: "Tiêu chuẩn",
  Certification: "Chứng nhận",
  Certifications: "Chứng nhận",
  Power: "Công suất",
  Voltage: "Điện áp",
  Input: "Đầu vào",
  Output: "Đầu ra",
  Efficiency: "Hiệu suất",
  Protection: "Cấp bảo vệ",
  Warranty: "Bảo hành",
  Upper: "Thân giày",
  Outsole: "Đế ngoài",
  Midsole: "Đế giữa",
  Lining: "Lót",
  Insole: "Lót trong",
  "Toe cap": "Mũi giày",
  Sole: "Đế",
  Shell: "Vỏ",
  Wheels: "Bánh xe",
  Lock: "Khoá",
  Closure: "Khoá",
  Handles: "Quai",
  Thickness: "Độ dày",
  Width: "Khổ",
  Length: "Chiều dài",
  Hardness: "Độ cứng",
  Tolerance: "Dung sai",
  Moisture: "Độ ẩm",
  "Lead time": "Thời gian giao",
  "Lot size": "Cỡ lô",
  Includes: "Bao gồm",
  Features: "Tính năng",
  Set: "Bộ",
  Pieces: "Số chi tiết",
  Seams: "Đường may",
  Fit: "Dáng",
  Glaze: "Men",
  Volume: "Dung tích",
  Machines: "Máy móc",
  Insulation: "Cách điện / cách nhiệt",
  Steel: "Thép",
  Blade: "Lưỡi",
  Head: "Đầu",
  Handle: "Cán",
  Screen: "Màn chắn",
  "Screen size": "Cỡ sàng",
  Processing: "Chế biến",
  "Cup score": "Điểm thử nếm",
  Count: "Cỡ",
  Form: "Dạng",
  Species: "Loài",
  Actives: "Hoạt chất",
  Active: "Hoạt chất",
  Cores: "Số lõi",
  Conductor: "Lõi dẫn",
  Sheath: "Vỏ bọc",
  Radio: "Kết nối",
  Battery: "Pin",
  Chemistry: "Hoá học pin",
  Nominal: "Định mức",
  Rating: "Định mức",
  Sling: "Lưới",
  Cushions: "Nệm",
  Weave: "Kiểu dệt",
  Doors: "Cánh",
  Shelves: "Kệ",
  Drawers: "Ngăn kéo",
  "Net weight": "Trọng lượng tịnh",
  "Load rating": "Tải trọng",
  Load: "Tải trọng",
  Body: "Thân",
  Edges: "Cạnh",
  Faces: "Mặt",
  Optic: "Quang học",
  Optics: "Quang học",
  Beam: "Góc chiếu",
  Driver: "Driver",
  Test: "Kiểm tra",
  Testing: "Kiểm tra",
  Inspection: "Kiểm tra",
  Quality: "Chất lượng",
  Coating: "Lớp phủ",
  Welding: "Hàn",
  Surface: "Bề mặt",
  Type: "Loại",
  Style: "Kiểu",
  Design: "Thiết kế",
  Theme: "Chủ đề",
  Grade: "Loại",
  "Luminous flux": "Quang thông",
  Efficacy: "Hiệu suất phát sáng",
  Surge: "Chống xung",
  Flicker: "Nhấp nháy",
  Dimming: "Điều chỉnh sáng",
  "Power factor": "Hệ số công suất",
  "Slip rating": "Chống trượt",
  "Water absorption": "Độ hút nước",
  "Frost resistance": "Chịu băng giá",
  Straps: "Dây đeo",
  "Rain cover": "Áo mưa",
  "Hydration compatible": "Tương thích túi nước",
  "Laptop sleeve": "Ngăn laptop",
  "Laptop compartment": "Ngăn laptop",
  Opening: "Kiểu mở",
  Hardware: "Phụ kiện",
  "Back panel": "Tấm lưng",
  Reflective: "Phản quang",
  "Reflective trim": "Viền phản quang",
  "Safety testing": "Thử nghiệm an toàn",
  "Age range": "Độ tuổi",
  "Water resistance": "Chống nước",
  "Water rating": "Chuẩn chống nước",
  Expandable: "Mở rộng",
  Trolley: "Cần kéo",
  "Front pocket": "Túi trước",
  "USB port": "Cổng USB",
  Base: "Đáy",
  Fly: "Mái lều",
  Floor: "Sàn",
  Poles: "Khung lều",
  "Packed size": "Kích thước gấp",
  "Centre height": "Chiều cao đỉnh",
  "Floor size": "Kích thước sàn",
  "Tie-outs": "Điểm buộc",
  Yarn: "Sợi",
  Shrinkage: "Độ co",
  Dyeing: "Nhuộm",
  Pilling: "Độ xù lông",
  "Thread count": "Mật độ sợi",
  "Wash durability": "Độ bền giặt",
  Border: "Viền",
  Collar: "Cổ áo",
  Placket: "Nẹp áo",
  "Colour fastness": "Độ bền màu",
  Hem: "Gấu",
  Drawcord: "Dây rút",
  Hood: "Mũ",
  Neck: "Cổ",
  Label: "Nhãn",
  "Waist sizes": "Cỡ eo",
  Inseams: "Dài ống",
  Inseam: "Dài ống",
  Wash: "Giặt",
  Support: "Nâng đỡ",
  Cups: "Cúp",
  Pockets: "Túi",
  Pocket: "Túi",
  Panels: "Số mảnh",
  Grippers: "Chống trượt gấu",
  Stretch: "Co giãn",
  "Metal content": "Kim loại",
  Plating: "Mạ",
  "Monthly capacity": "Công suất tháng",
  "Annual volume": "Sản lượng năm",
  "Tooling lead time": "Thời gian làm khuôn",
  Presses: "Máy dập",
  Current: "Dòng điện",
  Balancing: "Cân bằng",
  Comms: "Giao tiếp",
  Telemetry: "Giám sát",
  "Peak discharge": "Dòng xả đỉnh",
  "Cycle life": "Tuổi thọ chu kỳ",
  Slots: "Khay",
  Accuracy: "Độ chính xác",
  Speed: "Tốc độ",
  Heads: "Số vòi",
  Trays: "Khay",
  Temperature: "Nhiệt độ",
  Chamber: "Buồng",
  Blades: "Dao",
  Grading: "Phân loại",
  "Whole kernel rate": "Tỷ lệ nhân nguyên",
  "Milling yield": "Tỷ lệ thu hồi",
  "Broken rice": "Tỷ lệ tấm",
  Control: "Điều khiển",
  "Seal width": "Bề rộng mối hàn",
  "Max bag weight": "Khối lượng túi tối đa",
  Coder: "In ngày",
  Environment: "Môi trường",
  Documentation: "Hồ sơ",
  Quote: "Báo giá",
  "Clear span": "Nhịp",
  "Design code": "Tiêu chuẩn thiết kế",
  "Load per level": "Tải mỗi tầng",
  "Upright height": "Chiều cao cột",
  "Beam length": "Chiều dài dầm",
  "Live load": "Hoạt tải",
  Deck: "Sàn",
  Columns: "Cột",
  Compounds: "Hỗn hợp cao su",
  Compound: "Hỗn hợp cao su",
  Process: "Quy trình",
  Grades: "Cấp",
  Rubber: "Cao su",
  Metal: "Kim loại",
  Threads: "Ren",
  "Load range": "Dải tải",
  Cover: "Lớp bọc",
  "Max length": "Chiều dài tối đa",
  "Inner sleeve": "Ống lót",
  "Fatigue test": "Thử mỏi",
  Board: "Giấy carton",
  "Burst strength": "Độ bục",
  Feature: "Đặc điểm",
  Options: "Tuỳ chọn",
  Paper: "Giấy",
  Structures: "Cấu trúc màng",
  Structure: "Cấu trúc màng",
  Valve: "Van",
  OTR: "Độ thấm oxy",
  Sterilisation: "Tiệt trùng",
  "Seal strength": "Độ bền mối hàn",
  Formats: "Định dạng",
  Compliance: "Tuân thủ",
  Recyclability: "Khả năng tái chế",
  Chips: "Hạt đá",
  "Custom mix MOQ": "MOQ phối màu riêng",
  "Quartz content": "Hàm lượng thạch anh",
  Chip: "Viên",
  Sheet: "Tấm",
  "Foreign matter": "Tạp chất",
  "Black / broken": "Hạt đen / vỡ",
  Altitude: "Độ cao",
  Varieties: "Giống",
  Drying: "Phơi sấy",
  Roaster: "Máy rang",
  Bag: "Túi",
  "Shelf life": "Hạn dùng",
  Trim: "Cắt tỉa",
  Additive: "Phụ gia",
  Approval: "Phê duyệt",
  Glazing: "Mạ băng",
  "Farm certification": "Chứng nhận trại nuôi",
  "Micro release": "Xuất lô vi sinh",
  "Shrimp content": "Hàm lượng tôm",
  Portion: "Khúc",
  Firing: "Nung",
  Decoration: "Trang trí",
  Safety: "An toàn",
  Diameter: "Đường kính",
  Surfactants: "Chất hoạt động bề mặt",
  Claims: "Công bố",
  Bottle: "Chai",
  Scent: "Hương",
  Essence: "Tinh chất",
  Sachet: "Gói",
  Filter: "Màng lọc",
  "Free from": "Không chứa",
  Alcohol: "Cồn",
  Units: "Số lượng",
  "Pot life": "Thời gian sống",
  Coverage: "Định mức phủ",
  "Gloss retention": "Giữ bóng",
  System: "Hệ sơn",
  Solids: "Hàm lượng rắn",
  Viscosity: "Độ nhớt",
  "Cutting capacity": "Khả năng cắt",
  Ratchet: "Cần siết",
  Drives: "Đầu vặn",
  Sockets: "Khẩu",
  Case: "Hộp",
  "Head weight": "Trọng lượng đầu",
  Bundle: "Lô",
  Delivery: "Giao hàng",
  Socket: "Đế",
  Spigot: "Cổ lắp",
  Rail: "Ray",
  Zone: "Vùng",
  Flash: "Bộ nhớ flash",
  Antenna: "Anten",
  "Operating temp": "Nhiệt độ hoạt động",
  "Plug type": "Kiểu phích",
  "Metering accuracy": "Độ chính xác đo",
  App: "Ứng dụng",
  Protocol: "Giao thức",
  Radios: "Kết nối",
  Devices: "Số thiết bị",
  Security: "Bảo mật",
  Positioning: "Định vị",
  Connectivity: "Kết nối",
  Sensors: "Cảm biến",
  "SMT lines": "Chuyền SMT",
  "Smallest component": "Linh kiện nhỏ nhất",
  "Through-hole": "Linh kiện xuyên lỗ",
  Enclosure: "Vỏ",
  Interface: "Giao diện",
  Wire: "Dây",
  Connectors: "Đầu nối",
  Seat: "Mặt ngồi",
  "Seat height": "Chiều cao ngồi",
  "Top thickness": "Độ dày mặt",
  Seats: "Số chỗ",
  Emission: "Phát thải",
  Slats: "Nan",
  Height: "Chiều cao",
  "Load per shelf": "Tải mỗi kệ",
  "UV rating": "Chịu UV",
  "Stacking": "Xếp chồng",
  Positions: "Số nấc",
  Canopy: "Tán dù",
  Mast: "Trụ",
  Ribs: "Nan dù",
  UV: "Chống UV",
  Blend: "Blend",
};

function specNameVi(name: string): string {
  return SPEC_NAME_VI[name] ?? name;
}

export function regionOf(provinceSlug: string): "North" | "Central" | "South" {
  if (NORTH.has(provinceSlug)) return "North";
  if (CENTRAL.has(provinceSlug)) return "Central";
  return "South";
}

export function originPortOf(provinceSlug: string): string {
  return REGION_PORT[regionOf(provinceSlug)].port;
}

export function fmtInt(n: number, vi = false): string {
  const s = Math.round(n).toLocaleString("en-US");
  return vi ? s.replace(/,/g, ".") : s;
}

export function fmtMoney(n: number, currency = "USD", vi = false): string {
  if (currency === "VND") return `${fmtInt(n, vi)} ₫`;
  const fixed = n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(3);
  const [int, dec] = fixed.split(".");
  const intFmt = Number(int).toLocaleString("en-US");
  const body = dec ? `${intFmt}.${dec}` : intFmt;
  // Vietnamese notation: 1.234,56
  return `US$${vi ? body.replace(/,/g, "_").replace(".", ",").replace(/_/g, ".") : body}`;
}

function joinEn(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
function joinVi(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} và ${items[items.length - 1]}`;
}

function capabilityEn(f: SupplierSeed["factory"]): string {
  const caps: string[] = [];
  if (f.oem) caps.push("OEM production to customer specifications");
  if (f.odm) caps.push("ODM development from its own designs");
  if (f.privateLabel) caps.push("private-label programmes");
  return caps.length ? `The factory offers ${joinEn(caps)}.` : "The factory produces its own catalogue ranges.";
}
function capabilityVi(f: SupplierSeed["factory"]): string {
  const caps: string[] = [];
  if (f.oem) caps.push("gia công OEM theo tiêu chuẩn khách hàng");
  if (f.odm) caps.push("phát triển ODM từ thiết kế riêng");
  if (f.privateLabel) caps.push("chương trình nhãn riêng");
  return caps.length ? `Nhà máy nhận ${joinVi(caps)}.` : "Nhà máy sản xuất các dòng sản phẩm trong catalogue của mình.";
}

/** Full English + Vietnamese company profile (≈180–260 words each). */
export function composeCompanyDescription(s: SupplierSeed, certNames: string[]): { en: string; vi: string } {
  const f = s.factory;
  const region = REGION_PORT[regionOf(s.province)];
  const en = [
    s.about,
    `Founded in ${s.year} in ${s.city}, ${s.name} operates a ${fmtInt(f.sizeSqm)} m² facility with ${f.lines} production lines and an annual capacity of ${f.capacity}. Main equipment includes ${f.equipment}. Core materials are ${f.materials}. The company employs ${EMPLOYEES_EN[s.employees]} people, including ${f.rdStaff} R&D and ${f.qcStaff} quality-control staff, and exports about ${f.exportPct}% of its output to ${joinEn(f.mainMarkets)}, with ${f.exportYears} years of export experience across ${f.exportCountries.length} countries.`,
    `${capabilityEn(f)} The typical minimum order value is around ${fmtMoney(f.minOrderUsd)}, standard lead time is ${f.leadDays} days after sample approval and samples are ready in ${f.sampleDays} days. Accepted payment terms are ${joinEn(f.paymentTerms)} and quotations are offered ${joinEn(f.incoterms)}, shipping through ${region.en}.${certNames.length ? ` Certifications on file: ${joinEn(certNames)}.` : ""}${f.tour ? " Factory tours and video calls from the production floor can be arranged for buyers." : " Video calls from the production floor can be arranged on request."} Communication in ${joinEn(s.languages.map(langName))}.`,
  ].join("\n\n");
  const vi = [
    s.aboutVi,
    `Thành lập năm ${s.year} tại ${cityVi(s.city)}, ${s.nameVi} vận hành nhà máy ${fmtInt(f.sizeSqm, true)} m² với ${f.lines} dây chuyền sản xuất và công suất ${f.capacityVi}. Thiết bị chính gồm ${f.equipmentVi}. Nguyên liệu chủ yếu là ${f.materialsVi}. Công ty có ${EMPLOYEES_VI[s.employees]} nhân sự, trong đó ${f.rdStaff} kỹ sư R&D và ${f.qcStaff} nhân viên kiểm soát chất lượng, xuất khẩu khoảng ${f.exportPct}% sản lượng sang ${joinVi(f.mainMarketsVi)} với ${f.exportYears} năm kinh nghiệm xuất khẩu tới ${f.exportCountries.length} quốc gia.`,
    `${capabilityVi(f)} Giá trị đơn hàng tối thiểu thường khoảng ${fmtMoney(f.minOrderUsd, "USD", true)}, thời gian sản xuất tiêu chuẩn ${f.leadDays} ngày sau khi duyệt mẫu và mẫu sẵn sàng trong ${f.sampleDays} ngày. Điều khoản thanh toán chấp nhận: ${joinVi(f.paymentTerms)}; báo giá theo điều kiện ${joinVi(f.incoterms)}, giao hàng qua ${region.vi}.${certNames.length ? ` Chứng nhận hiện có: ${joinVi(certNames)}.` : ""}${f.tour ? " Khách hàng có thể đặt lịch tham quan nhà máy hoặc gọi video trực tiếp từ xưởng sản xuất." : " Có thể sắp xếp gọi video từ xưởng sản xuất theo yêu cầu."} Ngôn ngữ làm việc: ${joinVi(s.languages.map(langNameVi))}.`,
  ].join("\n\n");
  return { en, vi };
}

function langName(code: string): string {
  return { vi: "Vietnamese", en: "English", ko: "Korean", ja: "Japanese", zh: "Chinese", de: "German", fr: "French" }[code] ?? code;
}
function langNameVi(code: string): string {
  return { vi: "tiếng Việt", en: "tiếng Anh", ko: "tiếng Hàn", ja: "tiếng Nhật", zh: "tiếng Trung", de: "tiếng Đức", fr: "tiếng Pháp" }[code] ?? code;
}

const UNIT_VI: Record<string, string> = {
  pieces: "chiếc",
  pairs: "đôi",
  sets: "bộ",
  meters: "mét",
  kg: "kg",
  tons: "tấn",
  sqm: "m²",
  slabs: "tấm",
  bays: "khoang",
  bundles: "lô",
  cartons: "thùng",
  rolls: "cuộn",
};

export function unitVi(unit: string): string {
  return UNIT_VI[unit] ?? unit;
}

function packagingEn(p: ProductSeed): string {
  if (p.pack) return p.pack;
  switch (p.unit) {
    case "pairs":
      return "Each pair in a printed box, 10–12 pairs per 5-ply export carton with size assortment label";
    case "sets":
      return "Each set in a printed retail box with foam or corrugated dividers, master cartons palletised for container loading";
    case "kg":
    case "tons":
      return "Bulk packing in 25 kg bags, jumbo bags or lined cartons as specified, palletised and shrink-wrapped";
    case "meters":
      return "Rolls or coils on cores, wrapped in PE film and labelled with batch, length and specification";
    case "sqm":
      return "Cartons per square metre with corner protection, palletised and strapped for container loading";
    default:
      return "Individually polybagged with hangtag or label, packed in 5-ply export cartons, palletised on request";
  }
}
function packagingVi(p: ProductSeed): string {
  if (p.packVi) return p.packVi;
  switch (p.unit) {
    case "pairs":
      return "Mỗi đôi trong hộp in, 10–12 đôi mỗi thùng carton xuất khẩu 5 lớp có nhãn phối cỡ";
    case "sets":
      return "Mỗi bộ trong hộp bán lẻ in sẵn có xốp hoặc vách carton, thùng lớn đóng pallet để xếp container";
    case "kg":
    case "tons":
      return "Đóng số lượng lớn trong bao 25 kg, bao jumbo hoặc thùng lót theo yêu cầu, đóng pallet và quấn màng co";
    case "meters":
      return "Cuộn hoặc coil trên lõi, bọc màng PE và dán nhãn lô, chiều dài và quy cách";
    case "sqm":
      return "Đóng thùng theo mét vuông có góc bảo vệ, xếp pallet và đai chằng để xếp container";
    default:
      return "Đóng túi PE riêng kèm thẻ treo hoặc nhãn, xếp thùng carton xuất khẩu 5 lớp, đóng pallet theo yêu cầu";
  }
}

export type ProductCopy = {
  short: string;
  description: string;
  descriptionVi: string;
  leadTimeNote: string;
  packagingDetails: string;
  shippingInfo: string;
  seoTitle: string;
  seoDescription: string;
};

/** Full English + Vietnamese product copy (≈140–230 words each). */
export function composeProductCopy(
  p: ProductSeed,
  s: SupplierSeed,
  tiers: Array<{ minQty: number; maxQty: number | null; price: number }>,
  certNames: string[],
): ProductCopy {
  const priceType = p.priceType ?? "TIERED";
  const currency = p.currency ?? "USD";
  const region = REGION_PORT[regionOf(s.province)];
  const specsEn = p.specs.map(([n, v, u]) => `${n}: ${v}${u ? ` ${u}` : ""}`).join("; ");
  const specsVi = p.specs.map(([n, v, u]) => `${specNameVi(n)}: ${v}${u ? ` ${u}` : ""}`).join("; ");
  const customizable = p.customizable ?? (s.factory.oem || s.factory.odm);

  let pricingEn: string;
  let pricingVi: string;
  if (priceType === "TIERED" && tiers.length) {
    const first = tiers[0];
    const last = tiers[tiers.length - 1];
    pricingEn = `Pricing is tiered: ${fmtMoney(first.price, currency)} per ${singular(p.unit)} at the minimum order of ${fmtInt(p.moq)} ${p.unit}, falling to ${fmtMoney(last.price, currency)} from ${fmtInt(last.minQty)} ${p.unit}.`;
    pricingVi = `Giá theo bậc số lượng: ${fmtMoney(first.price, currency, true)}/${unitVi(p.unit)} với đơn tối thiểu ${fmtInt(p.moq, true)} ${unitVi(p.unit)}, giảm còn ${fmtMoney(last.price, currency, true)} từ ${fmtInt(last.minQty, true)} ${unitVi(p.unit)}.`;
  } else if (priceType === "FIXED") {
    pricingEn = `Fixed price of ${fmtMoney(p.price, currency)} per ${singular(p.unit)} with a minimum order of ${fmtInt(p.moq)} ${p.unit}.`;
    pricingVi = `Giá cố định ${fmtMoney(p.price, currency, true)}/${unitVi(p.unit)}, đơn tối thiểu ${fmtInt(p.moq, true)} ${unitVi(p.unit)}.`;
  } else if (priceType === "NEGOTIABLE") {
    pricingEn = `Indicative price from ${fmtMoney(p.price, currency)} per ${singular(p.unit)} (minimum ${fmtInt(p.moq)} ${p.unit}); final pricing is negotiated on specification, volume and payment terms.`;
    pricingVi = `Giá tham khảo từ ${fmtMoney(p.price, currency, true)}/${unitVi(p.unit)} (tối thiểu ${fmtInt(p.moq, true)} ${unitVi(p.unit)}); giá cuối thương lượng theo quy cách, số lượng và điều khoản thanh toán.`;
  } else {
    pricingEn = `Pricing is quoted per project after a technical review of drawings or specifications (minimum ${fmtInt(p.moq)} ${p.unit}).`;
    pricingVi = `Báo giá theo từng dự án sau khi xem xét kỹ thuật bản vẽ hoặc quy cách (tối thiểu ${fmtInt(p.moq, true)} ${unitVi(p.unit)}).`;
  }

  const sampleEn =
    p.sample === false
      ? "Samples are handled as part of the project quotation."
      : p.sample && p.sample.price > 0
        ? `Samples cost ${fmtMoney(p.sample.price, currency)} (credited against the first order) and ship in ${p.sample.days} days.`
        : `Free samples are available and ship in ${p.sample?.days ?? s.factory.sampleDays} days; the buyer covers courier cost.`;
  const sampleVi =
    p.sample === false
      ? "Mẫu được xử lý trong phạm vi báo giá dự án."
      : p.sample && p.sample.price > 0
        ? `Phí mẫu ${fmtMoney(p.sample.price, currency, true)} (được khấu trừ vào đơn hàng đầu tiên), giao trong ${p.sample.days} ngày.`
        : `Có mẫu miễn phí, giao trong ${p.sample?.days ?? s.factory.sampleDays} ngày; người mua chịu phí chuyển phát.`;

  const customEn = customizable
    ? "Colours, materials, logos and packaging can be customised, and the factory supports OEM and ODM development from tech packs or samples."
    : "This item is supplied as listed; branding options are limited to labelling.";
  const customVi = customizable
    ? "Màu sắc, vật liệu, logo và bao bì có thể tuỳ chỉnh; nhà máy hỗ trợ phát triển OEM và ODM từ tech pack hoặc mẫu."
    : "Sản phẩm cung cấp theo quy cách niêm yết; tuỳ chọn thương hiệu chỉ giới hạn ở dán nhãn.";

  const leadTimeNote = `${p.lead} days after sample approval and deposit; repeat orders of the same specification ship in about ${Math.max(7, Math.round(p.lead * 0.7))} days.`;
  const packagingDetails = packagingEn(p);
  const shippingInfo = `Ships ${s.factory.incoterms.join(" / ")} from ${region.en}. Sea freight (FCL/LCL) for bulk orders, air or courier for samples and urgent lots.`;

  const supplierEn = `Manufactured by ${s.name} in ${s.city}, Vietnam, a ${s.verification === "VERIFIED" ? "CANG-verified " : ""}${BUSINESS_TYPE_EN[s.businessType]} established in ${s.year}${certNames.length ? ` holding ${joinEn(certNames)}` : ""}.`;
  const supplierVi = `Sản xuất bởi ${s.nameVi} tại ${cityVi(s.city)}, Việt Nam, ${s.verification === "VERIFIED" ? "đã được CANG xác minh, " : ""}${BUSINESS_TYPE_VI[s.businessType]} thành lập năm ${s.year}${certNames.length ? `, có chứng nhận ${joinVi(certNames)}` : ""}.`;

  const description = [
    p.blurb,
    `Key specifications — ${specsEn}.`,
    `${pricingEn} Production lead time is ${p.lead} days after sample approval. ${sampleEn} ${customEn}`,
    `Packaging: ${packagingDetails}. ${shippingInfo}`,
    supplierEn,
  ].join("\n\n");
  const descriptionVi = [
    p.blurbVi,
    `Thông số chính — ${specsVi}.`,
    `${pricingVi} Thời gian sản xuất ${p.lead} ngày sau khi duyệt mẫu. ${sampleVi} ${customVi}`,
    `Đóng gói: ${packagingVi(p)}. Giao hàng ${s.factory.incoterms.join(" / ")} qua ${region.vi}; đường biển (FCL/LCL) cho đơn lớn, đường hàng không hoặc chuyển phát cho mẫu và lô gấp.`,
    supplierVi,
  ].join("\n\n");

  const short = firstSentence(p.blurb);
  const seoTitle = `${p.title} | ${s.name} — CANG`;
  const seoDescription = truncateWords(
    `${short} MOQ ${fmtInt(p.moq)} ${p.unit}, lead time ${p.lead} days, made in ${s.city}, Vietnam by ${s.name}.`,
    155,
  );
  return { short, description, descriptionVi, leadTimeNote, packagingDetails, shippingInfo, seoTitle, seoDescription };
}

function singular(unit: string): string {
  const map: Record<string, string> = { pieces: "piece", pairs: "pair", sets: "set", meters: "metre", slabs: "slab", bays: "bay", bundles: "bundle", cartons: "carton", rolls: "roll", tons: "tonne" };
  return map[unit] ?? unit;
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
