import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, {
    Marker,
    PROVIDER_GOOGLE,
} from 'react-native-maps';
import * as Location from 'expo-location';
import {
    useLocalSearchParams,
    useRouter,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';

const GOOGLE_MAPS_API_KEY =
    'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

type Coordenada = {
    latitude: number;
    longitude: number;
};

type Fase = 'origen' | 'destino';

export default function ScreenMapSelectionUser() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const solicitudId = params.solicitudId;

    const [fase, setFase] = useState<Fase>('origen');
    const [origen, setOrigen] =
        useState<Coordenada | null>(null);
    const [destino, setDestino] =
        useState<Coordenada | null>(null);

    const [direccionOrigen, setDireccionOrigen] =
        useState<string>('');
    const [direccionDestino, setDireccionDestino] =
        useState<string>('');

    const [cargandoUbicacion, setCargandoUbicacion] =
        useState(true);
    const [buscandoDireccion, setBuscandoDireccion] =
        useState(false);
    const [guardando, setGuardando] =
        useState(false);

    const obtenerDireccion = async (
        coordenada: Coordenada
    ): Promise<string> => {
        try {
            const url =
                `https://maps.googleapis.com/maps/api/geocode/json` +
                `?latlng=${coordenada.latitude},${coordenada.longitude}` +
                `&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const json = await response.json();

            if (
                json.status === 'OK' &&
                json.results &&
                json.results.length > 0
            ) {
                return json.results[0].formatted_address;
            }

            return `Sin dirección (${json.status})`;
        } catch (error) {
            return 'No se pudo obtener la dirección';
        }
    };

    useEffect(() => {
        async function obtenerUbicacionActual() {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    Alert.alert(
                        'Permiso requerido',
                        'Necesitamos tu ubicación para definir el punto de origen.'
                    );

                    setCargandoUbicacion(false);
                    return;
                }

                const ubicacion =
                    await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });

                const coordenadaOrigen: Coordenada = {
                    latitude:
                        ubicacion.coords.latitude,
                    longitude:
                        ubicacion.coords.longitude,
                };

                setOrigen(coordenadaOrigen);

                const direccion =
                    await obtenerDireccion(
                        coordenadaOrigen
                    );

                setDireccionOrigen(direccion);
            } catch (error) {
                Alert.alert(
                    'Error de ubicación',
                    'No se pudo obtener tu ubicación actual.'
                );
            } finally {
                setCargandoUbicacion(false);
            }
        }

        obtenerUbicacionActual();
    }, []);

    const tocarMapa = async (
        coordenada: Coordenada
    ) => {
        if (fase === 'origen') {
            setOrigen(coordenada);

            const direccion =
                await obtenerDireccion(coordenada);

            setDireccionOrigen(direccion);
        } else {
            await seleccionarDestino(coordenada);
        }
    };

    const arrastrarOrigen = async (
        coordenada: Coordenada
    ) => {
        setOrigen(coordenada);

        const direccion =
            await obtenerDireccion(coordenada);

        setDireccionOrigen(direccion);
    };

    const confirmarOrigen = () => {
        if (!origen) {
            Alert.alert(
                'Falta tu ubicación',
                'Espera a que se detecte tu ubicación o tócala en el mapa.'
            );

            return;
        }

        setFase('destino');
    };

    const seleccionarDestino = async (
        coordenada: Coordenada
    ) => {
        setDestino(coordenada);
        setBuscandoDireccion(true);

        try {
            const direccion =
                await obtenerDireccion(coordenada);

            setDireccionDestino(direccion);
        } finally {
            setBuscandoDireccion(false);
        }
    };

    const calcularDistanciaKm = async (
        origenCoord: Coordenada,
        destinoCoord: Coordenada
    ) => {
        try {
            const url =
                `https://maps.googleapis.com/maps/api/directions/json` +
                `?origin=${origenCoord.latitude},${origenCoord.longitude}` +
                `&destination=${destinoCoord.latitude},${destinoCoord.longitude}` +
                `&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const json = await response.json();

            if (
                json.routes &&
                json.routes.length > 0
            ) {
                const metros =
                    json.routes[0].legs[0].distance.value;

                return metros / 1000;
            }

            return null;
        } catch (error) {
            return null;
        }
    };

    const confirmarRuta = async () => {
        if (!origen) {
            Alert.alert(
                'Falta tu ubicación',
                'No se pudo detectar tu ubicación de origen.'
            );

            return;
        }

        if (!destino) {
            Alert.alert(
                'Falta el destino',
                'Toca el mapa para seleccionar a dónde quieres tu entrega.'
            );

            return;
        }

        if (!solicitudId) {
            Alert.alert(
                'Error',
                'No se encontró la solicitud activa.'
            );

            return;
        }

        setGuardando(true);

        try {
            const { error: errorPuntoRuta } =
                await supabase
                    .from('punto_ruta')
                    .insert([
                        {
                            solicitud_id:
                                solicitudId,
                            tipo: 'origen',
                            latitud:
                                origen.latitude,
                            longitud:
                                origen.longitude,
                            direccion_texto:
                                direccionOrigen ||
                                'Ubicación actual',
                        },
                        {
                            solicitud_id:
                                solicitudId,
                            tipo: 'destino',
                            latitud:
                                destino.latitude,
                            longitud:
                                destino.longitude,
                            direccion_texto:
                                direccionDestino ||
                                'Sin dirección',
                        },
                    ]);

            if (errorPuntoRuta) {
                Alert.alert(
                    'Error',
                    'No se pudo guardar la ruta. Intenta de nuevo.'
                );

                return;
            }

            const distanciaCalculada =
                await calcularDistanciaKm(
                    origen,
                    destino
                );

            if (distanciaCalculada !== null) {
                await supabase
                    .from('solicitud')
                    .update({
                        distancia_km:
                            distanciaCalculada,
                    })
                    .eq(
                        'solicitud_id',
                        solicitudId
                    );
            }

            router.push({
                pathname:
                    '/Screen/Pedido/ScreenFechaPedido',
                params: {
                    solicitudId,
                },
            });
        } catch (error) {
            Alert.alert(
                'Error',
                'Ocurrió un problema al guardar la ruta.'
            );
        } finally {
            setGuardando(false);
        }
    };

    if (cargandoUbicacion) {
        return (
            <SafeAreaView
                style={styles.centrado}
                edges={['top', 'bottom']}
            >
                <ActivityIndicator
                    color="#FF7A1A"
                    size="large"
                />

                <Text style={styles.textoCargando}>
                    Obteniendo tu ubicación...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                    latitude:
                        origen?.latitude ?? 20.6296,
                    longitude:
                        origen?.longitude ?? -87.0739,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                onPress={(event) =>
                    tocarMapa(
                        event.nativeEvent.coordinate
                    )
                }
                mapPadding={{
                    top: 90 + insets.top,
                    right: 0,
                    bottom: 240 + insets.bottom,
                    left: 0,
                }}
            >
                {origen && (
                    <Marker
                        coordinate={origen}
                        title="Tu ubicación"
                        draggable={
                            fase === 'origen'
                        }
                        onDragEnd={(event) =>
                            arrastrarOrigen(
                                event.nativeEvent
                                    .coordinate
                            )
                        }
                    >
                        <View
                            style={
                                styles.markerOrigen
                            }
                        />
                    </Marker>
                )}

                {destino && (
                    <Marker
                        coordinate={destino}
                        title="Destino"
                    >
                        <View
                            style={
                                styles.markerDestino
                            }
                        />
                    </Marker>
                )}
            </MapView>

            {/* Barra superior fija */}
            <SafeAreaView
                style={styles.headerSafeArea}
                edges={['top']}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>

                    <View style={styles.headerTextos}>
                        <Text
                            style={styles.headerTitle}
                            numberOfLines={1}
                        >
                            Seleccionar ruta
                        </Text>

                        <Text
                            style={
                                styles.headerSubtitle
                            }
                            numberOfLines={1}
                        >
                            {fase === 'origen'
                                ? 'Define el punto de origen'
                                : 'Define el destino'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Tarjeta inferior protegida */}
            <SafeAreaView
                style={styles.bottomSafeArea}
                edges={['bottom']}
                pointerEvents="box-none"
            >
                <View
                    style={styles.tarjetaInferior}
                >
                    {fase === 'origen' ? (
                        <>
                            <Text
                                style={
                                    styles.instruccion
                                }
                            >
                                Confirma tu ubicación de
                                origen
                            </Text>

                            <Text
                                style={
                                    styles.subInstruccion
                                }
                            >
                                Arrastra el punto azul o
                                toca el mapa para
                                ajustarlo
                            </Text>

                            {direccionOrigen ? (
                                <Text
                                    style={
                                        styles.direccionTexto
                                    }
                                    numberOfLines={2}
                                >
                                    {direccionOrigen}
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                style={
                                    styles.botonConfirmar
                                }
                                onPress={
                                    confirmarOrigen
                                }
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={
                                        styles.textoBotonConfirmar
                                    }
                                >
                                    Confirmar origen
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text
                                style={
                                    styles.instruccion
                                }
                            >
                                {destino
                                    ? 'Destino seleccionado'
                                    : 'Toca el mapa para elegir tu destino'}
                            </Text>

                            {buscandoDireccion && (
                                <ActivityIndicator
                                    color="#FF7A1A"
                                    style={
                                        styles.indicadorDireccion
                                    }
                                />
                            )}

                            {direccionDestino &&
                                !buscandoDireccion ? (
                                <Text
                                    style={
                                        styles.direccionTexto
                                    }
                                    numberOfLines={2}
                                >
                                    {direccionDestino}
                                </Text>
                            ) : null}

                            <View
                                style={
                                    styles.filaBotones
                                }
                            >
                                <TouchableOpacity
                                    style={
                                        styles.botonVolver
                                    }
                                    onPress={() =>
                                        setFase(
                                            'origen'
                                        )
                                    }
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={
                                            styles.textoBotonVolver
                                        }
                                        numberOfLines={1}
                                    >
                                        Cambiar origen
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.botonConfirmar,
                                        styles.botonConfirmarFlex,
                                        (!destino ||
                                            guardando) &&
                                        styles.botonDeshabilitado,
                                    ]}
                                    onPress={
                                        confirmarRuta
                                    }
                                    disabled={
                                        !destino ||
                                        guardando
                                    }
                                    activeOpacity={0.8}
                                >
                                    {guardando ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                        />
                                    ) : (
                                        <Text
                                            style={
                                                styles.textoBotonConfirmar
                                            }
                                            numberOfLines={
                                                1
                                            }
                                        >
                                            Confirmar ruta
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
    },

    textoCargando: {
        marginTop: 12,
        color: '#8A8FA8',
        fontSize: 14,
        textAlign: 'center',
    },

    /* Barra superior */

    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
            'rgba(255,255,255,0.14)',
    },

    headerTextos: {
        flex: 1,
        justifyContent: 'center',
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'left',
    },

    headerSubtitle: {
        marginTop: 2,
        color: '#C7D2E0',
        fontSize: 12,
        textAlign: 'left',
    },

    /* Marcadores */

    markerOrigen: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#0A2348',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },

    markerDestino: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF7A1A',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },

    /* Zona inferior segura */

    bottomSafeArea: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        zIndex: 20,
        elevation: 20,
    },

    tarjetaInferior: {
        width: '100%',
        maxHeight: 300,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },

    instruccion: {
        marginBottom: 4,
        color: '#0A2348',
        fontSize: 15,
        fontWeight: '700',
    },

    subInstruccion: {
        marginBottom: 16,
        color: '#8A8FA8',
        fontSize: 13,
        lineHeight: 18,
    },

    direccionTexto: {
        marginBottom: 16,
        color: '#8A8FA8',
        fontSize: 13,
        lineHeight: 18,
    },

    indicadorDireccion: {
        marginVertical: 10,
    },

    botonConfirmar: {
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: '#FF7A1A',
        alignItems: 'center',
        justifyContent: 'center',
    },

    botonConfirmarFlex: {
        flex: 1,
        minWidth: 0,
    },

    botonDeshabilitado: {
        backgroundColor: '#FFD4AD',
    },

    textoBotonConfirmar: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        textAlign: 'center',
    },

    filaBotones: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
    },

    botonVolver: {
        flex: 1,
        minWidth: 0,
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: '#0A2348',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },

    textoBotonVolver: {
        color: '#0A2348',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
    },
});