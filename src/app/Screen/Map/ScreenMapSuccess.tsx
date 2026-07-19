import polyline from '@mapbox/polyline';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';

const GOOGLE_MAPS_API_KEY =
  'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

type Coordenada = {
  latitude: number;
  longitude: number;
};

type Fletero = {
  fletero_id?: string;
  nombre?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  verificado?: boolean | null;
  calificacion_promedio?: number | string | null;
  tipo_vehiculo?: string | null;
  placa_vehiculo?: string | null;
};

type PuntoRuta = {
  punto_ruta_id?: number;
  tipo: 'origen' | 'destino' | string;
  latitud: number;
  longitud: number;
  direccion_texto?: string | null;
};

type Solicitud = {
  solicitud_id: number;
  fletero_id?: string | null;
  estado?: string | null;
  fletero?: Fletero | null;
  punto_ruta?: PuntoRuta[] | null;
};

type UbicacionFletero = {
  ubicacion_id?: number;
  fletero_id?: string;
  solicitud_id?: number;
  latitud: number | string;
  longitud: number | string;
  registrado_en?: string | null;
};

type SegmentosRuta = {
  recorrido: Coordenada[];
  pendiente: Coordenada[];
};

type ParametrosRuta = {
  solicitudId?: string | string[];
};

const REGION_PREDETERMINADA = {
  latitude: 20.6296,
  longitude: -87.0739,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function ScreenMapTrackFleteroByUser() {
  const router = useRouter();
  const params = useLocalSearchParams<ParametrosRuta>();

  const mapRef = useRef<MapView | null>(null);
  const { height } = useWindowDimensions();

  const solicitudId = Array.isArray(
    params.solicitudId
  )
    ? params.solicitudId[0]
    : params.solicitudId;

  const [fletero, setFletero] =
    useState<Fletero | null>(null);

  const [origen, setOrigen] =
    useState<Coordenada | null>(null);

  const [destino, setDestino] =
    useState<Coordenada | null>(null);

  const [
    ubicacionFletero,
    setUbicacionFletero,
  ] = useState<Coordenada | null>(null);

  const [rutaCompleta, setRutaCompleta] =
    useState<Coordenada[]>([]);

  const [
    direccionOrigen,
    setDireccionOrigen,
  ] = useState<string>('');

  const [
    direccionDestino,
    setDireccionDestino,
  ] = useState<string>('');

  const [
    estadoServicio,
    setEstadoServicio,
  ] = useState<string>('');

  const [
    ultimaActualizacion,
    setUltimaActualizacion,
  ] = useState<string | null>(null);

  const [cargando, setCargando] =
    useState<boolean>(true);

  const [errorCarga, setErrorCarga] =
    useState<string>('');

  const pantallaPequena = height < 700;

  const obtenerRutaPorCalles = async (
    origenCoord: Coordenada,
    destinoCoord: Coordenada
  ): Promise<void> => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origenCoord.latitude},${origenCoord.longitude}` +
        `&destination=${destinoCoord.latitude},${destinoCoord.longitude}` +
        `&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const json = await response.json();

      if (
        Array.isArray(json.routes) &&
        json.routes.length > 0
      ) {
        const puntos =
          json.routes[0]?.overview_polyline
            ?.points;

        if (!puntos) {
          return;
        }

        const rutaDecodificada =
          polyline.decode(puntos) as [
            number,
            number,
          ][];

        const coordenadas: Coordenada[] =
          rutaDecodificada.map(
            ([latitud, longitud]) => ({
              latitude: latitud,
              longitude: longitud,
            })
          );

        setRutaCompleta(coordenadas);
      }
    } catch (error) {
      console.log(
        'Error al obtener la ruta:',
        error
      );
    }
  };

  const ajustarMapaARuta = (
    ubicacionActual:
      | Coordenada
      | null = ubicacionFletero
  ): void => {
    const coordenadas: Coordenada[] = [
      origen,
      destino,
      ubicacionActual,
    ].filter(
      (
        coordenada
      ): coordenada is Coordenada =>
        coordenada !== null
    );

    if (
      !mapRef.current ||
      coordenadas.length === 0
    ) {
      return;
    }

    if (coordenadas.length === 1) {
      const coordenada =
        coordenadas[0];

      mapRef.current.animateToRegion(
        {
          latitude:
            coordenada.latitude,
          longitude:
            coordenada.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );

      return;
    }

    mapRef.current.fitToCoordinates(
      coordenadas,
      {
        edgePadding: {
          top: 70,
          right: 50,
          bottom: 100,
          left: 50,
        },
        animated: true,
      }
    );
  };

  const centrarEnFletero = (): void => {
    if (
      !mapRef.current ||
      !ubicacionFletero
    ) {
      Alert.alert(
        'Ubicación no disponible',
        'Todavía no se ha recibido la ubicación del fletero.'
      );

      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude:
          ubicacionFletero.latitude,
        longitude:
          ubicacionFletero.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      500
    );
  };

  useEffect(() => {
    let componenteActivo = true;

    async function cargarDatos(): Promise<void> {
      if (!solicitudId) {
        setErrorCarga(
          'No se encontró la solicitud activa.'
        );
        setCargando(false);
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from('solicitud')
          .select(
            '*, fletero(*), punto_ruta(*)'
          )
          .eq(
            'solicitud_id',
            solicitudId
          )
          .single();

        const solicitud =
          data as Solicitud | null;

        if (error || !solicitud) {
          console.log(
            'Error al cargar la solicitud:',
            error
          );

          if (componenteActivo) {
            setErrorCarga(
              'No se pudo cargar la información del servicio.'
            );
          }

          return;
        }

        if (!componenteActivo) {
          return;
        }

        setFletero(
          solicitud.fletero ?? null
        );

        setEstadoServicio(
          solicitud.estado ?? ''
        );

        const puntoOrigen =
          solicitud.punto_ruta?.find(
            (punto) =>
              punto.tipo === 'origen'
          );

        const puntoDestino =
          solicitud.punto_ruta?.find(
            (punto) =>
              punto.tipo === 'destino'
          );

        let origenCoord:
          | Coordenada
          | null = null;

        let destinoCoord:
          | Coordenada
          | null = null;

        if (puntoOrigen) {
          origenCoord = {
            latitude:
              Number(
                puntoOrigen.latitud
              ),
            longitude:
              Number(
                puntoOrigen.longitud
              ),
          };

          setOrigen(origenCoord);

          setDireccionOrigen(
            puntoOrigen.direccion_texto ??
            'Punto de origen'
          );
        }

        if (puntoDestino) {
          destinoCoord = {
            latitude:
              Number(
                puntoDestino.latitud
              ),
            longitude:
              Number(
                puntoDestino.longitud
              ),
          };

          setDestino(destinoCoord);

          setDireccionDestino(
            puntoDestino.direccion_texto ??
            'Punto de destino'
          );
        }

        if (
          origenCoord &&
          destinoCoord
        ) {
          await obtenerRutaPorCalles(
            origenCoord,
            destinoCoord
          );
        }

        if (solicitud.fletero_id) {
          const {
            data: ubicacionData,
            error:
            errorUltimaUbicacion,
          } = await supabase
            .from(
              'ubicacion_fletero'
            )
            .select('*')
            .eq(
              'fletero_id',
              solicitud.fletero_id
            )
            .eq(
              'solicitud_id',
              solicitudId
            )
            .order(
              'registrado_en',
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

          const ultimaUbicacion =
            ubicacionData as
            | UbicacionFletero
            | null;

          if (
            errorUltimaUbicacion
          ) {
            console.log(
              'Error al consultar ubicación:',
              errorUltimaUbicacion
            );
          }

          if (
            ultimaUbicacion &&
            componenteActivo
          ) {
            const coordenada: Coordenada =
            {
              latitude: Number(
                ultimaUbicacion.latitud
              ),
              longitude: Number(
                ultimaUbicacion.longitud
              ),
            };

            setUbicacionFletero(
              coordenada
            );

            setUltimaActualizacion(
              ultimaUbicacion.registrado_en ??
              new Date().toISOString()
            );
          }
        }
      } catch (error) {
        console.log(
          'Error general al cargar el rastreo:',
          error
        );

        if (componenteActivo) {
          setErrorCarga(
            'Ocurrió un problema al cargar el rastreo.'
          );
        }
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    if (!solicitudId) {
      return () => {
        componenteActivo = false;
      };
    }

    const canalUbicacion = supabase
      .channel(
        `rastreo_cliente_${solicitudId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table:
            'ubicacion_fletero',
          filter:
            `solicitud_id=eq.${solicitudId}`,
        },
        (payload) => {
          const nuevaUbicacion =
            payload.new as
            UbicacionFletero;

          const coordenada: Coordenada =
          {
            latitude: Number(
              nuevaUbicacion.latitud
            ),
            longitude: Number(
              nuevaUbicacion.longitud
            ),
          };

          setUbicacionFletero(
            coordenada
          );

          setUltimaActualizacion(
            nuevaUbicacion.registrado_en ??
            new Date().toISOString()
          );
        }
      )
      .subscribe();

    const canalSolicitud = supabase
      .channel(
        `estado_solicitud_cliente_${solicitudId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'solicitud',
          filter:
            `solicitud_id=eq.${solicitudId}`,
        },
        (payload) => {
          const solicitudActualizada =
            payload.new as Solicitud;

          setEstadoServicio(
            solicitudActualizada.estado ??
            ''
          );
        }
      )
      .subscribe();

    return () => {
      componenteActivo = false;

      supabase.removeChannel(
        canalUbicacion
      );

      supabase.removeChannel(
        canalSolicitud
      );
    };
  }, [solicitudId]);

  useEffect(() => {
    if (
      cargando ||
      (!origen &&
        !destino &&
        !ubicacionFletero)
    ) {
      return;
    }

    const temporizador =
      setTimeout(() => {
        ajustarMapaARuta();
      }, 700);

    return () => {
      clearTimeout(temporizador);
    };
  }, [
    cargando,
    origen,
    destino,
  ]);

  const encontrarIndiceMasCercano = (
    coordenada: Coordenada,
    ruta: Coordenada[]
  ): number => {
    let indiceMasCercano = 0;
    let menorDistancia = Infinity;

    ruta.forEach(
      (
        punto: Coordenada,
        index: number
      ) => {
        const diferenciaLatitud =
          punto.latitude -
          coordenada.latitude;

        const diferenciaLongitud =
          punto.longitude -
          coordenada.longitude;

        const distancia =
          diferenciaLatitud *
          diferenciaLatitud +
          diferenciaLongitud *
          diferenciaLongitud;

        if (
          distancia <
          menorDistancia
        ) {
          menorDistancia =
            distancia;

          indiceMasCercano =
            index;
        }
      }
    );

    return indiceMasCercano;
  };

  const segmentosRuta =
    useMemo<SegmentosRuta>(() => {
      if (
        rutaCompleta.length === 0 ||
        !ubicacionFletero
      ) {
        return {
          recorrido: [],
          pendiente: rutaCompleta,
        };
      }

      const indiceActual =
        encontrarIndiceMasCercano(
          ubicacionFletero,
          rutaCompleta
        );

      return {
        recorrido:
          rutaCompleta.slice(
            0,
            indiceActual + 1
          ),

        pendiente:
          rutaCompleta.slice(
            indiceActual
          ),
      };
    }, [
      rutaCompleta,
      ubicacionFletero,
    ]);

  const abrirChat = (): void => {
    if (!solicitudId) {
      return;
    }

    router.push(
      `/Screen/Mensaje/ScreenMensajes?solicitudId=${solicitudId}`
    );
  };

  const llamarFletero = (): void => {
    const telefono = fletero?.telefono?.trim();

    if (!telefono) {
      Alert.alert(
        'Teléfono no disponible',
        'El fletero no tiene un número telefónico registrado.'
      );
      return;
    }

    const telefonoLimpio = telefono.replace(/[^\d+]/g, '');

    if (!telefonoLimpio) {
      Alert.alert(
        'Número no válido',
        'El número registrado para el fletero no es válido.'
      );
      return;
    }

    Alert.alert(
      'Llamar al fletero',
      `¿Deseas abrir la aplicación de teléfono para llamar al ${telefono}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Abrir teléfono',
          onPress: async () => {
            try {
              await Linking.openURL(`tel:${telefonoLimpio}`);
            } catch (error) {
              console.log(
                'Error al abrir la aplicación de teléfono:',
                error
              );

              Alert.alert(
                'No se pudo abrir el teléfono',
                `Puedes llamar manualmente al número ${telefono}.`
              );
            }
          },
        },
      ]
    );
  };

  const obtenerTextoEstado = (): string => {
    switch (estadoServicio) {
      case 'aceptada':
        return 'El fletero se dirige al punto de recogida';

      case 'en_progreso':
        return 'Tu cargamento está en camino';

      case 'completada':
        return 'El servicio fue completado';

      case 'cancelada':
        return 'El servicio fue cancelado';

      default:
        return ubicacionFletero
          ? 'Recibiendo ubicación en tiempo real'
          : 'Esperando la ubicación del fletero';
    }
  };

  const formatearHoraActualizacion =
    (): string => {
      if (!ultimaActualizacion) {
        return 'Esperando ubicación';
      }

      const fecha = new Date(
        ultimaActualizacion
      );

      if (
        Number.isNaN(
          fecha.getTime()
        )
      ) {
        return 'Ubicación actualizada';
      }

      return `Actualizado a las ${fecha.toLocaleTimeString(
        'es-MX',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )}`;
    };

  if (cargando) {
    return (
      <SafeAreaView
        style={styles.centrado}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator
          color="#F97316"
          size="large"
        />

        <Text
          style={styles.textoCargando}
        >
          Cargando ubicación del
          fletero...
        </Text>
      </SafeAreaView>
    );
  }

  if (errorCarga) {
    return (
      <SafeAreaView
        style={styles.estadoError}
        edges={['top', 'bottom']}
      >
        <View
          style={styles.iconoError}
        >
          <Ionicons
            name="map-outline"
            size={36}
            color="#64748B"
          />
        </View>

        <Text
          style={styles.tituloError}
        >
          No se pudo abrir el rastreo
        </Text>

        <Text
          style={styles.textoError}
        >
          {errorCarga}
        </Text>

        <TouchableOpacity
          style={styles.botonError}
          onPress={() =>
            router.back()
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.textoBotonError
            }
          >
            Regresar
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const iniciales = (
    fletero?.nombre ?? 'Fletero'
  )
    .split(' ')
    .filter(Boolean)
    .map(
      (nombre: string) =>
        nombre[0]
    )
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const posicionInicial:
    | Coordenada
    | typeof REGION_PREDETERMINADA =
    ubicacionFletero ??
    origen ??
    destino ??
    REGION_PREDETERMINADA;

  return (
    <View style={styles.container}>
      <SafeAreaView
        style={
          styles.headerSafeArea
        }
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              router.back()
            }
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              Rastrea tu flete
            </Text>

            <Text
              style={styles.headerSub}
              numberOfLines={1}
            >
              {obtenerTextoEstado()}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <View
        style={styles.mapContainer}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude:
              posicionInicial.latitude,
            longitude:
              posicionInicial.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          mapPadding={{
            top: 30,
            right: 20,
            bottom: 60,
            left: 20,
          }}
        >
          {segmentosRuta.pendiente
            .length > 0 && (
              <Polyline
                coordinates={
                  segmentosRuta.pendiente
                }
                strokeColor="#1565C0"
                strokeWidth={5}
              />
            )}

          {segmentosRuta.recorrido
            .length > 0 && (
              <Polyline
                coordinates={
                  segmentosRuta.recorrido
                }
                strokeColor="#9CA3AF"
                strokeWidth={5}
              />
            )}

          {origen && (
            <Marker
              coordinate={origen}
              title="Punto de origen"
              description={
                direccionOrigen
              }
            >
              <View
                style={
                  styles.markerOrigenExterior
                }
              >
                <View
                  style={
                    styles.markerOrigenInterior
                  }
                />
              </View>
            </Marker>
          )}

          {destino && (
            <Marker
              coordinate={destino}
              title="Destino"
              description={
                direccionDestino
              }
            >
              <View
                style={
                  styles.markerDestinoExterior
                }
              >
                <Ionicons
                  name="flag"
                  size={15}
                  color="#FFFFFF"
                />
              </View>
            </Marker>
          )}

          {ubicacionFletero && (
            <Marker
              coordinate={
                ubicacionFletero
              }
              title={
                fletero?.nombre ??
                'Tu fletero'
              }
              description="Ubicación actual"
              anchor={{
                x: 0.5,
                y: 0.5,
              }}
            >
              <View
                style={
                  styles.markerFleteroExterior
                }
              >
                <View
                  style={
                    styles.markerFletero
                  }
                >
                  <Ionicons
                    name="car-sport"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </Marker>
          )}
        </MapView>

        <TouchableOpacity
          style={styles.botonCentrar}
          onPress={centrarEnFletero}
          activeOpacity={0.8}
        >
          <Ionicons
            name="locate"
            size={22}
            color="#0B2545"
          />
        </TouchableOpacity>

        <View
          style={styles.leyendaMapa}
          pointerEvents="none"
        >
          <View
            style={
              styles.indicadorEnVivo
            }
          />

          <Text
            style={styles.textoEnVivo}
          >
            Seguimiento en vivo
          </Text>
        </View>
      </View>

      <SafeAreaView
        style={
          styles.footerSafeArea
        }
        edges={['bottom']}
      >
        <View
          style={[
            styles.card,
            pantallaPequena &&
            styles.cardCompacta,
          ]}
        >
          <View
            style={styles.filaFletero}
          >
            <View style={styles.avatar}>
              {fletero?.foto_url ? (
                <Image
                  source={{ uri: fletero.foto_url }}
                  style={styles.avatarImagen}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarTexto}>
                  {iniciales}
                </Text>
              )}
            </View>

            <View
              style={
                styles.informacionFletero
              }
            >
              <View style={styles.filaNombre}>
                <Text
                  style={styles.nombreFletero}
                  numberOfLines={1}
                >
                  {fletero?.nombre ?? 'Tu fletero'}
                </Text>

                {fletero?.verificado === true && (
                  <View
                    style={styles.insigniaVerificado}
                    accessibilityLabel="Fletero verificado"
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color="#2563EB"
                    />
                  </View>
                )}
              </View>

              <Text
                style={
                  styles.calificacion
                }
                numberOfLines={1}
              >
                <Text
                  style={
                    styles.estrella
                  }
                >
                  ★
                </Text>{' '}
                {Number(
                  fletero?.calificacion_promedio ??
                  0
                ).toFixed(1)}

                {fletero?.tipo_vehiculo
                  ? ` · ${fletero.tipo_vehiculo}`
                  : ''}
              </Text>

              <Text
                style={
                  styles.actualizacion
                }
                numberOfLines={1}
              >
                {formatearHoraActualizacion()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botonAccion}
              onPress={llamarFletero}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Llamar al fletero"
            >
              <Ionicons
                name="call-outline"
                size={20}
                color="#0B2545"
              />
            </TouchableOpacity>


          </View>

          <View
            style={styles.separador}
          />

          <Text
            style={styles.labelRuta}
          >
            RUTA DEL SERVICIO
          </Text>

          <View
            style={
              styles.filaDireccion
            }
          >
            <View
              style={
                styles.puntoOrigen
              }
            />

            <Text
              style={
                styles.textoDireccion
              }
              numberOfLines={1}
            >
              {direccionOrigen ||
                'Punto de origen'}
            </Text>
          </View>

          <View
            style={
              styles.lineaDireccion
            }
          />

          <View
            style={
              styles.filaDireccion
            }
          >
            <View
              style={
                styles.puntoDestino
              }
            />

            <Text
              style={
                styles.textoDireccion
              }
              numberOfLines={1}
            >
              {direccionDestino ||
                'Punto de destino'}
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.botonChatGrande
            }
            onPress={abrirChat}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.textoBotonChat
              }
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Enviar mensaje al fletero
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },

  textoCargando: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },

  estadoError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F8FAFC',
  },

  iconoError: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },

  tituloError: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },

  textoError: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  botonError: {
    minWidth: 160,
    minHeight: 48,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B2545',
  },

  textoBotonError: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  headerSafeArea: {
    backgroundColor: '#071B33',
    zIndex: 20,
    elevation: 20,
  },

  header: {
    width: '100%',
    minHeight: 70,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071B33',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 7,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  headerSub: {
    marginTop: 2,
    color:
      'rgba(255,255,255,0.70)',
    fontSize: 12,
  },

  mapContainer: {
    flex: 1,
    minHeight: 230,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },

  map: {
    flex: 1,
  },

  botonCentrar: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },

  leyendaMapa: {
    position: 'absolute',
    top: 14,
    left: 14,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(255,255,255,0.95)',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },

  indicadorEnVivo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
    backgroundColor: '#22C55E',
  },

  textoEnVivo: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },

  markerOrigenExterior: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(34,197,94,0.20)',
  },

  markerOrigenInterior: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#22C55E',
  },

  markerDestinoExterior: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F97316',
  },

  markerFleteroExterior: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(11,37,69,0.18)',
  },

  markerFletero: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0B2545',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  footerSafeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },

  card: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },

  cardCompacta: {
    paddingTop: 12,
    paddingBottom: 10,
  },

  filaFletero: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor:
      'rgba(249,115,22,0.14)',
  },

  avatarImagen: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },

  avatarTexto: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '700',
  },

  informacionFletero: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },

  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  nombreFletero: {
    flexShrink: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

  insigniaVerificado: {
    marginLeft: 5,
    flexShrink: 0,
  },

  calificacion: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },

  estrella: {
    color: '#F59E0B',
  },

  actualizacion: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 11,
  },

  botonAccion: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  separador: {
    height: 1,
    marginVertical: 12,
    backgroundColor: '#E2E8F0',
  },

  labelRuta: {
    marginBottom: 8,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },

  filaDireccion: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },

  puntoOrigen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 9,
    flexShrink: 0,
    backgroundColor: '#22C55E',
  },

  puntoDestino: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 9,
    flexShrink: 0,
    backgroundColor: '#F97316',
  },

  lineaDireccion: {
    width: 2,
    height: 9,
    marginLeft: 4,
    marginVertical: 3,
    backgroundColor: '#CBD5E1',
  },

  textoDireccion: {
    flex: 1,
    minWidth: 0,
    color: '#334155',
    fontSize: 12,
    lineHeight: 17,
  },

  botonChatGrande: {
    width: '100%',
    minHeight: 50,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
  },

  textoBotonChat: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});