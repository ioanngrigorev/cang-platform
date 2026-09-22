/** Eight buyer ↔ supplier conversations. Times are hours ago (larger = older). */

export type MessageSeed =
  | { from: "BUYER" | "SUPPLIER"; type?: "TEXT"; body: string; hoursAgo: number; lang?: "en" | "vi" }
  | { from: "SUPPLIER"; type: "QUOTATION"; body: string; quotation: string; hoursAgo: number }
  | { from: "BUYER"; type: "COUNTER_OFFER"; body: string; unitPrice: number; quantity: number; note: string; hoursAgo: number }
  | { from: "BUYER" | "SUPPLIER"; type: "FILE"; body: string; file: { name: string; type: "SPECIFICATION" | "DRAWING" | "PHOTO" | "OTHER"; sizeBytes: number }; hoursAgo: number }
  | { from: "SYSTEM"; type: "SYSTEM"; body: string; payload: Record<string, unknown>; hoursAgo: number };

export type ConversationSeed = {
  key: string;
  buyer: string;
  supplier: string;
  context: "PRODUCT" | "RFQ" | "QUOTATION" | "ORDER";
  /** key of the product slug / rfq key / quotation key / order key the conversation is attached to */
  ref: string;
  subject: string;
  buyerReadHoursAgo: number;
  supplierReadHoursAgo: number;
  messages: MessageSeed[];
};

