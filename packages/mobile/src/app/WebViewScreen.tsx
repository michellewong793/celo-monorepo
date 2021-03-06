import colors from '@celo/react-components/styles/colors'
import { StackScreenProps } from '@react-navigation/stack'
import * as React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'
import { useDispatch } from 'react-redux'
import { openDeepLink } from 'src/app/actions'
import i18n from 'src/i18n'
import { emptyHeader } from 'src/navigator/Headers'
import { navigateBack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { TopBarTextButton } from 'src/navigator/TopBarButton'
import { StackParamList } from 'src/navigator/types'
import { parse } from 'url'

type RouteProps = StackScreenProps<StackParamList, Screens.WebViewScreen>
type Props = RouteProps

export const webViewScreenNavOptions = ({ route }: RouteProps) => {
  const { hostname } = parse(route.params.uri)
  return {
    ...emptyHeader,
    headerTitle: hostname || ' ',
    headerLeft: () => (
      <TopBarTextButton
        title={i18n.t('global:close')}
        onPress={navigateBack}
        titleStyle={styles.close}
      />
    ),
  }
}

const shouldUseOpacityHack = () => {
  if (Platform.OS === 'ios') {
    return false
  }
  return Platform.Version >= 28
}

function WebViewScreen({ route }: Props) {
  const { uri } = route.params
  const dispatch = useDispatch()

  const handleLoadRequest = (event: ShouldStartLoadRequest): boolean => {
    if (event.url.startsWith('celo://')) {
      dispatch(openDeepLink(event.url))
      return false
    }
    return true
  }

  return (
    <View style={styles.container}>
      <WebView
        style={shouldUseOpacityHack() ? styles.webView : {}}
        originWhitelist={['https://*', 'celo://*']}
        onShouldStartLoadWithRequest={handleLoadRequest}
        setSupportMultipleWindows={false}
        source={{ uri }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flex: 1,
    justifyContent: 'center',
  },
  webView: {
    opacity: 0.99,
  },
  close: {
    color: colors.dark,
  },
})

export default WebViewScreen
