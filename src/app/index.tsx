import { StyleSheet, Text, View } from 'react-native'
import ScreenStart from './Screen/login/ScreenStart'
import React from 'react'

export default function PrimeraFuncionPrueba() {
  return (
    <View style={styles.container}>
      <ScreenStart/>
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