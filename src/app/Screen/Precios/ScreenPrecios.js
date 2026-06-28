import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';

const NAVY = '#1B2A4A';
const ORANGE = '#F97316';
const ORANGE_LIGHT = '#FFF0E6';
const BORDER = '#E5E7EB';
const GRAY = '#6B7280';
const WHITE = '#FFFFFF';
const BG = '#F5F7FA';

const MARGEN = 0.15;

// TODO: Cambia esta URL por la de tu API
const API_URL = 'https://tu-api.com';

export default function ScreenPrecios({ route, navigation }) {
    // TODO: Asegúrate de pasar solicitudId desde la pantalla anterior
    const solicitudId = route?.params?.solicitudId;
    const precioBase = route?.params?.precioBase ?? 520;

    const minPrecio = Math.round(precioBase * (1 - MARGEN));
    const maxPrecio = Math.round(precioBase * (1 + MARGEN));

    const [precio, setPrecio] = useState(precioBase);
    const [tiempo, setTiempo] = useState('45 minutos');
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);

    const porcentaje = (precio - precioBase) / precioBase * 100;
    const signo = porcentaje >= 0 ? '+' : '';

    // ── Envío al backend ─────────────────────────────────────────────────────────
    const enviarPropuesta = useCallback(async () => {
        try {
            setEnviando(true);

            // TODO: Ajusta el endpoint y el body según tu backend
            const res = await fetch(`${API_URL}/propuestas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // TODO: Agrega tu token de autenticación
                    // 'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    solicitud_id: solicitudId,  // TODO: ajusta el nombre del campo
                    precio,
                    tiempo_estimado: tiempo,    // TODO: ajusta el nombre del campo
                    mensaje,
                }),
            });

            if (!res.ok) throw new Error('Error al enviar la propuesta');

            const data = await res.json();

            // Navega a ScreenPropuesta pasando el ID devuelto por el backend
            navigation?.navigate('Propuesta', {
                propuestaId: data.id,         // TODO: ajusta según respuesta de tu API
                precioBase,
            });

        } catch (err) {
            Alert.alert('Error', err.message ?? 'No se pudo enviar la propuesta');
        } finally {
            setEnviando(false);
        }
    }, [precio, tiempo, mensaje, solicitudId, navigation, precioBase]);

    
    return (
        <View style={s.screen}>

            <View style={s.header}>
                <Text style={s.headerTitle}>Enviar propuesta</Text>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

                <View style={s.card}>
                    <Text style={s.cardTitle}>Define tu precio</Text>
                    <Text style={s.cardSub}>Puedes ajustar 15% del precio base</Text>

                    <View style={s.baseRow}>
                        <Text style={s.baseLabel}>Precio base (tabulador)</Text>
                        <Text style={s.baseValor}>${precioBase} MXN</Text>
                    </View>

                    <View style={s.limitsRow}>
                        <Text style={s.limitTxt}>Mínimo: ${minPrecio}</Text>
                        <Text style={s.limitTxt}>Máximo: ${maxPrecio}</Text>
                    </View>

                    <Slider
                        style={s.slider}
                        minimumValue={minPrecio}
                        maximumValue={maxPrecio}
                        step={1}
                        value={precio}
                        onValueChange={v => setPrecio(Math.round(v))}
                        minimumTrackTintColor={ORANGE}
                        maximumTrackTintColor={BORDER}
                        thumbTintColor={ORANGE}
                    />

                    <View style={s.propuestaBox}>
                        <Text style={s.propuestaLabel}>Tu precio propuesto</Text>
                        <Text style={s.propuestaMonto}>${precio} MXN</Text>
                        <Text style={s.propuestaDelta}>
                            {signo}{porcentaje.toFixed(1)}% sobre el precio base
                        </Text>
                    </View>
                </View>

                <View style={s.campoCard}>
                    <Text style={s.campoLabel}>Tiempo estimado de servicio</Text>
                    <TextInput
                        style={s.campoInput}
                        value={tiempo}
                        onChangeText={setTiempo}
                        placeholder="Ej. 45 minutos"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={s.campoCard}>
                    <Text style={s.campoLabel}>Mensaje al cliente (opcional)</Text>
                    <TextInput
                        style={[s.campoInput, s.textarea]}
                        value={mensaje}
                        onChangeText={setMensaje}
                        placeholder="Ej: Cuento con ayudante, no se preocupe..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

            </ScrollView>

            <View style={s.footer}>
                <TouchableOpacity style={s.btnEnviar} onPress={enviarPropuesta} activeOpacity={0.85} disabled={enviando}>
                    {enviando
                        ? <ActivityIndicator color={WHITE} />
                        : <Text style={s.btnEnviarTxt}>Enviar propuesta · ${precio} MXN</Text>
                    }
                </TouchableOpacity>
            </View>

        </View>
    );
}

const s = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: BG
    },
    header: { 
        backgroundColor: NAVY, 
        paddingTop: Platform.OS === 'ios' ? 54 : 28, 
        paddingBottom: 18, 
        paddingHorizontal: 20 
    },
    headerTitle: { 
        color: WHITE, 
        fontSize: 18, 
        fontWeight: '700', 
        textAlign: 'center' 
    },
    scroll: {
         flex: 1 
        },
    scrollContent: { 
        padding: 16, 
        paddingBottom: 24, 
        gap: 12 
    },
    card: { 
        backgroundColor: WHITE, 
        borderRadius: 16, 
        padding: 20, 
        shadowColor: '#000', 
        shadowOpacity: 0.06, 
        shadowRadius: 8, 
        elevation: 2 
    },
    cardTitle: { 
        fontSize: 17, 
        fontWeight: '800', 
        color: '#111827' 
    },
    cardSub: { 
        fontSize: 13, 
        color: GRAY, 
        marginTop: 3, 
        marginBottom: 14 
    },
    baseRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    baseLabel: { 
        fontSize: 13, 
        color: GRAY 
    },
    baseValor: { 
        fontSize: 14, 
        fontWeight: '700', 
        color: '#111827' 
    },
    limitsRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 8 
    },
    limitTxt: { 
        fontSize: 12, 
        color: GRAY 
    },
    slider: {
         width: '100%', 
         height: 40, 
         marginVertical: 4 
        },
    propuestaBox: { 
        backgroundColor: ORANGE_LIGHT, 
        borderRadius: 12, 
        padding: 18, 
        alignItems: 'center', 
        marginTop: 8 
    },
    propuestaLabel: { 
        fontSize: 13, 
        color: ORANGE, 
        fontWeight: '600' 
    },
    propuestaMonto: { 
        fontSize: 34, 
        fontWeight: '900', 
        color: ORANGE, 
        marginVertical: 4 
    },
    propuestaDelta: { 
        fontSize: 12, 
        color: '#D97706' 
    },
    campoCard: { 
        backgroundColor: WHITE, 
        borderRadius: 16, 
        padding: 16, 
        shadowColor: '#000', 
        shadowOpacity: 0.04, 
        shadowRadius: 6, 
        elevation: 1 
    },
    campoLabel: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: 8 
    },
    campoInput: { 
        borderWidth: 1.5, 
        borderColor: BORDER, 
        borderRadius: 10, 
        paddingHorizontal: 14, 
        paddingVertical: 11, 
        fontSize: 14, 
        color: '#111827', 
        backgroundColor: BG 
    },
    textarea: { 
        minHeight: 80, 
        paddingTop: 11 
    },
    footer: { 
        backgroundColor: WHITE, 
        padding: 16, 
        paddingBottom: Platform.OS === 'ios' ? 32 : 16, 
        borderTopWidth: 1, 
        borderTopColor: BORDER 
    },
    btnEnviar: { 
        backgroundColor: ORANGE, 
        borderRadius: 14, 
        paddingVertical: 16, 
        alignItems: 'center', 
        shadowColor: ORANGE, 
        shadowOpacity: 0.35, 
        shadowRadius: 10, 
        elevation: 4 
    },
    btnEnviarTxt: { 
        color: WHITE, 
        fontSize: 16, 
        fontWeight: '800' 
    },
});