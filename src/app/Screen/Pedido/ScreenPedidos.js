import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../../providers/AuthProvider';
import { supabase } from '../../../../lib/supabase';

const TIPOS_CARGA = [
  { id: 1, key: 'mudanza', label: 'Mudanza completa' },
  { id: 2, key: 'electrodomesticos', label: 'Electrodomésticos' },
  { id: 3, key: 'mercancia', label: 'Mercancía comercial' },
  { id: 4, key: 'construccion', label: 'Materiales construcción' },
  { id: 5, key: 'otros', label: 'Otros objetos pesados' },
];

// Rangos de peso por categoría
const RANGOS_POR_CATEGORIA = {
  mudanza: [
    { id: '100-300', label: '100–300 kg', tonelaje: 0.3 },
    { id: '300-600', label: '300–600 kg', tonelaje: 0.5 },
    { id: '600-1000', label: '600 kg – 1 ton', tonelaje: 1.0 },
    { id: '1000-2000', label: '1 ton – 2 ton', tonelaje: 1.5 },
  ],

  electrodomesticos: [
    { id: '50-150', label: '50–150 kg', tonelaje: 0.3 },
    { id: '150-300', label: '150–300 kg', tonelaje: 0.3 },
    { id: '300-500', label: '300–500 kg', tonelaje: 0.5 },
  ],

  mercancia: [
    { id: '100-300', label: '100–300 kg', tonelaje: 0.3 },
    { id: '300-600', label: '300–600 kg', tonelaje: 0.5 },
    { id: '600-1000', label: '600 kg – 1 ton', tonelaje: 1.0 },
    { id: '1000-2000', label: '1 ton – 2 ton', tonelaje: 1.5 },
  ],

  construccion: [
    { id: '300-600', label: '300–600 kg', tonelaje: 0.5 },
    { id: '600-1000', label: '600 kg – 1 ton', tonelaje: 1.0 },
    { id: '1000-2000', label: '1 ton – 2 ton', tonelaje: 1.5 },
    { id: '2000+', label: 'Más de 2 ton', tonelaje: 2.0 },
  ],

  otros: [
    { id: '50-150', label: '50–150 kg', tonelaje: 0.3 },
    { id: '150-300', label: '150–300 kg', tonelaje: 0.3 },
    { id: '300-600', label: '300–600 kg', tonelaje: 0.5 },
    { id: '600-1000', label: '600 kg – 1 ton', tonelaje: 1.0 },
  ],
};

