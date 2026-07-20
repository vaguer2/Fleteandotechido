import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, ScrollView, StyleSheet,
    Text, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

export default function ScreenHistorialUsuario() {
    const router = useRouter();
    const { usuario } = useAuth();
    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        async function cargarHistorial() {
            if (!usuario?.usuario_id) {
                setCargando(false);
                return;
            }

            const { data, error } = await supabase
                .from('solicitud')
                .select('*, categoria_carga(nombre), punto_ruta(*), fletero(nombre, tipo_vehiculo, calificacion_promedio)')
                .eq('usuario_id', usuario.usuario_id)
                .in('estado', ['completada', 'cancelada'])
                .order('creado_en', { ascending: false });

            if (error) {
                console.log('Error al cargar historial:', error);
            } else {
                setServicios(data ?? []);
            }
            setCargando(false);
        }

        cargarHistorial();
    }, [usuario]);

    const formatearFecha = (fechaISO) => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const obtenerOrigen = (solicitud) => {
        return solicitud.punto_ruta?.find((p) => p.tipo === 'origen')?.direccion_texto ?? 'No disponible';
    };

    const obtenerDestino = (solicitud) => {
        return solicitud.punto_ruta?.find((p) => p.tipo === 'destino')?.direccion_texto ?? 'No disponible';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Historial de pedidos</Text>
            </View>

            {cargando ? (
                <View style={styles.centrado}>
                    <ActivityIndicator color="#FF6B00" size="large" />
                </View>
            ) : servicios.length === 0 ? (
                <View style={styles.centrado}>
                    <Ionicons name="time-outline" size={64} color="#CBD5E1" />
                    <Text style={styles.sinServiciosTexto}>Aun no tienes pedidos anteriores</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.lista}>
                    {servicios.map((item) => {
                        const completado = item.estado === 'completada';
                        return (
                            <View key={item.solicitud_id} style={styles.card}>

                                <View style={styles.cardHeader}>
                                    <Text style={styles.folio}>
                                        FLT-{String(item.solicitud_id).padStart(5, '0')}
                                    </Text>
                                    <View style={[
                                        styles.badge,
                                        { backgroundColor: completado ? '#DCFCE7' : '#FEE2E2' }
                                    ]}>
                                        <Text style={[
                                            styles.badgeTexto,
                                            { color: completado ? '#16A34A' : '#DC2626' }
                                        ]}>
                                            {completado ? 'Entregado' : 'Cancelado'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.rutaRow}>
                                    <View style={styles.dotVerde} />
                                    <Text style={styles.rutaTexto} numberOfLines={1}>
                                        {obtenerOrigen(item)}
                                    </Text>
                                </View>
                                <View style={styles.lineaVertical} />
                                <View style={styles.rutaRow}>
                                    <View style={styles.dotNaranja} />
                                    <Text style={styles.rutaTexto} numberOfLines={1}>
                                        {obtenerDestino(item)}
                                    </Text>
                                </View>

                                <View style={styles.separador} />

                                <View style={styles.infoRow}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Categoria</Text>
                                        <Text style={styles.infoValor}>
                                            {item.categoria_carga?.nombre ?? '—'}
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Fecha</Text>
                                        <Text style={styles.infoValor}>
                                            {formatearFecha(item.creado_en)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Precio pagado</Text>
                                        <Text style={[styles.infoValor, styles.precio]}>
                                            {item.precio_ajustado
                                                ? `$${item.precio_ajustado} MXN`
                                                : item.precio_base
                                                    ? `$${item.precio_base} MXN`
                                                    : '—'}
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Fletero</Text>
                                        <Text style={styles.infoValor}>
                                            {item.fletero?.nombre ?? 'No asignado'}
                                        </Text>
                                    </View>
                                </View>

                                {item.fletero?.tipo_vehiculo && (
                                    <View style={styles.vehiculoRow}>
                                        <Ionicons name="car-outline" size={14} color="#94A3B8" />
                                        <Text style={styles.vehiculoTexto}>
                                            {item.fletero.tipo_vehiculo}
                                        </Text>
                                    </View>
                                )}

                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#1A1A2E',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    sinServiciosTexto: { fontSize: 15, color: '#94A3B8', textAlign: 'center' },
    lista: { padding: 16, paddingBottom: 32, gap: 12 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    folio: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeTexto: { fontSize: 12, fontWeight: '600' },
    rutaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dotVerde: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
    dotNaranja: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316' },
    lineaVertical: { width: 2, height: 10, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 2 },
    rutaTexto: { fontSize: 13, color: '#0F172A', fontWeight: '500', flex: 1 },
    separador: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    infoItem: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
    infoValor: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
    precio: { color: '#FF6B00', fontSize: 15 },
    vehiculoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    vehiculoTexto: { fontSize: 12, color: '#94A3B8' },
});