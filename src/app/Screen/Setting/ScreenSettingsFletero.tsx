import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

type MenuItem = { id: string; label: string; onPress: () => void };

export default function ScreenSettingsFletero() {
    const { usuario: fletero } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const [errorFoto, setErrorFoto] = useState(false);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const pantallaPequena = width < 370;

    const menuItems: MenuItem[] = [
        { id: 'datos', label: 'Datos personales', onPress: () => router.push('/Screen/Setting/ScreenSubirDatosFletero' as any) },
        { id: 'vehiculo', label: 'Datos del vehículo', onPress: () => router.push('/Screen/Setting/ScreenSubirVehiculo' as any) },
        {
            id: 'documentos',
            label: 'Mis documentos',
            onPress: () => {
                if (!fletero?.fletero_id) {
                    Alert.alert('Perfil no disponible', 'No se pudo identificar el perfil del fletero.');
                    return;
                }

                router.push({
                    pathname: '/Screen/Setting/ScreenMisDocumentosFletero',
                    params: { fleteroId: String(fletero.fletero_id) },
                } as any);
            },
        },
        { id: 'historial', label: 'Historial', onPress: () => router.push('/Screen/Historial/ScreenHistorialFletero' as any) },
        { id: 'ayuda', label: 'Ayuda y soporte', onPress: () => router.push('/Screen/Setting/ScreenAyudaYSoporte' as any) },
    ];

    const perfil = {
        nombre: fletero?.nombre?.trim() || 'Sin nombre',
        correo: fletero?.email?.trim() || 'Sin correo',
        fotoUrl: fletero?.foto_url?.trim() || null,
        fletes: fletero?.total_servicios ?? 0,
        calificacion:
            fletero?.calificacion_promedio !== null && fletero?.calificacion_promedio !== undefined
                ? Number(fletero.calificacion_promedio).toFixed(1)
                : '0.0',
        vehiculo: fletero?.tipo_vehiculo || 'Por definir',
        verificado: fletero?.verificado ?? false,
    };

    const inicial = perfil.nombre.charAt(0).toUpperCase() || 'F';

    useEffect(() => {
        setErrorFoto(false);
    }, [perfil.fotoUrl]);

    const ejecutarCierreSesion = async (): Promise<void> => {
        if (cerrandoSesion) return;

        setCerrandoSesion(true);

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.log('Error al cerrar sesión:', error);
                Alert.alert('Error', 'No se pudo cerrar la sesión. Intenta nuevamente.');
            }
        } catch (error) {
            console.log('Error general al cerrar sesión:', error);
            Alert.alert('Error', 'Ocurrió un problema al cerrar la sesión.');
        } finally {
            setCerrandoSesion(false);
        }
    };

    const cerrarSesion = (): void => {
        if (cerrandoSesion) return;

        Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar tu sesión?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: ejecutarCierreSesion },
        ]);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.avatarButton}
                        activeOpacity={0.85}
                        onPress={() => router.push('/Screen/Setting/ScreenSubirDatosFletero' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Editar datos personales del fletero"
                    >
                        <View style={styles.avatarCircle}>
                            {perfil.fotoUrl && !errorFoto ? (
                                <Image
                                    source={{ uri: perfil.fotoUrl }}
                                    style={styles.avatarImagen}
                                    resizeMode="cover"
                                    onError={() => setErrorFoto(true)}
                                />
                            ) : (
                                <Text style={styles.avatarLetra}>{inicial}</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.nombreRow}>
                        <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                            {perfil.nombre}
                        </Text>

                        {perfil.verificado && (
                            <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#22C55E"
                                style={styles.iconoVerificado}
                                accessibilityLabel="Fletero verificado"
                            />
                        )}
                    </View>

                    <Text style={styles.correo} numberOfLines={1}>{perfil.correo}</Text>

                    {!perfil.verificado && (
                        <View style={styles.badgePendiente}>
                            <Text style={styles.badgePendienteTexto} numberOfLines={2}>
                                Perfil pendiente de verificación
                            </Text>
                        </View>
                    )}

                    <View style={[styles.statsRow, pantallaPequena && styles.statsRowPequena]}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {perfil.fletes}
                            </Text>
                            <Text style={styles.statLabel} numberOfLines={1}>Fletes</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {perfil.calificacion}
                            </Text>
                            <Text style={styles.statLabel} numberOfLines={1}>Calificación</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                {perfil.vehiculo}
                            </Text>
                            <Text style={styles.statLabel} numberOfLines={1}>Vehículo</Text>
                        </View>
                    </View>
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
                        <View style={styles.menuCard}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
                                    activeOpacity={0.7}
                                    onPress={item.onPress}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.label}
                                >
                                    <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                                    <Text style={styles.menuArrow}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.cerrarSesion, cerrandoSesion && styles.cerrarSesionDeshabilitado]}
                            onPress={cerrarSesion}
                            disabled={cerrandoSesion}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar sesión"
                        >
                            <Text style={styles.cerrarSesionTexto}>
                                {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.footer}>© 2026 FleteandoTe. Todos los derechos reservados.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    headerSafeArea: { backgroundColor: '#0A2348' },
    header: { width: '100%', backgroundColor: '#0A2348', alignItems: 'center', paddingTop: 20, paddingBottom: 28, paddingHorizontal: 20 },
    avatarButton: { marginBottom: 12, borderRadius: 36 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF7A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImagen: { width: '100%', height: '100%' },
    avatarLetra: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
    nombreRow: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, paddingHorizontal: 8 },
    nombre: { flexShrink: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
    iconoVerificado: { marginLeft: 6, flexShrink: 0 },
    correo: { maxWidth: '100%', color: '#94A3B8', fontSize: 13, marginBottom: 12, paddingHorizontal: 8, textAlign: 'center' },
    badgePendiente: { maxWidth: '100%', backgroundColor: '#FDE9CC', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
    badgePendienteTexto: { color: '#92400E', fontSize: 12, fontWeight: '600', textAlign: 'center' },

    statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, width: '100%', maxWidth: 620 },
    statsRowPequena: { paddingHorizontal: 8 },
    statItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    statValor: { maxWidth: '100%', fontSize: 16, fontWeight: '700', color: '#0A2348', textAlign: 'center' },
    statLabel: { maxWidth: '100%', fontSize: 12, color: '#8A8FA8', marginTop: 2, textAlign: 'center' },
    statDivider: { width: 1, backgroundColor: '#E9ECF2', marginVertical: 4 },

    contentSafeArea: { flex: 1, backgroundColor: '#F7F8FA' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 16 },
    contenidoCentral: { width: '100%', maxWidth: 720, alignSelf: 'center' },

    menuCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20, marginTop: 20, paddingHorizontal: 16, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    menuItem: { width: '100%', minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
    menuLabel: { flex: 1, minWidth: 0, marginRight: 12, fontSize: 15, color: '#1A1A2E' },
    menuArrow: { flexShrink: 0, fontSize: 20, color: '#B0B8CC' },

    cerrarSesion: { marginHorizontal: 20, marginTop: 12, paddingVertical: 16, alignItems: 'center' },
    cerrarSesionDeshabilitado: { opacity: 0.6 },
    cerrarSesionTexto: { color: '#FF3B30', fontSize: 15, fontWeight: '600' },

    footer: { textAlign: 'center', color: '#B0B8CC', fontSize: 12, lineHeight: 17, marginHorizontal: 20, marginTop: 16, marginBottom: 16 },
});