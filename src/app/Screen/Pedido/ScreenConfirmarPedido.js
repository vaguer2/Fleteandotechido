import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../../lib/supabase';

export default function ScreenConfirmarPedido() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const solicitudId = params.solicitudId;

  const [pedido, setPedido] = useState({
    folio: '',
    transportista: '',
    estrellas: 0,
    placa: '',
    tiempoEstimado: '',
    total: '',
    distancia: '',
    origen: '',
    destino: '',
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

      // 2. Traer los datos completos del pedido, incluyendo fletero y puntos de ruta
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitud')
        .select('*, fletero(*), punto_ruta(*)')
        .eq('solicitud_id', solicitudId)
        .single();

      if (errorSolicitud || !solicitud) {
        console.log('Error al traer la solicitud:', errorSolicitud);
        setCargando(false);
        return;
      }

      const puntoOrigen = solicitud.punto_ruta.find((p) => p.tipo === 'origen');
      const puntoDestino = solicitud.punto_ruta.find((p) => p.tipo === 'destino');

      setPedido({
        folio: `FLT-${String(solicitud.solicitud_id).padStart(5, '0')}`,
        transportista: solicitud.fletero?.nombre ?? 'Sin asignar',
        estrellas: Math.round(solicitud.fletero?.calificacion_promedio ?? 0),
        placa: solicitud.fletero?.placa_vehiculo ?? '—',
        tiempoEstimado: '20-30 min',
        total: solicitud.precio_base ? `$${solicitud.precio_base}` : '—',
        distancia: solicitud.distancia_km ? `${solicitud.distancia_km.toFixed(1)} km` : '—',
        origen: puntoOrigen?.direccion_texto ?? 'No definido',
        destino: puntoDestino?.direccion_texto ?? 'No definido',
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
      <Text style={styles.titulo}>¡Flete confirmado!</Text>
      <Text style={styles.subtitulo}>
        {pedido.transportista} está en camino.{'\n'}Te notificamos cuando llegue.
      </Text>

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
          <Text style={styles.filaLabel}>Transportista</Text>
          <Text style={styles.filaValor}>
            {pedido.transportista} ⭐ {pedido.estrellas}
          </Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Placa del vehículo</Text>
          <Text style={styles.filaValor}>{pedido.placa}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Tiempo estimado</Text>
          <Text style={styles.filaValor}>{pedido.tiempoEstimado}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Total</Text>
          <Text style={[styles.filaValor, styles.filaTotal]}>{pedido.total}</Text>
        </View>
      </View>

      {/* Botones */}
      <TouchableOpacity
        style={styles.botonPrimario}
        activeOpacity={0.85}
        onPress={() => router.push({
          pathname: '/Screen/Map/ScreenMapSuccess',
          params: { solicitudId },
        })}
      >
        <Text style={styles.botonPrimarioTexto}>Ver en el mapa</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botonSecundario}
        onPress={() => router.push('/Screen/Home/ScreenHomeUser')}
        activeOpacity={0.85}
      >
        <Text style={styles.botonSecundarioTexto}>Ir al inicio</Text>
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
    marginBottom: 16,
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
    marginBottom: 24,
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
  botonPrimario: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  botonPrimarioTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  botonSecundario: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  botonSecundarioTexto: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
});