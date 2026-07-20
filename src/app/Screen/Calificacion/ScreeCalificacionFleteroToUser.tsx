import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const NAVY = '#0B1F3D';
const ORANGE = '#F5821F';

const obtenerParametro = (parametro: string | string[] | undefined): string => Array.isArray(parametro) ? parametro[0] ?? '' : parametro ?? '';

export default function ScreeCalificacionFleteroToUser() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { usuario: fletero } = useAuth();
  const { width, height } = useWindowDimensions();

  const solicitudIdTexto = obtenerParametro(params.solicitudId as string | string[] | undefined);
  const usuarioNombre = obtenerParametro(params.usuarioNombre as string | string[] | undefined).trim() || 'Usuario';
  const solicitudId = Number(solicitudIdTexto);
  const pantallaEstrecha = width < 370;
  const pantallaBaja = height < 700;

  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const iniciales = usuarioNombre.split(' ').filter(Boolean).map(parte => parte[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const obtenerDescripcionRating = (): string => {
    switch (rating) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return '';
    }
  };

  const regresarInicio = (): void => {
    router.replace('/Screen/Home/ScreenHomeFletero' as any);
  };

  const handleEnviar = async (): Promise<void> => {
    if (rating === 0) {
      Alert.alert('Falta calificación', 'Selecciona al menos 1 estrella.');
      return;
    }

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      Alert.alert('Solicitud no válida', 'No se encontró una solicitud válida para calificar.');
      return;
    }

    if (!fletero?.fletero_id) {
      Alert.alert('Sesión no válida', 'No se pudo identificar al fletero autenticado.');
      return;
    }

    setEnviando(true);

    try {
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitud')
        .select('solicitud_id, usuario_id, fletero_id, estado')
        .eq('solicitud_id', solicitudId)
        .eq('fletero_id', fletero.fletero_id)
        .maybeSingle();

      if (errorSolicitud) {
        console.log('Error al comprobar la solicitud:', errorSolicitud);
        throw errorSolicitud;
      }

      if (!solicitud) {
        Alert.alert('Solicitud no encontrada', 'La solicitud no existe o no pertenece a tu cuenta.');
        return;
      }

      if (solicitud.estado !== 'completada') {
        Alert.alert('Servicio no completado', 'Solo puedes calificar al usuario cuando el servicio esté completado.');
        return;
      }

      if (!solicitud.usuario_id) {
        Alert.alert('Usuario no disponible', 'La solicitud no tiene un usuario relacionado.');
        return;
      }

      const { data, error } = await supabase
        .from('calificacion')
        .upsert({
          solicitud_id: solicitudId,
          estrellas_al_usuario: rating,
          comentario_al_usuario: comentario.trim() || null,
        }, { onConflict: 'solicitud_id' })
        .select(`
          calificacion_id,
          solicitud_id,
          estrellas_al_fletero,
          comentario_al_fletero,
          estrellas_al_usuario,
          comentario_al_usuario
        `)
        .single();

      if (error) {
        console.log('Error de Supabase al calificar al usuario:', error);
        throw error;
      }

      console.log('Calificación al usuario guardada:', data);

      Alert.alert('Calificación enviada', 'Tu opinión sobre el usuario fue registrada correctamente.', [
        { text: 'OK', onPress: regresarInicio },
      ]);
    } catch (error) {
      console.log('Error al enviar la calificación al usuario:', error);
      Alert.alert('Error', 'No se pudo enviar la calificación. Intenta nuevamente.');
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
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>Calificar usuario</Text>
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
              pantallaEstrecha && styles.contentEstrecho,
              pantallaBaja && styles.contentBajo,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciales}</Text>
            </View>

            <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {usuarioNombre}
            </Text>

            <Text style={styles.pregunta}>
              El servicio ha sido completado.{'\n'}¿Cómo fue tu experiencia con este usuario?
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
                    style={styles.star}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {obtenerDescripcionRating()} · {rating} de 5 estrellas
              </Text>
            )}

            <Text style={styles.comentarioLabel}>Comentario (opcional)</Text>

            <TextInput
              style={styles.comentarioInput}
              placeholder="Escribe un comentario sobre el usuario..."
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
              accessibilityRole="button"
              accessibilityLabel="Enviar calificación"
            >
              {enviando
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.enviarButtonText}>Enviar calificación</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.omitirBtn}
              onPress={regresarInicio}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerSafeArea: { backgroundColor: NAVY },
  header: { minHeight: 56, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  keyboardContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  contentSafeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },
  contentEstrecho: { paddingHorizontal: 18 },
  contentBajo: { paddingTop: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E3ECF7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: NAVY, fontSize: 24, fontWeight: '700' },
  nombre: { maxWidth: '100%', fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  pregunta: { maxWidth: 420, fontSize: 14, color: '#777777', marginBottom: 28, textAlign: 'center', lineHeight: 20 },
  starsRow: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  star: { marginHorizontal: 5 },
  ratingLabel: { color: ORANGE, fontWeight: '600', fontSize: 14, marginBottom: 28, textAlign: 'center' },
  comentarioLabel: { width: '100%', fontSize: 13, color: '#555555', marginBottom: 6 },
  comentarioInput: { width: '100%', minHeight: 100, maxHeight: 160, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#333333', marginBottom: 24 },
  enviarButton: { width: '100%', minHeight: 50, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  enviarDeshabilitado: { backgroundColor: '#F5C49A' },
  enviarButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  omitirBtn: { paddingHorizontal: 14, paddingVertical: 9 },
  omitirTexto: { color: '#94A3B8', fontSize: 14 },
});