import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const MENU_ITEMS = [
    { id: 'datos', label: 'Datos personales' },
    { id: 'vehiculo', label: 'Datos del vehículo' },
    { id: 'documentos', label: 'Mis documentos' },
    { id: 'billetera', label: 'Billetera' },
    { id: 'notificaciones', label: 'Notificaciones' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'ayuda', label: 'Ayuda y soporte' },
];

export default function ScreenSettingsFletero() {
    const { usuario } = useAuth();
    const router = useRouter();

    const perfil = {
        nombre: usuario?.nombre || 'Sin nombre',
        correo: usuario?.email || 'Sin correo',
        fletes: usuario?.total_servicios ?? 0,
        calificacion: usuario?.calificacion_promedio
            ? Number(usuario.calificacion_promedio).toFixed(1)
            : '0.0',
        vehiculo: usuario?.tipo_vehiculo || 'Por definir',
        verificado: usuario?.verificado ?? false,
    };

    const inicial = perfil.nombre.charAt(0).toUpperCase();

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
    };

    return (
        <ScrollView style={styles.container} bounces={false}>

            {/* Header con avatar */}
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetra}>{inicial}</Text>
                </View>

                <View style={styles.nombreRow}>
                    <Text style={styles.nombre}>{perfil.nombre}</Text>
                    {perfil.verificado && (
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={{ marginLeft: 6 }} />
                    )}
                </View>

                <Text style={styles.correo}>{perfil.correo}</Text>

                {!perfil.verificado && (
                    <View style={styles.badgePendiente}>
                        <Text style={styles.badgePendienteTexto}>Perfil pendiente de verificación</Text>
                    </View>
                )}

                {/* Estadísticas */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValor}>{perfil.fletes}</Text>
                        <Text style={styles.statLabel}>Fletes</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValor}>{perfil.calificacion}</Text>
                        <Text style={styles.statLabel}>Calif.</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValor} numberOfLines={1}>{perfil.vehiculo}</Text>
                        <Text style={styles.statLabel}>Vehículo</Text>
                    </View>
                </View>
            </View>

            {/* Menú */}
            <View style={styles.menuCard}>
                {MENU_ITEMS.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Cerrar sesión */}
            <TouchableOpacity style={styles.cerrarSesion} onPress={cerrarSesion} activeOpacity={0.8}>
                <Text style={styles.cerrarSesionTexto}>Cerrar sesión</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>© 2026 FleteandoTe. Todos los derechos reservados.</Text>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    // Header
    header: {
        backgroundColor: '#0A2348',
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 28,
        paddingHorizontal: 20,
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF7A1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarLetra: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
    },
    nombreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    nombre: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    correo: {
        color: '#94A3B8',
        fontSize: 13,
        marginBottom: 12,
    },
    badgePendiente: {
        backgroundColor: '#FDE9CC',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 16,
    },
    badgePendienteTexto: {
        color: '#92400E',
        fontSize: 12,
        fontWeight: '600',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValor: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0A2348',
    },
    statLabel: {
        fontSize: 12,
        color: '#8A8FA8',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E9ECF2',
        marginVertical: 4,
    },

    // Menú
    menuCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 20,
        marginTop: 20,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F5',
    },
    menuLabel: {
        fontSize: 15,
        color: '#1A1A2E',
    },
    menuArrow: {
        fontSize: 20,
        color: '#B0B8CC',
    },

    // Cerrar sesión
    cerrarSesion: {
        marginHorizontal: 20,
        marginTop: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cerrarSesionTexto: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },

    // Footer
    footer: {
        textAlign: 'center',
        color: '#B0B8CC',
        fontSize: 12,
        marginTop: 16,
        marginBottom: 32,
    },
});