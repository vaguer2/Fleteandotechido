import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enviarNotificacion, obtenerTokenCliente } from '@/hooks/useNotificaciones';
import { supabase } from '../../../../lib/supabase';

export default function ScreenIrAlOrigen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { height } = useWindowDimensions();

    const solicitudId = Array.isArray(params.solicitudId)
        ? params.solicitudId[0]
        : params.solicitudId;

    const [origen, setOrigen] = useState(null);
    const [direccionOrigen, setDireccionOrigen] = useState('');
    const [direccionDestino, setDireccionDestino] = useState('');
    const [precioMostrar, setPrecioMostrar] = useState('');
    const [cargando, setCargando] = useState(true);
    const [yaLlego, setYaLlego] = useState(false);
    const [procesandoLlegada, setProcesandoLlegada] = useState(false);
    const [procesandoInicio, setProcesandoInicio] = useState(false);

    const alturaMapa = Math.min(Math.max(height * 0.3, 190), 260);

    useEffect(() => {
        async function cargarDatos() {
            if (!solicitudId) {
                setCargando(false);
                return;
            }

            try {
                const { data: solicitud, error } = await supabase
                    .from('solicitud')
                    .select('*, punto_ruta(*)')
                    .eq('solicitud_id', solicitudId)
                    .single();

                if (error || !solicitud) {
                    console.log('Error al traer la solicitud:', error);
                    return;
                }

                const puntoOrigen = solicitud.punto_ruta?.find(
                    punto => punto.tipo === 'origen'
                );

                const puntoDestino = solicitud.punto_ruta?.find(
                    punto => punto.tipo === 'destino'
                );

                if (puntoOrigen) {
                    setOrigen({
                        latitude: Number(puntoOrigen.latitud),
                        longitude: Number(puntoOrigen.longitud),
                    });

                    setDireccionOrigen(
                        puntoOrigen.direccion_texto ?? 'Dirección no disponible'
                    );
                }

                setDireccionDestino(
                    puntoDestino?.direccion_texto ?? 'Destino no disponible'
                );

                const precio = solicitud.precio_ajustado ?? solicitud.precio_base;

                setPrecioMostrar(
                    precio !== null && precio !== undefined
                        ? `$${Number(precio).toLocaleString('es-MX')} MXN`
                        : '—'
                );
            } catch (error) {
                console.log('Error al cargar los datos:', error);
            } finally {
                setCargando(false);
            }
        }

        cargarDatos();
    }, [solicitudId]);

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

                        try {
                            const tokenCliente = await obtenerTokenCliente(solicitudId);

                            if (tokenCliente) {
                                await enviarNotificacion(
                                    tokenCliente,
                                    '¡Tu fletero llegó!',
                                    'Tu fletero ya se encuentra en el punto de recogida cargando tu mercancía.'
                                );
                            }

                            setYaLlego(true);
                        } catch (error) {
                            console.log('Error al confirmar llegada:', error);

                            Alert.alert(
                                'Aviso',
                                'Se confirmó tu llegada, pero no se pudo enviar la notificación.'
                            );

                            setYaLlego(true);
                        } finally {
                            setProcesandoLlegada(false);
                        }
                    },
                },
            ]
        );
    };

    const iniciarServicio = () => {
        if (!solicitudId) {
            Alert.alert('Error', 'No se encontró la solicitud activa.');
            return;
        }

        Alert.alert(
            '¿Iniciar recorrido?',
            '¿Confirmas que ya cargaste todo y estás listo para salir hacia el destino?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, iniciar',
                    onPress: async () => {
                        setProcesandoInicio(true);

                        try {
                            const { error } = await supabase
                                .from('solicitud')
                                .update({
                                    estado: 'en_progreso',
                                    hora_inicio: new Date().toISOString(),
                                })
                                .eq('solicitud_id', solicitudId);

                            if (error) {
                                console.log('Error al iniciar servicio:', error);

                                Alert.alert(
                                    'Error',
                                    'No se pudo iniciar el servicio. Intenta de nuevo.'
                                );

                                return;
                            }

                            const tokenCliente = await obtenerTokenCliente(solicitudId);

                            if (tokenCliente) {
                                await enviarNotificacion(
                                    tokenCliente,
                                    'Tu flete está en camino',
                                    'Tu cargamento ya salió hacia el destino. Puedes rastrearlo en tiempo real.'
                                );
                            }

                            router.replace('/Screen/Home/ScreenHomeFletero');
                        } catch (error) {
                            console.log('Error general al iniciar servicio:', error);

                            Alert.alert(
                                'Error',
                                'Ocurrió un problema al iniciar el recorrido.'
                            );
                        } finally {
                            setProcesandoInicio(false);
                        }
                    },
                },
            ]
        );
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.centrado} edges={['top', 'bottom']}>
                <ActivityIndicator color="#F97316" size="large" />
                <Text style={styles.textoCargando}>
                    Cargando información del servicio...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            Dirígete al origen
                        </Text>

                        <Text style={styles.headerSub} numberOfLines={2}>
                            Recoge la carga y confirma cuando estés listo
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.mapaContainer, { height: alturaMapa }]}>
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
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={styles.markerPin}>
                                        <Ionicons
                                            name="location-sharp"
                                            size={18}
                                            color="#FFFFFF"
                                        />
                                    </View>

                                    <View style={styles.markerTip} />
                                </View>
                            </Marker>
                        </MapView>
                    ) : (
                        <View style={styles.sinMapa}>
                            <Ionicons name="map-outline" size={32} color="#94A3B8" />
                            <Text style={styles.sinMapaTexto}>No se pudo cargar el mapa</Text>
                        </View>
                    )}
                </View>

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

                        <Text
                            style={styles.valorPrecio}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {precioMostrar}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.btnChat}
                        onPress={() =>
                            router.push(
                                `/Screen/Mensaje/ScreenMensajes?solicitudId=${solicitudId}`
                            )
                        }
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={20}
                            color="#FFFFFF"
                        />

                        <Text style={styles.btnChatTexto}>Chatear con el cliente</Text>
                    </TouchableOpacity>

                    {!yaLlego ? (
                        <TouchableOpacity
                            style={[
                                styles.btnLlegue,
                                procesandoLlegada && styles.botonProcesando,
                            ]}
                            onPress={confirmarLlegada}
                            disabled={procesandoLlegada}
                            activeOpacity={0.85}
                        >
                            {procesandoLlegada ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text
                                    style={styles.btnTexto}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    Ya llegué al punto de recogida
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.btnIniciar,
                                procesandoInicio && styles.botonProcesando,
                            ]}
                            onPress={iniciarServicio}
                            disabled={procesandoInicio}
                            activeOpacity={0.85}
                        >
                            {procesandoInicio ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.btnTexto} numberOfLines={2}>
                                    Ya cargué todo — Iniciar recorrido
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#FFFFFF' },
    textoCargando: { marginTop: 12, color: '#64748B', fontSize: 14, textAlign: 'center' },

    headerSafeArea: { backgroundColor: '#071B33', zIndex: 20, elevation: 20 },
    header: { width: '100%', minHeight: 70, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#071B33', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 7 },
    backBtn: { width: 38, height: 38, borderRadius: 19, marginRight: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.14)' },
    headerTextContainer: { flex: 1, minWidth: 0 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'left' },
    headerSub: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 16 },

    scroll: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1, paddingBottom: 16 },
    mapaContainer: { width: '100%', minHeight: 190, maxHeight: 260, overflow: 'hidden', backgroundColor: '#F1F5F9' },
    mapa: { flex: 1 },
    sinMapa: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9' },
    sinMapaTexto: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },

    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerPin: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 6 },
    markerTip: { width: 12, height: 12, marginTop: -6, backgroundColor: '#22C55E', borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#FFFFFF', transform: [{ rotate: '45deg' }] },

    card: { width: 'auto', marginHorizontal: 12, marginTop: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    labelSeccion: { marginBottom: 6, color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    filaDir: { width: '100%', flexDirection: 'row', alignItems: 'flex-start' },
    dotVerde: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 10, flexShrink: 0, backgroundColor: '#22C55E' },
    dotNaranja: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 10, flexShrink: 0, backgroundColor: '#F97316' },
    direccionTexto: { flex: 1, minWidth: 0, color: '#0F172A', fontSize: 13, lineHeight: 18, fontWeight: '500' },
    separador: { height: 1, marginVertical: 12, backgroundColor: '#E2E8F0' },
    filaPrecio: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    labelPrecio: { flexShrink: 1, color: '#64748B', fontSize: 13 },
    valorPrecio: { maxWidth: '60%', color: '#F97316', fontSize: 16, fontWeight: '700', textAlign: 'right' },

    footerSafeArea: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    footer: { width: '100%', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 10, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 8 },
    btnChat: { width: '100%', minHeight: 48, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0B2545' },
    btnChatTexto: { flexShrink: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    btnLlegue: { width: '100%', minHeight: 52, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' },
    btnIniciar: { width: '100%', minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E' },
    botonProcesando: { opacity: 0.7 },
    btnTexto: { width: '100%', color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});