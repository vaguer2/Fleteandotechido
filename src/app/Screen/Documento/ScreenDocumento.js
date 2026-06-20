import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView, StatusBar,} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';


const DOCUMENTS_CONFIG = [
  { key: 'ine', label: 'INE / Identificación Oficial' },
  { key: 'licencia', label: 'Licencia de conducir' },
  { key: 'tarjeta', label: 'Tarjeta de circulación' },
];

export default function ScreenDocumento({ onSubmit }) {
  // Estado de cada documento: null | { uri, name, status: 'subido' | 'subiendo' }
  const [documentos, setDocumentos] = useState({
    ine: null,
    licencia: null,
    tarjeta: null,
  });
  const [enviando, setEnviando] = useState(false);

  const todosSubidos = DOCUMENTS_CONFIG.every(
    (doc) => documentos[doc.key]?.status === 'subido'
  );

  
  const elegirOrigen = (key) => {
    Alert.alert('Subir documento', 'Selecciona una opción', [
      { text: 'Tomar foto', onPress: () => tomarFoto(key) },
      { text: 'Elegir de galería', onPress: () => elegirGaleria(key) },
      { text: 'Subir archivo (PDF)', onPress: () => elegirArchivo(key) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const tomarFoto = async (key) => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: false,
    });
    if (!resultado.canceled) {
      subirDocumento(key, {
        uri: resultado.assets[0].uri,
        name: `${key}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const elegirGaleria = async (key) => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: false,
    });
    if (!resultado.canceled) {
      subirDocumento(key, {
        uri: resultado.assets[0].uri,
        name: `${key}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const elegirArchivo = async (key) => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (resultado.canceled) return;
    const archivo = resultado.assets[0];
    subirDocumento(key, {
      uri: archivo.uri,
      name: archivo.name,
      type: archivo.mimeType || 'application/pdf',
    });
  };

  // Sube el documento a tu backend (ajusta la URL a tu API real)
  const subirDocumento = async (key, archivo) => {
    setDocumentos((prev) => ({
      ...prev,
      [key]: { ...archivo, status: 'subiendo' },
    }));

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: archivo.uri,
        name: archivo.name,
        type: archivo.type,
      });
      formData.append('tipo_documento', key);

      // ⚠️ Reemplaza con el endpoint real de tu backend
      const response = await fetch('https://TU_API.com/api/documentos/subir', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error('Error al subir el documento');

      setDocumentos((prev) => ({
        ...prev,
        [key]: { ...archivo, status: 'subido' },
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
      setDocumentos((prev) => ({ ...prev, [key]: null }));
    }
  };

  const enviarParaRevision = async () => {
    if (!todosSubidos) {
      Alert.alert('Faltan documentos', 'Sube todos los documentos requeridos.');
      return;
    }
    setEnviando(true);
    try {
      // ⚠️ Reemplaza con el endpoint real para marcar "enviado a revisión"
      const response = await fetch('https://TU_API.com/api/documentos/enviar-revision', {
        method: 'POST',
      });
      if (!response.ok) throw new Error();
      Alert.alert('Listo', 'Tus documentos fueron enviados para revisión.');
      onSubmit && onSubmit();
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

    
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verificación de perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
       
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Para recibir solicitudes debes subir tus documentos. El equipo los
            revisará en menos de 24 horas.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Documentos requeridos</Text>

        {DOCUMENTS_CONFIG.map((doc) => {
          const data = documentos[doc.key];
          const subido = data?.status === 'subido';
          const subiendo = data?.status === 'subiendo';

          return (
            <TouchableOpacity
              key={doc.key}
              activeOpacity={0.8}
              disabled={subiendo}
              onPress={() => elegirOrigen(doc.key)}
              style={[styles.card, subido && styles.cardSubido]}
            >
              <Text style={[styles.cardLabel, subido && styles.cardLabelSubido]}>
                {doc.label}
              </Text>

              {subiendo && <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />}

              {subido && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Subido</Text>
                  <Ionicons name="checkmark" size={14} color="#16a34a" />
                </View>
              )}

              {!subido && !subiendo && (
                <Text style={styles.cardAction}>Toca para subir</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !todosSubidos && styles.submitButtonDisabled]}
          disabled={!todosSubidos || enviando}
          onPress={enviarParaRevision}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar para revisión</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#0b2545',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  banner: {
    backgroundColor: '#fde9dd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  bannerText: { color: '#7c2d12', fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, color: '#0f172a' },
  card: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cardSubido: {
    backgroundColor: '#ecfdf3',
    borderColor: '#86efac',
  },
  cardLabel: { fontSize: 15, color: '#475569', fontWeight: '500', marginBottom: 8 },
  cardLabelSubido: { color: '#15803d', fontWeight: '700' },
  cardAction: { color: '#f97316', fontWeight: '600', fontSize: 13 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: { color: '#16a34a', fontWeight: '600', fontSize: 13 },
  footer: {
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  submitButton: {
    backgroundColor: '#f97316',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#fbbf9c' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});