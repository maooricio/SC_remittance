var Remittance = artifacts.require("./Remittance.sol");
web3.eth.getTransactionReceiptMined = require("../lib/getTransactionReceiptMined.js");

contract('Remittance', function(accounts) {

  var contract;
  var owner = accounts[0];
  var depositor = accounts[1];
  var receiver = accounts[2];
  var passwordPartOne = "abc";
  var passwordPartTwo = "xyz";
  var establishDeadline = 2;
  var establishDeadlineLimit = 2;

  beforeEach(function () {
    return Remittance.new({ from: owner })
    .then(function(instance) {
      contract = instance;
    });
  });

  it('Should not accept bad data to allow the deposit transaction', async function() {
    // without setting the passwords
    return contract.depositFunds("", "", establishDeadline, establishDeadlineLimit, { from: depositor, value: 3000 })
    .then(assert.fail)
    .catch(function(error) {
      assert(
        error.message.indexOf('invalid JUMP')
      )
    })
    .then(function(error) {
      // without setting the deadlines
      return contract.depositFunds(passwordPartOne, passwordPartTwo, 0, 0, { from: depositor, value: 3000 })
      .then(assert.fail)
      .catch(function(error) {
        assert(
          error.message.indexOf('invalid JUMP')
        )
      })
    })
    .then(function(error) {
      // with a deposit of 0
      return contract.depositFunds(passwordPartOne, passwordPartTwo, establishDeadline, establishDeadlineLimit, { from: depositor, value: 0 })
      .then(assert.fail)
      .catch(function(error) {
        assert(
          error.message.indexOf('invalid JUMP')
        )
      })
    });
  });

  it('Should allow the deposit and the balance of the contract adds this value to its balance', async function() {
    let initialContractBalance = await web3.eth.getBalance(contract.address);

    let depositTxn = await contract.depositFunds(passwordPartOne, passwordPartTwo, establishDeadline, establishDeadlineLimit, { from: depositor, value: 56567 });
    let txnAmountDeposited = depositTxn.logs[0].args.amountDeposited;

    let finalContractBalance = await web3.eth.getBalance(contract.address);
    
    assert.equal(txnAmountDeposited.toString(10), finalContractBalance.toString(10), 'The deposit was not success');
  });

  it('Should allow the withdrawal', async function() {
    let initialReceiverBalance = await web3.eth.getBalance(receiver);

    let depositTxn = await contract.depositFunds(passwordPartOne, passwordPartTwo, establishDeadline, establishDeadlineLimit, { from: depositor, value: 56567 });
    let txnAmountDeposited = depositTxn.logs[0].args.amountDeposited;

    let withdrawalTxn = await contract.withdrawFunds(passwordPartOne, passwordPartTwo, { from: receiver });
    let txnAmountWithdrawn = withdrawalTxn.logs[0].args.amountWithdrawn;
    let transactionReceipt = web3.eth.getTransaction(withdrawalTxn.tx);

    //Calculate transaction gas
    let gasUsedTxn = web3.toBigNumber(withdrawalTxn.receipt.gasUsed);
    let gasPrice = web3.toBigNumber(transactionReceipt.gasPrice);
    let totalTxnGas = gasPrice.times(gasUsedTxn);

    let finalReceiverBalance = await web3.eth.getBalance(receiver).toString(10);
    let expectedReceiverBalance = web3.toBigNumber(initialReceiverBalance).plus(txnAmountWithdrawn).minus(totalTxnGas);
    
    assert.equal(txnAmountDeposited.toString(10), txnAmountWithdrawn.toString(10), 'The withdrawal was not success');
    assert.equal(finalReceiverBalance, expectedReceiverBalance.toString(10), 'The withdrawal was not success');
  });

  it('Should reject a withdrawal if the two parts of the passwords are not the authorized', async function() {
    let depositTxn = await contract.depositFunds(passwordPartOne, passwordPartTwo, establishDeadline, establishDeadlineLimit, { from: depositor, value: 80000 });
    let txnAmountDeposited = depositTxn.logs[0].args.amountDeposited;

    return contract.withdrawFunds("foo", "bar", { from: receiver } )
    .then(assert.fail)
    .catch(function(error) {
      assert(
        error.message.indexOf('invalid JUMP')
      )
    });
  });

  it('Should reject a withdrawal if this was already released', async function() {
    let depositTxn = await contract.depositFunds(passwordPartOne, passwordPartTwo, establishDeadline, establishDeadlineLimit, { from: depositor, value: 80000 });
    let txnAmountDeposited = depositTxn.logs[0].args.amountDeposited;

    let withdrawalTxn = await contract.withdrawFunds(passwordPartOne, passwordPartTwo, { from: receiver });
    let txnAmountWithdrawn = withdrawalTxn.logs[0].args.amountWithdrawn;

    return contract.withdrawFunds(passwordPartOne, passwordPartTwo, { from: receiver })
    .then(assert.fail)
    .catch(function(error) {
      assert(
        error.message.indexOf('invalid JUMP')
      )
    });
  });
});
