import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../../../lib/supabase'; 
import { useAuth } from '../../../../providers/AuthProvider'; 




const TABLA = 'documentos'; // cambiar esto por el nombre real de la tabla

const ETIQUETAS = {
  ine: 'INE / Identificación oficial',
  licencia: 'Licencia de conducir',
  tarjeta: 'Tarjeta de circulación',
};

const ESTADO_LABEL = {
  revision: 'Revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

function tiempoRelativo(fechaISO) {
  if (!fechaISO) return '';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

export default function ScreenRevisionDocumento() {
  const { usuario } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDocumentos = useCallback(async () => {
    if (!usuario?.id) return;

    const { data, error } = await supabase
      .from(TABLA)
      .select('id, tipo_documento, estado, created_at')
      .eq('usuario_id', usuario.id); //  ajustar el nombre de la columna FK si difiere

    if (error) {
      console.error('Error al cargar documentos:', error);
      return;
    }

    setDocumentos(data ?? []);
  }, [usuario]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await cargarDocumentos();
      setLoading(false);
    })();
  }, [cargarDocumentos]);

  const irAExplorar = () => {
    router.replace('/Screen/Home/ScreenHomeFletero');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#fbbf24" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        
        <View style={styles.headerBox}>
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name="document-text-outline" size={28} color="#fbbf24" />
            </View>
          </View>

          <Text style={styles.title}>Documentos en revisión</Text>
          <Text style={styles.subtitle}>
            El equipo revisa tus documentos. Te avisamos en menos de 24 horas.
          </Text>

          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={14} color="#fbbf24" />
            <Text style={styles.timeBadgeText}>Tiempo estimado: hasta 24 horas</Text>
          </View>
        </View>

       
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>ESTADO DE TUS DOCUMENTOS</Text>

          {documentos.length === 0 && (
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              No se encontraron documentos para este usuario.
            </Text>
          )}

          {documentos.map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.thumbPlaceholder} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docLabel}>
                  {ETIQUETAS[doc.tipo_documento] ?? doc.tipo_documento}
                </Text>
                <Text style={styles.docSub}>Subido {tiempoRelativo(doc.created_at)}</Text>
              </View>
              <View style={styles.estadoBadge}>
                <Text style={styles.estadoBadgeText}>
                  {ESTADO_LABEL[doc.estado] ?? doc.estado}
                </Text>
              </View>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>¿QUÉ SIGUE?</Text>

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: '#22c55e' }]} />
            <View>
              <Text style={styles.stepTitle}>Documentos subidos</Text>
              <Text style={styles.stepSub}>Los 3 archivos fueron recibidos</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: '#f97316' }]} />
            <View>
              <Text style={[styles.stepTitle, { color: '#f97316' }]}>Revisión por el equipo</Text>
              <Text style={styles.stepSub}>Verificamos autenticidad e imagen</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.exploreButton} onPress={irAExplorar}>
            <Text style={styles.exploreButtonText}>Explorar la app</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b2545' },
  headerBox: {
    backgroundColor: '#0b2545',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  iconCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(251,191,36,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  timeBadgeText: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  content: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
  },
  docLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  docSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  estadoBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  estadoBadgeText: { color: '#f97316', fontSize: 12, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stepSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  exploreButton: {
    borderWidth: 1.5,
    borderColor: '#0b2545',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  exploreButtonText: { color: '#0b2545', fontWeight: '700', fontSize: 16 },
});