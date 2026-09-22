/** Reference data: countries, currencies, provinces (with industrial-cluster content), industries, categories, certifications. */

export const COUNTRIES: Array<{ code: string; name: string; nameVi: string; region: string; dialCode: string; sortOrder?: number }> = [
  { code: "VN", name: "Vietnam", nameVi: "Việt Nam", region: "Asia", dialCode: "+84", sortOrder: 0 },
  { code: "US", name: "United States", nameVi: "Hoa Kỳ", region: "North America", dialCode: "+1", sortOrder: 1 },
  { code: "DE", name: "Germany", nameVi: "Đức", region: "Europe", dialCode: "+49", sortOrder: 2 },
  { code: "GB", name: "United Kingdom", nameVi: "Anh", region: "Europe", dialCode: "+44", sortOrder: 3 },
  { code: "FR", name: "France", nameVi: "Pháp", region: "Europe", dialCode: "+33", sortOrder: 4 },
  { code: "NL", name: "Netherlands", nameVi: "Hà Lan", region: "Europe", dialCode: "+31", sortOrder: 5 },
  { code: "IT", name: "Italy", nameVi: "Ý", region: "Europe", dialCode: "+39", sortOrder: 6 },
  { code: "ES", name: "Spain", nameVi: "Tây Ban Nha", region: "Europe", dialCode: "+34", sortOrder: 7 },
  { code: "PL", name: "Poland", nameVi: "Ba Lan", region: "Europe", dialCode: "+48", sortOrder: 8 },
  { code: "SE", name: "Sweden", nameVi: "Thụy Điển", region: "Europe", dialCode: "+46", sortOrder: 9 },
  { code: "JP", name: "Japan", nameVi: "Nhật Bản", region: "Asia", dialCode: "+81", sortOrder: 10 },
  { code: "KR", name: "South Korea", nameVi: "Hàn Quốc", region: "Asia", dialCode: "+82", sortOrder: 11 },
  { code: "CN", name: "China", nameVi: "Trung Quốc", region: "Asia", dialCode: "+86", sortOrder: 12 },
  { code: "TW", name: "Taiwan", nameVi: "Đài Loan", region: "Asia", dialCode: "+886", sortOrder: 13 },
  { code: "SG", name: "Singapore", nameVi: "Singapore", region: "Asia", dialCode: "+65", sortOrder: 14 },
  { code: "TH", name: "Thailand", nameVi: "Thái Lan", region: "Asia", dialCode: "+66", sortOrder: 15 },
  { code: "ID", name: "Indonesia", nameVi: "Indonesia", region: "Asia", dialCode: "+62", sortOrder: 16 },
  { code: "MY", name: "Malaysia", nameVi: "Malaysia", region: "Asia", dialCode: "+60", sortOrder: 17 },
  { code: "PH", name: "Philippines", nameVi: "Philippines", region: "Asia", dialCode: "+63", sortOrder: 18 },
  { code: "IN", name: "India", nameVi: "Ấn Độ", region: "Asia", dialCode: "+91", sortOrder: 19 },
  { code: "AU", name: "Australia", nameVi: "Úc", region: "Oceania", dialCode: "+61", sortOrder: 20 },
  { code: "NZ", name: "New Zealand", nameVi: "New Zealand", region: "Oceania", dialCode: "+64", sortOrder: 21 },
  { code: "CA", name: "Canada", nameVi: "Canada", region: "North America", dialCode: "+1", sortOrder: 22 },
  { code: "MX", name: "Mexico", nameVi: "Mexico", region: "North America", dialCode: "+52", sortOrder: 23 },
  { code: "BR", name: "Brazil", nameVi: "Brazil", region: "South America", dialCode: "+55", sortOrder: 24 },
  { code: "AE", name: "United Arab Emirates", nameVi: "UAE", region: "Middle East", dialCode: "+971", sortOrder: 25 },
  { code: "SA", name: "Saudi Arabia", nameVi: "Ả Rập Xê Út", region: "Middle East", dialCode: "+966", sortOrder: 26 },
  { code: "TR", name: "Türkiye", nameVi: "Thổ Nhĩ Kỳ", region: "Europe", dialCode: "+90", sortOrder: 27 },
  { code: "RU", name: "Russia", nameVi: "Nga", region: "Europe", dialCode: "+7", sortOrder: 28 },
  { code: "ZA", name: "South Africa", nameVi: "Nam Phi", region: "Africa", dialCode: "+27", sortOrder: 29 },
  { code: "EG", name: "Egypt", nameVi: "Ai Cập", region: "Africa", dialCode: "+20", sortOrder: 30 },
  { code: "BE", name: "Belgium", nameVi: "Bỉ", region: "Europe", dialCode: "+32", sortOrder: 31 },
  { code: "CH", name: "Switzerland", nameVi: "Thụy Sĩ", region: "Europe", dialCode: "+41", sortOrder: 32 },
  { code: "DK", name: "Denmark", nameVi: "Đan Mạch", region: "Europe", dialCode: "+45", sortOrder: 33 },
  { code: "CZ", name: "Czechia", nameVi: "Séc", region: "Europe", dialCode: "+420", sortOrder: 34 },
  { code: "HK", name: "Hong Kong", nameVi: "Hồng Kông", region: "Asia", dialCode: "+852", sortOrder: 35 },
  { code: "KH", name: "Cambodia", nameVi: "Campuchia", region: "Asia", dialCode: "+855", sortOrder: 36 },
  { code: "LA", name: "Laos", nameVi: "Lào", region: "Asia", dialCode: "+856", sortOrder: 37 },
  { code: "CL", name: "Chile", nameVi: "Chile", region: "South America", dialCode: "+56", sortOrder: 38 },
  { code: "NG", name: "Nigeria", nameVi: "Nigeria", region: "Africa", dialCode: "+234", sortOrder: 39 },
];

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, rateToUsd: 1, isDefault: true, sortOrder: 0 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0, rateToUsd: 0.0000394, isDefault: false, sortOrder: 1 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, rateToUsd: 1.08, isDefault: false, sortOrder: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2, rateToUsd: 1.27, isDefault: false, sortOrder: 3 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0, rateToUsd: 0.0067, isDefault: false, sortOrder: 4 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2, rateToUsd: 0.14, isDefault: false, sortOrder: 5 },
  { code: "KRW", name: "Korean Won", symbol: "₩", decimals: 0, rateToUsd: 0.00074, isDefault: false, sortOrder: 6 },
];

