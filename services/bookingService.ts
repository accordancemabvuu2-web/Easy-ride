"use client";

import { db } from "@/lib/firebase";
import { createNotification } from "@/services/notificationService";
import type { Vehicle } from "@/Types/vehicle";
import type {
  BookingPaymentStatus,
  BookingStatus,
  RentalBooking,
} from "@/Types/booking";
import {
  generateId,
  nowIso,
  readRecords,
  removeRecord,
  upsertRecord,
  writeRecords,
} from "@/utils/marketplaceStore";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface CreateBookingInput {
  vehicle: Vehicle;
  renter: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  pickupDate: string;
  returnDate: string;
  message: string;
}

const STORAGE_KEY = "easy-ride:bookings";
const SERVICE_FEE_RATE = 0.05;
const BLOCKING_STATUSES: BookingStatus[] = [
  "awaiting_payment",
  "confirmed",
  "active",
];

function normalizeBooking(booking: RentalBooking): RentalBooking {
  return {
    ...booking,
    renterMessage: booking.renterMessage ?? "",
    createdAt: normalizeTimestamp(booking.createdAt),
    updatedAt: normalizeTimestamp(booking.updatedAt),
  };
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toISOString();
  }

  return nowIso();
}

function readLocalBookings(): RentalBooking[] {
  return readRecords<RentalBooking>(STORAGE_KEY).map(normalizeBooking);
}

function writeLocalBookings(bookings: RentalBooking[]) {
  writeRecords(STORAGE_KEY, bookings.map(normalizeBooking), 150);
}

function isAvailableWithinBookings(
  bookings: RentalBooking[],
  listingId: string,
  pickupDate: string,
  returnDate: string,
  ignoreBookingId?: string,
) {
  const requestedStart = parseISO(pickupDate);
  const requestedEnd = parseISO(returnDate);

  return !bookings.some((booking) => {
    if (booking.id === ignoreBookingId) return false;
    if (booking.listingId !== listingId) return false;
    if (!BLOCKING_STATUSES.includes(booking.status)) return false;

    const existingStart = parseISO(booking.pickupDate);
    const existingEnd = parseISO(booking.returnDate);
    return requestedStart <= existingEnd && requestedEnd >= existingStart;
  });
}

async function readBookings(): Promise<RentalBooking[]> {
  if (!db) {
    return readLocalBookings();
  }

  const snapshot = await getDocs(
    query(collection(db, "bookings"), orderBy("createdAt", "desc")),
  );

  return snapshot.docs.map((bookingDocument) =>
    normalizeBooking({
      id: bookingDocument.id,
      ...(bookingDocument.data() as Omit<RentalBooking, "id">),
    }),
  );
}

