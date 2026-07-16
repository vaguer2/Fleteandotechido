import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_700Bold, Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { ScrollView } from 'react-native';
const { width } = Dimensions.get('window');

export default function ScreenLoginUser() {
    const logoFleteandote = require('../../assets/logo.png');
    const router = useRouter();

    const [mail, setMail] = useState('');
    const [password, setPassword] = useState('');
    const [verPass, setVerPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Poppins_700Bold,
        Poppins_800ExtraBold,
    });

    if (!fontsLoaded) return null;

    const iniciarSesion = async () => {
        const cleanEmail = mail.trim();

        if (!cleanEmail || !password) {
            Alert.alert('Campos incompletos', 'Completa todos los campos para continuar.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password,
            });

            if (error) {
                Alert.alert('Error al iniciar sesión', error.message);
                return;
            }
            // El AuthProvider detecta el cambio de sesión automaticamente
            // y redirige a ScreenHomeUser

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#0D2240' }}
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
        >
        
            <View>
                <Image
                    source={logoFleteandote}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.textoInicio}>Fleteando</Text>
                <Text style={styles.textoAlLado}>Te</Text>
            </View>

            <View style={styles.cuadroInputs}>
                <Text style={styles.titulo}>¡Bienvenido de vuelta!</Text>
                <Text style={styles.subtitulo}>Ingresa para continuar con tu cuenta</Text>

                <Text style={styles.etiqueta}>Correo electrónico</Text>
                <TextInput
                    style={styles.input}
                    placeholder="ejemplo@gmail.com"
                    placeholderTextColor="#aaa"
                    value={mail}
                    onChangeText={setMail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.etiqueta}>Contraseña</Text>
                <View style={styles.inputContenedor}>
                    <TextInput
                        style={styles.inputSinBorde}
                        placeholder="Escribe acá tu contraseña"
                        placeholderTextColor="#aaa"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!verPass}
                    />
                    <Pressable onPress={() => setVerPass(!verPass)}>
                        <Ionicons
                            name={verPass ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color="#888"
                        />
                    </Pressable>
                </View>

{/*
                <Pressable onPress={() => console.log('recuperando...')}>
                    <Text style={styles.linkNaranja}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
*/}
                <Pressable
                    style={({ pressed }) => [styles.botonEntrar, pressed && { opacity: 0.8 }]}
                    onPress={iniciarSesion}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.textoBotonEntrar}>Entrar</Text>
                    }
                </Pressable>
{/*
                <View style={styles.divider}>
                    <View style={styles.linea} />
                    <Text style={styles.textoDivider}>o continúa con</Text>
                    <View style={styles.linea} />
                </View>

                <Pressable
                    style={({ pressed }) => [styles.botonGoogle, pressed && { opacity: 0.8 }]}
                    onPress={() => console.log('entrando por google...')}
                >
                    <Text style={styles.textoGoogle}>G  Google</Text>
                </Pressable>
*/}
                <View style={styles.filaRegistro}>
                    <Text style={styles.textoGris}>¿No tienes cuenta? </Text>
                    <Pressable onPress={() => router.push('/Screen/Register/ScreenUserRegister')}>
                        <Text style={styles.linkNaranja}>Regístrate gratis</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    fondo: {
        flex: 1,
        backgroundColor: '#0D2240',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    cuadroInputs: {
        width: '88%',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 28,
    },
    titulo: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        color: '#0D2240',
        marginBottom: 4,
    },
    subtitulo: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#888',
        marginBottom: 20,
    },
    etiqueta: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#333',
        marginBottom: 6,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#333',
        marginBottom: 16,
    },
    linkNaranja: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#F97316',
        textDecorationLine: 'underline',
        marginBottom: 20,
    },
    botonEntrar: {
        backgroundColor: '#0D2240',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
        marginTop:15
    },
    textoBotonEntrar: {
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        fontSize: 15,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    linea: {
        flex: 1,
        height: 1,
        backgroundColor: '#eee',
    },
    textoDivider: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#aaa',
        marginHorizontal: 10,
    },
    botonGoogle: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 20,
    },
    textoGoogle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: '#333',
    },
    filaRegistro: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    textoGris: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#888',
    },
    textoInicio: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 26,
        color: '#fff',
        marginLeft: 7,
    },
    textoAlLado: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 26,
        color: '#F97316',
        marginLeft: 4,
    },
    image: {
        width: 100,
        height: 80,
    },
    inputContenedor: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    inputSinBorde: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#333',
    },
});