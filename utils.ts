/**
 * Shared utility functions for Balaji Pawn Brokers Ledger
 */

/**
 * Calculate interest amount for a loan.
 * Minimum 1 month is always charged.
 */
export const calculateInterest = (
  amount: number,
  rate: number,
  startDate: string,
  endDate?: string
): number => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const totalMonths = Math.max(1, Math.ceil(diffDays / 30));
  return (amount * rate / 100) * totalMonths;
};

/**
 * Returns the number of months a loan has been active (minimum 1).
 */
export const getLoanAgeMonths = (startDate: string, endDate?: string): number => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(diffDays / 30));
};

/**
 * Format a number as Indian Rupees string (e.g. 1,23,456).
 */
export const formatINR = (value: number): string =>
  value.toLocaleString('en-IN', { maximumFractionDigits: 0 });

/**
 * Zero-pad a serial number to 4 digits.
 */
export const formatSerial = (n: number): string =>
  String(n).padStart(4, '0');

/**
 * Generate a WhatsApp reminder message for a loan.
 */
export const generateWhatsAppMessage = (
  name: string,
  serial: number,
  amount: number,
  interest: number,
  loanDate: string
): string => {
  const total = amount + interest;
  const months = getLoanAgeMonths(loanDate);
  const msg =
    `Namaste ${name} ji,\n\n` +
    `This is a reminder from *Balaji Pawn Brokers*.\n\n` +
    `Your girvi (Ticket #${formatSerial(serial)}) is due for settlement:\n` +
    ` Principal: ${formatINR(amount)}\n` +
    ` Interest (${months} month${months > 1 ? 's' : ''}): ${formatINR(interest)}\n` +
    ` *Total Payable: ${formatINR(total)}*\n\n` +
    `Please visit us at your earliest convenience.\n` +
    ` Balaji Pawn Brokers`;
  return encodeURIComponent(msg);
};
