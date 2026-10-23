export function createWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/[^\d]/g, "");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
