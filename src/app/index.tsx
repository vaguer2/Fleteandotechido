
import { StyleSheet, Text, View } from 'react-native'
import ScreenStart from './Screen/login/ScreenStart'
import ScreenLoginUser from './Screen/login/ScreenLoginUser'
import ScreenLoginFletero from './Screen/login/ScreenLoginFletero'
import React from 'react'

export default function PrimeraFuncionPrueba() {
  return (
    <View style={styles.container}>
      <ScreenLoginFletero/>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
})