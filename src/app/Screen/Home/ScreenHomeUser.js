import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { EstadoGlobalContext } from '../../../components/Context/EstadoGlobalUser';

const enviosEnProceso = [];

const enviosRecientes = [];

const badgeColor = (estado) => {
    switch (estado) {
        case 'En camino': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'Entregado': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'Pendiente': return { bg: '#FFF3E0', text: '#E65100' };
        default: return { bg: '#F5F5F5', text: '#555' };
    }
};

export default function ScreenHomeUsers() {
    const { usuario } = useContext(EstadoGlobalContext);
    const router = useRouter();

    const nombre = usuario?.nombre ?? 'Usuario';

    const irAlMapa = () => router.push('/Screen/Map');
  const solicitarFlete = () => router.push('/Screen/Pedido/ScreenPedidos');

    return (
        <ScrollView style={styles.container} bounces={false}>

          
            <View style={styles.header}>
  <View>
    <Text style={styles.saludoSub}>Buenos días,</Text>
    <Text style={styles.saludoNombre}>{nombre} 👋</Text>
  </View>
  <TouchableOpacity onPress={() => router.push('/Screen/Setting/ScreenSettings')}>
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarLetra}>
        {nombre.charAt(0).toUpperCase()}
      </Text>
    </View>
  </TouchableOpacity>
</View>

         
            <TouchableOpacity style={styles.btnPrincipal} onPress={solicitarFlete} activeOpacity={0.85}>
                <Text style={styles.btnPrincipalText}>Solicitar nuevo flete</Text>
            </TouchableOpacity>

           
            <View style={styles.seccionHeader}>
                <Text style={styles.seccionTitulo}>En proceso</Text>
                <TouchableOpacity onPress={irAlMapa}>
                    <Text style={styles.seccionLink}>Ver en mapa </Text>
                </TouchableOpacity>
            </View>

            {enviosEnProceso.map((item) => {
                const colors = badgeColor(item.estado);
                return (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardIcono} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitulo}>{item.titulo}</Text>
                            <Text style={styles.cardSub}>{item.ruta} · {item.fecha}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.badgeText, { color: colors.text }]}>{item.estado}</Text>
                        </View>
                    </View>
                );
            })}

          
            <View style={styles.seccionHeader}>
                <Text style={styles.seccionTitulo}>Envíos recientes</Text>
                <TouchableOpacity>
                    <Text style={styles.seccionLink}>Ver todo </Text>
                </TouchableOpacity>
            </View>

            {enviosRecientes.map((item) => {
                const colors = badgeColor(item.estado);
                return (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardIcono} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitulo}>{item.titulo}</Text>
                            <Text style={styles.cardSub}>{item.ruta} · {item.fecha}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.badgeText, { color: colors.text }]}>{item.estado}</Text>
                        </View>
                    </View>
                );
            })}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 24,
    },
    saludoSub: {
        color: '#B0B8CC',
        fontSize: 14,
    },
    saludoNombre: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },
    notifDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF6B00',
    },

    /* Botón principal */
    btnPrincipal: {
        margin: 20,
        backgroundColor: '#FF6B00',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    btnPrincipalText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    /* Sección headers */
    seccionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 10,
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    seccionLink: {
        fontSize: 13,
        color: '#FF6B00',
        fontWeight: '600',
    },

    /* Cards */
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardIcono: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F0F1F5',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A2E',
        marginBottom: 3,
    },
    cardSub: {
        fontSize: 12,
        color: '#8A8FA8',
    },

    /* Badge */
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
});