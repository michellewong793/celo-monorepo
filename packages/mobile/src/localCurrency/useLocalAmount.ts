import BigNumber from 'bignumber.js'
import { convertDollarsToLocalAmount, convertLocalAmountToDollars } from 'src/localCurrency/convert'
import { getLocalCurrencyExchangeRate } from 'src/localCurrency/selectors'
import useSelector from 'src/redux/useSelector'

export function useDollarsToLocalAmount(amount: BigNumber.Value | null) {
  const exchangeRate = useSelector(getLocalCurrencyExchangeRate)
  const convertedAmount = convertDollarsToLocalAmount(amount, exchangeRate)
  if (!convertedAmount) {
    return null
  }

  return convertedAmount.toString()
}

export function useLocalAmountToDollars(amount: BigNumber.Value | null) {
  const exchangeRate = useSelector(getLocalCurrencyExchangeRate)
  const convertedAmount = convertLocalAmountToDollars(amount, exchangeRate)
  if (!convertedAmount) {
    return null
  }

  return convertedAmount.toString()
}

export function useExchangeRate() {
  return useSelector(getLocalCurrencyExchangeRate)
}
