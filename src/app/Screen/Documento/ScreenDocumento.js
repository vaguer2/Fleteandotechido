import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const DOCUMENTS_CONFIG = [
  { key: 'ine', label: 'INE / Identificacion Oficial' },
  { key: 'licencia', label: 'Licencia de conducir' },
  { key: 'foto_vehiculo', label: 'Foto del vehiculo' },
];

const Header = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Verificacion de perfil</Text>
  </View>
);

export default function ScreenDocumento() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [documentos, setDocumentos] = useState({
    ine: null,
    licencia: null,
    foto_vehiculo: null,
  });
  const [enviando, setEnviando] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);

  const todosSubidos = DOCUMENTS_CONFIG.every(
    (doc) => documentos[doc.key]?.status === 'subido'
  );

  useEffect(() => {
    async function verificarDocumentos() {
      if (!usuario?.fletero_id) {
        setCargandoEstado(false);
        return;
      }

      const { data, error } = await supabase
        .from('documento_fletero')
        .select('tipo, estado')
        .eq('fletero_id', usuario.fletero_id);

      if (error) {
        //console.log('Error al verificar documentos:', error);
        setCargandoEstado(false);
        return;
      }

      const tipos = (data ?? []).map((d) => d.tipo);
      const todosPresentes = ['ine', 'licencia', 'foto_vehiculo'].every(t => tipos.includes(t));

      if (todosPresentes) setYaEnviado(true);

      setCargandoEstado(false);
    }

    verificarDocumentos();
  }, [usuario]);

  const elegirOrigen = (key) => {
    Alert.alert('Subir documento', 'Selecciona una opcion', [
      { text: 'Tomar foto', onPress: () => tomarFoto(key) },
      { text: 'Elegir de galeria', onPress: () => elegirGaleria(key) },
      { text: 'Subir archivo (PDF)', onPress: () => elegirArchivo(key) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const tomarFoto = async (key) => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu camara.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!resultado.canceled) {
      await subirASupabase(key, {
        uri: resultado.assets[0].uri,
        name: `${key}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const elegirGaleria = async (key) => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!resultado.canceled) {
      await subirASupabase(key, {
        uri: resultado.assets[0].uri,
        name: `${key}_${Date.now()}.jpg`,
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
    const extension = archivo.name.split('.').pop();
    await subirASupabase(key, {
      uri: archivo.uri,
      name: `${key}_${Date.now()}.${extension}`,
      type: archivo.mimeType || 'application/pdf',
    });
  };

  const subirASupabase = async (key, archivo) => {
    if (!usuario?.fletero_id) return;

    setDocumentos((prev) => ({
      ...prev,
      [key]: { ...archivo, status: 'subiendo' },
    }));

    try {
      const response = await fetch(archivo.uri);
      const arrayBuffer = await response.arrayBuffer();
      const rutaArchivo = `fletero_${usuario.fletero_id}/${archivo.name}`;

      const { error: storageError } = await supabase
        .storage
        .from('documentos')
        .upload(rutaArchivo, arrayBuffer, {
          contentType: archivo.type,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabase
        .storage
        .from('documentos')
        .getPublicUrl(rutaArchivo);

      const urlPublica = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('documento_fletero')
        .upsert({
          fletero_id: usuario.fletero_id,
          tipo: key,
          url_archivo: urlPublica,
          estado: 'pendiente',
        }, { onConflict: 'fletero_id,tipo' });

      if (dbError) throw dbError;

      setDocumentos((prev) => ({
        ...prev,
        [key]: { ...archivo, status: 'subido', url: urlPublica },
      }));

    } catch (error) {
      //console.log('Error al subir:', error);
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
      setDocumentos((prev) => ({ ...prev, [key]: null }));
    }
  };

  const enviarParaRevision = async () => {
    if (!todosSubidos) {
      Alert.alert('Faltan documentos', 'Sube todos los documentos requeridos.');
      return;
    }
    setYaEnviado(true);
    Alert.alert(
      'Documentos enviados',
      'El equipo revisara tus documentos en menos de 24 horas.',
      [{ text: 'Entendido' }]
    );
  };

  // Estado 1: cargando
  if (cargandoEstado) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
        <Header onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Estado 2: ya envió todos los documentos
  if (yaEnviado) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
        <Header onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
          <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 32 }}>
            <Ionicons name="hourglass-outline" size={72} color="#f97316" />
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 20, textAlign: 'center' }}>
              Documentos en revision
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
              Ya recibimos tus documentos. El equipo de FleteandoTe los esta revisando y te notificara en menos de 24 horas.
            </Text>
          </View>

          <View style={{
            backgroundColor: '#f8fafc', borderRadius: 14, padding: 18,
            width: '100%', borderWidth: 1, borderColor: '#e2e8f0', gap: 14,
          }}>
            {['ine', 'licencia', 'foto_vehiculo'].map((tipo) => (
              <View key={tipo} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>
                  {tipo === 'ine' ? 'INE / Identificacion Oficial' :
                    tipo === 'licencia' ? 'Licencia de conducir' :
                      'Foto del vehiculo'}
                </Text>
              </View>
            ))}
          </View>

          <View style={{
            backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16,
            marginTop: 20, width: '100%', flexDirection: 'row',
            gap: 10, alignItems: 'flex-start',
          }}>
            <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
            <Text style={{ flex: 1, color: '#1d4ed8', fontSize: 13, lineHeight: 18 }}>
              Una vez aprobados, podras empezar a recibir y aceptar solicitudes de flete automaticamente.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Estado 3: subida de documentos
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
      <Header onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color="#7c2d12" style={{ marginBottom: 6 }} />
          <Text style={styles.bannerText}>
            Para recibir solicitudes debes subir tus documentos. El equipo los revisara en menos de 24 horas.
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

        {todosSubidos && (
          <View style={styles.allDoneCard}>
            <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            <Text style={styles.allDoneText}>
              Todos los documentos fueron subidos. Toca "Enviar para revision" para que el equipo los apruebe.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !todosSubidos && styles.submitButtonDisabled]}
          disabled={!todosSubidos || enviando}
          onPress={enviarParaRevision}
        >
          {enviando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitButtonText}>Enviar para revision</Text>
          }
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop:40 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginTop:40
  },
  content: { padding: 20, paddingBottom: 40 },
  banner: {
    backgroundColor: '#fde9dd', borderRadius: 12, padding: 16,
    marginBottom: 24, alignItems: 'center',
  },
  bannerText: { color: '#7c2d12', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, color: '#0f172a' },
  card: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1',
    borderRadius: 14, paddingVertical: 28, alignItems: 'center',
    marginBottom: 16, backgroundColor: '#fff',
  },
  cardSubido: { backgroundColor: '#ecfdf3', borderColor: '#86efac', borderStyle: 'solid' },
  cardLabel: { fontSize: 15, color: '#475569', fontWeight: '500', marginBottom: 8 },
  cardLabelSubido: { color: '#15803d', fontWeight: '700' },
  cardAction: { color: '#f97316', fontWeight: '600', fontSize: 13 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dcfce7', paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20, gap: 4,
  },
  badgeText: { color: '#16a34a', fontWeight: '600', fontSize: 13 },
  allDoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf3', borderRadius: 12, padding: 16, marginTop: 8,
  },
  allDoneText: { flex: 1, color: '#15803d', fontSize: 13, lineHeight: 18 },
  footer: { padding: 20, backgroundColor: '#f8fafc' },
  submitButton: {
    backgroundColor: '#f97316', borderRadius: 30,
    paddingVertical: 16, alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#fbbf9c' },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});