export type ProvinceSeed = {
  code: string;
  slug: string;
  name: string;
  nameVi: string;
  region: "North" | "Central" | "South";
  cluster?: {
    headline: string;
    headlineVi: string;
    description: string;
    descriptionVi: string;
    majorIndustries: string[];
    keyFacts: Record<string, string | number>;
  };
};

export const PROVINCES: ProvinceSeed[] = [
  {
    code: "SG", slug: "ho-chi-minh-city", name: "Ho Chi Minh City", nameVi: "Thành phố Hồ Chí Minh", region: "South",
    cluster: {
      headline: "Vietnam's commercial capital and largest light-industry base",
      headlineVi: "Thủ phủ thương mại và trung tâm công nghiệp nhẹ lớn nhất Việt Nam",
      description: "Ho Chi Minh City anchors the southern manufacturing corridor with export processing zones (Tan Thuan, Linh Trung), Hi-Tech Park (SHTP) and thousands of apparel, footwear, food-processing, packaging, cosmetics and electronics assembly factories. Cat Lai and Cai Mep ports give direct container access to the US and EU.",
      descriptionVi: "TP.HCM là trung tâm của hành lang sản xuất phía Nam với các khu chế xuất (Tân Thuận, Linh Trung), Khu Công nghệ cao (SHTP) và hàng nghìn nhà máy may mặc, giày dép, chế biến thực phẩm, bao bì, mỹ phẩm và lắp ráp điện tử. Cảng Cát Lái và Cái Mép kết nối trực tiếp tới Mỹ và EU.",
      majorIndustries: ["apparel", "footwear", "food-processing", "packaging", "electronics", "cosmetics"],
      keyFacts: { industrialParks: 19, majorPort: "Cat Lai / Cai Mep-Thi Vai", airport: "Tan Son Nhat (SGN)", population: "9.5M" },
    },
  },
  {
    code: "BD", slug: "binh-duong", name: "Binh Duong", nameVi: "Bình Dương", region: "South",
    cluster: {
      headline: "The furniture and wood-products capital of Southeast Asia",
      headlineVi: "Thủ phủ nội thất và đồ gỗ của Đông Nam Á",
      description: "Binh Duong hosts VSIP, My Phuoc and Song Than industrial parks and produces the majority of Vietnam's exported wooden furniture, plus electronics components, plastics, ceramics and textiles. 40 km from HCMC ports.",
      descriptionVi: "Bình Dương có VSIP, Mỹ Phước, Sóng Thần và sản xuất phần lớn đồ gỗ nội thất xuất khẩu của Việt Nam, cùng linh kiện điện tử, nhựa, gốm sứ và dệt may. Cách cảng TP.HCM 40 km.",
      majorIndustries: ["furniture", "plastics", "electronics", "textiles", "household-goods"],
      keyFacts: { industrialParks: 29, majorPort: "Cat Lai (40 km)", specialty: "Wooden furniture (>50% of national exports)" },
    },
  },
  {
    code: "DN", slug: "dong-nai", name: "Dong Nai", nameVi: "Đồng Nai", region: "South",
    cluster: {
      headline: "Heavy and medium industry hub next to Long Thanh airport",
      headlineVi: "Trung tâm công nghiệp nặng và vừa cạnh sân bay Long Thành",
      description: "Bien Hoa, Amata and Nhon Trach industrial zones concentrate footwear, textiles, machinery, automotive & motorcycle components, chemicals and animal feed. Long Thanh International Airport (opening 2026) and Cai Mep port are within 40 km.",
      descriptionVi: "Các KCN Biên Hoà, Amata, Nhơn Trạch tập trung giày dép, dệt may, máy móc, linh kiện ô tô – xe máy, hoá chất và thức ăn chăn nuôi. Sân bay Long Thành (2026) và cảng Cái Mép trong bán kính 40 km.",
      majorIndustries: ["footwear", "machinery", "automotive-components", "textiles", "chemicals", "rubber"],
      keyFacts: { industrialParks: 32, majorPort: "Cai Mep-Thi Vai", airport: "Long Thanh (2026)" },
    },
  },
  {
    code: "BN", slug: "bac-ninh", name: "Bac Ninh", nameVi: "Bắc Ninh", region: "North",
    cluster: {
      headline: "Northern electronics powerhouse",
      headlineVi: "Cứ điểm điện tử của miền Bắc",
      description: "Home to global smartphone and display supply chains (Yen Phong, Que Vo, VSIP Bac Ninh), Bac Ninh hosts hundreds of tier-2/3 electronics, electrical equipment, precision plastics and packaging suppliers, 30 km from Hanoi and 110 km from Hai Phong port.",
      descriptionVi: "Nơi đặt chuỗi cung ứng điện thoại và màn hình toàn cầu (Yên Phong, Quế Võ, VSIP Bắc Ninh), Bắc Ninh có hàng trăm nhà cung cấp điện tử cấp 2/3, thiết bị điện, nhựa chính xác và bao bì, cách Hà Nội 30 km và cảng Hải Phòng 110 km.",
      majorIndustries: ["electronics", "electrical-equipment", "plastics", "packaging"],
      keyFacts: { industrialParks: 16, majorPort: "Hai Phong (110 km)", airport: "Noi Bai (HAN)" },
    },
  },
  {
    code: "HP", slug: "hai-phong", name: "Hai Phong", nameVi: "Hải Phòng", region: "North",
    cluster: {
      headline: "Northern gateway port with automotive and machinery clusters",
      headlineVi: "Cảng cửa ngõ miền Bắc với cụm ô tô và máy móc",
      description: "Lach Huyen deep-water port, DEEP C and VSIP Hai Phong zones. Strong in automotive assembly, machinery, electrical equipment, industrial equipment, tools, plastics and logistics services.",
      descriptionVi: "Cảng nước sâu Lạch Huyện, DEEP C và VSIP Hải Phòng. Mạnh về lắp ráp ô tô, máy móc, thiết bị điện, thiết bị công nghiệp, dụng cụ, nhựa và dịch vụ logistics.",
      majorIndustries: ["machinery", "automotive-components", "electrical-equipment", "industrial-equipment", "tools"],
      keyFacts: { industrialParks: 14, majorPort: "Lach Huyen (deep-water)", airport: "Cat Bi (HPH)" },
    },
  },
  {
    code: "HN", slug: "hanoi", name: "Hanoi", nameVi: "Hà Nội", region: "North",
    cluster: {
      headline: "Capital region: electronics, machinery and supporting industries",
      headlineVi: "Vùng thủ đô: điện tử, máy móc và công nghiệp hỗ trợ",
      description: "Thang Long, Quang Minh and Hoa Lac Hi-Tech Park host electronics, motorcycle components, industrial equipment, tools, spare parts and software services; strong engineering talent pool.",
      descriptionVi: "Thăng Long, Quang Minh và Khu CNC Hoà Lạc quy tụ điện tử, linh kiện xe máy, thiết bị công nghiệp, dụng cụ, phụ tùng và dịch vụ phần mềm; nguồn nhân lực kỹ thuật mạnh.",
      majorIndustries: ["electronics", "motorcycle-components", "industrial-equipment", "spare-parts", "industrial-services"],
      keyFacts: { industrialParks: 10, majorPort: "Hai Phong (120 km)", airport: "Noi Bai (HAN)" },
    },
  },
  {
    code: "DNG", slug: "da-nang", name: "Da Nang", nameVi: "Đà Nẵng", region: "Central",
    cluster: {
      headline: "Central Vietnam's industrial and logistics hub",
      headlineVi: "Trung tâm công nghiệp và logistics miền Trung",
      description: "Da Nang Hi-Tech Park and Hoa Khanh zone: precision mechanics, electronics, seafood processing, textiles and industrial services with Tien Sa / Lien Chieu ports.",
      descriptionVi: "Khu CNC Đà Nẵng và KCN Hoà Khánh: cơ khí chính xác, điện tử, chế biến thuỷ sản, dệt may và dịch vụ công nghiệp với cảng Tiên Sa / Liên Chiểu.",
      majorIndustries: ["machinery", "electronics", "food-processing", "textiles", "industrial-services"],
      keyFacts: { industrialParks: 6, majorPort: "Tien Sa / Lien Chieu", airport: "Da Nang (DAD)" },
    },
  },
  {
    code: "LA", slug: "long-an", name: "Long An", nameVi: "Long An", region: "South",
    cluster: {
      headline: "Mekong gateway for agriculture, food and packaging",
      headlineVi: "Cửa ngõ Mekong cho nông nghiệp, thực phẩm và bao bì",
      description: "Bordering HCMC, Long An combines rice, fruit and seafood processing with packaging, plastics, textiles and construction materials manufacturing.",
      descriptionVi: "Giáp TP.HCM, Long An kết hợp chế biến gạo, trái cây, thuỷ sản với sản xuất bao bì, nhựa, dệt may và vật liệu xây dựng.",
      majorIndustries: ["agriculture", "food-processing", "packaging", "plastics", "construction-materials"],
      keyFacts: { industrialParks: 35, majorPort: "Hiep Phuoc / Cat Lai", specialty: "Agri-food processing" },
    },
  },
  { code: "BR", slug: "ba-ria-vung-tau", name: "Ba Ria - Vung Tau", nameVi: "Bà Rịa - Vũng Tàu", region: "South" },
  { code: "TN", slug: "tay-ninh", name: "Tay Ninh", nameVi: "Tây Ninh", region: "South" },
  { code: "BG", slug: "bac-giang", name: "Bac Giang", nameVi: "Bắc Giang", region: "North" },
  { code: "VP", slug: "vinh-phuc", name: "Vinh Phuc", nameVi: "Vĩnh Phúc", region: "North" },
  { code: "HD", slug: "hai-duong", name: "Hai Duong", nameVi: "Hải Dương", region: "North" },
  { code: "HY", slug: "hung-yen", name: "Hung Yen", nameVi: "Hưng Yên", region: "North" },
  { code: "TB", slug: "thai-binh", name: "Thai Binh", nameVi: "Thái Bình", region: "North" },
  { code: "ND", slug: "nam-dinh", name: "Nam Dinh", nameVi: "Nam Định", region: "North" },
  { code: "QN", slug: "quang-ninh", name: "Quang Ninh", nameVi: "Quảng Ninh", region: "North" },
  { code: "TH", slug: "thanh-hoa", name: "Thanh Hoa", nameVi: "Thanh Hoá", region: "Central" },
  { code: "NA", slug: "nghe-an", name: "Nghe An", nameVi: "Nghệ An", region: "Central" },
  { code: "QNM", slug: "quang-nam", name: "Quang Nam", nameVi: "Quảng Nam", region: "Central" },
  { code: "BDH", slug: "binh-dinh", name: "Binh Dinh", nameVi: "Bình Định", region: "Central" },
  { code: "KH", slug: "khanh-hoa", name: "Khanh Hoa", nameVi: "Khánh Hoà", region: "Central" },
  { code: "LD", slug: "lam-dong", name: "Lam Dong", nameVi: "Lâm Đồng", region: "Central" },
  { code: "CT", slug: "can-tho", name: "Can Tho", nameVi: "Cần Thơ", region: "South" },
  { code: "TG", slug: "tien-giang", name: "Tien Giang", nameVi: "Tiền Giang", region: "South" },
  { code: "AG", slug: "an-giang", name: "An Giang", nameVi: "An Giang", region: "South" },
  { code: "BT", slug: "ben-tre", name: "Ben Tre", nameVi: "Bến Tre", region: "South" },
  { code: "BP", slug: "binh-phuoc", name: "Binh Phuoc", nameVi: "Bình Phước", region: "South" },
];

