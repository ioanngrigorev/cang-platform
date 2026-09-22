import { relations } from "drizzle-orm";
import { adCampaigns, adEvents, adProducts, advertisements } from "./advertising";
import {
  badges,
  buyerProfiles,
  companies,
  companyBadges,
  companyCertifications,
  companyIndustries,
  companyInvitations,
  companyMedia,
  companyMembers,
  manufacturerProfiles,
} from "./companies";
import { beneficialOwners, complianceChecks, riskFlags, verifications } from "./compliance";
import { documents } from "./documents";
import { creditScores, financingApplications, financingOffers, financingProviders } from "./financing";
import { authAccounts, sessions, users, verificationTokens } from "./identity";
import { inspectionOrders, inspectionProviders } from "./inspection";
import { logisticsProviders, logisticsQuotes, logisticsRequests, shipmentEvents, shipments } from "./logistics";
import { conversationParticipants, conversations, messages } from "./messaging";
import { commissions, feeRules, plans, subscriptions } from "./monetization";
import { invoices, orderEvents, orderItems, orderStatuses, orders } from "./orders";
import { disputeMessages, disputes, paymentProviders, paymentTransactions, payments } from "./payments";
import {
  productCertifications,
  productImages,
  productPriceTiers,
  productSpecifications,
  productVariants,
  products,
  savedItems,
} from "./products";
import { certifications, countries, industries, productCategories, provinces } from "./reference";
import { reviews } from "./reviews";
import { quotationItems, quotations, rfqInvitations, rfqItems, rfqs } from "./rfq";
import { analyticsEvents, apiKeys, notifications, supportTicketMessages, supportTickets } from "./system";

// ---------- identity ----------
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(authAccounts),
  sessions: many(sessions),
  memberships: many(companyMembers),
  notifications: many(notifications),
  sentMessages: many(messages),
  savedItems: many(savedItems),
}));
export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(users, { fields: [authAccounts.userId], references: [users.id] }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}));

// ---------- reference ----------
export const countriesRelations = relations(countries, ({ many }) => ({
  provinces: many(provinces),
  companies: many(companies),
}));
export const provincesRelations = relations(provinces, ({ one, many }) => ({
  country: one(countries, { fields: [provinces.countryCode], references: [countries.code] }),
  companies: many(companies),
}));
export const industriesRelations = relations(industries, ({ many }) => ({
  companies: many(companyIndustries),
  categories: many(productCategories),
}));
export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: "categoryTree",
  }),
  children: many(productCategories, { relationName: "categoryTree" }),
  industry: one(industries, { fields: [productCategories.industryId], references: [industries.id] }),
  products: many(products),
  rfqs: many(rfqs),
}));
export const certificationsRelations = relations(certifications, ({ many }) => ({
  companies: many(companyCertifications),
  products: many(productCertifications),
}));

