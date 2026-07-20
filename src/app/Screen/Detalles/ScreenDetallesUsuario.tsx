import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

type EstadoSolicitud = 'borrador' | 'publicada' | 'en_negociacion' | 'aceptada' | 'en_progreso' | 'completada' | 'cancelada';
type EstadoVisual = { label: string; fondo: string; texto: string };
type CategoriaCarga = { nombre: string };
type PuntoRuta = { tipo: string; direccion_texto: string };
type Cargamento = { cargamento_id: number; foto_url: string };

type FleteroDetalle = {
    nombre: string;
    telefono: string | null;
    tipo_vehiculo: string | null;
    placa_vehiculo: string | null;
    foto_url: string | null;
    foto_vehiculo_url: string | null;
    calificacion_promedio: number | string | null;
};

type CalificacionDetalle = {
    estrellas_al_fletero: number | null;
    comentario_al_fletero: string | null;
};

type SolicitudDetalle = {
    solicitud_id: number;
    usuario_id: string;
    fletero_id: string | null;
    tonelaje_requerido: number | string;
    descripcion_carga: string | null;
    precio_base: number | string | null;
    precio_ajustado: number | string | null;
    precio_final: number | string | null;
    deposito_requerido: number | string | null;
    deposito_pagado: boolean;
    distancia_km: number | null;
    estado: EstadoSolicitud;
    hora_inicio: string | null;
    hora_fin: string | null;
    creado_en: string;
    categoria_carga: CategoriaCarga | CategoriaCarga[] | null;
    punto_ruta: PuntoRuta[] | null;
    cargamento: Cargamento[] | null;
    fletero: FleteroDetalle | FleteroDetalle[] | null;
    calificacion: CalificacionDetalle | CalificacionDetalle[] | null;
};

const ESTADOS: Record<EstadoSolicitud, EstadoVisual> = {
    borrador: { label: 'Borrador', fondo: '#F1F5F9', texto: '#475569' },
    publicada: { label: 'Buscando fletero', fondo: '#FFF7ED', texto: '#C2410C' },
    en_negociacion: { label: 'En negociación', fondo: '#FEF3C7', texto: '#92400E' },
    aceptada: { label: 'Fletero asignado', fondo: '#FEF9C3', texto: '#854D0E' },
    en_progreso: { label: 'Flete en progreso', fondo: '#DBEAFE', texto: '#1D4ED8' },
    completada: { label: 'Entregado', fondo: '#DCFCE7', texto: '#166534' },
    cancelada: { label: 'Cancelado', fondo: '#FEE2E2', texto: '#B91C1C' },
};

const obtenerRelacion = <T,>(relacion: T | T[] | null | undefined): T | null =>
    Array.isArray(relacion) ? relacion[0] ?? null : relacion ?? null;

const formatearFecha = (fechaISO: string | null): string => {
    if (!fechaISO) return 'No disponible';

    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) return 'No disponible';

    return fecha.toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatearDinero = (valor: number | string | null): string => {
    if (valor === null || valor === undefined) return 'No disponible';

    const numero = Number(valor);
    if (Number.isNaN(numero)) return 'No disponible';

    return numero.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });
};