export const INDUSTRIES: Array<{ slug: string; name: string; nameVi: string; icon: string; description: string }> = [
  { slug: "apparel", name: "Apparel & Garments", nameVi: "May mặc", icon: "Shirt", description: "Knit and woven garments, uniforms, activewear, denim, private label fashion." },
  { slug: "textiles", name: "Textiles & Fabrics", nameVi: "Dệt & vải", icon: "Layers", description: "Yarn, knitted and woven fabrics, technical textiles, dyeing and finishing." },
  { slug: "footwear", name: "Footwear", nameVi: "Giày dép", icon: "Footprints", description: "Sports shoes, leather footwear, sandals, safety shoes and components." },
  { slug: "furniture", name: "Furniture & Wood", nameVi: "Nội thất & gỗ", icon: "Armchair", description: "Indoor and outdoor furniture, wood panels, rattan, hospitality projects." },
  { slug: "electronics", name: "Electronics", nameVi: "Điện tử", icon: "Cpu", description: "PCBA, consumer electronics, cables, IoT devices, EMS/OEM assembly." },
  { slug: "electrical-equipment", name: "Electrical Equipment", nameVi: "Thiết bị điện", icon: "Zap", description: "Wires and cables, switchgear, transformers, lighting, solar components." },
  { slug: "machinery", name: "Machinery", nameVi: "Máy móc", icon: "Cog", description: "Industrial machines, CNC parts, agricultural and food-processing machinery." },
  { slug: "industrial-equipment", name: "Industrial Equipment", nameVi: "Thiết bị công nghiệp", icon: "Factory", description: "Pumps, compressors, conveyors, steel structures, storage systems." },
  { slug: "automotive-components", name: "Automotive Components", nameVi: "Linh kiện ô tô", icon: "Car", description: "Stamped, machined and molded parts, wiring harnesses, EV components." },
  { slug: "motorcycle-components", name: "Motorcycle Components", nameVi: "Linh kiện xe máy", icon: "Bike", description: "Frames, castings, brakes, plastics and electrical parts for two-wheelers." },
  { slug: "plastics", name: "Plastics", nameVi: "Nhựa", icon: "Box", description: "Injection molding, extrusion, films, household plastics, technical parts." },
  { slug: "rubber", name: "Rubber", nameVi: "Cao su", icon: "CircleDot", description: "Natural rubber, gaskets, hoses, tires, molded rubber products." },
  { slug: "packaging", name: "Packaging", nameVi: "Bao bì", icon: "Package", description: "Corrugated boxes, flexible packaging, labels, glass and metal containers." },
  { slug: "construction-materials", name: "Construction Materials", nameVi: "Vật liệu xây dựng", icon: "BrickWall", description: "Tiles, cement, steel, stone, doors and windows, sanitary ware." },
  { slug: "agriculture", name: "Agriculture", nameVi: "Nông nghiệp", icon: "Wheat", description: "Coffee, cashew, pepper, rice, fruit, spices and agricultural inputs." },
  { slug: "food-processing", name: "Food & Beverage Processing", nameVi: "Chế biến thực phẩm", icon: "UtensilsCrossed", description: "Seafood, snacks, beverages, instant foods, private-label food products." },
  { slug: "household-goods", name: "Household Goods", nameVi: "Đồ gia dụng", icon: "Home", description: "Kitchenware, home textiles, décor, cleaning products, ceramics." },
  { slug: "cosmetics", name: "Cosmetics Manufacturing", nameVi: "Sản xuất mỹ phẩm", icon: "Sparkles", description: "Skincare, hair care, natural cosmetics, OEM/ODM beauty products." },
  { slug: "chemicals", name: "Chemicals", nameVi: "Hoá chất", icon: "FlaskConical", description: "Industrial chemicals, coatings, adhesives, fertilizers, cleaning agents." },
  { slug: "tools", name: "Tools & Hardware", nameVi: "Dụng cụ & ngũ kim", icon: "Wrench", description: "Hand tools, power tool accessories, fasteners, hardware fittings." },
  { slug: "spare-parts", name: "Spare Parts", nameVi: "Phụ tùng", icon: "Settings2", description: "Replacement parts for machinery, vehicles and equipment." },
  { slug: "light-industry", name: "Light Industry", nameVi: "Công nghiệp nhẹ", icon: "Feather", description: "Toys, stationery, bags & luggage, sporting goods, gifts and crafts." },
  { slug: "medium-industry", name: "Medium Industry", nameVi: "Công nghiệp vừa", icon: "Warehouse", description: "Metal fabrication, casting, forging, precision engineering." },
  { slug: "industrial-services", name: "Industrial Services", nameVi: "Dịch vụ công nghiệp", icon: "Briefcase", description: "Contract manufacturing, engineering, inspection, logistics and sourcing services." },
];

