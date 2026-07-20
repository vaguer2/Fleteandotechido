import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import {
    useLocalSearchParams,
    useRouter,
} from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';

const NAVY = '#1B2A4A';
const NAVY_DARK = '#071B33';
const ORANGE = '#F97316';
const ORANGE_LIGHT = '#FFF0E6';
const BORDER = '#E5E7EB';
const GRAY = '#6B7280';
const WHITE = '#FFFFFF';
const BG = '#F5F7FA';

const MARGEN = 0.15;

export default function ScreenPrecioCliente() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const solicitudId = params.solicitudId;
    const precioBase =
        Number(params.precioBase) || 1000;

    const minPrecio = Math.round(
        precioBase * (1 - MARGEN)
    );

    const maxPrecio = Math.round(
        precioBase * (1 + MARGEN)
    );

    const [precio, setPrecio] =
        useState(precioBase);

    const [guardando, setGuardando] =
        useState(false);

    const porcentaje =
        ((precio - precioBase) /
            precioBase) *
        100;

    const signo =
        porcentaje >= 0 ? '+' : '';

    const confirmarPrecio = async () => {
        if (!solicitudId) {
            Alert.alert(
                'Error',
                'No se encontró la solicitud.'
            );

            return;
        }

        setGuardando(true);

        try {
            const { error } = await supabase
                .from('solicitud')
                .update({
                    precio_ajustado: precio,
                })
                .eq(
                    'solicitud_id',
                    solicitudId
                );

            if (error) {
                console.log(
                    'Error al guardar precio:',
                    error
                );

                Alert.alert(
                    'Error',
                    'No se pudo guardar tu precio. Intenta de nuevo.'
                );

                return;
            }

            router.push({
                pathname:
                    '/Screen/Pedido/ScreenConfirmarPedido',
                params: {
                    solicitudId,
                },
            });
        } catch (err) {
            console.log(
                'Error general:',
                err
            );

            Alert.alert(
                'Error',
                'Ocurrió un problema al guardar tu precio.'
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <View style={s.screen}>
            {/* Barra superior fija */}
            <SafeAreaView
                style={s.headerSafeArea}
                edges={['top']}
            >
                <View style={s.header}>
                    <TouchableOpacity
                        onPress={() =>
                            router.back()
                        }
                        style={s.backBtn}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={WHITE}
                        />
                    </TouchableOpacity>

                    <Text
                        style={s.headerTitle}
                        numberOfLines={1}
                    >
                        Ajustar oferta
                    </Text>
                </View>
            </SafeAreaView>

            {/* Contenido desplazable */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingBottom:
                            120 +
                            insets.bottom,
                    },
                ]}
                showsVerticalScrollIndicator={
                    false
                }
            >
                <View style={s.intro}>
                    <Text style={s.mainTitle}>
                        ¿Cuánto quieres pagar?
                    </Text>

                    <Text style={s.mainSubtitle}>
                        Ajusta tu oferta dentro del
                        margen permitido.
                    </Text>
                </View>

                <View style={s.card}>
                    <Text style={s.cardTitle}>
                        Ajusta tu oferta
                    </Text>

                    <Text style={s.cardSub}>
                        Puedes ofrecer hasta 15%
                        más o menos del precio base.
                    </Text>

                    <View style={s.baseRow}>
                        <Text
                            style={s.baseLabel}
                        >
                            Precio base
                            (tabulador)
                        </Text>

                        <Text
                            style={s.baseValor}
                            numberOfLines={1}
                        >
                            ${precioBase} MXN
                        </Text>
                    </View>

                    <View
                        style={s.limitsRow}
                    >
                        <Text
                            style={s.limitTxt}
                        >
                            Mínimo: ${minPrecio}
                        </Text>

                        <Text
                            style={s.limitTxt}
                        >
                            Máximo: ${maxPrecio}
                        </Text>
                    </View>

                    <Slider
                        style={s.slider}
                        minimumValue={
                            minPrecio
                        }
                        maximumValue={
                            maxPrecio
                        }
                        step={1}
                        value={precio}
                        onValueChange={(value) =>
                            setPrecio(
                                Math.round(value)
                            )
                        }
                        minimumTrackTintColor={
                            ORANGE
                        }
                        maximumTrackTintColor={
                            BORDER
                        }
                        thumbTintColor={
                            ORANGE
                        }
                    />

                    <View
                        style={s.propuestaBox}
                    >
                        <Text
                            style={
                                s.propuestaLabel
                            }
                        >
                            Tu oferta
                        </Text>

                        <Text
                            style={
                                s.propuestaMonto
                            }
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            minimumFontScale={0.75}
                        >
                            ${precio} MXN
                        </Text>

                        <Text
                            style={
                                s.propuestaDelta
                            }
                        >
                            {signo}
                            {porcentaje.toFixed(
                                1
                            )}
                            % sobre el precio base
                        </Text>
                    </View>
                </View>

                <View style={s.infoCard}>
                    <Text style={s.infoTexto}>
                        Los fleteros disponibles
                        verán tu oferta y podrán
                        aceptarla. Ofrecer un precio
                        más alto puede ayudarte a
                        encontrar fletero más rápido.
                    </Text>
                </View>
            </ScrollView>

            {/* Pie fijo y protegido */}
            <SafeAreaView
                style={s.footerSafeArea}
                edges={['bottom']}
            >
                <View style={s.footer}>
                    <TouchableOpacity
                        style={[
                            s.btnEnviar,
                            guardando &&
                            s.btnDisabled,
                        ]}
                        onPress={
                            confirmarPrecio
                        }
                        activeOpacity={0.85}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator
                                color={WHITE}
                            />
                        ) : (
                            <Text
                                style={
                                    s.btnEnviarTxt
                                }
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={
                                    0.8
                                }
                            >
                                Continuar con $
                                {precio} MXN
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: BG,
    },

    /* Barra superior */

    headerSafeArea: {
        backgroundColor: NAVY_DARK,
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
        backgroundColor: NAVY_DARK,

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

    headerTitle: {
        flex: 1,
        color: WHITE,
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'left',
    },

    /* Contenido */

    scroll: {
        flex: 1,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 22,
        gap: 12,
    },

    intro: {
        width: '100%',
        paddingHorizontal: 4,
        marginBottom: 4,
    },

    mainTitle: {
        color: NAVY,
        fontSize: 24,
        lineHeight: 31,
        fontWeight: '800',
    },

    mainSubtitle: {
        marginTop: 4,
        color: GRAY,
        fontSize: 14,
        lineHeight: 20,
    },

    /* Tarjeta principal */

    card: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        backgroundColor: WHITE,

        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        elevation: 2,
    },

    cardTitle: {
        color: '#111827',
        fontSize: 17,
        fontWeight: '800',
    },

    cardSub: {
        marginTop: 3,
        marginBottom: 14,
        color: GRAY,
        fontSize: 13,
        lineHeight: 19,
    },

    baseRow: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent:
            'space-between',
        alignItems: 'center',
        gap: 8,
    },

    baseLabel: {
        flexShrink: 1,
        color: GRAY,
        fontSize: 13,
    },

    baseValor: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },

    limitsRow: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent:
            'space-between',
        gap: 8,
        marginTop: 8,
    },

    limitTxt: {
        color: GRAY,
        fontSize: 12,
    },

    slider: {
        width: '100%',
        height: 44,
        marginVertical: 6,
    },

    propuestaBox: {
        width: '100%',
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor:
            ORANGE_LIGHT,
    },

    propuestaLabel: {
        color: ORANGE,
        fontSize: 13,
        fontWeight: '600',
    },

    propuestaMonto: {
        width: '100%',
        marginVertical: 4,
        color: ORANGE,
        fontSize: 34,
        fontWeight: '900',
        textAlign: 'center',
    },

    propuestaDelta: {
        color: '#D97706',
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
    },

    infoCard: {
        width: '100%',
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
    },

    infoTexto: {
        color: '#1E40AF',
        fontSize: 12,
        lineHeight: 18,
    },

    /* Pie inferior */

    footerSafeArea: {
        backgroundColor: WHITE,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },

    footer: {
        width: '100%',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: WHITE,

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8,
    },

    btnEnviar: {
        width: '100%',
        minHeight: 52,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ORANGE,

        shadowColor: ORANGE,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 4,
    },

    btnDisabled: {
        opacity: 0.65,
    },

    btnEnviarTxt: {
        width: '100%',
        color: WHITE,
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
    },
});