import {
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
    Poppins_700Bold,
    Poppins_800ExtraBold,
    useFonts,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    SafeAreaView,
} from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';

export default function ScreenLoginFletero() {
    const router = useRouter();
    const { width, height } =
        useWindowDimensions();

    const logoFleteandote =
        require('../../assets/logo.png');

    const [mail, setMail] =
        useState('');

    const [password, setPassword] =
        useState('');

    const [verPass, setVerPass] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Poppins_700Bold,
        Poppins_800ExtraBold,
    });

    const pantallaPequena = height < 700;

    const anchoFormulario = Math.min(
        width * 0.88,
        520
    );

    if (!fontsLoaded) {
        return (
            <SafeAreaView
                style={styles.cargandoPantalla}
                edges={['top', 'bottom']}
            >
                <ActivityIndicator
                    color="#FFFFFF"
                    size="large"
                />
            </SafeAreaView>
        );
    }

    const iniciarSesion = async () => {
        const cleanEmail =
            mail.trim();

        if (!cleanEmail || !password) {
            Alert.alert(
                'Campos incompletos',
                'Completa todos los campos para continuar.'
            );

            return;
        }

        setLoading(true);

        try {
            const { error } =
                await supabase.auth
                    .signInWithPassword({
                        email: cleanEmail,
                        password,
                    });

            if (error) {
                Alert.alert(
                    'Error al iniciar sesión',
                    error.message
                );

                return;
            }

            /*
             * AuthProvider detecta automáticamente
             * que la cuenta corresponde a un fletero.
             */
        } catch (error: any) {
            Alert.alert(
                'Error',
                error?.message ||
                'Intenta nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView
                style={styles.safeAreaSuperior}
                edges={['top']}
            />

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={
                    Platform.OS === 'ios'
                        ? 'padding'
                        : 'height'
                }
                keyboardVerticalOffset={0}
            >
                <SafeAreaView
                    style={styles.safeAreaContenido}
                    edges={['bottom']}
                >
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[
                            styles.scrollContenido,
                            pantallaPequena &&
                            styles.scrollContenidoPequeno,
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={
                            false
                        }
                        bounces={false}
                    >
                        <View
                            style={styles.logoContainer}
                        >
                            <Image
                                source={logoFleteandote}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={styles.nombreApp}>
                            <Text
                                style={styles.textoInicio}
                            >
                                Fleteando
                            </Text>

                            <Text
                                style={styles.textoAlLado}
                            >
                                Te
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.cuadroInputs,
                                {
                                    width:
                                        anchoFormulario,
                                },
                                pantallaPequena &&
                                styles.cuadroInputsPequeno,
                            ]}
                        >
                            <Text style={styles.titulo}>
                                ¡Bienvenido de vuelta fletero!
                            </Text>

                            <Text
                                style={styles.subtitulo}
                            >
                                Ingresa tus datos para iniciar
                                sesión
                            </Text>

                            <Text style={styles.etiqueta}>
                                Correo electrónico
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="ejemplo@gmail.com"
                                placeholderTextColor="#aaa"
                                value={mail}
                                onChangeText={setMail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                textContentType="emailAddress"
                            />

                            <Text style={styles.etiqueta}>
                                Contraseña
                            </Text>

                            <View
                                style={
                                    styles.inputContenedor
                                }
                            >
                                <TextInput
                                    style={
                                        styles.inputSinBorde
                                    }
                                    placeholder="Escribe acá tu contraseña"
                                    placeholderTextColor="#aaa"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!verPass}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    textContentType="password"
                                    onSubmitEditing={
                                        iniciarSesion
                                    }
                                />

                                <Pressable
                                    onPress={() =>
                                        setVerPass(
                                            !verPass
                                        )
                                    }
                                    style={
                                        styles.botonVerPassword
                                    }
                                    hitSlop={8}
                                >
                                    <Ionicons
                                        name={
                                            verPass
                                                ? 'eye-outline'
                                                : 'eye-off-outline'
                                        }
                                        size={20}
                                        color="#888"
                                    />
                                </Pressable>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.botonEntrar,
                                    pressed &&
                                    styles.botonPresionado,
                                    loading &&
                                    styles.botonDeshabilitado,
                                ]}
                                onPress={iniciarSesion}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator
                                        color="#fff"
                                    />
                                ) : (
                                    <Text
                                        style={
                                            styles.textoBotonEntrar
                                        }
                                    >
                                        Entrar
                                    </Text>
                                )}
                            </Pressable>

                            <View
                                style={styles.filaRegistro}
                            >
                                <Text
                                    style={styles.textoGris}
                                >
                                    ¿No tienes cuenta?{' '}
                                </Text>

                                <Pressable
                                    onPress={() =>
                                        router.push(
                                            '/Screen/Register/ScreenFleteroRegister'
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.linkNaranja
                                        }
                                    >
                                        Regístrate gratis
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D2240',
    },

    cargandoPantalla: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D2240',
    },

    safeAreaSuperior: {
        backgroundColor: '#0D2240',
    },

    keyboardContainer: {
        flex: 1,
        backgroundColor: '#0D2240',
    },

    safeAreaContenido: {
        flex: 1,
        backgroundColor: '#0D2240',
    },

    scroll: {
        flex: 1,
        backgroundColor: '#0D2240',
    },

    scrollContenido: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 28,
    },

    scrollContenidoPequeno: {
        justifyContent: 'flex-start',
        paddingTop: 14,
    },

    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    nombreApp: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },

    cuadroInputs: {
        maxWidth: 520,
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 28,
    },

    cuadroInputsPequeno: {
        paddingHorizontal: 20,
        paddingVertical: 22,
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
        minHeight: 48,
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

    inputContenedor: {
        width: '100%',
        minHeight: 48,
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
        minWidth: 0,
        paddingVertical: 12,
        paddingRight: 10,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#333',
    },

    botonVerPassword: {
        flexShrink: 0,
        paddingVertical: 8,
        paddingLeft: 8,
    },

    linkNaranja: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#F97316',
        textDecorationLine: 'underline',
    },

    botonEntrar: {
        minHeight: 52,
        backgroundColor: '#0D2240',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        marginTop: 15,
    },

    botonPresionado: {
        opacity: 0.8,
    },

    botonDeshabilitado: {
        opacity: 0.7,
    },

    textoBotonEntrar: {
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        fontSize: 15,
    },

    filaRegistro: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
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
});