/** Document types a supplier typically shares on an order. */
export const SELLER_ORDER_DOCUMENT_TYPES = ["PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING", "AIRWAY_BILL", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "PHOTO", "OTHER"] as const;
export type SellerOrderDocumentType = (typeof SELLER_ORDER_DOCUMENT_TYPES)[number];
