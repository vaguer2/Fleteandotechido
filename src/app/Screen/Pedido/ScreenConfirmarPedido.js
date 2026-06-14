import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function ScreenConfirmarPedido() {
  const router = useRouter();

  // TODO: reemplazar con datos de la base de datos
  const pedido = {
    folio: '',
    transportista: '',
    estrellas: '',
    placa: '',
    tiempoEstimado: '',
    total: '',
  };

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
      <TouchableOpacity style={styles.botonPrimario} activeOpacity={0.85}>
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

  // Check
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

  // Título
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

  // Folio
  folio: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  folioValor: {
    color: '#F97316',
    fontWeight: '700',
  },

  // Card detalle
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
  },
  filaTotal: {
    color: '#F97316',
    fontSize: 15,
  },

  // Botones
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