async function persistBooking(booking: RentalBooking) {
  if (!db) {
    const current = readLocalBookings();
    writeLocalBookings(upsertRecord(current, booking));
    return;
  }

  await setDoc(doc(db, "bookings", booking.id), {
    ...booking,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

async function updatePersistedBooking(
  bookingId: string,
  data: Partial<RentalBooking>,
) {
  if (!db) {
    const bookings = readLocalBookings();
    const next = bookings.map((booking) =>
      booking.id === bookingId
        ? normalizeBooking({
            ...booking,
            ...data,
            updatedAt: nowIso(),
          })
        : booking,
    );

    writeLocalBookings(next);
    return;
  }

  await updateDoc(doc(db, "bookings", bookingId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function getBookingById(
  bookingId: string,
): Promise<RentalBooking | null> {
  if (!db) {
    return readLocalBookings().find((item) => item.id === bookingId) ?? null;
  }

  const snapshot = await getDoc(doc(db, "bookings", bookingId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeBooking({
    id: snapshot.id,
    ...(snapshot.data() as Omit<RentalBooking, "id">),
  });
}

export async function getAllBookings(): Promise<RentalBooking[]> {
  const bookings = await readBookings();
  return bookings.sort((left, right) =>
    (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
  );
}

export async function getUserBookings(
  userId: string,
): Promise<RentalBooking[]> {
  if (!db) {
    return readLocalBookings().filter(
      (booking) => booking.renterId === userId || booking.ownerId === userId,
    ).sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
  }

  const renterQuery = query(
    collection(db, "bookings"),
    where("renterId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const ownerQuery = query(
    collection(db, "bookings"),
    where("ownerId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const [renterSnapshot, ownerSnapshot] = await Promise.all([
    getDocs(renterQuery),
    getDocs(ownerQuery),
  ]);

  const combined = [...renterSnapshot.docs, ...ownerSnapshot.docs].map(
    (bookingDocument) =>
      normalizeBooking({
        id: bookingDocument.id,
        ...(bookingDocument.data() as Omit<RentalBooking, "id">),
      }),
  );

  return Array.from(
    new Map(combined.map((booking) => [booking.id, booking])).values(),
  );
}

export async function checkRentalAvailability(
  listingId: string,
  pickupDate: string,
  returnDate: string,
  ignoreBookingId?: string,
): Promise<boolean> {
  const bookings = await readBookings();
  return isAvailableWithinBookings(
    bookings,
    listingId,
    pickupDate,
    returnDate,
    ignoreBookingId,
  );
}

export async function createRentalBooking(
  input: CreateBookingInput,
): Promise<RentalBooking> {
  if (input.vehicle.listingType !== "rent") {
    throw new Error("This vehicle is not available for rental.");
  }

  if (input.renter.id === input.vehicle.ownerId) {
    throw new Error("You cannot request your own vehicle.");
  }

  const pickup = parseISO(input.pickupDate);
  const returned = parseISO(input.returnDate);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(returned.getTime())) {
    throw new Error("Select valid rental dates.");
  }

  const totalDays = differenceInCalendarDays(returned, pickup) + 1;

  if (totalDays < 1) {
    throw new Error("The return date must be on or after the pickup date.");
  }

  const available = await checkRentalAvailability(
    input.vehicle.id,
    input.pickupDate,
    input.returnDate,
  );

  if (!available) {
    throw new Error("This vehicle is unavailable for the selected dates.");
  }

  const dailyRate = input.vehicle.price;
  const subtotal = dailyRate * totalDays;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE * 100) / 100;
  const deposit = 0;
  const totalAmount = subtotal + serviceFee + deposit;
  const booking: RentalBooking = normalizeBooking({
    id: generateId(),
    listingId: input.vehicle.id,
    listingTitle: `${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year}`,
    listingImage: input.vehicle.coverImage,
    renterId: input.renter.id,
    renterName: input.renter.name,
    renterEmail: input.renter.email,
    renterPhone: input.renter.phone,
    ownerId: input.vehicle.ownerId,
    ownerName: input.vehicle.ownerName,
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    totalDays,
    dailyRate,
    subtotal,
    serviceFee,
    deposit,
    totalAmount,
    currency: input.vehicle.currency,
    status: "pending",
    paymentStatus: "not_required",
    renterMessage: input.message.trim(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  await persistBooking(booking);

  await createNotification({
    userId: input.vehicle.ownerId,
    type: "booking",
    title: "Booking Request",
    message: `${input.renter.name} wants to rent your vehicle.`,
    actionUrl: `/bookings/${booking.id}`,
    link: `/bookings/${booking.id}`,
  });

  return booking;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  additionalData: Partial<RentalBooking> = {},
): Promise<void> {
  await updatePersistedBooking(bookingId, {
    ...additionalData,
    status,
  });
}

export async function approveBooking(
  bookingId: string,
  ownerId: string,
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.ownerId !== ownerId) {
    throw new Error("You cannot approve this booking.");
  }

  if (booking.status !== "pending") {
    throw new Error("This booking has already been processed.");
  }

  const available = await checkRentalAvailability(
    booking.listingId,
    booking.pickupDate,
    booking.returnDate,
    booking.id,
  );

  if (!available) {
    throw new Error("These dates are no longer available.");
  }

  await updateBookingStatus(bookingId, "awaiting_payment", {
    paymentStatus: "pending",
    ownerResponse: "Approved by owner",
  });

  await createNotification({
    userId: booking.renterId,
    type: "booking",
    title: "Booking Approved",
    message: "Your booking has been approved.",
    actionUrl: `/bookings/${booking.id}`,
    link: `/bookings/${booking.id}`,
  });
}

export async function rejectBooking(
  bookingId: string,
  ownerId: string,
  reason = "Declined by owner",
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.ownerId !== ownerId) {
    throw new Error("You cannot reject this booking.");
  }

  await updateBookingStatus(bookingId, "rejected", {
    paymentStatus: "not_required",
    rejectionReason: reason,
    ownerResponse: reason,
  });

  await createNotification({
    userId: booking.renterId,
    type: "booking",
    title: "Booking Rejected",
    message: "The owner rejected your booking.",
    actionUrl: `/bookings/${booking.id}`,
    link: `/bookings/${booking.id}`,
  });
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason = "Cancelled by user",
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.renterId !== userId && booking.ownerId !== userId) {
    throw new Error("You cannot cancel this booking.");
  }

  await updateBookingStatus(bookingId, "cancelled", {
    cancellationReason: reason,
    paymentStatus: "refunded",
  });

  await createNotification({
    userId: booking.ownerId === userId ? booking.renterId : booking.ownerId,
    type: "booking",
    title: "Booking Cancelled",
    message: `${booking.renterName} booking was cancelled.`,
    actionUrl: `/bookings/${booking.id}`,
    link: `/bookings/${booking.id}`,
  });
}

export async function confirmBookingPayment(
  bookingId: string,
  paymentId?: string,
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (
    !(await checkRentalAvailability(
      booking.listingId,
      booking.pickupDate,
      booking.returnDate,
      booking.id,
    ))
  ) {
    throw new Error("The selected dates were taken before payment completed.");
  }

  await updateBookingStatus(bookingId, "confirmed", {
    paymentStatus: "paid",
    paymentId,
  });
}

export async function activateBooking(
  bookingId: string,
  userId?: string,
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (userId && booking.renterId !== userId && booking.ownerId !== userId) {
    throw new Error("You cannot update this booking.");
  }

  await updateBookingStatus(bookingId, "active");
}

export async function completeBooking(
  bookingId: string,
  userId?: string,
): Promise<void> {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (userId && booking.renterId !== userId && booking.ownerId !== userId) {
    throw new Error("You cannot update this booking.");
  }

  await updateBookingStatus(bookingId, "completed");
}

export async function removeBooking(bookingId: string) {
  if (!db) {
    writeLocalBookings(removeRecord(readLocalBookings(), bookingId));
    return;
  }

  await updateDoc(doc(db, "bookings", bookingId), {
    status: "cancelled",
    updatedAt: Timestamp.now(),
  });
}

export function getBookingTimeline(status: BookingStatus) {
  return [
    { label: "Requested", done: true },
    {
      label: "Owner review",
      done: ["awaiting_payment", "confirmed", "active", "completed"].includes(
        status,
      ),
    },
    {
      label: "Payment",
      done: ["confirmed", "active", "completed"].includes(status),
    },
    {
      label: "Active",
      done: ["active", "completed"].includes(status),
    },
    { label: "Completed", done: status === "completed" },
  ];
}

export async function setBookingPaymentStatus(
  bookingId: string,
  paymentStatus: BookingPaymentStatus,
  paymentId?: string,
) {
  await updateBookingStatus(bookingId, "awaiting_payment", {
    paymentStatus,
    paymentId,
  });
}
