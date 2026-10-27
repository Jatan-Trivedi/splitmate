const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');
const loadGroup = require('../middleware/loadGroup');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { EMAIL_RE, isMember } = require('../utils/helpers');
const { computeNetBalances, simplifyDebts } = require('../utils/balances');
const expenseRoutes = require('./expenses');
const settlementRoutes = require('./settlements');

const router = express.Router();

router.use(auth); // every group route needs a logged-in user

// GET /api/groups - my groups, each with my current balance
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const groups = await Group.find({ members: req.user._id }).sort({ createdAt: -1 });
    const ids = groups.map((g) => g._id);

    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: { $in: ids } }),
      Settlement.find({ group: { $in: ids } }),
    ]);

    const myId = String(req.user._id);
    const result = groups.map((g) => {
      const net = computeNetBalances(
        expenses.filter((e) => e.group.equals(g._id)),
        settlements.filter((s) => s.group.equals(g._id))
      );
      return {
        _id: g._id,
        name: g.name,
        memberCount: g.members.length,
        myBalance: net[myId] || 0,
      };
    });

    res.json(result);
  })
);

// POST /api/groups - create a group (creator is the first member)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw new HttpError(400, 'Group name is required');
    if (name.length > 60) throw new HttpError(400, 'Group name must be 60 characters or fewer');

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: [req.user._id],
    });
    res.status(201).json({ _id: group._id, name: group.name });
  })
);

// Everything below needs a group the user belongs to
router.use('/:groupId', loadGroup);

// GET /api/groups/:groupId - members, expenses, payments and balances in one call
router.get(
  '/:groupId',
  asyncHandler(async (req, res) => {
    const group = req.group;

    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: group._id }).sort({ date: -1, createdAt: -1 }),
      Settlement.find({ group: group._id }).sort({ createdAt: -1 }),
    ]);

    const net = computeNetBalances(expenses, settlements);
    group.members.forEach((m) => {
      if (!(String(m._id) in net)) net[String(m._id)] = 0;
    });

    res.json({
      group,
      expenses,
      settlements,
      balances: { net, transfers: simplifyDebts(net) },
    });
  })
);

// POST /api/groups/:groupId/members - add an existing user by email
router.post(
  '/:groupId/members',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');

    const user = await User.findOne({ email });
    if (!user) {
      throw new HttpError(404, 'No account found for that email. Ask them to sign up first.');
    }
    if (isMember(req.group, user._id)) {
      throw new HttpError(409, `${user.name} is already in this group`);
    }

    await Group.updateOne({ _id: req.group._id }, { $addToSet: { members: user._id } });
    res.status(201).json({ member: { _id: user._id, name: user.name, email: user.email } });
  })
);

router.use('/:groupId/expenses', expenseRoutes);
router.use('/:groupId/settlements', settlementRoutes);

module.exports = router;
