import { AddressToProfile, NumberToRecipient } from 'src/recipients/recipient'

export enum Actions {
  SET_RECIPIENT_CACHE = 'RECIPIENTS/SET_RECIPIENT_CACHE',
  ADD_PROFILE = 'RECIPIENTS/ADD_PROFILE',
}

export interface SetRecipientCacheAction {
  type: Actions.SET_RECIPIENT_CACHE
  recipients: NumberToRecipient
}

export interface AddProfileAction {
  type: Actions.ADD_PROFILE
  profile: AddressToProfile
}

export type ActionTypes = SetRecipientCacheAction | AddProfileAction

export const setRecipientCache = (recipients: NumberToRecipient): SetRecipientCacheAction => ({
  type: Actions.SET_RECIPIENT_CACHE,
  recipients,
})

export const addProfile = (profile: AddressToProfile): AddProfileAction => ({
  type: Actions.ADD_PROFILE,
  profile,
})
