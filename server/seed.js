// Creates demo users and a sample group so the app can be explored quickly.
// Usage: npm run seed   (safe to re-run; it replaces the demo data)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
const Settlement = require('./models/Settlement');
const { splitEqually } = require('./utils/balances');

const DEMO_EMAILS = ['alice@example.com', 'bob@example.com', 'cara@example.com'];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // remove any previous demo data
  const old = await User.find({ email: { $in: DEMO_EMAILS } });
  const oldGroups = await Group.find({ createdBy: { $in: old.map((u) => u._id) } });
  const groupIds = oldGroups.map((g) => g._id);
  await Expense.deleteMany({ group: { $in: groupIds } });
  await Settlement.deleteMany({ group: { $in: groupIds } });
  await Group.deleteMany({ _id: { $in: groupIds } });
  await User.deleteMany({ email: { $in: DEMO_EMAILS } });

  const [alice, bob, cara] = await User.create([
    { name: 'Alice', email: DEMO_EMAILS[0], password: 'password123' },
    { name: 'Bob', email: DEMO_EMAILS[1], password: 'password123' },
    { name: 'Cara', email: DEMO_EMAILS[2], password: 'password123' },
  ]);
  const all = [alice._id, bob._id, cara._id];

  const group = await Group.create({ name: 'Goa Trip', createdBy: alice._id, members: all });

  const equal = (description, rupees, paidBy, who = all) =>
    Expense.create({
      group: group._id,
      description,
      amount: rupees * 100,
      paidBy,
      splitType: 'equal',
      splits: splitEqually(rupees * 100, who),
      createdBy: paidBy,
    });

  await equal('Beach villa', 12000, alice._id);
  await equal('Dinner at the shack', 2400, bob._id);
  await equal('Scooter rental', 900, cara._id, [alice._id, cara._id]);
  await Expense.create({
    group: group._id,
    description: 'Groceries',
    amount: 150000,
    paidBy: bob._id,
    splitType: 'exact',
    splits: [
      { user: alice._id, amount: 50000 },
      { user: bob._id, amount: 40000 },
      { user: cara._id, amount: 60000 },
    ],
    createdBy: bob._id,
  });
  await Settlement.create({ group: group._id, from: cara._id, to: alice._id, amount: 100000, createdBy: cara._id });

  console.log('Demo data created. Log in with alice@example.com / password123');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