export type CategorySeed = { slug: string; name: string; nameVi: string; industry: string; icon?: string; featured?: boolean; children?: Array<{ slug: string; name: string; nameVi: string }> };

export const CATEGORIES: CategorySeed[] = [
  {
    slug: "apparel", name: "Apparel", nameVi: "May mặc", industry: "apparel", icon: "Shirt", featured: true,
    children: [
      { slug: "t-shirts-polos", name: "T-shirts & Polos", nameVi: "Áo thun & polo" },
      { slug: "activewear", name: "Activewear & Sportswear", nameVi: "Đồ thể thao" },
      { slug: "jackets-outerwear", name: "Jackets & Outerwear", nameVi: "Áo khoác" },
      { slug: "denim", name: "Denim & Jeans", nameVi: "Denim & jeans" },
      { slug: "uniforms-workwear", name: "Uniforms & Workwear", nameVi: "Đồng phục & bảo hộ" },
      { slug: "underwear-loungewear", name: "Underwear & Loungewear", nameVi: "Đồ lót & mặc nhà" },
      { slug: "childrenswear", name: "Childrenswear", nameVi: "Quần áo trẻ em" },
    ],
  },
  {
    slug: "textiles", name: "Textiles & Fabrics", nameVi: "Dệt & vải", industry: "textiles", icon: "Layers",
    children: [
      { slug: "knitted-fabrics", name: "Knitted Fabrics", nameVi: "Vải dệt kim" },
      { slug: "woven-fabrics", name: "Woven Fabrics", nameVi: "Vải dệt thoi" },
      { slug: "yarn-fibers", name: "Yarn & Fibers", nameVi: "Sợi" },
      { slug: "home-textiles", name: "Home Textiles", nameVi: "Vải gia dụng" },
      { slug: "technical-textiles", name: "Technical Textiles", nameVi: "Vải kỹ thuật" },
    ],
  },
  {
    slug: "bags-luggage", name: "Bags & Luggage", nameVi: "Túi xách & vali", industry: "light-industry", icon: "Backpack", featured: true,
    children: [
      { slug: "backpacks", name: "Backpacks", nameVi: "Ba lô" },
      { slug: "travel-luggage", name: "Travel Luggage", nameVi: "Vali du lịch" },
      { slug: "handbags-wallets", name: "Handbags & Wallets", nameVi: "Túi xách & ví" },
      { slug: "promotional-bags", name: "Promotional & Tote Bags", nameVi: "Túi quảng cáo & tote" },
    ],
  },
  {
    slug: "footwear", name: "Footwear", nameVi: "Giày dép", industry: "footwear", icon: "Footprints", featured: true,
    children: [
      { slug: "sports-shoes", name: "Sports Shoes", nameVi: "Giày thể thao" },
      { slug: "leather-shoes", name: "Leather Shoes", nameVi: "Giày da" },
      { slug: "sandals-slippers", name: "Sandals & Slippers", nameVi: "Sandal & dép" },
      { slug: "safety-footwear", name: "Safety Footwear", nameVi: "Giày bảo hộ" },
      { slug: "shoe-components", name: "Shoe Components", nameVi: "Linh kiện giày" },
    ],
  },
  {
    slug: "furniture", name: "Furniture", nameVi: "Nội thất", industry: "furniture", icon: "Armchair", featured: true,
    children: [
      { slug: "living-room-furniture", name: "Living Room Furniture", nameVi: "Nội thất phòng khách" },
      { slug: "bedroom-furniture", name: "Bedroom Furniture", nameVi: "Nội thất phòng ngủ" },
      { slug: "dining-furniture", name: "Dining Furniture", nameVi: "Bàn ghế ăn" },
      { slug: "outdoor-furniture", name: "Outdoor Furniture", nameVi: "Nội thất ngoài trời" },
      { slug: "office-furniture", name: "Office Furniture", nameVi: "Nội thất văn phòng" },
      { slug: "rattan-bamboo", name: "Rattan & Bamboo", nameVi: "Mây tre đan" },
      { slug: "wood-panels", name: "Wood Panels & Flooring", nameVi: "Ván gỗ & sàn" },
    ],
  },
  {
    slug: "electronics", name: "Electronics", nameVi: "Điện tử", industry: "electronics", icon: "Cpu", featured: true,
    children: [
      { slug: "pcb-pcba", name: "PCB & PCBA", nameVi: "Bo mạch & lắp ráp" },
      { slug: "consumer-electronics", name: "Consumer Electronics", nameVi: "Điện tử tiêu dùng" },
      { slug: "cables-connectors", name: "Cables & Connectors", nameVi: "Cáp & đầu nối" },
      { slug: "iot-devices", name: "IoT & Smart Devices", nameVi: "Thiết bị IoT" },
      { slug: "electronic-components", name: "Electronic Components", nameVi: "Linh kiện điện tử" },
      { slug: "ems-contract-manufacturing", name: "EMS / Contract Manufacturing", nameVi: "Gia công điện tử (EMS)" },
    ],
  },
  {
    slug: "electrical-equipment", name: "Electrical Equipment", nameVi: "Thiết bị điện", industry: "electrical-equipment", icon: "Zap",
    children: [
      { slug: "wires-cables", name: "Wires & Cables", nameVi: "Dây & cáp điện" },
      { slug: "lighting", name: "LED Lighting", nameVi: "Đèn LED" },
      { slug: "switchgear-panels", name: "Switchgear & Panels", nameVi: "Tủ điện & thiết bị đóng cắt" },
      { slug: "solar-components", name: "Solar & Energy Storage", nameVi: "Năng lượng mặt trời & lưu trữ" },
      { slug: "motors-transformers", name: "Motors & Transformers", nameVi: "Động cơ & biến áp" },
    ],
  },
  {
    slug: "machinery", name: "Machinery", nameVi: "Máy móc", industry: "machinery", icon: "Cog", featured: true,
    children: [
      { slug: "industrial-machinery", name: "Industrial Machinery", nameVi: "Máy công nghiệp" },
      { slug: "cnc-machined-parts", name: "CNC Machined Parts", nameVi: "Chi tiết gia công CNC" },
      { slug: "agricultural-machinery", name: "Agricultural Machinery", nameVi: "Máy nông nghiệp" },
      { slug: "food-processing-machinery", name: "Food Processing Machinery", nameVi: "Máy chế biến thực phẩm" },
      { slug: "packaging-machinery", name: "Packaging Machinery", nameVi: "Máy đóng gói" },
    ],
  },
  {
    slug: "industrial-equipment", name: "Industrial Equipment", nameVi: "Thiết bị công nghiệp", industry: "industrial-equipment", icon: "Factory",
    children: [
      { slug: "pumps-compressors", name: "Pumps & Compressors", nameVi: "Bơm & máy nén" },
      { slug: "conveyors-material-handling", name: "Conveyors & Material Handling", nameVi: "Băng tải & nâng hạ" },
      { slug: "steel-structures", name: "Steel Structures & Fabrication", nameVi: "Kết cấu thép" },
      { slug: "storage-racking", name: "Storage & Racking", nameVi: "Kệ kho" },
    ],
  },
  {
    slug: "automotive-motorcycle", name: "Automotive & Motorcycle Parts", nameVi: "Phụ tùng ô tô & xe máy", industry: "automotive-components", icon: "Car",
    children: [
      { slug: "stamped-metal-parts", name: "Stamped Metal Parts", nameVi: "Chi tiết dập" },
      { slug: "casting-forging", name: "Casting & Forging", nameVi: "Đúc & rèn" },
      { slug: "wiring-harnesses", name: "Wiring Harnesses", nameVi: "Bó dây điện" },
      { slug: "motorcycle-parts", name: "Motorcycle Parts", nameVi: "Phụ tùng xe máy" },
      { slug: "ev-components", name: "EV Components", nameVi: "Linh kiện xe điện" },
    ],
  },
  {
    slug: "plastics-rubber", name: "Plastics & Rubber", nameVi: "Nhựa & cao su", industry: "plastics", icon: "Box",
    children: [
      { slug: "injection-molding", name: "Injection Molded Parts", nameVi: "Ép nhựa" },
      { slug: "plastic-films-sheets", name: "Plastic Films & Sheets", nameVi: "Màng & tấm nhựa" },
      { slug: "household-plastics", name: "Household Plastics", nameVi: "Nhựa gia dụng" },
      { slug: "rubber-products", name: "Rubber Products", nameVi: "Sản phẩm cao su" },
      { slug: "molds-tooling", name: "Molds & Tooling", nameVi: "Khuôn mẫu" },
    ],
  },
  {
    slug: "packaging", name: "Packaging", nameVi: "Bao bì", industry: "packaging", icon: "Package", featured: true,
    children: [
      { slug: "corrugated-boxes", name: "Corrugated Boxes", nameVi: "Thùng carton" },
      { slug: "flexible-packaging", name: "Flexible Packaging", nameVi: "Bao bì mềm" },
      { slug: "paper-bags-labels", name: "Paper Bags & Labels", nameVi: "Túi giấy & nhãn" },
      { slug: "glass-metal-containers", name: "Glass & Metal Containers", nameVi: "Chai lọ & lon" },
      { slug: "eco-packaging", name: "Eco & Biodegradable Packaging", nameVi: "Bao bì sinh học" },
    ],
  },
  {
    slug: "construction-materials", name: "Construction Materials", nameVi: "Vật liệu xây dựng", industry: "construction-materials", icon: "BrickWall",
    children: [
      { slug: "tiles-stone", name: "Tiles & Stone", nameVi: "Gạch & đá" },
      { slug: "steel-products", name: "Steel Products", nameVi: "Sản phẩm thép" },
      { slug: "doors-windows", name: "Doors & Windows", nameVi: "Cửa" },
      { slug: "sanitary-ware", name: "Sanitary Ware", nameVi: "Thiết bị vệ sinh" },
      { slug: "cement-concrete", name: "Cement & Concrete Products", nameVi: "Xi măng & bê tông" },
    ],
  },
  {
    slug: "agriculture-food", name: "Agriculture & Food", nameVi: "Nông sản & thực phẩm", industry: "agriculture", icon: "Wheat", featured: true,
    children: [
      { slug: "coffee-tea", name: "Coffee & Tea", nameVi: "Cà phê & trà" },
      { slug: "nuts-spices", name: "Cashew, Pepper & Spices", nameVi: "Hạt điều, tiêu & gia vị" },
      { slug: "rice-grains", name: "Rice & Grains", nameVi: "Gạo & ngũ cốc" },
      { slug: "fruits-vegetables", name: "Fresh & Dried Fruits", nameVi: "Trái cây tươi & sấy" },
      { slug: "seafood", name: "Seafood", nameVi: "Thuỷ sản" },
      { slug: "processed-foods", name: "Processed Foods & Snacks", nameVi: "Thực phẩm chế biến" },
      { slug: "beverages", name: "Beverages", nameVi: "Đồ uống" },
    ],
  },
  {
    slug: "household-goods", name: "Household Goods", nameVi: "Đồ gia dụng", industry: "household-goods", icon: "Home",
    children: [
      { slug: "kitchenware", name: "Kitchenware", nameVi: "Đồ bếp" },
      { slug: "ceramics-tableware", name: "Ceramics & Tableware", nameVi: "Gốm sứ & bàn ăn" },
      { slug: "home-decor", name: "Home Décor & Handicrafts", nameVi: "Trang trí & thủ công" },
      { slug: "cleaning-products", name: "Cleaning Products", nameVi: "Sản phẩm vệ sinh" },
    ],
  },
  {
    slug: "beauty-personal-care", name: "Beauty & Personal Care", nameVi: "Mỹ phẩm & chăm sóc cá nhân", industry: "cosmetics", icon: "Sparkles",
    children: [
      { slug: "skincare", name: "Skincare", nameVi: "Chăm sóc da" },
      { slug: "hair-care", name: "Hair Care", nameVi: "Chăm sóc tóc" },
      { slug: "natural-cosmetics", name: "Natural & Organic Cosmetics", nameVi: "Mỹ phẩm thiên nhiên" },
      { slug: "cosmetic-packaging", name: "Cosmetic Packaging", nameVi: "Bao bì mỹ phẩm" },
    ],
  },
  {
    slug: "chemicals", name: "Chemicals", nameVi: "Hoá chất", industry: "chemicals", icon: "FlaskConical",
    children: [
      { slug: "industrial-chemicals", name: "Industrial Chemicals", nameVi: "Hoá chất công nghiệp" },
      { slug: "coatings-adhesives", name: "Coatings & Adhesives", nameVi: "Sơn & keo" },
      { slug: "fertilizers", name: "Fertilizers & Agro-chemicals", nameVi: "Phân bón & nông hoá" },
    ],
  },
  {
    slug: "tools-hardware", name: "Tools & Hardware", nameVi: "Dụng cụ & ngũ kim", industry: "tools", icon: "Wrench",
    children: [
      { slug: "hand-tools", name: "Hand Tools", nameVi: "Dụng cụ cầm tay" },
      { slug: "fasteners", name: "Fasteners", nameVi: "Bu lông, ốc vít" },
      { slug: "hardware-fittings", name: "Hardware & Fittings", nameVi: "Phụ kiện ngũ kim" },
      { slug: "spare-parts", name: "Spare Parts", nameVi: "Phụ tùng thay thế" },
    ],
  },
  {
    slug: "sporting-goods-toys", name: "Sporting Goods & Toys", nameVi: "Đồ thể thao & đồ chơi", industry: "light-industry", icon: "Dumbbell",
    children: [
      { slug: "fitness-equipment", name: "Fitness Equipment", nameVi: "Thiết bị thể hình" },
      { slug: "outdoor-camping", name: "Outdoor & Camping", nameVi: "Dã ngoại & cắm trại" },
      { slug: "toys-games", name: "Toys & Games", nameVi: "Đồ chơi" },
      { slug: "stationery-gifts", name: "Stationery & Gifts", nameVi: "Văn phòng phẩm & quà tặng" },
    ],
  },
  {
    slug: "industrial-services", name: "Industrial Services", nameVi: "Dịch vụ công nghiệp", industry: "industrial-services", icon: "Briefcase",
    children: [
      { slug: "contract-manufacturing", name: "Contract Manufacturing", nameVi: "Gia công theo hợp đồng" },
      { slug: "engineering-design", name: "Engineering & Design", nameVi: "Kỹ thuật & thiết kế" },
      { slug: "sourcing-agents", name: "Sourcing Agents", nameVi: "Đại lý tìm nguồn" },
      { slug: "metal-fabrication-services", name: "Metal Fabrication", nameVi: "Gia công kim loại" },
    ],
  },
];

