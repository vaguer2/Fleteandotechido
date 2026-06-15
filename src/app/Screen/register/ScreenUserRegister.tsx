import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_700Bold, Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
//import { registerAccount } from '../../services/registerService'; esta parte nos servira luego para poder hacer la coneccoin a la base de datos
const { width } = Dimensions.get('window');

export default function ScreenUserRegister() {
    const logoFleteandote = require('../../assets/logo.png')

    const [mail, setMail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [verPass, setVerPass] = useState(false);
    const [verPass2, setVerPass2] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
        Poppins_700Bold,
        Poppins_800ExtraBold,

    });

    if (!fontsLoaded) return null;

/*
    const requuestDB = async () => {
        const cleanNombre = name.trim();
        const cleanEmail = mail.trim();

        if (!cleanNombre || !cleanEmail || !password || !password2) {
            alert('Campos incompletos, Completa todos los campos para registrarte.');
            return;
        }

        if (password !== password2) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            alert('Contaseña insegura, escribe al menos 8 caracteres');
            return;
        }

        setLoading(true);
        try {
            await registerAccount({
                name: cleanNombre,
                email: cleanEmail,
                password: contra1,
                role: 'user',
            });

            Alert.alert('Registro exitoso', 'Tu cuenta fue creada. Revisa tu correo para confirmar tu cuenta.');
            //navigation.navigate('login');
        } catch (error) {
            alert('No se pudo registrar', error.message || 'Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    }
*/


    return (
        <View style={styles.fondo}>
            <View style={{ alignItems: 'center' }}>
                <Text style={styles.textoInicio}>Registrate a</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.textoInicio}>Fleteando</Text>
                <Text style={styles.textoAlLado}>Te</Text>
                <View>
                    <Image
                        //source={require('../../assets/logo.png')}   <-- esta es otra forma de llamar a nuestra imagen
                        source={logoFleteandote}
                        style={styles.image}
                        resizeMode="contain"

                    />
                </View>
            </View>

            {/* ── Tarjeta blanca ── */}
            <View style={styles.cuadroInputs}>

                {/* Título */}
                <Text style={styles.subtitulo}>Ingresa tus datos para crear tu cuenta</Text>

                {/* campo del nombre */}
                <Text style={styles.etiqueta}>Nombre</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Cristian Alejandro"
                    placeholderTextColor="#aaa"
                    value={name}
                    onChangeText={(nombre) => {
                        setName(nombre);
                        console.log(nombre)
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {/* Campo correo */}
                <Text style={styles.etiqueta}>Correo electronico</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Cristian Alejandro"
                    placeholderTextColor="#aaa"
                    value={mail}
                    onChangeText={(texto) => {
                        setMail(texto);
                        console.log(texto)
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                {/* Campo contraseña */}
                <Text style={styles.etiqueta}>Contraseña</Text>

                <View style={styles.inputContenedor}>
                    <TextInput
                        style={styles.inputSinBorde}
                        placeholder="Escribe acá tu contraseña"
                        placeholderTextColor="#aaa"
                        value={password}
                        onChangeText={(pass) => {
                            setPassword(pass);
                            console.log(pass);
                        }}
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
                <Text style={styles.etiqueta}>Confirmar contraseña</Text>
                <View style={styles.inputContenedor}>
                    <TextInput
                        style={styles.inputSinBorde}
                        placeholder="Escribe acá tu contraseña"
                        placeholderTextColor="#aaa"
                        value={password2}
                        onChangeText={(pass) => {
                            setPassword2(pass);
                            console.log(pass);
                        }}
                        secureTextEntry={!verPass2}
                    />
                    <Pressable onPress={() => setVerPass(!verPass2)}>
                        <Ionicons
                            name={verPass2 ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color="#888"
                        />
                    </Pressable>
                    {/* nos falta poner la funcion que esta arriba "requuesDb que es para que pueda detectar que los datos son correctos segun la base de datos en la nube" */}

                </View>
                {password2.length > 0 && password !== password2 && (
                    <Text style={styles.errorText}>
                        Las contraseñas no coinciden
                    </Text>
                )}


                {/* Botón Entrar */}
                <Pressable
                    style={({ pressed }) => [styles.botonEntrar, pressed && { opacity: 0.8 }]}
                    onPress={() => console.log('entrando...')}
                >
                    <Text style={styles.textoBotonEntrar}>Entrar</Text>
                </Pressable>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.linea} />
                    <Text style={styles.textoDivider}>o registrate con</Text>
                    <View style={styles.linea} />
                </View>



                <Pressable
                    style={({ pressed }) => [styles.botonGoogle, pressed && { opacity: 0.8 }]}
                    onPress={() => console.log('entrando por google...')}
                >
                    <Text style={styles.textoGoogle}>G  Google</Text>
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
        marginLeft: 7
    },
    textoAlLado: {
        fontFamily: 'Poppins_800ExtraBold',
        fontSize: 26,
        color: '#F97316',
        marginLeft: 4
    },
    image: {
        width: 90,
        height: 70,
        marginLeft: 10
    },
    inputContenedor: {
        flexDirection: 'row',       // ← input y ojito en la misma fila
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    inputSinBorde: {
        flex: 1,                    // ← ocupa todo el espacio dejando lugar al ojito
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#333',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginLeft: 10,
        marginBottom: 10,
        fontWeight: 'bold'
    },
})