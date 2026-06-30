const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const DEFAULT_BALANCE = 1000.0;

function createAccountStore(initialBalance = DEFAULT_BALANCE) {
  let balance = initialBalance;

  return {
    readBalance() {
      return balance;
    },
    writeBalance(nextBalance) {
      balance = nextBalance;
    },
  };
}

const defaultStore = createAccountStore();

function formatBalance(amount) {
  return amount.toFixed(2).padStart(9, '0');
}

function parseAmount(input) {
  const amount = Number(input);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return amount;
}

function displayMenu(logger = console) {
  logger.log('--------------------------------');
  logger.log('Account Management System');
  logger.log('1. View Balance');
  logger.log('2. Credit Account');
  logger.log('3. Debit Account');
  logger.log('4. Exit');
  logger.log('--------------------------------');
}

async function promptForChoice(rl) {
  const answer = await rl.question('Enter your choice (1-4): ');
  return answer.trim();
}

async function viewBalance(store = defaultStore, logger = console) {
  logger.log(`Current balance: ${formatBalance(store.readBalance())}`);
}

async function creditAccount(rl, store = defaultStore, logger = console) {
  const amountInput = await rl.question('Enter credit amount: ');
  const amount = parseAmount(amountInput.trim());

  if (amount === null) {
    logger.log('Invalid credit amount. Please enter a valid non-negative number.');
    return null;
  }

  const updatedBalance = store.readBalance() + amount;
  store.writeBalance(updatedBalance);
  logger.log(`Amount credited. New balance: ${formatBalance(updatedBalance)}`);
  return updatedBalance;
}

async function debitAccount(rl, store = defaultStore, logger = console) {
  const amountInput = await rl.question('Enter debit amount: ');
  const amount = parseAmount(amountInput.trim());

  if (amount === null) {
    logger.log('Invalid debit amount. Please enter a valid non-negative number.');
    return null;
  }

  const currentBalance = store.readBalance();

  if (currentBalance >= amount) {
    const updatedBalance = currentBalance - amount;
    store.writeBalance(updatedBalance);
    logger.log(`Amount debited. New balance: ${formatBalance(updatedBalance)}`);
    return updatedBalance;
  }

  logger.log('Insufficient funds for this debit.');
  return null;
}

async function handleSelection(choice, rl, store = defaultStore, logger = console) {
  switch (choice) {
    case '1':
      await viewBalance(store, logger);
      return true;
    case '2':
      await creditAccount(rl, store, logger);
      return true;
    case '3':
      await debitAccount(rl, store, logger);
      return true;
    case '4':
      return false;
    default:
      logger.log('Invalid choice, please select 1-4.');
      return true;
  }
}

async function main(options = {}) {
  const rl = options.rl ?? readline.createInterface({ input: stdin, output: stdout });
  const store = options.store ?? defaultStore;
  const logger = options.logger ?? console;

  try {
    let continueRunning = true;

    while (continueRunning) {
      displayMenu(logger);
      continueRunning = await handleSelection(await promptForChoice(rl), rl, store, logger);
    }

    logger.log('Exiting the program. Goodbye!');
  } finally {
    if (options.rl === undefined) {
      rl.close();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Application failed:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BALANCE,
  createAccountStore,
  formatBalance,
  parseAmount,
  displayMenu,
  promptForChoice,
  viewBalance,
  creditAccount,
  debitAccount,
  handleSelection,
  main,
};