import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const badgeColor = estado => {
    switch (estado) {
        case 'publicada': return { bg: '#FFF3E0', text: '#E65100', label: 'Buscando fletero' };
        case 'aceptada': return { bg: '#FEF9C3', text: '#854D0E', label: 'Fletero en camino' };
        case 'en_progreso': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Flete en progreso' };
        case 'completada': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Entregado' };
        case 'cancelada': return { bg: '#FFEBEE', text: '#C62828', label: 'Cancelado' };
        default: return { bg: '#F5F5F5', text: '#555555', label: estado ?? 'Sin estado' };
    }
};

const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
};

export default function ScreenHomeUser() {
    const { usuario } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const [solicitudesActivas, setSolicitudesActivas] = useState([]);
    const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [saludo, setSaludo] = useState(obtenerSaludo());
    const [errorFoto, setErrorFoto] = useState(false);

    const pantallaEstrecha = width < 390;
    const nombre = usuario?.nombre?.trim() || 'Usuario';
    const fotoPerfil = usuario?.foto_url?.trim() || null;
    const inicial = nombre.charAt(0).toUpperCase() || 'U';
    const totalSolicitudes = solicitudesActivas.length + solicitudesRecientes.length;

    useEffect(() => {
        setSaludo(obtenerSaludo());
        const intervalo = setInterval(() => setSaludo(obtenerSaludo()), 60000);
        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        setErrorFoto(false);
    }, [fotoPerfil]);

    const cargarSolicitudes = useCallback(async () => {
        if (!usuario?.usuario_id) {
            setSolicitudesActivas([]);
            setSolicitudesRecientes([]);
            setCargando(false);
            return;
        }

        setCargando(true);

        try {
            const { data, error } = await supabase
                .from('solicitud')
                .select(`
          *,
          categoria_carga(nombre),
          punto_ruta(*),
          fletero(nombre,calificacion_promedio,tipo_vehiculo),
          calificacion(calificacion_id,estrellas_al_fletero,estrellas_al_usuario)
        `)
                .eq('usuario_id', usuario.usuario_id)
                .neq('estado', 'borrador')
                .order('creado_en', { ascending: false });

            if (error) {
                console.log('Error al cargar solicitudes:', error);
                setSolicitudesActivas([]);
                setSolicitudesRecientes([]);
                return;
            }

            const solicitudes = data ?? [];

            setSolicitudesActivas(
                solicitudes.filter(solicitud =>
                    ['publicada', 'aceptada', 'en_progreso'].includes(solicitud.estado)
                )
            );

            setSolicitudesRecientes(
                solicitudes.filter(solicitud =>
                    ['completada', 'cancelada'].includes(solicitud.estado)
                )
            );
        } catch (error) {
            console.log('Error general al cargar solicitudes:', error);
            setSolicitudesActivas([]);
            setSolicitudesRecientes([]);
        } finally {
            setCargando(false);
        }
    }, [usuario?.usuario_id]);

    useFocusEffect(
        useCallback(() => {
            void cargarSolicitudes();
        }, [cargarSolicitudes])
    );

    const verDetalleSolicitud = solicitud => {
        router.push({
            pathname: '/Screen/Detalles/ScreenDetallesUsuario',
            params: { solicitudId: String(solicitud.solicitud_id) },
        });
    };

    const verSeguimientoSolicitud = solicitud => {
        if (solicitud.estado !== 'en_progreso') return;

        router.push({
            pathname: '/Screen/Map/ScreenMapSuccess',
            params: { solicitudId: String(solicitud.solicitud_id) },
        });
    };

    const formatearFecha = fechaISO => {
        if (!fechaISO) return 'Sin fecha';

        const fecha = new Date(fechaISO);
        if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

        return fecha.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
        });
    };

    const obtenerTitulo = solicitud =>
        solicitud.categoria_carga?.nombre ??
        solicitud.descripcion_carga ??
        'Flete';

    const obtenerRutaTexto = solicitud => {
        const puntos = Array.isArray(solicitud.punto_ruta) ? solicitud.punto_ruta : [];
        const destino = puntos.find(punto => punto.tipo === 'destino');
        return destino?.direccion_texto ?? 'Destino no definido';
    };

    const obtenerFletero = solicitud =>
        Array.isArray(solicitud.fletero)
            ? solicitud.fletero[0] ?? null
            : solicitud.fletero ?? null;

    const obtenerCalificacion = solicitud =>
        Array.isArray(solicitud.calificacion)
            ? solicitud.calificacion[0] ?? null
            : solicitud.calificacion ?? null;

    const tieneCalificacionAlFletero = solicitud => {
        const calificacion = obtenerCalificacion(solicitud);

        return (
            calificacion?.estrellas_al_fletero !== null &&
            calificacion?.estrellas_al_fletero !== undefined
        );
    };

    const renderAvatar = () => {
        if (fotoPerfil && !errorFoto) {
            return (
                <Image
                    source={{ uri: fotoPerfil }}
                    style={styles.avatarImagen}
                    resizeMode="cover"
                    onError={() => setErrorFoto(true)}
                />
            );
        }

        return <Text style={styles.avatarLetra}>{inicial}</Text>;
    };

    const renderContador = cantidad => (
        <View style={styles.contador}>
            <Text style={styles.contadorTexto}>{cantidad}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.saludoContainer}>
                        <Text style={styles.saludoSub}>{saludo},</Text>

                        <Text style={styles.saludoNombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                            {nombre} 👋
                        </Text>

                        <Text style={styles.totalSolicitudes} numberOfLines={1}>
                            {cargando
                                ? 'Consultando tus solicitudes...'
                                : `${totalSolicitudes} ${totalSolicitudes === 1 ? 'solicitud' : 'solicitudes'} en total`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/Screen/Setting/ScreenSettings')}
                        style={styles.avatarButton}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir configuración del perfil"
                    >
                        <View style={styles.avatarCircle}>{renderAvatar()}</View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.contenidoCentral}>
                        <TouchableOpacity
                            style={styles.btnPrincipal}
                            onPress={() => router.push('/Screen/Pedido/ScreenPedidos')}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Solicitar nuevo flete"
                        >
                            <Text style={styles.btnPrincipalText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                                Solicitar nuevo flete
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.seccionHeader}>
                            <Text style={styles.seccionTitulo}>En proceso</Text>
                            {!cargando && renderContador(solicitudesActivas.length)}
                        </View>

                        {cargando && (
                            <ActivityIndicator color="#FF6B00" style={styles.indicadorCarga} />
                        )}

                        {!cargando && solicitudesActivas.length === 0 && (
                            <Text style={styles.textoVacio}>No tienes fletes en proceso por ahora.</Text>
                        )}

                        {!cargando && solicitudesActivas.map(item => {
                            const colors = badgeColor(item.estado);
                            const puedeVerSeguimiento = item.estado === 'en_progreso';
                            const tieneChat = item.estado === 'aceptada' || item.estado === 'en_progreso';
                            const fletero = obtenerFletero(item);

                            return (
                                <View key={item.solicitud_id} style={styles.card}>
                                    <TouchableOpacity
                                        style={[styles.cardContenido, pantallaEstrecha && styles.cardContenidoEstrecho]}
                                        onPress={() => verDetalleSolicitud(item)}
                                        activeOpacity={0.75}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver detalles de la solicitud"
                                    >
                                        <View style={styles.cardIcono} />

                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardTitulo} numberOfLines={1}>{obtenerTitulo(item)}</Text>

                                            <Text style={styles.cardSub} numberOfLines={pantallaEstrecha ? 2 : 1}>
                                                {obtenerRutaTexto(item)} · {formatearFecha(item.creado_en)}
                                            </Text>

                                            

                                            {fletero && (
                                                <Text style={styles.cardFletero} numberOfLines={1}>
                                                    {fletero.nombre}{fletero.tipo_vehiculo ? ` · ${fletero.tipo_vehiculo}` : ''}
                                                </Text>
                                            )}
                                        </View>

                                        <View style={[styles.badge, pantallaEstrecha && styles.badgeEstrecho, { backgroundColor: colors.bg }]}>
                                            <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
                                                {colors.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {tieneChat && (
                                        <TouchableOpacity
                                            style={styles.btnChat}
                                            onPress={() => router.push(`/Screen/Mensaje/ScreenMensajes?solicitudId=${item.solicitud_id}`)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.btnChatTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                                                💬 Chatear con el fletero
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {puedeVerSeguimiento && (
                                        <TouchableOpacity
                                            style={styles.btnSeguimiento}
                                            onPress={() => verSeguimientoSolicitud(item)}
                                            activeOpacity={0.85}
                                            accessibilityRole="button"
                                            accessibilityLabel="Ver seguimiento del flete"
                                        >
                                            <Text style={styles.btnSeguimientoTexto}>🗺 Ver seguimiento del flete</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}

                        <View style={[styles.seccionHeader, styles.seccionRecientes]}>
                            <Text style={styles.seccionTitulo}>Envíos recientes</Text>
                            {!cargando && renderContador(solicitudesRecientes.length)}
                        </View>

                        {!cargando && solicitudesRecientes.length === 0 && (
                            <Text style={styles.textoVacio}>Aún no tienes envíos anteriores.</Text>
                        )}

                        {!cargando && solicitudesRecientes.map(item => {
                            const colors = badgeColor(item.estado);
                            const fletero = obtenerFletero(item);
                            const puedeCalificar = item.estado === 'completada' && !tieneCalificacionAlFletero(item);

                            return (
                                <View key={item.solicitud_id} style={styles.card}>
                                    <TouchableOpacity
                                        style={[styles.cardContenido, pantallaEstrecha && styles.cardContenidoEstrecho]}
                                        onPress={() => verDetalleSolicitud(item)}
                                        activeOpacity={0.75}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver detalles de la solicitud"
                                    >
                                        <View style={styles.cardIcono} />

                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardTitulo} numberOfLines={1}>{obtenerTitulo(item)}</Text>

                                            <Text style={styles.cardSub} numberOfLines={pantallaEstrecha ? 2 : 1}>
                                                {obtenerRutaTexto(item)} · {formatearFecha(item.creado_en)}
                                            </Text>

                                            
                                        </View>

                                        <View style={[styles.badge, pantallaEstrecha && styles.badgeEstrecho, { backgroundColor: colors.bg }]}>
                                            <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
                                                {colors.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {puedeCalificar && (
                                        <TouchableOpacity
                                            style={styles.btnCalificar}
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/Screen/Calificacion/ScreenCalificacion',
                                                    params: {
                                                        solicitudId: String(item.solicitud_id),
                                                        fleteroNombre: fletero?.nombre ?? 'Tu fletero',
                                                    },
                                                })
                                            }
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.btnCalificarTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                                                ⭐ Calificar servicio
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {item.estado === 'completada' && tieneCalificacionAlFletero(item) && (
                                        <View style={styles.calificacionEnviada}>
                                            <Text style={styles.calificacionEnviadaTexto}>Calificación enviada</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    headerSafeArea: { backgroundColor: '#1A1A2E' },
    header: { width: '100%', minHeight: 104, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A2E' },
    saludoContainer: { flex: 1, minWidth: 0, marginRight: 14 },
    saludoSub: { color: '#B0B8CC', fontSize: 14 },
    saludoNombre: { marginTop: 2, color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    totalSolicitudes: { marginTop: 5, color: '#818AA3', fontSize: 12 },
    avatarButton: { flexShrink: 0, borderRadius: 24 },
    avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FF6B00' },
    avatarImagen: { width: '100%', height: '100%' },
    avatarLetra: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

    contentSafeArea: { flex: 1, backgroundColor: '#F7F8FA' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 24 },
    contenidoCentral: { width: '100%', maxWidth: 720, alignSelf: 'center' },

    btnPrincipal: { minHeight: 52, marginHorizontal: 20, marginTop: 20, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B00', shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    btnPrincipalText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },

    seccionHeader: { minHeight: 32, paddingHorizontal: 20, marginTop: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    seccionRecientes: { marginTop: 16 },
    seccionTitulo: { color: '#1A1A2E', fontSize: 16, fontWeight: '700' },
    contador: { minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE8D6' },
    contadorTexto: { color: '#E65100', fontSize: 12, fontWeight: '700' },
    indicadorCarga: { marginVertical: 18 },
    textoVacio: { paddingHorizontal: 20, marginBottom: 16, color: '#8A8FA8', fontSize: 13, lineHeight: 18 },

    card: { marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardContenido: { width: '100%', flexDirection: 'row', alignItems: 'center' },
    cardContenidoEstrecho: { flexWrap: 'wrap', alignItems: 'flex-start' },
    cardIcono: { width: 40, height: 40, borderRadius: 10, marginRight: 12, flexShrink: 0, backgroundColor: '#F0F1F5' },
    cardInfo: { flex: 1, minWidth: 125 },
    cardTitulo: { marginBottom: 3, color: '#1A1A2E', fontSize: 14, fontWeight: '600' },
    cardSub: { color: '#8A8FA8', fontSize: 12, lineHeight: 17 },
    verDetallesTexto: { marginTop: 4, color: '#FF6B00', fontSize: 11, fontWeight: '600' },
    cardFletero: { marginTop: 3, color: '#FF6B00', fontSize: 11, fontWeight: '600' },

    badge: { maxWidth: 135, marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
    badgeEstrecho: { marginTop: 10, marginLeft: 52 },
    badgeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

    btnChat: { minHeight: 42, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
    btnChatTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },

    btnSeguimiento: { minHeight: 42, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB' },
    btnSeguimientoTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },

    btnCalificar: { minHeight: 42, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F97316', backgroundColor: '#FFF7ED' },
    btnCalificarTexto: { color: '#F97316', fontSize: 13, fontWeight: '600', textAlign: 'center' },

    calificacionEnviada: { minHeight: 42, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
    calificacionEnviadaTexto: { color: '#64748B', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});