import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../../lib/supabase';

const PASOS = ['Ruta', 'Carga', 'Fecha', 'Confirmar'];

const ZONAS_REFERENCIA = [
    { zona_id: 1, latitud: 20.6296, longitud: -87.0739 },
    { zona_id: 2, latitud: 20.6350, longitud: -87.0790 },
    { zona_id: 3, latitud: 20.6500, longitud: -87.0850 },
    { zona_id: 4, latitud: 20.6450, longitud: -87.0900 },
    { zona_id: 5, latitud: 20.7000, longitud: -87.1200 },
];

export default function ScreenFechaPedido() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const solicitudId = params.solicitudId;

    const [transportistaSeleccionado, setTransportistaSeleccionado] = useState(null);
    const [transportistas, setTransportistas] = useState([]);
    const [resumen, setResumen] = useState({
        origen: '',
        destino: '',
        distancia: '',
        carga: '',
        fecha: '',
        tiempoEst: '',
    });
    const [precioCalculado, setPrecioCalculado] = useState(null);
    const [tabuladorId, setTabuladorId] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const distanciaEntrePuntos = (lat1, lon1, lat2, lon2) => {
        const dLat = lat1 - lat2;
        const dLon = lon1 - lon2;
        return Math.sqrt(dLat * dLat + dLon * dLon);
    };

    const encontrarZonaMasCercana = (latitudOrigen, longitudOrigen) => {
        let zonaMasCercana = ZONAS_REFERENCIA[0];
        let menorDistancia = Infinity;

        ZONAS_REFERENCIA.forEach((zona) => {
            const distancia = distanciaEntrePuntos(
                latitudOrigen, longitudOrigen,
                zona.latitud, zona.longitud
            );
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                zonaMasCercana = zona;
            }
        });

        return zonaMasCercana.zona_id;
    };

    // Calcula el tiempo estimado de viaje basado en la distancia real
    // Asume velocidad promedio urbana de 30 km/h + 30 min de margen
    const calcularTiempoEstimado = (distanciaKm) => {
        if (!distanciaKm) return '20-30 min';

        const velocidadPromedioKmH = 30;
        const tiempoViajeMinutos = (distanciaKm / velocidadPromedioKmH) * 60;
        const tiempoMinimo = Math.round(tiempoViajeMinutos);
        const tiempoMaximo = Math.round(tiempoViajeMinutos + 30);

        return `${tiempoMinimo}-${tiempoMaximo} min`;
    };

    // Formatea la fecha de hoy en español
    const obtenerFechaHoy = () => {
        const hoy = new Date();
        const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
        return hoy.toLocaleDateString('es-MX', opciones);
    };

    useEffect(() => {
        async function cargarDatosSolicitud() {
            if (!solicitudId) {
                setCargando(false);
                return;
            }
            console.log('solicitudId recibido:', solicitudId);
            console.log('Tipo de dato:', typeof solicitudId);

            const { data: solicitud, error: errorSolicitud } = await supabase
                .from('solicitud')
                .select('*, categoria_carga(nombre), punto_ruta(*)')
                .eq('solicitud_id', solicitudId)
                .single();

            if (errorSolicitud || !solicitud) {
                console.log('Error al traer solicitud:', errorSolicitud);
                setCargando(false);
                return;
            }
            console.log('Solicitud completa:', JSON.stringify(solicitud));
            console.log('Tonelaje requerido de la solicitud cargada:', solicitud.tonelaje_requerido);

            const puntoOrigen = solicitud.punto_ruta.find((p) => p.tipo === 'origen');
            const puntoDestino = solicitud.punto_ruta.find((p) => p.tipo === 'destino');

            let tabuladorEncontrado = null;
            if (puntoOrigen) {
                const zonaDetectada = encontrarZonaMasCercana(
                    puntoOrigen.latitud,
                    puntoOrigen.longitud
                );

                const { data: tabulador, error: errorTabulador } = await supabase
                    .from('tabulador_precio')
                    .select('*')
                    .eq('zona_id', zonaDetectada)
                    .lte('tonelaje_min', solicitud.tonelaje_requerido)
                    .gte('tonelaje_max', solicitud.tonelaje_requerido)
                    .single();

                if (!errorTabulador && tabulador) {
                    tabuladorEncontrado = tabulador;
                    setPrecioCalculado(tabulador.precio_base);
                    setTabuladorId(tabulador.tabulador_id);
                }
            }

            // Armar el resumen visual con todos los datos reales
            setResumen({
                origen: puntoOrigen?.direccion_texto ?? 'Ubicación actual',
                destino: puntoDestino?.direccion_texto ?? 'No definido',
                distancia: solicitud.distancia_km ? `${solicitud.distancia_km.toFixed(1)} km` : '—',
                carga: solicitud.categoria_carga?.nombre ?? '—',
                fecha: obtenerFechaHoy(),
                tiempoEst: calcularTiempoEstimado(solicitud.distancia_km),
            });

            // Buscar fleteros REALMENTE disponibles, verificados (sin filtro de tonelaje en la query)
            const { data: fleterosTodos, error: errorFleteros } = await supabase
                .from('fletero')
                .select('*')
                .eq('disponible', true)
                .eq('verificado', true)
                .eq('activo', true);

            console.log('Fleteros sin filtro de tonelaje:', fleterosTodos);
            console.log('Error fleteros:', errorFleteros);

            const tonelajeNecesario = Number(solicitud.tonelaje_requerido);
            const fleteros = fleterosTodos?.filter((f) => Number(f.tonelaje) >= tonelajeNecesario);

            console.log('Fleteros después de filtrar tonelaje en JS:', fleteros);

            if (!errorFleteros && fleteros) {
                const fleterosFormateados = fleteros.map((f) => ({
                    id: f.fletero_id,
                    nombre: f.nombre,
                    iniciales: f.nombre.charAt(0).toUpperCase(),
                    color: '#0A2348',
                    estrellas: Math.round(f.calificacion_promedio || 0),
                    vehiculo: f.tipo_vehiculo,
                    llegaEn: calcularTiempoEstimado(solicitud.distancia_km).split('-')[0] + ' min',
                    precio: tabuladorEncontrado ? tabuladorEncontrado.precio_base : 0,
                    etiqueta: 'Precio del tabulador',
                }));
                setTransportistas(fleterosFormateados);
            }

            setCargando(false);
        }

        cargarDatosSolicitud();
    }, [solicitudId]);

    const renderEstrellas = (cantidad = 0) =>
        '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);

    const confirmarTransportista = async () => {
        if (!transportistaSeleccionado || !solicitudId) return;

        setGuardando(true);
        try {
            const { error } = await supabase
                .from('solicitud')
                .update({
                    fletero_id: transportistaSeleccionado,
                    precio_base: precioCalculado,
                    tabulador_id: tabuladorId,
                    hora_inicio: new Date().toISOString(),
                })
                .eq('solicitud_id', solicitudId);

            if (error) {
                console.log('Error al actualizar solicitud:', error);
                Alert.alert('Error', 'No se pudo asignar el transportista. Intenta de nuevo.');
                return;
            }

            router.push({
                pathname: 'Screen/Pedido/ScreenConfirmarPedido',
                params: { solicitudId },
            });

        } catch (error) {
            console.log('Error general:', error);
            Alert.alert('Error', 'Ocurrió un problema al confirmar.');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator color="#F97316" size="large" />
                <Text style={styles.textoCargando}>Buscando transportistas...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            <View style={styles.stepperRow}>
                {PASOS.map((paso, index) => {
                    const num = index + 1;
                    const activo = num === 3;
                    const completado = num < 3;
                    return (
                        <View key={paso} style={styles.stepWrapper}>
                            <TouchableOpacity
                                style={styles.stepItem}
                                onPress={() => {
                                    if (num === 1) router.push('/Screen/Home/ScreenHomeUser');
                                    if (num === 2) router.back();
                                }}
                            >
                                <View style={[
                                    styles.stepCircle,
                                    completado && styles.stepDone,
                                    activo && styles.stepActive,
                                ]}>
                                    <Text style={[styles.stepNum, (completado || activo) && styles.stepNumActive]}>
                                        {num}
                                    </Text>
                                </View>
                                <Text style={[styles.stepLabel, activo && styles.stepLabelActive]}>
                                    {paso}
                                </Text>
                            </TouchableOpacity>
                            {index < PASOS.length - 1 && (
                                <View style={[styles.lineaConector, completado && styles.lineaActiva]} />
                            )}
                        </View>
                    );
                })}
            </View>

            <Text style={styles.titulo}>Elige tu transportista</Text>
            <Text style={styles.subtitulo}>{transportistas.length} opciones disponibles</Text>

            <View style={styles.card}>
                <View style={styles.rutaRow}>
                    <View style={styles.dotVerde} />
                    <Text style={styles.rutaTexto}>{resumen.origen}</Text>
                </View>
                <View style={styles.lineaVertical} />
                <View style={styles.rutaRow}>
                    <View style={styles.dotNaranja} />
                    <Text style={styles.rutaTexto}>{resumen.destino}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Distancia</Text>
                        <Text style={styles.infoValor}>{resumen.distancia}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Carga</Text>
                        <Text style={styles.infoValor}>{resumen.carga}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Fecha</Text>
                        <Text style={styles.infoValor}>{resumen.fecha}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Tiempo est.</Text>
                        <Text style={styles.infoValor}>{resumen.tiempoEst}</Text>
                    </View>
                </View>
            </View>

            {transportistas.length === 0 && (
                <View style={styles.sinTransportistas}>
                    <Text style={styles.sinTransportistasTexto}>
                        No hay transportistas disponibles para tu zona y tonelaje en este momento.
                    </Text>
                </View>
            )}

            {transportistas.map((t) => {
                const seleccionado = transportistaSeleccionado === t.id;
                return (
                    <TouchableOpacity key={t.id} style={[styles.cardTransportista, seleccionado && styles.cardSeleccionado]}
                        onPress={() => setTransportistaSeleccionado(t.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.avatar, { backgroundColor: t.color }]}>
                            <Text style={styles.avatarText}>{t.iniciales}</Text>
                        </View>
                        <View style={styles.transportistaInfo}>
                            <Text style={styles.transportistaNombre}>{t.nombre}</Text>
                            <Text style={[styles.estrellas, { color: '#F97316' }]}>
                                {renderEstrellas(t.estrellas)}
                            </Text>
                            <Text style={styles.transportistaDetalle}>
                                {t.vehiculo} • Llega en {t.llegaEn}
                            </Text>
                        </View>
                        <View style={styles.precioBox}>
                            <Text style={styles.precio}>${t.precio}</Text>
                            <Text style={styles.etiqueta}>{t.etiqueta}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            <TouchableOpacity
                style={[styles.boton, (!transportistaSeleccionado || guardando) && styles.botonDeshabilitado]}
                onPress={confirmarTransportista}
                disabled={!transportistaSeleccionado || guardando}
                activeOpacity={0.85}
            >
                {guardando ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.botonTexto}>Confirmar transportista</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 16, paddingBottom: 32 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    textoCargando: { marginTop: 12, color: '#64748B', fontSize: 14 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    stepWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepItem: { alignItems: 'center', gap: 4 },
    lineaConector: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginBottom: 18 },
    lineaActiva: { backgroundColor: '#1E293B' },
    stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    stepDone: { backgroundColor: '#1E293B' },
    stepActive: { backgroundColor: '#F97316' },
    stepNum: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    stepNumActive: { color: '#FFFFFF' },
    stepLabel: { fontSize: 11, color: '#94A3B8' },
    stepLabelActive: { color: '#F97316', fontWeight: '600' },
    titulo: { fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
    subtitulo: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    rutaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    dotVerde: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
    dotNaranja: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316' },
    lineaVertical: { width: 2, height: 10, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 2 },
    rutaTexto: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
    separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    infoItem: { width: '45%' },
    infoLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
    infoValor: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    sinTransportistas: { backgroundColor: '#FFF4EA', borderRadius: 12, padding: 16, marginBottom: 12 },
    sinTransportistasTexto: { fontSize: 13, color: '#92400E', textAlign: 'center' },
    cardTransportista: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    cardSeleccionado: { borderColor: '#F97316' },
    avatar: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    transportistaInfo: { flex: 1 },
    transportistaNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    estrellas: { fontSize: 12, marginVertical: 2 },
    transportistaDetalle: { fontSize: 12, color: '#64748B' },
    precioBox: { alignItems: 'flex-end' },
    precio: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
    etiqueta: { fontSize: 11, color: '#64748B', marginTop: 2 },
    boton: { backgroundColor: '#0F172A', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    botonDeshabilitado: { backgroundColor: '#94A3B8' },
    botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});