export default function ScreenDetallesUsuario() {
    const router = useRouter();
    const params = useLocalSearchParams<{ solicitudId?: string | string[] }>();
    const { usuario } = useAuth();
    const { width } = useWindowDimensions();

    const solicitudIdParametro = Array.isArray(params.solicitudId) ? params.solicitudId[0] : params.solicitudId;
    const solicitudId = Number(solicitudIdParametro);
    const pantallaEstrecha = width < 370;

    const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
    const [errorFotoFletero, setErrorFotoFletero] = useState(false);

    useEffect(() => {
        let componenteActivo = true;

        const cargarDetalle = async (): Promise<void> => {
            if (!usuario?.usuario_id || !Number.isInteger(solicitudId) || solicitudId <= 0) {
                if (componenteActivo) {
                    setSolicitud(null);
                    setCargando(false);
                }
                return;
            }

            setCargando(true);

            try {
                const { data, error } = await supabase
                    .from('solicitud')
                    .select(`
            solicitud_id,
            usuario_id,
            fletero_id,
            tonelaje_requerido,
            descripcion_carga,
            precio_base,
            precio_ajustado,
            precio_final,
            deposito_requerido,
            deposito_pagado,
            distancia_km,
            estado,
            hora_inicio,
            hora_fin,
            creado_en,
            categoria_carga(nombre),
            punto_ruta(*),
            cargamento(*),
            fletero(
              nombre,
              telefono,
              tipo_vehiculo,
              placa_vehiculo,
              foto_url,
              foto_vehiculo_url,
              calificacion_promedio
            ),
            calificacion(
              estrellas_al_fletero,
              comentario_al_fletero
            )
          `)
                    .eq('solicitud_id', solicitudId)
                    .eq('usuario_id', usuario.usuario_id)
                    .maybeSingle();

                if (!componenteActivo) return;

                if (error) {
                    console.log('Error al cargar el detalle de la solicitud:', error);
                    setSolicitud(null);
                    return;
                }

                setSolicitud((data as SolicitudDetalle | null) ?? null);
                setErrorFotoFletero(false);
            } catch (error: unknown) {
                console.log('Error general al cargar la solicitud:', error);
                if (componenteActivo) setSolicitud(null);
            } finally {
                if (componenteActivo) setCargando(false);
            }
        };

        void cargarDetalle();

        return () => {
            componenteActivo = false;
        };
    }, [solicitudId, usuario?.usuario_id]);

    const renderEncabezado = () => (
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.botonAtras}
                    onPress={() => router.back()}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Regresar"
                >
                    <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </TouchableOpacity>

                <Text style={styles.headerTitulo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    Detalle de tu pedido
                </Text>

                <View style={styles.espacioHeader} />
            </View>
        </SafeAreaView>
    );

    if (cargando) {
        return (
            <View style={styles.container}>
                {renderEncabezado()}

                <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
                    <View style={styles.centrado}>
                        <ActivityIndicator size="large" color="#F97316" />
                        <Text style={styles.textoCarga}>Consultando tu pedido...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (!solicitud) {
        return (
            <View style={styles.container}>
                {renderEncabezado()}

                <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
                    <View style={styles.centrado}>
                        <Text style={styles.textoError}>No se encontró la solicitud o no pertenece a tu cuenta.</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const categoria = obtenerRelacion<CategoriaCarga>(solicitud.categoria_carga);
    const fletero = obtenerRelacion<FleteroDetalle>(solicitud.fletero);
    const calificacion = obtenerRelacion<CalificacionDetalle>(solicitud.calificacion);
    const puntosRuta: PuntoRuta[] = Array.isArray(solicitud.punto_ruta) ? solicitud.punto_ruta : [];
    const fotos: Cargamento[] = Array.isArray(solicitud.cargamento) ? solicitud.cargamento : [];

    const origen = puntosRuta.find(punto => punto.tipo === 'origen')?.direccion_texto ?? 'Origen no definido';
    const destino = puntosRuta.find(punto => punto.tipo === 'destino')?.direccion_texto ?? 'Destino no definido';
    const estado = ESTADOS[solicitud.estado];
    const precioMostrar = solicitud.precio_final ?? solicitud.precio_ajustado ?? solicitud.precio_base;
    const inicialFletero = fletero?.nombre?.trim().charAt(0).toUpperCase() || 'F';

    return (
        <View style={styles.container}>
            {renderEncabezado()}

            <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.contenidoCentral}>
                        <View style={styles.filaEstado}>
                            <Text style={styles.numeroSolicitud}>Solicitud #{solicitud.solicitud_id}</Text>

                            <View style={[styles.badgeEstado, { backgroundColor: estado.fondo }]}>
                                <Text style={[styles.badgeEstadoTexto, { color: estado.texto }]}>{estado.label}</Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.tituloSeccion}>Ruta del servicio</Text>

                            <View style={styles.rutaRow}>
                                <View style={styles.dotOrigen} />

                                <View style={styles.rutaContenido}>
                                    <Text style={styles.rutaLabel}>Origen</Text>
                                    <Text style={styles.rutaTexto}>{origen}</Text>
                                </View>
                            </View>

                            <View style={styles.lineaVertical} />

                            <View style={styles.rutaRow}>
                                <View style={styles.dotDestino} />

                                <View style={styles.rutaContenido}>
                                    <Text style={styles.rutaLabel}>Destino</Text>
                                    <Text style={styles.rutaTexto}>{destino}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.tituloSeccion}>Información del pedido</Text>

                            <View style={styles.infoGrid}>
                                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                                    <Text style={styles.infoLabel}>Categoría</Text>
                                    <Text style={styles.infoValor}>{categoria?.nombre ?? 'No disponible'}</Text>
                                </View>

                                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                                    <Text style={styles.infoLabel}>Tonelaje</Text>
                                    <Text style={styles.infoValor}>{solicitud.tonelaje_requerido} ton</Text>
                                </View>

                                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                                    <Text style={styles.infoLabel}>Distancia</Text>
                                    <Text style={styles.infoValor}>
                                        {solicitud.distancia_km !== null ? `${Number(solicitud.distancia_km).toFixed(1)} km` : 'No disponible'}
                                    </Text>
                                </View>

                                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                                    <Text style={styles.infoLabel}>Precio</Text>
                                    <Text style={[styles.infoValor, styles.precio]}>{formatearDinero(precioMostrar)}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.tituloSeccion}>Descripción</Text>

                            <Text style={styles.descripcion}>
                                {solicitud.descripcion_carga || 'No se agregó una descripción.'}
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.tituloSeccion}>Información del servicio</Text>

                            <View style={styles.filaDato}>
                                <Text style={styles.datoLabel}>Solicitud creada</Text>
                                <Text style={styles.datoValor}>{formatearFecha(solicitud.creado_en)}</Text>
                            </View>

                            {solicitud.hora_inicio && (
                                <View style={styles.filaDato}>
                                    <Text style={styles.datoLabel}>Servicio iniciado</Text>
                                    <Text style={styles.datoValor}>{formatearFecha(solicitud.hora_inicio)}</Text>
                                </View>
                            )}

                            {solicitud.hora_fin && (
                                <View style={styles.filaDato}>
                                    <Text style={styles.datoLabel}>Servicio finalizado</Text>
                                    <Text style={styles.datoValor}>{formatearFecha(solicitud.hora_fin)}</Text>
                                </View>
                            )}

                            <View style={styles.filaDato}>
                                <Text style={styles.datoLabel}>Depósito requerido</Text>
                                <Text style={styles.datoValor}>{formatearDinero(solicitud.deposito_requerido)}</Text>
                            </View>

                            <View style={[styles.filaDato, styles.filaDatoFinal]}>
                                <Text style={styles.datoLabel}>Estado del depósito</Text>

                                <Text style={[styles.datoValor, { color: solicitud.deposito_pagado ? '#15803D' : '#B45309' }]}>
                                    {solicitud.deposito_pagado ? 'Pagado' : 'Pendiente'}
                                </Text>
                            </View>
                        </View>

                        {fletero && (
                            <View style={styles.card}>
                                <Text style={styles.tituloSeccion}>Fletero asignado</Text>

                                <View style={styles.fleteroRow}>
                                    <View style={styles.avatarFletero}>
                                        {fletero.foto_url && !errorFotoFletero ? (
                                            <Image
                                                source={{ uri: fletero.foto_url }}
                                                style={styles.avatarFleteroImagen}
                                                resizeMode="cover"
                                                onError={() => setErrorFotoFletero(true)}
                                            />
                                        ) : (
                                            <Text style={styles.avatarFleteroTexto}>{inicialFletero}</Text>
                                        )}
                                    </View>

                                    <View style={styles.fleteroInfo}>
                                        <View style={styles.fleteroNombreFila}>
                                            <Text style={styles.fleteroNombre} numberOfLines={1}>{fletero.nombre}</Text>
                                        </View>

                                        <View style={styles.verificadoContainer}>
                                            <Ionicons name="checkmark-circle" size={15} color="#15803D" />
                                            <Text style={styles.verificadoTexto}>Fletero verificado</Text>
                                        </View>

                                        <Text style={styles.fleteroDato}>
                                            {fletero.tipo_vehiculo || 'Vehículo no definido'}
                                            {fletero.placa_vehiculo ? ` · ${fletero.placa_vehiculo}` : ''}
                                        </Text>

                                        <Text style={styles.fleteroDato}>
                                            Calificación: {Number(fletero.calificacion_promedio ?? 0).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {fotos.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.tituloSeccion}>Fotos del cargamento</Text>

                                <ScrollView
                                    horizontal
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.fotosContent}
                                >
                                    {fotos.map(foto => (
                                        <TouchableOpacity
                                            key={foto.cargamento_id}
                                            onPress={() => setFotoAmpliada(foto.foto_url)}
                                            activeOpacity={0.85}
                                        >
                                            <Image
                                                source={{ uri: foto.foto_url }}
                                                style={[styles.fotoCargamento, pantallaEstrecha && styles.fotoCargamentoEstrecha]}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {calificacion?.estrellas_al_fletero !== null && calificacion?.estrellas_al_fletero !== undefined && (
                            <View style={styles.card}>
                                <Text style={styles.tituloSeccion}>Tu calificación</Text>

                                <Text style={styles.calificacionTexto}>
                                    {calificacion.estrellas_al_fletero} de 5 estrellas
                                </Text>

                                {calificacion.comentario_al_fletero && (
                                    <Text style={styles.comentarioCalificacion}>
                                        {calificacion.comentario_al_fletero}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={fotoAmpliada !== null}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setFotoAmpliada(null)}
            >
                <View style={styles.modalFondo}>
                    <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
                        <Image source={{ uri: fotoAmpliada ?? '' }} style={styles.fotoAmpliada} resizeMode="contain" />

                        <TouchableOpacity
                            style={styles.botonCerrarModal}
                            onPress={() => setFotoAmpliada(null)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerSafeArea: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8ECF2' },
    header: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
    botonAtras: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    headerTitulo: { flex: 1, marginHorizontal: 8, color: '#0F172A', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    espacioHeader: { width: 42, height: 42 },
    contentSafeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    scroll: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
    contenidoCentral: { width: '100%', maxWidth: 720, alignSelf: 'center' },
    centrado: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
    textoCarga: { marginTop: 12, color: '#64748B', fontSize: 14 },
    textoError: { color: '#64748B', fontSize: 14, lineHeight: 20, textAlign: 'center' },

    filaEstado: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    numeroSolicitud: { flex: 1, marginRight: 12, color: '#64748B', fontSize: 13, fontWeight: '600' },
    badgeEstado: { maxWidth: '55%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeEstadoTexto: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

    card: { marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tituloSeccion: { marginBottom: 12, color: '#0F172A', fontSize: 15, fontWeight: '700' },

    rutaRow: { flexDirection: 'row', alignItems: 'flex-start' },
    rutaContenido: { flex: 1, minWidth: 0 },
    rutaLabel: { marginBottom: 2, color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    rutaTexto: { color: '#0F172A', fontSize: 14, fontWeight: '500', lineHeight: 20 },
    dotOrigen: { width: 10, height: 10, marginTop: 5, marginRight: 10, borderRadius: 5, backgroundColor: '#22C55E' },
    dotDestino: { width: 10, height: 10, marginTop: 5, marginRight: 10, borderRadius: 5, backgroundColor: '#F97316' },
    lineaVertical: { width: 2, height: 18, marginLeft: 4, marginVertical: 3, backgroundColor: '#E2E8F0' },

    infoGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
    infoItem: { width: '48%', minWidth: 0 },
    infoItemEstrecho: { width: '100%' },
    infoLabel: { marginBottom: 3, color: '#94A3B8', fontSize: 11 },
    infoValor: { color: '#0F172A', fontSize: 14, fontWeight: '600', lineHeight: 19 },
    precio: { color: '#F97316', fontSize: 16, fontWeight: '700' },
    descripcion: { color: '#334155', fontSize: 14, lineHeight: 21 },

    filaDato: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    filaDatoFinal: { borderBottomWidth: 0, paddingBottom: 0 },
    datoLabel: { flex: 1, marginRight: 16, color: '#64748B', fontSize: 13 },
    datoValor: { maxWidth: '55%', color: '#0F172A', fontSize: 13, fontWeight: '600', textAlign: 'right' },

    fleteroRow: { flexDirection: 'row', alignItems: 'center' },
    avatarFletero: { width: 56, height: 56, marginRight: 12, borderRadius: 28, backgroundColor: '#E3ECF7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarFleteroImagen: { width: '100%', height: '100%' },
    avatarFleteroTexto: { color: '#0B2545', fontSize: 20, fontWeight: '700' },
    fleteroInfo: { flex: 1, minWidth: 0 },
    fleteroNombreFila: { flexDirection: 'row', alignItems: 'center' },
    fleteroNombre: { flexShrink: 1, color: '#0F172A', fontSize: 15, fontWeight: '700' },
    verificadoContainer: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7' },
    verificadoTexto: { marginLeft: 4, color: '#15803D', fontSize: 11, fontWeight: '700' },
    fleteroDato: { color: '#64748B', fontSize: 12, lineHeight: 18 },

    fotosContent: { paddingTop: 2, paddingRight: 6 },
    fotoCargamento: { width: 110, height: 110, marginRight: 10, borderRadius: 12, backgroundColor: '#E2E8F0' },
    fotoCargamentoEstrecha: { width: 96, height: 96 },

    calificacionTexto: { color: '#F97316', fontSize: 15, fontWeight: '700' },
    comentarioCalificacion: { marginTop: 8, color: '#475569', fontSize: 13, lineHeight: 19 },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
    modalSafeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fotoAmpliada: { width: '100%', height: '82%' },
    botonCerrarModal: { position: 'absolute', top: 8, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
});