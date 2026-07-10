import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { useAuth } from '../../../../providers/AuthProvider';
import { supabase } from '../../../../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

type Coordenada = {
  latitude: number;
  longitude: number;
};

export default function ScreenMapSuccess() {
  const { usuario } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const solicitudId = params.solicitudId;

  const nombre = usuario?.nombre ?? 'user';

  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    Inter_600SemiBold,
    Inter_400Regular,
  });

  const [origen, setOrigen] = useState<Coordenada | null>(null);
  const [destino, setDestino] = useState<Coordenada | null>(null);
  const [rutaCalles, setRutaCalles] = useState<Coordenada[]>([]);
  const [cargandoMapa, setCargandoMapa] = useState(true);
  const [fletero, setFletero] = useState<any>(null);
  const [direccionOrigen, setDireccionOrigen] = useState<string>('');
  const [direccionDestino, setDireccionDestino] = useState<string>('');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('20-30 min');

  async function obtenerRutaPorCalles(origenCoord: Coordenada, destinoCoord: Coordenada) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origenCoord.latitude},${origenCoord.longitude}&destination=${destinoCoord.latitude},${destinoCoord.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.routes && json.routes.length > 0) {
        const puntos = json.routes[0].overview_polyline.points;
        const decodificado = polyline.decode(puntos);
        const coordenadas: Coordenada[] = decodificado.map(
          ([lat, lng]: [number, number]) => ({ latitude: lat, longitude: lng })
        );
        setRutaCalles(coordenadas);

        // Calculamos el tiempo estimado real con base en la duración que da Google
        const segundos = json.routes[0].legs[0].duration.value;
        const minutos = Math.round(segundos / 60);
        setTiempoEstimado(`${minutos}-${minutos + 10} min`);
      }
    } catch (error) {
      //console.log('Error al obtener la ruta:', error);
    }
  }

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) {
        setCargandoMapa(false);
        return;
      }

      // 1. Cargar la solicitud completa con el fletero y los puntos de ruta en una sola consulta
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitud')
        .select('*, fletero(*), punto_ruta(*)')
        .eq('solicitud_id', solicitudId)
        .single();

      if (errorSolicitud || !solicitud) {
        //console.log('Error al traer la solicitud:', errorSolicitud);
        setCargandoMapa(false);
        return;
      }

      const puntoOrigen = solicitud.punto_ruta.find((p: any) => p.tipo === 'origen');
      const puntoDestino = solicitud.punto_ruta.find((p: any) => p.tipo === 'destino');

      let origenCoord: Coordenada | null = null;
      let destinoCoord: Coordenada | null = null;

      if (puntoOrigen) {
        origenCoord = { latitude: puntoOrigen.latitud, longitude: puntoOrigen.longitud };
        setOrigen(origenCoord);
        setDireccionOrigen(puntoOrigen.direccion_texto ?? 'Ubicación actual');
      }
      if (puntoDestino) {
        destinoCoord = { latitude: puntoDestino.latitud, longitude: puntoDestino.longitud };
        setDestino(destinoCoord);
        setDireccionDestino(puntoDestino.direccion_texto ?? 'Sin dirección');
      }

      if (origenCoord && destinoCoord) {
        await obtenerRutaPorCalles(origenCoord, destinoCoord);
      }

      // 2. El fletero ya viene incluido en la misma consulta
      if (solicitud.fletero) {
        setFletero(solicitud.fletero);
      }

      setCargandoMapa(false);
    }

    cargarDatos();
  }, [solicitudId]);

  if (!fontsLoaded) return null;

  const regionInicial = origen && destino ? {
    latitude: (origen.latitude + destino.latitude) / 2,
    longitude: (origen.longitude + destino.longitude) / 2,
    latitudeDelta: Math.abs(origen.latitude - destino.latitude) * 1.8 || 0.02,
    longitudeDelta: Math.abs(origen.longitude - destino.longitude) * 1.8 || 0.02,
  } : {
    latitude: 20.6296,
    longitude: -87.0739,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Sección azul */}
      <View style={styles.seccionAzul}>
        <View style={styles.avatarCircle}>
          <Text style={styles.textoAvatar}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.textoAzul}>{fletero?.nombre ?? 'Tu fletero'} está en camino</Text>
        <Text style={styles.textitoGris}>Tu pago de depósito se procesó. Servicio confirmado</Text>
        <Text style={styles.leyendaNaranja}>Llega en aproximadamente {tiempoEstimado}</Text>
      </View>

      {/* Sección del mapa */}
      <View style={styles.seccionMapa}>
        {cargandoMapa ? (
          <View style={styles.mapaCargando}>
            <ActivityIndicator color="#FF7A1A" />
          </View>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapa}
            initialRegion={regionInicial}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {rutaCalles.length > 0 && (
              <Polyline coordinates={rutaCalles} strokeColor="#FF7A1A" strokeWidth={4} />
            )}
            {origen && (
              <Marker coordinate={origen} title={direccionOrigen}>
                <View style={styles.markerOrigen} />
              </Marker>
            )}
            {destino && (
              <Marker coordinate={destino} title={direccionDestino}>
                <View style={styles.markerDestino} />
              </Marker>
            )}
          </MapView>
        )}
      </View>

      {/* Sección blanca: tarjeta del fletero */}
      <View style={styles.seccionBlanca}>
        <View style={styles.tarjetaFletero}>
          <View style={styles.filaFletero}>
            <View style={styles.avatarFleteroCircle}>
              <Text style={styles.avatarFleteroTexto}>
                {fletero?.nombre?.charAt(0).toUpperCase() ?? 'F'}
              </Text>
            </View>

            <View style={styles.infoFletero}>
              <Text style={styles.nombreFletero}>{fletero?.nombre ?? 'Fletero'}</Text>
              <View style={styles.filaEstrellas}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name="star"
                    size={12}
                    color={i <= Math.round(fletero?.calificacion_promedio ?? 0) ? '#FF7A1A' : '#E9ECF2'}
                  />
                ))}
              </View>
              <Text style={styles.vehiculoFletero}>
                {fletero?.tipo_vehiculo ?? 'Vehículo'} {fletero?.placa_vehiculo ? `· ${fletero.placa_vehiculo}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.labelEstado}>RUTA DEL SERVICIO</Text>
          <View style={styles.filaEstado}>
            <Ionicons name="ellipse" size={10} color="#0A2348" />
            <Text style={styles.textoEstado} numberOfLines={1}>{direccionOrigen}</Text>
          </View>
          <View style={[styles.filaEstado, { marginTop: 6 }]}>
            <Ionicons name="location" size={14} color="#FF7A1A" />
            <Text style={styles.textoEstado} numberOfLines={1}>{direccionDestino}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.botonVerMapa, pressed && { opacity: 0.85 }]}
          onPress={() => router.push({
            pathname: '/Screen/Map/ScreenRastroMap',
            params: { solicitudId },
          } as any)}
        >
          <Text style={styles.textoBotonVerMapa}>Ver el mapa en tiempo real</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  seccionAzul: {
    flex: 5,
    backgroundColor: '#0A2348',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccionMapa: { flex: 4 },
  mapa: { flex: 1 },
  mapaCargando: {
    flex: 1,
    backgroundColor: '#E9ECF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOrigen: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#0A2348', borderWidth: 2, borderColor: '#FFFFFF',
  },
  markerDestino: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF7A1A', borderWidth: 2, borderColor: '#FFFFFF',
  },
  seccionBlanca: {
    flex: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  textoAzul: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '600',
    marginBottom: 8, marginTop: 15, fontFamily: 'Inter_700Bold',
    textAlign: 'center', paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255, 122, 26, 0.15)',
    borderWidth: 2, borderColor: '#FF7A1A',
    alignItems: 'center', justifyContent: 'center', marginTop: 25,
  },
  textoAvatar: { color: '#FF7A1A', fontSize: 24, fontWeight: '700' },
  textitoGris: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15, marginHorizontal: 50, textAlign: 'center',
  },
  leyendaNaranja: {
    backgroundColor: '#ff7a1a', borderRadius: 60,
    paddingHorizontal: 30, paddingVertical: 9, marginTop: 15,
    color: '#fff', fontFamily: 'Inter_700Bold',
  },
  tarjetaFletero: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    padding: 16,
  },
  filaFletero: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarFleteroCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 122, 26, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarFleteroTexto: {
    color: '#FF7A1A',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  infoFletero: { flex: 1 },
  nombreFletero: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#0A2348',
    marginBottom: 2,
  },
  filaEstrellas: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  vehiculoFletero: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8FA8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E9ECF2',
    marginVertical: 14,
  },
  labelEstado: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#8A8FA8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoEstado: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0A2348',
    flex: 1,
  },
  botonVerMapa: {
    backgroundColor: '#FF7A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  textoBotonVerMapa: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});