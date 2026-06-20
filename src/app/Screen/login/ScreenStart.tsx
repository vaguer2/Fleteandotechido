import React from 'react'
import { useRouter } from 'expo-router'; //aqui importamos el expo router para poder hacer las diferentes navegaciones dependendiendo la pagina a la que queramos ingresar

import { Dimensions, StyleSheet, Text, View, Pressable } from 'react-native'
import { useFonts, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
const { width, height } = Dimensions.get('window');
export default function ScreenStart() {
  const router = useRouter();
  //------------------------------------------------------------------------
  //estos dos son para que mi aplicacion cargue el texto de poppins
  const [fontsLoaded] = useFonts({
    Poppins_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold
  });

  if (!fontsLoaded) return null; // espera a que cargue
  //------------------------------------------------------------------------
return (
  <View style={styles.fondo}>

    {/* ── Círculos decorativos ── */}
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.circuloArriba} />
      <View style={styles.circuloAbajo} />
      <View style={styles.circuloEnmedioDerecha} />
      <View style={styles.circuloEnmedioIzquierda} />
    </View>


    <View style={styles.contenedorTexto}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.textoInicio}>Fleteando</Text>
        <Text style={styles.textoAlLado}>Te</Text>
      </View>
      <View>
        <Text style={styles.textoLeyenda}>Fletes rápidos y confiables.</Text>
        <Text style={styles.textoLeyenda}>Donde tú lo necesitas.</Text>
      </View>
    </View>

    <View style={{ flex: 1 }} />

    <View style={styles.contenedorBotones}>
      <Pressable style={({ pressed }) => [
        styles.botonNaranja,
        pressed && styles.botonPresionado
      ]} onPress={() => router.push('./Screen/Login/ScreenLoginUser')}> {/*aqui cambie*/}
        <Text style={styles.colorBotonTexto}>Solicitar flete ahora</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [
        styles.botonBorde,
        pressed && styles.botonBordePresionado
      ]} onPress={() => router.push('./Screen/Login/ScreenLoginFletero')}> {/*aqui cambie*/}
        <Text style={styles.colorBotonTexto}>Soy transportista</Text>
      </Pressable>
    </View>

  </View>
)
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: '#0D2240',
    alignItems: 'center',
    //justifyContent: 'center',
    // width: width, //estos los declare arriba para que que el color del fondo ocupe toda la pantalla
    // height: height,
    width: '100%',
  },
  textoInicio: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 26,
    color: '#fff'
  },
  textoAlLado: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 26,
    color: '#F97316',
    marginLeft: 3
  },
  textoLeyenda: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    color: '#aeb5bf',
    textAlign: 'center',
  },
  botonNaranja: {
    marginTop: 9,
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,

    alignItems: 'center',
  },
  botonPresionado: {
    backgroundColor: '#cc5f00', // más oscuro al presionar
    transform: [{ scale: 0.97 }], // se encoge un poco
  },
  botonBorde: {
    marginTop: 9,
    borderWidth: 1.5,
    borderColor: '#555E7A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 25,

  },
  botonBordePresionado: {
    backgroundColor: '#49516b', // más oscuro al presionar
    transform: [{ scale: 0.97 }],
  },
  colorBotonTexto: {
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
    fontSize: 14
  },
  contenedorBotones: {
    width: '100%',       // ← ocupa todo el ancho
    paddingHorizontal: 24,
    paddingBottom: 90,   // ← respiro del borde inferior
    gap: 4,
  },
  contenedorTexto: {
    flex: 1,                  
    justifyContent: 'center',   
    alignItems: 'center', 
    marginTop:120     
  },
  circuloArriba: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#112d54',
    top: -width * 0.45,      // ← sube, se sale por arriba
    left: -width * 0.25,     // ← se sale por la izquierda
  },
  circuloAbajo: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: '#112d54',
    bottom: -width * 0.5,    // ← se sale por abajo
    right: -width * 0.2,     // ← se sale por la derecha
  },
  circuloEnmedioDerecha: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#112d54',
    top: '50%',                        // ← se posiciona al 50% vertical
    marginTop: -(width * 2) / 2,    // ← sube la mitad de su propio tamaño
    right: -(width * 1.2) / 2,        // ← se sale exactamente la mitad por la derecha
  },
  circuloEnmedioIzquierda: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: '#112d54',
    top: '50%',                        // ← se posiciona al 50% vertical
    marginTop: -(width * 0.10) / 2,    // ← sube la mitad de su propio tamaño
    left: -(width * 1) / 2,         // ← se sale exactamente la mitad por la izquierda
  },
  image: {
    width: 100,
    height: 80
  }

})