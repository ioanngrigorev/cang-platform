/**
 * Six fictional buyer companies used by the demo dataset. Nordwind Outdoor GmbH is the anchor buyer
 * (other engineers' tests log in as buyer@nordwind-outdoor.de). Hoang Gia is a Vietnamese distributor
 * that both buys and sells on the platform.
 */

import type { BusinessType, Incoterm } from "./suppliers";

export type BuyerSeed = {
  slug: string;
  name: string;
  nameVi?: string;
  legalName: string;
  businessType: BusinessType | "IMPORTER" | "RETAILER" | "BRAND_OWNER";
  countryCode: string;
  province?: string;
  city: string;
  address: string;
  postalCode: string;
  taxId: string;
  registrationNumber: string;
  website: string;
  email: string;
  phone: string;
  tagline: string;
  taglineVi: string;
  description: string;
  descriptionVi: string;
  year: number;
  employees: "R_11_50" | "R_51_200" | "R_201_500" | "R_501_1000";
  languages: string[];
  timezone: string;
  verified: boolean;
  alsoSeller?: boolean;
  profile: {
    categories: string[];
    annualVolumeUsd: number;
    currency: string;
    destinations: string[];
    incoterms: Incoterm[];
    note: string;
  };
  owner: { name: string; email: string; title: string; phone: string; locale: "en" | "vi" };
  shipping: { contactName: string; line1: string; line2?: string; city: string; state?: string; postalCode: string };
};

