import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';
import { enviarNotificacion, obtenerTokenCliente } from '../../../hooks/useNotificaciones';

type EstadoSolicitud = 'borrador' | 'publicada' | 'en_negociacion' | 'aceptada' | 'en_progreso' | 'completada' | 'cancelada';
type EstadoVisual = { label: string; fondo: string; texto: string };
type CategoriaCarga = { nombre: string };
type PuntoRuta = { tipo: string; direccion_texto: string };
type Cargamento = { cargamento_id: number; foto_url: string };

type ClienteDetalle = {
  nombre: string;
  foto_url: string | null;
  calificacion_promedio: number | string | null;
  fletes_pedidos: number | null;
};

type SolicitudDetalle = {
  solicitud_id: number;
  usuario_id: string;
  fletero_id: string | null;
  tonelaje_requerido: number | string;
  descripcion_carga: string | null;
  precio_base: number | string | null;
  precio_ajustado: number | string | null;
  precio_final: number | string | null;
  deposito_requerido: number | string | null;
  deposito_pagado: boolean;
  distancia_km: number | null;
  estado: EstadoSolicitud;
  hora_inicio: string | null;
  hora_fin: string | null;
  creado_en: string;
  categoria_carga: CategoriaCarga | CategoriaCarga[] | null;
  punto_ruta: PuntoRuta[] | null;
  cargamento: Cargamento[] | null;
  usuario: ClienteDetalle | ClienteDetalle[] | null;
};

const ESTADOS: Record<EstadoSolicitud, EstadoVisual> = {
  borrador: { label: 'Borrador', fondo: '#F1F5F9', texto: '#475569' },
  publicada: { label: 'Disponible', fondo: '#FFF7ED', texto: '#C2410C' },
  en_negociacion: { label: 'En negociación', fondo: '#FEF3C7', texto: '#92400E' },
  aceptada: { label: 'Aceptada', fondo: '#FEF9C3', texto: '#854D0E' },
  en_progreso: { label: 'En progreso', fondo: '#DBEAFE', texto: '#1D4ED8' },
  completada: { label: 'Completada', fondo: '#DCFCE7', texto: '#166534' },
  cancelada: { label: 'Cancelada', fondo: '#FEE2E2', texto: '#B91C1C' },
};

const DETALLE_SELECT = `
  solicitud_id,
  usuario_id,
  fletero_id,
  tonelaje_requerido,
  descripcion_carga,
  precio_base,
  precio_ajustado,
  precio_final,
  deposito_requerido,
  deposito_pagado,
  distancia_km,
  estado,
  hora_inicio,
  hora_fin,
  creado_en,
  categoria_carga(nombre),
  punto_ruta(tipo,direccion_texto),
  cargamento(cargamento_id,foto_url),
  usuario(nombre,foto_url,calificacion_promedio,fletes_pedidos)
`;

const obtenerRelacion = <T,>(relacion: T | T[] | null | undefined): T | null =>
  Array.isArray(relacion) ? relacion[0] ?? null : relacion ?? null;

