import { StyleSheet, Text, View } from 'react-native'
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
export default function ScreenAyudaYSoporte() {
    
    const router = useRouter();
    //estos dos son para que mi aplicacion cargue el texto de poppins
    const [fontsLoaded] = useFonts({
        Poppins_800ExtraBold,
        Inter_400Regular,
        Inter_600SemiBold
    });

    if (!fontsLoaded) return null; // espera a que cargue
  return (

        <View style={styles.container}>
          <View style={styles.header}>
              <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backBtn}
              >
                  <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                  Ayuda y soporte
              </Text>
          </View>
            <View style={styles.contenedorTexto}>
                <View style={styles.logoTexto}>
                    <Text style={styles.textoInicio}>Fleteando</Text>
                    <Text style={styles.textoAlLado}>Te</Text>
                </View>

                <Text style={styles.titulo}>Ayuda y soporte</Text>

                <Text style={styles.subtitulo}>
                    ¿Necesitas ayuda con la aplicación?
                </Text>
            </View>

            <View style={styles.cajaBlanca}>
                <Text style={styles.tituloCaja}>
                    Estamos para ayudarte
                </Text>

                <Text style={styles.textoDescripcion}>
                    Para recibir ayuda o soporte, puedes comunicarte con nuestro equipo
                    mediante los siguientes datos:
                </Text>

                <View style={styles.separador} />

                <Text style={styles.etiqueta}>Correo electrónico</Text>
                <Text style={styles.datoContacto}>
                    soporte@fleteandote.com
                </Text>

                <Text style={styles.etiqueta}>Número de contacto</Text>
                <Text style={styles.datoContacto}>
                    +52 984 000 0000
                </Text>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B2545',
        paddingBottom: 40,
    },

    header: {
        width: '100%',
        backgroundColor: '#071B33',
        paddingTop: 50,
        paddingBottom: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 7,
    },

    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },

    headerTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 19,
        color: '#FFFFFF',
        textAlign: 'left',
    },

    contenedorTexto: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 28,
        marginBottom: 32,
    },

    logoTexto: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },

    textoInicio: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 28,
        color: '#FFFFFF',
    },

    textoAlLado: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 28,
        color: '#F97316',
        marginLeft: 3,
    },

    titulo: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 30,
        color: '#FFFFFF',
        textAlign: 'center',
    },

    subtitulo: {
        marginTop: 8,
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#CBD5E1',
        textAlign: 'center',
    },

    cajaBlanca: {
        marginHorizontal: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingVertical: 26,

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },

    tituloCaja: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 21,
        color: '#0B2545',
        textAlign: 'center',
    },

    textoDescripcion: {
        marginTop: 12,
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 22,
        color: '#475569',
        textAlign: 'center',
    },

    separador: {
        width: '100%',
        height: 1,
        alignSelf: 'center',
        marginVertical: 22,
        backgroundColor: '#CBD5E1',
    },

    etiqueta: {
        marginTop: 12,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    datoContacto: {
        marginTop: 5,
        marginBottom: 10,
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#0B2545',
    },
});