export const BUYERS: BuyerSeed[] = [
  {
    slug: "nordwind-outdoor",
    name: "Nordwind Outdoor GmbH",
    legalName: "Nordwind Outdoor GmbH",
    businessType: "BRAND_OWNER",
    countryCode: "DE",
    city: "Hamburg",
    address: "Am Sandtorkai 48, HafenCity",
    postalCode: "20457",
    taxId: "DE314629187",
    registrationNumber: "HRB 156342 (Amtsgericht Hamburg)",
    website: "https://www.nordwind-outdoor.de",
    email: "sourcing@nordwind-outdoor.de",
    phone: "+49 40 3070 5540",
    tagline: "Hiking, travel and everyday outdoor gear sold in 1,200 European stores",
    taglineVi: "Thương hiệu đồ dã ngoại, du lịch Đức có mặt tại 1.200 cửa hàng châu Âu",
    description:
      "Nordwind Outdoor designs backpacks, rain shells, base layers and camp accessories for the German, Austrian and Scandinavian outdoor market. The brand sells through specialist retailers and its own web shop and is moving its bag and apparel production from China to Vietnam to benefit from EVFTA duty savings and shorter lead times. Sourcing is run from Hamburg by a five-person team that visits factories twice a year and requires GRS or OEKO-TEX certified materials on every private-label programme.",
    descriptionVi:
      "Nordwind Outdoor thiết kế ba lô, áo mưa, đồ giữ nhiệt và phụ kiện cắm trại cho thị trường dã ngoại Đức, Áo và Bắc Âu. Thương hiệu bán qua các cửa hàng chuyên dụng và web shop riêng, đang chuyển sản xuất túi và quần áo từ Trung Quốc sang Việt Nam để hưởng ưu đãi thuế EVFTA và rút ngắn thời gian giao hàng. Bộ phận thu mua gồm năm người tại Hamburg, thăm nhà máy hai lần mỗi năm và yêu cầu vật liệu đạt GRS hoặc OEKO-TEX cho mọi chương trình nhãn riêng.",
    year: 2009,
    employees: "R_51_200",
    languages: ["de", "en"],
    timezone: "Europe/Berlin",
    verified: true,
    profile: {
      categories: ["backpacks", "jackets-outerwear", "activewear", "outdoor-camping", "corrugated-boxes"],
      annualVolumeUsd: 4200000,
      currency: "EUR",
      destinations: ["DE", "AT", "NL", "SE"],
      incoterms: ["FOB", "CIF", "DAP"],
      note: "Mid-size brand, 140 staff, two seasonal collections a year; private-label programmes of 5,000–25,000 pieces per style.",
    },
    owner: { name: "Lena Hartmann", email: "buyer@nordwind-outdoor.de", title: "Head of Sourcing", phone: "+49 172 448 1190", locale: "en" },
    shipping: { contactName: "Lena Hartmann", line1: "Nordwind Logistik-Zentrum", line2: "Billbrookdeich 210", city: "Hamburg", postalCode: "22113" },
  },
  {
    slug: "trailhead-supply-co",
    name: "Trailhead Supply Co.",
    legalName: "Trailhead Supply Company, Inc.",
    businessType: "BRAND_OWNER",
    countryCode: "US",
    city: "Denver",
    address: "2890 Walnut Street, Suite 300",
    postalCode: "80205",
    taxId: "84-2917465",
    registrationNumber: "Colorado SOS 20191234567",
    website: "https://www.trailheadsupply.com",
    email: "purchasing@trailheadsupply.com",
    phone: "+1 303 555 0148",
    tagline: "Direct-to-consumer trail running and cycling brand, Denver, Colorado",
    taglineVi: "Thương hiệu chạy trail và đạp xe bán trực tiếp, Denver, Colorado",
    description:
      "Trailhead Supply sells trail-running shoes, bike accessories, GPS trackers and promotional gear directly to consumers across North America. The company runs a lean supply chain with two contract factories in Vietnam and one in Taiwan, orders in 4,000–12,000 unit batches and pays by T/T with Trade Assurance. It is currently developing a bike GPS tracker and needs PCBA and enclosure suppliers with IPC Class 2 capability.",
    descriptionVi:
      "Trailhead Supply bán giày chạy trail, phụ kiện xe đạp, thiết bị định vị GPS và đồ quảng cáo trực tiếp cho người tiêu dùng Bắc Mỹ. Công ty vận hành chuỗi cung ứng gọn với hai nhà máy gia công tại Việt Nam và một tại Đài Loan, đặt hàng theo lô 4.000–12.000 chiếc và thanh toán T/T kèm Bảo đảm giao dịch. Hiện công ty đang phát triển thiết bị GPS cho xe đạp và cần nhà cung cấp PCBA, vỏ máy đạt IPC Class 2.",
    year: 2016,
    employees: "R_11_50",
    languages: ["en"],
    timezone: "America/Denver",
    verified: true,
    profile: {
      categories: ["sports-shoes", "pcb-pcba", "promotional-bags", "travel-luggage", "iot-devices"],
      annualVolumeUsd: 1800000,
      currency: "USD",
      destinations: ["US", "CA"],
      incoterms: ["FOB", "DDP"],
      note: "DTC brand with 3PL warehouse in Reno, NV; prefers FOB Cat Lai with own forwarder.",
    },
    owner: { name: "Marcus Whitfield", email: "purchasing@trailheadsupply.com", title: "Co-founder & COO", phone: "+1 720 555 0192", locale: "en" },
    shipping: { contactName: "Trailhead 3PL / Receiving", line1: "1450 Greg Street", city: "Sparks", state: "NV", postalCode: "89431" },
  },
  {
    slug: "harbour-finch-retail",
    name: "Harbour & Finch Retail Ltd",
    legalName: "Harbour & Finch Retail Limited",
    businessType: "RETAILER",
    countryCode: "GB",
    city: "Manchester",
    address: "Unit 4, Trafford Park Road",
    postalCode: "M17 1HH",
    taxId: "GB 447 2210 39",
    registrationNumber: "Companies House 11482930",
    website: "https://www.harbourandfinch.co.uk",
    email: "sourcing@harbourfinch.co.uk",
    phone: "+44 161 555 0170",
    tagline: "Home and lifestyle retailer with 64 stores across the UK and Ireland",
    taglineVi: "Chuỗi bán lẻ đồ gia đình và phong cách sống với 64 cửa hàng tại Anh và Ireland",
    description:
      "Harbour & Finch operates 64 home and lifestyle stores plus an online business, selling furniture, tableware, textiles and activewear under its own labels. The Manchester buying office sources around 60% of own-brand ranges from Vietnam, particularly FSC-certified acacia furniture, stoneware and leisurewear. Suppliers must hold a valid social-compliance audit (BSCI or SMETA) and accept 30% deposit, 70% against copy of bill of lading.",
    descriptionVi:
      "Harbour & Finch vận hành 64 cửa hàng đồ gia đình và phong cách sống cùng kênh trực tuyến, bán nội thất, đồ bàn ăn, hàng dệt và đồ thể thao mang nhãn riêng. Văn phòng thu mua tại Manchester lấy khoảng 60% hàng nhãn riêng từ Việt Nam, đặc biệt là nội thất gỗ keo FSC, đồ gốm sứ và đồ thể thao. Nhà cung cấp phải có chứng nhận trách nhiệm xã hội còn hiệu lực (BSCI hoặc SMETA) và chấp nhận đặt cọc 30%, thanh toán 70% khi có bản sao vận đơn.",
    year: 1998,
    employees: "R_501_1000",
    languages: ["en"],
    timezone: "Europe/London",
    verified: false,
    profile: {
      categories: ["dining-furniture", "living-room-furniture", "ceramics-tableware", "activewear", "home-textiles"],
      annualVolumeUsd: 9500000,
      currency: "GBP",
      destinations: ["GB", "IE"],
      incoterms: ["FOB", "CIF"],
      note: "Retail chain; 40HQ container programmes per season, requires retail-ready packaging with EAN labels.",
    },
    owner: { name: "Priya Chandrasekar", email: "sourcing@harbourfinch.co.uk", title: "Senior Buyer, Home & Leisure", phone: "+44 7700 900 412", locale: "en" },
    shipping: { contactName: "Harbour & Finch DC", line1: "Distribution Centre, Barton Dock Road", city: "Manchester", postalCode: "M41 7ZA" },
  },
  {
    slug: "kanto-sourcing",
    name: "Kanto Sourcing K.K.",
    legalName: "Kanto Sourcing Kabushiki Kaisha",
    businessType: "TRADING_COMPANY",
    countryCode: "JP",
    city: "Tokyo",
    address: "3-7-1 Nihonbashi, Chuo-ku",
    postalCode: "103-0027",
    taxId: "T8010001204598",
    registrationNumber: "Tokyo Legal Affairs Bureau 0100-01-204598",
    website: "https://www.kanto-sourcing.jp",
    email: "trade@kanto-sourcing.jp",
    phone: "+81 3 5555 0136",
    tagline: "Trading house supplying Japanese supermarkets, hotels and food processors",
    taglineVi: "Công ty thương mại cung ứng cho siêu thị, khách sạn và nhà chế biến thực phẩm Nhật Bản",
    description:
      "Kanto Sourcing is a mid-size trading company that imports food ingredients, home textiles and consumer electronics for Japanese supermarket chains, hotel groups and food processors. It has bought pangasius, coffee and towels from Vietnam for more than a decade and handles import licensing, Japanese labelling and quality documentation on behalf of its customers. Orders are placed on annual programmes with monthly call-offs, usually CIF Yokohama or Tokyo.",
    descriptionVi:
      "Kanto Sourcing là công ty thương mại cỡ vừa nhập khẩu nguyên liệu thực phẩm, hàng dệt gia dụng và điện tử tiêu dùng cho các chuỗi siêu thị, tập đoàn khách sạn và nhà chế biến thực phẩm Nhật Bản. Công ty đã mua cá tra, cà phê và khăn bông từ Việt Nam hơn mười năm và thay mặt khách hàng xử lý giấy phép nhập khẩu, nhãn tiếng Nhật và hồ sơ chất lượng. Đơn hàng theo chương trình năm với lịch giao hàng hàng tháng, thường theo điều kiện CIF Yokohama hoặc Tokyo.",
    year: 1987,
    employees: "R_51_200",
    languages: ["ja", "en"],
    timezone: "Asia/Tokyo",
    verified: true,
    profile: {
      categories: ["seafood", "coffee-tea", "home-textiles", "consumer-electronics", "processed-foods"],
      annualVolumeUsd: 12000000,
      currency: "USD",
      destinations: ["JP"],
      incoterms: ["CIF", "CFR", "FOB"],
      note: "Annual programmes with monthly call-offs; requires Japanese-language labels and MHLW-compliant food documentation.",
    },
    owner: { name: "Kenji Matsumoto", email: "trade@kanto-sourcing.jp", title: "General Manager, Import Division", phone: "+81 90 5555 0177", locale: "en" },
    shipping: { contactName: "Kanto Sourcing Logistics", line1: "Daikoku Pier Cold Storage, 6-1 Daikoku-futo", city: "Yokohama", state: "Kanagawa", postalCode: "230-0054" },
  },
  {
    slug: "southern-cross-distribution",
    name: "Southern Cross Distribution Pty Ltd",
    legalName: "Southern Cross Distribution Pty Ltd",
    businessType: "DISTRIBUTOR",
    countryCode: "AU",
    city: "Melbourne",
    address: "18 Dohertys Road, Laverton North",
    postalCode: "3026",
    taxId: "ABN 51 624 987 330",
    registrationNumber: "ACN 624 987 330",
    website: "https://www.southerncrossdist.com.au",
    email: "buying@southerncrossdist.com.au",
    phone: "+61 3 9555 0128",
    tagline: "Wholesale distributor of hardware, safety and outdoor products in Australia and New Zealand",
    taglineVi: "Nhà phân phối sỉ dụng cụ, bảo hộ lao động và đồ ngoài trời tại Úc và New Zealand",
    description:
      "Southern Cross Distribution supplies independent hardware stores, safety retailers and garden centres across Australia and New Zealand with hand tools, safety footwear, outdoor furniture and promotional products. The company holds stock in Melbourne and Auckland, imports around 300 containers a year and looks for Vietnamese factories that can meet AS/NZS standards and provide test reports before shipment.",
    descriptionVi:
      "Southern Cross Distribution cung cấp dụng cụ cầm tay, giày bảo hộ, nội thất ngoài trời và sản phẩm quảng cáo cho các cửa hàng ngũ kim độc lập, nhà bán lẻ bảo hộ lao động và trung tâm làm vườn tại Úc và New Zealand. Công ty có kho tại Melbourne và Auckland, nhập khoảng 300 container mỗi năm và tìm kiếm nhà máy Việt Nam đáp ứng tiêu chuẩn AS/NZS, cung cấp báo cáo thử nghiệm trước khi giao hàng.",
    year: 2003,
    employees: "R_51_200",
    languages: ["en"],
    timezone: "Australia/Melbourne",
    verified: false,
    profile: {
      categories: ["hand-tools", "safety-footwear", "outdoor-furniture", "promotional-bags", "fasteners"],
      annualVolumeUsd: 6800000,
      currency: "AUD",
      destinations: ["AU", "NZ"],
      incoterms: ["FOB", "CIF"],
      note: "Wholesale distributor; mixed-SKU 40HQ containers, AS/NZS compliance and pre-shipment inspection required.",
    },
    owner: { name: "Rebecca O'Donnell", email: "buying@southerncrossdist.com.au", title: "Purchasing Manager", phone: "+61 412 555 088", locale: "en" },
    shipping: { contactName: "Southern Cross DC", line1: "18 Dohertys Road", city: "Laverton North", state: "VIC", postalCode: "3026" },
  },
  {
    slug: "hoang-gia-industrial-supply",
    name: "Hoang Gia Industrial Supply",
    nameVi: "Công ty TNHH Thiết bị Công nghiệp Hoàng Gia",
    legalName: "CÔNG TY TNHH THIẾT BỊ CÔNG NGHIỆP HOÀNG GIA",
    businessType: "DISTRIBUTOR",
    countryCode: "VN",
    province: "hanoi",
    city: "Hanoi",
    address: "Số 128 Phố Nguyễn Văn Cừ, Quận Long Biên, Hà Nội",
    postalCode: "100000",
    taxId: "0108456721",
    registrationNumber: "0108456721 (Sở KH&ĐT Hà Nội)",
    website: "https://www.hoanggiaindustrial.vn",
    email: "kinhdoanh@hoanggiaindustrial.vn",
    phone: "+84 24 3872 4410",
    tagline: "Industrial MRO distributor for factories in northern Vietnam; also sells to export buyers",
    taglineVi: "Nhà phân phối vật tư công nghiệp MRO cho nhà máy miền Bắc; đồng thời bán cho khách xuất khẩu",
    description:
      "Hoang Gia distributes LED lighting, cables, hand tools, safety equipment and packaging consumables to more than 400 factories in the industrial parks around Hanoi, Bac Ninh and Hai Phong. The company buys from Vietnamese manufacturers on CANG for its own 3,000 m² warehouse in Long Bien, holds stock of the fast-moving items its maintenance customers need within 24 hours and issues VAT invoices in VND. As a registered exporter it also consolidates mixed containers of tools, lighting and PPE for distributors in Laos, Cambodia and the Middle East, handling export documentation, certificates of origin and FOB Hai Phong bookings on their behalf. A team of twelve sales engineers visits factories weekly, which is why Hoang Gia is often the first call when a plant needs a replacement part, a lighting retrofit or a bulk PPE order for new hires.",
    descriptionVi:
      "Hoàng Gia phân phối đèn LED, dây cáp, dụng cụ cầm tay, thiết bị bảo hộ và vật tư đóng gói cho hơn 400 nhà máy trong các khu công nghiệp quanh Hà Nội, Bắc Ninh và Hải Phòng. Công ty mua hàng của các nhà sản xuất Việt Nam trên CANG cho kho 3.000 m² tại Long Biên, luôn dự trữ các mặt hàng bảo trì tiêu thụ nhanh để giao trong 24 giờ và xuất hoá đơn VAT bằng VND. Với tư cách doanh nghiệp xuất khẩu, công ty gom container hỗn hợp dụng cụ, đèn chiếu sáng và bảo hộ lao động cho nhà phân phối tại Lào, Campuchia và Trung Đông, thay mặt họ lo chứng từ xuất khẩu, giấy chứng nhận xuất xứ và đặt chỗ FOB Hải Phòng. Đội mười hai kỹ sư kinh doanh thăm nhà máy hàng tuần, nên Hoàng Gia thường là nơi được gọi đầu tiên khi một nhà máy cần phụ tùng thay thế, cải tạo hệ thống chiếu sáng hay đặt bảo hộ số lượng lớn cho nhân viên mới.",
    year: 2012,
    employees: "R_51_200",
    languages: ["vi", "en"],
    timezone: "Asia/Ho_Chi_Minh",
    verified: false,
    alsoSeller: true,
    profile: {
      categories: ["lighting", "wires-cables", "hand-tools", "safety-footwear", "corrugated-boxes"],
      annualVolumeUsd: 2400000,
      currency: "VND",
      destinations: ["VN", "LA", "KH", "AE"],
      incoterms: ["EXW", "FCA", "FOB"],
      note: "Domestic distributor with 3,000 m² warehouse in Long Bien; consolidates mixed containers for re-export.",
    },
    owner: { name: "Lê Hoàng Nam", email: "nam.le@hoanggiaindustrial.vn", title: "Giám đốc kinh doanh", phone: "+84 912 336 780", locale: "vi" },
    shipping: { contactName: "Kho Hoàng Gia", line1: "Lô C3, Cụm công nghiệp Ninh Hiệp", line2: "Huyện Gia Lâm", city: "Hà Nội", postalCode: "100000" },
  },
];
