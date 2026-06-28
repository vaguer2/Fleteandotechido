import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

export default function ScreenDetallesFletero() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const solicitudId = params.solicitudId;
    const { usuario } = useAuth();

    const [solicitud, setSolicitud] = useState<any>(null);
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [cargando, setCargando] = useState(true);
    const [aceptando, setAceptando] = useState(false);
    const [yaTomada, setYaTomada] = useState(false);
    const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
    useEffect(() => {
        async function cargarDetalle() {
            if (!solicitudId) {
                setCargando(false);
                return;
            }

            const { data, error } = await supabase
                .from('solicitud')
                .select('*, categoria_carga(nombre), punto_ruta(*), cargamento(*)')
                .eq('solicitud_id', solicitudId)
                .single();

            if (error || !data) {
                console.log('Error al traer la solicitud:', error);
                setCargando(false);
                return;
            }

            setSolicitud(data);
            setOrigen(data.punto_ruta?.find((p: any) => p.tipo === 'origen')?.direccion_texto ?? 'No definido');
            setDestino(data.punto_ruta?.find((p: any) => p.tipo === 'destino')?.direccion_texto ?? 'No definido');

            // Si alguien más ya la tomó mientras tanto
            if (data.fletero_id !== null) {
                setYaTomada(true);
            }

            setCargando(false);
        }

        cargarDetalle();
    }, [solicitudId]);

    const aceptarSolicitud = async () => {
        if (!usuario?.fletero_id || !solicitudId) return;

        setAceptando(true);
        try {
            const { error } = await supabase
                .from('solicitud')
                .update({
                    fletero_id: usuario.fletero_id,
                    estado: 'aceptada',
                    hora_inicio: new Date().toISOString(),
                })
                .eq('solicitud_id', solicitudId)
                .is('fletero_id', null); // protección: solo si nadie la tomó mientras tanto

            if (error) {
                console.log('Error al aceptar solicitud:', error);
                Alert.alert('Error', 'No se pudo aceptar la solicitud. Intenta de nuevo.');
                return;
            }

            Alert.alert(
                '¡Listo!',
                'Aceptaste la solicitud correctamente.',
                [{ text: 'OK', onPress: () => router.replace('/Screen/Home/ScreenHomeFletero') }]
            );

        } catch (error) {
            console.log('Error general:', error);
            Alert.alert('Error', 'Ocurrió un problema al aceptar la solicitud.');
        } finally {
            setAceptando(false);
        }
    };

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator color="#F97316" size="large" />
            </View>
        );
    }

    if (!solicitud) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.textoError}>No se encontró la solicitud.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            <Text style={styles.titulo}>Detalle de la solicitud</Text>

            {/* Tarjeta de ruta */}
            <View style={styles.card}>
                <View style={styles.rutaRow}>
                    <View style={styles.dotVerde} />
                    <Text style={styles.rutaTexto} numberOfLines={2}>{origen}</Text>
                </View>
                <View style={styles.lineaVertical} />
                <View style={styles.rutaRow}>
                    <View style={styles.dotNaranja} />
                    <Text style={styles.rutaTexto} numberOfLines={2}>{destino}</Text>
                </View>

                <View style={styles.separator} />

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Distancia</Text>
                        <Text style={styles.infoValor}>
                            {solicitud.distancia_km ? `${solicitud.distancia_km.toFixed(1)} km` : '—'}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Tonelaje requerido</Text>
                        <Text style={styles.infoValor}>{solicitud.tonelaje_requerido} ton</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Categoría</Text>
                        <Text style={styles.infoValor}>{solicitud.categoria_carga?.nombre ?? '—'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Precio base</Text>
                        <Text style={styles.infoValor}>
                            {solicitud.precio_base ? `$${solicitud.precio_base.toLocaleString('es-MX')}` : 'Pendiente'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Descripción de la carga */}
            <View style={styles.cardDescripcion}>
                <Text style={styles.labelDescripcion}>Descripción</Text>
                <Text style={styles.textoDescripcion}>
                    {solicitud.descripcion_carga || 'Sin descripción adicional.'}
                </Text>
            </View>

            {/* Fotos del cargamento, si existen */}
            {solicitud.cargamento?.length > 0 && (
                <View style={styles.cardDescripcion}>
                    <Text style={styles.labelDescripcion}>Fotos del cargamento</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {solicitud.cargamento.map((foto: any) => (
                            <TouchableOpacity
                                key={foto.cargamento_id}
                                onPress={() => setFotoAmpliada(foto.foto_url)}
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={{ uri: foto.foto_url }}
                                    style={styles.fotoCargamento}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Modal de foto ampliada */}
            <Modal
                visible={fotoAmpliada !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setFotoAmpliada(null)}
            >
                <TouchableOpacity
                    style={styles.modalFondo}
                    activeOpacity={1}
                    onPress={() => setFotoAmpliada(null)}
                >
                    <Image
                        source={{ uri: fotoAmpliada ?? '' }}
                        style={styles.fotoAmpliada}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        style={styles.botonCerrarModal}
                        onPress={() => setFotoAmpliada(null)}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Aviso si ya fue tomada */}
            {yaTomada && (
                <View style={styles.avisoTomada}>
                    <Ionicons name="alert-circle" size={18} color="#92400E" />
                    <Text style={styles.avisoTomadaTexto}>Esta solicitud ya fue tomada por otro fletero.</Text>
                </View>
            )}

            {/* Botón de aceptar */}
            <TouchableOpacity
                style={[styles.botonAceptar, (yaTomada || aceptando) && styles.botonDeshabilitado]}
                onPress={aceptarSolicitud}
                disabled={yaTomada || aceptando}
                activeOpacity={0.85}
            >
                {aceptando ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.textoBotonAceptar}>
                        {yaTomada ? 'Ya no disponible' : 'Aceptar esta solicitud'}
                    </Text>
                )}
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 16, paddingBottom: 32 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    textoError: { color: '#64748B', fontSize: 14 },

    titulo: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 16, marginTop: 20 },

    card: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    rutaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
    dotVerde: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginTop: 3 },
    dotNaranja: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316', marginTop: 3 },
    lineaVertical: { width: 2, height: 14, backgroundColor: '#E2E8F0', marginLeft: 4, marginVertical: 2 },
    rutaTexto: { fontSize: 14, color: '#0F172A', fontWeight: '500', flex: 1 },
    separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    infoItem: { width: '45%' },
    infoLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
    infoValor: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

    cardDescripcion: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    },
    labelDescripcion: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
    textoDescripcion: { fontSize: 14, color: '#0F172A', lineHeight: 20 },

    avisoTomada: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF4EA', borderRadius: 12, padding: 14, marginBottom: 12,
    },
    avisoTomadaTexto: { fontSize: 13, color: '#92400E', flex: 1 },

    botonAceptar: {
        backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
    },
    botonDeshabilitado: { backgroundColor: '#94A3B8' },
    textoBotonAceptar: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    fotoCargamento: {
        width: 110,
        height: 110,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: '#E2E8F0',
    },
    modalFondo: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fotoAmpliada: {
        width: '100%',
        height: '80%',
    },
    botonCerrarModal: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 8,
    },
});