import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

export default function ScreenSubirDatosFletero() {
    const router = useRouter();
    const { usuario, setUsuario } = useAuth();
    const { width, height } = useWindowDimensions();

    const [nombre, setNombre] = useState(
        usuario?.nombre ?? ''
    );

    const [telefono, setTelefono] = useState(
        usuario?.telefono ?? ''
    );

    const [fotoUrl, setFotoUrl] = useState(
        usuario?.foto_url ?? null
    );

    const [nuevaFotoUri, setNuevaFotoUri] =
        useState(null);

    const [guardando, setGuardando] =
        useState(false);

    const pantallaPequena = height < 700;

    const tamanoFoto = Math.min(
        Math.max(width * 0.25, 88),
        110
    );

    const elegirFoto = () => {
        Alert.alert(
            'Foto de perfil',
            'Elige una opción',
            [
                {
                    text: 'Tomar foto',
                    onPress: tomarFoto,
                },
                {
                    text: 'Elegir de galería',
                    onPress:
                        seleccionarGaleria,
                },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
            ]
        );
    };

    const tomarFoto = async () => {
        try {
            const permiso =
                await ImagePicker.requestCameraPermissionsAsync();

            if (!permiso.granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Necesitamos acceso a tu cámara para tomar una foto.'
                );

                return;
            }

            const resultado =
                await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });

            if (
                !resultado.canceled &&
                resultado.assets?.[0]?.uri
            ) {
                setNuevaFotoUri(
                    resultado.assets[0].uri
                );
            }
        } catch (error) {
            console.log(
                'Error al abrir la cámara:',
                error
            );

            Alert.alert(
                'Error',
                'No se pudo abrir la cámara.'
            );
        }
    };

    const seleccionarGaleria = async () => {
        try {
            const permiso =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permiso.granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Necesitamos acceso a tu galería para seleccionar una foto.'
                );

                return;
            }

            const resultado =
                await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                    mediaTypes:
                        ImagePicker.MediaTypeOptions
                            .Images,
                });

            if (
                !resultado.canceled &&
                resultado.assets?.[0]?.uri
            ) {
                setNuevaFotoUri(
                    resultado.assets[0].uri
                );
            }
        } catch (error) {
            console.log(
                'Error al abrir la galería:',
                error
            );

            Alert.alert(
                'Error',
                'No se pudo abrir la galería.'
            );
        }
    };

    const subirFotoPerfil = async (uri) => {
        if (!usuario?.fletero_id) {
            return null;
        }

        const nombreArchivo =
            `perfil_fletero_${usuario.fletero_id}_${Date.now()}.jpg`;

        try {
            const response = await fetch(uri);
            const arrayBuffer =
                await response.arrayBuffer();

            const { error } =
                await supabase.storage
                    .from('documentos')
                    .upload(
                        nombreArchivo,
                        arrayBuffer,
                        {
                            contentType:
                                'image/jpeg',
                            upsert: true,
                        }
                    );

            if (error) {
                console.log(
                    'Error al subir foto:',
                    error
                );

                return null;
            }

            const { data: urlData } =
                supabase.storage
                    .from('documentos')
                    .getPublicUrl(
                        nombreArchivo
                    );

            return (
                urlData?.publicUrl ??
                null
            );
        } catch (error) {
            console.log(
                'Error general al subir foto:',
                error
            );

            return null;
        }
    };

    const guardarDatos = async () => {
        const nombreLimpio =
            nombre.trim();

        const telefonoLimpio =
            telefono.trim();

        if (!nombreLimpio) {
            Alert.alert(
                'Falta información',
                'El nombre no puede estar vacío.'
            );

            return;
        }

        if (!usuario?.fletero_id) {
            Alert.alert(
                'Error',
                'No se encontró el identificador del fletero.'
            );

            return;
        }

        setGuardando(true);

        try {
            let urlFotoFinal = fotoUrl;

            if (nuevaFotoUri) {
                urlFotoFinal =
                    await subirFotoPerfil(
                        nuevaFotoUri
                    );

                if (!urlFotoFinal) {
                    Alert.alert(
                        'Error',
                        'No se pudo subir la foto. Intenta de nuevo.'
                    );

                    return;
                }
            }

            const { error } =
                await supabase
                    .from('fletero')
                    .update({
                        nombre:
                            nombreLimpio,
                        telefono:
                            telefonoLimpio ||
                            null,
                        foto_url:
                            urlFotoFinal,
                    })
                    .eq(
                        'fletero_id',
                        usuario.fletero_id
                    );

            if (error) {
                console.log(
                    'Error al actualizar fletero:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudieron guardar los datos. Intenta de nuevo.'
                );

                return;
            }

            setUsuario({
                ...usuario,
                nombre: nombreLimpio,
                telefono:
                    telefonoLimpio ||
                    null,
                foto_url:
                    urlFotoFinal,
            });

            setFotoUrl(urlFotoFinal);
            setNuevaFotoUri(null);

            Alert.alert(
                '¡Datos actualizados!',
                'Tu perfil fue actualizado correctamente.',
                [
                    {
                        text: 'OK',
                        onPress: () =>
                            router.back(),
                    },
                ]
            );
        } catch (error) {
            console.log(
                'Error general al guardar:',
                error
            );

            Alert.alert(
                'Error',
                'Ocurrió un problema al guardar los datos.'
            );
        } finally {
            setGuardando(false);
        }
    };

    const fotoMostrar =
        nuevaFotoUri ?? fotoUrl;

    const inicial =
        nombre.trim().charAt(0).toUpperCase() ||
        'F';

    return (
        <View style={styles.container}>
            {/* Encabezado seguro */}
            <SafeAreaView
                style={
                    styles.headerSafeArea
                }
                edges={['top']}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() =>
                            router.back()
                        }
                        style={
                            styles.backBtn
                        }
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Regresar"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>

                    <View
                        style={
                            styles.headerTextContainer
                        }
                    >
                        <Text
                            style={
                                styles.headerTitle
                            }
                            numberOfLines={1}
                        >
                            Datos personales
                        </Text>

                        <Text
                            style={
                                styles.headerSub
                            }
                            numberOfLines={1}
                        >
                            Actualiza la información
                            de tu perfil
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={
                    styles.keyboardContainer
                }
                behavior={
                    Platform.OS === 'ios'
                        ? 'padding'
                        : 'height'
                }
                keyboardVerticalOffset={0}
            >
                <SafeAreaView
                    style={
                        styles.contentSafeArea
                    }
                    edges={['bottom']}
                >
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[
                            styles.content,
                            pantallaPequena &&
                            styles.contentCompacto,
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        {/* Foto de perfil */}
                        <View
                            style={
                                styles.fotoPerfilContainer
                            }
                        >
                            <TouchableOpacity
                                onPress={
                                    elegirFoto
                                }
                                activeOpacity={0.85}
                                style={
                                    styles.fotoTouchable
                                }
                                accessibilityRole="button"
                                accessibilityLabel="Cambiar foto de perfil"
                            >
                                {fotoMostrar ? (
                                    <Image
                                        source={{
                                            uri: fotoMostrar,
                                        }}
                                        style={[
                                            styles.fotoPerfil,
                                            {
                                                width: tamanoFoto,
                                                height: tamanoFoto,
                                                borderRadius:
                                                    tamanoFoto /
                                                    2,
                                            },
                                        ]}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.fotoPlaceholder,
                                            {
                                                width: tamanoFoto,
                                                height: tamanoFoto,
                                                borderRadius:
                                                    tamanoFoto /
                                                    2,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={
                                                styles.fotoInicial
                                            }
                                        >
                                            {inicial}
                                        </Text>
                                    </View>
                                )}

                                <View
                                    style={
                                        styles.camaraOverlay
                                    }
                                >
                                    <Ionicons
                                        name="camera"
                                        size={16}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </TouchableOpacity>

                            <Text
                                style={
                                    styles.fotoHint
                                }
                            >
                                Toca para cambiar tu
                                foto de perfil
                            </Text>
                        </View>

                        {/* Formulario */}
                        <View
                            style={
                                styles.formulario
                            }
                        >
                            <Text
                                style={
                                    styles.sectionLabel
                                }
                            >
                                NOMBRE COMPLETO
                            </Text>

                            <View
                                style={
                                    styles.inputContainer
                                }
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={19}
                                    color="#64748B"
                                />

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    placeholder="Tu nombre completo"
                                    placeholderTextColor="#94A3B8"
                                    value={nombre}
                                    onChangeText={
                                        setNombre
                                    }
                                    autoCapitalize="words"
                                    autoCorrect={
                                        false
                                    }
                                    maxLength={150}
                                    returnKeyType="next"
                                />
                            </View>

                            <Text
                                style={
                                    styles.sectionLabel
                                }
                            >
                                CORREO ELECTRÓNICO
                            </Text>

                            <View
                                style={
                                    styles.inputReadOnly
                                }
                            >
                                <View
                                    style={
                                        styles.inputReadOnlyContent
                                    }
                                >
                                    <Ionicons
                                        name="mail-outline"
                                        size={19}
                                        color="#94A3B8"
                                    />

                                    <Text
                                        style={
                                            styles.inputReadOnlyTxt
                                        }
                                        numberOfLines={1}
                                    >
                                        {usuario?.email ??
                                            '—'}
                                    </Text>
                                </View>

                                <Ionicons
                                    name="lock-closed-outline"
                                    size={16}
                                    color="#94A3B8"
                                />
                            </View>

                            <Text
                                style={
                                    styles.inputHint
                                }
                            >
                                El correo no se puede
                                modificar.
                            </Text>

                            <Text
                                style={
                                    styles.sectionLabel
                                }
                            >
                                TELÉFONO
                            </Text>

                            <View
                                style={
                                    styles.inputContainer
                                }
                            >
                                <Ionicons
                                    name="call-outline"
                                    size={19}
                                    color="#64748B"
                                />

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    placeholder="Ej. 984 123 4567"
                                    placeholderTextColor="#94A3B8"
                                    value={telefono}
                                    onChangeText={
                                        setTelefono
                                    }
                                    keyboardType="phone-pad"
                                    maxLength={20}
                                    returnKeyType="done"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.btnGuardar,
                                guardando &&
                                styles.btnGuardarDisabled,
                            ]}
                            onPress={
                                guardarDatos
                            }
                            disabled={guardando}
                            activeOpacity={0.85}
                        >
                            {guardando ? (
                                <ActivityIndicator
                                    color="#FFFFFF"
                                />
                            ) : (
                                <>
                                    <Ionicons
                                        name="save-outline"
                                        size={20}
                                        color="#FFFFFF"
                                    />

                                    <Text
                                        style={
                                            styles.btnGuardarTxt
                                        }
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={
                                            0.85
                                        }
                                    >
                                        Guardar cambios
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    /* Encabezado */

    headerSafeArea: {
        backgroundColor: '#071B33',
        zIndex: 20,
        elevation: 20,
    },

    header: {
        width: '100%',
        minHeight: 70,
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#071B33',

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
        marginRight: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor:
            'rgba(255,255,255,0.14)',
    },

    headerTextContainer: {
        flex: 1,
        minWidth: 0,
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },

    headerSub: {
        marginTop: 2,
        color:
            'rgba(255,255,255,0.65)',
        fontSize: 12,
    },

    /* Contenido */

    keyboardContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    contentSafeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    scroll: {
        flex: 1,
    },

    content: {
        flexGrow: 1,
        width: '100%',
        maxWidth: 620,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 28,
    },

    contentCompacto: {
        paddingTop: 14,
        paddingBottom: 20,
    },

    /* Foto */

    fotoPerfilContainer: {
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 18,
    },

    fotoTouchable: {
        position: 'relative',
    },

    fotoPerfil: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: '#E2E8F0',

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.16,
        shadowRadius: 7,
        elevation: 5,
    },

    fotoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: '#0B2545',

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.16,
        shadowRadius: 7,
        elevation: 5,
    },

    fotoInicial: {
        color: '#FFFFFF',
        fontSize: 38,
        fontWeight: '700',
    },

    camaraOverlay: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#F8FAFC',
        backgroundColor: '#F97316',
    },

    fotoHint: {
        marginTop: 10,
        color: '#94A3B8',
        fontSize: 12,
        textAlign: 'center',
    },

    /* Formulario */

    formulario: {
        width: '100%',
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },

    sectionLabel: {
        marginTop: 18,
        marginBottom: 8,
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },

    inputContainer: {
        width: '100%',
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },

    input: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 14,
        color: '#0F172A',
        fontSize: 15,
    },

    inputReadOnly: {
        width: '100%',
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
            'space-between',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F1F5F9',
    },

    inputReadOnlyContent: {
        flex: 1,
        minWidth: 0,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },

    inputReadOnlyTxt: {
        flex: 1,
        minWidth: 0,
        marginLeft: 10,
        color: '#94A3B8',
        fontSize: 15,
    },

    inputHint: {
        marginTop: 5,
        color: '#94A3B8',
        fontSize: 11,
    },

    /* Botón */

    btnGuardar: {
        width: '100%',
        minHeight: 54,
        marginTop: 24,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F97316',

        shadowColor: '#F97316',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 4,
    },

    btnGuardarDisabled: {
        opacity: 0.6,
    },

    btnGuardarTxt: {
        flexShrink: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});