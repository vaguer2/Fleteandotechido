import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

export default function ScreenSettings() {
  const { usuario } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [errorFoto, setErrorFoto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    fletes_pedidos: Number(usuario?.fletes_pedidos ?? 0),
    calificacion_promedio: Number(usuario?.calificacion_promedio ?? 0),
  });

  const pantallaPequena = width < 370;
  const MENU_ITEMS = [
    { id: 'datos', label: 'Datos personales', onPress: () => router.push('/Screen/Setting/ScreenSubirDatosUser') },
    { id: 'historial', label: 'Historial', onPress: () => router.push('/Screen/Historial/ScreenHistorialUsuario') },
    { id: 'ayuda', label: 'Ayuda y soporte', onPress: () => router.push('/Screen/Setting/ScreenAyudaYSoporte') },
  ];

  const perfil = {
    nombre: usuario?.nombre?.trim() || 'Sin nombre',
    correo: usuario?.email?.trim() || 'Sin correo',
    fotoUrl: usuario?.foto_url?.trim() || null,
    fletes: estadisticas.fletes_pedidos,
    calificacion: estadisticas.calificacion_promedio.toFixed(2),
  };

  const inicial = perfil.nombre.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    setErrorFoto(false);
  }, [perfil.fotoUrl]);

  useFocusEffect(
    useCallback(() => {
      const cargarEstadisticas = async () => {
        if (!usuario?.usuario_id) return;

        const { data, error } = await supabase
          .from('usuario')
          .select('fletes_pedidos, calificacion_promedio')
          .eq('usuario_id', usuario.usuario_id)
          .maybeSingle();

        if (error) {
          console.log('Error al cargar estadísticas:', error);
          return;
        }

        if (data) {
          setEstadisticas({
            fletes_pedidos: Number(data.fletes_pedidos ?? 0),
            calificacion_promedio: Number(data.calificacion_promedio ?? 0),
          });
        }
      };

      cargarEstadisticas();
    }, [usuario?.usuario_id])
  );

  const ejecutarCierreSesion = async () => {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log('Error al cerrar sesión:', error);
        Alert.alert('Error', 'No se pudo cerrar la sesión.');
      }
    } catch (error) {
      console.log('Error general al cerrar sesión:', error);
      Alert.alert('Error', 'Ocurrió un problema al cerrar la sesión.');
    } finally {
      setCerrandoSesion(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar tu sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: ejecutarCierreSesion },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.85}
            onPress={() => router.push('/Screen/Setting/ScreenSubirDatosUser')}
            accessibilityRole="button"
            accessibilityLabel="Editar datos personales"
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

          <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {perfil.nombre}
          </Text>

          <Text style={styles.correo} numberOfLines={1}>
            {perfil.correo}
          </Text>

          <View style={[styles.statsRow, pantallaPequena && styles.statsRowPequena]}>
            <View style={styles.statItem}>
              <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {perfil.fletes}
              </Text>
              <Text style={styles.statLabel} numberOfLines={2}>Fletes pedidos</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {perfil.calificacion}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Calificación</Text>
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
              {MENU_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
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

            <Text style={styles.footer}>
              © 2026 FleteandoTe. Todos los derechos reservados.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  headerSafeArea: { backgroundColor: '#0B2545' },
  header: { width: '100%', backgroundColor: '#0B2545', alignItems: 'center', paddingTop: 20, paddingBottom: 28, paddingHorizontal: 20 },
  avatarButton: { marginBottom: 12, borderRadius: 36 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImagen: { width: '100%', height: '100%' },
  avatarLetra: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  nombre: { maxWidth: '100%', color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 4, paddingHorizontal: 8, textAlign: 'center' },
  correo: { maxWidth: '100%', color: '#B0B8CC', fontSize: 13, marginBottom: 20, paddingHorizontal: 8, textAlign: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, width: '100%', maxWidth: 620 },
  statsRowPequena: { paddingHorizontal: 10 },
  statItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  statValor: { maxWidth: '100%', fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  statLabel: { maxWidth: '100%', fontSize: 12, lineHeight: 15, color: '#8A8FA8', marginTop: 2, textAlign: 'center' },
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