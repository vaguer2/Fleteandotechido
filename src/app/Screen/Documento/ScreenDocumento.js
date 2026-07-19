import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const DOCUMENTS_CONFIG = [
  { key: 'ine', label: 'INE / Identificación oficial' },
  { key: 'licencia', label: 'Licencia de conducir' },
  { key: 'foto_vehiculo', label: 'Foto del vehículo' },
];

const Header = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
      <Ionicons name="arrow-back" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle} numberOfLines={1}>Verificación de perfil</Text>
  </View>
);

export default function ScreenDocumento() {
  const router = useRouter();
  const { usuario, setUsuario } = useAuth();

  const [documentos, setDocumentos] = useState({
    ine: null,
    licencia: null,
    foto_vehiculo: null,
  });

  const [tonelaje, setTonelaje] = useState(
    Number(usuario?.tonelaje) > 0 ? String(usuario.tonelaje) : ''
  );

  const [enviando, setEnviando] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);

  const tonelajeNumero = Number(tonelaje.replace(',', '.'));
  const tonelajeValido = Number.isFinite(tonelajeNumero) && tonelajeNumero > 0;

  const hayRechazados = DOCUMENTS_CONFIG.some(
    doc => documentos[doc.key]?.status === 'rechazado'
  );

  const documentosCompletos = DOCUMENTS_CONFIG.every(doc =>
    ['aprobado', 'pendiente', 'subido'].includes(documentos[doc.key]?.status)
  );

  const formularioCompleto =
    documentosCompletos && !hayRechazados && tonelajeValido;

  useEffect(() => {
    async function cargarEstadoDocumentos() {
      if (!usuario?.fletero_id) {
        setCargandoEstado(false);
        return;
      }

      const { data, error } = await supabase
        .from('documento_fletero')
        .select('tipo, estado, url_archivo')
        .eq('fletero_id', usuario.fletero_id);

      if (error) {
        console.log('Error al consultar documentos:', error);
        setCargandoEstado(false);
        return;
      }

      const estadoInicial = {
        ine: null,
        licencia: null,
        foto_vehiculo: null,
      };

      (data ?? []).forEach(documento => {
        if (Object.prototype.hasOwnProperty.call(estadoInicial, documento.tipo)) {
          estadoInicial[documento.tipo] = {
            status: documento.estado,
            url: documento.url_archivo,
          };
        }
      });

      setDocumentos(estadoInicial);

      const todosPresentes = DOCUMENTS_CONFIG.every(
        doc => estadoInicial[doc.key] !== null
      );

      const algunoRechazado = DOCUMENTS_CONFIG.some(
        doc => estadoInicial[doc.key]?.status === 'rechazado'
      );

      setYaEnviado(
        todosPresentes &&
        !algunoRechazado &&
        Number(usuario?.tonelaje) > 0
      );

      setCargandoEstado(false);
    }

    cargarEstadoDocumentos();
  }, [usuario?.fletero_id, usuario?.tonelaje]);

  const manejarCambioTonelaje = texto => {
    const limpio = texto.replace(',', '.').replace(/[^0-9.]/g, '');
    if (limpio.split('.').length > 2) return;
    setTonelaje(limpio);
  };

  const elegirOrigen = key => {
    const estado = documentos[key]?.status;
    const esFotoVehiculo = key === 'foto_vehiculo';

    if (estado === 'aprobado' && !esFotoVehiculo) {
      Alert.alert('Documento aprobado', 'Este documento ya fue aprobado.');
      return;
    }

    if (estado === 'pendiente') {
      Alert.alert(
        'Documento en revisión',
        'Este documento todavía está siendo revisado.'
      );
      return;
    }

    const opciones = [
      { text: 'Tomar foto', onPress: () => tomarFoto(key) },
      { text: 'Elegir de galería', onPress: () => elegirGaleria(key) },
    ];

    if (!esFotoVehiculo) {
      opciones.push({
        text: 'Subir archivo (PDF)',
        onPress: () => elegirArchivo(key),
      });
    }

    opciones.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      estado === 'aprobado' && esFotoVehiculo
        ? 'Cambiar foto del vehículo'
        : estado === 'rechazado'
          ? 'Reemplazar documento'
          : 'Subir documento',
      esFotoVehiculo
        ? 'Selecciona una fotografía del vehículo'
        : 'Selecciona una opción',
      opciones
    );
  };

  const tomarFoto = async key => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!resultado.canceled) {
      await subirASupabase(key, {
        uri: resultado.assets[0].uri,
        name: `${key}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const elegirGaleria = async key => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!resultado.canceled) {
      await subirASupabase(key, {
        uri: resultado.assets[0].uri,
        name: `${key}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }
  };

  const elegirArchivo = async key => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (resultado.canceled) return;

    const archivo = resultado.assets[0];
    const extension = archivo.name.split('.').pop() || 'pdf';

    await subirASupabase(key, {
      uri: archivo.uri,
      name: `${key}_${Date.now()}.${extension}`,
      type: archivo.mimeType || 'application/pdf',
    });
  };

  const subirASupabase = async (key, archivo) => {
    if (!usuario?.fletero_id) {
      Alert.alert('Error', 'No se encontró el perfil del fletero.');
      return;
    }

    const estadoAnterior = documentos[key];
    const esCambioFotoAprobada =
      key === 'foto_vehiculo' && estadoAnterior?.status === 'aprobado';

    setDocumentos(prev => ({
      ...prev,
      [key]: { ...archivo, status: 'subiendo' },
    }));

    try {
      const response = await fetch(archivo.uri);
      const arrayBuffer = await response.arrayBuffer();
      const rutaArchivo = `fletero_${usuario.fletero_id}/${archivo.name}`;

      const { error: storageError } = await supabase.storage
        .from('documentos')
        .upload(rutaArchivo, arrayBuffer, {
          contentType: archivo.type,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(rutaArchivo);

      const urlPublica = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('documento_fletero')
        .upsert({
          fletero_id: usuario.fletero_id,
          tipo: key,
          url_archivo: urlPublica,
          estado: 'pendiente',
          revisado_en: null,
          admin_id: null,
        }, { onConflict: 'fletero_id,tipo' });

      if (dbError) throw dbError;

      setDocumentos(prev => ({
        ...prev,
        [key]: {
          ...archivo,
          status: esCambioFotoAprobada ? 'pendiente' : 'subido',
          url: urlPublica,
        },
      }));

      if (esCambioFotoAprobada) {
        setYaEnviado(true);

        Alert.alert(
          'Nueva foto enviada',
          'La nueva foto quedó pendiente de revisión. La foto anterior seguirá activa hasta que el administrador apruebe esta.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      console.log('Error al subir documento:', error);

      Alert.alert(
        'Error',
        'No se pudo subir el documento. Intenta de nuevo.'
      );

      setDocumentos(prev => ({
        ...prev,
        [key]: estadoAnterior,
      }));
    }
  };

  const enviarParaRevision = async () => {
    if (hayRechazados) {
      Alert.alert(
        'Documentos rechazados',
        'Debes volver a subir todos los documentos rechazados.'
      );
      return;
    }

    if (!documentosCompletos) {
      Alert.alert(
        'Faltan documentos',
        'Sube todos los documentos requeridos.'
      );
      return;
    }

    if (!tonelaje.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresa el peso máximo que puede cargar tu vehículo.'
      );
      return;
    }

    if (!tonelajeValido) {
      Alert.alert(
        'Tonelaje inválido',
        'Ingresa un tonelaje mayor a cero.'
      );
      return;
    }

    if (!usuario?.fletero_id) {
      Alert.alert('Error', 'No se encontró el perfil del fletero.');
      return;
    }

    setEnviando(true);

    try {
      const { error } = await supabase
        .from('fletero')
        .update({ tonelaje: tonelajeNumero })
        .eq('fletero_id', usuario.fletero_id);

      if (error) throw error;

      setUsuario({
        ...usuario,
        tonelaje: tonelajeNumero,
      });

      setDocumentos(prev => {
        const actualizados = { ...prev };

        DOCUMENTS_CONFIG.forEach(doc => {
          if (actualizados[doc.key]?.status === 'subido') {
            actualizados[doc.key] = {
              ...actualizados[doc.key],
              status: 'pendiente',
            };
          }
        });

        return actualizados;
      });

      setYaEnviado(true);

      Alert.alert(
        'Documentos enviados',
        'El equipo revisará tus documentos en menos de 24 horas.',
        [{ text: 'Entendido' }]
      );
    } catch (error) {
      console.log('Error al enviar documentos:', error);

      Alert.alert(
        'Error',
        'No se pudieron enviar los documentos. Intenta de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  const obtenerEstadoVisual = status => {
    switch (status) {
      case 'aprobado':
        return {
          texto: 'Aprobado',
          icono: 'checkmark-circle',
          color: '#16a34a',
          estiloCard: styles.cardAprobado,
          estiloTexto: styles.cardLabelAprobado,
          estiloBadge: styles.badgeAprobado,
        };

      case 'rechazado':
        return {
          texto: 'Rechazado · Toca para volver a subir',
          icono: 'close-circle',
          color: '#dc2626',
          estiloCard: styles.cardRechazado,
          estiloTexto: styles.cardLabelRechazado,
          estiloBadge: styles.badgeRechazado,
        };

      case 'pendiente':
        return {
          texto: 'Pendiente de revisión',
          icono: 'time',
          color: '#d97706',
          estiloCard: styles.cardPendiente,
          estiloTexto: styles.cardLabelPendiente,
          estiloBadge: styles.badgePendiente,
        };

      case 'subido':
        return {
          texto: 'Listo para enviar',
          icono: 'checkmark',
          color: '#16a34a',
          estiloCard: styles.cardSubido,
          estiloTexto: styles.cardLabelAprobado,
          estiloBadge: styles.badgeAprobado,
        };

      default:
        return null;
    }
  };

  if (cargandoEstado) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
        <Header onBack={() => router.back()} />

        <View style={styles.loading}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (yaEnviado) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
        <Header onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={styles.revisionContent}
          showsVerticalScrollIndicator={false}
        >
          <Ionicons name="hourglass-outline" size={72} color="#f97316" />

          <Text style={styles.revisionTitle}>
            Documentos en revisión
          </Text>

          <Text style={styles.revisionText}>
            Ya recibimos tus documentos. El equipo de FleteandoTe los está
            revisando y te notificará cuando termine la revisión.
          </Text>

          <View style={styles.revisionCard}>
            {DOCUMENTS_CONFIG.map(doc => {
              const estado = documentos[doc.key]?.status;
              const aprobado = estado === 'aprobado';
              const esFotoVehiculo = doc.key === 'foto_vehiculo';

              const fila = (
                <View style={styles.revisionRow}>
                  <Ionicons
                    name={aprobado ? 'checkmark-circle' : 'time'}
                    size={20}
                    color={aprobado ? '#16a34a' : '#d97706'}
                  />

                  <Text style={styles.revisionItem}>
                    {doc.label}
                  </Text>

                  <Text style={[
                    styles.revisionStatus,
                    aprobado
                      ? styles.statusAprobado
                      : styles.statusPendiente,
                  ]}>
                    {aprobado
                      ? esFotoVehiculo
                        ? 'Cambiar'
                        : 'Aprobado'
                      : 'Pendiente'}
                  </Text>
                </View>
              );

              if (esFotoVehiculo && aprobado) {
                return (
                  <TouchableOpacity
                    key={doc.key}
                    onPress={() => elegirOrigen(doc.key)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar foto del vehículo"
                  >
                    {fila}
                  </TouchableOpacity>
                );
              }

              return <View key={doc.key}>{fila}</View>;
            })}

            <View style={styles.revisionRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#16a34a"
              />

              <Text style={styles.revisionItem}>
                Tonelaje: {tonelajeNumero} toneladas
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#1d4ed8"
            />

            <Text style={styles.infoText}>
              Puedes cambiar una foto del vehículo aprobada. La foto anterior
              seguirá activa hasta que la nueva sea aprobada.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2545" />
      <Header onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[
            styles.banner,
            hayRechazados && styles.bannerRechazado,
          ]}>
            <Ionicons
              name={hayRechazados
                ? 'alert-circle'
                : 'information-circle'}
              size={20}
              color={hayRechazados ? '#b91c1c' : '#7c2d12'}
              style={styles.bannerIcon}
            />

            <Text style={[
              styles.bannerText,
              hayRechazados && styles.bannerTextRechazado,
            ]}>
              {hayRechazados
                ? 'Uno o más documentos fueron rechazados. Vuelve a subir únicamente los documentos marcados en rojo.'
                : 'Para recibir solicitudes debes subir tus documentos. El equipo los revisará en menos de 24 horas.'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Documentos requeridos
          </Text>

          {DOCUMENTS_CONFIG.map(doc => {
            const data = documentos[doc.key];
            const estado = data?.status;
            const subiendo = estado === 'subiendo';
            const visual = obtenerEstadoVisual(estado);

            const puedeReemplazarFoto =
              doc.key === 'foto_vehiculo' &&
              estado === 'aprobado';

            const bloqueado =
              subiendo ||
              estado === 'pendiente' ||
              (estado === 'aprobado' && !puedeReemplazarFoto);

            return (
              <TouchableOpacity
                key={doc.key}
                activeOpacity={0.8}
                disabled={bloqueado}
                onPress={() => elegirOrigen(doc.key)}
                style={[
                  styles.card,
                  visual?.estiloCard,
                  bloqueado && styles.cardBloqueado,
                ]}
              >
                <Text style={[
                  styles.cardLabel,
                  visual?.estiloTexto,
                ]}>
                  {doc.label}
                </Text>

                {subiendo ? (
                  <View style={styles.estadoFila}>
                    <ActivityIndicator
                      color="#f97316"
                      size="small"
                    />

                    <Text style={styles.subiendoText}>
                      Subiendo...
                    </Text>
                  </View>
                ) : visual ? (
                  <View style={[
                    styles.badge,
                    visual.estiloBadge,
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      { color: visual.color },
                    ]}>
                      {estado === 'aprobado' && puedeReemplazarFoto
                        ? 'Aprobado · Toca para cambiar'
                        : visual.texto}
                    </Text>

                    <Ionicons
                      name={visual.icono}
                      size={15}
                      color={visual.color}
                    />
                  </View>
                ) : (
                  <Text style={styles.cardAction}>
                    Toca para subir
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={styles.sectionTitle}>
            Subir tonelaje:
          </Text>

          <TextInput
            style={styles.inputTonelaje}
            value={tonelaje}
            onChangeText={manejarCambioTonelaje}
            placeholder="Importante, sube el peso máximo que tu vehículo puede cargar"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            inputMode="decimal"
            maxLength={7}
            autoCorrect={false}
          />

          <Text style={styles.tonelajeInfo}>
            Ingresa la capacidad máxima de carga en toneladas. Ejemplo: 3.5
          </Text>

          {formularioCompleto && (
            <View style={styles.allDoneCard}>
              <Ionicons
                name="checkmark-circle"
                size={28}
                color="#16a34a"
              />

              <Text style={styles.allDoneText}>
                Todos los datos están completos. Presiona “Enviar para
                revisión” para continuar.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !formularioCompleto &&
              styles.submitButtonDisabled,
            ]}
            disabled={!formularioCompleto || enviando}
            onPress={enviarParaRevision}
            activeOpacity={0.85}
          >
            {enviando
              ? <ActivityIndicator color="#fff" />
              : (
                <Text style={styles.submitButtonText}>
                  Enviar para revisión
                </Text>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  keyboard: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    minHeight: 64, backgroundColor: '#0b2545', paddingVertical: 12,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerTitle: {
    flex: 1, color: '#fff', fontSize: 20, fontWeight: '700',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  content: {
    width: '100%', maxWidth: 760, alignSelf: 'center',
    padding: 20, paddingBottom: 32,
  },

  banner: {
    backgroundColor: '#fde9dd', borderRadius: 12, padding: 16,
    marginBottom: 24, alignItems: 'center',
  },
  bannerRechazado: { backgroundColor: '#fee2e2' },
  bannerIcon: { marginBottom: 6 },
  bannerText: {
    color: '#7c2d12', fontSize: 14,
    lineHeight: 20, textAlign: 'center',
  },
  bannerTextRechazado: { color: '#b91c1c' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    marginBottom: 14, color: '#0f172a',
  },

  card: {
    width: '100%', borderWidth: 1, borderStyle: 'dashed',
    borderColor: '#cbd5e1', borderRadius: 14, paddingVertical: 28,
    paddingHorizontal: 12, alignItems: 'center',
    marginBottom: 16, backgroundColor: '#fff',
  },
  cardBloqueado: { opacity: 0.95 },
  cardAprobado: {
    backgroundColor: '#ecfdf3',
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  cardRechazado: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
    borderStyle: 'solid',
  },
  cardPendiente: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
    borderStyle: 'solid',
  },
  cardSubido: {
    backgroundColor: '#ecfdf3',
    borderColor: '#86efac',
    borderStyle: 'solid',
  },

  cardLabel: {
    fontSize: 15, color: '#475569',
    fontWeight: '500', marginBottom: 8, textAlign: 'center',
  },
  cardLabelAprobado: {
    color: '#15803d',
    fontWeight: '700',
  },
  cardLabelRechazado: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  cardLabelPendiente: {
    color: '#b45309',
    fontWeight: '700',
  },
  cardAction: {
    color: '#f97316',
    fontWeight: '600',
    fontSize: 13,
  },

  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, gap: 5,
  },
  badgeAprobado: { backgroundColor: '#dcfce7' },
  badgeRechazado: { backgroundColor: '#fee2e2' },
  badgePendiente: { backgroundColor: '#fef3c7' },
  badgeText: {
    flexShrink: 1,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },

  estadoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subiendoText: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: '600',
  },

  inputTonelaje: {
    width: '100%', minHeight: 54, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 13,
    color: '#0f172a', fontSize: 15,
  },
  tonelajeInfo: {
    color: '#64748b', fontSize: 12,
    lineHeight: 18, marginTop: 7, marginBottom: 18,
  },

  allDoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf3', borderRadius: 12,
    padding: 16, marginTop: 8,
  },
  allDoneText: {
    flex: 1, color: '#15803d',
    fontSize: 13, lineHeight: 18,
  },

  footer: {
    width: '100%', paddingHorizontal: 20,
    paddingTop: 10, paddingBottom: 14,
    backgroundColor: '#f8fafc',
  },
  submitButton: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    backgroundColor: '#f97316', borderRadius: 30,
    paddingVertical: 16, alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#fbbf9c' },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  revisionContent: {
    flexGrow: 1, width: '100%', maxWidth: 760,
    alignSelf: 'center', padding: 24, alignItems: 'center',
  },
  revisionTitle: {
    fontSize: 22, fontWeight: '700', color: '#0f172a',
    marginTop: 20, textAlign: 'center',
  },
  revisionText: {
    fontSize: 14, color: '#64748b', marginTop: 10,
    marginBottom: 32, textAlign: 'center', lineHeight: 22,
  },
  revisionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    width: '100%', borderWidth: 1, borderColor: '#e2e8f0', gap: 14,
  },
  revisionRow: {
    width: '100%', minHeight: 28,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  revisionItem: {
    flex: 1, fontSize: 14,
    color: '#0f172a', fontWeight: '500',
  },
  revisionStatus: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
  },
  statusAprobado: { color: '#16a34a' },
  statusPendiente: { color: '#d97706' },

  infoCard: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16,
    marginTop: 20, width: '100%', flexDirection: 'row',
    gap: 10, alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    color: '#1d4ed8',
    fontSize: 13,
    lineHeight: 18,
  },
});