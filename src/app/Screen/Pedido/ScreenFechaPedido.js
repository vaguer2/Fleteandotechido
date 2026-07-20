import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';

const PASOS = ['Carga', 'Ruta', 'Fecha', 'Confirmar'];

const ZONAS_REFERENCIA = [
    {
        zona_id: 1,
        latitud: 20.6296,
        longitud: -87.0739,
    },
    {
        zona_id: 2,
        latitud: 20.635,
        longitud: -87.079,
    },
    {
        zona_id: 3,
        latitud: 20.65,
        longitud: -87.085,
    },
    {
        zona_id: 4,
        latitud: 20.645,
        longitud: -87.09,
    },
    {
        zona_id: 5,
        latitud: 20.7,
        longitud: -87.12,
    },
];

export default function ScreenFechaPedido() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const solicitudId = params.solicitudId;

    const [resumen, setResumen] = useState({
        origen: '',
        destino: '',
        distancia: '',
        carga: '',
        fecha: '',
        tiempoEst: '',
    });

    const [precioCalculado, setPrecioCalculado] =
        useState(null);

    const [depositoCalculado, setDepositoCalculado] =
        useState(null);

    const [tabuladorId, setTabuladorId] =
        useState(null);

    const [cargando, setCargando] =
        useState(true);

    const [sinTabulador, setSinTabulador] =
        useState(false);

    const distanciaEntrePuntos = (
        lat1,
        lon1,
        lat2,
        lon2
    ) => {
        const dLat = lat1 - lat2;
        const dLon = lon1 - lon2;

        return Math.sqrt(
            dLat * dLat + dLon * dLon
        );
    };

    const encontrarZonaMasCercana = (
        latitudOrigen,
        longitudOrigen
    ) => {
        let zonaMasCercana =
            ZONAS_REFERENCIA[0];

        let menorDistancia = Infinity;

        ZONAS_REFERENCIA.forEach((zona) => {
            const distancia =
                distanciaEntrePuntos(
                    latitudOrigen,
                    longitudOrigen,
                    zona.latitud,
                    zona.longitud
                );

            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                zonaMasCercana = zona;
            }
        });

        return zonaMasCercana.zona_id;
    };

    const calcularTiempoEstimado = (
        distanciaKm
    ) => {
        if (!distanciaKm) {
            return '20-30 min';
        }

        const velocidadPromedioKmH = 30;

        const tiempoViajeMinutos =
            (distanciaKm /
                velocidadPromedioKmH) *
            60;

        const tiempoMinimo = Math.round(
            tiempoViajeMinutos
        );

        const tiempoMaximo = Math.round(
            tiempoViajeMinutos + 30
        );

        return `${tiempoMinimo}-${tiempoMaximo} min`;
    };

    const obtenerFechaHoy = () => {
        const hoy = new Date();

        const opciones = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        };

        return hoy.toLocaleDateString(
            'es-MX',
            opciones
        );
    };

    useEffect(() => {
        async function cargarDatosSolicitud() {
            if (!solicitudId) {
                setCargando(false);
                return;
            }

            try {
                const {
                    data: solicitud,
                    error: errorSolicitud,
                } = await supabase
                    .from('solicitud')
                    .select(
                        '*, categoria_carga(nombre), punto_ruta(*)'
                    )
                    .eq(
                        'solicitud_id',
                        solicitudId
                    )
                    .single();

                if (
                    errorSolicitud ||
                    !solicitud
                ) {
                    console.log(
                        'Error al traer solicitud:',
                        errorSolicitud
                    );

                    return;
                }

                const puntoOrigen =
                    solicitud.punto_ruta?.find(
                        (punto) =>
                            punto.tipo ===
                            'origen'
                    );

                const puntoDestino =
                    solicitud.punto_ruta?.find(
                        (punto) =>
                            punto.tipo ===
                            'destino'
                    );

                if (puntoOrigen) {
                    const zonaDetectada =
                        encontrarZonaMasCercana(
                            puntoOrigen.latitud,
                            puntoOrigen.longitud
                        );

                    const {
                        data: tabulador,
                        error: errorTabulador,
                    } = await supabase
                        .from(
                            'tabulador_precio'
                        )
                        .select('*')
                        .eq(
                            'zona_id',
                            zonaDetectada
                        )
                        .lte(
                            'tonelaje_min',
                            solicitud.tonelaje_requerido
                        )
                        .gt(
                            'tonelaje_max',
                            solicitud.tonelaje_requerido
                        )
                        .single();

                    if (
                        !errorTabulador &&
                        tabulador
                    ) {
                        setPrecioCalculado(
                            tabulador.precio_base
                        );

                        setDepositoCalculado(
                            Math.round(
                                tabulador.precio_base *
                                0.25
                            )
                        );

                        setTabuladorId(
                            tabulador.tabulador_id
                        );

                        setSinTabulador(false);
                    } else {
                        setSinTabulador(true);
                    }
                }

                setResumen({
                    origen:
                        puntoOrigen?.direccion_texto ??
                        'Ubicación actual',

                    destino:
                        puntoDestino?.direccion_texto ??
                        'No definido',

                    distancia:
                        solicitud.distancia_km
                            ? `${solicitud.distancia_km.toFixed(
                                1
                            )} km`
                            : '—',

                    carga:
                        solicitud
                            .categoria_carga
                            ?.nombre ?? '—',

                    fecha:
                        obtenerFechaHoy(),

                    tiempoEst:
                        calcularTiempoEstimado(
                            solicitud.distancia_km
                        ),
                });
            } catch (error) {
                console.log(
                    'Error al cargar cotización:',
                    error
                );
            } finally {
                setCargando(false);
            }
        }

        cargarDatosSolicitud();
    }, [solicitudId]);

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
                    style={
                        styles.textoCargando
                    }
                >
                    Calculando tu cotización...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.screen}>
            {/* Barra superior fija */}
            <SafeAreaView
                style={styles.headerSafeArea}
                edges={['top']}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() =>
                            router.back()
                        }
                        style={styles.backBtn}
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
                            style={
                                styles.headerTitle
                            }
                            numberOfLines={1}
                        >
                            Regresar
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Contenido desplazable */}
            <SafeAreaView
                style={styles.contentSafeArea}
                edges={['bottom']}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={
                        styles.content
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Stepper */}
                    <View
                        style={
                            styles.stepperRow
                        }
                    >
                        {PASOS.map(
                            (paso, index) => {
                                const num =
                                    index + 1;

                                const activo =
                                    num === 3;

                                const completado =
                                    num < 3;

                                return (
                                    <View
                                        key={paso}
                                        style={
                                            styles.stepWrapper
                                        }
                                    >
                                        <TouchableOpacity
                                            style={
                                                styles.stepItem
                                            }
                                            activeOpacity={
                                                num <= 2
                                                    ? 0.7
                                                    : 1
                                            }
                                            disabled={
                                                num > 2
                                            }
                                            onPress={() => {
                                                if (
                                                    num ===
                                                    1
                                                ) {
                                                    router.push(
                                                        '/Screen/Home/ScreenHomeUser'
                                                    );
                                                }

                                                if (
                                                    num ===
                                                    2
                                                ) {
                                                    router.back();
                                                }
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.stepCircle,

                                                    completado &&
                                                    styles.stepDone,

                                                    activo &&
                                                    styles.stepActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.stepNum,

                                                        (completado ||
                                                            activo) &&
                                                        styles.stepNumActive,
                                                    ]}
                                                >
                                                    {
                                                        num
                                                    }
                                                </Text>
                                            </View>

                                            <Text
                                                style={[
                                                    styles.stepLabel,

                                                    activo &&
                                                    styles.stepLabelActive,
                                                ]}
                                                numberOfLines={
                                                    1
                                                }
                                            >
                                                {
                                                    paso
                                                }
                                            </Text>
                                        </TouchableOpacity>

                                        {index <
                                            PASOS.length -
                                            1 && (
                                                <View
                                                    style={[
                                                        styles.lineaConector,

                                                        completado &&
                                                        styles.lineaActiva,
                                                    ]}
                                                />
                                            )}
                                    </View>
                                );
                            }
                        )}
                    </View>

                    <Text style={styles.titulo}>
                        Cotización de tu flete
                    </Text>

                    <Text
                        style={styles.subtitulo}
                    >
                        Precio calculado según tu
                        zona y tonelaje
                    </Text>

                    {/* Resumen de la ruta */}
                    <View style={styles.card}>
                        <View
                            style={styles.rutaRow}
                        >
                            <View
                                style={
                                    styles.dotVerde
                                }
                            />

                            <Text
                                style={
                                    styles.rutaTexto
                                }
                                numberOfLines={2}
                            >
                                {resumen.origen}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.lineaVertical
                            }
                        />

                        <View
                            style={styles.rutaRow}
                        >
                            <View
                                style={
                                    styles.dotNaranja
                                }
                            />

                            <Text
                                style={
                                    styles.rutaTexto
                                }
                                numberOfLines={2}
                            >
                                {resumen.destino}
                            </Text>
                        </View>

                        <View
                            style={styles.separator}
                        />

                        <View
                            style={styles.infoGrid}
                        >
                            <View
                                style={
                                    styles.infoItem
                                }
                            >
                                <Text
                                    style={
                                        styles.infoLabel
                                    }
                                >
                                    Distancia
                                </Text>

                                <Text
                                    style={
                                        styles.infoValor
                                    }
                                    numberOfLines={2}
                                >
                                    {
                                        resumen.distancia
                                    }
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.infoItem
                                }
                            >
                                <Text
                                    style={
                                        styles.infoLabel
                                    }
                                >
                                    Carga
                                </Text>

                                <Text
                                    style={
                                        styles.infoValor
                                    }
                                    numberOfLines={2}
                                >
                                    {resumen.carga}
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.infoItem
                                }
                            >
                                <Text
                                    style={
                                        styles.infoLabel
                                    }
                                >
                                    Fecha
                                </Text>

                                <Text
                                    style={
                                        styles.infoValor
                                    }
                                    numberOfLines={3}
                                >
                                    {resumen.fecha}
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.infoItem
                                }
                            >
                                <Text
                                    style={
                                        styles.infoLabel
                                    }
                                >
                                    Tiempo est.
                                </Text>

                                <Text
                                    style={
                                        styles.infoValor
                                    }
                                    numberOfLines={2}
                                >
                                    {
                                        resumen.tiempoEst
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {sinTabulador ? (
                        <View
                            style={
                                styles.sinTransportistas
                            }
                        >
                            <Text
                                style={
                                    styles.sinTransportistasTexto
                                }
                            >
                                No hay tarifa
                                configurada para tu
                                zona y tonelaje.
                                Contacta a soporte.
                            </Text>
                        </View>
                    ) : (
                        <View
                            style={
                                styles.cardPrecio
                            }
                        >
                            <Text
                                style={
                                    styles.labelPrecio
                                }
                            >
                                Precio base
                                (tabulador)
                            </Text>

                            <Text
                                style={
                                    styles.montoPrecio
                                }
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                minimumFontScale={0.75}
                            >
                                $
                                {precioCalculado?.toLocaleString(
                                    'es-MX'
                                )}{' '}
                                MXN
                            </Text>

                            <View
                                style={
                                    styles.separatorPrecio
                                }
                            />

                            <View
                                style={
                                    styles.filaDeposito
                                }
                            >
                                <Text
                                    style={
                                        styles.labelDeposito
                                    }
                                >
                                    Depósito previo
                                    (25%)
                                </Text>

                                <Text
                                    style={
                                        styles.montoDeposito
                                    }
                                    numberOfLines={1}
                                >
                                    $
                                    {depositoCalculado?.toLocaleString(
                                        'es-MX'
                                    )}{' '}
                                    MXN
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.notaDeposito
                                }
                            >
                                En el siguiente paso
                                podrás ajustar tu
                                oferta hasta un 15%
                                por encima o por
                                debajo de este precio.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.boton,

                            (!precioCalculado ||
                                sinTabulador) &&
                            styles.botonDeshabilitado,
                        ]}
                        onPress={() =>
                            router.push({
                                pathname:
                                    '/Screen/Precios/ScreenPrecioCliente',

                                params: {
                                    solicitudId,
                                    precioBase:
                                        precioCalculado,
                                    tabuladorId,
                                },
                            })
                        }
                        disabled={
                            !precioCalculado ||
                            sinTabulador
                        }
                        activeOpacity={0.85}
                    >
                        <Text
                            style={
                                styles.botonTexto
                            }
                        >
                            Continuar
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    /* Barra superior */

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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
            'rgba(255,255,255,0.14)',
    },

    headerTextContainer: {
        flex: 1,
        minWidth: 0,
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'left',
    },

    /* Contenido seguro */

    contentSafeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    content: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 22,
        paddingBottom: 32,
    },

    centrado: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#F8FAFC',
    },

    textoCargando: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
        textAlign: 'center',
    },

    /* Stepper */

    stepperRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },

    stepWrapper: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    stepItem: {
        alignItems: 'center',
        minWidth: 42,
    },

    lineaConector: {
        flex: 1,
        minWidth: 4,
        height: 2,
        marginTop: 15,
        backgroundColor: '#E2E8F0',
    },

    lineaActiva: {
        backgroundColor: '#1E293B',
    },

    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
    },

    stepDone: {
        backgroundColor: '#1E293B',
    },

    stepActive: {
        backgroundColor: '#F97316',
    },

    stepNum: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600',
    },

    stepNumActive: {
        color: '#FFFFFF',
    },

    stepLabel: {
        maxWidth: 62,
        marginTop: 4,
        color: '#94A3B8',
        fontSize: 10,
        textAlign: 'center',
    },

    stepLabelActive: {
        color: '#F97316',
        fontWeight: '600',
    },

    titulo: {
        marginBottom: 4,
        color: '#0F172A',
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },

    subtitulo: {
        marginBottom: 16,
        paddingHorizontal: 10,
        color: '#64748B',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },

    /* Tarjeta de ruta */

    card: {
        width: '100%',
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',

        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        elevation: 2,
    },

    rutaRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    dotVerde: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
        marginRight: 8,
        flexShrink: 0,
        backgroundColor: '#22C55E',
    },

    dotNaranja: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
        marginRight: 8,
        flexShrink: 0,
        backgroundColor: '#F97316',
    },

    lineaVertical: {
        width: 2,
        height: 12,
        marginLeft: 4,
        marginVertical: 2,
        backgroundColor: '#E2E8F0',
    },

    rutaTexto: {
        flex: 1,
        minWidth: 0,
        color: '#0F172A',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
    },

    separator: {
        height: 1,
        marginVertical: 12,
        backgroundColor: '#F1F5F9',
    },

    infoGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 14,
    },

    infoItem: {
        width: '48%',
        minWidth: 0,
    },

    infoLabel: {
        marginBottom: 2,
        color: '#94A3B8',
        fontSize: 11,
    },

    infoValor: {
        color: '#0F172A',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '600',
    },

    /* Sin tarifa */

    sinTransportistas: {
        width: '100%',
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FFF4EA',
    },

    sinTransportistasTexto: {
        color: '#92400E',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },

    /* Tarjeta de precio */

    cardPrecio: {
        width: '100%',
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        backgroundColor: '#0F172A',
    },

    labelPrecio: {
        marginBottom: 4,
        color: '#94A3B8',
        fontSize: 13,
    },

    montoPrecio: {
        width: '100%',
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
    },

    separatorPrecio: {
        height: 1,
        marginVertical: 12,
        backgroundColor:
            'rgba(255,255,255,0.10)',
    },

    filaDeposito: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },

    labelDeposito: {
        flexShrink: 1,
        color: '#CBD5E1',
        fontSize: 13,
    },

    montoDeposito: {
        color: '#F97316',
        fontSize: 16,
        fontWeight: '700',
    },

    notaDeposito: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 16,
    },

    /* Botón final */

    boton: {
        width: '100%',
        minHeight: 52,
        marginTop: 8,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
    },

    botonDeshabilitado: {
        backgroundColor: '#94A3B8',
    },

    botonTexto: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});