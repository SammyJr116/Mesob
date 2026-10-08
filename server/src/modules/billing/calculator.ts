export interface BillItemInput {
  name: string;
  quantity: number;
  unitPrice: number;
  cancelled?: boolean;
}

export interface BillCalculationResult {
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  netSales: number;
  total: number;
}

/**
 * Standard monetary round half-up to 2 decimals (PRD 4.2.3)
 */
export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Strict Financial Bill Calculation Engine (PRD 11.1)
 *
 * 1. Item subtotal = sum of (unit price x quantity) for all non-cancelled items.
 * 2. Service charge = service charge % x item subtotal (calculated before discount; not taxed).
 * 3. Discount = discount % x item subtotal (does not reduce service charge).
 * 4. Total payable = item subtotal - discount + service charge.
 * 5. Taxable amount = item subtotal - discount.
 * 6. Tax portion = taxable amount x rate / (1 + rate) (extracted from items only).
 * 7. Net sales = taxable amount - tax portion.
 */
export function calculateBill(
  items: BillItemInput[],
  options: {
    discountPercent?: number;
    taxRatePercent?: number; // e.g. 15 for 15%
    serviceChargePercent?: number; // e.g. 10 for 10%
  } = {}
): BillCalculationResult {
  const taxRate = (options.taxRatePercent ?? 15) / 100;
  const serviceChargeRate = (options.serviceChargePercent ?? 10) / 100;
  const discountRate = Math.min(100, Math.max(0, options.discountPercent ?? 0)) / 100;

  // 1. Item Subtotal (tax-inclusive menu prices)
  const nonCancelled = items.filter((i) => !i.cancelled);
  const rawSubtotal = nonCancelled.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const subtotal = round2(rawSubtotal);

  // 2. Service Charge (calculated on full subtotal BEFORE discount)
  const serviceChargeAmount = round2(subtotal * serviceChargeRate);

  // 3. Discount (applied to items only)
  const discountAmount = round2(subtotal * discountRate);

  // 4. Taxable Amount & Tax Extraction (extracted from food/drink portion only)
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));
  const taxAmount = round2(taxableAmount * (taxRate / (1 + taxRate)));

  // 5. Net Sales
  const netSales = round2(taxableAmount - taxAmount);

  // 6. Total Payable
  const total = round2(taxableAmount + serviceChargeAmount);

  return {
    subtotal,
    discountRate: discountRate * 100,
    discountAmount,
    serviceChargeRate: serviceChargeRate * 100,
    serviceChargeAmount,
    taxableAmount,
    taxRate: taxRate * 100,
    taxAmount,
    netSales,
    total,
  };
}
