const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Largest single expense / payment we accept, in paise (Rs 10,00,000)
const MAX_AMOUNT = 100_000_000;

const isMember = (group, userId) =>
  group.members.some((m) => String(m._id || m) === String(userId));

const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

const isValidAmount = (n) => Number.isInteger(n) && n > 0 && n <= MAX_AMOUNT;

module.exports = { EMAIL_RE, MAX_AMOUNT, isMember, rupees, isValidAmount };
