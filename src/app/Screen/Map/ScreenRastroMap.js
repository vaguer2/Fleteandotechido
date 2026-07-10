import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import polyline from '@mapbox/polyline';
import { supabase } from '../../../../lib/supabase';
// Agrega estos imports si no los tienes
import { Alert } from 'react-native';
import { useAuth } from '../../../../providers/AuthProvider';
import { enviarNotificacion, obtenerTokenCliente } from '@/hooks/useNotificaciones';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

export default function ScreenRastroMap() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const solicitudId = params.solicitudId;

  const [fletero, setFletero] = useState(null);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState({ latitude: 20.6296, longitude: -87.0739 });
  const [ubicacionFletero, setUbicacionFletero] = useState(null);
  const [rutaCompleta, setRutaCompleta] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  // Agrega esta función dentro del componente
  const finalizarServicio = async () => {
    if (!solicitudId) return;

    Alert.alert(
      '¿Finalizar servicio?',
      '¿Confirmas que ya entregaste la carga en el destino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, finalizar',
          onPress: async () => {
            setFinalizando(true);
            const { error } = await supabase
              .from('solicitud')
              .update({
                estado: 'completada',
                hora_fin: new Date().toISOString(),
              })
              .eq('solicitud_id', solicitudId);

            if (error) {
              console.log('Error al finalizar servicio:', error);
              Alert.alert('Error', 'No se pudo finalizar el servicio.');
              setFinalizando(false);
              return;
            }
            const tokenCliente = await obtenerTokenCliente(solicitudId);
            await enviarNotificacion(
              tokenCliente,
              'Tu cargamento fue entregado.',
              'El servicio se completo exitosamente. No olvides de calificar a tu fletero'
            )

            setFinalizando(false);
            router.replace('/Screen/Home/ScreenHomeFletero');
          }
        }
      ]
    );
  };
  async function obtenerRutaPorCalles(origenCoord, destinoCoord) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origenCoord.latitude},${origenCoord.longitude}&destination=${destinoCoord.latitude},${destinoCoord.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.routes && json.routes.length > 0) {
        const puntos = json.routes[0].overview_polyline.points;
        const decodificado = polyline.decode(puntos);
        const coordenadas = decodificado.map(
          ([lat, lng]) => ({ latitude: lat, longitude: lng })
        );
        setRutaCompleta(coordenadas);
      }
    } catch (error) {
      console.log('Error al obtener la ruta:', error);
    }
  }

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) {
        setCargando(false);
        return;
      }

      const { data: solicitud, error } = await supabase
        .from('solicitud')
        .select('*, fletero(*), punto_ruta(*)')
        .eq('solicitud_id', solicitudId)
        .single();

      if (error || !solicitud) {
        console.log('Error al traer la solicitud:', error);
        setCargando(false);
        return;
      }

      if (solicitud.fletero) {
        setFletero(solicitud.fletero);
      }

      const puntoOrigen = solicitud.punto_ruta?.find((p) => p.tipo === 'origen');
      const puntoDestino = solicitud.punto_ruta?.find((p) => p.tipo === 'destino');

      let origenCoord = null;
      let destinoCoord = null;

      if (puntoOrigen) {
        origenCoord = { latitude: puntoOrigen.latitud, longitude: puntoOrigen.longitud };
        setOrigen(origenCoord);
      }
      if (puntoDestino) {
        destinoCoord = { latitude: puntoDestino.latitud, longitude: puntoDestino.longitud };
        setDestino(destinoCoord);
      }

      if (origenCoord && destinoCoord) {
        await obtenerRutaPorCalles(origenCoord, destinoCoord);
      }

      if (solicitud.fletero_id) {
        const { data: ultimaUbicacion } = await supabase
          .from('ubicacion_fletero')
          .select('*')
          .eq('fletero_id', solicitud.fletero_id)
          .eq('solicitud_id', solicitudId)
          .order('registrado_en', { ascending: false })
          .limit(1)
          .single();

        if (ultimaUbicacion) {
          setUbicacionFletero({
            latitude: ultimaUbicacion.latitud,
            longitude: ultimaUbicacion.longitud,
          });
        }
      }

      setCargando(false);
    }

    cargarDatos();

    const canal = supabase
      .channel(`ubicacion_solicitud_${solicitudId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ubicacion_fletero', filter: `solicitud_id=eq.${solicitudId}` },
        (payload) => {
          setUbicacionFletero({
            latitude: payload.new.latitud,
            longitude: payload.new.longitud,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [solicitudId]);

  // Encuentra el índice del punto de la ruta más cercano a una coordenada dada
  function encontrarIndiceMasCercano(coordenada, ruta) {
    let indiceMasCercano = 0;
    let menorDistancia = Infinity;

    ruta.forEach((punto, index) => {
      const dLat = punto.latitude - coordenada.latitude;
      const dLng = punto.longitude - coordenada.longitude;
      const distancia = dLat * dLat + dLng * dLng;

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        indiceMasCercano = index;
      }
    });

    return indiceMasCercano;
  }

  // Divide la ruta completa en "recorrida" (gris) y "pendiente" (azul) según la posición del fletero
  function calcularSegmentosRuta() {
    if (rutaCompleta.length === 0 || !ubicacionFletero) {
      return { recorrido: [], pendiente: rutaCompleta };
    }

    const indiceActual = encontrarIndiceMasCercano(ubicacionFletero, rutaCompleta);

    const recorrido = rutaCompleta.slice(0, indiceActual + 1);
    const pendiente = rutaCompleta.slice(indiceActual);

    return { recorrido, pendiente };
  }

  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#1e2d4a" size="large" />
      </View>
    );
  }

  const iniciales = (fletero?.nombre ?? 'Fletero')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const posicionFletero = ubicacionFletero ?? origen ?? destino;
  const { recorrido, pendiente } = calcularSegmentosRuta();

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Rastreo en tiempo real</Text>
          <Text style={styles.headerSub}>
            {fletero?.nombre ?? 'Tu fletero'} está en camino
          </Text>
        </View>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: posicionFletero.latitude,
          longitude: posicionFletero.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Tramo pendiente, en azul (de fondo) */}
        {pendiente.length > 0 && (
          <Polyline
            coordinates={pendiente}
            strokeColor="#1565C0"
            strokeWidth={5}
          />
        )}

        {/* Tramo ya recorrido, en gris (encima) */}
        {recorrido.length > 0 && (
          <Polyline
            coordinates={recorrido}
            strokeColor="#9CA3AF"
            strokeWidth={5}
          />
        )}

        {origen && (
          <Marker
            coordinate={origen}
            title="Punto de origen"
            pinColor="green"
          />
        )}

        {ubicacionFletero && (
          <Marker
            coordinate={ubicacionFletero}
            title={fletero?.nombre ?? 'Fletero'}
            description="Fletero en camino"
          />
        )}

        <Marker
          coordinate={destino}
          title="Tu destino"
          pinColor="orange"
        />
      </MapView>

      <View style={styles.card}>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{fletero?.nombre ?? 'Fletero'}</Text>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(fletero?.calificacion_promedio ?? 0))} {fletero?.calificacion_promedio ?? 0}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionBtn}>
            <Text>📞</Text>
          </TouchableOpacity>

          <TouchableOpacity 
          style={styles.actionBtn}
          onPress={()=> router.push(`/Screen/Mensaje/ScreenMensajes?solicitudId=${solicitudId}`)}
          >
            <Text>💬</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btnFinalizar}
          onPress={finalizarServicio}
          disabled={finalizando}
          activeOpacity={0.85}
        >
          {finalizando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnFinalizarTexto}>✓ Finalizar servicio</Text>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#1e2d4a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: 'white', fontSize: 24, lineHeight: 28 },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: '500' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  map: { flex: 1 },
  card: {
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 0.5, borderTopColor: '#e0e0e0',
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e8f0e6', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '500', fontSize: 13, color: '#1e2d4a' },
  driverName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  stars: { fontSize: 12, color: '#f0a030', marginTop: 2 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f4f4f0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#e0e0e0',
  },
  etaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff8f0', borderRadius: 8, padding: 10,
    borderWidth: 0.5, borderColor: '#f0d0a0',
  },
  etaLabel: { fontSize: 13, color: '#666' },
  etaValue: { fontSize: 14, fontWeight: '600', color: '#e07030' },
  
  btnFinalizar: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnFinalizarTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});