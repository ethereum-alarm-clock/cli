const BigNumber = require("bignumber.js")
const drainWallet = require('../src/Wallet/drain')
const { assert, expect }  = require("chai")

const EXAMPLE_ADDRESS = '0xe87529A6123a74320e13A6Dabf3606630683C029';

describe('drainWallet', () => {
    it('returns promise', () => {
        expect(drainWallet({}, 1, 1, {
            getAddresses() {
                return []
            }
        })).to.be.a('Promise')
    })

    // it('calls wallet.getAddresses', async () => {
    //     let getAddressesCalled = false
    //     const wallet = {
    //         getAddresses() {
    //             getAddressesCalled = true

    //             return []
    //         }
    //     };

    //     const program = {
    //         password: 'lol',
    //         wallet,
    //         provider: 'http://localhost:8545',
    //     }

    //     await drainWallet(EXAMPLE_ADDRESS, program)

    //     assert.ok(getAddressesCalled)
    // })

    // it('calls wallet.sendFromIndex() with correct params', async () => {
    //     let sendFromIndexCalled = false
    //     let getBalanceCalled = false
    //     let waitForTransactionToBeMinedCalled = false

    //     const EXAMPLE_ADDRESSES = [EXAMPLE_ADDRESS]
    //     const EXAMPLE_BALANCE = 100000000
    //     const EXAMPLE_TX_HASH = '0xf24cea9a5270e8df3cbe693209621690b5753cd207dda8b59013f6911ab469fb'
    //     const EXAMPLE_TARGET_ADDRESS = '0xe12329A6123a74320e13A6Dabf3606630683C029';
    //     const EXAMPLE_GAS_PRICE = 20

    //     const util = {
    //         getBalance(web3, address) {
    //             getBalanceCalled = true

    //             assert.equal(address, EXAMPLE_ADDRESS)

    //             return Promise.resolve(EXAMPLE_BALANCE);
    //         },

    //         waitForTransactionToBeMined(web3, txHash) {
    //             waitForTransactionToBeMinedCalled = true

    //             assert.equal(txHash, EXAMPLE_TX_HASH)

    //             return Promise.resolve()
    //         }
    //     };

    //     const wallet = {
    //         getAddresses() {
    //             return EXAMPLE_ADDRESSES
    //         },

    //         sendFromIndex(addressIndex, options) {
    //             sendFromIndexCalled = true

    //             assert.equal(addressIndex, EXAMPLE_ADDRESSES.indexOf(EXAMPLE_ADDRESS))

    //             const balanceAsBigNumber = new BigNumber(EXAMPLE_BALANCE)
    //             const gasLimit = '21000'
    //             const gasCost = new BigNumber(gasLimit).times(EXAMPLE_GAS_PRICE)

    //             assert.equal(options.to, EXAMPLE_TARGET_ADDRESS)
    //             assert.equal(options.value, balanceAsBigNumber.minus(gasCost))
    //             assert.equal(options.gas, gasLimit)
    //             assert.equal(options.gasPrice, EXAMPLE_GAS_PRICE)
    //             assert.equal(options.data, '')

    //             return Promise.resolve(EXAMPLE_TX_HASH)
    //         }
    //     };

    //     await drainWallet({}, EXAMPLE_GAS_PRICE, EXAMPLE_TARGET_ADDRESS, wallet, util)

    //     assert.ok(getBalanceCalled, 'util.getBalance() has to be called')
    //     assert.ok(sendFromIndexCalled, 'wallet.sendFromIndex() has to be called')
    //     assert.ok(waitForTransactionToBeMinedCalled, 'util.waitForTransactionToBeMined() has to be called')
    // })
})