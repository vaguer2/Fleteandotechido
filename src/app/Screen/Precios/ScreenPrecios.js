import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../../lib/supabase';

const NAVY = '#1B2A4A';
const ORANGE = '#F97316';
const ORANGE_LIGHT = '#FFF0E6';
const BORDER = '#E5E7EB';
const GRAY = '#6B7280';
const WHITE = '#FFFFFF';
const BG = '#F5F7FA';

const MARGEN = 0.15;

export default function ScreenPrecios() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const solicitudId = params.solicitudId;
    const precioBase = Number(params.precioBase) || 1000;

    const minPrecio = Math.round(precioBase * (1 - MARGEN));
    const maxPrecio = Math.round(precioBase * (1 + MARGEN));

    const [precio, setPrecio] = useState(precioBase);
    const [guardando, setGuardando] = useState(false);

    const porcentaje = (precio - precioBase) / precioBase * 100;
    const signo = porcentaje >= 0 ? '+' : '';

    const confirmarPrecio = async () => {
        if (!solicitudId) {
            Alert.alert('Error', 'No se encontró la solicitud.');
            return;
        }

        setGuardando(true);
        try {
            const { error } = await supabase
                .from('solicitud')
                .update({ precio_ajustado: precio })
                .eq('solicitud_id', solicitudId);

            if (error) {
                console.log('Error al guardar precio:', error);
                Alert.alert('Error', 'No se pudo guardar tu precio. Intenta de nuevo.');
                return;
            }

            router.push({
                pathname: '/Screen/Pedido/ScreenConfirmarPedido',
                params: { solicitudId },
            });

        } catch (err) {
            console.log('Error general:', err);
            Alert.alert('Error', 'Ocurrió un problema al guardar tu precio.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <View style={s.screen}>

            <View style={s.header}>
                <Text style={s.headerTitle}>¿Cuánto quieres pagar?</Text>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

                <View style={s.card}>
                    <Text style={s.cardTitle}>Ajusta tu oferta</Text>
                    <Text style={s.cardSub}>Puedes ofrecer hasta 15% más o menos del precio base</Text>

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
                        <Text style={s.propuestaLabel}>Tu oferta</Text>
                        <Text style={s.propuestaMonto}>${precio} MXN</Text>
                        <Text style={s.propuestaDelta}>
                            {signo}{porcentaje.toFixed(1)}% sobre el precio base
                        </Text>
                    </View>
                </View>

                <View style={s.infoCard}>
                    <Text style={s.infoTexto}>
                        Los fleteros disponibles verán tu oferta y podrán aceptarla. Ofrecer un precio más alto puede ayudarte a encontrar fletero más rápido.
                    </Text>
                </View>

            </ScrollView>

            <View style={s.footer}>
                <TouchableOpacity style={s.btnEnviar} onPress={confirmarPrecio} activeOpacity={0.85} disabled={guardando}>
                    {guardando
                        ? <ActivityIndicator color={WHITE} />
                        : <Text style={s.btnEnviarTxt}>Continuar con ${precio} MXN</Text>
                    }
                </TouchableOpacity>
            </View>

        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG },
    header: { backgroundColor: NAVY, paddingTop: Platform.OS === 'ios' ? 54 : 28, paddingBottom: 18, paddingHorizontal: 20 },
    headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 24, gap: 12 },
    card: { backgroundColor: WHITE, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
    cardSub: { fontSize: 13, color: GRAY, marginTop: 3, marginBottom: 14 },
    baseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    baseLabel: { fontSize: 13, color: GRAY },
    baseValor: { fontSize: 14, fontWeight: '700', color: '#111827' },
    limitsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    limitTxt: { fontSize: 12, color: GRAY },
    slider: { width: '100%', height: 40, marginVertical: 4 },
    propuestaBox: { backgroundColor: ORANGE_LIGHT, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
    propuestaLabel: { fontSize: 13, color: ORANGE, fontWeight: '600' },
    propuestaMonto: { fontSize: 34, fontWeight: '900', color: ORANGE, marginVertical: 4 },
    propuestaDelta: { fontSize: 12, color: '#D97706' },
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14 },
    infoTexto: { fontSize: 12, color: '#1E40AF', lineHeight: 17 },
    footer: { backgroundColor: WHITE, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: BORDER },
    btnEnviar: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
    btnEnviarTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },
});