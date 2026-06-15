
import { StyleSheet, Text, View } from 'react-native'
import ScreenUserRegister from './Screen/register/ScreenUserRegister'
import ScreenConfirmarPedido from './Screen/Pedido/ScreenConfirmarPedido';
import ScreenHomeUser from './Screen/Home/ScreenHomeUser';

import ScreenFleteroRegister from './Screen/register/ScreenFleteroRegister'

import React from 'react'

export default function screen() {
  return (
    <View style={styles.container}>
      <ScreenHomeUser />
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