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

const TIPOS_VEHICULO = [
    { key: 'camioneta', label: 'Camioneta' },
    { key: 'pickup', label: 'Pick-up' },
    { key: 'camion_3_5', label: 'Camión 3.5 ton' },
    { key: 'camion_5', label: 'Camión 5 ton' },
    { key: 'camion_10', label: 'Camión 10 ton' },
];


export default function ScreenSubirVehiculo() {
    const router = useRouter();
    const { usuario, setUsuario } = useAuth();
    const { width, height } = useWindowDimensions();

    const [tipoVehiculo, setTipoVehiculo] = useState(
        usuario?.tipo_vehiculo ?? ''
    );
    const [placa, setPlaca] = useState(usuario?.placa_vehiculo ?? '');
    const [tonelaje, setTonelaje] = useState(
        usuario?.tonelaje !== null && usuario?.tonelaje !== undefined
            ? String(usuario.tonelaje)
            : ''
    );
    const [fotoVehiculo, setFotoVehiculo] = useState(
        usuario?.foto_vehiculo_url ?? null
    );
    const [nuevaFotoUri, setNuevaFotoUri] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const pantallaPequena = height < 700;
    const anchoContenido = Math.min(width, 760);

    const seleccionarFoto = async () => {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!resultado.canceled) {
            setNuevaFotoUri(resultado.assets[0].uri);
        }
    };

    const tomarFoto = async () => {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();

        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
            return;
        }

        const resultado = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!resultado.canceled) {
            setNuevaFotoUri(resultado.assets[0].uri);
        }
    };

    const elegirFoto = () => {
        Alert.alert('Foto del vehículo', 'Elige una opción', [
            { text: 'Tomar foto', onPress: tomarFoto },
            { text: 'Elegir de galería', onPress: seleccionarFoto },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const subirFotoVehiculo = async (uri) => {
        if (!usuario?.fletero_id) {
            return null;
        }

        const nombreArchivo = `vehiculo_${usuario.fletero_id}_${Date.now()}.jpg`;

        try {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();

            const { error } = await supabase.storage
                .from('documentos')
                .upload(nombreArchivo, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                console.log('Error al subir foto del vehículo:', error);
                return null;
            }

            const { data: urlData } = supabase.storage
                .from('documentos')
                .getPublicUrl(nombreArchivo);

            return urlData.publicUrl;
        } catch (error) {
            console.log('Error general al subir foto:', error);
            return null;
        }
    };

    const manejarCambioTonelaje = (texto) => {
        const valorLimpio = texto.replace(',', '.').replace(/[^0-9.]/g, '');
        const partes = valorLimpio.split('.');

        if (partes.length > 2) {
            return;
        }

        setTonelaje(valorLimpio);
    };

    const guardarDatos = async () => {
        if (!usuario?.fletero_id) {
            Alert.alert('Error', 'No se encontró el perfil del fletero.');
            return;
        }

        if (!tipoVehiculo) {
            Alert.alert('Falta información', 'Selecciona el tipo de vehículo.');
            return;
        }

        if (!placa.trim()) {
            Alert.alert('Falta información', 'Ingresa la placa del vehículo.');
            return;
        }

        if (!tonelaje.trim()) {
            Alert.alert(
                'Falta información',
                'Ingresa el tonelaje máximo del vehículo.'
            );
            return;
        }

        const tonelajeNumero = Number(tonelaje.replace(',', '.'));

        if (!Number.isFinite(tonelajeNumero) || tonelajeNumero <= 0) {
            Alert.alert(
                'Tonelaje inválido',
                'Ingresa un tonelaje mayor a cero.'
            );
            return;
        }

        setGuardando(true);

        try {
            let urlFotoFinal = fotoVehiculo;

            if (nuevaFotoUri) {
                urlFotoFinal = await subirFotoVehiculo(nuevaFotoUri);

                if (!urlFotoFinal) {
                    Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
                    return;
                }
            }

            const placaNormalizada = placa.trim().toUpperCase();

            const { error } = await supabase
                .from('fletero')
                .update({
                    tipo_vehiculo: tipoVehiculo,
                    placa_vehiculo: placaNormalizada,
                    tonelaje: tonelajeNumero,
                    foto_vehiculo_url: urlFotoFinal,
                })
                .eq('fletero_id', usuario.fletero_id);

            if (error) {
                console.log('Error al guardar datos del vehículo:', error);

                Alert.alert(
                    'Error',
                    'No se pudieron guardar los datos. Intenta de nuevo.'
                );
                return;
            }

            setFotoVehiculo(urlFotoFinal);
            setNuevaFotoUri(null);

            setUsuario({
                ...usuario,
                tipo_vehiculo: tipoVehiculo,
                placa_vehiculo: placaNormalizada,
                tonelaje: tonelajeNumero,
                foto_vehiculo_url: urlFotoFinal,
            });

            Alert.alert(
                '¡Datos guardados!',
                'Los datos de tu vehículo fueron actualizados correctamente.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.log('Error general al guardar vehículo:', error);
            Alert.alert('Error', 'Ocurrió un problema al guardar los datos.');
        } finally {
            setGuardando(false);
        }
    };

    const fotoMostrar = nuevaFotoUri ?? fotoVehiculo;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Regresar"
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    <Text
                        style={styles.headerTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                    >
                        Datos del vehículo
                    </Text>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[
                            styles.content,
                            { width: anchoContenido },
                            pantallaPequena && styles.contentPequeno,
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        bounces={false}
                    >
                        <Text style={[styles.sectionLabel, styles.primerLabel]}>
                            FOTO DEL VEHÍCULO
                        </Text>

                        <TouchableOpacity
                            style={styles.fotoContainer}
                            onPress={elegirFoto}
                            activeOpacity={0.85}
                        >
                            {fotoMostrar ? (
                                <>
                                    <Image
                                        source={{ uri: fotoMostrar }}
                                        style={styles.fotoVehiculo}
                                        resizeMode="cover"
                                    />

                                    <View style={styles.fotoOverlay}>
                                        <Ionicons name="camera" size={22} color="#fff" />
                                        <Text style={styles.fotoOverlayTxt}>Cambiar foto</Text>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.fotoPlaceholder}>
                                    <Ionicons name="car-outline" size={48} color="#94A3B8" />
                                    <Text style={styles.fotoPlaceholderTxt}>
                                        Toca para agregar foto
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.sectionLabel}>TIPO DE VEHÍCULO</Text>

                        <View style={styles.tiposGrid}>
                            {TIPOS_VEHICULO.map((tipo) => {
                                const seleccionado = tipoVehiculo === tipo.key;

                                return (
                                    <TouchableOpacity
                                        key={tipo.key}
                                        style={[
                                            styles.tipoBtn,
                                            seleccionado && styles.tipoBtnSelected,
                                        ]}
                                        onPress={() => setTipoVehiculo(tipo.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.tipoBtnTxt,
                                                seleccionado && styles.tipoBtnTxtSelected,
                                            ]}
                                        >
                                            {tipo.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.sectionLabel}>PLACA DEL VEHÍCULO</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ej. ABC-1234"
                            placeholderTextColor="#94A3B8"
                            value={placa}
                            onChangeText={setPlaca}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            maxLength={10}
                            returnKeyType="next"
                        />

                        <Text style={styles.sectionLabel}>TONELAJE DEL VEHÍCULO</Text>

                        <TextInput
                            style={[styles.input, styles.inputTonelaje]}
                            placeholder="Ingresa el peso maximo que tu vehiculo es capaz de enviar"
                            placeholderTextColor="#94A3B8"
                            value={tonelaje}
                            onChangeText={manejarCambioTonelaje}
                            keyboardType="decimal-pad"
                            inputMode="decimal"
                            autoCorrect={false}
                            maxLength={8}
                            returnKeyType="done"
                            onSubmitEditing={guardarDatos}
                        />

                        <Text style={styles.ayudaTonelaje}>
                            Ingresa el peso máximo en toneladas. Ejemplo: 3.5
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.btnGuardar,
                                guardando && styles.btnGuardarDisabled,
                            ]}
                            onPress={guardarDatos}
                            disabled={guardando}
                            activeOpacity={0.85}
                        >
                            {guardando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text
                                    style={styles.btnGuardarTxt}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.85}
                                >
                                    Guardar datos del vehículo
                                </Text>
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
    headerSafeArea: {
        backgroundColor: '#0b2545',
    },
    header: {
        minHeight: 60,
        backgroundColor: '#0b2545',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
    },
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
        maxWidth: 760,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    contentPequeno: {
        paddingTop: 14,
        paddingBottom: 28,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.8,
        marginBottom: 10,
        marginTop: 20,
    },
    primerLabel: {
        marginTop: 0,
    },
    fotoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    fotoVehiculo: {
        width: '100%',
        height: '100%',
    },
    fotoOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    fotoOverlayTxt: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    fotoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    fotoPlaceholderTxt: {
        color: '#94A3B8',
        fontSize: 14,
    },
    tiposGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tipoBtn: {
        minHeight: 42,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    tipoBtnSelected: {
        backgroundColor: '#0b2545',
        borderColor: '#0b2545',
    },
    tipoBtnTxt: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    tipoBtnTxtSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    input: {
        width: '100%',
        minHeight: 50,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        color: '#0F172A',
        letterSpacing: 1,
    },
    inputTonelaje: {
        letterSpacing: 0,
    },
    ayudaTonelaje: {
        color: '#94A3B8',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 7,
    },
    btnGuardar: {
        minHeight: 52,
        backgroundColor: '#f97316',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 28,
    },
    btnGuardarDisabled: {
        backgroundColor: '#FBD0B0',
    },
    btnGuardarTxt: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});