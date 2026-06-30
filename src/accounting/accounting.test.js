const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_BALANCE,
  createAccountStore,
  formatBalance,
  parseAmount,
  displayMenu,
  viewBalance,
  creditAccount,
  debitAccount,
  handleSelection,
} = require('./index');

function createMockLogger() {
  return {
    lines: [],
    log(...args) {
      this.lines.push(args.join(' '));
    },
  };
}

function createMockReadline(responses) {
  return {
    closed: false,
    prompts: [],
    responses: [...responses],
    async question(prompt) {
      this.prompts.push(prompt);
      if (this.responses.length === 0) {
        throw new Error(`No mock response for prompt: ${prompt}`);
      }

      return this.responses.shift();
    },
    close() {
      this.closed = true;
    },
  };
}

test('TC-001 displays the account management menu', () => {
  const logger = createMockLogger();

  displayMenu(logger);

  assert.deepEqual(logger.lines, [
    '--------------------------------',
    'Account Management System',
    '1. View Balance',
    '2. Credit Account',
    '3. Debit Account',
    '4. Exit',
    '--------------------------------',
  ]);
});

test('TC-002 shows the default starting balance', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();

  await viewBalance(store, logger);

  assert.equal(store.readBalance(), DEFAULT_BALANCE);
  assert.equal(logger.lines.at(-1), 'Current balance: 001000.00');
});

test('TC-015 verifies a fresh run starts with the documented default balance', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();

  await viewBalance(store, logger);

  assert.equal(store.readBalance(), DEFAULT_BALANCE);
  assert.equal(logger.lines.at(-1), 'Current balance: 001000.00');
});

test('TC-003 preserves a prior credit within the same run', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline(['250']);

  await creditAccount(rl, store, logger);
  await viewBalance(store, logger);

  assert.equal(store.readBalance(), 1250);
  assert.equal(logger.lines[0], 'Amount credited. New balance: 001250.00');
  assert.equal(logger.lines.at(-1), 'Current balance: 001250.00');
});

test('TC-004 credits a valid amount', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline(['250.00']);

  const updatedBalance = await creditAccount(rl, store, logger);

  assert.equal(updatedBalance, 1250);
  assert.equal(store.readBalance(), 1250);
  assert.equal(logger.lines.at(-1), 'Amount credited. New balance: 001250.00');
});

test('TC-005 credits a whole-number amount', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline(['100']);

  const updatedBalance = await creditAccount(rl, store, logger);

  assert.equal(updatedBalance, 1100);
  assert.equal(store.readBalance(), 1100);
  assert.equal(logger.lines.at(-1), 'Amount credited. New balance: 001100.00');
});

test('TC-006 debits the account with sufficient funds', async () => {
  const store = createAccountStore(1200);
  const logger = createMockLogger();
  const rl = createMockReadline(['200']);

  const updatedBalance = await debitAccount(rl, store, logger);

  assert.equal(updatedBalance, 1000);
  assert.equal(store.readBalance(), 1000);
  assert.equal(logger.lines.at(-1), 'Amount debited. New balance: 001000.00');
});

test('TC-007 rejects a debit that exceeds the available balance', async () => {
  const store = createAccountStore(100);
  const logger = createMockLogger();
  const rl = createMockReadline(['200']);

  const updatedBalance = await debitAccount(rl, store, logger);

  assert.equal(updatedBalance, null);
  assert.equal(store.readBalance(), 100);
  assert.equal(logger.lines.at(-1), 'Insufficient funds for this debit.');
});

test('TC-008 allows a debit that exactly matches the balance', async () => {
  const store = createAccountStore(200);
  const logger = createMockLogger();
  const rl = createMockReadline(['200']);

  const updatedBalance = await debitAccount(rl, store, logger);

  assert.equal(updatedBalance, 0);
  assert.equal(store.readBalance(), 0);
  assert.equal(logger.lines.at(-1), 'Amount debited. New balance: 000000.00');
});

test('TC-009 rejects an invalid menu choice', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline([]);

  const keepRunning = await handleSelection('5', rl, store, logger);

  assert.equal(keepRunning, true);
  assert.equal(logger.lines.at(-1), 'Invalid choice, please select 1-4.');
});

test('TC-010 exits the application from the menu', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline([]);

  const keepRunning = await handleSelection('4', rl, store, logger);

  assert.equal(keepRunning, false);
  assert.equal(logger.lines.length, 0);
});

test('TC-011 keeps balances isolated between runs', () => {
  const firstRunStore = createAccountStore();
  const secondRunStore = createAccountStore();

  firstRunStore.writeBalance(1450);

  assert.equal(firstRunStore.readBalance(), 1450);
  assert.equal(secondRunStore.readBalance(), DEFAULT_BALANCE);
});

test('TC-012 formats balances with two decimal places', () => {
  assert.equal(formatBalance(1000), '001000.00');
  assert.equal(formatBalance(1250.5), '001250.50');
});

test('TC-013 writes a credit before the next menu cycle', async () => {
  const store = createAccountStore();
  const logger = createMockLogger();
  const rl = createMockReadline(['250']);

  await creditAccount(rl, store, logger);
  await viewBalance(store, logger);

  assert.equal(store.readBalance(), 1250);
  assert.equal(logger.lines.at(-1), 'Current balance: 001250.00');
});

test('TC-014 writes a debit before the next menu cycle', async () => {
  const store = createAccountStore(1500);
  const logger = createMockLogger();
  const rl = createMockReadline(['300']);

  await debitAccount(rl, store, logger);
  await viewBalance(store, logger);

  assert.equal(store.readBalance(), 1200);
  assert.equal(logger.lines.at(-1), 'Current balance: 001200.00');
});