export default function ScreenPedido() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [tipoCarga, setTipoCarga] = useState(null);
  const [pesoAprox, setPesoAprox] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const seleccionarTipo = (key) => {
    setTipoCarga(key);
    setPesoAprox(null);
  };

  const rangosActuales = tipoCarga
    ? RANGOS_POR_CATEGORIA[tipoCarga]
    : [];

  const seleccionarFoto = async () => {
    const permiso =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería.'
      );
      return;
    }

    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

    if (!resultado.canceled) {
      setFotos((prev) => [
        ...prev,
        resultado.assets[0].uri,
      ]);
    }
  };

  const eliminarFoto = (index) => {
    setFotos((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const subirFotoAStorage = async (uri, index) => {
    const nombreArchivo =
      `cargamento_${Date.now()}_${index}.jpg`;

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await supabase.storage
        .from('cargamentos')
        .upload(nombreArchivo, arrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (error) return null;

      const { data: urlData } = supabase.storage
        .from('cargamentos')
        .getPublicUrl(nombreArchivo);

      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const enviarSolicitud = async () => {
    if (!tipoCarga) {
      Alert.alert(
        'Falta información',
        'Selecciona el tipo de carga.'
      );
      return;
    }

    if (!pesoAprox) {
      Alert.alert(
        'Falta información',
        'Selecciona el peso aproximado.'
      );
      return;
    }

    if (!usuario) {
      Alert.alert(
        'Error',
        'No se detectó tu sesión. Vuelve a iniciar sesión.'
      );
      return;
    }

    setEnviando(true);

    try {
      const categoriaSeleccionada = TIPOS_CARGA.find(
        (tipo) => tipo.key === tipoCarga
      );

      const rangoSeleccionado = rangosActuales.find(
        (rango) => rango.id === pesoAprox
      );

      const {
        data: solicitud,
        error: errorSolicitud,
      } = await supabase
        .from('solicitud')
        .insert({
          usuario_id: usuario.usuario_id,
          categoria_id: categoriaSeleccionada.id,
          tonelaje_requerido:
            rangoSeleccionado.tonelaje,
          descripcion_carga: detalle,
          estado: 'borrador',
        })
        .select()
        .single();

      if (errorSolicitud) {
        Alert.alert(
          'Error',
          'No se pudo crear la solicitud. Intenta de nuevo.'
        );
        return;
      }

      for (let i = 0; i < fotos.length; i++) {
        const urlFoto = await subirFotoAStorage(
          fotos[i],
          i
        );

        if (urlFoto) {
          await supabase
            .from('cargamento')
            .insert({
              solicitud_id:
                solicitud.solicitud_id,
              foto_url: urlFoto,
              descripcion: detalle,
            });
        }
      }

      router.push({
        pathname:
          '/Screen/Map/ScreenMapSelectionUser',
        params: {
          solicitudId: solicitud.solicitud_id,
        },
      });
    } catch {
      Alert.alert(
        'Error',
        'Ocurrió un problema al enviar tu solicitud.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Área superior fija */}
      <SafeAreaView
        style={styles.headerSafeArea}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Nuevo flete
          </Text>
        </View>
      </SafeAreaView>

      {/* Contenido desplazable y protegido en la parte inferior */}
      <SafeAreaView
        style={styles.contentSafeArea}
        edges={['bottom']}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Stepper */}
            <View style={styles.stepsRow}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={styles.stepActiveText}>1</Text>
              </View>

              <View style={styles.stepLine} />

              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepPendingText}>2</Text>
              </View>

              <View style={styles.stepLine} />

              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepPendingText}>3</Text>
              </View>

              <View style={styles.stepLine} />

              <View style={[styles.stepCircle, styles.stepPending]}>
                <Text style={styles.stepPendingText}>4</Text>
              </View>
            </View>

            <View style={styles.stepsLabelsRow}>
              <Text style={styles.stepLabelActive}>
                Carga
              </Text>

              <Text style={styles.stepLabelPending}>
                Ruta
              </Text>

              <Text style={styles.stepLabelPending}>
                Detalles
              </Text>

              <Text style={styles.stepLabelPending}>
                Confirmar
              </Text>
            </View>

            {/* Tipo de carga */}
            <Text style={styles.sectionTitle}>
              ¿Qué vas a enviar?
            </Text>

            <View style={styles.grid}>
              {TIPOS_CARGA.map((tipo) => (
                <TouchableOpacity
                  key={tipo.key}
                  style={[
                    styles.option,
                    tipoCarga === tipo.key &&
                    styles.optionSelected,
                  ]}
                  onPress={() => seleccionarTipo(tipo.key)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.optionText,
                      tipoCarga === tipo.key &&
                      styles.optionTextSelected,
                    ]}
                  >
                    {tipo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Peso aproximado */}
            {tipoCarga && (
              <>
                <Text style={styles.sectionTitle}>
                  Peso aproximado
                </Text>

                <View style={styles.gridRow}>
                  {rangosActuales.map((rango) => (
                    <TouchableOpacity
                      key={rango.id}
                      style={[
                        styles.pill,
                        pesoAprox === rango.id &&
                        styles.pillSelected,
                      ]}
                      onPress={() => setPesoAprox(rango.id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          pesoAprox === rango.id &&
                          styles.pillTextSelected,
                        ]}
                      >
                        {rango.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Fotografías */}
            <Text style={styles.sectionTitle}>
              Fotografías del cargamento
            </Text>

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.fotosScroll}
              contentContainerStyle={styles.fotosScrollContent}
            >
              <View style={styles.fotosRow}>
                {fotos.map((uri, index) => (
                  <View
                    key={`${uri}-${index}`}
                    style={styles.fotoBox}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.fotoImagen}
                    />

                    <TouchableOpacity
                      style={styles.fotoEliminar}
                      onPress={() => eliminarFoto(index)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.fotoEliminarTxt}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.fotoAgregar}
                  onPress={seleccionarFoto}
                  activeOpacity={0.75}
                >
                  <Text style={styles.fotoPlus}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <Text style={styles.fotoHint}>
              Toca + para agregar fotos. Ayudan al fletero a
              prepararse mejor.
            </Text>

            {/* Descripción */}
            <Text style={styles.sectionTitle}>
              Descripción adicional
            </Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ej. Sofá de 3 plazas + comedor"
              placeholderTextColor="#9CA3AF"
              value={detalle}
              onChangeText={setDetalle}
              multiline
              textAlignVertical="top"
            />

            {/* Botón final */}
            <TouchableOpacity
              style={[
                styles.button,
                (enviando || !tipoCarga || !pesoAprox) &&
                styles.buttonDisabled,
              ]}
              onPress={enviarSolicitud}
              disabled={enviando || !tipoCarga || !pesoAprox}
              activeOpacity={0.8}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  Siguiente: elegir ruta
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );

}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /*
   * Esta área pinta también el espacio de la barra
   * de estado de Android con el azul oscuro.
   */
  headerSafeArea: {
    backgroundColor: '#071B33',
    zIndex: 10,
  },

  header: {
    width: '100%',
    minHeight: 70,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071B33',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 7,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  headerTitle: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'left',
  },

  /*
   * Esta área protege el contenido de los botones
   * inferiores de navegación del dispositivo.
   */
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },

  stepsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  stepActive: {
    backgroundColor: '#FF6B00',
  },

  stepPending: {
    backgroundColor: '#E5E7EB',
  },

  stepActiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  stepPendingText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },

  stepLine: {
    flex: 1,
    minWidth: 10,
    height: 2,
    backgroundColor: '#E5E7EB',
  },

  stepsLabelsRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 24,
  },

  stepLabelActive: {
    width: '25%',
    fontSize: 11,
    color: '#FF6B00',
    fontWeight: '600',
    textAlign: 'left',
  },

  stepLabelPending: {
    width: '25%',
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  option: {
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },

  optionSelected: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },

  optionText: {
    flexShrink: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  gridRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  pill: {
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },

  pillSelected: {
    backgroundColor: '#1A1A2E',
    borderColor: '#1A1A2E',
  },

  pillText: {
    flexShrink: 1,
    fontSize: 13,
    color: '#374151',
  },

  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  fotosScroll: {
    width: '100%',
    marginTop: 4,
  },

  fotosScrollContent: {
    paddingRight: 4,
  },

  fotosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },

  fotoBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },

  fotoImagen: {
    width: '100%',
    height: '100%',
  },

  fotoEliminar: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fotoEliminarTxt: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  fotoAgregar: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
  },

  fotoPlus: {
    fontSize: 28,
    lineHeight: 32,
    color: '#9CA3AF',
  },

  fotoHint: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#9CA3AF',
  },

  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    color: '#1A1A2E',
  },

  textArea: {
    minHeight: 90,
    maxHeight: 160,
    textAlignVertical: 'top',
  },

  button: {
    width: '100%',
    minHeight: 52,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1E2D4A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});