import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const badgeColor = (estado) => {
    switch (estado) {
        case 'publicada': return { bg: '#FFF3E0', text: '#E65100', label: 'Buscando fletero' };
        case 'aceptada': return { bg: '#FEF9C3', text: '#854D0E', label: 'Fletero en camino' };
        case 'en_progreso': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Flete en progreso' };
        case 'completada': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Entregado' };
        case 'cancelada': return { bg: '#FFEBEE', text: '#C62828', label: 'Cancelado' };
        default: return { bg: '#F5F5F5', text: '#555', label: estado };
    }
};

export default function ScreenHomeUsers() {
    const { usuario } = useAuth();
    const router = useRouter();

    const [solicitudesActivas, setSolicitudesActivas] = useState([]);
    const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
    const [cargando, setCargando] = useState(true);

    const nombre = usuario?.nombre ?? 'Usuario';

    useEffect(() => {
        async function cargarSolicitudes() {
            if (!usuario?.usuario_id) {
                setCargando(false);
                return;
            }

            const { data, error } = await supabase
                .from('solicitud')
                .select('*, categoria_carga(nombre), punto_ruta(*), fletero(nombre, calificacion_promedio, tipo_vehiculo), calificacion(calificacion_id)')
                .eq('usuario_id', usuario.usuario_id)
                .neq('estado', 'borrador')
                .order('creado_en', { ascending: false });

            if (error) {
                console.log('Error al cargar solicitudes:', error);
                setCargando(false);
                return;
            }

            const activas = (data ?? []).filter((s) =>
                ['publicada', 'aceptada', 'en_progreso'].includes(s.estado)
            );
            const recientes = (data ?? []).filter((s) =>
                ['completada', 'cancelada'].includes(s.estado)
            );

            setSolicitudesActivas(activas);
            setSolicitudesRecientes(recientes);
            setCargando(false);
        }

        cargarSolicitudes();
    }, [usuario]);

    const irAlMapaOEsperar = (solicitud) => {
        if (solicitud.estado === 'en_progreso') {
            router.push({
                pathname: '/Screen/Map/ScreenMapSuccess',
                params: { solicitudId: solicitud.solicitud_id },
            });
        }
    };

    const formatearFecha = (fechaISO) => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    };

    const obtenerTitulo = (solicitud) => {
        return solicitud.categoria_carga?.nombre ?? solicitud.descripcion_carga ?? 'Flete';
    };

    const obtenerRutaTexto = (solicitud) => {
        const destino = solicitud.punto_ruta?.find((p) => p.tipo === 'destino');
        return destino?.direccion_texto ?? 'Destino no definido';
    };

    return (
        <ScrollView style={styles.container} bounces={false}>

            <View style={styles.header}>
                <View>
                    <Text style={styles.saludoSub}>Buenos días,</Text>
                    <Text style={styles.saludoNombre}>{nombre} 👋</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/Screen/Setting/ScreenSettings')}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarLetra}>
                            {nombre.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnPrincipal} onPress={() => router.push('/Screen/Pedido/ScreenPedidos')} activeOpacity={0.85}>
                <Text style={styles.btnPrincipalText}>Solicitar nuevo flete</Text>
            </TouchableOpacity>

            <View style={styles.seccionHeader}>
                <Text style={styles.seccionTitulo}>En proceso</Text>
            </View>

            {cargando && (
                <ActivityIndicator color="#FF6B00" style={{ marginVertical: 12 }} />
            )}

            {!cargando && solicitudesActivas.length === 0 && (
                <Text style={styles.textoVacio}>No tienes fletes en proceso por ahora.</Text>
            )}

            {!cargando && solicitudesActivas.map((item) => {
                const colors = badgeColor(item.estado);
                const tieneFletero = item.estado === 'en_progreso';
                const tieneChat = item.estado === 'aceptada' || item.estado === 'en_progreso';

                return (
                    <View key={item.solicitud_id} style={styles.card}>
                        <TouchableOpacity
                            style={styles.cardContenido}
                            onPress={() => irAlMapaOEsperar(item)}
                            activeOpacity={tieneFletero ? 0.7 : 1}
                        >
                            <View style={styles.cardIcono} />
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitulo}>{obtenerTitulo(item)}</Text>
                                <Text style={styles.cardSub} numberOfLines={1}>
                                    {obtenerRutaTexto(item)} · {formatearFecha(item.creado_en)}
                                </Text>
                                {tieneFletero && item.fletero && (
                                    <Text style={styles.cardFletero}>
                                        {item.fletero.nombre} · {item.fletero.tipo_vehiculo}
                                    </Text>
                                )}
                            </View>
                            <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.badgeText, { color: colors.text }]}>{colors.label}</Text>
                            </View>
                        </TouchableOpacity>

                        {tieneChat && (
                            <TouchableOpacity
                                style={styles.btnChat}
                                onPress={() => router.push(`/Screen/Mensaje/ScreenMensajes?solicitudId=${item.solicitud_id}`)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnChatTexto}>💬 Chatear con el fletero</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}

            <View style={styles.seccionHeader}>
                <Text style={styles.seccionTitulo}>Envíos recientes</Text>
            </View>

            {!cargando && solicitudesRecientes.length === 0 && (
                <Text style={styles.textoVacio}>Aún no tienes envíos anteriores.</Text>
            )}

            {!cargando && solicitudesRecientes.map((item) => {
                const colors = badgeColor(item.estado);
                return (
                    <View key={item.solicitud_id} style={styles.card}>
                        <View style={styles.cardContenido}>
                            <View style={styles.cardIcono} />
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitulo}>{obtenerTitulo(item)}</Text>
                                <Text style={styles.cardSub} numberOfLines={1}>
                                    {obtenerRutaTexto(item)} · {formatearFecha(item.creado_en)}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.badgeText, { color: colors.text }]}>{colors.label}</Text>
                            </View>
                        </View>

                        {item.estado === 'completada' && !item.calificacion?.calificacion_id && (
                            <TouchableOpacity
                                style={styles.btnCalificar}
                                onPress={() => router.push({
                                    pathname: '/Screen/Calificacion/ScreenCalificacion',
                                    params: {
                                        solicitudId: item.solicitud_id,
                                        fleteroNombre: item.fletero?.nombre ?? 'Tu fletero',
                                    }
                                })}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnCalificarTexto}>⭐ Calificar servicio</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#1A1A2E', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24,
    },
    saludoSub: { color: '#B0B8CC', fontSize: 14 },
    saludoNombre: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center',
    },
    avatarLetra: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    btnPrincipal: {
        margin: 20, backgroundColor: '#FF6B00', borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
        shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    btnPrincipalText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    seccionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginTop: 8, marginBottom: 10,
    },
    seccionTitulo: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
    textoVacio: { fontSize: 13, color: '#8A8FA8', paddingHorizontal: 20, marginBottom: 16 },
    card: {
        backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 10,
        borderRadius: 12, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    cardContenido: { flexDirection: 'row', alignItems: 'center' },
    cardIcono: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0F1F5', marginRight: 12 },
    cardInfo: { flex: 1 },
    cardTitulo: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 3 },
    cardSub: { fontSize: 12, color: '#8A8FA8' },
    cardFletero: { fontSize: 11, color: '#FF6B00', fontWeight: '600', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    btnChat: {
        backgroundColor: '#1A1A2E', borderRadius: 10,
        paddingVertical: 10, alignItems: 'center', marginTop: 10,
    },
    btnChatTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    btnCalificar: {
        backgroundColor: '#FFF7ED', borderRadius: 10,
        paddingVertical: 10, alignItems: 'center',
        marginTop: 10, borderWidth: 1, borderColor: '#F97316',
    },
    btnCalificarTexto: { color: '#F97316', fontSize: 13, fontWeight: '600' },
});