// ---------- companies ----------
export const companiesRelations = relations(companies, ({ one, many }) => ({
  country: one(countries, { fields: [companies.countryCode], references: [countries.code] }),
  province: one(provinces, { fields: [companies.provinceId], references: [provinces.id] }),
  members: many(companyMembers),
  invitations: many(companyInvitations),
  manufacturerProfile: one(manufacturerProfiles, {
    fields: [companies.id],
    references: [manufacturerProfiles.companyId],
  }),
  buyerProfile: one(buyerProfiles, { fields: [companies.id], references: [buyerProfiles.companyId] }),
  industries: many(companyIndustries),
  certifications: many(companyCertifications),
  media: many(companyMedia),
  badges: many(companyBadges),
  products: many(products),
  verifications: many(verifications),
  complianceChecks: many(complianceChecks),
  beneficialOwners: many(beneficialOwners),
  riskFlags: many(riskFlags),
  buyerRfqs: many(rfqs),
  rfqInvitations: many(rfqInvitations),
  quotations: many(quotations),
  buyerOrders: many(orders, { relationName: "orderBuyer" }),
  supplierOrders: many(orders, { relationName: "orderSupplier" }),
  receivedReviews: many(reviews, { relationName: "reviewTarget" }),
  authoredReviews: many(reviews, { relationName: "reviewAuthorCompany" }),
  subscriptions: many(subscriptions),
  commissions: many(commissions),
  adCampaigns: many(adCampaigns),
  apiKeys: many(apiKeys),
  financingApplications: many(financingApplications),
  creditScores: many(creditScores),
  logisticsRequests: many(logisticsRequests),
  inspectionOrders: many(inspectionOrders),
  documents: many(documents),
}));
export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, { fields: [companyMembers.companyId], references: [companies.id] }),
  user: one(users, { fields: [companyMembers.userId], references: [users.id] }),
}));
export const companyInvitationsRelations = relations(companyInvitations, ({ one }) => ({
  company: one(companies, { fields: [companyInvitations.companyId], references: [companies.id] }),
  invitedBy: one(users, { fields: [companyInvitations.invitedById], references: [users.id] }),
}));
export const manufacturerProfilesRelations = relations(manufacturerProfiles, ({ one }) => ({
  company: one(companies, { fields: [manufacturerProfiles.companyId], references: [companies.id] }),
}));
export const buyerProfilesRelations = relations(buyerProfiles, ({ one }) => ({
  company: one(companies, { fields: [buyerProfiles.companyId], references: [companies.id] }),
}));
export const companyIndustriesRelations = relations(companyIndustries, ({ one }) => ({
  company: one(companies, { fields: [companyIndustries.companyId], references: [companies.id] }),
  industry: one(industries, { fields: [companyIndustries.industryId], references: [industries.id] }),
}));
export const companyCertificationsRelations = relations(companyCertifications, ({ one }) => ({
  company: one(companies, { fields: [companyCertifications.companyId], references: [companies.id] }),
  certification: one(certifications, {
    fields: [companyCertifications.certificationId],
    references: [certifications.id],
  }),
  document: one(documents, { fields: [companyCertifications.documentId], references: [documents.id] }),
}));
export const companyMediaRelations = relations(companyMedia, ({ one }) => ({
  company: one(companies, { fields: [companyMedia.companyId], references: [companies.id] }),
}));
export const badgesRelations = relations(badges, ({ many }) => ({
  companies: many(companyBadges),
}));
export const companyBadgesRelations = relations(companyBadges, ({ one }) => ({
  company: one(companies, { fields: [companyBadges.companyId], references: [companies.id] }),
  badge: one(badges, { fields: [companyBadges.badgeId], references: [badges.id] }),
  grantedBy: one(users, { fields: [companyBadges.grantedById], references: [users.id] }),
}));

// ---------- compliance ----------
export const verificationsRelations = relations(verifications, ({ one, many }) => ({
  company: one(companies, { fields: [verifications.companyId], references: [companies.id] }),
  reviewedBy: one(users, { fields: [verifications.reviewedById], references: [users.id] }),
  documents: many(documents),
}));
export const complianceChecksRelations = relations(complianceChecks, ({ one }) => ({
  company: one(companies, { fields: [complianceChecks.companyId], references: [companies.id] }),
  user: one(users, { fields: [complianceChecks.userId], references: [users.id] }),
  reviewedBy: one(users, { fields: [complianceChecks.reviewedById], references: [users.id] }),
}));
export const beneficialOwnersRelations = relations(beneficialOwners, ({ one }) => ({
  company: one(companies, { fields: [beneficialOwners.companyId], references: [companies.id] }),
  idDocument: one(documents, { fields: [beneficialOwners.idDocumentId], references: [documents.id] }),
}));
export const riskFlagsRelations = relations(riskFlags, ({ one }) => ({
  company: one(companies, { fields: [riskFlags.companyId], references: [companies.id] }),
  resolvedBy: one(users, { fields: [riskFlags.resolvedById], references: [users.id] }),
}));

// ---------- documents ----------
export const documentsRelations = relations(documents, ({ one }) => ({
  ownerCompany: one(companies, { fields: [documents.ownerCompanyId], references: [companies.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedById], references: [users.id] }),
  order: one(orders, { fields: [documents.orderId], references: [orders.id] }),
  rfq: one(rfqs, { fields: [documents.rfqId], references: [rfqs.id] }),
  quotation: one(quotations, { fields: [documents.quotationId], references: [quotations.id] }),
  message: one(messages, { fields: [documents.messageId], references: [messages.id] }),
  verification: one(verifications, { fields: [documents.verificationId], references: [verifications.id] }),
  dispute: one(disputes, { fields: [documents.disputeId], references: [disputes.id] }),
  shipment: one(shipments, { fields: [documents.shipmentId], references: [shipments.id] }),
  financingApplication: one(financingApplications, {
    fields: [documents.financingApplicationId],
    references: [financingApplications.id],
  }),
}));

