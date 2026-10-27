const express = require('express');
const mongoose = require('mongoose');
const Settlement = require('../models/Settlement');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isMember, isValidAmount } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

// POST /api/groups/:groupId/settlements - record that `from` paid `to`
// Body: { from, to, amount (paise) }. Only the payer or the receiver can record it.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const group = req.group;
    const { from, to, amount } = req.body;
    const me = String(req.user._id);

    if (!isMember(group, from) || !isMember(group, to)) {
      throw new HttpError(400, 'Both people must be members of this group');
    }
    if (String(from) === String(to)) throw new HttpError(400, 'You cannot pay yourself');
    if (me !== String(from) && me !== String(to)) {
      throw new HttpError(403, 'You can only record payments you made or received');
    }
    if (!isValidAmount(amount)) throw new HttpError(400, 'Amount must be between ₹0.01 and ₹10,00,000');

    const settlement = await Settlement.create({
      group: group._id,
      from,
      to,
      amount,
      createdBy: req.user._id,
    });

    res.status(201).json(settlement);
  })
);

// DELETE /api/groups/:groupId/settlements/:settlementId - undo a payment you recorded
router.delete(
  '/:settlementId',
  asyncHandler(async (req, res) => {
    const { settlementId } = req.params;
    if (!mongoose.isValidObjectId(settlementId)) throw new HttpError(404, 'Payment not found');

    const settlement = await Settlement.findOne({ _id: settlementId, group: req.group._id });
    if (!settlement) throw new HttpError(404, 'Payment not found');
    if (String(settlement.createdBy) !== String(req.user._id)) {
      throw new HttpError(403, 'Only the person who recorded this payment can remove it');
    }

    await settlement.deleteOne();
    res.json({ message: 'Payment removed' });
  })
);

module.exports = router;
