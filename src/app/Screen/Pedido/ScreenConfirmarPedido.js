import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';

export default function ScreenConfirmarPedido() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const solicitudId = params.solicitudId;

  const [pedido, setPedido] = useState({
    folio: '',
    distancia: '',
    origen: '',
    destino: '',
    precioOfrecido: '',
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function confirmarYCargarPedido() {
      if (!solicitudId) {
        setCargando(false);
        return;
      }

      // 1. AQUÍ es donde realmente se "publica" la solicitud
      const { error: errorUpdate } = await supabase
        .from('solicitud')
        .update({ estado: 'publicada' })
        .eq('solicitud_id', solicitudId);

      if (errorUpdate) {
        console.log('Error al publicar la solicitud:', errorUpdate);
      }

      // 2. Traer los datos completos del pedido publicado
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitud')
        .select('*, punto_ruta(*)')
        .eq('solicitud_id', solicitudId)
        .single();

      if (errorSolicitud || !solicitud) {
        console.log('Error al traer la solicitud:', errorSolicitud);
        setCargando(false);
        return;
      }

      const puntoOrigen = solicitud.punto_ruta?.find((p) => p.tipo === 'origen');
      const puntoDestino = solicitud.punto_ruta?.find((p) => p.tipo === 'destino');

      setPedido({
        folio: `FLT-${String(solicitud.solicitud_id).padStart(5, '0')}`,
        distancia: solicitud.distancia_km ? `${solicitud.distancia_km.toFixed(1)} km` : '—',
        origen: puntoOrigen?.direccion_texto ?? 'No definido',
        destino: puntoDestino?.direccion_texto ?? 'No definido',
        precioOfrecido: solicitud.precio_ajustado
          ? `$${solicitud.precio_ajustado}`
          : (solicitud.precio_base ? `$${solicitud.precio_base}` : '—'),
      });

      setCargando(false);
    }

    confirmarYCargarPedido();
  }, [solicitudId]);

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Ícono check */}
      <View style={styles.checkWrapper}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      {/* Título */}
      <Text style={styles.titulo}>¡Solicitud publicada!</Text>
      <Text style={styles.subtitulo}>
        Los fleteros disponibles en tu zona ya pueden ver tu solicitud.{'\n'}
        Te notificaremos en cuanto alguien la acepte.
      </Text>

      {/* Estado de espera */}
      <View style={styles.esperaCard}>
        <ActivityIndicator color="#F97316" style={{ marginBottom: 10 }} />
        <Text style={styles.esperaTexto}>Esperando a que un fletero acepte tu solicitud...</Text>
      </View>

      {/* Folio */}
      <Text style={styles.folio}>
        Folio: <Text style={styles.folioValor}>{pedido.folio}</Text>
      </Text>

      {/* Detalle */}
      <View style={styles.card}>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Origen</Text>
          <Text style={styles.filaValor} numberOfLines={1}>{pedido.origen}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Destino</Text>
          <Text style={styles.filaValor} numberOfLines={1}>{pedido.destino}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Distancia</Text>
          <Text style={styles.filaValor}>{pedido.distancia}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Tu oferta</Text>
          <Text style={[styles.filaValor, styles.filaTotal]}>{pedido.precioOfrecido}</Text>
        </View>
      </View>

      {/* Aviso informativo */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={18} color="#1D4ED8" />
        <Text style={styles.infoTexto}>
          Podrás ver el mapa y rastrear a tu fletero en cuanto acepten tu solicitud, desde la pantalla de inicio.
        </Text>
      </View>

      {/* Botón */}
      <TouchableOpacity
        style={styles.botonPrimario}
        onPress={() => router.push('/Screen/Home/ScreenHomeUser')}
        activeOpacity={0.85}
      >
        <Text style={styles.botonPrimarioTexto}>Ir al inicio</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centrado: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    fontSize: 36,
    color: '#22C55E',
    fontWeight: '700',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  esperaCard: {
    backgroundColor: '#FFF4EA',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  esperaTexto: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  folio: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  folioValor: {
    color: '#F97316',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filaLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  filaValor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  filaTotal: {
    color: '#F97316',
    fontSize: 15,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 24,
  },
  infoTexto: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
    flex: 1,
  },
  botonPrimario: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  botonPrimarioTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});