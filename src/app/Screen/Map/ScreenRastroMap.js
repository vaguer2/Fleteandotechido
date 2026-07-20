import polyline from '@mapbox/polyline';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enviarNotificacion, obtenerTokenCliente } from '@/hooks/useNotificaciones';
import { supabase } from '../../../../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

export default function ScreenRastroMap() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { height } = useWindowDimensions();

  const solicitudId = Array.isArray(params.solicitudId) ? params.solicitudId[0] : params.solicitudId;

  const [fletero, setFletero] = useState(null);
  const [usuarioSolicitud, setUsuarioSolicitud] = useState(null);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState({ latitude: 20.6296, longitude: -87.0739 });
  const [ubicacionFletero, setUbicacionFletero] = useState(null);
  const [rutaCompleta, setRutaCompleta] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [finalizando, setFinalizando] = useState(false);

  const pantallaPequena = height < 700;

  const limpiarTelefono = telefono => {
    const telefonoSinEspacios = telefono.trim();
    const tienePrefijo = telefonoSinEspacios.startsWith('+');
    const soloNumeros = telefonoSinEspacios.replace(/\D/g, '');

    if (!soloNumeros) return '';

    return tienePrefijo ? `+${soloNumeros}` : soloNumeros;
  };

  const abrirAplicacionTelefono = async (telefonoMostrado, telefonoLimpio) => {
    try {
      await Linking.openURL(`tel:${telefonoLimpio}`);
    } catch (error) {
      console.log('Error al abrir la aplicación de teléfono:', error);
      Alert.alert('No se pudo abrir el teléfono', `Puedes llamar manualmente al número ${telefonoMostrado}.`);
    }
  };

  const llamarUsuario = () => {
    const telefono = usuarioSolicitud?.telefono?.trim();

    if (!telefono) {
      Alert.alert('Teléfono no disponible', 'El usuario no tiene un número telefónico registrado.');
      return;
    }

    const telefonoLimpio = limpiarTelefono(telefono);

    if (!telefonoLimpio) {
      Alert.alert('Número no válido', 'El número registrado para el usuario no es válido.');
      return;
    }

    Alert.alert(
      'Llamar al usuario',
      `¿Deseas llamar a ${usuarioSolicitud?.nombre ?? 'el usuario'} al número ${telefono}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir teléfono',
          onPress: () => {
            void abrirAplicacionTelefono(telefono, telefonoLimpio);
          },
        },
      ]
    );
  };

  const finalizarServicio = () => {
    if (!solicitudId) {
      Alert.alert('Error', 'No se encontró la solicitud activa.');
      return;
    }

    Alert.alert('¿Finalizar servicio?', '¿Confirmas que ya entregaste la carga en el destino?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        onPress: async () => {
          setFinalizando(true);

          try {
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
              return;
            }

            const tokenCliente = await obtenerTokenCliente(solicitudId);

            if (tokenCliente) {
              await enviarNotificacion(
                tokenCliente,
                'Tu cargamento fue entregado',
                'El servicio se completó exitosamente. No olvides calificar a tu fletero.'
              );
            }

            router.replace('/Screen/Home/ScreenHomeFletero');
          } catch (error) {
            console.log('Error general al finalizar:', error);
            Alert.alert('Error', 'Ocurrió un problema al finalizar el servicio.');
          } finally {
            setFinalizando(false);
          }
        },
      },
    ]);
  };

  const obtenerRutaPorCalles = async (origenCoord, destinoCoord) => {
    try {
      const url =
        'https://maps.googleapis.com/maps/api/directions/json' +
        `?origin=${origenCoord.latitude},${origenCoord.longitude}` +
        `&destination=${destinoCoord.latitude},${destinoCoord.longitude}` +
        `&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.routes?.length > 0) {
        const puntos = json.routes[0].overview_polyline.points;

        const coordenadas = polyline
          .decode(puntos)
          .map(([latitude, longitude]) => ({ latitude, longitude }));

        setRutaCompleta(coordenadas);
      }
    } catch (error) {
      console.log('Error al obtener la ruta:', error);
    }
  };

  useEffect(() => {
    let componenteActivo = true;

    async function cargarDatos() {
      if (!solicitudId) {
        if (componenteActivo) setCargando(false);
        return;
      }

      try {
        const { data: solicitud, error } = await supabase
          .from('solicitud')
          .select(`
            *,
            fletero(*),
            usuario(
              usuario_id,
              nombre,
              telefono
            ),
            punto_ruta(*)
          `)
          .eq('solicitud_id', solicitudId)
          .single();

        if (!componenteActivo) return;

        if (error || !solicitud) {
          console.log('Error al traer la solicitud:', error);
          return;
        }

        if (solicitud.fletero) setFletero(solicitud.fletero);
        if (solicitud.usuario) setUsuarioSolicitud(solicitud.usuario);

        const puntoOrigen = solicitud.punto_ruta?.find(punto => punto.tipo === 'origen');
        const puntoDestino = solicitud.punto_ruta?.find(punto => punto.tipo === 'destino');

        let origenCoord = null;
        let destinoCoord = null;

        if (puntoOrigen) {
          origenCoord = {
            latitude: Number(puntoOrigen.latitud),
            longitude: Number(puntoOrigen.longitud),
          };

          setOrigen(origenCoord);
        }

        if (puntoDestino) {
          destinoCoord = {
            latitude: Number(puntoDestino.latitud),
            longitude: Number(puntoDestino.longitud),
          };

          setDestino(destinoCoord);
        }

        if (origenCoord && destinoCoord) {
          await obtenerRutaPorCalles(origenCoord, destinoCoord);
        }

        if (solicitud.fletero_id) {
          const { data: ultimaUbicacion, error: errorUbicacion } = await supabase
            .from('ubicacion_fletero')
            .select('*')
            .eq('fletero_id', solicitud.fletero_id)
            .eq('solicitud_id', solicitudId)
            .order('registrado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (errorUbicacion) {
            console.log('Error al obtener la última ubicación:', errorUbicacion);
          }

          if (ultimaUbicacion && componenteActivo) {
            setUbicacionFletero({
              latitude: Number(ultimaUbicacion.latitud),
              longitude: Number(ultimaUbicacion.longitud),
            });
          }
        }
      } catch (error) {
        console.log('Error general al cargar datos:', error);
      } finally {
        if (componenteActivo) setCargando(false);
      }
    }

    void cargarDatos();

    if (!solicitudId) {
      return () => {
        componenteActivo = false;
      };
    }

    const canal = supabase
      .channel(`ubicacion_solicitud_${solicitudId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ubicacion_fletero',
          filter: `solicitud_id=eq.${solicitudId}`,
        },
        payload => {
          setUbicacionFletero({
            latitude: Number(payload.new.latitud),
            longitude: Number(payload.new.longitud),
          });
        }
      )
      .subscribe();

    return () => {
      componenteActivo = false;
      supabase.removeChannel(canal);
    };
  }, [solicitudId]);

  const encontrarIndiceMasCercano = (coordenada, ruta) => {
    let indiceMasCercano = 0;
    let menorDistancia = Infinity;

    ruta.forEach((punto, index) => {
      const diferenciaLatitud = punto.latitude - coordenada.latitude;
      const diferenciaLongitud = punto.longitude - coordenada.longitude;

      const distancia =
        diferenciaLatitud * diferenciaLatitud +
        diferenciaLongitud * diferenciaLongitud;

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        indiceMasCercano = index;
      }
    });

    return indiceMasCercano;
  };

  const calcularSegmentosRuta = () => {
    if (!rutaCompleta.length || !ubicacionFletero) {
      return {
        recorrido: [],
        pendiente: rutaCompleta,
      };
    }

    const indiceActual = encontrarIndiceMasCercano(ubicacionFletero, rutaCompleta);

    return {
      recorrido: rutaCompleta.slice(0, indiceActual + 1),
      pendiente: rutaCompleta.slice(indiceActual),
    };
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1E2D4A" size="large" />
        <Text style={styles.textoCargando}>Cargando seguimiento...</Text>
      </SafeAreaView>
    );
  }

  const iniciales = (fletero?.nombre ?? 'Fletero')
    .split(' ')
    .filter(Boolean)
    .map(nombre => nombre[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const posicionFletero = ubicacionFletero ?? origen ?? destino;
  const { recorrido, pendiente } = calcularSegmentosRuta();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Rastreo en tiempo real
            </Text>

            <Text style={styles.headerSub} numberOfLines={1}>
              {fletero?.nombre ?? 'Tu fletero'} está en camino
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: posicionFletero.latitude,
            longitude: posicionFletero.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          mapPadding={{ top: 20, right: 12, bottom: 20, left: 12 }}
        >
          {pendiente.length > 0 && (
            <Polyline
              coordinates={pendiente}
              strokeColor="#1565C0"
              strokeWidth={5}
            />
          )}

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
              description="Lugar de recogida"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerOrigenExterior}>
                <View style={styles.markerOrigenInterior}>
                  <Ionicons name="location" size={17} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          )}

          {ubicacionFletero && (
            <Marker
              coordinate={ubicacionFletero}
              title={fletero?.nombre ?? 'Fletero'}
              description="Ubicación actual"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerFleteroExterior}>
                <View style={styles.markerFleteroInterior}>
                  <Ionicons name="car-sport" size={20} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          )}

          <Marker
            coordinate={destino}
            title="Destino"
            description="Lugar de entrega"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerDestinoExterior}>
              <View style={styles.markerDestinoInterior}>
                <Ionicons name="flag" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        </MapView>
      </View>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={[styles.card, pantallaPequena && styles.cardCompacta]}>
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciales}</Text>
            </View>

            <View style={styles.driverInfo}>
              <Text style={styles.driverName} numberOfLines={1}>
                {fletero?.nombre ?? 'Fletero'}
              </Text>

              <Text style={styles.stars} numberOfLines={1}>
                {'★'.repeat(
                  Math.round(Number(fletero?.calificacion_promedio ?? 0))
                )}{' '}
                {Number(fletero?.calificacion_promedio ?? 0).toFixed(1)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={llamarUsuario}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Llamar al usuario"
            >
              <Ionicons name="call-outline" size={19} color="#1E2D4A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push(
                  `/Screen/Mensaje/ScreenMensajes?solicitudId=${solicitudId}`
                )
              }
              activeOpacity={0.75}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={19}
                color="#1E2D4A"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.btnFinalizar,
              finalizando && styles.btnDeshabilitado,
            ]}
            onPress={finalizarServicio}
            disabled={finalizando}
            activeOpacity={0.85}
          >
            {finalizando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.btnFinalizarTexto}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Finalizar servicio
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#FFFFFF' },
  textoCargando: { marginTop: 12, color: '#64748B', fontSize: 14, textAlign: 'center' },

  headerSafeArea: { backgroundColor: '#071B33', zIndex: 20, elevation: 20 },
  header: { width: '100%', minHeight: 70, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#071B33', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 7 },
  backBtn: { width: 38, height: 38, borderRadius: 19, marginRight: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.14)' },
  headerTextContainer: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'left' },
  headerSub: { marginTop: 2, color: 'rgba(255,255,255,0.70)', fontSize: 12 },

  mapContainer: { flex: 1, minHeight: 220, backgroundColor: '#E5E7EB' },
  map: { flex: 1 },

  markerOrigenExterior: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.22)' },
  markerOrigenInterior: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#22C55E', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 },

  markerDestinoExterior: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(249,115,22,0.22)' },
  markerDestinoInterior: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#F97316', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 },

  markerFleteroExterior: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,37,69,0.20)' },
  markerFleteroInterior: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#0B2545', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 6 },

  footerSafeArea: { backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 8 },
  card: { width: '100%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#FFFFFF' },
  cardCompacta: { paddingTop: 12, paddingBottom: 10 },

  driverRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#E8F0E6' },
  avatarText: { color: '#1E2D4A', fontSize: 13, fontWeight: '600' },
  driverInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  driverName: { color: '#1A1A1A', fontSize: 14, fontWeight: '600' },
  stars: { marginTop: 2, color: '#F0A030', fontSize: 12 },

  actionBtn: { width: 38, height: 38, borderRadius: 19, marginLeft: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 0.5, borderColor: '#E0E0E0', backgroundColor: '#F4F4F0' },

  btnFinalizar: { width: '100%', minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316' },
  btnDeshabilitado: { opacity: 0.65 },
  btnFinalizarTexto: { flexShrink: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});