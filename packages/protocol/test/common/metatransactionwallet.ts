import { assertEqualBN, assertLogMatches2, assertRevert } from '@celo/protocol/lib/test-utils'
//import { parseSignatureAsVrs } from '@celo/utils/lib/signatureUtils'
import { generateTypedDataHash } from '@celo/utils/lib/sign-typed-data-utils'
import { MetaTransactionWalletContract, MetaTransactionWalletInstance } from 'types'

const MetaTransactionWallet: MetaTransactionWalletContract = artifacts.require(
  'MetaTransactionWallet'
)

contract('MetaTransactionWallet', (accounts: string[]) => {
  let wallet: MetaTransactionWalletInstance
  const chainId = 42220
  const signer = accounts[1]
  const nonSigner = accounts[2]

  beforeEach(async () => {
    wallet = await MetaTransactionWallet.new()
    await wallet.initialize(signer, chainId)
  })

  describe('#EIP172_EXECUTE_META_TRANSACTION_TYPEHASH()', () => {
    it('should have set the right typehash', async () => {
      const expectedTypehash = web3.utils.soliditySha3(
        'ExecuteMetaTransaction(address destination,uint256 value,bytes data,uint256 nonce)'
      )
      assert.equal(await wallet.EIP172_EXECUTE_META_TRANSACTION_TYPEHASH(), expectedTypehash)
    })
  })

  // TODO(asa): Check events
  describe('#initialize()', () => {
    it('should have set the owner to itself', async () => {
      assert.equal(await wallet.owner(), wallet.address)
    })

    it('should have set the signer', async () => {
      assert.equal(await wallet.signer(), signer)
    })

    it('should have set the EIP-172 domain separator', async () => {
      assert.equal(
        await wallet.EIP172_DOMAIN_SEPARATOR(),
        '0x82620ec9dcebe24c530e5ecd53f40856d95360dc561d0ecbd65bad46e1ff89ad'
      )
    })

    it('should not be callable again', async () => {
      await assertRevert(wallet.initialize(signer, chainId))
    })
  })

  describe('#setSigner()', () => {
    describe('when called by the wallet contract', () => {
      it('should set a new signer', async () => {})
      it('should emit the SignerSet event', async () => {})
    })

    describe('when called by the signer', () => {
      it('should revert', async () => {})
    })
  })

  describe('#setEip172DomainSeparator()', () => {
    describe('when called by the wallet contract', () => {
      it('should set a new signer', async () => {})
      it('should emit the SignerSet event', async () => {})
    })

    describe('when called by the signer', () => {
      it('should revert', async () => {})
    })
  })

  describe('#executeTransaction()', () => {
    describe('when the destination is a contract', () => {
      let res: any
      let data: string
      let destination: string
      const value = 0
      beforeEach(async () => {
        destination = wallet.address
        // @ts-ignore
        data = wallet.contract.methods.setSigner(nonSigner).encodeABI()
      })

      describe('when the caller is the signer', () => {
        describe('when a valid nonce is provided', () => {
          beforeEach(async () => {
            // @ts-ignore
            res = await wallet.executeTransaction(destination, value, data, 0, { from: signer })
          })

          it('should execute the transaction', async () => {
            assert.equal(await wallet.signer(), nonSigner)
          })

          it('should increment the nonce', async () => {
            assertEqualBN(await wallet.nonce(), 1)
          })

          it('should emit the TransactionExecution event', () => {
            assertLogMatches2(res.logs[1], {
              event: 'TransactionExecution',
              args: {
                destination,
                value,
                data,
                returnData: null,
              },
            })
          })
        })

        describe('when an invalid nonce is provided', () => {
          it('should revert', async () => {
            await assertRevert(
              wallet.executeTransaction(destination, value, data, 1, { from: signer })
            )
          })
        })
      })

      describe('when the caller is not the signer', () => {
        describe('when the a valid nonce is provided', () => {
          it('should revert', async () => {
            await assertRevert(
              wallet.executeTransaction(destination, value, data, 0, { from: nonSigner })
            )
          })
        })
      })
    })

    describe('when the destination is not a contract', () => {
      const value = 100
      const destination = web3.utils.toChecksumAddress(web3.utils.randomHex(20))
      describe('when the caller is the signer', () => {
        describe('when a valid nonce is provided', () => {
          describe('when data is empty', () => {
            let res: any
            const data = '0x'
            beforeEach(async () => {
              await web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value })
              // @ts-ignore
              res = await wallet.executeTransaction(destination, value, data, 0, { from: signer })
            })

            it('should execute the transaction', async () => {
              assert.equal(await web3.eth.getBalance(destination), value)
            })

            it('should increment the nonce', async () => {
              assertEqualBN(await wallet.nonce(), 1)
            })

            it('should emit the TransactionExecution event', () => {
              assertLogMatches2(res.logs[0], {
                event: 'TransactionExecution',
                args: {
                  destination,
                  value,
                  data: null,
                  returnData: null,
                },
              })
            })
          })

          describe('when data is not empty', () => {
            it('should revert', async () => {
              await assertRevert(
                wallet.executeTransaction(destination, value, '0x1234', 0, { from: signer })
              )
            })
          })
        })
      })
    })
  })

  // WIP
  describe('#executeMetaTransaction()', () => {
    const value = 100
    const destination = web3.utils.toChecksumAddress(web3.utils.randomHex(20))
    const data = '0x'
    describe('when submitted by a non-signer', () => {
      describe('when the nonce is valid', () => {
        const nonce = 0
        let typedData: any
        describe.only('when signed by the signer', () => {
          beforeEach(async () => {
            // Following the example at https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
            // and https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
            typedData = {
              types: {
                EIP712Domain: [
                  { name: 'name', type: 'string' },
                  { name: 'version', type: 'string' },
                  { name: 'chainId', type: 'uint256' },
                  { name: 'verifyingContract', type: 'address' },
                ],
                ExecuteMetaTransaction: [
                  { name: 'destination', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'data', type: 'bytes' },
                  { name: 'nonce', type: 'uint256' },
                ],
              },
              primaryType: 'ExecuteMetaTransaction',
              domain: {
                name: 'MetaTransactionWallet',
                version: '1',
                chainId,
                verifyingContract: wallet.address,
              },
              message: {
                destination,
                value,
                data,
                nonce,
              },
            }

            /*
            // Not a method, need to adapt contract to read signatures with message prefix.
            const { v, r, s } = parseSignatureAsVrs(await web3.eth.signTypedData(signer, typedData))
            console.log(v, r, s)

            await web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value })
            // @ts-ignore
            res = await wallet.executeMetaTransaction(destination, value, data, 0, v, r, s, { from: signer })
            */
          })

          it('should match hashes', async () => {
            console.log('domain separator', await wallet.EIP172_DOMAIN_SEPARATOR())
            console.log(
              'struct hash',
              await wallet.getMetaTransactionStructHash(destination, value, data, nonce)
            )
            const hash = generateTypedDataHash(typedData)
            assert.equal(
              `0x${hash.toString('hex')}`,
              await wallet.getMetaTransactionDigest(destination, value, data, nonce)
            )
          })
          /*
          it('should execute the transaction', async () => {
            assert.equal(await web3.eth.getBalance(destination), value)
          })

          it('should increment the nonce', async () => {
            assertEqualBN(await wallet.nonce(), 1)
          })

          it('should emit the MetaTransactionExecution event', () => {
            assertLogMatches2(res.logs[0], {
              event: 'MetaTransactionExecution',
              args: {
                destination,
                value,
                data: null,
                returnData: null,
              }
            })
          })
          */
        })

        describe('when signed by a non-signer', () => {
          it('should revert', async () => {})
        })
      })

      describe('when the nonce is invalid', () => {
        describe('when signed by the signer', () => {
          it('should revert', async () => {})
        })
      })
    })
  })
})