export const CONVERSATIONS: ConversationSeed[] = [
  {
    key: "nordwind-saigonpack-backpacks",
    buyer: "nordwind-outdoor",
    supplier: "saigon-pack-manufacturing",
    context: "RFQ",
    ref: "nordwind-backpacks",
    subject: "RFQ: 20,000 hiking backpacks 30–40 L — Nordwind SS27",
    buyerReadHoursAgo: 2,
    supplierReadHoursAgo: 5,
    messages: [
      { from: "SYSTEM", type: "SYSTEM", hoursAgo: 140, body: "Saigon Pack Manufacturing was invited to quote on RFQ “20,000 hiking backpacks 30–40 L, recycled polyester, private label, CIF Hamburg”.", payload: { event: "RFQ_INVITATION", rfqKey: "nordwind-backpacks" } },
      { from: "SUPPLIER", hoursAgo: 136, body: "Dear Ms Hartmann, thank you for the invitation. We have produced similar 30 L and 40 L packs for two Scandinavian brands and hold GRS scope for 600D recycled polyester. Could you share the tech packs so our pattern room can review the back-panel construction before we quote?" },
      { from: "BUYER", type: "FILE", hoursAgo: 132, body: "Tech packs for both styles attached (NW-SS27-DP30 and NW-SS27-TP40), including Pantone references and the packing manual.", file: { name: "Nordwind_SS27_Backpack_TechPacks_v3.pdf", type: "SPECIFICATION", sizeBytes: 4823119 } },
      { from: "SUPPLIER", hoursAgo: 120, body: "Received, thank you. Two questions from our pattern team: (1) the 40 L lid — do you want it floating with a rear tie-down, or fixed? (2) The hip belt zip pockets on the tech pack are 15 cm; we can do 17 cm to fit a large phone at no extra cost. We will submit the quotation tomorrow." },
      { from: "BUYER", hoursAgo: 112, body: "Floating lid please, with a rear tie-down. 17 cm pockets are welcome. Please also state your available capacity for October–November production." },
      { from: "SUPPLIER", type: "QUOTATION", hoursAgo: 96, body: "Quotation submitted: US$248,400 CIF Hamburg for both styles, 55 days after PP-sample approval. Capacity confirmed for an October slot on two dedicated lines.", quotation: "sp-backpacks-v1" },
      { from: "BUYER", type: "COUNTER_OFFER", hoursAgo: 70, body: "Thank you for the detailed quotation. Your construction proposal is the strongest we received, but the 40 L price is above our target. If you can come to US$12.75 on the 40 L and US$9.95 on the 30 L we are ready to sign a 12-month framework with two further drops.", unitPrice: 12.75, quantity: 12000, note: "Framework: 3 drops over 12 months, same specs; 30 L at US$9.95" },
      { from: "SUPPLIER", hoursAgo: 62, body: "Understood. We spoke with Formosa this morning and can book their GRS 600D at a better rate for a 12-month commitment. We will revise the quotation to your target on both styles, with a 1% discount if confirmed within 14 days. Lead time improves to 50 days because the fabric slot is already reserved." },
      { from: "SUPPLIER", type: "QUOTATION", hoursAgo: 48, body: "Revised quotation (rev. 2) submitted: US$237,074 CIF Hamburg, 50 days, framework terms included.", quotation: "sp-backpacks-v2" },
      { from: "BUYER", hoursAgo: 26, body: "Received — we are reviewing rev. 2 with our finance team this week. Please send the PP-sample schedule and confirm the colour continuity approach between the two styles (same fabric lot for both?)." },
      { from: "SUPPLIER", hoursAgo: 5, body: "PP samples in both styles and three colourways can ship on 6 October by DHL. Yes, both styles will be cut from the same dyed fabric lot per colour, and we will send lab dips plus a fabric swatch card with the samples. Looking forward to your decision." },
    ],
  },
  {
    key: "nordwind-danang-jackets",
    buyer: "nordwind-outdoor",
    supplier: "da-nang-outdoor-gear",
    context: "ORDER",
    ref: "nordwind-rain-jackets-completed",
    subject: "Order: 5,000 packable rain jackets",
    buyerReadHoursAgo: 900,
    supplierReadHoursAgo: 950,
    messages: [
      { from: "SYSTEM", type: "SYSTEM", hoursAgo: 3300, body: "Order created from quotation. Trade Assurance enabled: funds held by the licensed payment partner until delivery.", payload: { event: "ORDER_CREATED" } },
      { from: "SUPPLIER", hoursAgo: 3200, body: "Deposit received, thank you. Fabric is in the warehouse and cutting starts Monday. We will post weekly photos here." },
      { from: "SUPPLIER", type: "FILE", hoursAgo: 2500, body: "Week 3 update: 60% sewn. Seam-tape test results for lot 1 attached.", file: { name: "DNOG_SeamTape_Lot1_Report.pdf", type: "OTHER", sizeBytes: 812004 } },
      { from: "BUYER", hoursAgo: 2480, body: "Thanks — results look good. Please remember the reflective transfer on the back must be centred 8 cm below the collar seam, as on the approved sample." },
      { from: "SUPPLIER", hoursAgo: 2050, body: "Production finished and packed: 250 cartons. LCL booking confirmed on HAMBURG EXPRESS, cut-off is three days later than planned because of the consolidator — we will keep you posted." },
      { from: "BUYER", hoursAgo: 1100, body: "Goods received in Hamburg and checked. Great quality — order completed and review posted. Let's talk about the AW27 order in October." },
    ],
  },
  {
    key: "trailhead-bienhoa-product",
    buyer: "trailhead-supply-co",
    supplier: "bien-hoa-footwear",
    context: "PRODUCT",
    ref: "trail-running-shoe-vibram-style-outsole",
    subject: "Trail running shoe — gen 3 development",
    buyerReadHoursAgo: 30,
    supplierReadHoursAgo: 20,
    messages: [
      { from: "BUYER", hoursAgo: 220, body: "Hi Huong, we are planning gen 3 of the trail shoe on the same TR-02 last. Main change is a 6 mm drop instead of 8 mm and a slightly stickier outsole compound. Is the current outsole mould reusable if we change the compound?" },
      { from: "SUPPLIER", hoursAgo: 196, body: "Hi Marcus, yes — the outsole mould stays, only the compound changes; our rubber supplier has a 55 Shore A grip compound we used for a climbing-approach shoe. The drop change means a new midsole mould (about US$3,800 per size run, amortisable)." },
      { from: "BUYER", hoursAgo: 150, body: "Understood. Please send two pairs of the 55 Shore A compound in US 9 for testing on our home trails. We have posted the RFQ for the 8,000-pair run so you can quote formally." },
      { from: "SUPPLIER", hoursAgo: 120, body: "Samples ship Thursday by DHL. Quotation submitted on the RFQ with tooling amortised over 8,000 pairs." },
      { from: "BUYER", hoursAgo: 30, body: "Samples arrived — grip is noticeably better on wet rock. We will review the quotation with the team next week." },
    ],
  },
  {
    key: "harbour-truongan-order",
    buyer: "harbour-finch-retail",
    supplier: "truong-an-wood-furniture",
    context: "ORDER",
    ref: "harbour-dining-shipping",
    subject: "Order: 400 acacia dining sets — shipping",
    buyerReadHoursAgo: 12,
    supplierReadHoursAgo: 8,
    messages: [
      { from: "SUPPLIER", hoursAgo: 460, body: "Pre-shipment inspection by VQC completed today: PASS, one cosmetic defect in 200 sampled pieces (a lacquer run on a chair leg, replaced). Report uploaded to the order." },
      { from: "BUYER", hoursAgo: 440, body: "Excellent, thank you. Please go ahead with loading. Remind the forwarder that the B/L consignee is Harbour & Finch Retail Ltd, not the DC operator." },
      { from: "SUPPLIER", hoursAgo: 360, body: "All five containers loaded and sealed at the factory; trucked to Cat Lai this morning. Container numbers and seal photos uploaded." },
      { from: "SYSTEM", type: "SYSTEM", hoursAgo: 336, body: "Shipment departed Cat Lai on ONE COMMITMENT 034W. ETA Southampton in 30 days.", payload: { event: "SHIPMENT_DEPARTED", vessel: "ONE COMMITMENT / 034W" } },
      { from: "BUYER", hoursAgo: 290, body: "Balance payment of US$107,564.80 released against the B/L copy — you should see it in Trade Assurance now." },
      { from: "SUPPLIER", hoursAgo: 280, body: "Confirmed, thank you. Certificate of origin (UKVFTA) and packing lists are in the documents tab. Vessel is currently transshipping in Singapore." },
      { from: "BUYER", hoursAgo: 12, body: "Tracking shows the vessel left Singapore. Our DC is booked for unloading on the ETA week; please send the arrival notice when the forwarder issues it." },
    ],
  },
  {
    key: "kanto-taynguyen-coffee",
    buyer: "kanto-sourcing",
    supplier: "tay-nguyen-coffee-export",
    context: "QUOTATION",
    ref: "tn-coffee",
    subject: "Quotation: Robusta S16/S18, 2 × 20 ft CIF Yokohama",
    buyerReadHoursAgo: 6,
    supplierReadHoursAgo: 3,
    messages: [
      { from: "BUYER", hoursAgo: 44, body: "Matsumoto here. Thank you for the quotation. Our roaster asks whether the S18 lot can be from the Bao Loc washing station specifically, as last year's lot cupped very cleanly. Also, can you hold the price for 15 days instead of 10 while the L/C… sorry, the D/P paperwork is prepared?" },
      { from: "SUPPLIER", hoursAgo: 40, body: "Yes, the S18 container will be from Bao Loc station, same processing as last year. We can hold the price for 15 days if you confirm interest by Friday, as the London contract is volatile this month." },
      { from: "BUYER", hoursAgo: 28, body: "Confirmed interest. Please courier the pre-shipment samples (500 g each) to our Tokyo lab; address is on our company profile." },
      { from: "SUPPLIER", type: "FILE", hoursAgo: 20, body: "Samples dispatched by DHL today, tracking attached, along with the moisture and defect report for both lots.", file: { name: "TNC_Preshipment_Samples_S16_S18.pdf", type: "OTHER", sizeBytes: 402118 } },
      { from: "BUYER", hoursAgo: 6, body: "Received the tracking. Cupping is scheduled for Monday; we will accept the quotation on the platform if the lots pass." },
    ],
  },
  {
    key: "southern-guardian-boots",
    buyer: "southern-cross-distribution",
    supplier: "guardian-safety-footwear",
    context: "RFQ",
    ref: "southern-cross-safety-boots",
    subject: "RFQ: S3 boots and S1P trainers — AS/NZS certification",
    buyerReadHoursAgo: 50,
    supplierReadHoursAgo: 48,
    messages: [
      { from: "BUYER", hoursAgo: 150, body: "Thanks for quoting. Before we shortlist: do you already hold an AS/NZS 2210.3 report for the S3 boot, or would this be a new test? Our retailers will not list without it." },
      { from: "SUPPLIER", hoursAgo: 140, body: "We hold EN ISO 20345:2022 type-test reports from a European notified body for both styles. The AS/NZS 2210.3 test would be new; we have included it in the price and SAI Global quoted five weeks, which fits the 50-day lead time." },
      { from: "BUYER", hoursAgo: 96, body: "Good. Please send size-run samples in AU 8 and AU 11 for both styles so our safety team can check fit against the local market." },
      { from: "SUPPLIER", hoursAgo: 48, body: "Four pairs of samples dispatched yesterday, arriving Melbourne in four days. Sample invoice uploaded; the cost is deductible from the first order." },
    ],
  },
  {
    key: "harbour-phoenix-dispute",
    buyer: "harbour-finch-retail",
    supplier: "phoenix-activewear",
    context: "ORDER",
    ref: "harbour-leggings-disputed",
    subject: "Order: 6,000 leggings — Sage colourway quality issue",
    buyerReadHoursAgo: 20,
    supplierReadHoursAgo: 15,
    messages: [
      { from: "BUYER", hoursAgo: 240, body: "Goods have arrived at our DC. Black and Espresso look fine. On Sage we see colour migration onto the waistband lining and softer elastic on a large share of the lot. Our QA is documenting; we will raise this formally." },
      { from: "SUPPLIER", hoursAgo: 230, body: "Sorry to hear this. Please send photos and carton numbers so we can trace the dye lot. We keep retained samples per lot and will test immediately." },
      { from: "BUYER", type: "FILE", hoursAgo: 216, body: "QA report HF-QA-2609 attached with photos, measurements and carton numbers. Dispute opened on the platform.", file: { name: "HF-QA-2609_Sage_Leggings.pdf", type: "PHOTO", sizeBytes: 6120544 } },
      { from: "SYSTEM", type: "SYSTEM", hoursAgo: 215, body: "A dispute was opened on this order (QUALITY). The balance payment is on hold under Trade Assurance until resolution.", payload: { event: "DISPUTE_OPENED", type: "QUALITY" } },
      { from: "SUPPLIER", hoursAgo: 170, body: "Traced: 1,500 pieces of Sage came from a second dye batch. Retained samples show colour fastness grade 3 versus grade 4 on the approved batch. We accept responsibility for the migration issue. On elastic tension our records show the same lot, so we propose an independent test before deciding." },
      { from: "BUYER", hoursAgo: 20, body: "Appreciated. We are open to a replacement of the affected 1,400 units at your cost plus an independent elastic test. Let's settle the proposal through the dispute mediation." },
    ],
  },
  {
    key: "hoanggia-brightviet-product",
    buyer: "hoang-gia-industrial-supply",
    supplier: "brightviet-led-lighting",
    context: "PRODUCT",
    ref: "led-linear-trunking-system-1-5m",
    subject: "Hệ đèn LED thanh ray cho kho logistics Bắc Ninh",
    buyerReadHoursAgo: 3,
    supplierReadHoursAgo: 1,
    messages: [
      { from: "BUYER", lang: "vi", hoursAgo: 80, body: "Chào anh Dũng, Hoàng Gia đang báo giá cho một kho logistics 12.000 m² ở KCN Quế Võ. Hệ thanh ray 1,5 m của BrightViet có mô-đun khẩn cấp tích hợp không, và thời gian giao cho 1.200 mô-đun là bao lâu?" },
      { from: "SUPPLIER", lang: "vi", hoursAgo: 72, body: "Chào anh Nam, có ạ — mô-đun khẩn cấp 3 giờ cắm chung ray, tỷ lệ 1/10 theo TCVN. 1.200 mô-đun giao trong 30 ngày sau đặt cọc; chúng tôi có thể hỗ trợ tính toán DIALux nếu anh gửi bản vẽ mặt bằng." },
      { from: "BUYER", type: "FILE", hoursAgo: 60, body: "Gửi anh bản vẽ mặt bằng kho và độ cao lắp 9 m. Nhờ bên anh tính toán với 300 lux trung bình.", file: { name: "QueVo_Warehouse_Layout_A1.pdf", type: "DRAWING", sizeBytes: 2210876 } },
      { from: "SUPPLIER", lang: "vi", hoursAgo: 30, body: "Đã nhận bản vẽ. Kết quả DIALux: 1.140 mô-đun 60 W quang học 60 độ đạt 312 lux trung bình, độ đồng đều 0,6. File tính toán và báo giá sẽ gửi qua RFQ nếu anh tạo trên hệ thống để hai bên dùng Bảo đảm giao dịch." },
      { from: "BUYER", lang: "vi", hoursAgo: 3, body: "Tốt quá, cảm ơn anh. Tôi sẽ tạo RFQ trong tuần này sau khi khách chốt tiến độ thi công." },
    ],
  },
];