// ---------- products ----------
export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  reviewedBy: one(users, { fields: [products.reviewedById], references: [users.id] }),
  images: many(productImages),
  priceTiers: many(productPriceTiers),
  variants: many(productVariants),
  specifications: many(productSpecifications),
  certifications: many(productCertifications),
  reviews: many(reviews),
  orderItems: many(orderItems),
  conversations: many(conversations),
  savedBy: many(savedItems),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const productPriceTiersRelations = relations(productPriceTiers, ({ one }) => ({
  product: one(products, { fields: [productPriceTiers.productId], references: [products.id] }),
}));
export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));
export const productSpecificationsRelations = relations(productSpecifications, ({ one }) => ({
  product: one(products, { fields: [productSpecifications.productId], references: [products.id] }),
}));
export const productCertificationsRelations = relations(productCertifications, ({ one }) => ({
  product: one(products, { fields: [productCertifications.productId], references: [products.id] }),
  certification: one(certifications, {
    fields: [productCertifications.certificationId],
    references: [certifications.id],
  }),
}));
export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, { fields: [savedItems.userId], references: [users.id] }),
  product: one(products, { fields: [savedItems.productId], references: [products.id] }),
  supplier: one(companies, { fields: [savedItems.supplierCompanyId], references: [companies.id] }),
  rfq: one(rfqs, { fields: [savedItems.rfqId], references: [rfqs.id] }),
}));

// ---------- rfq ----------
export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
  buyerCompany: one(companies, { fields: [rfqs.buyerCompanyId], references: [companies.id] }),
  createdBy: one(users, { fields: [rfqs.createdById], references: [users.id] }),
  category: one(productCategories, { fields: [rfqs.categoryId], references: [productCategories.id] }),
  destinationCountry: one(countries, { fields: [rfqs.destinationCountryCode], references: [countries.code] }),
  awardedQuotation: one(quotations, {
    fields: [rfqs.awardedQuotationId],
    references: [quotations.id],
    relationName: "awardedQuotation",
  }),
  items: many(rfqItems),
  invitations: many(rfqInvitations),
  quotations: many(quotations, { relationName: "rfqQuotations" }),
  conversations: many(conversations),
  orders: many(orders),
  documents: many(documents),
}));
export const rfqItemsRelations = relations(rfqItems, ({ one, many }) => ({
  rfq: one(rfqs, { fields: [rfqItems.rfqId], references: [rfqs.id] }),
  quotationItems: many(quotationItems),
}));
export const rfqInvitationsRelations = relations(rfqInvitations, ({ one }) => ({
  rfq: one(rfqs, { fields: [rfqInvitations.rfqId], references: [rfqs.id] }),
  supplier: one(companies, { fields: [rfqInvitations.supplierCompanyId], references: [companies.id] }),
}));
export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  rfq: one(rfqs, { fields: [quotations.rfqId], references: [rfqs.id], relationName: "rfqQuotations" }),
  supplierCompany: one(companies, { fields: [quotations.supplierCompanyId], references: [companies.id] }),
  createdBy: one(users, { fields: [quotations.createdById], references: [users.id] }),
  parentQuotation: one(quotations, {
    fields: [quotations.parentQuotationId],
    references: [quotations.id],
    relationName: "quotationRevisions",
  }),
  revisions: many(quotations, { relationName: "quotationRevisions" }),
  items: many(quotationItems),
  orders: many(orders),
  conversations: many(conversations),
  documents: many(documents),
}));
export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
  rfqItem: one(rfqItems, { fields: [quotationItems.rfqItemId], references: [rfqItems.id] }),
}));

// ---------- messaging ----------
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  buyerCompany: one(companies, { fields: [conversations.buyerCompanyId], references: [companies.id] }),
  supplierCompany: one(companies, { fields: [conversations.supplierCompanyId], references: [companies.id] }),
  product: one(products, { fields: [conversations.productId], references: [products.id] }),
  rfq: one(rfqs, { fields: [conversations.rfqId], references: [rfqs.id] }),
  quotation: one(quotations, { fields: [conversations.quotationId], references: [quotations.id] }),
  order: one(orders, { fields: [conversations.orderId], references: [orders.id] }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));
export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, { fields: [conversationParticipants.userId], references: [users.id] }),
  company: one(companies, { fields: [conversationParticipants.companyId], references: [companies.id] }),
}));
export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  attachments: many(documents),
}));

