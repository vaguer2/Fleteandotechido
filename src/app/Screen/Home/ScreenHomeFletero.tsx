import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRastreoFletero } from '../../../hooks/useRastreoFletero';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

type Solicitud = {
  solicitud_id: number;
  categoria_carga: { nombre: string } | null;
  descripcion_carga: string;
  tonelaje_requerido: number;
  distancia_km: number | null;
  precio_base: number | null;
  creado_en: string;
  punto_ruta: { tipo: string; direccion_texto: string }[];
};

const CATEGORIA_COLOR: Record<string, { bg: string; text: string }> = {
  'Mudanza completa': { bg: '#fde9dd', text: '#c2410c' },
  'Electrodomésticos': { bg: '#dbeafe', text: '#1d4ed8' },
  'Mercancía comercial': { bg: '#fef3c7', text: '#92400e' },
  'Materiales de construcción': { bg: '#e0e7ff', text: '#3730a3' },
  'Otros objetos pesados': { bg: '#f1f5f9', text: '#475569' },
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
  const { usuario, setUsuario } = useAuth();
  const [disponible, setDisponible] = useState<boolean>(usuario?.disponible ?? false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [servicioActivo, setServicioActivo] = useState<any>(null);

  const nombre = usuario?.nombre ?? 'Fletero';
  const iniciales = nombre
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // El hook de rastreo vive aquí, en una pantalla que el fletero no abandona constantemente
  const rastreoActivo = servicioActivo !== null;
  useRastreoFletero(servicioActivo?.solicitud_id, rastreoActivo);

  const cargarServicioActivo = useCallback(async () => {
    if (!usuario?.fletero_id) return;

    const { data, error } = await supabase
      .from('solicitud')
      .select('solicitud_id, estado, precio_ajustado, precio_base, punto_ruta(tipo, direccion_texto)')
      .eq('fletero_id', usuario.fletero_id)
      .in('estado', ['aceptada', 'en_progreso'])
      .order('hora_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error al cargar servicio activo:', error);
      return;
    }

    setServicioActivo(data);
  }, [usuario]);

  const cargarSolicitudes = useCallback(async () => {
    if (!usuario?.fletero_id) return;

    const { data, error } = await supabase
      .from('solicitud')
      .select('solicitud_id, descripcion_carga, tonelaje_requerido, distancia_km, precio_base, creado_en, categoria_carga(nombre), punto_ruta(tipo, direccion_texto)')
      .eq('estado', 'publicada')
      .is('fletero_id', null)
      .lte('tonelaje_requerido', usuario.tonelaje)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al cargar solicitudes:', error);
      return;
    }

    setSolicitudes((data as any) ?? []);
  }, [usuario]);

  useEffect(() => {
    (async () => {
      setCargandoSolicitudes(true);
      await cargarServicioActivo();
      await cargarSolicitudes();
      setCargandoSolicitudes(false);
    })();
  }, [cargarSolicitudes, cargarServicioActivo]);

  const toggleDisponible = async (valor: boolean) => {
    setDisponible(valor);

    if (!usuario?.fletero_id) return;

    const { error } = await supabase
      .from('fletero')
      .update({ disponible: valor })
      .eq('fletero_id', usuario.fletero_id);

    if (error) {
      console.error('Error al actualizar disponibilidad:', error);
      setDisponible(!valor);
      return;
    }

    setUsuario({ ...usuario, disponible: valor });

    if (valor) {
      cargarSolicitudes();
    }
  };

  const verDetalleSolicitud = (solicitudId: number) => {
    router.push(`/Screen/Detalles/ScreenDetallesFletero?solicitudId=${solicitudId}` as any);
  };

  const verRastreoServicioActivo = () => {
    if (!servicioActivo) return;
    router.push(`/Screen/Map/ScreenRastroMap?solicitudId=${servicioActivo.solicitud_id}` as any);
  };

  const obtenerDestino = (solicitud: any) => {
    return solicitud.punto_ruta?.find((p: any) => p.tipo === 'destino')?.direccion_texto ?? 'Destino';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.saludo}>Hola, Fletero</Text>
            <View style={styles.nombreRow}>
              <Text style={styles.nombre}>{nombre}</Text>
              <Ionicons name="cube-outline" size={18} color="#22c55e" style={{ marginLeft: 6 }} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/Screen/Setting/ScreenSettingsFletero')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciales}</Text>
            </View>
          </TouchableOpacity>
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

        {/* Tarjeta de servicio activo, si existe */}
        {servicioActivo && (
          <TouchableOpacity
            style={styles.cardServicioActivo}
            onPress={verRastreoServicioActivo}
            activeOpacity={0.85}
          >
            <View style={styles.filaServicioActivo}>
              <View style={styles.dotVerdePulso} />
              <Text style={styles.tituloServicioActivo}>Servicio en progreso</Text>
            </View>
            <Text style={styles.destinoServicioActivo} numberOfLines={1}>
              Hacia: {obtenerDestino(servicioActivo)}
            </Text>
            <Text style={styles.linkServicioActivo}>Ver rastreo en tiempo real →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>SOLICITUDES DISPONIBLES PARA TI</Text>

        {!disponible && (
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
            Activa tu disponibilidad para ver y recibir solicitudes.
          </Text>
        )}

        {disponible && cargandoSolicitudes && (
          <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />
        )}

        {disponible && !cargandoSolicitudes && solicitudes.length === 0 && (
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            No hay solicitudes disponibles por el momento.
          </Text>
        )}

        {disponible &&
          !cargandoSolicitudes &&
          solicitudes.map((s) => {
            const nombreCategoria = s.categoria_carga?.nombre ?? 'Otros';
            const colores = CATEGORIA_COLOR[nombreCategoria] ?? { bg: '#f1f5f9', text: '#475569' };
            const origen = s.punto_ruta?.find((p) => p.tipo === 'origen')?.direccion_texto ?? 'Origen';
            const destino = s.punto_ruta?.find((p) => p.tipo === 'destino')?.direccion_texto ?? 'Destino';

            return (
              <View key={s.solicitud_id} style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => verDetalleSolicitud(s.solicitud_id)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                      <Text style={[styles.badgeText, { color: colores.text }]}>{nombreCategoria}</Text>
                    </View>
                    <Text style={styles.tiempo}>{tiempoRelativo(s.creado_en)}</Text>
                  </View>

                  <Text style={styles.cardTitulo} numberOfLines={1}>{s.descripcion_carga}</Text>
                  <Text style={styles.cardRuta} numberOfLines={1}>
                    {origen} → {destino} · {s.tonelaje_requerido} ton
                  </Text>

                  <View style={styles.cardBottom}>
                    <Text style={styles.distancia}>
                      {s.distancia_km ? `~${s.distancia_km.toFixed(1)} km` : '— km'}
                    </Text>
                    <Text style={styles.precio}>
                      {s.precio_base
                        ? `Precio base: $${s.precio_base.toLocaleString('es-MX')} MXN`
                        : 'Precio pendiente'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonVerDetalle}
                  onPress={() => verDetalleSolicitud(s.solicitud_id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.textoBotonVerDetalle}>Ver detalles</Text>
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
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

  cardServicioActivo: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  filaServicioActivo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dotVerdePulso: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  tituloServicioActivo: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  destinoServicioActivo: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 10,
  },
  linkServicioActivo: {
    color: '#f97316',
    fontWeight: '700',
    fontSize: 13,
  },

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
  botonVerDetalle: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  textoBotonVerDetalle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});