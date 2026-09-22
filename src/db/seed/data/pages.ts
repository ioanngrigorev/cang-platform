/** CMS pages (markdown) in English and Vietnamese, plus homepage banners. */

export type PageSeed = {
  slug: string;
  type: "PAGE" | "GUIDE" | "LEGAL";
  sortOrder: number;
  en: { title: string; excerpt: string; seoTitle: string; seoDescription: string; content: string };
  vi: { title: string; excerpt: string; seoTitle: string; seoDescription: string; content: string };
};

export const PAGES: PageSeed[] = [
  {
    slug: "buyer-guide",
    type: "GUIDE",
    sortOrder: 1,
    en: {
      title: "Buyer's guide: sourcing from Vietnam on CANG",
      excerpt: "How to find verified manufacturers, run an RFQ, compare quotations and pay safely with Trade Assurance.",
      seoTitle: "How to source from Vietnamese manufacturers — CANG buyer's guide",
      seoDescription: "Step-by-step guide for international buyers: finding verified factories in Vietnam, posting an RFQ, comparing quotations, samples, Trade Assurance payments, inspection and shipping.",
      content: `# Buyer's guide: sourcing from Vietnam on CANG

Vietnam is now the second-largest exporter of apparel and footwear in the world, the fastest-growing furniture and electronics assembly base in Southeast Asia and a competitive origin for packaging, plastics, machinery and food. Free-trade agreements with the EU (EVFTA), the CPTPP countries, the UK (UKVFTA) and the RCEP bloc remove or reduce import duties on most product groups. This guide walks through a complete sourcing project on CANG, from the first search to a delivered container.

## 1. Define what you need before you search

The best quotations come from precise requests. Before you contact a factory, prepare:

* **Product specification** — a tech pack, drawing or a clear reference sample with materials, dimensions, tolerances and finish.
* **Quantity and frequency** — a first order of 5,000 pieces with three repeat drops is a different conversation from a one-off 500-piece run.
* **Compliance** — the certifications your market requires (for example GRS, OEKO-TEX and BSCI for apparel sold in Europe; CE and RoHS for electronics; FDA and HACCP for food).
* **Delivery** — the destination port or warehouse, the incoterm you prefer (FOB, CIF or DAP are the most common) and the date the goods must arrive.
* **Budget** — a realistic target price. Vietnamese factories quote honestly against a target; an unrealistic one just filters out the good suppliers.

## 2. Find suppliers

Use the **Manufacturers** directory to filter by industry, province, certification and badge. Every profile shows the factory size, production lines, annual capacity, main equipment and export markets that the supplier declared during onboarding. Look for these signals:

* **Verified Manufacturer** — CANG has checked the business registration, tax code and factory ownership.
* **Factory Audited** — an on-site audit (by CANG or a third party) was completed in the last 24 months.
* **Export Ready** — documented shipments to at least three countries and accepted international payment terms.
* **Fast Response** — the supplier answers 90% of inquiries within 24 hours.
* **Top Supplier** — a rating of 4.7 or higher from at least ten reviews, with no open disputes.

Reviews marked **verified purchase** come from orders completed through the platform, so they reflect real transactions.

## 3. Post an RFQ

If you know exactly what you want, post a request for quotation. An RFQ on CANG holds your specification, quantity, target price, destination, incoterm, deadline and compliance requirements in one place, and it is automatically matched to suppliers with the right products and industry. You can also invite specific factories from their profile page. Public RFQs are visible to all verified suppliers; choose **invited only** if the project is confidential.

Attach tech packs, drawings and packaging manuals directly to the RFQ conversation. Suppliers reply with structured quotations that include unit prices per line item, MOQ, lead time, incoterm, shipping cost, payment terms and validity. Use the comparison view to line quotations up side by side and add private notes for your team.

## 4. Samples and negotiation

Ask for samples before you commit. Most factories charge a sample fee that is credited against the first order and ship within 7–15 days by courier. Use the chat to negotiate: suppliers can revise their quotation, and every revision is kept so you can see what changed. A counter-offer sent from the conversation is recorded as part of the negotiation history.

## 5. Order and pay with Trade Assurance

Accepting a quotation creates a purchase order with the agreed items, terms and delivery date. When **Trade Assurance** is enabled, your deposit and balance payments are transferred to a segregated account at a licensed Vietnamese partner bank — CANG never holds your money. Funds are released to the supplier only when the milestone conditions are met: for example, after the goods are shipped and the bill of lading is uploaded, or after you confirm delivery. If something goes wrong, you can open a dispute within the inspection window and a CANG mediator will work with both parties.

## 6. Inspection and shipping

Book a pre-shipment inspection from the order page. Partner inspection agencies check quantity, workmanship, packaging and labelling against your specification using AQL sampling, and upload the report to the order within 24 hours. For logistics, request quotes from partner forwarders for sea, air or rail freight, customs brokerage and insurance, or use your own forwarder if you buy FOB. Every shipment shows milestone tracking from factory pickup to delivery.

## 7. After delivery

Confirm delivery, release the balance and leave a review. Your feedback helps other buyers and improves the supplier's ranking. Repeat orders can be placed directly from a completed order with the same specifications.

## Common questions

**What are typical payment terms?** 30% deposit and 70% before shipment or against a copy of the bill of lading. Some factories accept L/C at sight for larger programmes.

**How long does production take?** 30–60 days after sample approval for most consumer goods; longer for furniture programmes and machinery.

**Can I visit the factory?** Yes — most verified manufacturers offer factory tours and video calls from the production floor.

**Which documents do I need to import?** Commercial invoice, packing list, bill of lading or airway bill and a certificate of origin (EUR.1 for the EU, Form AJ for Japan, and so on) to claim preferential duty. See our guide on Vietnamese export documents.`,
    },
    vi: {
      title: "Hướng dẫn người mua: tìm nguồn hàng từ Việt Nam trên CANG",
      excerpt: "Cách tìm nhà sản xuất đã xác minh, đăng RFQ, so sánh báo giá và thanh toán an toàn với Bảo đảm giao dịch.",
      seoTitle: "Hướng dẫn tìm nguồn hàng từ nhà sản xuất Việt Nam — CANG",
      seoDescription: "Hướng dẫn từng bước cho người mua quốc tế: tìm nhà máy đã xác minh tại Việt Nam, đăng RFQ, so sánh báo giá, mẫu, thanh toán Bảo đảm giao dịch, kiểm định và vận chuyển.",
      content: `# Hướng dẫn người mua: tìm nguồn hàng từ Việt Nam trên CANG

Việt Nam hiện là nước xuất khẩu may mặc và giày dép lớn thứ hai thế giới, là cứ điểm lắp ráp điện tử và sản xuất nội thất tăng trưởng nhanh nhất Đông Nam Á, đồng thời là nguồn cung cạnh tranh cho bao bì, nhựa, máy móc và thực phẩm. Các hiệp định thương mại tự do với EU (EVFTA), các nước CPTPP, Anh (UKVFTA) và khối RCEP xoá bỏ hoặc giảm thuế nhập khẩu với hầu hết nhóm hàng. Hướng dẫn này đi qua một dự án tìm nguồn hàng hoàn chỉnh trên CANG, từ lần tìm kiếm đầu tiên tới container được giao.

## 1. Xác định nhu cầu trước khi tìm kiếm

Báo giá tốt nhất đến từ yêu cầu rõ ràng. Trước khi liên hệ nhà máy, hãy chuẩn bị:

* **Quy cách sản phẩm** — tech pack, bản vẽ hoặc mẫu tham chiếu rõ ràng với vật liệu, kích thước, dung sai và hoàn thiện.
* **Số lượng và tần suất** — đơn đầu 5.000 chiếc với ba đợt lặp lại là câu chuyện khác với một lô 500 chiếc.
* **Tuân thủ** — chứng nhận thị trường của bạn yêu cầu (ví dụ GRS, OEKO-TEX và BSCI cho may mặc bán tại châu Âu; CE và RoHS cho điện tử; FDA và HACCP cho thực phẩm).
* **Giao hàng** — cảng đích hoặc kho, điều kiện Incoterm ưa thích (FOB, CIF hoặc DAP là phổ biến nhất) và ngày hàng phải đến.
* **Ngân sách** — giá mục tiêu thực tế. Nhà máy Việt Nam báo giá thẳng thắn theo mục tiêu; mục tiêu phi thực tế chỉ khiến các nhà cung cấp tốt bỏ qua.

## 2. Tìm nhà cung cấp

Dùng danh bạ **Nhà sản xuất** để lọc theo ngành, tỉnh thành, chứng nhận và huy hiệu. Mỗi hồ sơ hiển thị diện tích nhà máy, số dây chuyền, công suất năm, thiết bị chính và thị trường xuất khẩu mà nhà cung cấp khai báo khi đăng ký. Hãy chú ý các tín hiệu sau:

* **Nhà sản xuất đã xác minh** — CANG đã kiểm tra đăng ký kinh doanh, mã số thuế và quyền sở hữu nhà máy.
* **Nhà máy đã kiểm định** — đã hoàn thành kiểm định tại chỗ (bởi CANG hoặc bên thứ ba) trong 24 tháng gần nhất.
* **Sẵn sàng xuất khẩu** — có hồ sơ giao hàng tới ít nhất ba quốc gia và chấp nhận điều khoản thanh toán quốc tế.
* **Phản hồi nhanh** — trả lời 90% yêu cầu trong 24 giờ.
* **Nhà cung cấp hàng đầu** — đánh giá từ 4,7 trở lên với ít nhất mười nhận xét và không có tranh chấp mở.

Nhận xét gắn nhãn **đã mua hàng** đến từ đơn hàng hoàn tất qua nền tảng nên phản ánh giao dịch thật.

## 3. Đăng RFQ

Nếu bạn biết chính xác mình cần gì, hãy đăng yêu cầu báo giá. RFQ trên CANG gom quy cách, số lượng, giá mục tiêu, nơi đến, Incoterm, hạn chót và yêu cầu tuân thủ vào một nơi, và được tự động ghép với các nhà cung cấp có sản phẩm và ngành phù hợp. Bạn cũng có thể mời nhà máy cụ thể từ trang hồ sơ của họ. RFQ công khai hiển thị với mọi nhà cung cấp đã xác minh; chọn **chỉ mời** nếu dự án cần bảo mật.

Đính kèm tech pack, bản vẽ và hướng dẫn đóng gói trực tiếp vào cuộc trò chuyện của RFQ. Nhà cung cấp trả lời bằng báo giá có cấu trúc gồm đơn giá theo từng dòng, MOQ, thời gian giao, Incoterm, phí vận chuyển, điều khoản thanh toán và hiệu lực. Dùng chế độ so sánh để đặt các báo giá cạnh nhau và thêm ghi chú riêng cho nhóm của bạn.

## 4. Mẫu và thương lượng

Hãy yêu cầu mẫu trước khi cam kết. Hầu hết nhà máy tính phí mẫu được khấu trừ vào đơn hàng đầu và gửi trong 7–15 ngày bằng chuyển phát nhanh. Dùng chat để thương lượng: nhà cung cấp có thể sửa báo giá, và mọi bản sửa được lưu lại để bạn thấy điều gì đã thay đổi. Đề nghị giá đối ứng gửi từ cuộc trò chuyện được ghi vào lịch sử thương lượng.

## 5. Đặt hàng và thanh toán với Bảo đảm giao dịch

Chấp nhận báo giá sẽ tạo đơn đặt hàng với các mặt hàng, điều khoản và ngày giao đã thoả thuận. Khi bật **Bảo đảm giao dịch**, tiền cọc và tiền còn lại được chuyển vào tài khoản tách biệt tại ngân hàng đối tác có giấy phép ở Việt Nam — CANG không bao giờ giữ tiền của bạn. Tiền chỉ được giải ngân cho nhà cung cấp khi đạt điều kiện mốc: ví dụ sau khi hàng đã xuất và vận đơn được tải lên, hoặc sau khi bạn xác nhận nhận hàng. Nếu có vấn đề, bạn có thể mở tranh chấp trong thời hạn kiểm tra và hoà giải viên của CANG sẽ làm việc với cả hai bên.

## 6. Kiểm định và vận chuyển

Đặt kiểm định trước khi xuất hàng ngay trên trang đơn hàng. Các tổ chức kiểm định đối tác kiểm tra số lượng, tay nghề, đóng gói và nhãn mác theo quy cách của bạn bằng lấy mẫu AQL, và tải báo cáo lên đơn hàng trong 24 giờ. Về logistics, yêu cầu báo giá từ các công ty giao nhận đối tác cho đường biển, hàng không hoặc đường sắt, khai thuê hải quan và bảo hiểm, hoặc dùng đơn vị giao nhận của bạn nếu mua FOB. Mỗi lô hàng hiển thị theo dõi mốc từ lấy hàng tại nhà máy tới giao hàng.

## 7. Sau khi nhận hàng

Xác nhận nhận hàng, giải ngân phần còn lại và để lại nhận xét. Phản hồi của bạn giúp người mua khác và cải thiện xếp hạng của nhà cung cấp. Đơn hàng lặp lại có thể đặt trực tiếp từ đơn đã hoàn tất với cùng quy cách.

## Câu hỏi thường gặp

**Điều khoản thanh toán thông thường?** Cọc 30% và 70% trước khi xuất hàng hoặc khi có bản sao vận đơn. Một số nhà máy chấp nhận L/C trả ngay cho chương trình lớn.

**Sản xuất mất bao lâu?** 30–60 ngày sau khi duyệt mẫu với hầu hết hàng tiêu dùng; lâu hơn với chương trình nội thất và máy móc.

**Tôi có thể thăm nhà máy không?** Có — hầu hết nhà sản xuất đã xác minh đều nhận tham quan nhà máy và gọi video từ xưởng.

**Cần chứng từ gì để nhập khẩu?** Hoá đơn thương mại, phiếu đóng gói, vận đơn đường biển hoặc hàng không và giấy chứng nhận xuất xứ (EUR.1 cho EU, Form AJ cho Nhật Bản, v.v.) để hưởng thuế ưu đãi. Xem hướng dẫn về chứng từ xuất khẩu Việt Nam của chúng tôi.`,
    },
  },
  {
    slug: "supplier-guide",
    type: "GUIDE",
    sortOrder: 2,
    en: {
      title: "Supplier's guide: winning international buyers on CANG",
      excerpt: "Build a profile that converts, respond to RFQs like a pro and get paid safely through Trade Assurance.",
      seoTitle: "Supplier's guide — how Vietnamese manufacturers win buyers on CANG",
      seoDescription: "A practical guide for Vietnamese factories: complete your profile, get verified, list products that rank, quote RFQs competitively and deliver orders with Trade Assurance.",
      content: `# Supplier's guide: winning international buyers on CANG

International buyers come to CANG to find factories they can trust with a programme worth tens or hundreds of thousands of dollars. They decide in minutes whether your profile deserves an inquiry. This guide explains what those buyers look for and how to use every tool on the platform to turn a view into an order.

## 1. Complete your company profile — all of it

Profiles with a complete manufacturer section receive four times more inquiries than profiles with only a name and a logo. Fill in:

* **Factory facts** — address, floor area, production lines, annual capacity, main equipment and materials. Buyers use these to judge whether you can handle their volume.
* **Capabilities** — OEM, ODM, private label, minimum order value, lead time and sample lead time.
* **Export experience** — the countries you have shipped to, your main markets, export percentage and years of experience. The Export Ready badge is granted automatically once you document three or more export countries and accepted incoterms.
* **Certifications** — upload each certificate with its number and expiry date; CANG verifies them and shows them on your profile and products.
* **Photos and video** — real photos of your lines, warehouse and QC area. Stock images reduce trust immediately.
* **Bilingual text** — write your description in English and Vietnamese. Buyers read the English version; the Vietnamese version helps domestic customers and our support team.

## 2. Get verified

Verification is the single biggest driver of buyer confidence. Submit your business registration, tax code and factory documents from the **Verification** page; most applications are reviewed within three working days. Verified manufacturers receive the badge, rank higher in search and are eligible for Trade Assurance orders. A factory audit — on site, by CANG or a partner agency — adds the Factory Audited badge and is included in the Verified Manufacturer plan.

## 3. List products that rank

Search on CANG is driven by product listings. A good listing has:

* a specific title with the product type, key material and main feature — "35L Recycled Polyester Hiking Backpack with Rain Cover" beats "Backpack";
* 3–5 real photos on a clean background plus one in-use photo;
* a description that states construction, materials, specifications, MOQ, lead time, sample policy, packaging and shipping port;
* tiered prices — buyers compare unit price at 500, 1,000 and 5,000 pieces;
* variants (colours, sizes), specifications and the certifications that apply to the product;
* keywords buyers actually search for, in English.

List every product family you produce. Buyers who search for "cycling bib shorts" will never find a factory that only lists "activewear".

## 4. Respond to RFQs quickly and completely

Matching RFQs appear in your dashboard and you are notified immediately. Response speed matters: buyers usually shortlist within 48 hours, and the Fast Response badge (90% of inquiries answered within 24 hours) is one of the first things they look for.

When you quote:

* price every line item the buyer listed, in the currency and incoterm requested;
* state MOQ, lead time, payment terms and validity clearly;
* mention what is included (tooling, testing, certificates, inspection access) so your quote is not compared unfairly with a cheaper, incomplete one;
* add a short note about relevant experience — "we produced 40,000 similar packs for a Scandinavian brand in 2025" — and offer samples.

If the buyer sends a counter-offer, revise your quotation on the platform rather than in email; the revision history protects both sides.

## 5. Deliver orders through Trade Assurance

When a buyer accepts your quotation, an order is created with a payment schedule (typically 30% deposit, 70% before shipment). Buyer funds are held by a licensed Vietnamese partner bank and released to you when milestones are met — you are protected against non-payment, the buyer is protected against non-delivery. Update the order status as you go (production, quality inspection, shipping), upload the packing list, invoice and bill of lading, and answer questions in the order conversation. Orders completed through the platform generate verified reviews and count towards the Top Supplier badge.

## 6. Use the services that help you grow

* **Financing** — verified manufacturers with orders on the platform can apply for production financing from partner banks; the order and payment history is your credit file.
* **Logistics** — partner forwarders quote FOB-to-door shipping for your buyers, which makes CIF and DAP quotations easy.
* **Advertising** — featured product and top-search placements put your listings in front of buyers in your category.
* **Analytics** — track profile views, product views, leads and RFQs by day and by country in your dashboard.

## 7. Plans

The **Free** plan lets you list 20 products and respond to 10 RFQs per month. **Pro** adds 200 products, priority RFQ access, advanced analytics and included business verification. **Verified Manufacturer** adds unlimited products, an on-site factory audit, premium profile features, lead generation and API access. Commission on Trade Assurance orders is charged on a tiered scale and shown before you accept an order.

## Checklist before you start

1. Profile 100% complete in English and Vietnamese.
2. Verification submitted.
3. At least ten products listed with photos, tiers and specifications.
4. Notifications enabled on your phone so RFQs are answered within 24 hours.
5. Sample policy and export documents ready.`,
    },
    vi: {
      title: "Hướng dẫn nhà cung cấp: chinh phục người mua quốc tế trên CANG",
      excerpt: "Xây hồ sơ chuyển đổi tốt, trả lời RFQ chuyên nghiệp và nhận thanh toán an toàn qua Bảo đảm giao dịch.",
      seoTitle: "Hướng dẫn nhà cung cấp — nhà sản xuất Việt Nam chinh phục người mua trên CANG",
      seoDescription: "Hướng dẫn thực tế cho nhà máy Việt Nam: hoàn thiện hồ sơ, xác minh, đăng sản phẩm dễ tìm, báo giá RFQ cạnh tranh và giao đơn hàng với Bảo đảm giao dịch.",
      content: `# Hướng dẫn nhà cung cấp: chinh phục người mua quốc tế trên CANG

Người mua quốc tế đến CANG để tìm nhà máy có thể tin tưởng giao chương trình trị giá hàng chục hoặc hàng trăm nghìn đô la. Họ quyết định trong vài phút xem hồ sơ của bạn có đáng để gửi yêu cầu hay không. Hướng dẫn này giải thích người mua tìm gì và cách dùng mọi công cụ trên nền tảng để biến một lượt xem thành đơn hàng.

## 1. Hoàn thiện hồ sơ công ty — đầy đủ

Hồ sơ có phần nhà sản xuất hoàn chỉnh nhận được nhiều yêu cầu gấp bốn lần hồ sơ chỉ có tên và logo. Hãy điền:

* **Thông tin nhà máy** — địa chỉ, diện tích, số dây chuyền, công suất năm, thiết bị và nguyên liệu chính. Người mua dùng chúng để đánh giá bạn có kham nổi sản lượng của họ không.
* **Năng lực** — OEM, ODM, nhãn riêng, giá trị đơn tối thiểu, thời gian sản xuất và thời gian làm mẫu.
* **Kinh nghiệm xuất khẩu** — các nước đã giao hàng, thị trường chính, tỷ lệ xuất khẩu và số năm kinh nghiệm. Huy hiệu Sẵn sàng xuất khẩu được cấp tự động khi bạn khai báo từ ba nước xuất khẩu trở lên và điều kiện Incoterm chấp nhận.
* **Chứng nhận** — tải lên từng chứng chỉ kèm số và ngày hết hạn; CANG xác minh và hiển thị chúng trên hồ sơ và sản phẩm của bạn.
* **Ảnh và video** — ảnh thật của dây chuyền, kho và khu QC. Ảnh stock làm giảm niềm tin ngay lập tức.
* **Nội dung song ngữ** — viết mô tả bằng tiếng Anh và tiếng Việt. Người mua đọc bản tiếng Anh; bản tiếng Việt giúp khách trong nước và đội hỗ trợ của chúng tôi.

## 2. Xác minh doanh nghiệp

Xác minh là yếu tố lớn nhất tạo niềm tin cho người mua. Gửi đăng ký kinh doanh, mã số thuế và hồ sơ nhà máy từ trang **Xác minh**; hầu hết hồ sơ được xét duyệt trong ba ngày làm việc. Nhà sản xuất đã xác minh nhận huy hiệu, xếp hạng cao hơn trong tìm kiếm và đủ điều kiện nhận đơn hàng Bảo đảm giao dịch. Kiểm định nhà máy — tại chỗ, bởi CANG hoặc tổ chức đối tác — bổ sung huy hiệu Nhà máy đã kiểm định và nằm trong gói Nhà sản xuất Xác minh.

## 3. Đăng sản phẩm dễ được tìm thấy

Tìm kiếm trên CANG dựa vào tin đăng sản phẩm. Một tin đăng tốt có:

* tiêu đề cụ thể với loại sản phẩm, vật liệu chính và tính năng nổi bật — "Ba lô leo núi 35L polyester tái chế kèm áo mưa" tốt hơn "Ba lô";
* 3–5 ảnh thật trên nền sạch và một ảnh sử dụng thực tế;
* mô tả nêu cấu trúc, vật liệu, thông số, MOQ, thời gian giao, chính sách mẫu, đóng gói và cảng xuất;
* giá theo bậc — người mua so sánh đơn giá ở 500, 1.000 và 5.000 chiếc;
* biến thể (màu, cỡ), thông số và chứng nhận áp dụng cho sản phẩm;
* từ khoá người mua thực sự tìm, bằng tiếng Anh.

Hãy đăng mọi dòng sản phẩm bạn sản xuất. Người mua tìm "cycling bib shorts" sẽ không bao giờ thấy nhà máy chỉ đăng "activewear".

## 4. Trả lời RFQ nhanh và đầy đủ

RFQ phù hợp xuất hiện trong bảng điều khiển và bạn được thông báo ngay. Tốc độ phản hồi rất quan trọng: người mua thường chốt danh sách ngắn trong 48 giờ, và huy hiệu Phản hồi nhanh (90% yêu cầu được trả lời trong 24 giờ) là một trong những thứ đầu tiên họ nhìn.

Khi báo giá:

* báo giá từng dòng hàng người mua liệt kê, theo đúng đồng tiền và Incoterm yêu cầu;
* nêu rõ MOQ, thời gian sản xuất, điều khoản thanh toán và hiệu lực;
* nói rõ những gì đã bao gồm (khuôn, thử nghiệm, chứng chỉ, cho phép kiểm định) để báo giá của bạn không bị so sánh bất công với báo giá rẻ hơn nhưng thiếu;
* thêm ghi chú ngắn về kinh nghiệm liên quan — "chúng tôi đã sản xuất 40.000 ba lô tương tự cho một thương hiệu Bắc Âu năm 2025" — và đề nghị gửi mẫu.

Nếu người mua gửi đề nghị đối ứng, hãy sửa báo giá trên nền tảng thay vì qua email; lịch sử sửa đổi bảo vệ cả hai bên.

## 5. Giao đơn hàng qua Bảo đảm giao dịch

Khi người mua chấp nhận báo giá, đơn hàng được tạo với lịch thanh toán (thường cọc 30%, 70% trước khi xuất). Tiền của người mua được giữ tại ngân hàng đối tác có giấy phép ở Việt Nam và giải ngân cho bạn khi đạt mốc — bạn được bảo vệ khỏi rủi ro không thanh toán, người mua được bảo vệ khỏi rủi ro không giao hàng. Cập nhật trạng thái đơn hàng theo tiến độ (sản xuất, kiểm định, vận chuyển), tải lên phiếu đóng gói, hoá đơn và vận đơn, và trả lời câu hỏi trong cuộc trò chuyện của đơn hàng. Đơn hoàn tất qua nền tảng tạo nhận xét đã xác minh và được tính cho huy hiệu Nhà cung cấp hàng đầu.

## 6. Dùng các dịch vụ giúp bạn phát triển

* **Tài chính** — nhà sản xuất đã xác minh có đơn hàng trên nền tảng có thể xin tài trợ sản xuất từ ngân hàng đối tác; lịch sử đơn hàng và thanh toán chính là hồ sơ tín dụng của bạn.
* **Logistics** — công ty giao nhận đối tác báo giá vận chuyển từ FOB tới tận kho cho người mua của bạn, giúp báo giá CIF và DAP dễ dàng.
* **Quảng cáo** — vị trí sản phẩm nổi bật và đầu trang tìm kiếm đưa tin đăng của bạn tới người mua trong ngành.
* **Phân tích** — theo dõi lượt xem hồ sơ, lượt xem sản phẩm, khách tiềm năng và RFQ theo ngày và theo quốc gia trong bảng điều khiển.

## 7. Gói dịch vụ

Gói **Miễn phí** cho phép đăng 20 sản phẩm và trả lời 10 RFQ mỗi tháng. Gói **Pro** thêm 200 sản phẩm, ưu tiên tiếp cận RFQ, phân tích nâng cao và xác minh doanh nghiệp. Gói **Nhà sản xuất Xác minh** thêm sản phẩm không giới hạn, kiểm định nhà máy tại chỗ, tính năng hồ sơ cao cấp, tạo khách tiềm năng và truy cập API. Hoa hồng trên đơn hàng Bảo đảm giao dịch tính theo bậc và hiển thị trước khi bạn chấp nhận đơn.

## Danh sách kiểm tra trước khi bắt đầu

1. Hồ sơ hoàn thiện 100% bằng tiếng Anh và tiếng Việt.
2. Đã gửi hồ sơ xác minh.
3. Ít nhất mười sản phẩm với ảnh, bậc giá và thông số.
4. Bật thông báo trên điện thoại để trả lời RFQ trong 24 giờ.
5. Chính sách mẫu và chứng từ xuất khẩu sẵn sàng.`,
    },
  },
  {
    slug: "incoterms-explained",
    type: "GUIDE",
    sortOrder: 3,
    en: {
      title: "Incoterms explained for Vietnam sourcing",
      excerpt: "EXW, FOB, CIF, DAP and DDP: who pays for what, where risk transfers, and which term to choose for your first order.",
      seoTitle: "Incoterms 2020 explained for buyers sourcing from Vietnam",
      seoDescription: "What EXW, FCA, FOB, CFR, CIF, DAP and DDP mean when you buy from a Vietnamese factory, with cost and risk tables and practical recommendations.",
      content: `# Incoterms explained for Vietnam sourcing

Incoterms are the eleven standard trade terms published by the International Chamber of Commerce (Incoterms 2020). They define who arranges and pays for transport, insurance and customs, and the exact point where the risk of loss passes from seller to buyer. Every quotation on CANG states its incoterm, so you can compare offers on a like-for-like basis.

## The terms you will see most often

| Term | Seller delivers when… | Seller pays | Buyer pays |
|---|---|---|---|
| **EXW** (Ex Works) | goods are made available at the factory | packing | loading, export clearance, all transport, import |
| **FCA** (Free Carrier) | goods are handed to the buyer's carrier at a named place | export clearance, delivery to carrier | main carriage, insurance, import |
| **FOB** (Free On Board) | goods are loaded on the vessel at the port of shipment | export clearance, port charges, loading | ocean freight, insurance, import |
| **CFR** (Cost and Freight) | goods are on board; seller books and pays ocean freight | freight to destination port | insurance, import, on-carriage |
| **CIF** (Cost, Insurance and Freight) | as CFR plus minimum insurance | freight + insurance | import, on-carriage |
| **DAP** (Delivered At Place) | goods arrive at the named place, not unloaded | all transport to destination | import duties and taxes, unloading |
| **DDP** (Delivered Duty Paid) | goods arrive cleared at the named place | everything including import duty | unloading only |

Note that under CFR and CIF the **risk** passes when the goods are on board in Vietnam even though the seller pays the freight — insurance matters.

## Which term should you use?

**First order, you have a forwarder:** ask for **FOB Cat Lai** (southern factories), **FOB Hai Phong** (northern factories) or **FOB Da Nang** (central). You control freight cost and can consolidate with other suppliers. Most Vietnamese exporters are comfortable with FOB and quote port charges included.

**You want one price to your port:** ask for **CIF** or **CFR** to your destination port. Compare the freight element with a forwarder's quote; in volatile freight markets a seller's CIF price may include a safety margin.

**You want door delivery without handling import:** ask for **DAP** to your warehouse. You still pay import duty and VAT in your country. **DDP** is rare for Vietnamese factories because it requires them to act as importer in your country; use it only with an experienced exporter or a logistics partner.

**Samples and small air shipments:** **FCA** at the factory or the airport is practical; the courier account can be yours.

## Vietnam specifics

* The main container ports are Cat Lai and Cai Mep-Thi Vai (south), Hai Phong / Lach Huyen (north) and Da Nang / Tien Sa (centre). Quote the specific port on FOB terms.
* Export clearance is fast (usually same day) once the commercial invoice, packing list and, where applicable, certificate of origin are in place.
* Preferential duty under EVFTA, UKVFTA, CPTPP or RCEP depends on a certificate or statement of origin issued in Vietnam — request it in the RFQ regardless of the incoterm.
* Cargo insurance from partner providers on CANG can be added to any term; it is included at 110% of invoice value under CIF by default.

## Reading a quotation on CANG

Every quotation shows: unit prices, subtotal, shipping cost, discount, total, incoterm and shipping method. A "CIF Hamburg — 2 × 40HQ" quotation therefore already contains ocean freight and insurance; an "FOB Cat Lai" quotation does not. Use the logistics request tool to obtain freight quotes so you can compare an FOB offer with a CIF one accurately.`,
    },
    vi: {
      title: "Giải thích Incoterms khi mua hàng từ Việt Nam",
      excerpt: "EXW, FOB, CIF, DAP và DDP: ai trả chi phí gì, rủi ro chuyển giao ở đâu, và nên chọn điều kiện nào cho đơn hàng đầu tiên.",
      seoTitle: "Giải thích Incoterms 2020 cho người mua hàng từ Việt Nam",
      seoDescription: "EXW, FCA, FOB, CFR, CIF, DAP và DDP nghĩa là gì khi mua từ nhà máy Việt Nam, kèm bảng chi phí – rủi ro và khuyến nghị thực tế.",
      content: `# Giải thích Incoterms khi mua hàng từ Việt Nam

Incoterms là mười một điều kiện thương mại tiêu chuẩn do Phòng Thương mại Quốc tế ban hành (Incoterms 2020). Chúng quy định ai thu xếp và trả tiền vận chuyển, bảo hiểm và thủ tục hải quan, và điểm chính xác rủi ro mất mát chuyển từ người bán sang người mua. Mọi báo giá trên CANG đều ghi Incoterm để bạn so sánh các chào giá trên cùng cơ sở.

## Các điều kiện thường gặp nhất

| Điều kiện | Người bán giao hàng khi… | Người bán trả | Người mua trả |
|---|---|---|---|
| **EXW** (Giao tại xưởng) | hàng sẵn sàng tại nhà máy | đóng gói | bốc hàng, thủ tục xuất khẩu, toàn bộ vận chuyển, nhập khẩu |
| **FCA** (Giao cho người chuyên chở) | hàng được giao cho người chuyên chở của người mua tại địa điểm chỉ định | thủ tục xuất khẩu, giao tới người chuyên chở | vận tải chính, bảo hiểm, nhập khẩu |
| **FOB** (Giao lên tàu) | hàng được xếp lên tàu tại cảng đi | thủ tục xuất khẩu, phí cảng, bốc xếp | cước biển, bảo hiểm, nhập khẩu |
| **CFR** (Tiền hàng và cước) | hàng lên tàu; người bán đặt và trả cước biển | cước tới cảng đích | bảo hiểm, nhập khẩu, vận chuyển nội địa |
| **CIF** (Tiền hàng, bảo hiểm và cước) | như CFR cộng bảo hiểm tối thiểu | cước + bảo hiểm | nhập khẩu, vận chuyển nội địa |
| **DAP** (Giao tại nơi đến) | hàng tới địa điểm chỉ định, chưa dỡ | toàn bộ vận chuyển tới nơi đến | thuế nhập khẩu, dỡ hàng |
| **DDP** (Giao đã nộp thuế) | hàng tới nơi chỉ định đã thông quan | mọi thứ kể cả thuế nhập khẩu | chỉ dỡ hàng |

Lưu ý với CFR và CIF, **rủi ro** chuyển giao khi hàng lên tàu tại Việt Nam dù người bán trả cước — bảo hiểm rất quan trọng.

## Nên dùng điều kiện nào?

**Đơn đầu tiên, bạn có đơn vị giao nhận:** yêu cầu **FOB Cát Lái** (nhà máy phía Nam), **FOB Hải Phòng** (phía Bắc) hoặc **FOB Đà Nẵng** (miền Trung). Bạn kiểm soát chi phí cước và có thể gom hàng với nhà cung cấp khác. Hầu hết nhà xuất khẩu Việt Nam quen với FOB và báo giá đã gồm phí cảng.

**Bạn muốn một giá tới cảng của mình:** yêu cầu **CIF** hoặc **CFR** tới cảng đích. So sánh phần cước với báo giá của đơn vị giao nhận; khi thị trường cước biến động, giá CIF của người bán có thể gồm biên an toàn.

**Bạn muốn giao tận kho mà không lo nhập khẩu:** yêu cầu **DAP** tới kho của bạn. Bạn vẫn trả thuế nhập khẩu và VAT ở nước mình. **DDP** hiếm gặp với nhà máy Việt Nam vì đòi hỏi họ làm nhà nhập khẩu tại nước bạn; chỉ dùng với nhà xuất khẩu giàu kinh nghiệm hoặc đối tác logistics.

**Mẫu và lô hàng không nhỏ:** **FCA** tại nhà máy hoặc sân bay là thực tế; có thể dùng tài khoản chuyển phát của bạn.

## Đặc thù Việt Nam

* Các cảng container chính là Cát Lái và Cái Mép – Thị Vải (Nam), Hải Phòng / Lạch Huyện (Bắc) và Đà Nẵng / Tiên Sa (Trung). Ghi rõ cảng cụ thể khi dùng FOB.
* Thủ tục xuất khẩu nhanh (thường trong ngày) khi có hoá đơn thương mại, phiếu đóng gói và, nếu cần, giấy chứng nhận xuất xứ.
* Thuế ưu đãi theo EVFTA, UKVFTA, CPTPP hoặc RCEP phụ thuộc vào chứng nhận hoặc tự chứng nhận xuất xứ cấp tại Việt Nam — hãy yêu cầu trong RFQ bất kể Incoterm.
* Bảo hiểm hàng hoá từ đối tác trên CANG có thể thêm vào mọi điều kiện; mặc định gồm 110% giá trị hoá đơn với CIF.

## Đọc báo giá trên CANG

Mỗi báo giá hiển thị: đơn giá, tổng phụ, phí vận chuyển, chiết khấu, tổng, Incoterm và phương thức vận chuyển. Báo giá "CIF Hamburg — 2 × 40HQ" đã gồm cước biển và bảo hiểm; báo giá "FOB Cát Lái" thì chưa. Dùng công cụ yêu cầu logistics để lấy báo giá cước và so sánh chính xác chào giá FOB với CIF.`,
    },
  },
  {
    slug: "vietnam-export-documents",
    type: "GUIDE",
    sortOrder: 4,
    en: {
      title: "Vietnam export documents: what your shipment needs",
      excerpt: "Commercial invoice, packing list, bill of lading, certificate of origin and the product-specific certificates that get your container cleared.",
      seoTitle: "Export documents from Vietnam — checklist for importers",
      seoDescription: "The documents a Vietnamese exporter provides for sea and air shipments, how to claim EVFTA, CPTPP, UKVFTA and RCEP preferential duty, and which product certificates customs may ask for.",
      content: `# Vietnam export documents: what your shipment needs

Customs clearance is rarely the problem when you import from Vietnam — missing or inconsistent paperwork is. This checklist lists the documents a Vietnamese supplier provides for a typical order, what each one is for and where it is uploaded on CANG.

## Core commercial documents

**Commercial invoice** — issued by the exporter with buyer and seller details, incoterm, currency, unit prices, totals, HS codes and the order or contract number. Customs value is based on it. On CANG a proforma invoice is issued when the order is confirmed and the commercial invoice when the goods ship; both appear in the order's documents.

**Packing list** — carton-by-carton breakdown with quantities, net and gross weights, dimensions and carton marks. It must match the invoice and the physical shipment; inspection agencies check it during pre-shipment inspection.

**Bill of lading (B/L) or airway bill (AWB)** — the transport document issued by the carrier or forwarder. For sea freight, an original or telex-released B/L is needed to collect the container; under "70% against copy of B/L" terms, the balance payment is released when the copy is uploaded to the order.

**Certificate of origin (C/O)** — proves Vietnamese origin and unlocks preferential duty:

* **EUR.1** or a statement of origin on the invoice (for consignments under €6,000) for the EU under **EVFTA**;
* **EUR.1 (UK)** for the United Kingdom under **UKVFTA**;
* **Form CPTPP** self-certification for Canada, Japan, Australia, Mexico and other CPTPP members;
* **Form RCEP** for China, Korea, Japan, ASEAN, Australia and New Zealand;
* **Form AJ** (Vietnam–Japan) and **Form AK** (ASEAN–Korea) remain in use for those markets;
* **Form B** (non-preferential) for other destinations.

C/Os are issued by the Ministry of Industry and Trade or VCCI; the supplier applies after the goods are exported and typically has the document within 2–3 working days. Ask for the C/O in your RFQ so the factory plans for it.

## Product-specific documents

Depending on the product and destination, customs or your importer of record may also require:

* **Phytosanitary certificate** (coffee, rice, cashew, fresh produce) and **fumigation certificate** for wooden packaging or wood products;
* **Health certificate** issued by NAFIQPM for seafood and food, plus a **catch certificate** for wild fish;
* **Test reports and declarations of conformity** — CE (EU), UKCA (UK), FCC (US), PSE (Japan) for electrical and electronic goods; EN 71 for toys; REACH statements for chemicals and coated textiles;
* **Material safety data sheets (SDS)** for chemicals, batteries (with UN38.3 test summary) and coatings;
* **FSC chain-of-custody** documents for wood and paper products, and **EUDR** due-diligence data for the EU from 2026;
* **Lacey Act** declaration (US) for wood products.

## Insurance and inspection

An **insurance certificate** covers goods in transit; under CIF it is issued by the seller for 110% of invoice value. A **pre-shipment inspection report** from a partner agency is not a customs document, but many buyers require it before releasing the balance payment.

## How documents flow on CANG

1. The order is confirmed → proforma invoice issued.
2. Goods ready → inspection report uploaded (if booked).
3. Goods shipped → commercial invoice, packing list and B/L copy uploaded; balance released per the payment terms.
4. After sailing → certificate of origin and product certificates uploaded.
5. Delivery → buyer confirms receipt; documents remain available for audit.

All documents are shared with the counterparty only, stored with the order and downloadable by both companies' authorised users.`,
    },
    vi: {
      title: "Chứng từ xuất khẩu Việt Nam: lô hàng của bạn cần gì",
      excerpt: "Hoá đơn thương mại, phiếu đóng gói, vận đơn, giấy chứng nhận xuất xứ và các chứng nhận theo sản phẩm giúp container thông quan.",
      seoTitle: "Chứng từ xuất khẩu từ Việt Nam — danh sách kiểm tra cho nhà nhập khẩu",
      seoDescription: "Các chứng từ nhà xuất khẩu Việt Nam cung cấp cho hàng đường biển và hàng không, cách hưởng thuế ưu đãi EVFTA, CPTPP, UKVFTA và RCEP, và các chứng nhận sản phẩm hải quan có thể yêu cầu.",
      content: `# Chứng từ xuất khẩu Việt Nam: lô hàng của bạn cần gì

Thông quan hiếm khi là vấn đề khi nhập khẩu từ Việt Nam — giấy tờ thiếu hoặc không nhất quán mới là vấn đề. Danh sách này liệt kê các chứng từ nhà cung cấp Việt Nam cung cấp cho một đơn hàng thông thường, mục đích của từng loại và nơi chúng được tải lên trên CANG.

## Chứng từ thương mại cốt lõi

**Hoá đơn thương mại** — do nhà xuất khẩu phát hành với thông tin người mua và người bán, Incoterm, đồng tiền, đơn giá, tổng, mã HS và số đơn hàng hoặc hợp đồng. Trị giá hải quan dựa trên đó. Trên CANG, hoá đơn chiếu lệ được phát hành khi đơn hàng được xác nhận và hoá đơn thương mại khi hàng xuất; cả hai xuất hiện trong mục chứng từ của đơn.

**Phiếu đóng gói** — chi tiết từng thùng với số lượng, trọng lượng tịnh và cả bì, kích thước và ký mã hiệu. Phải khớp với hoá đơn và hàng thực tế; tổ chức kiểm định kiểm tra trong lúc kiểm định trước khi xuất.

**Vận đơn đường biển (B/L) hoặc vận đơn hàng không (AWB)** — chứng từ vận tải do hãng tàu hoặc đơn vị giao nhận phát hành. Với đường biển, cần B/L gốc hoặc điện giao hàng để nhận container; với điều khoản "70% khi có bản sao B/L", phần thanh toán còn lại được giải ngân khi bản sao được tải lên đơn hàng.

**Giấy chứng nhận xuất xứ (C/O)** — chứng minh xuất xứ Việt Nam và mở khoá thuế ưu đãi:

* **EUR.1** hoặc tự chứng nhận xuất xứ trên hoá đơn (lô hàng dưới 6.000 €) cho EU theo **EVFTA**;
* **EUR.1 (UK)** cho Anh theo **UKVFTA**;
* **Mẫu CPTPP** tự chứng nhận cho Canada, Nhật Bản, Úc, Mexico và các thành viên CPTPP khác;
* **Mẫu RCEP** cho Trung Quốc, Hàn Quốc, Nhật Bản, ASEAN, Úc và New Zealand;
* **Mẫu AJ** (Việt Nam – Nhật Bản) và **Mẫu AK** (ASEAN – Hàn Quốc) vẫn dùng cho các thị trường này;
* **Mẫu B** (không ưu đãi) cho các điểm đến khác.

C/O do Bộ Công Thương hoặc VCCI cấp; nhà cung cấp nộp hồ sơ sau khi hàng xuất và thường có trong 2–3 ngày làm việc. Hãy yêu cầu C/O trong RFQ để nhà máy chuẩn bị.

## Chứng từ theo sản phẩm

Tuỳ sản phẩm và điểm đến, hải quan hoặc nhà nhập khẩu đứng tên có thể yêu cầu thêm:

* **Giấy kiểm dịch thực vật** (cà phê, gạo, điều, nông sản tươi) và **giấy hun trùng** cho bao bì gỗ hoặc sản phẩm gỗ;
* **Giấy chứng nhận y tế** do NAFIQPM cấp cho thuỷ sản và thực phẩm, cùng **giấy chứng nhận khai thác** cho cá đánh bắt tự nhiên;
* **Báo cáo thử nghiệm và tuyên bố phù hợp** — CE (EU), UKCA (Anh), FCC (Mỹ), PSE (Nhật) cho hàng điện – điện tử; EN 71 cho đồ chơi; tuyên bố REACH cho hoá chất và vải tráng phủ;
* **Phiếu an toàn hoá chất (SDS)** cho hoá chất, pin (kèm tóm tắt thử nghiệm UN38.3) và sơn phủ;
* Chứng từ **chuỗi hành trình FSC** cho sản phẩm gỗ và giấy, và dữ liệu thẩm định **EUDR** cho EU từ 2026;
* Tờ khai **Lacey Act** (Mỹ) cho sản phẩm gỗ.

## Bảo hiểm và kiểm định

**Giấy chứng nhận bảo hiểm** bảo vệ hàng trong vận chuyển; với CIF do người bán mua với 110% trị giá hoá đơn. **Báo cáo kiểm định trước khi xuất** từ tổ chức đối tác không phải chứng từ hải quan, nhưng nhiều người mua yêu cầu trước khi giải ngân phần còn lại.

## Luồng chứng từ trên CANG

1. Đơn hàng được xác nhận → phát hành hoá đơn chiếu lệ.
2. Hàng sẵn sàng → tải báo cáo kiểm định (nếu đặt).
3. Hàng đã xuất → tải hoá đơn thương mại, phiếu đóng gói và bản sao B/L; giải ngân theo điều khoản thanh toán.
4. Sau khi tàu chạy → tải giấy chứng nhận xuất xứ và chứng nhận sản phẩm.
5. Giao hàng → người mua xác nhận nhận hàng; chứng từ vẫn sẵn sàng để kiểm toán.

Mọi chứng từ chỉ chia sẻ với đối tác giao dịch, lưu cùng đơn hàng và tải xuống được bởi người dùng được uỷ quyền của cả hai công ty.`,
    },
  },
  {
    slug: "why-vietnam",
    type: "PAGE",
    sortOrder: 5,
    en: {
      title: "Why source from Vietnam",
      excerpt: "Trade agreements, cost, workforce, infrastructure and the sectors where Vietnamese factories lead.",
      seoTitle: "Why source from Vietnam — trade agreements, cost, sectors",
      seoDescription: "EVFTA, CPTPP, UKVFTA and RCEP duty savings, competitive labour and energy costs, a young skilled workforce, deep-water ports and the industries where Vietnam is a world leader.",
      content: `# Why source from Vietnam

Vietnam has become the manufacturing base international brands and distributors turn to when they want China-level scale with lower cost, lower tariff exposure and a young, motivated workforce. Exports passed US$400 billion in 2024, and more than 60% of them go to markets that grant Vietnamese goods preferential duty.

## Trade agreements that cut your landed cost

* **EVFTA** (EU–Vietnam, in force since 2020) eliminates duties on 99% of tariff lines by 2030; most apparel, footwear, furniture and electronics already enter the EU duty-free or at reduced rates with an EUR.1 or a statement of origin.
* **UKVFTA** mirrors EVFTA for the United Kingdom.
* **CPTPP** covers Japan, Canada, Australia, New Zealand, Mexico, Chile, Peru, Singapore, Malaysia, Brunei and the UK, with rules of origin that suit Vietnamese textile and food chains.
* **RCEP** links Vietnam with China, Japan, Korea, Australia, New Zealand and ASEAN — useful for regional supply chains that source components in Asia and finish in Vietnam.
* Vietnam also has bilateral or ASEAN-level agreements with Korea, Japan, India, Chile and the Eurasian Economic Union.

## Competitive cost, rising capability

Factory wages are roughly a third of coastal China and energy costs are among the lowest in the region. Productivity has risen with automation in footwear, electronics and furniture, and Vietnamese factories now hold the certifications global buyers need: ISO 9001, BSCI, SMETA, WRAP, GRS, FSC, IATF 16949, BRC and HACCP are common on CANG profiles.

## A young, skilled workforce

Half of Vietnam's 100 million people are under 35. The country graduates more than 200,000 engineers and technicians a year, English proficiency is improving quickly, and turnover in industrial parks is lower than in many competing countries. Owners and export managers at the factories on CANG typically have 10–25 years of experience with European, American, Japanese and Korean customers.

## Infrastructure that works

Deep-water ports at Cai Mep-Thi Vai (south) and Lach Huyen (north) take the largest container vessels with direct services to Europe and the US West Coast. Industrial parks such as VSIP, Amata, DEEP C and Yen Phong offer ready-built factories with reliable power, and Long Thanh International Airport opens in 2026. Transit times: 30–35 days to Northern Europe, 18–22 days to the US West Coast, 10–14 days to Japan and 20–25 days to Australia.

## Sectors where Vietnam leads

| Sector | What Vietnam is known for |
|---|---|
| Apparel & textiles | Second-largest exporter worldwide; knit and woven private label, activewear, denim, workwear |
| Footwear | Athletic and casual OEM for global brands; safety footwear growing |
| Furniture & wood | Largest furniture exporter in Southeast Asia; FSC acacia and rubberwood, outdoor furniture |
| Electronics | Smartphone, display and component supply chains; EMS, PCBA, cables, IoT devices |
| Bags & luggage | Backpacks, technical bags, luggage — a fast-growing OEM cluster around Ho Chi Minh City |
| Packaging & plastics | Corrugated, flexible and compostable packaging; injection moulding and tooling |
| Machinery & metal | CNC machining, stamping, steel structures, food and packaging machinery |
| Agriculture & food | World's largest Robusta and cashew exporter; pangasius, shrimp, rice, coffee, dried fruit |
| Cosmetics & chemicals | ISO 22716 OEM skincare, natural actives; industrial coatings and adhesives |

## How CANG makes it easier

CANG verifies Vietnamese manufacturers, structures RFQs and quotations so you can compare offers, protects payments through a licensed partner bank, and connects inspection, logistics and financing partners to every order. Start with the buyer's guide, browse manufacturers by industry and province, or post your first RFQ.`,
    },
    vi: {
      title: "Vì sao tìm nguồn hàng từ Việt Nam",
      excerpt: "Hiệp định thương mại, chi phí, lực lượng lao động, hạ tầng và những ngành nhà máy Việt Nam dẫn đầu.",
      seoTitle: "Vì sao tìm nguồn hàng từ Việt Nam — hiệp định thương mại, chi phí, ngành hàng",
      seoDescription: "Tiết kiệm thuế nhờ EVFTA, CPTPP, UKVFTA và RCEP, chi phí lao động và năng lượng cạnh tranh, lực lượng lao động trẻ có tay nghề, cảng nước sâu và các ngành Việt Nam dẫn đầu thế giới.",
      content: `# Vì sao tìm nguồn hàng từ Việt Nam

Việt Nam đã trở thành cứ điểm sản xuất mà các thương hiệu và nhà phân phối quốc tế tìm đến khi muốn quy mô tương đương Trung Quốc với chi phí thấp hơn, ít rủi ro thuế quan hơn và lực lượng lao động trẻ, năng động. Kim ngạch xuất khẩu vượt 400 tỷ USD năm 2024, và hơn 60% đi tới các thị trường dành thuế ưu đãi cho hàng Việt Nam.

## Hiệp định thương mại giảm chi phí hàng nhập

* **EVFTA** (EU – Việt Nam, hiệu lực từ 2020) xoá bỏ thuế với 99% dòng thuế vào năm 2030; hầu hết may mặc, giày dép, nội thất và điện tử đã vào EU miễn thuế hoặc thuế giảm với EUR.1 hoặc tự chứng nhận xuất xứ.
* **UKVFTA** tương tự EVFTA cho Anh.
* **CPTPP** bao gồm Nhật Bản, Canada, Úc, New Zealand, Mexico, Chile, Peru, Singapore, Malaysia, Brunei và Anh, với quy tắc xuất xứ phù hợp chuỗi dệt may và thực phẩm Việt Nam.
* **RCEP** kết nối Việt Nam với Trung Quốc, Nhật Bản, Hàn Quốc, Úc, New Zealand và ASEAN — hữu ích cho chuỗi cung ứng khu vực lấy linh kiện tại châu Á và hoàn thiện ở Việt Nam.
* Việt Nam còn có hiệp định song phương hoặc cấp ASEAN với Hàn Quốc, Nhật Bản, Ấn Độ, Chile và Liên minh Kinh tế Á – Âu.

## Chi phí cạnh tranh, năng lực ngày càng cao

Lương công nhân bằng khoảng một phần ba vùng ven biển Trung Quốc và chi phí năng lượng thuộc hàng thấp nhất khu vực. Năng suất tăng nhờ tự động hoá trong giày dép, điện tử và nội thất, và các nhà máy Việt Nam hiện có các chứng nhận người mua toàn cầu yêu cầu: ISO 9001, BSCI, SMETA, WRAP, GRS, FSC, IATF 16949, BRC và HACCP rất phổ biến trên hồ sơ CANG.

## Lực lượng lao động trẻ, có tay nghề

Một nửa trong 100 triệu dân Việt Nam dưới 35 tuổi. Mỗi năm có hơn 200.000 kỹ sư và kỹ thuật viên tốt nghiệp, trình độ tiếng Anh cải thiện nhanh, và tỷ lệ nghỉ việc tại khu công nghiệp thấp hơn nhiều nước cạnh tranh. Chủ doanh nghiệp và quản lý xuất khẩu tại các nhà máy trên CANG thường có 10–25 năm kinh nghiệm với khách hàng châu Âu, Mỹ, Nhật và Hàn Quốc.

## Hạ tầng vận hành tốt

Cảng nước sâu Cái Mép – Thị Vải (Nam) và Lạch Huyện (Bắc) đón tàu container lớn nhất với tuyến trực tiếp tới châu Âu và bờ Tây nước Mỹ. Các khu công nghiệp như VSIP, Amata, DEEP C và Yên Phong có nhà xưởng xây sẵn với điện ổn định, và sân bay quốc tế Long Thành khai thác năm 2026. Thời gian vận chuyển: 30–35 ngày tới Bắc Âu, 18–22 ngày tới bờ Tây Mỹ, 10–14 ngày tới Nhật và 20–25 ngày tới Úc.

## Các ngành Việt Nam dẫn đầu

| Ngành | Việt Nam nổi tiếng về |
|---|---|
| May mặc & dệt | Xuất khẩu lớn thứ hai thế giới; nhãn riêng dệt kim và dệt thoi, đồ thể thao, denim, bảo hộ |
| Giày dép | OEM giày thể thao và giày thường cho thương hiệu toàn cầu; giày bảo hộ đang tăng |
| Nội thất & gỗ | Xuất khẩu nội thất lớn nhất Đông Nam Á; gỗ keo và cao su FSC, nội thất ngoài trời |
| Điện tử | Chuỗi cung ứng điện thoại, màn hình và linh kiện; EMS, PCBA, cáp, thiết bị IoT |
| Túi & vali | Ba lô, túi kỹ thuật, vali — cụm OEM phát triển nhanh quanh TP.HCM |
| Bao bì & nhựa | Bao bì carton, mềm và phân huỷ sinh học; ép phun và khuôn mẫu |
| Máy móc & kim loại | Gia công CNC, dập, kết cấu thép, máy thực phẩm và đóng gói |
| Nông sản & thực phẩm | Xuất khẩu Robusta và điều lớn nhất thế giới; cá tra, tôm, gạo, cà phê, trái cây sấy |
| Mỹ phẩm & hoá chất | OEM chăm sóc da ISO 22716, hoạt chất thiên nhiên; sơn phủ và keo công nghiệp |

## CANG giúp việc này dễ dàng hơn thế nào

CANG xác minh nhà sản xuất Việt Nam, cấu trúc RFQ và báo giá để bạn so sánh chào giá, bảo vệ thanh toán qua ngân hàng đối tác có giấy phép, và kết nối đối tác kiểm định, logistics và tài chính vào mọi đơn hàng. Hãy bắt đầu với hướng dẫn người mua, duyệt nhà sản xuất theo ngành và tỉnh thành, hoặc đăng RFQ đầu tiên.`,
    },
  },
  {
    slug: "about",
    type: "PAGE",
    sortOrder: 6,
    en: {
      title: "About CANG",
      excerpt: "CANG is the Vietnam-first B2B industrial marketplace connecting verified manufacturers with buyers worldwide.",
      seoTitle: "About CANG — Vietnam's B2B industrial marketplace",
      seoDescription: "CANG (cang.vn) connects verified Vietnamese manufacturers with international buyers through structured RFQs, Trade Assurance payments, inspection, logistics and financing partners.",
      content: `# About CANG

**CANG** — "port" in Vietnamese — is a business-to-business marketplace built for one purpose: to make sourcing from Vietnam as transparent and safe as buying from a supplier in your own country.

## What we do

We verify Vietnamese manufacturers, wholesalers and exporters, publish their real capabilities and let buyers request quotations in a structured way. Every transaction can be protected by **Trade Assurance**, under which buyer funds are held by a licensed Vietnamese partner bank and released only when delivery milestones are met. Inspection agencies, freight forwarders and financing partners plug into each order so that a buyer in Hamburg or Denver and a factory in Binh Duong work from the same information.

## Why we built it

Vietnam's exporters are excellent at making things and often invisible online. Buyers rely on trade fairs, agents and word of mouth, pay commissions to intermediaries and still carry the risk of paying a factory they have never met. We wanted a platform where the factory's identity, capacity and certifications are checked, where quotations are comparable, where payment is protected without anyone holding client money, and where every service around the order — inspection, shipping, insurance, financing — is one click away.

## Principles

* **Verification first.** Badges are earned by evidence, not bought.
* **No hidden fees.** Commission and service fees are shown before an order is accepted.
* **Regulated partners.** Payments, escrow, financing and insurance are provided by licensed institutions; CANG orchestrates, it does not hold funds or lend.
* **Bilingual by design.** Every page and every listing works in English and Vietnamese.

## The company

CANG is operated by CANG Technology JSC, headquartered in Ho Chi Minh City with a northern office in Hanoi. Our team combines export-management experience from apparel, furniture and electronics factories with software engineering and trade-finance backgrounds.

Contact us at [hello@cang.vn](mailto:hello@cang.vn) or through the contact page.`,
    },
    vi: {
      title: "Về CANG",
      excerpt: "CANG là sàn thương mại công nghiệp B2B lấy Việt Nam làm trung tâm, kết nối nhà sản xuất đã xác minh với người mua toàn cầu.",
      seoTitle: "Về CANG — sàn thương mại công nghiệp B2B của Việt Nam",
      seoDescription: "CANG (cang.vn) kết nối nhà sản xuất Việt Nam đã xác minh với người mua quốc tế qua RFQ có cấu trúc, thanh toán Bảo đảm giao dịch, đối tác kiểm định, logistics và tài chính.",
      content: `# Về CANG

**CANG** — "cảng" trong tiếng Việt — là sàn thương mại giữa doanh nghiệp được xây dựng với một mục đích: giúp việc tìm nguồn hàng từ Việt Nam minh bạch và an toàn như mua từ nhà cung cấp ở chính nước bạn.

## Chúng tôi làm gì

Chúng tôi xác minh nhà sản xuất, nhà bán buôn và nhà xuất khẩu Việt Nam, công bố năng lực thực của họ và để người mua yêu cầu báo giá theo cách có cấu trúc. Mọi giao dịch có thể được bảo vệ bằng **Bảo đảm giao dịch**, theo đó tiền của người mua được ngân hàng đối tác có giấy phép tại Việt Nam giữ và chỉ giải ngân khi đạt các mốc giao hàng. Tổ chức kiểm định, công ty giao nhận và đối tác tài chính kết nối vào từng đơn hàng để người mua ở Hamburg hay Denver và nhà máy ở Bình Dương làm việc trên cùng một thông tin.

## Vì sao chúng tôi xây dựng CANG

Nhà xuất khẩu Việt Nam sản xuất rất giỏi nhưng thường vô hình trên mạng. Người mua dựa vào hội chợ, đại lý và truyền miệng, trả hoa hồng cho trung gian và vẫn chịu rủi ro thanh toán cho nhà máy chưa từng gặp. Chúng tôi muốn một nền tảng nơi danh tính, năng lực và chứng nhận của nhà máy được kiểm tra, nơi báo giá có thể so sánh, nơi thanh toán được bảo vệ mà không ai giữ tiền khách hàng, và nơi mọi dịch vụ quanh đơn hàng — kiểm định, vận chuyển, bảo hiểm, tài chính — chỉ cách một cú nhấp.

## Nguyên tắc

* **Xác minh trước tiên.** Huy hiệu được cấp dựa trên bằng chứng, không mua được.
* **Không phí ẩn.** Hoa hồng và phí dịch vụ hiển thị trước khi đơn hàng được chấp nhận.
* **Đối tác được cấp phép.** Thanh toán, ký quỹ, tài chính và bảo hiểm do các tổ chức có giấy phép cung cấp; CANG điều phối, không giữ tiền hay cho vay.
* **Song ngữ từ thiết kế.** Mọi trang và mọi tin đăng hoạt động bằng tiếng Anh và tiếng Việt.

## Công ty

CANG do Công ty Cổ phần Công nghệ CANG vận hành, trụ sở tại Thành phố Hồ Chí Minh và văn phòng phía Bắc tại Hà Nội. Đội ngũ của chúng tôi kết hợp kinh nghiệm quản lý xuất khẩu từ các nhà máy may mặc, nội thất và điện tử với nền tảng kỹ thuật phần mềm và tài trợ thương mại.

Liên hệ với chúng tôi qua [hello@cang.vn](mailto:hello@cang.vn) hoặc trang liên hệ.`,
    },
  },
  {
    slug: "contact",
    type: "PAGE",
    sortOrder: 7,
    en: {
      title: "Contact CANG",
      excerpt: "Reach our buyer and supplier support teams in Ho Chi Minh City and Hanoi.",
      seoTitle: "Contact CANG — buyer and supplier support",
      seoDescription: "Contact CANG support for buyers and suppliers: email, phone and office addresses in Ho Chi Minh City and Hanoi.",
      content: `# Contact us

We answer in English and Vietnamese within one business day.

## Buyer support
Questions about RFQs, quotations, Trade Assurance, inspection or shipping.
Email: [buyers@cang.vn](mailto:buyers@cang.vn) · Phone: +84 28 7300 1500 (08:00–18:00 ICT, Mon–Fri)

## Supplier support
Onboarding, verification, listings, plans and payouts.
Email: [suppliers@cang.vn](mailto:suppliers@cang.vn) · Phone: +84 28 7300 1501 · Zalo: 0903 000 150

## Partnerships
Logistics, inspection, financing and insurance partners: [partners@cang.vn](mailto:partners@cang.vn)

## Offices

**Ho Chi Minh City (head office)**
Level 12, Deutsches Haus, 33 Le Duan, District 1, Ho Chi Minh City

**Hanoi**
Level 8, Capital Place, 29 Lieu Giai, Ba Dinh, Hanoi

## Media and press
[press@cang.vn](mailto:press@cang.vn)

For urgent issues on an active order, use the **Report a problem** button on the order page — it opens a support ticket that our trade team monitors around the clock.`,
    },
    vi: {
      title: "Liên hệ CANG",
      excerpt: "Liên hệ đội hỗ trợ người mua và nhà cung cấp tại Thành phố Hồ Chí Minh và Hà Nội.",
      seoTitle: "Liên hệ CANG — hỗ trợ người mua và nhà cung cấp",
      seoDescription: "Liên hệ hỗ trợ CANG cho người mua và nhà cung cấp: email, điện thoại và địa chỉ văn phòng tại TP.HCM và Hà Nội.",
      content: `# Liên hệ

Chúng tôi trả lời bằng tiếng Việt và tiếng Anh trong một ngày làm việc.

## Hỗ trợ người mua
Câu hỏi về RFQ, báo giá, Bảo đảm giao dịch, kiểm định hoặc vận chuyển.
Email: [buyers@cang.vn](mailto:buyers@cang.vn) · Điện thoại: +84 28 7300 1500 (08:00–18:00, thứ Hai – thứ Sáu)

## Hỗ trợ nhà cung cấp
Đăng ký, xác minh, tin đăng, gói dịch vụ và giải ngân.
Email: [suppliers@cang.vn](mailto:suppliers@cang.vn) · Điện thoại: +84 28 7300 1501 · Zalo: 0903 000 150

## Hợp tác
Đối tác logistics, kiểm định, tài chính và bảo hiểm: [partners@cang.vn](mailto:partners@cang.vn)

## Văn phòng

**Thành phố Hồ Chí Minh (trụ sở chính)**
Tầng 12, Deutsches Haus, 33 Lê Duẩn, Quận 1, TP. Hồ Chí Minh

**Hà Nội**
Tầng 8, Capital Place, 29 Liễu Giai, Ba Đình, Hà Nội

## Báo chí
[press@cang.vn](mailto:press@cang.vn)

Với vấn đề khẩn cấp trên đơn hàng đang thực hiện, hãy dùng nút **Báo cáo sự cố** trên trang đơn hàng — nó mở phiếu hỗ trợ được đội thương mại của chúng tôi theo dõi liên tục.`,
    },
  },
  {
    slug: "help",
    type: "PAGE",
    sortOrder: 8,
    en: {
      title: "Help centre",
      excerpt: "Answers to the questions buyers and suppliers ask most about accounts, RFQs, orders, payments and disputes.",
      seoTitle: "CANG help centre — FAQs for buyers and suppliers",
      seoDescription: "Frequently asked questions about CANG accounts, verification, RFQs and quotations, Trade Assurance payments, inspection, shipping, disputes and fees.",
      content: `# Help centre

## Accounts

**Can one company be both buyer and seller?** Yes. A Vietnamese distributor can buy from factories and sell to export customers with one company account; switch the capability in Settings.

**How do I add team members?** Company owners and admins invite colleagues by email from Settings → Team and assign a role (sales, purchasing, finance, viewer). Permissions control who can quote, place orders or see payments.

## Verification and badges

**How long does verification take?** Business verification (KYB) usually completes within three working days once documents are uploaded. Factory audits are scheduled within two weeks.

**Why did I lose the Fast Response badge?** The badge is recalculated over a rolling 90 days; if your response rate drops below 90% or average response time exceeds 24 hours it is removed automatically and restored when the metrics recover.

## RFQs and quotations

**Who can see my RFQ?** Public RFQs are visible to verified suppliers in matching categories. Choose "invited only" to restrict visibility to the factories you select.

**Can a supplier change a quotation after submitting it?** Yes — the supplier submits a revision; the previous version is kept with a revision number so both sides see the history.

**What happens when I accept a quotation?** An order is created with the quotation's items and terms, the RFQ is marked awarded and a payment schedule is generated.

## Orders and payments

**Where is my money held?** Under Trade Assurance your payment is held in a segregated account at a licensed Vietnamese partner bank, never by CANG. Payment instructions with the reference number are shown on the payment page.

**When are funds released to the supplier?** According to the order's terms — typically the deposit once the order is confirmed and the balance when the bill of lading is uploaded or delivery is confirmed. You have an inspection window after delivery to raise a dispute.

**Which currencies are supported?** USD, EUR and VND for payments; quotations can be in any listed currency.

## Inspection and shipping

**How do I book an inspection?** From the order page → Book inspection. Choose the type (pre-production, during production, pre-shipment, container loading), the date and the agency. Reports are uploaded to the order.

**Can I use my own forwarder?** Yes, for FOB and EXW orders. Enter the booking details on the shipment so milestones can be tracked.

## Disputes

**How do I open a dispute?** From the order page within the inspection window. Describe the issue, attach evidence and state the amount claimed. The supplier responds, and a CANG mediator facilitates a resolution: refund, partial refund, replacement or no action.

## Fees

**What does CANG charge?** Suppliers pay a tiered commission on Trade Assurance orders (3% up to US$10,000, 2.5% to US$50,000, 2% above) plus a payment orchestration fee, shown before accepting an order. Buyers pay no platform fee. Subscription plans and advertising are optional.

Still need help? Contact [support@cang.vn](mailto:support@cang.vn).`,
    },
    vi: {
      title: "Trung tâm trợ giúp",
      excerpt: "Giải đáp các câu hỏi thường gặp của người mua và nhà cung cấp về tài khoản, RFQ, đơn hàng, thanh toán và tranh chấp.",
      seoTitle: "Trung tâm trợ giúp CANG — câu hỏi thường gặp",
      seoDescription: "Câu hỏi thường gặp về tài khoản CANG, xác minh, RFQ và báo giá, thanh toán Bảo đảm giao dịch, kiểm định, vận chuyển, tranh chấp và phí.",
      content: `# Trung tâm trợ giúp

## Tài khoản

**Một công ty có thể vừa mua vừa bán không?** Có. Nhà phân phối Việt Nam có thể mua từ nhà máy và bán cho khách xuất khẩu bằng một tài khoản công ty; bật khả năng này trong Cài đặt.

**Làm sao thêm thành viên?** Chủ sở hữu và quản trị viên công ty mời đồng nghiệp qua email từ Cài đặt → Nhóm và gán vai trò (kinh doanh, thu mua, tài chính, xem). Quyền hạn quyết định ai được báo giá, đặt hàng hoặc xem thanh toán.

## Xác minh và huy hiệu

**Xác minh mất bao lâu?** Xác minh doanh nghiệp (KYB) thường hoàn tất trong ba ngày làm việc sau khi tải tài liệu. Kiểm định nhà máy được lên lịch trong hai tuần.

**Vì sao tôi mất huy hiệu Phản hồi nhanh?** Huy hiệu được tính lại trên 90 ngày gần nhất; nếu tỷ lệ phản hồi dưới 90% hoặc thời gian phản hồi trung bình quá 24 giờ, huy hiệu tự động bị gỡ và cấp lại khi chỉ số phục hồi.

## RFQ và báo giá

**Ai thấy RFQ của tôi?** RFQ công khai hiển thị với nhà cung cấp đã xác minh trong ngành phù hợp. Chọn "chỉ mời" để giới hạn cho các nhà máy bạn chọn.

**Nhà cung cấp có thể sửa báo giá sau khi gửi không?** Có — nhà cung cấp gửi bản sửa; bản trước được lưu với số phiên bản để hai bên thấy lịch sử.

**Điều gì xảy ra khi tôi chấp nhận báo giá?** Đơn hàng được tạo với các mặt hàng và điều khoản của báo giá, RFQ được đánh dấu đã trao và lịch thanh toán được tạo.

## Đơn hàng và thanh toán

**Tiền của tôi được giữ ở đâu?** Với Bảo đảm giao dịch, khoản thanh toán được giữ trong tài khoản tách biệt tại ngân hàng đối tác có giấy phép ở Việt Nam, không bao giờ do CANG giữ. Hướng dẫn thanh toán kèm mã tham chiếu hiển thị trên trang thanh toán.

**Khi nào tiền được giải ngân cho nhà cung cấp?** Theo điều khoản đơn hàng — thường tiền cọc khi đơn được xác nhận và phần còn lại khi vận đơn được tải lên hoặc giao hàng được xác nhận. Bạn có thời hạn kiểm tra sau khi nhận hàng để mở tranh chấp.

**Hỗ trợ đồng tiền nào?** USD, EUR và VND cho thanh toán; báo giá có thể dùng bất kỳ đồng tiền nào trong danh sách.

## Kiểm định và vận chuyển

**Đặt kiểm định thế nào?** Từ trang đơn hàng → Đặt kiểm định. Chọn loại (trước sản xuất, trong sản xuất, trước xuất hàng, giám sát đóng container), ngày và tổ chức. Báo cáo được tải lên đơn hàng.

**Tôi có thể dùng đơn vị giao nhận của mình không?** Có, với đơn FOB và EXW. Nhập thông tin đặt chỗ vào lô hàng để theo dõi mốc.

## Tranh chấp

**Mở tranh chấp thế nào?** Từ trang đơn hàng trong thời hạn kiểm tra. Mô tả vấn đề, đính kèm bằng chứng và nêu số tiền yêu cầu. Nhà cung cấp phản hồi, hoà giải viên CANG hỗ trợ giải quyết: hoàn tiền, hoàn một phần, thay hàng hoặc không xử lý.

## Phí

**CANG thu phí gì?** Nhà cung cấp trả hoa hồng theo bậc trên đơn Bảo đảm giao dịch (3% tới 10.000 USD, 2,5% tới 50.000 USD, 2% phần trên) cộng phí điều phối thanh toán, hiển thị trước khi chấp nhận đơn. Người mua không trả phí nền tảng. Gói thuê bao và quảng cáo là tuỳ chọn.

Vẫn cần trợ giúp? Liên hệ [support@cang.vn](mailto:support@cang.vn).`,
    },
  },
  {
    slug: "terms",
    type: "LEGAL",
    sortOrder: 9,
    en: {
      title: "Terms of service",
      excerpt: "The agreement between CANG Technology JSC and every buyer, supplier and partner using the cang.vn marketplace.",
      seoTitle: "CANG terms of service",
      seoDescription: "Terms governing the use of the CANG B2B marketplace: accounts, listings, RFQs, orders, Trade Assurance, fees, disputes, liability and governing law.",
      content: `# Terms of service

*Last updated: 1 September 2026*

These terms govern access to and use of the CANG marketplace at cang.vn (the "Platform") operated by CANG Technology JSC, a company incorporated in Vietnam ("CANG", "we"). By creating an account you agree to these terms on behalf of the company you represent.

## 1. Eligibility and accounts

1.1 The Platform is a business-to-business service. Users must be at least 18 years old and authorised to act for a legally registered company.
1.2 You are responsible for the accuracy of company information, for keeping credentials confidential and for all activity under your account, including that of team members you invite.
1.3 We may suspend or terminate accounts that provide false information, infringe third-party rights, attempt to circumvent the Platform's payment or dispute processes, or breach applicable sanctions or export-control laws.

## 2. Role of CANG

2.1 CANG provides a technology platform through which buyers and suppliers discover each other, exchange requests for quotation, quotations, messages and documents, and conclude orders. CANG is not a party to any sale, does not take title to goods and does not guarantee the performance of any user.
2.2 Verification badges reflect checks performed at a point in time on documents and data provided by the supplier or by third-party auditors. They are not a warranty of product quality or of any future performance.
2.3 Payment services, escrow-style holding of funds, cargo insurance, financing and inspection are provided by licensed third-party partners under their own terms. CANG orchestrates these services and does not hold client money, extend credit or underwrite risk.

## 3. Listings, RFQs and quotations

3.1 Suppliers must list only products they are able to manufacture or supply, with accurate specifications, prices, certifications and images they have the right to use.
3.2 Buyers must post RFQs in good faith for genuine sourcing needs. Quotations submitted through the Platform are offers that, once accepted by the buyer, form a binding purchase contract between buyer and supplier on the terms stated in the quotation and the order.
3.3 Users must not use Platform contact details or conversations to move a transaction off the Platform in order to avoid fees or protections ("circumvention").

## 4. Orders and Trade Assurance

4.1 When a quotation is accepted, the Platform generates an order and a payment schedule. The buyer and supplier are responsible for performing the contract.
4.2 Where Trade Assurance is enabled, buyer payments are transferred to an account operated by a licensed Vietnamese partner bank and released to the supplier when the milestone conditions recorded on the order are met or when a dispute is resolved. The partner's terms apply to the holding and release of funds.
4.3 Either party may open a dispute within the inspection window shown on the order. CANG will facilitate resolution through information exchange and mediation. Where the parties agree, or where the evidence clearly supports one party under the Trade Assurance terms, CANG will instruct the partner to release or refund funds accordingly. CANG's determination is limited to the funds held and does not prejudice the parties' other legal remedies.

## 5. Fees

5.1 Supplier commissions, payment orchestration fees, subscription fees, advertising fees and service referral fees are published on the Platform and shown before the relevant action is confirmed. Fees are exclusive of VAT unless stated.
5.2 Fees are non-refundable except where required by law or expressly stated.

## 6. Content and intellectual property

6.1 You retain ownership of the content you upload and grant CANG a worldwide, non-exclusive licence to host, display and distribute it for the operation and promotion of the Platform.
6.2 You must not upload content that infringes intellectual-property rights, is defamatory, misleading or unlawful. We may remove content and listings that breach these terms.

## 7. Compliance

7.1 Users must comply with export-control, sanctions, anti-bribery, product-safety and data-protection laws applicable to their transactions. CANG screens companies against sanctions lists and may request additional information at any time.
7.2 Suppliers are responsible for the certifications and test reports they publish and for maintaining them in force.

## 8. Liability

8.1 The Platform is provided "as is". To the extent permitted by law, CANG excludes all warranties and is not liable for indirect, consequential or lost-profit damages, or for the acts or omissions of users or partners.
8.2 CANG's aggregate liability to a user in any twelve-month period is limited to the fees that user paid to CANG in that period.

## 9. Termination

Either party may terminate the account relationship at any time. Orders in progress and funds held under Trade Assurance continue to be governed by these terms until completed or resolved.

## 10. Governing law and disputes

These terms are governed by the laws of the Socialist Republic of Vietnam. Disputes between a user and CANG that cannot be settled amicably will be referred to the Vietnam International Arbitration Centre (VIAC) in Ho Chi Minh City, in English, under its rules.

## 11. Changes

We may update these terms with 30 days' notice on the Platform. Continued use after the effective date constitutes acceptance.

Contact: [legal@cang.vn](mailto:legal@cang.vn)`,
    },
    vi: {
      title: "Điều khoản dịch vụ",
      excerpt: "Thoả thuận giữa Công ty Cổ phần Công nghệ CANG và mọi người mua, nhà cung cấp và đối tác sử dụng sàn cang.vn.",
      seoTitle: "Điều khoản dịch vụ CANG",
      seoDescription: "Điều khoản điều chỉnh việc sử dụng sàn B2B CANG: tài khoản, tin đăng, RFQ, đơn hàng, Bảo đảm giao dịch, phí, tranh chấp, trách nhiệm và luật áp dụng.",
      content: `# Điều khoản dịch vụ

*Cập nhật lần cuối: 01/09/2026*

Các điều khoản này điều chỉnh việc truy cập và sử dụng sàn CANG tại cang.vn ("Nền tảng") do Công ty Cổ phần Công nghệ CANG, thành lập tại Việt Nam ("CANG", "chúng tôi") vận hành. Bằng việc tạo tài khoản, bạn đồng ý các điều khoản này thay mặt công ty mà bạn đại diện.

## 1. Điều kiện và tài khoản

1.1 Nền tảng là dịch vụ giữa doanh nghiệp. Người dùng phải từ 18 tuổi và được uỷ quyền hành động cho một công ty đăng ký hợp pháp.
1.2 Bạn chịu trách nhiệm về tính chính xác của thông tin công ty, bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình, kể cả của thành viên nhóm bạn mời.
1.3 Chúng tôi có thể tạm ngưng hoặc chấm dứt tài khoản cung cấp thông tin sai, xâm phạm quyền bên thứ ba, cố tình lách quy trình thanh toán hoặc tranh chấp của Nền tảng, hoặc vi phạm pháp luật về cấm vận và kiểm soát xuất khẩu.

## 2. Vai trò của CANG

2.1 CANG cung cấp nền tảng công nghệ để người mua và nhà cung cấp tìm thấy nhau, trao đổi yêu cầu báo giá, báo giá, tin nhắn và chứng từ, và ký kết đơn hàng. CANG không phải bên trong bất kỳ giao dịch mua bán nào, không sở hữu hàng hoá và không bảo đảm việc thực hiện của bất kỳ người dùng nào.
2.2 Huy hiệu xác minh phản ánh các kiểm tra tại một thời điểm trên tài liệu và dữ liệu do nhà cung cấp hoặc bên kiểm định thứ ba cung cấp. Huy hiệu không phải bảo hành chất lượng sản phẩm hay việc thực hiện trong tương lai.
2.3 Dịch vụ thanh toán, giữ tiền kiểu ký quỹ, bảo hiểm hàng hoá, tài chính và kiểm định do các đối tác bên thứ ba có giấy phép cung cấp theo điều khoản riêng. CANG điều phối các dịch vụ này và không giữ tiền khách hàng, không cấp tín dụng và không bảo lãnh rủi ro.

## 3. Tin đăng, RFQ và báo giá

3.1 Nhà cung cấp chỉ đăng sản phẩm mình có khả năng sản xuất hoặc cung cấp, với quy cách, giá, chứng nhận chính xác và hình ảnh có quyền sử dụng.
3.2 Người mua đăng RFQ với thiện chí cho nhu cầu tìm nguồn hàng thật. Báo giá gửi qua Nền tảng là đề nghị giao kết; khi người mua chấp nhận sẽ hình thành hợp đồng mua bán ràng buộc giữa người mua và nhà cung cấp theo điều khoản nêu trong báo giá và đơn hàng.
3.3 Người dùng không được dùng thông tin liên hệ hoặc cuộc trò chuyện trên Nền tảng để đưa giao dịch ra ngoài nhằm tránh phí hoặc các cơ chế bảo vệ ("lách nền tảng").

## 4. Đơn hàng và Bảo đảm giao dịch

4.1 Khi báo giá được chấp nhận, Nền tảng tạo đơn hàng và lịch thanh toán. Người mua và nhà cung cấp chịu trách nhiệm thực hiện hợp đồng.
4.2 Khi bật Bảo đảm giao dịch, khoản thanh toán của người mua được chuyển vào tài khoản do ngân hàng đối tác có giấy phép tại Việt Nam vận hành và giải ngân cho nhà cung cấp khi đạt điều kiện mốc ghi trên đơn hàng hoặc khi tranh chấp được giải quyết. Điều khoản của đối tác áp dụng cho việc giữ và giải ngân tiền.
4.3 Mỗi bên có thể mở tranh chấp trong thời hạn kiểm tra hiển thị trên đơn hàng. CANG hỗ trợ giải quyết qua trao đổi thông tin và hoà giải. Khi các bên đồng ý, hoặc khi bằng chứng rõ ràng ủng hộ một bên theo điều khoản Bảo đảm giao dịch, CANG sẽ chỉ thị đối tác giải ngân hoặc hoàn tiền tương ứng. Quyết định của CANG chỉ giới hạn ở số tiền đang giữ và không ảnh hưởng tới các biện pháp pháp lý khác của các bên.

## 5. Phí

5.1 Hoa hồng nhà cung cấp, phí điều phối thanh toán, phí thuê bao, phí quảng cáo và phí giới thiệu dịch vụ được công bố trên Nền tảng và hiển thị trước khi xác nhận hành động liên quan. Phí chưa gồm VAT trừ khi nêu rõ.
5.2 Phí không hoàn lại trừ khi pháp luật yêu cầu hoặc được nêu rõ.

## 6. Nội dung và sở hữu trí tuệ

6.1 Bạn giữ quyền sở hữu nội dung tải lên và cấp cho CANG giấy phép toàn cầu, không độc quyền để lưu trữ, hiển thị và phân phối nội dung đó nhằm vận hành và quảng bá Nền tảng.
6.2 Bạn không được tải nội dung xâm phạm quyền sở hữu trí tuệ, phỉ báng, gây hiểu lầm hoặc trái pháp luật. Chúng tôi có thể gỡ nội dung và tin đăng vi phạm.

## 7. Tuân thủ

7.1 Người dùng phải tuân thủ pháp luật về kiểm soát xuất khẩu, cấm vận, chống hối lộ, an toàn sản phẩm và bảo vệ dữ liệu áp dụng cho giao dịch của mình. CANG sàng lọc công ty theo danh sách cấm vận và có thể yêu cầu thông tin bổ sung bất kỳ lúc nào.
7.2 Nhà cung cấp chịu trách nhiệm về chứng nhận và báo cáo thử nghiệm mình công bố và duy trì hiệu lực của chúng.

## 8. Trách nhiệm

8.1 Nền tảng được cung cấp "nguyên trạng". Trong phạm vi pháp luật cho phép, CANG loại trừ mọi bảo đảm và không chịu trách nhiệm với thiệt hại gián tiếp, hệ quả hoặc mất lợi nhuận, hay hành vi của người dùng hoặc đối tác.
8.2 Tổng trách nhiệm của CANG với một người dùng trong bất kỳ giai đoạn mười hai tháng nào được giới hạn ở số phí người dùng đó đã trả cho CANG trong giai đoạn đó.

## 9. Chấm dứt

Mỗi bên có thể chấm dứt quan hệ tài khoản bất kỳ lúc nào. Đơn hàng đang thực hiện và tiền đang giữ theo Bảo đảm giao dịch tiếp tục chịu sự điều chỉnh của các điều khoản này cho tới khi hoàn tất hoặc giải quyết.

## 10. Luật áp dụng và giải quyết tranh chấp

Các điều khoản này chịu sự điều chỉnh của pháp luật nước Cộng hoà Xã hội Chủ nghĩa Việt Nam. Tranh chấp giữa người dùng và CANG không thể giải quyết hoà giải sẽ được đưa ra Trung tâm Trọng tài Quốc tế Việt Nam (VIAC) tại TP. Hồ Chí Minh, bằng tiếng Anh, theo quy tắc của trung tâm.

## 11. Thay đổi

Chúng tôi có thể cập nhật các điều khoản này với thông báo trước 30 ngày trên Nền tảng. Tiếp tục sử dụng sau ngày hiệu lực đồng nghĩa với chấp nhận.

Liên hệ: [legal@cang.vn](mailto:legal@cang.vn)`,
    },
  },
  {
    slug: "privacy",
    type: "LEGAL",
    sortOrder: 10,
    en: {
      title: "Privacy policy",
      excerpt: "How CANG collects, uses, shares and protects personal and company data under Vietnamese Decree 13/2023 and the GDPR.",
      seoTitle: "CANG privacy policy",
      seoDescription: "What data CANG collects from buyers and suppliers, how it is used for verification, matching, payments and compliance, who it is shared with, retention periods and your rights.",
      content: `# Privacy policy

*Last updated: 1 September 2026*

CANG Technology JSC ("CANG") is the controller of personal data processed through cang.vn. This policy explains what we collect, why, with whom we share it and the rights you have under Vietnam's Decree 13/2023/ND-CP on personal data protection and, for users in the European Economic Area and the United Kingdom, the GDPR and UK GDPR.

## 1. Data we collect

* **Account data** — name, business email, phone number, job title, language, password hash.
* **Company data** — registration documents, tax codes, addresses, ownership information and certificates submitted for verification (KYB), including identity documents of legal representatives and beneficial owners where required by law.
* **Transaction data** — RFQs, quotations, orders, messages, documents, payment references and dispute records.
* **Usage data** — device and browser information, IP address, pages viewed, search queries and analytics events, collected through cookies and similar technologies.
* **Partner data** — information returned by payment, inspection, logistics, financing and sanctions-screening partners about a transaction or a company.

## 2. Why we process it

* to operate accounts, listings, RFQs, messaging and orders (performance of a contract);
* to verify companies, screen against sanctions lists and prevent fraud (legal obligation and legitimate interest);
* to orchestrate payments, inspections, shipments and financing with licensed partners (performance of a contract);
* to compute supplier metrics, badges and credit-scoring features that support financing applications (legitimate interest; financing decisions are made by the partner lender, not by CANG);
* to send transactional notifications and, with your consent or where permitted, marketing about the Platform;
* to comply with tax, accounting, anti-money-laundering and export-control laws.

## 3. Who we share it with

* **Counterparties** — the buyer or supplier you transact with sees the company and contact information needed to perform the order and the documents you share with them.
* **Service partners** — licensed banks and payment providers, inspection agencies, freight forwarders, insurers and lenders receive the data necessary to provide the service you requested; each acts under its own privacy terms and regulatory obligations.
* **Processors** — cloud hosting, email delivery, analytics and customer-support tools acting on our instructions.
* **Authorities** — where required by law, court order or to protect the rights and safety of users.

We do not sell personal data.

## 4. International transfers

Data is hosted in Vietnam and Singapore. Transfers outside Vietnam follow the requirements of Decree 13/2023, and transfers of EEA/UK personal data are protected by standard contractual clauses.

## 5. Retention

Account and company data are kept for the life of the account and for ten years afterwards where required by Vietnamese accounting and anti-money-laundering rules. Transaction records are kept for ten years. Usage data is kept for 24 months. Verification documents are deleted or anonymised when no longer required for compliance.

## 6. Security

Data is encrypted in transit and at rest, access is role-based and logged, passwords are stored as salted hashes and verification documents are held in restricted storage with time-limited access links. We maintain an incident-response process and will notify affected users and regulators of a breach as required by law.

## 7. Your rights

Subject to applicable law you may access, correct, export or delete your personal data, object to or restrict processing, withdraw consent and lodge a complaint with the Ministry of Public Security (Vietnam) or your local supervisory authority. Requests can be made from Settings → Privacy or by email to [privacy@cang.vn](mailto:privacy@cang.vn); we respond within 72 hours as required by Decree 13/2023.

## 8. Cookies

We use strictly necessary cookies for sessions and security, and analytics cookies to understand how the Platform is used. You can manage analytics cookies in the cookie banner or your browser settings.

## 9. Changes

We will announce material changes on the Platform and, for significant changes, by email. Continued use after the effective date constitutes acceptance.

Data protection contact: [privacy@cang.vn](mailto:privacy@cang.vn) · CANG Technology JSC, Level 12, Deutsches Haus, 33 Le Duan, District 1, Ho Chi Minh City, Vietnam.`,
    },
    vi: {
      title: "Chính sách bảo mật",
      excerpt: "Cách CANG thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân và doanh nghiệp theo Nghị định 13/2023 và GDPR.",
      seoTitle: "Chính sách bảo mật CANG",
      seoDescription: "Dữ liệu CANG thu thập từ người mua và nhà cung cấp, cách dùng cho xác minh, ghép nối, thanh toán và tuân thủ, chia sẻ với ai, thời gian lưu trữ và quyền của bạn.",
      content: `# Chính sách bảo mật

*Cập nhật lần cuối: 01/09/2026*

Công ty Cổ phần Công nghệ CANG ("CANG") là bên kiểm soát dữ liệu cá nhân được xử lý qua cang.vn. Chính sách này giải thích chúng tôi thu thập gì, vì sao, chia sẻ với ai và các quyền của bạn theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và, với người dùng tại Khu vực Kinh tế châu Âu và Anh, GDPR và UK GDPR.

## 1. Dữ liệu chúng tôi thu thập

* **Dữ liệu tài khoản** — tên, email công việc, số điện thoại, chức danh, ngôn ngữ, mật khẩu đã băm.
* **Dữ liệu công ty** — hồ sơ đăng ký, mã số thuế, địa chỉ, thông tin sở hữu và chứng nhận nộp để xác minh (KYB), bao gồm giấy tờ tuỳ thân của người đại diện pháp luật và chủ sở hữu hưởng lợi khi pháp luật yêu cầu.
* **Dữ liệu giao dịch** — RFQ, báo giá, đơn hàng, tin nhắn, chứng từ, mã thanh toán và hồ sơ tranh chấp.
* **Dữ liệu sử dụng** — thông tin thiết bị và trình duyệt, địa chỉ IP, trang đã xem, từ khoá tìm kiếm và sự kiện phân tích, thu thập qua cookie và công nghệ tương tự.
* **Dữ liệu đối tác** — thông tin do đối tác thanh toán, kiểm định, logistics, tài chính và sàng lọc cấm vận trả về liên quan tới giao dịch hoặc công ty.

## 2. Mục đích xử lý

* vận hành tài khoản, tin đăng, RFQ, nhắn tin và đơn hàng (thực hiện hợp đồng);
* xác minh công ty, sàng lọc danh sách cấm vận và phòng chống gian lận (nghĩa vụ pháp lý và lợi ích chính đáng);
* điều phối thanh toán, kiểm định, vận chuyển và tài chính với đối tác có giấy phép (thực hiện hợp đồng);
* tính chỉ số nhà cung cấp, huy hiệu và các đặc trưng chấm điểm tín dụng hỗ trợ hồ sơ tài chính (lợi ích chính đáng; quyết định cho vay do đối tác cho vay đưa ra, không phải CANG);
* gửi thông báo giao dịch và, khi có sự đồng ý hoặc được phép, thông tin tiếp thị về Nền tảng;
* tuân thủ pháp luật về thuế, kế toán, phòng chống rửa tiền và kiểm soát xuất khẩu.

## 3. Chia sẻ với ai

* **Đối tác giao dịch** — người mua hoặc nhà cung cấp bạn giao dịch thấy thông tin công ty và liên hệ cần thiết để thực hiện đơn hàng và chứng từ bạn chia sẻ với họ.
* **Đối tác dịch vụ** — ngân hàng và nhà cung cấp thanh toán có giấy phép, tổ chức kiểm định, công ty giao nhận, công ty bảo hiểm và bên cho vay nhận dữ liệu cần thiết để cung cấp dịch vụ bạn yêu cầu; mỗi bên hoạt động theo điều khoản bảo mật và nghĩa vụ pháp lý riêng.
* **Bên xử lý** — dịch vụ lưu trữ đám mây, gửi email, phân tích và công cụ hỗ trợ khách hàng hoạt động theo chỉ dẫn của chúng tôi.
* **Cơ quan có thẩm quyền** — khi pháp luật, lệnh toà án yêu cầu hoặc để bảo vệ quyền và an toàn của người dùng.

Chúng tôi không bán dữ liệu cá nhân.

## 4. Chuyển dữ liệu ra nước ngoài

Dữ liệu được lưu trữ tại Việt Nam và Singapore. Việc chuyển ra ngoài Việt Nam tuân theo yêu cầu của Nghị định 13/2023, và chuyển dữ liệu cá nhân EEA/Anh được bảo vệ bằng điều khoản hợp đồng tiêu chuẩn.

## 5. Thời gian lưu trữ

Dữ liệu tài khoản và công ty được giữ trong thời gian tồn tại tài khoản và mười năm sau đó khi quy định kế toán và phòng chống rửa tiền Việt Nam yêu cầu. Hồ sơ giao dịch giữ mười năm. Dữ liệu sử dụng giữ 24 tháng. Tài liệu xác minh được xoá hoặc ẩn danh khi không còn cần cho tuân thủ.

## 6. Bảo mật

Dữ liệu được mã hoá khi truyền và khi lưu, truy cập theo vai trò và có ghi nhật ký, mật khẩu lưu dạng băm có muối và tài liệu xác minh giữ trong kho hạn chế với liên kết truy cập có thời hạn. Chúng tôi duy trì quy trình ứng phó sự cố và sẽ thông báo cho người dùng bị ảnh hưởng và cơ quan quản lý khi có vi phạm theo yêu cầu pháp luật.

## 7. Quyền của bạn

Theo pháp luật áp dụng, bạn có thể truy cập, chỉnh sửa, xuất hoặc xoá dữ liệu cá nhân, phản đối hoặc hạn chế xử lý, rút lại sự đồng ý và khiếu nại tới Bộ Công an (Việt Nam) hoặc cơ quan giám sát tại nước bạn. Yêu cầu có thể gửi từ Cài đặt → Quyền riêng tư hoặc email tới [privacy@cang.vn](mailto:privacy@cang.vn); chúng tôi phản hồi trong 72 giờ theo Nghị định 13/2023.

## 8. Cookie

Chúng tôi dùng cookie thiết yếu cho phiên đăng nhập và bảo mật, và cookie phân tích để hiểu cách Nền tảng được sử dụng. Bạn có thể quản lý cookie phân tích trong thanh thông báo cookie hoặc cài đặt trình duyệt.

## 9. Thay đổi

Chúng tôi sẽ thông báo thay đổi quan trọng trên Nền tảng và, với thay đổi lớn, qua email. Tiếp tục sử dụng sau ngày hiệu lực đồng nghĩa với chấp nhận.

Liên hệ bảo vệ dữ liệu: [privacy@cang.vn](mailto:privacy@cang.vn) · Công ty Cổ phần Công nghệ CANG, Tầng 12, Deutsches Haus, 33 Lê Duẩn, Quận 1, TP. Hồ Chí Minh, Việt Nam.`,
    },
  },
];

