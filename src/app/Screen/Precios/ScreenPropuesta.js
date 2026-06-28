import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';


const NAVY = '#1B2A4A';
const ORANGE = '#F97316';
const WHITE = '#FFFFFF';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F5F7FA';
const GREEN = '#16A34A';

// ─── TODO: Cambia esta URL por la de tu API ───────────────────────────────────
const API_URL = 'https://tu-api.com';

export default function ScreenPropuesta({ route, navigation }) {
    // TODO: Asegúrate de pasar propuestaId y fleteroId desde la pantalla anterior
    const propuestaId = route?.params?.propuestaId;
    const fleteroId = route?.params?.fleteroId;

    const [propuesta, setPropuesta] = useState(null);
    const [competidores, setCompetidores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);


    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setCargando(true);
                setError(null);

                // TODO: Ajusta los endpoints según tu backend
                const [resPropuesta, resCompetidores] = await Promise.all([
                    fetch(`${API_URL}/propuestas/${propuestaId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            // TODO: Agrega tu token de autenticación
                            // 'Authorization': `Bearer ${token}`,
                        },
                    }),
                    fetch(`${API_URL}/propuestas/${propuestaId}/competidores`, {
                        headers: {
                            'Content-Type': 'application/json',
                            // 'Authorization': `Bearer ${token}`,
                        },
                    }),
                ]);

                if (!resPropuesta.ok) throw new Error('Error al cargar propuesta');
                if (!resCompetidores.ok) throw new Error('Error al cargar competidores');

                const dataPropuesta = await resPropuesta.json();
                const dataCompetidores = await resCompetidores.json();

                // TODO: Ajusta estos campos según la respuesta real de tu API
                setPropuesta({
                    articulo: dataPropuesta.articulo,
                    ruta: dataPropuesta.ruta,
                    tiempo: dataPropuesta.tiempo_estimado,
                    vehiculo: dataPropuesta.vehiculo,
                    extras: dataPropuesta.extras,
                    mensaje: dataPropuesta.mensaje,
                    precio: dataPropuesta.precio,
                    porcentaje: dataPropuesta.porcentaje_base,
                    minutosResp: dataPropuesta.minutos_respuesta,
                });

                // TODO: El backend debe devolver lista ordenada por precio
                // Cada item: { id, esPropio, monto (null si es privado) }
                setCompetidores(dataCompetidores);

            } catch (err) {
                setError(err.message);
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [propuestaId]);

    // ── Estados de carga y error ─────────────────────────────────────────────────
    if (cargando) {
        return (
            <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>Cargando propuesta...</Text>
            </View>
        );
    }

    if (error || !propuesta) {
        return (
            <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                    No se pudo cargar la propuesta
                </Text>
                <Text style={{ fontSize: 13, color: GRAY, textAlign: 'center', marginBottom: 20 }}>
                    {error ?? 'Error desconocido'}
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
                    onPress={() => navigation?.goBack()}
                >
                    <Text style={{ color: WHITE, fontWeight: '700' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { articulo, ruta, tiempo, vehiculo, extras, mensaje, precio, porcentaje, minutosResp } = propuesta;


    return (
        <View style={s.screen}>

            <View style={s.header}>
                <View style={s.checkCircleOuter}>
                    <View style={s.checkCircleInner}>
                        <Text style={s.checkIcon}>✓</Text>
                    </View>
                </View>

                <Text style={s.headerTitle}>¡Propuesta enviada!</Text>
                <Text style={s.headerSub}>
                    El cliente verá tu oferta entre las demás y decidirá.{'\n'}
                    Te avisamos de inmediato si acepta.
                </Text>

                <View style={s.pill}>
                    <Text style={s.pillTxt}>
                        El cliente tiene hasta <Text style={s.pillNegrita}>{minutosResp} min</Text> para responder
                    </Text>
                </View>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>


                <View style={s.card}>
                    <Text style={s.seccionLabel}>TU PROPUESTA</Text>

                    <View style={s.propRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.articuloTxt}>{articulo}</Text>
                            <Text style={s.rutaTxt}>{ruta}</Text>
                        </View>
                        <View style={s.precioCol}>
                            <Text style={s.precioMonto}>${precio}</Text>
                            <Text style={s.precioSub}>MXN · {porcentaje}</Text>
                        </View>
                    </View>

                    <View style={s.tagsRow}>
                        {[tiempo, vehiculo, extras].filter(Boolean).map((tag, i) => (
                            <View key={i} style={s.tag}>
                                <Text style={s.tagTxt}>{tag}</Text>
                            </View>
                        ))}
                    </View>

                    {!!mensaje && <Text style={s.mensajeTxt}>{mensaje}</Text>}
                </View>


                <View style={s.card}>
                    <Text style={s.seccionLabel}>TU POSICIÓN ENTRE LAS PROPUESTAS</Text>

                    {competidores.map((p) => (
                        <View key={p.id} style={s.posRow}>
                            <View style={[s.numCircle, p.esPropio && s.numCircleActivo]}>
                                <Text style={[s.numTxt, p.esPropio && s.numTxtActivo]}>{p.id}</Text>
                            </View>
                            <View style={s.barraContainer}>
                                <View style={[s.barra, p.esPropio ? s.barraActiva : { width: '60%' }]} />
                            </View>
                            <Text style={[s.posLabel, p.esPropio && s.posLabelActivo]}>
                                {p.esPropio ? `Tu · $${p.monto}` : 'Otro fletero'}
                            </Text>
                        </View>
                    ))}

                    <Text style={s.privadoTxt}>Los precios de los demás son privados</Text>
                </View>

            </ScrollView>


            <View style={s.footer}>
                <TouchableOpacity
                    style={s.btnOtras}
                    onPress={() => navigation?.navigate('Solicitudes')}
                    activeOpacity={0.8}
                >
                    <Text style={s.btnOtrasTxt}>Ver otras solicitudes disponibles</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}


const s = StyleSheet.create({
    screen: { 
        flex: 1, 
        backgroundColor: BG 
    },
    header: {
        backgroundColor: NAVY,
        paddingTop: Platform.OS === 'ios' ? 60 : 36,
        paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center',
    },
    checkCircleOuter: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(22,163,74,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    checkCircleInner: {
        width: 46, 
        height: 46, 
        borderRadius: 23,
        backgroundColor: GREEN, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    checkIcon: { 
        color: WHITE, 
        fontSize: 22, 
        fontWeight: '900' 
    },
    headerTitle: { 
        color: WHITE, 
        fontSize: 22, 
        fontWeight: '800', 
        textAlign: 'center', 
        marginBottom: 8 
    },
    headerSub: { 
        color: '#CBD5E1', 
        fontSize: 13, 
        textAlign: 'center', 
        lineHeight: 19, 
        marginBottom: 16 
    },
    pill: { 
        backgroundColor: 'rgba(255,255,255,0.12)', 
        borderRadius: 20, 
        paddingHorizontal: 16, 
        paddingVertical: 8 
    },
    pillTxt: { 
        color: '#CBD5E1', 
        fontSize: 12, 
        textAlign: 'center' 
    },
    pillNegrita: { 
        color: WHITE, 
        fontWeight: '800' 
    },
    scroll: { 
        flex: 1 
    },
    scrollContent: { 
        padding: 16, 
        gap: 12, 
        paddingBottom: 24 
    },
    card: {
        backgroundColor: WHITE, 
        borderRadius: 16, 
        padding: 18,
        shadowColor: '#000', 
        shadowOpacity: 0.06, 
        shadowRadius: 8, 
        elevation: 2,
    },
    seccionLabel: { 
        fontSize: 10, 
        fontWeight: '700', 
        color: GRAY, 
        letterSpacing: 1.2, 
        marginBottom: 14 
    },
    propRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: 12 
    },
    articuloTxt: { 
        fontSize: 16, 
        fontWeight: '800', 
        color: '#111827' 
    },
    rutaTxt: { 
        fontSize: 12, 
        color: GRAY, 
        marginTop: 3 
    },
    precioCol: { 
        alignItems: 'flex-end', 
        marginLeft: 12 
    },
    precioMonto: { 
        fontSize: 24, 
        fontWeight: '900', 
        color: ORANGE 
    },
    precioSub: { 
        fontSize: 10, 
        color: GRAY, 
        marginTop: 2, 
        textAlign: 'right' 
    },
    tagsRow: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 6, 
        marginBottom: 12 
    },
    tag: { 
        borderWidth: 1, 
        borderColor: BORDER, 
        borderRadius: 20, 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        backgroundColor: BG 
    },
    tagTxt: { 
        fontSize: 12, 
        color: '#374151' 
    },
    mensajeTxt: { 
        fontSize: 13, 
        color: '#374151', 
        fontStyle: 'italic', 
        lineHeight: 18 
    },
    posRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10 
    },
    numCircle: { 
        width: 28, 
        height: 28, 
        borderRadius: 14, 
        backgroundColor: '#F3F4F6', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 10 
    },
    numCircleActivo: { 
        backgroundColor: ORANGE 
    },
    numTxt: { 
        fontSize: 12, 
        fontWeight: '700',
        color: GRAY 
    },
    numTxtActivo: { 
        color: WHITE 
    },
    barraContainer: { 
        flex: 1, 
        height: 6, 
        backgroundColor: '#F3F4F6', 
        borderRadius: 3, 
        marginRight: 10 
    },
    barra: { 
        height: 6, 
        borderRadius: 3, 
        backgroundColor: '#E5E7EB' 
    },
    barraActiva: { 
        width: '80%', 
        backgroundColor: ORANGE 
    },
    posLabel: { 
        fontSize: 12, 
        color: GRAY, 
        minWidth: 80, 
        textAlign: 'right' 
    },
    posLabelActivo: { 
        color: ORANGE, 
        fontWeight: '700' 
    },
    privadoTxt: { 
        fontSize: 11, 
        color: '#9CA3AF', 
        textAlign: 'center', 
        marginTop: 6 
    },
    footer: { 
        backgroundColor: WHITE, 
        padding: 16, 
        paddingBottom: Platform.OS === 'ios' ? 32 : 16, 
        borderTopWidth: 1, 
        borderTopColor: BORDER 
    },
    btnOtras: { 
        borderWidth: 1.5, 
        borderColor: '#111827', 
        borderRadius: 14, 
        paddingVertical: 15, 
        alignItems: 'center' 
    },
    btnOtrasTxt: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#111827' },
});