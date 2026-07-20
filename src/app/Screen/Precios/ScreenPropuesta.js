import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const NAVY = '#1B2A4A';
const ORANGE = '#F97316';
const WHITE = '#FFFFFF';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F5F7FA';
const GREEN = '#16A34A';

export default function ScreenPropuesta() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { usuario } = useAuth();

    const propuestaId = params.propuestaId;
    const solicitudId = params.solicitudId;

    const [propuesta, setPropuesta] = useState(null);
    const [solicitud, setSolicitud] = useState(null);
    const [competidores, setCompetidores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function cargarDatos() {
            try {
                setCargando(true);
                setError(null);

                if (!propuestaId || !solicitudId) {
                    throw new Error('Faltan datos de la propuesta.');
                }

                // 1. Traer la propuesta propia
                const { data: dataPropuesta, error: errorPropuesta } = await supabase
                    .from('propuesta')
                    .select('*')
                    .eq('propuesta_id', propuestaId)
                    .single();

                if (errorPropuesta || !dataPropuesta) throw new Error('No se pudo cargar tu propuesta.');

                // 2. Traer la solicitud con su ruta, para mostrar contexto (artículo/ruta)
                const { data: dataSolicitud, error: errorSolicitud } = await supabase
                    .from('solicitud')
                    .select('*, categoria_carga(nombre), punto_ruta(*)')
                    .eq('solicitud_id', solicitudId)
                    .single();

                if (errorSolicitud || !dataSolicitud) throw new Error('No se pudo cargar la solicitud.');

                // 3. Traer TODAS las propuestas activas de esa solicitud (para la posición)
                const { data: dataTodas, error: errorTodas } = await supabase
                    .from('propuesta')
                    .select('*')
                    .eq('solicitud_id', solicitudId)
                    .eq('estado', 'pendiente')
                    .order('precio', { ascending: true });

                if (errorTodas) throw new Error('No se pudieron cargar las propuestas.');

                setPropuesta(dataPropuesta);
                setSolicitud(dataSolicitud);
                setCompetidores(dataTodas ?? []);

            } catch (err) {
                setError(err.message);
            } finally {
                setCargando(false);
            }
        }

        cargarDatos();
    }, [propuestaId, solicitudId]);

    if (cargando) {
        return (
            <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>Cargando propuesta...</Text>
            </View>
        );
    }

    if (error || !propuesta || !solicitud) {
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
                    onPress={() => router.back()}
                >
                    <Text style={{ color: WHITE, fontWeight: '700' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const puntoOrigen = solicitud.punto_ruta?.find((p) => p.tipo === 'origen');
    const puntoDestino = solicitud.punto_ruta?.find((p) => p.tipo === 'destino');
    const rutaTexto = `${puntoOrigen?.direccion_texto ?? 'Origen'} → ${puntoDestino?.direccion_texto ?? 'Destino'}`;
    const articuloTexto = solicitud.categoria_carga?.nombre ?? solicitud.descripcion_carga ?? 'Carga';

    // El precio máximo entre competidores se usa como referencia visual de la barra
    const precioMaxCompetidores = Math.max(...competidores.map((c) => Number(c.precio)), 1);

    // Tiempo límite de respuesta (informativo, no hay columna real para esto en la BD aún)
    const minutosResp = 30;

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
                            <Text style={s.articuloTxt}>{articuloTexto}</Text>
                            <Text style={s.rutaTxt} numberOfLines={2}>{rutaTexto}</Text>
                        </View>
                        <View style={s.precioCol}>
                            <Text style={s.precioMonto}>${propuesta.precio}</Text>
                            <Text style={s.precioSub}>
                                MXN · {solicitud.precio_base
                                    ? `${(((propuesta.precio - solicitud.precio_base) / solicitud.precio_base) * 100).toFixed(0)}%`
                                    : '—'}
                            </Text>
                        </View>
                    </View>

                    <View style={s.tagsRow}>
                        {[propuesta.tiempo_estimado, `${solicitud.tonelaje_requerido} ton`].filter(Boolean).map((tag, i) => (
                            <View key={i} style={s.tag}>
                                <Text style={s.tagTxt}>{tag}</Text>
                            </View>
                        ))}
                    </View>

                    {!!propuesta.mensaje && <Text style={s.mensajeTxt}>{propuesta.mensaje}</Text>}
                </View>

                <View style={s.card}>
                    <Text style={s.seccionLabel}>TU POSICIÓN ENTRE LAS PROPUESTAS</Text>

                    {competidores.map((p, index) => {
                        const esPropio = p.propuesta_id === propuesta.propuesta_id;
                        const anchoBarra = `${(Number(p.precio) / precioMaxCompetidores) * 100}%`;

                        return (
                            <View key={p.propuesta_id} style={s.posRow}>
                                <View style={[s.numCircle, esPropio && s.numCircleActivo]}>
                                    <Text style={[s.numTxt, esPropio && s.numTxtActivo]}>{index + 1}</Text>
                                </View>
                                <View style={s.barraContainer}>
                                    <View style={[s.barra, esPropio && s.barraActiva, { width: anchoBarra }]} />
                                </View>
                                <Text style={[s.posLabel, esPropio && s.posLabelActivo]}>
                                    {esPropio ? `Tu · $${p.precio}` : 'Otro fletero'}
                                </Text>
                            </View>
                        );
                    })}

                    <Text style={s.privadoTxt}>Los precios de los demás son privados</Text>
                </View>

            </ScrollView>

            <View style={s.footer}>
                <TouchableOpacity
                    style={s.btnOtras}
                    onPress={() => router.push('/Screen/Home/ScreenHomeFletero')}
                    activeOpacity={0.8}
                >
                    <Text style={s.btnOtrasTxt}>Ver otras solicitudes disponibles</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG },
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
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    },
    checkIcon: { color: WHITE, fontSize: 22, fontWeight: '900' },
    headerTitle: { color: WHITE, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    headerSub: { color: '#CBD5E1', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
    pill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    pillTxt: { color: '#CBD5E1', fontSize: 12, textAlign: 'center' },
    pillNegrita: { color: WHITE, fontWeight: '800' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
    card: {
        backgroundColor: WHITE, borderRadius: 16, padding: 18,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    seccionLabel: { fontSize: 10, fontWeight: '700', color: GRAY, letterSpacing: 1.2, marginBottom: 14 },
    propRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    articuloTxt: { fontSize: 16, fontWeight: '800', color: '#111827' },
    rutaTxt: { fontSize: 12, color: GRAY, marginTop: 3 },
    precioCol: { alignItems: 'flex-end', marginLeft: 12 },
    precioMonto: { fontSize: 24, fontWeight: '900', color: ORANGE },
    precioSub: { fontSize: 10, color: GRAY, marginTop: 2, textAlign: 'right' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: BG },
    tagTxt: { fontSize: 12, color: '#374151' },
    mensajeTxt: { fontSize: 13, color: '#374151', fontStyle: 'italic', lineHeight: 18 },
    posRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    numCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    numCircleActivo: { backgroundColor: ORANGE },
    numTxt: { fontSize: 12, fontWeight: '700', color: GRAY },
    numTxtActivo: { color: WHITE },
    barraContainer: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginRight: 10 },
    barra: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
    barraActiva: { backgroundColor: ORANGE },
    posLabel: { fontSize: 12, color: GRAY, minWidth: 80, textAlign: 'right' },
    posLabelActivo: { color: ORANGE, fontWeight: '700' },
    privadoTxt: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
    footer: { backgroundColor: WHITE, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: BORDER },
    btnOtras: { borderWidth: 1.5, borderColor: '#111827', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    btnOtrasTxt: { fontSize: 15, fontWeight: '700', color: '#111827' },
});