export const BANNERS = [
  {
    placement: "HOMEPAGE_HERO" as const,
    locale: null,
    title: "Source directly from verified Vietnamese manufacturers",
    subtitle: "Compare quotations, pay through a licensed partner bank and track every container — in English and Vietnamese.",
    imageUrl: "https://loremflickr.com/1600/700/vietnam,factory,container?lock=901",
    ctaLabel: "Post an RFQ",
    ctaUrl: "/rfq/new",
    sortOrder: 0,
  },
  {
    placement: "HOMEPAGE_SECONDARY" as const,
    locale: null,
    title: "Trade Assurance on every order",
    subtitle: "Deposits and balances are held by a licensed Vietnamese bank and released on delivery milestones.",
    imageUrl: "https://loremflickr.com/1200/500/handshake,business,port?lock=902",
    ctaLabel: "How it works",
    ctaUrl: "/trade-assurance",
    sortOrder: 1,
  },
  {
    placement: "RFQ" as const,
    locale: null,
    title: "Get 3–5 quotations within 48 hours",
    subtitle: "Your RFQ is matched to verified factories with the right products, capacity and certifications.",
    imageUrl: "https://loremflickr.com/1200/400/sewing,factory,vietnam?lock=903",
    ctaLabel: "Browse open RFQs",
    ctaUrl: "/rfq",
    sortOrder: 0,
  },
];
