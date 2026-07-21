import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';
import {
    enviarNotificacion,
    obtenerTokenCliente,
    obtenerTokenFletero,
} from '../../../hooks/useNotificaciones';

export default function ScreenMensajes() {
    const { usuario, esTransportista } = useAuth();
    const params = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const solicitudId = Array.isArray(params.solicitudId)
        ? params.solicitudId[0]
        : params.solicitudId;

    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState('');
    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const flatListRef = useRef(null);

    const miId = esTransportista
        ? usuario?.fletero_id
        : usuario?.usuario_id;

    const miTipo = esTransportista
        ? 'fletero'
        : 'usuario';

    const anchoBurbuja = width < 370
        ? '88%'
        : width >= 768
            ? '70%'
            : '82%';

    useEffect(() => {
        let componenteActivo = true;

        if (!solicitudId) {
            setCargando(false);
            return;
        }

        async function cargarMensajes() {
            try {
                const { data, error } = await supabase
                    .from('mensaje')
                    .select('*')
                    .eq('solicitud_id', solicitudId)
                    .order('enviado_en', { ascending: true });

                if (!componenteActivo) return;

                if (error) {
                    console.log('Error al cargar mensajes:', error);
                    return;
                }

                setMensajes(data ?? []);
            } catch (error) {
                console.log('Error general al cargar mensajes:', error);
            } finally {
                if (componenteActivo) setCargando(false);
            }
        }

        void cargarMensajes();

        const canal = supabase
            .channel(`chat_solicitud_${solicitudId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensaje',
                    filter: `solicitud_id=eq.${solicitudId}`,
                },
                payload => {
                    setMensajes(prev => {
                        const yaExiste = prev.some(
                            mensaje => mensaje.mensaje_id === payload.new.mensaje_id
                        );

                        return yaExiste
                            ? prev
                            : [...prev, payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            componenteActivo = false;
            supabase.removeChannel(canal);
        };
    }, [solicitudId]);

    useEffect(() => {
        if (mensajes.length === 0) return;

        const temporizador = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 120);

        return () => clearTimeout(temporizador);
    }, [mensajes]);

    const enviarMensaje = async () => {
        const contenido = texto.trim();

        if (!contenido || !solicitudId || !miId || enviando) return;

        setEnviando(true);
        setTexto('');

        try {
            const { error } = await supabase
                .from('mensaje')
                .insert({
                    solicitud_id: Number(solicitudId),
                    remitente_tipo: miTipo,
                    remitente_id: miId,
                    contenido,
                });

            if (error) {
                console.log('Error al enviar mensaje:', error);
                setTexto(contenido);
                return;
            }

            try {
                if (miTipo === 'usuario') {
                    const tokenFletero = await obtenerTokenFletero(solicitudId);

                    if (tokenFletero) {
                        await enviarNotificacion(
                            tokenFletero,
                            '💬 Nuevo mensaje',
                            `Tu cliente te escribió: ${contenido.slice(0, 50)}`
                        );
                    }
                } else {
                    const tokenCliente = await obtenerTokenCliente(solicitudId);

                    if (tokenCliente) {
                        await enviarNotificacion(
                            tokenCliente,
                            '💬 Nuevo mensaje de tu fletero',
                            contenido.slice(0, 50)
                        );
                    }
                }
            } catch (errorNotificacion) {
                console.log('No se pudo enviar la notificación:', errorNotificacion);
            }
        } catch (error) {
            console.log('Error general al enviar mensaje:', error);
            setTexto(contenido);
        } finally {
            setEnviando(false);
        }
    };

    const renderMensaje = ({ item }) => {
        const esMio = item.remitente_id === miId;

        const horaMensaje = item.enviado_en
            ? new Date(item.enviado_en).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
            })
            : '';

        return (
            <View style={[styles.burbuja, { maxWidth: anchoBurbuja }, esMio ? styles.burbujaPropia : styles.burbujaAjena,]}>
                {!esMio && (
                    <Text style={styles.remitente}>
                        {item.remitente_tipo === 'fletero' ? 'Fletero' : 'Cliente'}
                    </Text>
                )}

                <Text style={[ styles.textoMensaje, esMio ? styles.textoPropio : styles.textoAjeno,]}>
                    {String(item.contenido ?? '')}
                </Text>

                <Text style={[ styles.hora, esMio ? styles.horaPropia : styles.horaAjena,]}>
                    {horaMensaje}
                </Text>
            </View>
        );
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.centrado} edges={['top', 'bottom']}>
                <ActivityIndicator color="#0B2545" size="large" />
                <Text style={styles.textoCargando}>Cargando conversación...</Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Regresar"
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}> Chat del servicio </Text>
                        <Text style={styles.headerSub} numberOfLines={1}>
                            {esTransportista ? 'Conversación con el cliente' : 'Conversación con tu fletero'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    style={styles.lista}
                    data={mensajes}
                    keyExtractor={item => String(item.mensaje_id)}
                    renderItem={renderMensaje}
                    contentContainerStyle={[
                        styles.listContent,
                        mensajes.length === 0 && styles.listContentEmpty,
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    removeClippedSubviews={false}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    onContentSizeChange={() => {
                        if (mensajes.length > 0) {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }
                    }}
                    ListEmptyComponent={
                        <View style={styles.sinMensajes}>
                            <View style={styles.iconoSinMensajes}>
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={34}
                                    color="#94A3B8"
                                />
                            </View>

                            <Text style={styles.sinMensajesTitulo}>
                                Aún no hay mensajes
                            </Text>

                            <Text style={styles.sinMensajesTexto}>
                                Inicia la conversación para aclarar los detalles del servicio.
                            </Text>
                        </View>
                    }
                />

                <SafeAreaView style={styles.inputSafeArea} edges={['bottom']}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={texto}
                            onChangeText={setTexto}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                            blurOnSubmit={false}
                            scrollEnabled
                        />

                        <TouchableOpacity
                            style={[
                                styles.btnEnviar,
                                (!texto.trim() || enviando) &&
                                styles.btnEnviarDeshabilitado,
                            ]}
                            onPress={enviarMensaje}
                            disabled={!texto.trim() || enviando}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Enviar mensaje"
                        >
                            {enviando ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Ionicons name="send" size={19} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F1F5F9' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#F1F5F9' },
    textoCargando: { marginTop: 12, color: '#64748B', fontSize: 14, textAlign: 'center' },

    headerSafeArea: { backgroundColor: '#071B33', zIndex: 20, elevation: 20 },
    header: { width: '100%', minHeight: 70, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#071B33', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 7 },
    backBtn: { width: 38, height: 38, borderRadius: 19, marginRight: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.14)' },
    headerTextContainer: { flex: 1, minWidth: 0 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'left' },
    headerSub: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontSize: 12 },

    keyboardContainer: { flex: 1, backgroundColor: '#F1F5F9' },
    lista: { flex: 1, backgroundColor: '#F1F5F9' },
    listContent: { flexGrow: 1, width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    listContentEmpty: { justifyContent: 'center' },

    sinMensajes: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
    iconoSinMensajes: { width: 68, height: 68, borderRadius: 34, marginBottom: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
    sinMensajesTitulo: { color: '#334155', fontSize: 16, fontWeight: '700', textAlign: 'center' },
    sinMensajesTexto: { maxWidth: 280, marginTop: 6, color: '#94A3B8', fontSize: 13, lineHeight: 19, textAlign: 'center' },

    burbuja: { minWidth: 60, marginBottom: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 16, overflow: 'visible' },
    burbujaPropia: { alignSelf: 'flex-end', backgroundColor: '#0B2545', borderBottomRightRadius: 4 },
    burbujaAjena: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    remitente: { marginBottom: 2, color: '#64748B', fontSize: 11, fontWeight: '600' },
    textoMensaje: { width: '100%', minWidth: 0, flexShrink: 0, flexWrap: 'wrap', fontSize: 14, lineHeight: 20 },
    textoPropio: { color: '#FFFFFF' },
    textoAjeno: { color: '#0F172A' },
    hora: { marginTop: 4, alignSelf: 'flex-end', fontSize: 10 },
    horaPropia: { color: 'rgba(255,255,255,0.55)' },
    horaAjena: { color: '#94A3B8' },

    inputSafeArea: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 8 },
    inputRow: { width: '100%', maxWidth: 820, minHeight: 68, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: '#FFFFFF' },
    input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 110, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, backgroundColor: '#F1F5F9', color: '#0F172A', fontSize: 14, lineHeight: 20 },
    btnEnviar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#F97316' },
    btnEnviarDeshabilitado: { backgroundColor: '#CBD5E1' },
});