const formatearFecha = (fechaISO: string | null): string => {
  if (!fechaISO) return 'No disponible';

  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'No disponible';

  return fecha.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatearDinero = (valor: number | string | null): string => {
  if (valor === null || valor === undefined) return 'Pendiente';

  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'Pendiente';

  return numero.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
};

export default function ScreenDetallesFletero() {
  const router = useRouter();
  const params = useLocalSearchParams<{ solicitudId?: string | string[] }>();
  const { usuario: fletero } = useAuth();
  const { width } = useWindowDimensions();

  const solicitudIdTexto = Array.isArray(params.solicitudId) ? params.solicitudId[0] : params.solicitudId;
  const solicitudId = Number(solicitudIdTexto);
  const pantallaEstrecha = width < 370;

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aceptando, setAceptando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [errorFotoCliente, setErrorFotoCliente] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    const cargarDetalle = async (): Promise<void> => {
      if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
        if (componenteActivo) {
          setSolicitud(null);
          setCargando(false);
        }
        return;
      }

      setCargando(true);

      try {
        const { data, error } = await supabase
          .from('solicitud')
          .select(DETALLE_SELECT)
          .eq('solicitud_id', solicitudId)
          .maybeSingle();

        if (!componenteActivo) return;

        if (error) {
          console.log('Error al cargar la solicitud:', error);
          setSolicitud(null);
          return;
        }

        setSolicitud((data as SolicitudDetalle | null) ?? null);
        setErrorFotoCliente(false);
      } catch (error: unknown) {
        console.log('Error general al cargar la solicitud:', error);
        if (componenteActivo) setSolicitud(null);
      } finally {
        if (componenteActivo) setCargando(false);
      }
    };

    void cargarDetalle();

    return () => {
      componenteActivo = false;
    };
  }, [solicitudId]);

  const aceptarSolicitud = async (): Promise<void> => {
    if (!fletero?.fletero_id || !solicitud || aceptando) return;

    const disponible = solicitud.estado === 'publicada' && !solicitud.fletero_id;

    if (!disponible) {
      Alert.alert('Solicitud no disponible', 'Esta solicitud ya no puede ser aceptada.');
      return;
    }

    setAceptando(true);

    try {
      const { data, error } = await supabase
        .from('solicitud')
        .update({ fletero_id: fletero.fletero_id, estado: 'aceptada' })
        .eq('solicitud_id', solicitud.solicitud_id)
        .eq('estado', 'publicada')
        .is('fletero_id', null)
        .select(DETALLE_SELECT)
        .maybeSingle();

      if (error) {
        console.log('Error al aceptar la solicitud:', error);
        Alert.alert('Error', 'No se pudo aceptar la solicitud.');
        return;
      }

      if (!data) {
        Alert.alert('Solicitud no disponible', 'Otro fletero aceptó esta solicitud antes que tú.', [
          { text: 'Regresar', onPress: () => router.back() },
        ]);
        return;
      }

      setSolicitud(data as SolicitudDetalle);

      try {
        const tokenCliente = await obtenerTokenCliente(solicitud.solicitud_id);

        if (tokenCliente) {
          await enviarNotificacion(
            tokenCliente,
            '¡Tu flete fue aceptado! 🚛',
            `${fletero.nombre ?? 'Un fletero'} aceptó tu solicitud y se dirigirá al punto de origen.`
          );
        }
      } catch (errorNotificacion: unknown) {
        console.log('No se pudo enviar la notificación:', errorNotificacion);
      }

      Alert.alert('¡Solicitud aceptada!', 'La solicitud ahora está asignada a tu cuenta.', [
        { text: 'Ir al inicio', onPress: () => router.replace('/Screen/Home/ScreenHomeFletero') },
      ]);
    } catch (error: unknown) {
      console.log('Error general al aceptar la solicitud:', error);
      Alert.alert('Error', 'Ocurrió un problema al aceptar la solicitud.');
    } finally {
      setAceptando(false);
    }
  };

  const renderEncabezado = () => (
    <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.botonAtras}
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitulo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          Detalle de la solicitud
        </Text>

        <View style={styles.espacioHeader} />
      </View>
    </SafeAreaView>
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        {renderEncabezado()}

        <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
          <View style={styles.centrado}>
            <ActivityIndicator color="#F97316" size="large" />
            <Text style={styles.textoCarga}>Consultando solicitud...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!solicitud) {
    return (
      <View style={styles.container}>
        {renderEncabezado()}

        <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
          <View style={styles.centrado}>
            <Text style={styles.textoError}>No se encontró la solicitud.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const categoria = obtenerRelacion<CategoriaCarga>(solicitud.categoria_carga);
  const cliente = obtenerRelacion<ClienteDetalle>(solicitud.usuario);
  const puntosRuta = Array.isArray(solicitud.punto_ruta) ? solicitud.punto_ruta : [];
  const fotos = Array.isArray(solicitud.cargamento) ? solicitud.cargamento.filter(foto => Boolean(foto.foto_url)) : [];

  const origen = puntosRuta.find(punto => punto.tipo === 'origen')?.direccion_texto ?? 'Origen no definido';
  const destino = puntosRuta.find(punto => punto.tipo === 'destino')?.direccion_texto ?? 'Destino no definido';
  const estadoVisual = ESTADOS[solicitud.estado];
  const precioMostrar = solicitud.precio_final ?? solicitud.precio_ajustado ?? solicitud.precio_base;

  const perteneceAlFletero = solicitud.fletero_id === fletero?.fletero_id;
  const perteneceAOtroFletero = Boolean(solicitud.fletero_id) && !perteneceAlFletero;
  const puedeAceptar = solicitud.estado === 'publicada' && !solicitud.fletero_id && !aceptando;
  const inicialCliente = cliente?.nombre?.trim().charAt(0).toUpperCase() || 'U';

  const obtenerTextoBoton = (): string => {
    if (aceptando) return 'Aceptando solicitud...';

    if (perteneceAlFletero) {
      switch (solicitud.estado) {
        case 'aceptada': return 'Solicitud aceptada';
        case 'en_progreso': return 'Servicio en progreso';
        case 'completada': return 'Servicio completado';
        case 'cancelada': return 'Solicitud cancelada';
        default: return 'Asignada a tu cuenta';
      }
    }

    if (perteneceAOtroFletero) return 'Tomada por otro fletero';
    if (solicitud.estado === 'cancelada') return 'Solicitud cancelada';
    if (solicitud.estado === 'completada') return 'Servicio completado';

    return `Aceptar por ${formatearDinero(precioMostrar)}`;
  };

  return (
    <View style={styles.container}>
      {renderEncabezado()}

      <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contenidoCentral}>
            <View style={styles.estadoHeader}>
              <Text style={styles.numeroSolicitud}>Solicitud #{solicitud.solicitud_id}</Text>

              <View style={[styles.badgeEstado, { backgroundColor: estadoVisual.fondo }]}>
                <Text style={[styles.badgeEstadoTexto, { color: estadoVisual.texto }]}>{estadoVisual.label}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.tituloSeccion}>Ruta del servicio</Text>

              <View style={styles.rutaRow}>
                <View style={styles.dotOrigen} />

                <View style={styles.rutaContenido}>
                  <Text style={styles.rutaLabel}>Origen</Text>
                  <Text style={styles.rutaTexto}>{origen}</Text>
                </View>
              </View>

              <View style={styles.lineaVertical} />

              <View style={styles.rutaRow}>
                <View style={styles.dotDestino} />

                <View style={styles.rutaContenido}>
                  <Text style={styles.rutaLabel}>Destino</Text>
                  <Text style={styles.rutaTexto}>{destino}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.tituloSeccion}>Información del servicio</Text>

              <View style={styles.infoGrid}>
                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Distancia</Text>
                  <Text style={styles.infoValor}>
                    {solicitud.distancia_km !== null ? `${Number(solicitud.distancia_km).toFixed(1)} km` : 'No disponible'}
                  </Text>
                </View>

                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Tonelaje requerido</Text>
                  <Text style={styles.infoValor}>{solicitud.tonelaje_requerido} ton</Text>
                </View>

                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Categoría</Text>
                  <Text style={styles.infoValor}>{categoria?.nombre ?? 'No disponible'}</Text>
                </View>

                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Oferta</Text>
                  <Text style={[styles.infoValor, styles.precioDestacado]}>{formatearDinero(precioMostrar)}</Text>
                </View>

                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Publicada</Text>
                  <Text style={styles.infoValor}>{formatearFecha(solicitud.creado_en)}</Text>
                </View>

                <View style={[styles.infoItem, pantallaEstrecha && styles.infoItemEstrecho]}>
                  <Text style={styles.infoLabel}>Depósito requerido</Text>
                  <Text style={styles.infoValor}>{formatearDinero(solicitud.deposito_requerido)}</Text>
                </View>
              </View>

              <View style={styles.depositoFila}>
                <Text style={styles.depositoLabel}>Estado del depósito</Text>

                <Text style={[styles.depositoValor, { color: solicitud.deposito_pagado ? '#15803D' : '#B45309' }]}>
                  {solicitud.deposito_pagado ? 'Pagado' : 'Pendiente'}
                </Text>
              </View>
            </View>

            {cliente && (
              <View style={styles.card}>
                <Text style={styles.tituloSeccion}>Información del cliente</Text>

                <View style={styles.clienteEncabezado}>
                  <View style={styles.avatarCliente}>
                    {cliente.foto_url && !errorFotoCliente ? (
                      <Image
                        source={{ uri: cliente.foto_url }}
                        style={styles.avatarClienteImagen}
                        resizeMode="cover"
                        onError={() => setErrorFotoCliente(true)}
                      />
                    ) : (
                      <Text style={styles.avatarClienteTexto}>{inicialCliente}</Text>
                    )}
                  </View>

                  <Text style={styles.clienteNombre} numberOfLines={1}>{cliente.nombre}</Text>
                </View>

                <View style={styles.clienteDatos}>
                  <View style={styles.clienteDato}>
                    <Text style={styles.infoLabel}>Reputación como cliente</Text>
                    <Text style={styles.infoValor}>{Number(cliente.calificacion_promedio ?? 0).toFixed(2)} (de 5)</Text>
                  </View>

                  <View style={styles.clienteDato}>
                    <Text style={styles.infoLabel}>Fletes pedidos</Text>
                    <Text style={styles.infoValor}>{cliente.fletes_pedidos ?? 0}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.tituloSeccion}>Descripción de la carga</Text>

              <Text style={styles.descripcion}>
                {solicitud.descripcion_carga || 'El cliente no agregó una descripción adicional.'}
              </Text>
            </View>

            {fotos.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.tituloSeccion}>Fotos del cargamento</Text>

                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fotosContent}
                >
                  {fotos.map(foto => (
                    <TouchableOpacity
                      key={foto.cargamento_id}
                      onPress={() => setFotoAmpliada(foto.foto_url)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: foto.foto_url }}
                        style={[styles.fotoCargamento, pantallaEstrecha && styles.fotoCargamentoEstrecha]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {perteneceAOtroFletero && (
              <View style={styles.aviso}>
                <Ionicons name="alert-circle" size={18} color="#92400E" />
                <Text style={styles.avisoTexto}>Esta solicitud ya fue tomada por otro fletero.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.botonAceptar, !puedeAceptar && styles.botonDeshabilitado]}
              onPress={aceptarSolicitud}
              disabled={!puedeAceptar}
              activeOpacity={0.85}
            >
              {aceptando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoBotonAceptar} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                  {obtenerTextoBoton()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={fotoAmpliada !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFotoAmpliada(null)}
      >
        <View style={styles.modalFondo}>
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
            <Image source={{ uri: fotoAmpliada ?? '' }} style={styles.fotoAmpliada} resizeMode="contain" />

            <TouchableOpacity
              style={styles.botonCerrarModal}
              onPress={() => setFotoAmpliada(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSafeArea: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8ECF2' },
  header: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  botonAtras: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { flex: 1, marginHorizontal: 8, color: '#0F172A', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  espacioHeader: { width: 42, height: 42 },
  contentSafeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  contenidoCentral: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  centrado: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  textoCarga: { marginTop: 12, color: '#64748B', fontSize: 14 },
  textoError: { color: '#64748B', fontSize: 14, textAlign: 'center' },

  estadoHeader: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numeroSolicitud: { flex: 1, marginRight: 12, color: '#64748B', fontSize: 13, fontWeight: '600' },
  badgeEstado: { maxWidth: '55%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeEstadoTexto: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  card: { marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tituloSeccion: { marginBottom: 12, color: '#0F172A', fontSize: 15, fontWeight: '700' },

  rutaRow: { flexDirection: 'row', alignItems: 'flex-start' },
  rutaContenido: { flex: 1, minWidth: 0 },
  rutaLabel: { marginBottom: 2, color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  rutaTexto: { color: '#0F172A', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  dotOrigen: { width: 10, height: 10, marginTop: 5, marginRight: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  dotDestino: { width: 10, height: 10, marginTop: 5, marginRight: 10, borderRadius: 5, backgroundColor: '#F97316' },
  lineaVertical: { width: 2, height: 18, marginLeft: 4, marginVertical: 3, backgroundColor: '#E2E8F0' },

  infoGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  infoItem: { width: '48%', minWidth: 0 },
  infoItemEstrecho: { width: '100%' },
  infoLabel: { marginBottom: 3, color: '#94A3B8', fontSize: 11 },
  infoValor: { color: '#0F172A', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  precioDestacado: { color: '#F97316', fontSize: 16, fontWeight: '700' },

  depositoFila: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  depositoLabel: { flex: 1, marginRight: 12, color: '#64748B', fontSize: 13 },
  depositoValor: { fontSize: 13, fontWeight: '700' },

  clienteEncabezado: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  avatarCliente: { width: 54, height: 54, marginRight: 12, borderRadius: 27, backgroundColor: '#E3ECF7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarClienteImagen: { width: '100%', height: '100%' },
  avatarClienteTexto: { color: '#0B2545', fontSize: 20, fontWeight: '700' },
  clienteNombre: { flex: 1, minWidth: 0, color: '#0F172A', fontSize: 16, fontWeight: '700' },
  clienteDatos: { flexDirection: 'row' },
  clienteDato: { flex: 1, minWidth: 0, paddingRight: 8 },

  descripcion: { color: '#334155', fontSize: 14, lineHeight: 21 },
  fotosContent: { paddingRight: 6 },
  fotoCargamento: { width: 110, height: 110, marginRight: 10, borderRadius: 12, backgroundColor: '#E2E8F0' },
  fotoCargamentoEstrecha: { width: 96, height: 96 },

  aviso: { marginBottom: 12, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4EA' },
  avisoTexto: { flex: 1, marginLeft: 8, color: '#92400E', fontSize: 13, lineHeight: 18 },

  botonAceptar: { minHeight: 52, marginTop: 4, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' },
  botonDeshabilitado: { backgroundColor: '#94A3B8' },
  textoBotonAceptar: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  modalSafeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fotoAmpliada: { width: '100%', height: '82%' },
  botonCerrarModal: { position: 'absolute', top: 8, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
});