export const CERTIFICATIONS: Array<{ code: string; name: string; category: string; issuingBody: string; description: string }> = [
  { code: "ISO9001", name: "ISO 9001", category: "quality", issuingBody: "ISO", description: "Quality management systems." },
  { code: "ISO14001", name: "ISO 14001", category: "environmental", issuingBody: "ISO", description: "Environmental management systems." },
  { code: "ISO45001", name: "ISO 45001", category: "social", issuingBody: "ISO", description: "Occupational health and safety." },
  { code: "ISO13485", name: "ISO 13485", category: "quality", issuingBody: "ISO", description: "Medical devices quality management." },
  { code: "IATF16949", name: "IATF 16949", category: "quality", issuingBody: "IATF", description: "Automotive quality management." },
  { code: "BSCI", name: "amfori BSCI", category: "social", issuingBody: "amfori", description: "Social compliance audit for supply chains." },
  { code: "SEDEX", name: "Sedex SMETA", category: "social", issuingBody: "Sedex", description: "Ethical trade audit." },
  { code: "WRAP", name: "WRAP", category: "social", issuingBody: "WRAP", description: "Worldwide Responsible Accredited Production (apparel)." },
  { code: "SA8000", name: "SA8000", category: "social", issuingBody: "SAI", description: "Social accountability standard." },
  { code: "OEKO_TEX", name: "OEKO-TEX Standard 100", category: "product-safety", issuingBody: "OEKO-TEX", description: "Textiles tested for harmful substances." },
  { code: "GOTS", name: "GOTS", category: "environmental", issuingBody: "Global Standard", description: "Global Organic Textile Standard." },
  { code: "GRS", name: "GRS", category: "environmental", issuingBody: "Textile Exchange", description: "Global Recycled Standard." },
  { code: "FSC", name: "FSC", category: "environmental", issuingBody: "Forest Stewardship Council", description: "Responsibly sourced wood." },
  { code: "BRC", name: "BRCGS Food", category: "product-safety", issuingBody: "BRCGS", description: "Global food safety standard." },
  { code: "HACCP", name: "HACCP", category: "product-safety", issuingBody: "Codex", description: "Hazard analysis food safety." },
  { code: "ISO22000", name: "ISO 22000", category: "product-safety", issuingBody: "ISO", description: "Food safety management." },
  { code: "FDA", name: "FDA Registration", category: "product-safety", issuingBody: "US FDA", description: "US food/cosmetics facility registration." },
  { code: "HALAL", name: "Halal", category: "product-safety", issuingBody: "Halal certification bodies", description: "Halal-compliant production." },
  { code: "CE", name: "CE Marking", category: "product-safety", issuingBody: "EU", description: "European conformity." },
  { code: "UL", name: "UL Listed", category: "product-safety", issuingBody: "UL", description: "Electrical product safety." },
  { code: "ROHS", name: "RoHS", category: "product-safety", issuingBody: "EU", description: "Restriction of hazardous substances." },
  { code: "REACH", name: "REACH", category: "product-safety", issuingBody: "EU", description: "Chemical safety compliance." },
  { code: "GMP", name: "GMP", category: "quality", issuingBody: "Various", description: "Good manufacturing practice (cosmetics/pharma/food)." },
  { code: "ISO22716", name: "ISO 22716", category: "quality", issuingBody: "ISO", description: "Cosmetics good manufacturing practice." },
  { code: "GLOBALGAP", name: "GlobalG.A.P.", category: "product-safety", issuingBody: "GlobalG.A.P.", description: "Good agricultural practices." },
  { code: "ORGANIC_EU", name: "EU Organic", category: "environmental", issuingBody: "EU", description: "Organic certification." },
  { code: "CARB2", name: "CARB Phase 2 / TSCA Title VI", category: "product-safety", issuingBody: "CARB / EPA", description: "Formaldehyde emissions for wood products." },
  { code: "BIFMA", name: "BIFMA", category: "product-safety", issuingBody: "BIFMA", description: "Office furniture safety and durability." },
  { code: "CTPAT", name: "C-TPAT", category: "social", issuingBody: "US CBP", description: "Supply chain security." },
  { code: "ISCC", name: "ISCC PLUS", category: "environmental", issuingBody: "ISCC", description: "Sustainable and circular materials." },
];
