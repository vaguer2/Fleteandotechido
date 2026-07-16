import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Platform,
    ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
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

    const [tipoVehiculo, setTipoVehiculo] = useState(usuario?.tipo_vehiculo ?? '');
    const [placa, setPlaca] = useState(usuario?.placa_vehiculo ?? '');
    const [fotoVehiculo, setFotoVehiculo] = useState(usuario?.foto_vehiculo_url ?? null);
    const [nuevaFotoUri, setNuevaFotoUri] = useState(null);
    const [guardando, setGuardando] = useState(false);

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
            if (error) return null;
            const { data: urlData } = supabase.storage
                .from('documentos')
                .getPublicUrl(nombreArchivo);
            return urlData.publicUrl;
        } catch {
            return null;
        }
    };

    const guardarDatos = async () => {
        if (!tipoVehiculo) {
            Alert.alert('Falta información', 'Selecciona el tipo de vehículo.');
            return;
        }
        if (!placa.trim()) {
            Alert.alert('Falta información', 'Ingresa la placa del vehículo.');
            return;
        }

        setGuardando(true);
        try {
            let urlFotoFinal = fotoVehiculo;

            if (nuevaFotoUri) {
                urlFotoFinal = await subirFotoVehiculo(nuevaFotoUri);
                if (!urlFotoFinal) {
                    Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
                    setGuardando(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('fletero')
                .update({
                    tipo_vehiculo: tipoVehiculo,
                    placa_vehiculo: placa.trim().toUpperCase(),
                    foto_vehiculo_url: urlFotoFinal,
                })
                .eq('fletero_id', usuario.fletero_id);

            if (error) {
                Alert.alert('Error', 'No se pudieron guardar los datos. Intenta de nuevo.');
                return;
            }

            // Actualizar el contexto del AuthProvider
            setUsuario({
                ...usuario,
                tipo_vehiculo: tipoVehiculo,
                placa_vehiculo: placa.trim().toUpperCase(),
                foto_vehiculo_url: urlFotoFinal,
            });

            Alert.alert(
                '¡Datos guardados!',
                'Los datos de tu vehículo fueron actualizados correctamente.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch {
            Alert.alert('Error', 'Ocurrió un problema al guardar los datos.');
        } finally {
            setGuardando(false);
        }
    };

    const fotoMostrar = nuevaFotoUri ?? fotoVehiculo;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Datos del vehículo</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Foto del vehículo */}
                <Text style={styles.sectionLabel}>FOTO DEL VEHÍCULO</Text>
                <TouchableOpacity style={styles.fotoContainer} onPress={elegirFoto} activeOpacity={0.85}>
                    {fotoMostrar ? (
                        <>
                            <Image source={{ uri: fotoMostrar }} style={styles.fotoVehiculo} resizeMode="cover" />
                            <View style={styles.fotoOverlay}>
                                <Ionicons name="camera" size={22} color="#fff" />
                                <Text style={styles.fotoOverlayTxt}>Cambiar foto</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.fotoPlaceholder}>
                            <Ionicons name="car-outline" size={48} color="#94A3B8" />
                            <Text style={styles.fotoPlaceholderTxt}>Toca para agregar foto</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Tipo de vehículo */}
                <Text style={styles.sectionLabel}>TIPO DE VEHÍCULO</Text>
                <View style={styles.tiposGrid}>
                    {TIPOS_VEHICULO.map((tipo) => (
                        <TouchableOpacity
                            key={tipo.key}
                            style={[styles.tipoBtn, tipoVehiculo === tipo.key && styles.tipoBtnSelected]}
                            onPress={() => setTipoVehiculo(tipo.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tipoBtnTxt, tipoVehiculo === tipo.key && styles.tipoBtnTxtSelected]}>
                                {tipo.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Placa */}
                <Text style={styles.sectionLabel}>PLACA DEL VEHÍCULO</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. ABC-1234"
                    value={placa}
                    onChangeText={setPlaca}
                    autoCapitalize="characters"
                    maxLength={10}
                />

                <TouchableOpacity
                    style={[styles.btnGuardar, guardando && styles.btnGuardarDisabled]}
                    onPress={guardarDatos}
                    disabled={guardando}
                    activeOpacity={0.85}
                >
                    {guardando
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnGuardarTxt}>Guardar datos del vehículo</Text>
                    }
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#0b2545',
        paddingTop: Platform.OS === 'ios' ? 54 : 28,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 0.8, marginBottom: 10, marginTop: 20,
    },
    fotoContainer: {
        width: '100%', height: 200, borderRadius: 16,
        overflow: 'hidden', backgroundColor: '#F1F5F9',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    fotoVehiculo: { width: '100%', height: '100%' },
    fotoOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 10, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    fotoOverlayTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
    fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    fotoPlaceholderTxt: { color: '#94A3B8', fontSize: 14 },
    tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tipoBtn: {
        paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    tipoBtnSelected: { backgroundColor: '#0b2545', borderColor: '#0b2545' },
    tipoBtnTxt: { fontSize: 13, color: '#374151', fontWeight: '500' },
    tipoBtnTxtSelected: { color: '#fff', fontWeight: '700' },
    input: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
        borderColor: '#E2E8F0', padding: 14, fontSize: 15,
        color: '#0F172A', letterSpacing: 1,
    },
    btnGuardar: {
        backgroundColor: '#f97316', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', marginTop: 28,
    },
    btnGuardarDisabled: { backgroundColor: '#FBD0B0' },
    btnGuardarTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});