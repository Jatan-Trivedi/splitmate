# SplitMate

A group expense splitter. Create a group, add friends, log shared expenses, and SplitMate tells everyone exactly who owes whom, using the fewest possible payments.

**Live app:** https://splitmate-lty0.onrender.com
**Demo video:** https://github.com/Jatan-Trivedi/splitmate

## Problem Statement

When friends, flatmates or travellers share costs, one person pays and everyone else loses track. Chat threads and spreadsheets get messy, uneven splits are hard to calculate, and settling up turns into awkward maths ("I paid for dinner, you paid for the cab, so who owes what?").

## Target Users

Small groups who share money regularly: flatmates, trip groups, couples, office lunch groups.

## Solution

Everyone in a group logs expenses as they happen. SplitMate keeps a running ledger, works out each person's net balance, and suggests a minimal set of payments to settle everything. Payments can be recorded in the app, which updates balances straight away.

## Key Features

1. **Accounts** - register / log in with email and password (JWT sessions, bcrypt-hashed passwords).
2. **Groups** - create groups and add members by the email they signed up with. Only members can see a group.
3. **Expenses with two split modes** - split equally between any subset of members, or enter exact amounts per person (validated so they add up to the total). Choose who paid.
4. **Live balances + settle-up suggestions** - per-person net balances, and a simplified list like "Bob pays Alice ₹800" instead of a web of small debts.
5. **Record payments** - payer or receiver can record a payment; balances update instantly. Mistakes can be undone (expenses and payments can be deleted by the person who created them).
6. **Dashboard** - all your groups with your balance in each ("you owe ₹X" / "you are owed ₹X").

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Vite, plain CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens, bcryptjs |
| Security | helmet, input validation, env-based secrets |
| Tests | Node's built-in test runner (`node --test`) |

## Architecture

Classic MERN: a React single-page app talks to a REST API built with Express, which stores data in MongoDB. In production the Express server also serves the built React app, so everything runs as one service.

```
React SPA (client/)  --fetch /api-->  Express API (server/)  --Mongoose-->  MongoDB
```

```
server/
  server.js            app setup, static serving, startup
  config/db.js         MongoDB connection
  models/              User, Group, Expense, Settlement
  middleware/          auth (JWT), loadGroup (membership check), errorHandler
  routes/              auth, groups, expenses, settlements
  utils/balances.js    all money maths (pure functions, unit tested)
  tests/               unit tests for the balance logic
  seed.js              demo data
client/
  src/api.js           fetch wrapper (auth header, error handling)
  src/AuthContext.jsx  login state
  src/pages/           AuthPage, Dashboard, GroupPage
  src/components/      Navbar, ExpenseForm, BalanceTag
```

### Key engineering decisions

- **Money is stored as integer paise**, never floats, so totals always add up exactly. When an amount doesn't divide evenly (e.g. ₹10 between 3 people) the leftover paise are handed out one by one so the splits still sum to the total.
- **The server is the source of truth.** Equal splits are calculated on the server, and every request is validated (amounts, membership, split totals), not just in the UI.
- **Balances are computed from the ledger, not stored.** Net balance = money paid - share owed, adjusted by recorded payments. Deleting an expense or payment can never leave stale totals.
- **Debt simplification:** a greedy match of the biggest debtor with the biggest creditor, which settles a group of n people in at most n-1 payments.
- **Authorization:** the `loadGroup` middleware checks membership for every `/api/groups/:groupId/...` request; only an expense's creator/payer can delete it; only the payer or receiver can record a payment.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/groups` | My groups with my balance |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Members, expenses, payments, balances |
| POST | `/api/groups/:id/members` | Add member by email |
| POST | `/api/groups/:id/expenses` | Add expense |
| DELETE | `/api/groups/:id/expenses/:expenseId` | Delete expense |
| POST | `/api/groups/:id/settlements` | Record a payment |
| DELETE | `/api/groups/:id/settlements/:settlementId` | Remove a payment |

Errors are returned as `{ "message": "..." }` with a suitable status code (400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 duplicate).

## Local Setup

Requirements: Node.js 18+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
# 1. Install dependencies
npm run install-all

# 2. Configure the server
cp server/.env.example server/.env
#    then edit server/.env (see "Environment Variables")

# 3. (Optional) load demo data
npm run seed --prefix server

# 4. Start the API (terminal 1) -> http://localhost:5000
npm run dev --prefix server

# 5. Start the React app (terminal 2) -> http://localhost:5173
npm run dev --prefix client
```

In development, Vite proxies `/api` to the Express server, so no extra configuration is needed.

**Demo accounts** (after `npm run seed --prefix server`): `alice@example.com`, `bob@example.com`, `cara@example.com`, all with password `password123`. They share a group called "Goa Trip".

**Run the tests:** `npm test`

## Environment Variables

`server/.env` (copy from `server/.env.example`; never commit it):

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `PORT` | no | Server port (default 5000; hosts usually set this) |
| `CLIENT_URL` | no | Only if the React app is hosted on a different domain than the API |

`client/.env` is optional: `VITE_API_URL` is only needed if the API is on a different domain.

## Deployment

The whole app deploys as **one web service** (for example on Render) plus a free MongoDB Atlas database.

1. **Database:** create a free cluster on MongoDB Atlas, add a database user, and under *Network Access* allow `0.0.0.0/0`. Copy the connection string.
2. **Push the project to GitHub.**
3. **Create a Web Service** on Render from the repo, with:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Environment variables: `MONGODB_URI`, `JWT_SECRET` (and `NODE_VERSION=20` if needed)
4. Open the Render URL. The Express server serves both the API (`/api/...`) and the React app.

Deployed app: `<add your deployed URL here>`

## Known Limitations

- Members can be added but not removed (removing someone would change past balances).
- Currency is fixed to INR (₹).
- Members must already have an account to be added to a group.
- No password reset or email notifications.

## Credits

Built with React, Express, MongoDB and Mongoose. AI tools were used to help scaffold the project.
