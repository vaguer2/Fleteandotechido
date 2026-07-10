import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../../../lib/supabase';
import { enviarNotificacion, obtenerTokenCliente } from '@/hooks/useNotificaciones';

export default function ScreenIrAlOrigen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const solicitudId = params.solicitudId;

    const [origen, setOrigen] = useState(null);
    const [direccionOrigen, setDireccionOrigen] = useState('');
    const [direccionDestino, setDireccionDestino] = useState('');
    const [precioMostrar, setPrecioMostrar] = useState('');
    const [cargando, setCargando] = useState(true);
    const [iniciando, setIniciando] = useState(false);

    // Estados de los dos botones
    const [yaLlego, setYaLlego] = useState(false);
    const [procesandoLlegada, setProcesandoLlegada] = useState(false);
    const [procesandoInicio, setProcesandoInicio] = useState(false);

    useEffect(() => {
        async function cargarDatos() {
            if (!solicitudId) {
                setCargando(false);
                return;
            }

            const { data: solicitud, error } = await supabase
                .from('solicitud')
                .select('*, punto_ruta(*)')
                .eq('solicitud_id', solicitudId)
                .single();

            if (error || !solicitud) {
                //console.log('Error al traer la solicitud:', error);
                setCargando(false);
                return;
            }

            const puntoOrigen = solicitud.punto_ruta?.find((p) => p.tipo === 'origen');
            const puntoDestino = solicitud.punto_ruta?.find((p) => p.tipo === 'destino');

            if (puntoOrigen) {
                setOrigen({ latitude: puntoOrigen.latitud, longitude: puntoOrigen.longitud });
                setDireccionOrigen(puntoOrigen.direccion_texto ?? 'Dirección no disponible');
            }
            if (puntoDestino) {
                setDireccionDestino(puntoDestino.direccion_texto ?? 'Destino no disponible');
            }

            const precio = solicitud.precio_ajustado ?? solicitud.precio_base;
            setPrecioMostrar(precio ? `$${precio} MXN` : '—');

            setCargando(false);
        }

        cargarDatos();
    }, [solicitudId]);

    // Botón 1: "Ya llegué al punto de recogida"
    const confirmarLlegada = () => {
        Alert.alert(
            '¿Ya llegaste?',
            '¿Confirmas que llegaste al punto de recogida con el cliente?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, ya llegué',
                    onPress: async () => {
                        setProcesandoLlegada(true);
                        // Aquí después agregaremos la notificación al cliente
                        
                        const tokenCliente = await obtenerTokenCliente(solicitudId);
                        await enviarNotificacion(
                            tokenCliente,
                            '¡Tu fletero llegó!',
                            'Tu fletero ya esta en camino en el punto de recogida cargando tu mercancia.'
                        )

                        setYaLlego(true);
                        setProcesandoLlegada(false);
                    }
                }
            ]
        );
    };

    // Botón 2: "Ya cargué todo — Iniciar recorrido"
    const iniciarServicio = async () => {
        if (!solicitudId) return;

        Alert.alert(
            '¿Iniciar recorrido?',
            '¿Confirmas que ya cargaste todo y estás listo para salir hacia el destino?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, iniciar',
                    onPress: async () => {
                        setProcesandoInicio(true);
                        const { error } = await supabase
                            .from('solicitud')
                            .update({
                                estado: 'en_progreso',
                                hora_inicio: new Date().toISOString(),
                            })
                            .eq('solicitud_id', solicitudId);

                        if (error) {
                            //console.log('Error al iniciar servicio:', error);
                            Alert.alert('Error', 'No se pudo iniciar el servicio. Intenta de nuevo.');
                            setProcesandoInicio(false);
                            return;
                        }
                        const tokenCliente = await obtenerTokenCliente(solicitudId);
                        await enviarNotificacion(
                            tokenCliente,
                            'Tu flete esta en camino',
                            'Tu cargamento ya salió hacia el destino. Puedes rastrearlo en tiempo real.'
                        )

                        setProcesandoInicio(false);
                        // Aquí después agregaremos la notificación al cliente
                        router.replace('/Screen/Home/ScreenHomeFletero');
                    }
                }
            ]
        );
    };

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator color="#f97316" size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>‹</Text>
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Dirígete al origen</Text>
                    <Text style={styles.headerSub}>Recoge la carga y confirma cuando estés listo</Text>
                </View>
            </View>

            {/* Mapa */}
            <View style={styles.mapaContainer}>
                {origen ? (
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={styles.mapa}
                        initialRegion={{
                            latitude: origen.latitude,
                            longitude: origen.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Marker
                            coordinate={origen}
                            title="Punto de recogida"
                            description={direccionOrigen}
                            pinColor="green"
                        />
                    </MapView>
                ) : (
                    <View style={styles.sinMapa}>
                        <Text style={styles.sinMapaTexto}>No se pudo cargar el mapa</Text>
                    </View>
                )}
            </View>

            {/* Tarjeta de información */}
            <View style={styles.card}>
                <Text style={styles.labelSeccion}>PUNTO DE RECOGIDA</Text>
                <View style={styles.filaDir}>
                    <View style={styles.dotVerde} />
                    <Text style={styles.direccionTexto}>{direccionOrigen}</Text>
                </View>

                <View style={styles.separador} />

                <Text style={styles.labelSeccion}>DESTINO FINAL DEL FLETE</Text>
                <View style={styles.filaDir}>
                    <View style={styles.dotNaranja} />
                    <Text style={styles.direccionTexto}>{direccionDestino}</Text>
                </View>

                <View style={styles.separador} />

                <View style={styles.filaPrecio}>
                    <Text style={styles.labelPrecio}>Precio acordado</Text>
                    <Text style={styles.valorPrecio}>{precioMostrar}</Text>
                </View>
            </View>

            {/* Botones */}
            <View style={styles.footer}>

                {/* Botón de chat */}
                <TouchableOpacity
                    style={styles.btnChat}
                    onPress={() => router.push(`/Screen/Mensaje/ScreenMensajes?solicitudId=${solicitudId}`)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnChatTexto}>💬 Chatear con el cliente</Text>
                </TouchableOpacity>

                {/* Botón 1: Ya llegué — desaparece cuando yaLlego = true */}
                {!yaLlego && (
                    <TouchableOpacity
                        style={styles.btnLlegue}
                        onPress={confirmarLlegada}
                        disabled={procesandoLlegada}
                        activeOpacity={0.85}
                    >
                        {procesandoLlegada
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnTexto}>Ya llegué al punto de recogida</Text>
                        }
                    </TouchableOpacity>
                )}

                {/* Botón 2: Iniciar recorrido — aparece cuando yaLlego = true */}
                {yaLlego && (
                    <TouchableOpacity
                        style={styles.btnIniciar}
                        onPress={iniciarServicio}
                        disabled={procesandoInicio}
                        activeOpacity={0.85}
                    >
                        {procesandoInicio
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnTexto}>Ya cargué todo — Iniciar recorrido</Text>
                        }
                    </TouchableOpacity>
                )}

            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#0b2545',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: Platform.OS === 'ios' ? 54 : 28,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { color: '#fff', fontSize: 24, lineHeight: 28 },
    headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    mapaContainer: { height: 240 },
    mapa: { flex: 1 },
    sinMapa: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    sinMapaTexto: { color: '#94a3b8', fontSize: 13 },
    card: {
        margin: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    labelSeccion: {
        fontSize: 10, fontWeight: '700', color: '#94a3b8',
        letterSpacing: 0.8, marginBottom: 6,
    },
    filaDir: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    dotVerde: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', marginTop: 3 },
    dotNaranja: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f97316', marginTop: 3 },
    direccionTexto: { fontSize: 13, color: '#0f172a', fontWeight: '500', flex: 1, lineHeight: 18 },
    separador: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
    filaPrecio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    labelPrecio: { fontSize: 13, color: '#64748b' },
    valorPrecio: { fontSize: 16, fontWeight: '700', color: '#f97316' },
    footer: {
        padding: 14,
        paddingBottom: Platform.OS === 'ios' ? 32 : 14,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backgroundColor: '#fff',
        gap: 10,
    },
    btnChat: {
        backgroundColor: '#0b2545',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
    },
    btnChatTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
    btnLlegue: {
        backgroundColor: '#2563eb',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    btnIniciar: {
        backgroundColor: '#22c55e',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    btnTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
});