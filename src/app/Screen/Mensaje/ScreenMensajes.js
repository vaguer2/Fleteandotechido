import { useEffect, useRef, useState } from 'react';
import {ActivityIndicator,FlatList,KeyboardAvoidingView,Platform,StyleSheet,Text,TextInput,TouchableOpacity,View,} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

export default function ScreenMensajes() {
    const { usuario, esTransportista } = useAuth();
    const params = useLocalSearchParams();
    const router = useRouter();
    const solicitudId = params.solicitudId;

    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState('');
    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const flatListRef = useRef(null);

    // ID del usuario actual según su rol
    const miId = esTransportista ? usuario?.fletero_id : usuario?.usuario_id;
    const miTipo = esTransportista ? 'fletero' : 'usuario';

    useEffect(() => {
        if (!solicitudId) return;

        // 1. Cargar historial de mensajes
        async function cargarMensajes() {
            const { data, error } = await supabase
                .from('mensaje')
                .select('*')
                .eq('solicitud_id', solicitudId)
                .order('enviado_en', { ascending: true });

            if (error) {
                console.log('Error al cargar mensajes:', error);
            } else {
                setMensajes(data ?? []);
            }
            setCargando(false);
        }

        cargarMensajes();

        // 2. Suscripción Realtime — mensajes nuevos aparecen al instante
        const canal = supabase
            .channel(`chat_solicitud_${solicitudId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensaje',
                    filter: `solicitud_id=eq.${solicitudId}`
                },
                (payload) => {
                    setMensajes((prev) => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canal);
        };
    }, [solicitudId]);

    // Scroll automático al último mensaje
    useEffect(() => {
        if (mensajes.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [mensajes]);

    const enviarMensaje = async () => {
        const contenido = texto.trim();
        if (!contenido || !solicitudId || !miId) return;

        setEnviando(true);
        setTexto('');

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
            setTexto(contenido); // restaurar si falló
        }

        setEnviando(false);
    };

    const renderMensaje = ({ item }) => {
        const esMio = item.remitente_id === miId;

        return (
            <View style={[styles.burbuja, esMio ? styles.burbujaPropia : styles.burbujaAjena]}>
                {!esMio && (
                    <Text style={styles.remitente}>
                        {item.remitente_tipo === 'fletero' ? 'Fletero' : 'Cliente'}
                    </Text>
                )}
                <Text style={[styles.textoMensaje, esMio ? styles.textoPropio : styles.textoAjeno]}>
                    {item.contenido}
                </Text>
                <Text style={[styles.hora, esMio ? styles.horaPropia : styles.horaAjena]}>
                    {new Date(item.enviado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator color="#0b2545" size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>‹</Text>
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Chat del servicio</Text>
                </View>
            </View>

            {/* Lista de mensajes */}
            <FlatList
                ref={flatListRef}
                data={mensajes}
                keyExtractor={(item) => String(item.mensaje_id)}
                renderItem={renderMensaje}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.sinMensajes}>
                        <Text style={styles.sinMensajesTexto}>
                            Aún no hay mensajes. ¡Inicia la conversación!
                        </Text>
                    </View>
                }
            />

            {/* Input de texto */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={texto}
                    onChangeText={setTexto}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    maxLength={500}
                    onSubmitEditing={enviarMensaje}
                />
                <TouchableOpacity
                    style={[styles.btnEnviar, (!texto.trim() || enviando) && styles.btnEnviarDeshabilitado]}
                    onPress={enviarMensaje}
                    disabled={!texto.trim() || enviando}
                    activeOpacity={0.85}
                >
                    {enviando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnEnviarTexto}>➤</Text>
                    }
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
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
        marginTop:40
    },
    backArrow: { color: '#fff', fontSize: 24, lineHeight: 28 },
    headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop:40 },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

    listContent: { padding: 16, paddingBottom: 8, gap: 8 },

    sinMensajes: { flex: 1, alignItems: 'center', marginTop: 60 },
    sinMensajesTexto: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },

    burbuja: {
        maxWidth: '75%',
        borderRadius: 16,
        padding: 10,
        paddingHorizontal: 14,
    },
    burbujaPropia: {
        alignSelf: 'flex-end',
        backgroundColor: '#0b2545',
        borderBottomRightRadius: 4,
    },
    burbujaAjena: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    remitente: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 2 },
    textoMensaje: { fontSize: 14, lineHeight: 20 },
    textoPropio: { color: '#fff' },
    textoAjeno: { color: '#0f172a' },
    hora: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    horaPropia: { color: 'rgba(255,255,255,0.5)' },
    horaAjena: { color: '#94a3b8' },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
        maxHeight: 100,
    },
    btnEnviar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#f97316',
        alignItems: 'center', justifyContent: 'center',
    },
    btnEnviarDeshabilitado: { backgroundColor: '#cbd5e1' },
    btnEnviarTexto: { color: '#fff', fontSize: 18 },
});