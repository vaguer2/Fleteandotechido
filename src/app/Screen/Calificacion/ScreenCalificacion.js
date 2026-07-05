import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

// ---- AJUSTA ESTO SEGÚN TU BASE DE DATOS ----
const CONFIG = {
  tabla: 'calificaciones',              // nombre de tu tabla en Supabase
  campoFleteroId: 'fletero_id',         // FK hacia el fletero calificado
  campoUsuarioId: 'usuario_id',         // FK hacia el usuario calificado
  campoCalificadorId: 'calificador_id', // FK hacia quien califica
  campoServicioId: 'servicio_id',       // FK hacia el servicio/pedido (opcional)
  campoEstrellas: 'estrellas',
  campoComentario: 'comentario',
};
// ----------------------------------------------

export default function ScreenCalificaciones() {
  const router = useRouter();
  const { user } = useAuth(); // usuario autenticado (quien califica)

  // Al navegar hacia esta pantalla debes mandar:
  // router.push({
  //   pathname: '/Screen/Calificacion/ScreenCalificacionesFletero',
  //   params: { tipo: 'fletero', id: fleteroId, nombre: fleteroNombre, servicioId }
  // });
  // o
  // params: { tipo: 'usuario', id: usuarioId, nombre: usuarioNombre, servicioId }
  const { tipo, id, nombre, servicioId } = useLocalSearchParams();

  const esFletero = tipo === 'fletero';

  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const iniciales = (nombre || '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tituloHeader = esFletero ? 'Calificar servicio' : 'Calificar usuario';
  const preguntaTexto = esFletero
    ? '¿Cómo estuvo el servicio?'
    : '¿Cómo fue tu experiencia con este usuario?';

  const handleEnviar = async () => {
    if (rating === 0) {
      Alert.alert('Falta calificación', 'Selecciona al menos 1 estrella.');
      return;
    }
    if (!id || !user?.id) {
      Alert.alert('Error', 'Faltan datos para enviar la calificación.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        [esFletero ? CONFIG.campoFleteroId : CONFIG.campoUsuarioId]: id,
        [CONFIG.campoCalificadorId]: user.id,
        [CONFIG.campoEstrellas]: rating,
        [CONFIG.campoComentario]: comentario.trim() || null,
      };
      if (servicioId) {
        payload[CONFIG.campoServicioId] = servicioId;
      }

      const { error } = await supabase.from(CONFIG.tabla).insert(payload);

      if (error) throw error;

      Alert.alert('¡Gracias!', 'Tu calificación fue enviada correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Error al enviar calificación:', err);
      Alert.alert('Error', 'No se pudo enviar la calificación. Intenta de nuevo.');
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
        <Text style={styles.headerTitle}>{tituloHeader}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales || (esFletero ? 'CM' : 'US')}</Text>
        </View>

        <Text style={styles.nombre}>{nombre || (esFletero ? 'Fletero' : 'Usuario')}</Text>
        <Text style={styles.pregunta}>{preguntaTexto}</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((valor) => (
            <TouchableOpacity key={valor} onPress={() => setRating(valor)}>
              <Ionicons
                name={valor <= rating ? 'star' : 'star-outline'}
                size={36}
                color={valor <= rating ? '#F5821F' : '#D9D9D9'}
                style={{ marginHorizontal: 4 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingLabel}>{rating} de 5 estrellas</Text>
        )}

        <Text style={styles.comentarioLabel}>Comentario (opcional)</Text>
        <TextInput
          style={styles.comentarioInput}
          placeholder="Escribe un comentario..."
          placeholderTextColor="#B0B0B0"
          multiline
          numberOfLines={4}
          value={comentario}
          onChangeText={setComentario}
        />

        <TouchableOpacity
          style={[styles.enviarButton, enviando && { opacity: 0.7 }]}
          onPress={handleEnviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.enviarButtonText}>Enviar calificación</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const NAVY = '#0B1F3D';
const ORANGE = '#F5821F';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3ECF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: NAVY,
    fontSize: 22,
    fontWeight: '700',
  },
  nombre: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  pregunta: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  ratingLabel: {
    color: ORANGE,
    fontWeight: '600',
    marginBottom: 24,
  },
  comentarioLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  comentarioInput: {
    width: '100%',
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 28,
  },
  enviarButton: {
    width: '100%',
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});