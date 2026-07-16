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

export default function ScreenSubirDatosFletero() {
    const router = useRouter();
    const { usuario, setUsuario } = useAuth();

    const [nombre, setNombre] = useState(usuario?.nombre ?? '');
    const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
    const [fotoUrl, setFotoUrl] = useState(usuario?.foto_url ?? null);
    const [nuevaFotoUri, setNuevaFotoUri] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const elegirFoto = () => {
        Alert.alert('Foto de perfil', 'Elige una opción', [
            { text: 'Tomar foto', onPress: tomarFoto },
            { text: 'Elegir de galería', onPress: seleccionarGaleria },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const tomarFoto = async () => {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
            return;
        }
        const resultado = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!resultado.canceled) setNuevaFotoUri(resultado.assets[0].uri);
    };

    const seleccionarGaleria = async () => {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
            return;
        }
        const resultado = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
        if (!resultado.canceled) setNuevaFotoUri(resultado.assets[0].uri);
    };

    const subirFotoPerfil = async (uri) => {
        const nombreArchivo = `perfil_fletero_${usuario.fletero_id}_${Date.now()}.jpg`;
        try {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const { error } = await supabase.storage
                .from('documentos')
                .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
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
        if (!nombre.trim()) {
            Alert.alert('Falta información', 'El nombre no puede estar vacío.');
            return;
        }

        setGuardando(true);
        try {
            let urlFotoFinal = fotoUrl;

            if (nuevaFotoUri) {
                urlFotoFinal = await subirFotoPerfil(nuevaFotoUri);
                if (!urlFotoFinal) {
                    Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
                    setGuardando(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('fletero')
                .update({
                    nombre: nombre.trim(),
                    telefono: telefono.trim() || null,
                    foto_url: urlFotoFinal,
                })
                .eq('fletero_id', usuario.fletero_id);

            if (error) {
                Alert.alert('Error', 'No se pudieron guardar los datos. Intenta de nuevo.');
                return;
            }

            setUsuario({
                ...usuario,
                nombre: nombre.trim(),
                telefono: telefono.trim() || null,
                foto_url: urlFotoFinal,
            });

            Alert.alert(
                '¡Datos actualizados!',
                'Tu perfil fue actualizado correctamente.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch {
            Alert.alert('Error', 'Ocurrió un problema al guardar los datos.');
        } finally {
            setGuardando(false);
        }
    };

    const fotoMostrar = nuevaFotoUri ?? fotoUrl;
    const inicial = nombre.charAt(0).toUpperCase();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Datos personales</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Foto de perfil */}
                <View style={styles.fotoPerfilContainer}>
                    <TouchableOpacity onPress={elegirFoto} activeOpacity={0.85} style={styles.fotoTouchable}>
                        {fotoMostrar ? (
                            <Image source={{ uri: fotoMostrar }} style={styles.fotoPerfil} />
                        ) : (
                            <View style={styles.fotoPlaceholder}>
                                <Text style={styles.fotoInicial}>{inicial}</Text>
                            </View>
                        )}
                        <View style={styles.camaraOverlay}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.fotoHint}>Toca para cambiar tu foto de perfil</Text>
                </View>

                {/* Nombre */}
                <Text style={styles.sectionLabel}>NOMBRE COMPLETO</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Tu nombre completo"
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="words"
                    maxLength={150}
                />

                {/* Correo (solo lectura) */}
                <Text style={styles.sectionLabel}>CORREO ELECTRÓNICO</Text>
                <View style={styles.inputReadOnly}>
                    <Text style={styles.inputReadOnlyTxt}>{usuario?.email ?? '—'}</Text>
                    <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
                </View>
                <Text style={styles.inputHint}>El correo no se puede modificar.</Text>

                {/* Teléfono */}
                <Text style={styles.sectionLabel}>TELÉFONO</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. 984 123 4567"
                    value={telefono}
                    onChangeText={setTelefono}
                    keyboardType="phone-pad"
                    maxLength={20}
                />

                <TouchableOpacity
                    style={[styles.btnGuardar, guardando && styles.btnGuardarDisabled]}
                    onPress={guardarDatos}
                    disabled={guardando}
                    activeOpacity={0.85}
                >
                    {guardando
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnGuardarTxt}>Guardar cambios</Text>
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
    fotoPerfilContainer: { alignItems: 'center', marginBottom: 8, marginTop: 8 },
    fotoTouchable: { position: 'relative' },
    fotoPerfil: { width: 100, height: 100, borderRadius: 50 },
    fotoPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#0b2545', justifyContent: 'center', alignItems: 'center',
    },
    fotoInicial: { color: '#fff', fontSize: 38, fontWeight: '700' },
    camaraOverlay: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#f97316', width: 30, height: 30,
        borderRadius: 15, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#F8FAFC',
    },
    fotoHint: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 0.8, marginBottom: 8, marginTop: 20,
    },
    input: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
        borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#0F172A',
    },
    inputReadOnly: {
        backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1,
        borderColor: '#E2E8F0', padding: 14, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
    },
    inputReadOnlyTxt: { fontSize: 15, color: '#94A3B8' },
    inputHint: { fontSize: 11, color: '#CBD5E1', marginTop: 4 },
    btnGuardar: {
        backgroundColor: '#f97316', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', marginTop: 28,
    },
    btnGuardarDisabled: { backgroundColor: '#FBD0B0' },
    btnGuardarTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});