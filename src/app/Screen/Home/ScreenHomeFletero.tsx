import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
// ajusta esta ruta a la real
import { useAuth } from '../../../../providers/AuthProvider'; // ajusta esta ruta a la real

// ---------------------------------------------------------------
// ⚠️ AJUSTA ESTO a tu esquema real de Supabase:
//
// TABLA_SOLICITUDES: nombre de tu tabla de solicitudes/pedidos
// Columnas esperadas (cambia los nombres si difieren):
//   id              -> identificador
//   categoria       -> 'Muebles' | 'Materiales' | etc.
//   titulo          -> ej. 'Sofá + librero'
//   origen          -> ej. 'Playa del Carmen'
//   destino         -> ej. 'Puerto Morelos'
//   peso_ton        -> ej. 1.2
//   distancia_km    -> ej. 18
//   precio_base     -> ej. 520
//   estado          -> ej. 'disponible' (filtrar solo las abiertas)
//   created_at      -> fecha de creación (para "Hace X min")
//
// TABLA_FLETERO: tu tabla 'fletero', para guardar el toggle de
// disponibilidad (columna 'disponible' boolean, ajusta si difiere)
// ---------------------------------------------------------------

const TABLA_SOLICITUDES = 'solicitudes'; // 👈 cambia por el nombre real
const TABLA_FLETERO = 'fletero'; // 👈 cambia por el nombre real

type Solicitud = {
  id: string;
  categoria: string;
  titulo: string;
  origen: string;
  destino: string;
  peso_ton: number;
  distancia_km: number;
  precio_base: number;
  created_at: string;
};

const CATEGORIA_COLOR: Record<string, { bg: string; text: string }> = {
  Muebles: { bg: '#fde9dd', text: '#c2410c' },
  Materiales: { bg: '#dbeafe', text: '#1d4ed8' },
};

function tiempoRelativo(fechaISO: string) {
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
}

export default function ScreenHomeFletero() {
  const { usuario } = useAuth();
  const [disponible, setDisponible] = useState<boolean>(usuario?.disponible ?? false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  const nombre = usuario?.nombre ?? 'Fletero';
  const iniciales = nombre
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const cargarSolicitudes = useCallback(async () => {
    const { data, error } = await supabase
      .from(TABLA_SOLICITUDES)
      .select('id, categoria, titulo, origen, destino, peso_ton, distancia_km, precio_base, created_at')
      .eq('estado', 'disponible') // 👈 ajusta el valor/columna de filtro si difiere
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar solicitudes:', error);
      return;
    }

    setSolicitudes(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await cargarSolicitudes();
      setLoading(false);
    })();
  }, [cargarSolicitudes]);

  const toggleDisponible = async (valor: boolean) => {
    setDisponible(valor); // optimista en UI

    if (!usuario?.id) return;

    const { error } = await supabase
      .from(TABLA_FLETERO)
      .update({ disponible: valor }) // 👈 ajusta nombre de columna si difiere
      .eq('fletero_id', usuario.id); // 👈 ajusta nombre de columna PK/FK si difiere

    if (error) {
      console.error('Error al actualizar disponibilidad:', error);
      setDisponible(!valor); // revertir si falló
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

      {/* Header azul */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.saludo}>Hola, Fletero</Text>
            <View style={styles.nombreRow}>
              <Text style={styles.nombre}>{nombre}</Text>
              <Ionicons name="cube-outline" size={18} color="#22c55e" style={{ marginLeft: 6 }} />
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
        </View>

        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>Disponible para fletes</Text>
            <Text style={styles.toggleSub}>
              {disponible ? 'Activado — recibes solicitudes' : 'Desactivado — no recibes solicitudes'}
            </Text>
          </View>
          <Switch
            value={disponible}
            onValueChange={toggleDisponible}
            trackColor={{ false: '#475569', true: '#22c55e' }}
            thumbColor="#fff"
          />
        </View>
      </View>

     
      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.sectionLabel}>SOLICITUDES DISPONIBLES PARA TI</Text>

        {!disponible && (
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
            Activa tu disponibilidad para ver y recibir solicitudes.
          </Text>
        )}

        {disponible && loading && (
          <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />
        )}

        {disponible && !loading && solicitudes.length === 0 && (
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            No hay solicitudes disponibles por el momento.
          </Text>
        )}

        {disponible &&
          !loading &&
          solicitudes.map((s) => {
            const colores = CATEGORIA_COLOR[s.categoria] ?? { bg: '#f1f5f9', text: '#475569' };
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/Screen/Pedido/ScreenFechaPedido?id=${s.id}` as any)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                    <Text style={[styles.badgeText, { color: colores.text }]}>{s.categoria}</Text>
                  </View>
                  <Text style={styles.tiempo}>{tiempoRelativo(s.created_at)}</Text>
                </View>

                <Text style={styles.cardTitulo}>{s.titulo}</Text>
                <Text style={styles.cardRuta}>
                  {s.origen} → {s.destino} · {s.peso_ton} ton
                </Text>

                <View style={styles.cardBottom}>
                  <Text style={styles.distancia}>~{s.distancia_km} km</Text>
                  <Text style={styles.precio}>
                    Precio base: ${s.precio_base.toLocaleString('es-MX')} MXN
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>


      <View style={styles.tabBar}>
        <TabItem icon="home" label="Inicio" activo onPress={() => {}} />
        <TabItem icon="list-outline" label="Solicitudes" onPress={() => router.push('/Screen/Solicitudes/ScreenSolicitudes' as any)} />
        <TabItem icon="notifications-outline" label="Avisos" onPress={() => router.push('/Screen/Avisos/ScreenAvisos' as any)} />
        <TabItem icon="person-outline" label="Perfil" onPress={() => router.push('/Screen/Perfil/ScreenPerfil' as any)} />
      </View>
    </SafeAreaView>
  );
}

function TabItem({
  icon,
  label,
  activo,
  onPress,
}: {
  icon: any;
  label: string;
  activo?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={activo ? '#f97316' : '#94a3b8'} />
      <Text style={[styles.tabLabel, activo && { color: '#f97316', fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b2545' },
  header: { backgroundColor: '#0b2545', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  saludo: { color: '#94a3b8', fontSize: 13 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nombre: { color: '#fff', fontSize: 20, fontWeight: '700' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  toggleSub: { color: '#94a3b8', fontSize: 12 },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  tiempo: { fontSize: 12, color: '#94a3b8' },
  cardTitulo: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardRuta: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distancia: { fontSize: 13, color: '#64748b' },
  precio: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, color: '#94a3b8' },
});
