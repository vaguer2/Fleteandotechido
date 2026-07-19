import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';

const NAVY = '#0B1F3D';
const ORANGE = '#F5821F';

const obtenerParametro = (parametro: string | string[] | undefined): string => Array.isArray(parametro) ? parametro[0] ?? '' : parametro ?? '';

export default function ScreenCalificaciones() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { width, height } = useWindowDimensions();

    const solicitudIdTexto = obtenerParametro(params.solicitudId as string | string[] | undefined);
    const fleteroNombre = obtenerParametro(params.fleteroNombre as string | string[] | undefined).trim() || 'Tu fletero';
    const solicitudIdNumero = Number(solicitudIdTexto);
    const pantallaEstrecha = width < 370;
    const pantallaBaja = height < 700;

    const [rating, setRating] = useState(0);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const iniciales = fleteroNombre.split(' ').filter(Boolean).map(parte => parte[0]).join('').slice(0, 2).toUpperCase() || 'F';

    const obtenerTextoRating = () => {
        switch (rating) {
            case 1: return 'Muy malo';
            case 2: return 'Malo';
            case 3: return 'Regular';
            case 4: return 'Bueno';
            case 5: return 'Excelente';
            default: return '';
        }
    };

    const regresarAlInicio = () => {
        router.replace('/Screen/Home/ScreenHomeUser');
    };

    const handleEnviar = async () => {
        if (rating === 0) {
            Alert.alert('Falta calificación', 'Selecciona al menos 1 estrella.');
            return;
        }

        if (!Number.isInteger(solicitudIdNumero) || solicitudIdNumero <= 0) {
            Alert.alert('Solicitud no válida', 'No se encontró una solicitud válida para calificar.');
            return;
        }

        setEnviando(true);

        try {
            const { data: solicitud, error: errorSolicitud } = await supabase
                .from('solicitud')
                .select('solicitud_id, usuario_id, fletero_id, estado')
                .eq('solicitud_id', solicitudIdNumero)
                .maybeSingle();

            if (errorSolicitud) {
                console.log('Error al comprobar la solicitud:', errorSolicitud);
                throw errorSolicitud;
            }

            if (!solicitud) {
                Alert.alert('Solicitud no encontrada', 'La solicitud que intentas calificar no está disponible.');
                return;
            }

            if (solicitud.estado !== 'completada') {
                Alert.alert('Servicio no completado', 'Solo puedes calificar después de que el servicio haya sido completado.');
                return;
            }

            if (!solicitud.fletero_id) {
                Alert.alert('Fletero no encontrado', 'La solicitud no tiene un fletero relacionado.');
                return;
            }

            const { data, error } = await supabase
                .from('calificacion')
                .upsert({
                    solicitud_id: solicitudIdNumero,
                    estrellas_al_fletero: rating,
                    comentario_al_fletero: comentario.trim() || null,
                }, { onConflict: 'solicitud_id' })
                .select(`
          calificacion_id,
          solicitud_id,
          estrellas_al_fletero,
          comentario_al_fletero,
          estrellas_al_usuario,
          comentario_al_usuario,
          creado_en
        `)
                .single();

            if (error) {
                console.log('Error de Supabase al enviar la calificación:', error);
                throw error;
            }

            console.log('Calificación registrada:', data);

            Alert.alert('Gracias por tu calificación', 'Tu opinión ayuda a mejorar el servicio.', [
                { text: 'OK', onPress: regresarAlInicio },
            ]);
        } catch (error) {
            console.log('Error general al enviar la calificación:', error);
            Alert.alert('Error', 'No se pudo enviar la calificación. Intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Regresar"
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle} numberOfLines={1}>Calificar servicio</Text>
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
                        contentContainerStyle={[styles.content, pantallaBaja && styles.contentPantallaBaja]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{iniciales}</Text>
                        </View>

                        <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                            {fleteroNombre}
                        </Text>

                        <Text style={styles.pregunta}>
                            El servicio ha sido completado.{'\n'}¿Cómo estuvo el cuidado de tu cargamento?
                        </Text>

                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(valor => (
                                <TouchableOpacity
                                    key={valor}
                                    onPress={() => setRating(valor)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${valor} ${valor === 1 ? 'estrella' : 'estrellas'}`}
                                >
                                    <Ionicons
                                        name={valor <= rating ? 'star' : 'star-outline'}
                                        size={pantallaEstrecha ? 35 : 40}
                                        color={valor <= rating ? ORANGE : '#D9D9D9'}
                                        style={[styles.star, pantallaEstrecha && styles.starEstrecha]}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {rating > 0 && (
                            <Text style={styles.ratingLabel}>{obtenerTextoRating()} · {rating} de 5 estrellas</Text>
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
                            maxLength={500}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.enviarButton, (enviando || rating === 0) && styles.enviarDeshabilitado]}
                            onPress={handleEnviar}
                            disabled={enviando || rating === 0}
                            activeOpacity={0.85}
                        >
                            {enviando
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.enviarButtonText}>Enviar calificación</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.omitirBtn}
                            onPress={regresarAlInicio}
                            disabled={enviando}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.omitirTexto}>Omitir por ahora</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerSafeArea: { backgroundColor: NAVY },
    header: { minHeight: 56, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
    backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '600' },
    keyboardContainer: { flex: 1, backgroundColor: '#fff' },
    contentSafeArea: { flex: 1, backgroundColor: '#fff' },
    scroll: { flex: 1 },
    content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },
    contentPantallaBaja: { paddingTop: 24, paddingBottom: 24 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E3ECF7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarText: { color: NAVY, fontSize: 24, fontWeight: '700' },
    nombre: { maxWidth: '100%', fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
    pregunta: { maxWidth: 420, fontSize: 14, color: '#777', marginBottom: 28, textAlign: 'center', lineHeight: 20 },
    starsRow: { width: '100%', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
    star: { marginHorizontal: 6 },
    starEstrecha: { marginHorizontal: 3 },
    ratingLabel: { color: ORANGE, fontWeight: '600', fontSize: 14, marginBottom: 28, textAlign: 'center' },
    comentarioLabel: { width: '100%', fontSize: 13, color: '#555', marginBottom: 6 },
    comentarioInput: { width: '100%', minHeight: 100, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#333', marginBottom: 24 },
    enviarButton: { width: '100%', minHeight: 50, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    enviarDeshabilitado: { backgroundColor: '#F5C49A' },
    enviarButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    omitirBtn: { paddingHorizontal: 14, paddingVertical: 9 },
    omitirTexto: { color: '#94A3B8', fontSize: 14 },
});