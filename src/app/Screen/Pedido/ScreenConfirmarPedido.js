import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';

export default function ScreenConfirmarPedido() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();

  const solicitudId = Array.isArray(params.solicitudId) ? params.solicitudId[0] : params.solicitudId;
  const pantallaPequena = height < 700;
  const pantallaMuyEstrecha = width < 360;

  const [pedido, setPedido] = useState({
    folio: '',
    distancia: '',
    origen: '',
    destino: '',
    precioOfrecido: '',
  });

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let componenteActivo = true;

    async function confirmarYCargarPedido() {
      if (!solicitudId) {
        if (componenteActivo) setCargando(false);
        return;
      }

      try {
        const { error: errorUpdate } = await supabase
          .from('solicitud')
          .update({ estado: 'publicada' })
          .eq('solicitud_id', solicitudId);

        if (errorUpdate) {
          console.log('Error al publicar la solicitud:', errorUpdate);
        }

        const { data: solicitud, error: errorSolicitud } = await supabase
          .from('solicitud')
          .select(`
            *,
            punto_ruta(*)
          `)
          .eq('solicitud_id', solicitudId)
          .single();

        if (!componenteActivo) return;

        if (errorSolicitud || !solicitud) {
          console.log('Error al traer la solicitud:', errorSolicitud);
          return;
        }

        const puntoOrigen = solicitud.punto_ruta?.find(punto => punto.tipo === 'origen');
        const puntoDestino = solicitud.punto_ruta?.find(punto => punto.tipo === 'destino');

        const distancia =
          solicitud.distancia_km !== null && solicitud.distancia_km !== undefined
            ? `${Number(solicitud.distancia_km).toFixed(1)} km`
            : '—';

        const precio = solicitud.precio_ajustado ?? solicitud.precio_base;

        const precioOfrecido =
          precio !== null && precio !== undefined
            ? Number(precio).toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
            })
            : '—';

        setPedido({
          folio: `FLT-${String(solicitud.solicitud_id).padStart(5, '0')}`,
          distancia,
          origen: puntoOrigen?.direccion_texto ?? 'No definido',
          destino: puntoDestino?.direccion_texto ?? 'No definido',
          precioOfrecido,
        });
      } catch (error) {
        console.log('Error general al confirmar el pedido:', error);
      } finally {
        if (componenteActivo) setCargando(false);
      }
    }

    void confirmarYCargarPedido();

    return () => {
      componenteActivo = false;
    };
  }, [solicitudId]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator color="#F97316" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, pantallaPequena && styles.scrollContentPequeno]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.container, pantallaPequena && styles.containerPequeno]}>
          <View style={[styles.checkWrapper, pantallaPequena && styles.checkWrapperPequeno]}>
            <Text style={[styles.checkIcon, pantallaPequena && styles.checkIconPequeno]}>✓</Text>
          </View>

          <Text style={[styles.titulo, pantallaMuyEstrecha && styles.tituloEstrecho]}>
            ¡Solicitud publicada!
          </Text>

          <Text style={styles.subtitulo}>
            Los fleteros disponibles en tu zona ya pueden ver tu solicitud.{'\n'}
            Te notificaremos en cuanto alguien la acepte.
          </Text>

          <View style={[styles.esperaCard, pantallaPequena && styles.esperaCardPequena]}>
            <ActivityIndicator color="#F97316" style={styles.indicadorEspera} />

            <Text style={styles.esperaTexto}>
              Esperando a que un fletero acepte tu solicitud...
            </Text>
          </View>

          <Text style={styles.folio}>
            Folio: <Text style={styles.folioValor}>{pedido.folio}</Text>
          </Text>

          <View style={styles.card}>
            <View style={styles.fila}>
              <Text style={styles.filaLabel}>Origen</Text>
              <Text style={styles.filaValor} numberOfLines={2} ellipsizeMode="tail">{pedido.origen}</Text>
            </View>

            <View style={styles.separadorFila} />

            <View style={styles.fila}>
              <Text style={styles.filaLabel}>Destino</Text>
              <Text style={styles.filaValor} numberOfLines={2} ellipsizeMode="tail">{pedido.destino}</Text>
            </View>

            <View style={styles.separadorFila} />

            <View style={styles.fila}>
              <Text style={styles.filaLabel}>Distancia</Text>
              <Text style={styles.filaValor}>{pedido.distancia}</Text>
            </View>

            <View style={styles.separadorFila} />

            <View style={styles.fila}>
              <Text style={styles.filaLabel}>Tu oferta</Text>
              <Text style={[styles.filaValor, styles.filaTotal]}>{pedido.precioOfrecido}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color="#1D4ED8" />

            <Text style={styles.infoTexto}>
              Podrás ver el mapa y rastrear a tu fletero en cuanto acepten tu solicitud, desde la pantalla de inicio.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={() => router.replace('/Screen/Home/ScreenHomeUser')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ir a la pantalla de inicio"
          >
            <Text style={styles.botonPrimarioTexto}>Ir al inicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  scrollContentPequeno: { justifyContent: 'flex-start', paddingTop: 18, paddingBottom: 20 },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center' },
  containerPequeno: { paddingTop: 4 },
  centrado: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },

  checkWrapper: { width: 72, height: 72, borderRadius: 36, marginBottom: 20, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  checkWrapperPequeno: { width: 62, height: 62, borderRadius: 31, marginBottom: 14 },
  checkIcon: { color: '#22C55E', fontSize: 36, fontWeight: '700' },
  checkIconPequeno: { fontSize: 31 },

  titulo: { marginBottom: 8, color: '#0F172A', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  tituloEstrecho: { fontSize: 22 },
  subtitulo: { width: '100%', maxWidth: 520, marginBottom: 20, color: '#64748B', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  esperaCard: { width: '100%', marginBottom: 20, paddingHorizontal: 16, paddingVertical: 18, borderRadius: 14, alignItems: 'center', backgroundColor: '#FFF4EA' },
  esperaCardPequena: { paddingVertical: 14, marginBottom: 16 },
  indicadorEspera: { marginBottom: 10 },
  esperaTexto: { color: '#92400E', fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'center' },

  folio: { marginBottom: 20, color: '#64748B', fontSize: 14, textAlign: 'center' },
  folioValor: { color: '#F97316', fontWeight: '700' },

  card: { width: '100%', marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  fila: { width: '100%', minHeight: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  separadorFila: { height: 12 },
  filaLabel: { flexShrink: 0, marginRight: 16, color: '#94A3B8', fontSize: 13, lineHeight: 19 },
  filaValor: { flex: 1, minWidth: 0, color: '#0F172A', fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'right' },
  filaTotal: { color: '#F97316', fontSize: 15 },

  infoCard: { width: '100%', marginBottom: 24, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF' },
  infoTexto: { flex: 1, minWidth: 0, color: '#1E40AF', fontSize: 12, lineHeight: 17 },

  botonPrimario: { width: '100%', minHeight: 52, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  botonPrimarioTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});