// ---------- orders ----------
export const orderStatusesRelations = relations(orderStatuses, ({ many }) => ({
  orders: many(orders),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyerCompany: one(companies, { fields: [orders.buyerCompanyId], references: [companies.id], relationName: "orderBuyer" }),
  supplierCompany: one(companies, {
    fields: [orders.supplierCompanyId],
    references: [companies.id],
    relationName: "orderSupplier",
  }),
  rfq: one(rfqs, { fields: [orders.rfqId], references: [rfqs.id] }),
  quotation: one(quotations, { fields: [orders.quotationId], references: [quotations.id] }),
  status: one(orderStatuses, { fields: [orders.statusCode], references: [orderStatuses.code] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  invoices: many(invoices),
  shipments: many(shipments),
  documents: many(documents),
  disputes: many(disputes),
  reviews: many(reviews),
  conversations: many(conversations),
  inspections: many(inspectionOrders),
  financingApplications: many(financingApplications),
  logisticsRequests: many(logisticsRequests),
  commissions: many(commissions),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actor: one(users, { fields: [orderEvents.actorId], references: [users.id] }),
}));
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  issuerCompany: one(companies, { fields: [invoices.issuerCompanyId], references: [companies.id] }),
  recipientCompany: one(companies, { fields: [invoices.recipientCompanyId], references: [companies.id] }),
  document: one(documents, { fields: [invoices.documentId], references: [documents.id] }),
  payments: many(payments),
}));

// ---------- payments ----------
export const paymentProvidersRelations = relations(paymentProviders, ({ many }) => ({
  payments: many(payments),
}));
export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  payerCompany: one(companies, { fields: [payments.payerCompanyId], references: [companies.id] }),
  payeeCompany: one(companies, { fields: [payments.payeeCompanyId], references: [companies.id] }),
  provider: one(paymentProviders, { fields: [payments.providerId], references: [paymentProviders.id] }),
  transactions: many(paymentTransactions),
  commissions: many(commissions),
}));
export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, { fields: [paymentTransactions.paymentId], references: [payments.id] }),
  provider: one(paymentProviders, { fields: [paymentTransactions.providerId], references: [paymentProviders.id] }),
}));
export const disputesRelations = relations(disputes, ({ one, many }) => ({
  order: one(orders, { fields: [disputes.orderId], references: [orders.id] }),
  raisedByCompany: one(companies, { fields: [disputes.raisedByCompanyId], references: [companies.id] }),
  respondentCompany: one(companies, { fields: [disputes.respondentCompanyId], references: [companies.id] }),
  resolvedBy: one(users, { fields: [disputes.resolvedById], references: [users.id] }),
  messages: many(disputeMessages),
  documents: many(documents),
}));
export const disputeMessagesRelations = relations(disputeMessages, ({ one }) => ({
  dispute: one(disputes, { fields: [disputeMessages.disputeId], references: [disputes.id] }),
  author: one(users, { fields: [disputeMessages.authorId], references: [users.id] }),
}));

// ---------- logistics ----------
export const logisticsProvidersRelations = relations(logisticsProviders, ({ one, many }) => ({
  company: one(companies, { fields: [logisticsProviders.companyId], references: [companies.id] }),
  quotes: many(logisticsQuotes),
  shipments: many(shipments),
}));
export const logisticsRequestsRelations = relations(logisticsRequests, ({ one, many }) => ({
  requesterCompany: one(companies, { fields: [logisticsRequests.requesterCompanyId], references: [companies.id] }),
  order: one(orders, { fields: [logisticsRequests.orderId], references: [orders.id] }),
  quotes: many(logisticsQuotes),
}));
export const logisticsQuotesRelations = relations(logisticsQuotes, ({ one }) => ({
  request: one(logisticsRequests, { fields: [logisticsQuotes.requestId], references: [logisticsRequests.id] }),
  provider: one(logisticsProviders, { fields: [logisticsQuotes.providerId], references: [logisticsProviders.id] }),
}));
export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  provider: one(logisticsProviders, { fields: [shipments.providerId], references: [logisticsProviders.id] }),
  logisticsQuote: one(logisticsQuotes, { fields: [shipments.logisticsQuoteId], references: [logisticsQuotes.id] }),
  events: many(shipmentEvents),
  documents: many(documents),
}));
export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentEvents.shipmentId], references: [shipments.id] }),
}));

// ---------- inspection ----------
export const inspectionProvidersRelations = relations(inspectionProviders, ({ one, many }) => ({
  company: one(companies, { fields: [inspectionProviders.companyId], references: [companies.id] }),
  orders: many(inspectionOrders),
}));
export const inspectionOrdersRelations = relations(inspectionOrders, ({ one }) => ({
  order: one(orders, { fields: [inspectionOrders.orderId], references: [orders.id] }),
  requesterCompany: one(companies, { fields: [inspectionOrders.requesterCompanyId], references: [companies.id] }),
  provider: one(inspectionProviders, { fields: [inspectionOrders.providerId], references: [inspectionProviders.id] }),
  reportDocument: one(documents, { fields: [inspectionOrders.reportDocumentId], references: [documents.id] }),
}));

