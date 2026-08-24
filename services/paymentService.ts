"use client";

import { db } from "@/lib/firebase";
import { createNotification } from "@/services/notificationService";
import { getBookingById } from "@/services/bookingService";
import { confirmBookingPayment } from "@/services/bookingService";
import { activatePromotion } from "@/services/promotionService";
import type { EasyRidePayment, PaymentPurpose } from "@/Types/payment";
import type { RentalBooking } from "@/Types/booking";
import {
  generateId,
  nowIso,
  readRecords,
  upsertRecord,
  writeRecords,
} from "@/utils/marketplaceStore";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  runTransaction,
} from "firebase/firestore";

interface CreatePaymentInput {
  userId: string;
  purpose: PaymentPurpose;
  referenceId: string;
  amount: number;
  currency: string;
}

interface CreateBookingPaymentInput {
  userId: string;
  bookingId: string;
  amount: number;
  currency: string;
}

const STORAGE_KEY = "easy-ride:payments";

function readPayments() {
  return readRecords<EasyRidePayment>(STORAGE_KEY);
}

function writePayments(payments: EasyRidePayment[]) {
  writeRecords(STORAGE_KEY, payments, 200);
}

function normalizePayment(payment: EasyRidePayment): EasyRidePayment {
  return {
    ...payment,
    createdAt: payment.createdAt ?? nowIso(),
    updatedAt: payment.updatedAt ?? nowIso(),
  };
}

async function addPaymentRecord(input: CreatePaymentInput) {
  const payment: EasyRidePayment = normalizePayment({
    id: generateId(),
    userId: input.userId,
    purpose: input.purpose,
    referenceId: input.referenceId,
    provider: "mock",
    amount: input.amount,
    currency: input.currency,
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  if (!db) {
    writePayments(upsertRecord(readPayments(), payment));
    return payment.id;
  }

  const result = await addDoc(collection(db, "payments"), {
    ...payment,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return result.id;
}

export async function createBookingPayment(
  input: CreateBookingPaymentInput,
): Promise<string> {
  const booking = await getBookingById(input.bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.renterId !== input.userId) {
    throw new Error("Only the renter can pay for this booking.");
  }

  if (booking.status !== "awaiting_payment") {
    throw new Error("This booking is not ready for payment.");
  }

  return addPaymentRecord({
    userId: input.userId,
    purpose: "rental_booking",
    referenceId: input.bookingId,
    amount: input.amount,
    currency: input.currency,
  });
}

export async function createMockPayment(
  input: CreatePaymentInput,
): Promise<string> {
  return addPaymentRecord(input);
}

export function getPaymentById(paymentId: string) {
  return readPayments().find((payment) => payment.id === paymentId) ?? null;
}

export function getUserPayments(userId: string) {
  return readPayments()
    .filter((payment) => payment.userId === userId)
    .sort((left, right) =>
      (right.createdAt ?? "").toString().localeCompare((left.createdAt ?? "").toString()),
    );
}

export function getAllPayments() {
  return readPayments().sort((left, right) =>
    (right.createdAt ?? "").toString().localeCompare((left.createdAt ?? "").toString()),
  );
}

export async function completeMockPayment(
  paymentId: string,
  currentUserId?: string,
): Promise<void> {
  const firestore = db;

  if (firestore) {
    let bookingIdForNotification: string | null = null;

    await runTransaction(firestore, async (transaction) => {
      const paymentReference = doc(firestore, "payments", paymentId);
      const paymentSnapshot = await transaction.get(paymentReference);

      if (!paymentSnapshot.exists()) {
        throw new Error("Payment not found.");
      }

      const payment = {
        id: paymentSnapshot.id,
        ...paymentSnapshot.data(),
      } as EasyRidePayment;

      if (currentUserId && payment.userId !== currentUserId) {
        throw new Error("You cannot complete this payment.");
      }

      if (payment.status !== "pending") {
        throw new Error("This payment has already been processed.");
      }

      transaction.update(paymentReference, {
        status: "successful",
        providerReference: `MOCK-${Date.now()}`,
        updatedAt: Timestamp.now(),
      });

      if (payment.purpose === "rental_booking") {
        const bookingReference = doc(firestore, "bookings", payment.referenceId);
        const bookingSnapshot = await transaction.get(bookingReference);

        if (!bookingSnapshot.exists()) {
          throw new Error("The linked booking no longer exists.");
        }

        const booking = bookingSnapshot.data() as RentalBooking;

        if (booking.status !== "awaiting_payment") {
          throw new Error("The booking is no longer awaiting payment.");
        }

        transaction.update(bookingReference, {
          status: "confirmed",
          paymentStatus: "paid",
          updatedAt: Timestamp.now(),
        });

        bookingIdForNotification = payment.referenceId;
      }
    });

    if (bookingIdForNotification) {
      const booking = await getBookingById(bookingIdForNotification);
      if (booking) {
        await createNotification({
          userId: booking.ownerId,
          type: "payment",
          title: "Payment Received",
          message: "Buyer completed payment.",
          actionUrl: `/bookings/${booking.id}`,
          link: `/bookings/${booking.id}`,
        });
      }
    }

    return;
  }

  const payments = readPayments();
  const payment = payments.find((item) => item.id === paymentId);

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  if (currentUserId && payment.userId !== currentUserId) {
    throw new Error("You cannot complete this payment.");
  }

  if (payment.status !== "pending") {
    throw new Error("This payment has already been processed.");
  }

  const nextPayment: EasyRidePayment = {
    ...payment,
    status: "successful",
    providerReference: `MOCK-${Date.now()}`,
    updatedAt: nowIso(),
  };

  writePayments(upsertRecord(payments.filter((item) => item.id !== paymentId), nextPayment));

  if (payment.purpose === "rental_booking") {
    await confirmBookingPayment(payment.referenceId, paymentId);

    const booking = await getBookingById(payment.referenceId);
    if (booking) {
      await createNotification({
        userId: booking.ownerId,
        type: "payment",
        title: "Payment Received",
        message: "Buyer completed payment.",
        actionUrl: `/bookings/${booking.id}`,
        link: `/bookings/${booking.id}`,
      });
    }
  }

  if (payment.purpose === "listing_promotion") {
    activatePromotion(payment.referenceId, paymentId);
  }
}

export async function createBookingPaymentAlias(
  input: CreateBookingPaymentInput,
): Promise<string> {
  return createBookingPayment(input);
}
