const express = require('express');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isMember, isValidAmount, rupees } = require('../utils/helpers');
const { splitEqually } = require('../utils/balances');

// mergeParams gives us :groupId from the parent router; req.group is set by loadGroup
const router = express.Router({ mergeParams: true });

// POST /api/groups/:groupId/expenses
// Body: { description, amount (paise), paidBy, splitType: 'equal' | 'exact',
//         participants: [userId]            (equal)
//         splits: [{ user, amount }]        (exact) }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const group = req.group;
    const description = String(req.body.description || '').trim();
    const { amount, paidBy, splitType = 'equal' } = req.body;

    if (!description) throw new HttpError(400, 'Description is required');
    if (description.length > 100) throw new HttpError(400, 'Description must be 100 characters or fewer');
    if (!isValidAmount(amount)) throw new HttpError(400, 'Amount must be between ₹0.01 and ₹10,00,000');
    if (!isMember(group, paidBy)) throw new HttpError(400, 'The payer must be a member of this group');

    let splits;

    if (splitType === 'equal') {
      const participants = [...new Set((req.body.participants || []).map(String))];
      if (participants.length === 0) throw new HttpError(400, 'Select at least one person to split with');
      if (!participants.every((id) => isMember(group, id))) {
        throw new HttpError(400, 'Everyone in the split must be a member of this group');
      }
      splits = splitEqually(amount, participants);
    } else if (splitType === 'exact') {
      const input = Array.isArray(req.body.splits) ? req.body.splits : [];
      const seen = new Set();
      splits = [];

      for (const entry of input) {
        const id = String(entry.user);
        if (!isMember(group, id)) throw new HttpError(400, 'Everyone in the split must be a member of this group');
        if (seen.has(id)) throw new HttpError(400, 'Each person can only appear once in a split');
        if (!Number.isInteger(entry.amount) || entry.amount < 0) {
          throw new HttpError(400, 'Split amounts must be valid amounts');
        }
        seen.add(id);
        if (entry.amount > 0) splits.push({ user: id, amount: entry.amount });
      }

      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      if (total !== amount) {
        throw new HttpError(400, `Split amounts add up to ${rupees(total)}, but the expense is ${rupees(amount)}`);
      }
    } else {
      throw new HttpError(400, 'Unknown split type');
    }

    const expense = await Expense.create({
      group: group._id,
      description,
      amount,
      paidBy,
      splitType,
      splits,
      createdBy: req.user._id,
    });

    res.status(201).json(expense);
  })
);

// DELETE /api/groups/:groupId/expenses/:expenseId
router.delete(
  '/:expenseId',
  asyncHandler(async (req, res) => {
    const { expenseId } = req.params;
    if (!mongoose.isValidObjectId(expenseId)) throw new HttpError(404, 'Expense not found');

    const expense = await Expense.findOne({ _id: expenseId, group: req.group._id });
    if (!expense) throw new HttpError(404, 'Expense not found');

    const me = String(req.user._id);
    if (String(expense.createdBy) !== me && String(expense.paidBy) !== me) {
      throw new HttpError(403, 'Only the person who added or paid for this expense can delete it');
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  })
);

module.exports = router;