// ---------- financing ----------
export const financingProvidersRelations = relations(financingProviders, ({ many }) => ({
  applications: many(financingApplications),
  offers: many(financingOffers),
}));
export const financingApplicationsRelations = relations(financingApplications, ({ one, many }) => ({
  company: one(companies, { fields: [financingApplications.companyId], references: [companies.id] }),
  order: one(orders, { fields: [financingApplications.orderId], references: [orders.id] }),
  provider: one(financingProviders, { fields: [financingApplications.providerId], references: [financingProviders.id] }),
  acceptedOffer: one(financingOffers, {
    fields: [financingApplications.acceptedOfferId],
    references: [financingOffers.id],
    relationName: "acceptedOffer",
  }),
  offers: many(financingOffers, { relationName: "applicationOffers" }),
  documents: many(documents),
}));
export const financingOffersRelations = relations(financingOffers, ({ one }) => ({
  application: one(financingApplications, {
    fields: [financingOffers.applicationId],
    references: [financingApplications.id],
    relationName: "applicationOffers",
  }),
  provider: one(financingProviders, { fields: [financingOffers.providerId], references: [financingProviders.id] }),
}));
export const creditScoresRelations = relations(creditScores, ({ one }) => ({
  company: one(companies, { fields: [creditScores.companyId], references: [companies.id] }),
}));

// ---------- reviews ----------
export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  authorCompany: one(companies, {
    fields: [reviews.authorCompanyId],
    references: [companies.id],
    relationName: "reviewAuthorCompany",
  }),
  author: one(users, { fields: [reviews.authorUserId], references: [users.id] }),
  targetCompany: one(companies, {
    fields: [reviews.targetCompanyId],
    references: [companies.id],
    relationName: "reviewTarget",
  }),
  moderatedBy: one(users, { fields: [reviews.moderatedById], references: [users.id] }),
}));

// ---------- monetization ----------
export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
  feeRules: many(feeRules),
}));
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, { fields: [subscriptions.companyId], references: [companies.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
  paymentProvider: one(paymentProviders, {
    fields: [subscriptions.paymentProviderId],
    references: [paymentProviders.id],
  }),
}));
export const feeRulesRelations = relations(feeRules, ({ one, many }) => ({
  plan: one(plans, { fields: [feeRules.planId], references: [plans.id] }),
  commissions: many(commissions),
}));
export const commissionsRelations = relations(commissions, ({ one }) => ({
  company: one(companies, { fields: [commissions.companyId], references: [companies.id] }),
  order: one(orders, { fields: [commissions.orderId], references: [orders.id] }),
  payment: one(payments, { fields: [commissions.paymentId], references: [payments.id] }),
  feeRule: one(feeRules, { fields: [commissions.feeRuleId], references: [feeRules.id] }),
}));

// ---------- advertising ----------
export const adProductsRelations = relations(adProducts, ({ many }) => ({
  campaigns: many(adCampaigns),
}));
export const adCampaignsRelations = relations(adCampaigns, ({ one, many }) => ({
  company: one(companies, { fields: [adCampaigns.companyId], references: [companies.id] }),
  adProduct: one(adProducts, { fields: [adCampaigns.adProductId], references: [adProducts.id] }),
  ads: many(advertisements),
}));
export const advertisementsRelations = relations(advertisements, ({ one, many }) => ({
  campaign: one(adCampaigns, { fields: [advertisements.campaignId], references: [adCampaigns.id] }),
  product: one(products, { fields: [advertisements.productId], references: [products.id] }),
  supplierCompany: one(companies, { fields: [advertisements.supplierCompanyId], references: [companies.id] }),
  category: one(productCategories, { fields: [advertisements.categoryId], references: [productCategories.id] }),
  events: many(adEvents),
}));
export const adEventsRelations = relations(adEvents, ({ one }) => ({
  advertisement: one(advertisements, { fields: [adEvents.advertisementId], references: [advertisements.id] }),
}));

// ---------- system ----------
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }),
  company: one(companies, { fields: [analyticsEvents.companyId], references: [companies.id] }),
  product: one(products, { fields: [analyticsEvents.productId], references: [products.id] }),
}));
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  company: one(companies, { fields: [apiKeys.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [apiKeys.createdById], references: [users.id] }),
}));
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  requester: one(users, { fields: [supportTickets.requesterId], references: [users.id] }),
  company: one(companies, { fields: [supportTickets.companyId], references: [companies.id] }),
  assignee: one(users, { fields: [supportTickets.assigneeId], references: [users.id] }),
  messages: many(supportTicketMessages),
}));
export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportTicketMessages.ticketId], references: [supportTickets.id] }),
  author: one(users, { fields: [supportTicketMessages.authorId], references: [users.id] }),
}));
