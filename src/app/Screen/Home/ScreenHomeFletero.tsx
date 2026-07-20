import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';
import { useRastreoFletero } from '../../../hooks/useRastreoFletero';

type PuntoRuta = { tipo: string; direccion_texto: string };
type CategoriaCarga = { nombre: string };
type UsuarioSolicitud = { usuario_id: string; nombre: string };
type CalificacionSolicitud = {
  calificacion_id: number;
  estrellas_al_fletero: number | null;
  estrellas_al_usuario: number | null;
};
type Solicitud = {
  solicitud_id: number;
  categoria_carga: CategoriaCarga | null;
  descripcion_carga: string;
  tonelaje_requerido: number;
  distancia_km: number | null;
  precio_base: number | null;
  precio_ajustado?: number | null;
  creado_en: string;
  punto_ruta: PuntoRuta[];
};
type ServicioActivo = {
  solicitud_id: number;
  estado: 'aceptada' | 'en_progreso' | string;
  precio_ajustado?: number | null;
  precio_base?: number | null;
  punto_ruta?: PuntoRuta[];
};
type SolicitudCompletada = {
  solicitud_id: number;
  estado: string;
  descripcion_carga: string | null;
  tonelaje_requerido: number;
  distancia_km: number | null;
  precio_base: number | null;
  precio_ajustado: number | null;
  precio_final: number | null;
  hora_fin: string | null;
  creado_en: string;
  categoria_carga: CategoriaCarga | null;
  punto_ruta: PuntoRuta[];
  usuario: UsuarioSolicitud | null;
  calificacion: CalificacionSolicitud | null;
};
const CATEGORIA_COLOR: Record<string, { bg: string; text: string }> = {
  'Mudanza completa': { bg: '#fde9dd', text: '#c2410c' },
  Electrodomésticos: { bg: '#dbeafe', text: '#1d4ed8' },
  'Mercancía comercial': { bg: '#fef3c7', text: '#92400e' },
  'Materiales de construcción': { bg: '#e0e7ff', text: '#3730a3' },
  'Otros objetos pesados': { bg: '#f1f5f9', text: '#475569' },
};
function tiempoRelativo(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'Hace un momento';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
}
function formatearFecha(fechaISO: string | null): string {
  if (!fechaISO) return 'Fecha no disponible';
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
export default function ScreenHomeFletero() {
  const { usuario: fletero, setUsuario: setFletero } = useAuth();
  const { width } = useWindowDimensions();
  const [disponible, setDisponible] = useState<boolean>(fletero?.disponible ?? false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [solicitudesCompletadas, setSolicitudesCompletadas] = useState<SolicitudCompletada[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [cargandoCompletadas, setCargandoCompletadas] = useState(true);
  const [servicioActivo, setServicioActivo] = useState<ServicioActivo | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorFoto, setErrorFoto] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(fletero?.foto_url?.trim() || null);
  const pantallaEstrecha = width < 380;
  const nombre = fletero?.nombre?.trim() || 'Fletero';
  const iniciales = nombre.split(' ').filter(Boolean).map((parte: string) => parte[0]).slice(0, 2).join('').toUpperCase() || 'F';
  useEffect(() => {
    setDisponible(fletero?.disponible ?? false);
  }, [fletero?.disponible]);
  useEffect(() => {
    let componenteActivo = true;
    const cargarFotoFletero = async (): Promise<void> => {
      if (!fletero?.fletero_id) {
        if (componenteActivo) {
          setFotoPerfil(null);
          setErrorFoto(false);
        }
        return;
      }
      const { data, error } = await supabase.from('fletero').select('foto_url').eq('fletero_id', fletero.fletero_id).maybeSingle();
      if (!componenteActivo) return;
      if (error) {
        console.log('Error al cargar la foto del fletero:', error);
        setFotoPerfil(fletero?.foto_url?.trim() || null);
        setErrorFoto(false);
        return;
      }
      const nuevaFoto = data?.foto_url?.trim() || null;
      setFotoPerfil(nuevaFoto);
      setErrorFoto(false);
      if (fletero && nuevaFoto !== fletero.foto_url) {
        setFletero({ ...fletero, foto_url: nuevaFoto });
      }
    };
    void cargarFotoFletero();
    return () => {
      componenteActivo = false;
    };
  }, [fletero?.fletero_id, fletero?.foto_url, setFletero]);
  const rastreoActivo = servicioActivo?.estado === 'en_progreso';
  useRastreoFletero(servicioActivo?.solicitud_id, rastreoActivo);
  const cargarServicioActivo = useCallback(async (): Promise<void> => {
    if (!fletero?.fletero_id) {
      setServicioActivo(null);
      return;
    }
    const { data, error } = await supabase
      .from('solicitud')
      .select(`
        solicitud_id,
        estado,
        precio_ajustado,
        precio_base,
        punto_ruta(tipo,direccion_texto)
      `)
      .eq('fletero_id', fletero.fletero_id)
      .in('estado', ['aceptada', 'en_progreso'])
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error al cargar servicio activo:', error);
      return;
    }
    if (!data) {
      setServicioActivo(null);
      return;
    }
    setServicioActivo({
      solicitud_id: data.solicitud_id,
      estado: data.estado,
      precio_ajustado: data.precio_ajustado,
      precio_base: data.precio_base,
      punto_ruta: Array.isArray(data.punto_ruta) ? data.punto_ruta : [],
    });
  }, [fletero?.fletero_id]);
  const cargarSolicitudes = useCallback(async (): Promise<void> => {
    if (!fletero?.fletero_id) {
      setSolicitudes([]);
      return;
    }

    const tonelaje = Number(fletero?.tonelaje ?? 0);

    if (tonelaje <= 0) {
      setSolicitudes([]);
      return;
    }

    const { data, error } = await supabase
      .from('solicitud')
      .select(`
        solicitud_id,
        descripcion_carga,
        tonelaje_requerido,
        distancia_km,
        precio_base,
        precio_ajustado,
        creado_en,
        categoria_carga!categoria_id(nombre),
        punto_ruta(tipo,direccion_texto)
      `)
      .eq('estado', 'publicada')
      .is('fletero_id', null)
      .lte('tonelaje_requerido', tonelaje)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al cargar solicitudes:', error);
      setSolicitudes([]);
      return;
    }

    const normalizadas: Solicitud[] = (data ?? []).map((item: any) => ({
      solicitud_id: item.solicitud_id,
      descripcion_carga: item.descripcion_carga,
      tonelaje_requerido: item.tonelaje_requerido,
      distancia_km: item.distancia_km,
      precio_base: item.precio_base,
      precio_ajustado: item.precio_ajustado,
      creado_en: item.creado_en,
      categoria_carga: Array.isArray(item.categoria_carga) ? item.categoria_carga[0] ?? null : item.categoria_carga ?? null,
      punto_ruta: Array.isArray(item.punto_ruta) ? item.punto_ruta : [],
    }));

    setSolicitudes(normalizadas);
  }, [fletero?.fletero_id, fletero?.tonelaje]);

  const cargarSolicitudesCompletadas = useCallback(async (): Promise<void> => {
    if (!fletero?.fletero_id) {
      setSolicitudesCompletadas([]);
      setCargandoCompletadas(false);
      return;
    }

    setCargandoCompletadas(true);

    try {
      const { data, error } = await supabase
        .from('solicitud')
        .select(`
          solicitud_id,
          estado,
          descripcion_carga,
          tonelaje_requerido,
          distancia_km,
          precio_base,
          precio_ajustado,
          precio_final,
          hora_fin,
          creado_en,
          categoria_carga!categoria_id(nombre),
          punto_ruta(tipo,direccion_texto),
          usuario!usuario_id(usuario_id,nombre),
          calificacion(calificacion_id,estrellas_al_fletero,estrellas_al_usuario)
        `)
        .eq('fletero_id', fletero.fletero_id)
        .eq('estado', 'completada')
        .order('hora_fin', { ascending: false, nullsFirst: false });

      if (error) {
        console.log('Error al cargar servicios completados:', error);
        setSolicitudesCompletadas([]);
        return;
      }

      const normalizadas: SolicitudCompletada[] = (data ?? []).map((item: any) => ({
        solicitud_id: item.solicitud_id,
        estado: item.estado,
        descripcion_carga: item.descripcion_carga,
        tonelaje_requerido: item.tonelaje_requerido,
        distancia_km: item.distancia_km,
        precio_base: item.precio_base,
        precio_ajustado: item.precio_ajustado,
        precio_final: item.precio_final,
        hora_fin: item.hora_fin,
        creado_en: item.creado_en,
        categoria_carga: Array.isArray(item.categoria_carga) ? item.categoria_carga[0] ?? null : item.categoria_carga ?? null,
        punto_ruta: Array.isArray(item.punto_ruta) ? item.punto_ruta : [],
        usuario: Array.isArray(item.usuario) ? item.usuario[0] ?? null : item.usuario ?? null,
        calificacion: Array.isArray(item.calificacion) ? item.calificacion[0] ?? null : item.calificacion ?? null,
      }));

      setSolicitudesCompletadas(normalizadas);
    } catch (error) {
      console.log('Error general al cargar servicios completados:', error);
      setSolicitudesCompletadas([]);
    } finally {
      setCargandoCompletadas(false);
    }
  }, [fletero?.fletero_id]);

  const cargarDashboard = useCallback(async (): Promise<void> => {
    setCargandoSolicitudes(true);
    await Promise.all([cargarServicioActivo(), cargarSolicitudes(), cargarSolicitudesCompletadas()]);
    setCargandoSolicitudes(false);
  }, [cargarServicioActivo, cargarSolicitudes, cargarSolicitudesCompletadas]);

  useFocusEffect(
    useCallback(() => {
      void cargarDashboard();
    }, [cargarDashboard])
  );

  const toggleDisponible = async (valor: boolean): Promise<void> => {
    const valorAnterior = disponible;
    setDisponible(valor);

    if (!fletero?.fletero_id) {
      setDisponible(valorAnterior);
      return;
    }

    const { error } = await supabase.from('fletero').update({ disponible: valor }).eq('fletero_id', fletero.fletero_id);

    if (error) {
      console.error('Error al actualizar disponibilidad:', error);
      setDisponible(valorAnterior);
      Alert.alert('Error', 'No se pudo actualizar tu disponibilidad.');
      return;
    }

    setFletero({ ...fletero, disponible: valor });
    if (valor) await cargarSolicitudes();
  };

  const iniciarServicio = (): void => {
    if (!servicioActivo?.solicitud_id) return;
    router.push(`/Screen/Map/ScreenIrAlOrigen?solicitudId=${servicioActivo.solicitud_id}` as any);
  };

  const finalizarServicio = (): void => {
    if (!servicioActivo?.solicitud_id || !fletero?.fletero_id) return;

    const solicitudId = servicioActivo.solicitud_id;

    Alert.alert('¿Finalizar servicio?', '¿Confirmas que ya entregaste la carga en el destino?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        onPress: async () => {
          setProcesando(true);

          try {
            const { error } = await supabase
              .from('solicitud')
              .update({ estado: 'completada', hora_fin: new Date().toISOString() })
              .eq('solicitud_id', solicitudId)
              .eq('fletero_id', fletero.fletero_id);

            if (error) {
              console.log('Error al finalizar servicio:', error);
              Alert.alert('Error', 'No se pudo finalizar el servicio.');
              return;
            }

            setServicioActivo(null);
            await Promise.all([cargarSolicitudes(), cargarSolicitudesCompletadas()]);

            Alert.alert(
              '¡Servicio completado!',
              'El flete fue entregado exitosamente. Puedes calificar al usuario en la sección de servicios completados.'
            );
          } catch (error) {
            console.log('Error general al finalizar servicio:', error);
            Alert.alert('Error', 'Ocurrió un problema al finalizar el servicio.');
          } finally {
            setProcesando(false);
          }
        },
      },
    ]);
  };

  const verDetalleSolicitud = (solicitudId: number): void => {
    router.push(`/Screen/Detalles/ScreenDetallesFletero?solicitudId=${solicitudId}` as any);
  };

  const irACalificarUsuario = (solicitud: SolicitudCompletada): void => {
    router.push({
      pathname: '/Screen/Calificacion/ScreeCalificacionFleteroToUser',
      params: {
        solicitudId: String(solicitud.solicitud_id),
        usuarioNombre: solicitud.usuario?.nombre?.trim() || 'Usuario',
      },
    } as any);
  };

  const tieneCalificacionAlUsuario = (solicitud: SolicitudCompletada): boolean =>
    solicitud.calificacion?.estrellas_al_usuario !== null &&
    solicitud.calificacion?.estrellas_al_usuario !== undefined;

  const obtenerDestino = (solicitud: Solicitud | ServicioActivo | SolicitudCompletada): string =>
    solicitud.punto_ruta?.find(punto => punto.tipo === 'destino')?.direccion_texto ?? 'Destino';

  const obtenerOrigen = (solicitud: Solicitud | ServicioActivo | SolicitudCompletada): string =>
    solicitud.punto_ruta?.find(punto => punto.tipo === 'origen')?.direccion_texto ?? 'Origen';

  const obtenerPrecioCompletado = (solicitud: SolicitudCompletada): number | null =>
    solicitud.precio_final ?? solicitud.precio_ajustado ?? solicitud.precio_base ?? null;

  const renderAvatarFletero = () => {
    if (fotoPerfil && !errorFoto) {
      return (
        <Image
          source={{ uri: fotoPerfil }}
          style={styles.avatarImagen}
          resizeMode="cover"
          onError={evento => {
            console.log('No se pudo mostrar foto_url:', fotoPerfil, evento.nativeEvent);
            setErrorFoto(true);
          }}
        />
      );
    }

    return <Text style={styles.avatarText}>{iniciales}</Text>;
  };

  if (!fletero?.verificado) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.saludo}>Hola, Fletero</Text>

                <View style={styles.nombreRow}>
                  <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {nombre}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/Screen/Setting/ScreenSettingsFletero')}
                activeOpacity={0.8}
                style={styles.avatarButton}
                accessibilityRole="button"
                accessibilityLabel="Abrir configuración del perfil"
              >
                <View style={styles.avatar}>{renderAvatarFletero()}</View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
          <ScrollView style={styles.content} contentContainerStyle={styles.verificacionContent} showsVerticalScrollIndicator={false}>
            <View style={styles.verificacionPrincipal}>
              <Ionicons name="shield-checkmark-outline" size={72} color="#94a3b8" />
              <Text style={styles.verificacionTitulo}>Cuenta no verificada</Text>
              <Text style={styles.verificacionTexto}>
                Para empezar a recibir solicitudes de flete necesitas subir tus documentos y esperar la aprobación del equipo de FleteandoTe.
              </Text>
            </View>

            <TouchableOpacity style={styles.botonDocumentos} onPress={() => router.push('/Screen/Documento/ScreenDocumento')} activeOpacity={0.85}>
              <Text style={styles.botonDocumentosTexto}>Subir mis documentos</Text>
            </TouchableOpacity>

            <View style={styles.avisoDocumentos}>
              <Ionicons name="time-outline" size={20} color="#92400E" />
              <Text style={styles.avisoDocumentosTexto}>
                Una vez que subas tus documentos, el equipo los revisará en menos de 24 horas. Cuando estés verificado podrás ver y aceptar solicitudes.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />

      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.saludo}>Hola, Fletero</Text>

              <View style={styles.nombreRow}>
                <Text style={styles.nombre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {nombre}
                </Text>
                <Ionicons name="cube-outline" size={18} color="#22c55e" style={styles.iconoVerificado} />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/Screen/Setting/ScreenSettingsFletero')}
              activeOpacity={0.8}
              style={styles.avatarButton}
              accessibilityRole="button"
              accessibilityLabel="Abrir configuración del perfil"
            >
              <View style={styles.avatar}>{renderAvatarFletero()}</View>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle} numberOfLines={1}>Disponible para fletes</Text>
              <Text style={styles.toggleSub} numberOfLines={pantallaEstrecha ? 2 : 1}>
                {disponible ? 'Activado — recibes solicitudes' : 'Desactivado — no recibes solicitudes'}
              </Text>
            </View>

            <Switch
              value={disponible}
              onValueChange={toggleDisponible}
              trackColor={{ false: '#475569', true: '#22c55e' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.contenidoCentral}>
            {servicioActivo && (
              <View style={styles.cardServicioActivo}>
                <View style={styles.filaServicioActivo}>
                  <View style={[styles.dotEstado, { backgroundColor: servicioActivo.estado === 'en_progreso' ? '#22c55e' : '#f97316' }]} />

                  <Text style={styles.tituloServicioActivo}>
                    {servicioActivo.estado === 'en_progreso' ? 'Servicio en progreso' : 'Servicio aceptado — ve al origen'}
                  </Text>
                </View>

                <Text style={styles.rutaServicio} numberOfLines={2}>📍 {obtenerOrigen(servicioActivo)}</Text>
                <Text style={styles.rutaServicio} numberOfLines={2}>🏁 {obtenerDestino(servicioActivo)}</Text>

                <View style={styles.botonesServicio}>
                  {servicioActivo.estado === 'aceptada' && (
                    <TouchableOpacity style={styles.btnIniciar} onPress={iniciarServicio} disabled={procesando} activeOpacity={0.85}>
                      {procesando
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnServicioTexto}>✓ Llegué al punto de carga</Text>}
                    </TouchableOpacity>
                  )}

                  {servicioActivo.estado === 'en_progreso' && (
                    <>
                      <TouchableOpacity
                        style={styles.btnVerMapa}
                        onPress={() => router.push(`/Screen/Map/ScreenRastroMap?solicitudId=${servicioActivo.solicitud_id}` as any)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.btnServicioTexto}>🗺 Ver mapa de entrega</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.btnFinalizar} onPress={finalizarServicio} disabled={procesando} activeOpacity={0.85}>
                        {procesando
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={styles.btnServicioTexto}>Finalizar servicio</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>SOLICITUDES DISPONIBLES PARA TI</Text>

            {!disponible && (
              <Text style={styles.textoInformativo}>Activa tu disponibilidad para ver y recibir solicitudes.</Text>
            )}

            {disponible && cargandoSolicitudes && (
              <ActivityIndicator color="#f97316" style={styles.indicadorCarga} />
            )}

            {disponible && !cargandoSolicitudes && solicitudes.length === 0 && (
              <Text style={styles.textoInformativo}>
                {Number(fletero?.tonelaje ?? 0) <= 0
                  ? 'Configura el tonelaje de tu vehículo en Datos del vehículo para ver solicitudes.'
                  : 'No hay solicitudes disponibles por el momento.'}
              </Text>
            )}

            {disponible && !cargandoSolicitudes && solicitudes.map(solicitud => {
              const nombreCategoria = solicitud.categoria_carga?.nombre ?? 'Otros';
              const colores = CATEGORIA_COLOR[nombreCategoria] ?? { bg: '#f1f5f9', text: '#475569' };
              const origen = obtenerOrigen(solicitud);
              const destino = obtenerDestino(solicitud);
              const precioMostrar = solicitud.precio_ajustado ?? solicitud.precio_base;

              return (
                <View key={solicitud.solicitud_id} style={styles.card}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => verDetalleSolicitud(solicitud.solicitud_id)}>
                    <View style={styles.cardTop}>
                      <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                        <Text style={[styles.badgeText, { color: colores.text }]} numberOfLines={1}>{nombreCategoria}</Text>
                      </View>

                      <Text style={styles.tiempo} numberOfLines={1}>{tiempoRelativo(solicitud.creado_en)}</Text>
                    </View>

                    <Text style={styles.cardTitulo} numberOfLines={2}>{solicitud.descripcion_carga}</Text>

                    <Text style={styles.cardRuta} numberOfLines={2}>
                      {origen} → {destino} · {solicitud.tonelaje_requerido} ton
                    </Text>

                    <View style={[styles.cardBottom, pantallaEstrecha && styles.cardBottomEstrecho]}>
                      <Text style={styles.distancia}>
                        {solicitud.distancia_km !== null && solicitud.distancia_km !== undefined
                          ? `~${Number(solicitud.distancia_km).toFixed(1)} km`
                          : '— km'}
                      </Text>

                      <Text style={styles.precio} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                        {precioMostrar !== null && precioMostrar !== undefined
                          ? `Oferta: $${precioMostrar} MXN`
                          : 'Precio pendiente'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.botonVerDetalle} onPress={() => verDetalleSolicitud(solicitud.solicitud_id)} activeOpacity={0.85}>
                    <Text style={styles.textoBotonVerDetalle}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={styles.seccionCompletadasHeader}>
              <Text style={styles.sectionLabel}>SERVICIOS COMPLETADOS</Text>

              {!cargandoCompletadas && (
                <View style={styles.contadorCompletadas}>
                  <Text style={styles.contadorCompletadasTexto}>{solicitudesCompletadas.length}</Text>
                </View>
              )}
            </View>

            {cargandoCompletadas && (
              <ActivityIndicator color="#f97316" style={styles.indicadorCompletadas} />
            )}

            {!cargandoCompletadas && solicitudesCompletadas.length === 0 && (
              <Text style={styles.textoInformativo}>Aún no tienes servicios completados.</Text>
            )}

            {!cargandoCompletadas && solicitudesCompletadas.map(solicitud => {
              const nombreCategoria = solicitud.categoria_carga?.nombre ?? 'Flete';
              const usuarioNombre = solicitud.usuario?.nombre?.trim() || 'Usuario';
              const origen = obtenerOrigen(solicitud);
              const destino = obtenerDestino(solicitud);
              const precio = obtenerPrecioCompletado(solicitud);
              const calificado = tieneCalificacionAlUsuario(solicitud);

              return (
                <View key={solicitud.solicitud_id} style={styles.cardCompletada}>
                  <View style={styles.cardCompletadaTop}>
                    <View style={styles.badgeCompletada}>
                      <Text style={styles.badgeCompletadaTexto}>Completado</Text>
                    </View>

                    <Text style={styles.fechaCompletada} numberOfLines={1}>
                      {formatearFecha(solicitud.hora_fin ?? solicitud.creado_en)}
                    </Text>
                  </View>

                  <Text style={styles.cardCompletadaTitulo} numberOfLines={1}>{nombreCategoria}</Text>
                  <Text style={styles.usuarioCompletada} numberOfLines={1}>Usuario: {usuarioNombre}</Text>

                  <Text style={styles.rutaCompletada} numberOfLines={pantallaEstrecha ? 3 : 2}>
                    {origen} → {destino}
                  </Text>

                  <View style={[styles.datosCompletada, pantallaEstrecha && styles.datosCompletadaEstrecha]}>
                    <Text style={styles.tonelajeCompletada}>{solicitud.tonelaje_requerido} ton</Text>

                    <Text style={styles.precioCompletada} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {precio !== null ? `$${Number(precio).toFixed(2)} MXN` : 'Precio no disponible'}
                    </Text>
                  </View>

                  {!calificado ? (
                    <TouchableOpacity style={styles.btnCalificarUsuario} onPress={() => irACalificarUsuario(solicitud)} activeOpacity={0.85}>
                      <Text style={styles.btnCalificarUsuarioTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        ⭐ Calificar usuario
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.calificacionEnviada}>
                      <Text style={styles.calificacionEnviadaTexto}>
                        Calificación enviada · {solicitud.calificacion?.estrellas_al_usuario} de 5 estrellas
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b2545' },
  headerSafeArea: { backgroundColor: '#0b2545' },
  header: { backgroundColor: '#0b2545', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerTextContainer: { flex: 1, minWidth: 0, marginRight: 12 },
  saludo: { color: '#94a3b8', fontSize: 13 },
  nombreRow: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nombre: { flexShrink: 1, color: '#fff', fontSize: 20, fontWeight: '700' },
  iconoVerificado: { marginLeft: 6, flexShrink: 0 },
  avatarButton: { flexShrink: 0, borderRadius: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImagen: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  toggleCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTextContainer: { flex: 1, minWidth: 0, marginRight: 12 },
  toggleTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  toggleSub: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },

  contentSafeArea: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  contenidoCentral: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 14 },

  cardServicioActivo: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 20 },
  filaServicioActivo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dotEstado: { width: 8, height: 8, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  tituloServicioActivo: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  rutaServicio: { color: '#cbd5e1', fontSize: 12, lineHeight: 17, marginBottom: 4 },
  botonesServicio: { marginTop: 14, gap: 10 },
  btnIniciar: { minHeight: 46, backgroundColor: '#22c55e', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnVerMapa: { minHeight: 46, backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnFinalizar: { minHeight: 46, backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnServicioTexto: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },

  textoInformativo: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  indicadorCarga: { marginTop: 20 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { maxWidth: '70%', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  tiempo: { maxWidth: '28%', marginLeft: 8, fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  cardTitulo: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardRuta: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBottomEstrecho: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  distancia: { fontSize: 13, color: '#64748b' },
  precio: { flexShrink: 1, marginLeft: 10, fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  botonVerDetalle: { backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  textoBotonVerDetalle: { color: '#fff', fontWeight: '700', fontSize: 14 },

  seccionCompletadasHeader: { marginTop: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  contadorCompletadas: { minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  contadorCompletadasTexto: { color: '#166534', fontSize: 12, fontWeight: '700' },
  indicadorCompletadas: { marginVertical: 18 },

  cardCompletada: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardCompletadaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badgeCompletada: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCompletadaTexto: { color: '#166534', fontSize: 11, fontWeight: '700' },
  fechaCompletada: { flexShrink: 1, marginLeft: 10, color: '#94a3b8', fontSize: 11, textAlign: 'right' },
  cardCompletadaTitulo: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  usuarioCompletada: { color: '#f97316', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  rutaCompletada: { color: '#64748b', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  datosCompletada: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  datosCompletadaEstrecha: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  tonelajeCompletada: { color: '#64748b', fontSize: 13 },
  precioCompletada: { flexShrink: 1, marginLeft: 10, color: '#0f172a', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  btnCalificarUsuario: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: '#f97316', backgroundColor: '#fff7ed', paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  btnCalificarUsuarioTexto: { color: '#f97316', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  calificacionEnviada: { minHeight: 42, borderRadius: 10, backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  calificacionEnviadaTexto: { color: '#64748b', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  verificacionContent: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  verificacionPrincipal: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  verificacionTitulo: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 20, textAlign: 'center' },
  verificacionTexto: { fontSize: 14, color: '#64748b', marginTop: 10, textAlign: 'center', lineHeight: 22 },
  botonDocumentos: { width: '100%', minHeight: 52, backgroundColor: '#f97316', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  botonDocumentosTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  avisoDocumentos: { width: '100%', backgroundColor: '#FEF9C3', borderRadius: 12, padding: 16, marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avisoDocumentosTexto: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 },
});