const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

// paise (integer) -> "₹1,234.50"
export const formatMoney = (paise) => inr.format(paise / 100);

// "450" or "450.5" -> 45000 / 45050 paise. Returns null for invalid input.
// Done with string maths so we never hit floating point rounding issues.
export function toPaise(input) {
  const text = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [rupees, decimals = ''] = text.split('.');
  return parseInt(rupees, 10) * 100 + parseInt(decimals.padEnd(2, '0'), 10);
}

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
