"use client";

type CallableKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

function lazyMethod<
  T extends object,
  K extends CallableKeys<T>,
>(load: () => Promise<T>, method: K) {
  type Operation = Extract<T[K], (...parameters: never[]) => unknown>;
  return (...args: Parameters<Operation>): Promise<Awaited<ReturnType<Operation>>> =>
    load().then((service) => {
      const operation = service[method] as Operation;
      return operation(...args) as Awaited<ReturnType<Operation>>;
    });
}

function lazySubscription<
  T extends object,
  K extends CallableKeys<T>,
>(load: () => Promise<T>, method: K) {
  type Operation = Extract<T[K], (...parameters: never[]) => () => void>;
  return (...args: Parameters<Operation>) => {
    let active = true;
    let unsubscribe = () => {};

    void load()
      .then((service) => {
        if (!active) return;
        const operation = service[method] as Operation;
        unsubscribe = operation(...args);
      })
      .catch((error: unknown) => {
        console.error(`Could not initialize Firebase subscription (${String(method)}):`, error);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  };
}

const loadAdmin = () => import("@/services/adminService");
const loadAnalytics = () => import("@/services/analyticsService");
const loadAudit = () => import("@/services/auditService");
const loadBooking = () => import("@/services/bookingService");
const loadDealer = () => import("@/services/dealerService");
const loadFavorite = () => import("@/services/favoriteService");
const loadListing = () => import("@/services/listingService");
const loadMessage = () => import("@/services/messageService");
const loadNotification = () => import("@/services/notificationService");
const loadOffer = () => import("@/services/offerService");
const loadPayment = () => import("@/services/paymentService");
const loadPromotion = () => import("@/services/promotionService");
const loadReport = () => import("@/services/reportService");
const loadReview = () => import("@/services/reviewService");
const loadSupport = () => import("@/services/supportService");
const loadVerification = () => import("@/services/verificationService");

export const getAdminUsers = lazyMethod(loadAdmin, "getAdminUsers");
export const getAdminUserDetails = lazyMethod(loadAdmin, "getAdminUserDetails");
export const getAdminUserCount = lazyMethod(loadAdmin, "getAdminUserCount");
export const getAdminListings = lazyMethod(loadAdmin, "getAdminListings");
export const getAdminSummary = lazyMethod(loadAdmin, "getAdminSummary");
export const getSellerAnalytics = lazyMethod(loadAnalytics, "getSellerAnalytics");
export const recordContactClick = lazyMethod(loadAnalytics, "recordContactClick");
export const recordListingView = lazyMethod(loadAnalytics, "recordListingView");
export const createAuditLog = lazyMethod(loadAudit, "createAuditLog");
export const getAuditLogs = lazyMethod(loadAudit, "getAuditLogs");
export const getBookingById = lazyMethod(loadBooking, "getBookingById");
export const getAllBookings = lazyMethod(loadBooking, "getAllBookings");
export const getUserBookings = lazyMethod(loadBooking, "getUserBookings");
export const approveBooking = lazyMethod(loadBooking, "approveBooking");
export const rejectBooking = lazyMethod(loadBooking, "rejectBooking");
export const cancelBooking = lazyMethod(loadBooking, "cancelBooking");
export const activateBooking = lazyMethod(loadBooking, "activateBooking");
export const completeBooking = lazyMethod(loadBooking, "completeBooking");
export const updateBookingStatus = lazyMethod(loadBooking, "updateBookingStatus");
export const createDealerProfile = lazyMethod(loadDealer, "createDealerProfile");
export const getDealerByOwner = lazyMethod(loadDealer, "getDealerByOwner");
export const getDealers = lazyMethod(loadDealer, "getDealers");
export const updateDealerStatus = lazyMethod(loadDealer, "updateDealerStatus");
export const getUserFavoriteListings = lazyMethod(loadFavorite, "getUserFavoriteListings");
export const getActiveListings = lazyMethod(loadListing, "getActiveListings");
export const getActiveListingPage = lazyMethod(loadListing, "getActiveListingPage");
export const getPendingListings = lazyMethod(loadListing, "getPendingListings");
export const getMyListings = lazyMethod(loadListing, "getMyListings");
export const getListingById = lazyMethod(loadListing, "getListingById");
export const createListing = lazyMethod(loadListing, "createListing");
export const updateListingStatus = lazyMethod(loadListing, "updateListingStatus");
export const deleteListing = lazyMethod(loadListing, "deleteListing");
export const uploadVehicleImages = lazyMethod(loadListing, "uploadVehicleImages");
export const startConversation = lazyMethod(loadMessage, "startConversation");
export const sendMessage = lazyMethod(loadMessage, "sendMessage");
export const markConversationRead = lazyMethod(loadMessage, "markConversationRead");
export const getConversationById = lazyMethod(loadMessage, "getConversationById");
export const getUserConversations = lazyMethod(loadMessage, "getUserConversations");
export const subscribeToMessages = lazySubscription(loadMessage, "subscribeToMessages");
export const subscribeToUserConversations = lazySubscription(loadMessage, "subscribeToUserConversations");
type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: import("@/Types/notification").NotificationType;
  actionUrl?: string;
  link?: string;
  icon?: string;
};

export function createNotification(input: CreateNotificationInput): Promise<void>;
export function createNotification(
  userId: string,
  title: string,
  message: string,
  type: import("@/Types/notification").NotificationType,
  actionUrl?: string,
  icon?: string,
): Promise<void>;
export function createNotification(...args: [CreateNotificationInput] | [string, string, string, import("@/Types/notification").NotificationType, string?, string?]) {
  return loadNotification().then(({ createNotification: operation }) =>
    (operation as (...parameters: typeof args) => Promise<void>)(...args),
  );
}
export const getUserNotifications = lazyMethod(loadNotification, "getUserNotifications");
export const markNotificationRead = lazyMethod(loadNotification, "markNotificationRead");
export const markAllNotificationsRead = lazyMethod(loadNotification, "markAllNotificationsRead");
export const subscribeNotifications = lazySubscription(loadNotification, "subscribeNotifications");
export const getAllOffers = lazyMethod(loadOffer, "getAllOffers");
export const getUserOffers = lazyMethod(loadOffer, "getUserOffers");
export const createVehicleOffer = lazyMethod(loadOffer, "createVehicleOffer");
export const acceptOffer = lazyMethod(loadOffer, "acceptOffer");
export const rejectOffer = lazyMethod(loadOffer, "rejectOffer");
export const counterOffer = lazyMethod(loadOffer, "counterOffer");
export const acceptCounterOffer = lazyMethod(loadOffer, "acceptCounterOffer");
export const withdrawOffer = lazyMethod(loadOffer, "withdrawOffer");
export const completeVehicleSale = lazyMethod(loadOffer, "completeVehicleSale");
export const createBookingPayment = lazyMethod(loadPayment, "createBookingPayment");
export const createMockPayment = lazyMethod(loadPayment, "createMockPayment");
export const completeMockPayment = lazyMethod(loadPayment, "completeMockPayment");
export const getAllPayments = lazyMethod(loadPayment, "getAllPayments");
export const createPromotion = lazyMethod(loadPromotion, "createPromotion");
export const getPromotionByListingId = lazyMethod(loadPromotion, "getPromotionByListingId");
export const createListingReport = lazyMethod(loadReport, "createListingReport");
export const getListingReports = lazyMethod(loadReport, "getListingReports");
export const getReportsForListing = lazyMethod(loadReport, "getReportsForListing");
export const resolveListingReport = lazyMethod(loadReport, "resolveListingReport");
export const createReview = lazyMethod(loadReview, "createReview");
export const createSupportTicket = lazyMethod(loadSupport, "createSupportTicket");
export const getSupportTickets = lazyMethod(loadSupport, "getSupportTickets");
export const updateSupportTicket = lazyMethod(loadSupport, "updateSupportTicket");
export const submitVerificationRequest = lazyMethod(loadVerification, "submitVerificationRequest");
export const getVerificationRequests = lazyMethod(loadVerification, "getVerificationRequests");
export const reviewVerificationRequest = lazyMethod(loadVerification, "reviewVerificationRequest");
