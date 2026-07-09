import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, SafeAreaView, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../../../../lib/supabase';

const NAVY = '#0B1F3D';
const ORANGE = '#F5821F';

export default function ScreenCalificaciones() {
    const router = useRouter();
    const { solicitudId, fleteroNombre } = useLocalSearchParams();

    const [rating, setRating] = useState(0);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const iniciales = (fleteroNombre || 'Fletero')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const handleEnviar = async () => {
        if (rating === 0) {
            Alert.alert('Falta calificacion', 'Selecciona al menos 1 estrella.');
            return;
        }
        if (!solicitudId) {
            Alert.alert('Error', 'No se encontro la solicitud.');
            return;
        }

        setEnviando(true);
        try {
            // Intentamos insertar primero; si ya existe la fila (unique constraint), hacemos upsert
            const { error } = await supabase
                .from('calificacion')
                .upsert({
                    solicitud_id: Number(solicitudId),
                    estrellas_al_fletero: rating,
                    comentario_al_fletero: comentario.trim() || null,
                }, { onConflict: 'solicitud_id' });

            if (error) throw error;

            Alert.alert(
                'Gracias por tu calificacion',
                'Tu opinion ayuda a mejorar el servicio.',
                [{ text: 'OK', onPress: () => router.replace('/Screen/Home/ScreenHomeUser') }]
            );
        } catch (err) {
            console.log('Error al enviar calificacion:', err);
            Alert.alert('Error', 'No se pudo enviar la calificacion. Intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calificar servicio</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.content}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{iniciales}</Text>
                </View>

                <Text style={styles.nombre}>{fleteroNombre || 'Tu fletero'}</Text>
                <Text style={styles.pregunta}>
                    El servicio ha sido completado.{'\n'}
                    ¿Como estuvo el cuidado de tu cargamento?
                </Text>

                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((valor) => (
                        <TouchableOpacity key={valor} onPress={() => setRating(valor)}>
                            <Ionicons
                                name={valor <= rating ? 'star' : 'star-outline'}
                                size={40}
                                color={valor <= rating ? ORANGE : '#D9D9D9'}
                                style={{ marginHorizontal: 6 }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {rating > 0 && (
                    <Text style={styles.ratingLabel}>
                        {rating === 1 ? 'Muy malo' :
                            rating === 2 ? 'Malo' :
                                rating === 3 ? 'Regular' :
                                    rating === 4 ? 'Bueno' : 'Excelente'}
                        {' · '}{rating} de 5 estrellas
                    </Text>
                )}

                <Text style={styles.comentarioLabel}>Comentario (opcional)</Text>
                <TextInput
                    style={styles.comentarioInput}
                    placeholder="Escribe un comentario sobre el servicio..."
                    placeholderTextColor="#B0B0B0"
                    multiline
                    numberOfLines={4}
                    value={comentario}
                    onChangeText={setComentario}
                />

                <TouchableOpacity
                    style={[styles.enviarButton, (enviando || rating === 0) && styles.enviarDeshabilitado]}
                    onPress={handleEnviar}
                    disabled={enviando || rating === 0}
                >
                    {enviando
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.enviarButtonText}>Enviar calificacion</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.omitirBtn}
                    onPress={() => router.replace('/Screen/Home/ScreenHomeUser')}
                >
                    <Text style={styles.omitirTexto}>Omitir por ahora</Text>
                </TouchableOpacity>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: NAVY,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    backButton: { padding: 4, marginRight: 8 },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    content: {
        flex: 1, alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 40,
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#E3ECF7',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    avatarText: { color: NAVY, fontSize: 24, fontWeight: '700' },
    nombre: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
    pregunta: {
        fontSize: 14, color: '#777', marginBottom: 28,
        textAlign: 'center', lineHeight: 20,
    },
    starsRow: { flexDirection: 'row', marginBottom: 12 },
    ratingLabel: {
        color: ORANGE, fontWeight: '600',
        fontSize: 14, marginBottom: 28,
    },
    comentarioLabel: {
        alignSelf: 'flex-start', fontSize: 13,
        color: '#555', marginBottom: 6,
    },
    comentarioInput: {
        width: '100%', minHeight: 90,
        borderWidth: 1, borderColor: '#E0E0E0',
        borderRadius: 10, padding: 12,
        fontSize: 14, color: '#333',
        textAlignVertical: 'top', marginBottom: 24,
    },
    enviarButton: {
        width: '100%', backgroundColor: ORANGE,
        borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        marginBottom: 12,
    },
    enviarDeshabilitado: { backgroundColor: '#F5C49A' },
    enviarButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    omitirBtn: { paddingVertical: 8 },
    omitirTexto: { color: '#94A3B8', fontSize: 14 },
});