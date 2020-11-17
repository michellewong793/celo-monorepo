import { IdentityMetadataWrapper } from '@celo/contractkit'
import { createStorageClaim } from '@celo/contractkit/lib/identity/claims/claim'
import OffchainDataWrapper from '@celo/contractkit/lib/identity/offchain-data-wrapper'
import { PrivateNameAccessor } from '@celo/contractkit/lib/identity/offchain/accessors/name'
import { LocalStorageWriter } from '@celo/contractkit/lib/identity/offchain/storage-writers'
import { AccountsWrapper } from '@celo/contractkit/lib/wrappers/Accounts'
import { NativeSigner } from '@celo/utils/lib/signatureUtils'
import { call, put, select } from 'redux-saga/effects'
import { uploadProfile } from 'src/account/actions'
import { isProfileUploadedSelector, nameSelector } from 'src/account/selectors'
import { sendTransaction } from 'src/transactions/send'
import { newTransactionContext } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { getContractKit } from 'src/web3/contracts'
import { currentAccountSelector } from 'src/web3/selectors'

const TAG = 'account/profileInfo'
const BUCKET_URL = 'https://storage.googleapis.com/isabellewei-test/'

class ValoraStorageWriter extends LocalStorageWriter {
  private readonly account: string

  constructor(readonly local: string, bucket: string) {
    super(local)
    this.account = bucket
  }

  // TEMP for testing
  async write(data: Buffer, dataPath: string): Promise<void> {
    const response = await fetch(`${BUCKET_URL}${this.account}${dataPath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    })
    if (!response.ok) {
      console.log(response.statusText)
      throw Error('Unable to write')
    }
  }
}

export function* uploadProfileInfo() {
  const isAlreadyUploaded = yield select(isProfileUploadedSelector)
  if (isAlreadyUploaded) {
    return
  }
  yield call(addMetadataClaim)
  yield call(uploadName)

  yield put(uploadProfile())
  // TODO: add analytics
}

export function* addMetadataClaim() {
  try {
    const contractKit = yield call(getContractKit)
    const account = yield select(currentAccountSelector)
    console.log('adding claim')
    const metadata = IdentityMetadataWrapper.fromEmpty(account)
    console.log(metadata)
    yield call(
      [metadata, 'addClaim'],
      createStorageClaim(BUCKET_URL),
      NativeSigner(contractKit.web3.eth.sign, account)
    )
    console.log('added storage claim to chain')
    yield call(writeToGCPBucket, metadata.toString(), `${account}/metadata.json`)
    console.log('uploaded metadata.json')
    const accountsWrapper: AccountsWrapper = yield call([
      contractKit.contracts,
      contractKit.contracts.getAccounts,
    ])
    const setAccountTx = accountsWrapper.setMetadataURL(`${BUCKET_URL}${account}/metadata.json`)
    const context = newTransactionContext(TAG, 'Set metadata URL')
    yield call(sendTransaction, setAccountTx.txo, account, context)
    console.log('added metadata claim to chain')
  } catch (error) {
    Logger.error(`${TAG}/addMetadataClaim`, 'Could not add metadata claim', error)
    throw error
  }
}

// TEMP for testing
async function writeToGCPBucket(data: string, dataPath: string) {
  const response = await fetch(`${BUCKET_URL}${dataPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  })
  if (!response.ok) {
    console.log(response.statusText)
    throw Error('Unable to claim metadata')
  }
}

export function* uploadName() {
  const contractKit = yield call(getContractKit)
  const account = yield select(currentAccountSelector)
  const name = yield select(nameSelector)

  console.log('uploading name')
  const storageWriter = new ValoraStorageWriter(`/tmp/${account}`, account)
  const offchainWrapper = new OffchainDataWrapper(account, contractKit)
  offchainWrapper.storageWriter = storageWriter
  const nameAccessor = new PrivateNameAccessor(offchainWrapper)
  console.log('writing name')
  console.log(account)
  const writeError = yield call([nameAccessor, 'write'], { name }, [])
  if (writeError) {
    console.log(writeError)
    throw Error('Unable to write data')
  }
}

// this function gives permission to the recipient to view the user's profile info
export function* uploadSymmetricKeys(recipientAddresses: string[]) {
  // TODO: check if key for user already exists, skip if yes
  const account = yield select(currentAccountSelector)
  const contractKit = yield call(getContractKit)

  console.log('uploading keys')
  const storageWriter = new ValoraStorageWriter(`/tmp/${account}`, account)
  const offchainWrapper = new OffchainDataWrapper(account, contractKit)
  offchainWrapper.storageWriter = storageWriter
  const nameAccessor = new PrivateNameAccessor(offchainWrapper)
  console.log('writing keys')
  const writeError = yield call([nameAccessor, 'writeKeys'], { name }, recipientAddresses)
  if (writeError) {
    console.log(writeError)
    throw Error('Unable to write keys')
  }
}
