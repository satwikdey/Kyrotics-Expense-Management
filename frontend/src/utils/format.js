/**
 * Financial & Date Formatting Utilities for INR (Paise arithmetic) & IST
 */

export function parseRupeesToPaise(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().replace(/,/g, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(str)) {
    return null;
  }
  const parts = str.split('.');
  const rupees = parseInt(parts[0], 10);
  const paisePart = parts[1] ? parseInt(parts[1].padEnd(2, '0'), 10) : 0;
  if (rupees > 999999999) return null;
  const total = rupees * 100 + paisePart;
  return total <= 0 ? null : total;
}

export function formatInr(amountPaise, withSymbol = true) {
  if (amountPaise === null || amountPaise === undefined) return '—';
  const isNegative = amountPaise < 0;
  const absPaise = Math.abs(amountPaise);
  const rupees = Math.floor(absPaise / 100);
  const paise = absPaise % 100;

  const rupeeStr = String(rupees);
  let formattedRupees = rupeeStr;
  if (rupeeStr.length > 3) {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);
    formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const prefix = (isNegative ? '-' : '') + (withSymbol ? '₹' : '');
  return `${prefix}${formattedRupees}.${String(paise).padStart(2, '0')}`;
}

export function paiseToRupees(amountPaise, withSymbol = true) {
  return formatInr(amountPaise, withSymbol);
}

export function formatIstDate(dateVal, includeTime = true) {
  if (!dateVal) return '—';
  const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const dateStr = d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr} IST`;
}

export function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str === '') return '';
  const dangerous = ['=', '+', '-', '@', '\t', '\r', '\n'];
  const firstChar = str[0];
  const trimmed = str.trimStart();
  const trimmedFirst = trimmed ? trimmed[0] : '';
  if (dangerous.includes(firstChar) || ['=', '+', '-', '@'].includes(trimmedFirst)) {
    return "'" + str;
  }
  return str;
}

