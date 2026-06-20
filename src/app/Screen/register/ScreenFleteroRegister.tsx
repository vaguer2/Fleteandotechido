import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_700Bold, Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { ScrollView } from 'react-native';

const { width } = Dimensions.get('window');

export default function ScreenFleteroRegister() {
    const logoFleteandote = require('../../assets/logo.png');
    const router = useRouter();

    const [company, setCompany] = useState('');
    const [mail, setMail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [verPass, setVerPass] = useState(false);
    const [verPass2, setVerPass2] = useState(false);
    const [loading, setLoading] = useState(false);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Poppins_700Bold,
        Poppins_800ExtraBold,
    });

    if (!fontsLoaded) return null;

    const registrarse = async () => {
        const cleanNombre = company.trim();
        const cleanEmail = mail.trim();

        if (!cleanNombre || !cleanEmail || !password || !password2) {
            Alert.alert('Campos incompletos', 'Completa todos los campos para registrarte.');
            return;
        }

        if (password !== password2) {
            Alert.alert('Error', 'Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Contraseña insegura', 'Escribe al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            // 1. Crear cuenta en Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: cleanEmail,
                password: password,
            });

            if (error) {
                Alert.alert('Error al registrarse', error.message);
                return;
            }

            // 2. Guardar datos básicos en la tabla fletero
            if (data.user) {
                const { error: errorDB } = await supabase
                    .from('fletero')
                    .insert({
                        fletero_id: data.user.id,
                        nombre: cleanNombre,
                        email: cleanEmail,
                        contrasena_hash: 'gestionado_por_supabase_auth',
                        tipo_vehiculo: 'por_definir',
                        tonelaje: 0,
                        disponible: false,
                        verificado: false,
                        activo: true,
                    });

                console.log('Error insert fletero:', JSON.stringify(errorDB));

                if (errorDB) {
                    Alert.alert('Error', 'Cuenta creada pero no se guardaron los datos. Contacta soporte.');
                    return;
                }
            }

            setTimeout(() => {
                Alert.alert(
                    'Registro exitoso',
                    'Tu cuenta fue creada. Completa los datos de tu vehículo al iniciar sesión.',
                    [{ text: 'OK', onPress: () => router.replace('./Screen/Login/ScreenLoginFletero') }] //aqui cambie
                );
            }, 300);

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
            <View style={{ alignItems: 'center' }}>
                <Text style={styles.textoInicio1}>Listo para unirte al equipo de</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.textoInicio}>Fleteando</Text>
                <Text style={styles.textoAlLado}>Te</Text>
                <View>
                    <Image source={logoFleteandote} style={styles.image} resizeMode="contain" />
                </View>
            </View>

            <View style={styles.cuadroInputs}>
                <Text style={styles.subtitulo}>Ingresa tus datos para empezar a trabajar con FleteandoTe</Text>

                <Text style={styles.etiqueta}>Nombre o nombre de tu negocio</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Fletes del Caribe"
                    placeholderTextColor="#aaa"
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                />

                <Text style={styles.etiqueta}>Correo electrónico</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. fletesdelcaribe@gmail.com"
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
                        <Ionicons name={verPass ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
                    </Pressable>
                </View>

                <Text style={styles.etiqueta}>Confirmar contraseña</Text>
                <View style={styles.inputContenedor}>
                    <TextInput
                        style={styles.inputSinBorde}
                        placeholder="Repite tu contraseña"
                        placeholderTextColor="#aaa"
                        value={password2}
                        onChangeText={setPassword2}
                        secureTextEntry={!verPass2}
                    />
                    <Pressable onPress={() => setVerPass2(!verPass2)}>
                        <Ionicons name={verPass2 ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
                    </Pressable>
                </View>

                {password2.length > 0 && password !== password2 && (
                    <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
                )}

                <Pressable
                    style={({ pressed }) => [styles.botonEntrar, pressed && { opacity: 0.8 }]}
                    onPress={registrarse}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.textoBotonEntrar}>Crear cuenta</Text>
                    }
                </Pressable>

                <View style={styles.divider}>
                    <View style={styles.linea} />
                    <Text style={styles.textoDivider}>o regístrate con</Text>
                    <View style={styles.linea} />
                </View>

                <Pressable
                    style={({ pressed }) => [styles.botonGoogle, pressed && { opacity: 0.8 }]}
                    onPress={() => console.log('entrando por google...')}
                >
                    <Text style={styles.textoGoogle}>G  Google</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: '#0D2240', alignItems: 'center', justifyContent: 'center', width: '100%' },
    cuadroInputs: { width: '88%', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28 },
    subtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#888', marginBottom: 20 },
    etiqueta: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#333', marginBottom: 6 },
    input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#333', marginBottom: 16 },
    botonEntrar: { backgroundColor: '#0D2240', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
    textoBotonEntrar: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 15 },
    divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    linea: { flex: 1, height: 1, backgroundColor: '#eee' },
    textoDivider: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#aaa', marginHorizontal: 10 },
    botonGoogle: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
    textoGoogle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#333' },
    textoInicio: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#fff', marginLeft: 7 },
    textoInicio1: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#fff', marginLeft: 7 },
    textoAlLado: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#F97316', marginLeft: 4 },
    image: { width: 90, height: 70, marginLeft: 10 },
    inputContenedor: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 },
    inputSinBorde: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#333' },
    errorText: { color: 'red', fontSize: 12, marginLeft: 10, marginBottom: 10, fontWeight: 'bold' },
    linkNaranja: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#F97316', textDecorationLine: 'underline' },
});