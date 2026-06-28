import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert, ActivityIndicator } from 'react-native';
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

const RANGOS_PESO = [
  { id: '100-300', label: '100–300 kg', tonelaje: 0.5 },
  { id: '300-600', label: '300–600 kg', tonelaje: 1.0 },
  { id: '600+', label: '600+ kg', tonelaje: 1.5 },
];

export default function ScreenPedido() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [tipoCarga, setTipoCarga] = useState(null);
  const [pesoAprox, setPesoAprox] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const seleccionarFoto = async () => {
    if (fotos.length >= 4) return;

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }

    const resultados = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!resultados.canceled) {
      setFotos([...fotos, resultados.assets[0].uri]);
    }
  };

  // Sube una foto al Storage de Supabase y devuelve la URL pública
  const subirFotoAStorage = async (uri, index) => {
    const nombreArchivo = `cargamento_${Date.now()}_${index}.jpg`;

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { data, error } = await supabase.storage
        .from('cargamentos')
        .upload(nombreArchivo, arrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (error) {
        console.log('Error al subir foto:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('cargamentos')
        .getPublicUrl(nombreArchivo);

      return urlData.publicUrl;

    } catch (error) {
      console.log('Error en subirFotoAStorage:', error);
      return null;
    }
  };

  const enviarSolicitud = async () => {
    if (!tipoCarga) {
      Alert.alert('Falta información', 'Selecciona el tipo de carga.');
      return;
    }
    if (!pesoAprox) {
      Alert.alert('Falta información', 'Selecciona el peso aproximado.');
      return;
    }
    if (!usuario) {
      Alert.alert('Error', 'No se detectó tu sesión. Vuelve a iniciar sesión.');
      return;
    }

    setEnviando(true);
    try {
      const categoriaSeleccionada = TIPOS_CARGA.find((t) => t.key === tipoCarga);
      const rangoSeleccionado = RANGOS_PESO.find((r) => r.id === pesoAprox);

      // 1. Insertar la solicitud principal como BORRADOR
      //    (todavia no es visible para los fleteros hasta que se confirme al final del flujo)
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from('solicitud')
        .insert({
          usuario_id: usuario.usuario_id,
          categoria_id: categoriaSeleccionada.id,
          tonelaje_requerido: rangoSeleccionado.tonelaje,
          descripcion_carga: detalle,
          estado: 'borrador',
        })
        .select()
        .single();

      if (errorSolicitud) {
        console.log('Error al crear solicitud:', errorSolicitud);
        Alert.alert('Error', 'No se pudo crear la solicitud. Intenta de nuevo.');
        return;
      }

      // 2. Subir las fotos y guardarlas en cargamento
      for (let i = 0; i < fotos.length; i++) {
        const urlFoto = await subirFotoAStorage(fotos[i], i);

        await supabase.from('cargamento').insert({
          solicitud_id: solicitud.solicitud_id,
          foto_url: urlFoto,
          descripcion: detalle,
        });
      }

      // 3. Continuar al siguiente paso: seleccionar la ruta
      router.push({
        pathname: '/Screen/Map/ScreenMapSelectionUser',
        params: { solicitudId: solicitud.solicitud_id },
      });

    } catch (error) {
      console.log('Error general:', error);
      Alert.alert('Error', 'Ocurrió un problema al enviar tu solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nuevo flete</Text>

      <View style={styles.stepsRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={styles.stepActiveText}>1</Text>
          </View>
        </TouchableOpacity>
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
        <Text style={styles.stepLabelActive}>Carga</Text>
        <Text style={styles.stepLabelPending}>Ruta</Text>
        <Text style={styles.stepLabelPending}>Detalles</Text>
        <Text style={styles.stepLabelPending}>Confirmar</Text>
      </View>

      <Text style={styles.sectionTitle}>¿Qué vas a enviar?</Text>
      <View style={styles.grid}>
        {TIPOS_CARGA.map((tipo) => (
          <TouchableOpacity
            key={tipo.key}
            style={[styles.option, tipoCarga === tipo.key && styles.optionSelected]}
            onPress={() => setTipoCarga(tipo.key)}
          >
            <Text style={[styles.optionText, tipoCarga === tipo.key && styles.optionTextSelected]}>
              {tipo.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Peso aproximado</Text>
      <View style={styles.gridRow}>
        {RANGOS_PESO.map((rango) => (
          <TouchableOpacity
            key={rango.id}
            style={[styles.pill, pesoAprox === rango.id && styles.pillSelected]}
            onPress={() => setPesoAprox(rango.id)}
          >
            <Text style={[styles.pillText, pesoAprox === rango.id && styles.pillTextSelected]}>
              {rango.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectionTitle}>Fotografías del cargamento</Text>
      <View style={styles.fotosGrid}>
        {[0, 1, 2, 3].map((i) => (
          <TouchableOpacity
            key={i}
            style={[styles.fotoBox, fotos[i] && styles.fotoBoxLlena]}
            onPress={seleccionarFoto}
          >
            {fotos[i] ? (
              <Image source={{ uri: fotos[i] }} style={styles.fotoImagen} />
            ) : (
              <Text style={styles.fotoPlus}>+</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.fotoHint}>Agregar hasta 4 fotos para ayudar al fletero a prepararse mejor</Text>

      <Text style={styles.sectionTitle}>Descripción adicional</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Ej. Sofá de 3 plazas + comedor"
        value={detalle}
        onChangeText={setDetalle}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, enviando && { opacity: 0.7 }]}
        onPress={enviarSolicitud}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Siguiente: elegir ruta</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1c2b4a', marginTop: 30 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#1c2b4a' },
  stepDoneText: { color: '#fff', fontWeight: '700' },
  stepActive: { backgroundColor: '#ff7a00' },
  stepActiveText: { color: '#fff', fontWeight: '700' },
  stepPending: { backgroundColor: '#e9ecf2' },
  stepPendingText: { color: '#9aa3b2', fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e9ecf2' },
  stepLineActive: { backgroundColor: '#1c2b4a' },
  stepsLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  stepLabelDone: { fontSize: 12, color: '#1c2b4a', fontWeight: '600' },
  stepLabelActive: { fontSize: 12, color: '#ff7a00', fontWeight: '700' },
  stepLabelPending: { fontSize: 12, color: '#9aa3b2' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1c2b4a', marginBottom: 10, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  option: { width: '48%', borderWidth: 1, borderColor: '#e1e4ea', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 12, backgroundColor: '#fff' },
  optionSelected: { borderColor: '#ff7a00', backgroundColor: '#fff4ea' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#555' },
  optionTextSelected: { color: '#ff7a00' },
  pill: { flex: 1, borderWidth: 1, borderColor: '#e1e4ea', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#fff' },
  pillSelected: { borderColor: '#ff7a00', backgroundColor: '#fff4ea' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTextSelected: { color: '#ff7a00' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15, backgroundColor: '#fff' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  button: { backgroundColor: '#1c2b4a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fotosGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  fotoBox: { width: 76, height: 76, borderRadius: 12, borderWidth: 2, borderColor: '#B8F0C8', borderStyle: 'dashed', backgroundColor: '#F0FBF4', justifyContent: 'center', alignItems: 'center' },
  fotoBoxLlena: { borderStyle: 'solid', borderColor: '#22C55E' },
  fotoImagen: { width: '100%', height: '100%', borderRadius: 10 },
  fotoPlus: { fontSize: 24, color: '#86EFAC' },
  fotoHint: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
});