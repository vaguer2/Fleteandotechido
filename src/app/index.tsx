
import { StyleSheet, Text, View } from 'react-native'

import ScreenFleteroRegister from './Screen/register/ScreenFleteroRegister'

import React from 'react'

export default function screen() {
  return (
    <View style={styles.container}>
      <ScreenFleteroRegister />
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