/* Money and billing maths. `calcBill` takes the restaurant config explicitly so
   changing the tax or service rate in Settings immediately changes every total —
   the previous version closed over the seed config and ignored the live one. */

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function etb(n) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * @param {{ tickets: any[], discount?: number }} order
 * @param {{ serviceCharge: number, taxRate: number }} config
 */
export function calcBill(order, config) {
  const serviceRate = (config?.serviceCharge || 0) / 100;
  const taxRate = (config?.taxRate || 0) / 100;
  const lines = [];
  let itemSubtotal = 0;
  (order?.tickets || []).forEach((t) => {
    (t.items || []).forEach((it) => {
      if (it.cancelled) return;
      const lineTotal = round2(Number(it.price || 0) * Number(it.qty || 0));
      itemSubtotal += lineTotal;
      lines.push({ ...it, lineTotal });
    });
  });
  itemSubtotal = round2(itemSubtotal);
  const serviceCharge = round2(itemSubtotal * serviceRate);
  const discountRate = (order?.discount || 0) / 100;
  const discount = round2(itemSubtotal * discountRate);
  const totalPayable = round2(itemSubtotal - discount + serviceCharge);
  const taxableAmount = round2(itemSubtotal - discount);
  // Prices are tax-inclusive, so the tax inside the total is the extracted part.
  const taxPortion = round2((taxableAmount * taxRate) / (1 + taxRate));
  const netSales = round2(taxableAmount - taxPortion);
  return { lines, itemSubtotal, serviceCharge, discount, totalPayable, taxableAmount, taxPortion, netSales };
}

/**
 * PRD 11.7.3 & 11.7.4: Proportional calculation for credit notes.
 * @param {{ itemSubtotal: number, serviceCharge: number, totalPayable: number }} bill
 * @param {number} creditedItemAmount
 * @param {boolean} creditServiceCharge
 * @param {number} [taxRatePercent=15]
 */
export function calcCreditNote(bill, creditedItemAmount, creditServiceCharge, taxRatePercent = 15) {
  const taxRate = (taxRatePercent || 0) / 100;
  const itemAmt = round2(Math.min(creditedItemAmount, bill.itemSubtotal || 0));
  const taxReversed = round2((itemAmt * taxRate) / (1 + taxRate));
  const netSalesDeduction = round2(itemAmt - taxReversed);
  const serviceDeduction = creditServiceCharge && bill.itemSubtotal > 0
    ? round2((bill.serviceCharge * itemAmt) / bill.itemSubtotal)
    : 0;
  const totalRefund = round2(itemAmt + serviceDeduction);
  return {
    creditedItemAmount: itemAmt,
    taxReversed,
    netSalesDeduction,
    serviceDeduction,
    totalRefund,
  };
}