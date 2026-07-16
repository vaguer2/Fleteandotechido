import { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, Image, Alert, ActivityIndicator
} from 'react-native';
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

// Rangos de peso por categoría — cada tonelaje está cubierto en el tabulador
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

  // Cuando cambia el tipo de carga, resetea el peso seleccionado
  const seleccionarTipo = (key) => {
    setTipoCarga(key);
    setPesoAprox(null);
  };

  const rangosActuales = tipoCarga ? RANGOS_POR_CATEGORIA[tipoCarga] : [];

  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!resultado.canceled) {
      setFotos(prev => [...prev, resultado.assets[0].uri]);
    }
  };

  const eliminarFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const subirFotoAStorage = async (uri, index) => {
    const nombreArchivo = `cargamento_${Date.now()}_${index}.jpg`;
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('cargamentos')
        .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg' });
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
      const rangoSeleccionado = rangosActuales.find((r) => r.id === pesoAprox);

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
        Alert.alert('Error', 'No se pudo crear la solicitud. Intenta de nuevo.');
        return;
      }

      for (let i = 0; i < fotos.length; i++) {
        const urlFoto = await subirFotoAStorage(fotos[i], i);
        if (urlFoto) {
          await supabase.from('cargamento').insert({
            solicitud_id: solicitud.solicitud_id,
            foto_url: urlFoto,
            descripcion: detalle,
          });
        }
      }

      router.push({
        pathname: '/Screen/Map/ScreenMapSelectionUser',
        params: { solicitudId: solicitud.solicitud_id },
      });
    } catch {
      Alert.alert('Error', 'Ocurrió un problema al enviar tu solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    
    <ScrollView contentContainerStyle={styles.container}>



      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>



      <Text style={styles.title}>Nuevo flete</Text>

      {/* Stepper */}
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

      {/* Tipo de carga */}
      <Text style={styles.sectionTitle}>¿Qué vas a enviar?</Text>
      <View style={styles.grid}>
        {TIPOS_CARGA.map((tipo) => (
          <TouchableOpacity
            key={tipo.key}
            style={[styles.option, tipoCarga === tipo.key && styles.optionSelected]}
            onPress={() => seleccionarTipo(tipo.key)}
          >
            <Text style={[styles.optionText, tipoCarga === tipo.key && styles.optionTextSelected]}>
              {tipo.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Peso aproximado — solo aparece cuando hay tipo seleccionado */}
      {tipoCarga && (
        <>
          <Text style={styles.sectionTitle}>Peso aproximado</Text>
          <View style={styles.gridRow}>
            {rangosActuales.map((rango) => (
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
        </>
      )}

      {/* Fotos del cargamento — flujo dinámico */}
      <Text style={styles.sectionTitle}>Fotografías del cargamento</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
        <View style={styles.fotosRow}>
          {fotos.map((uri, index) => (
            <View key={index} style={styles.fotoBox}>
              <Image source={{ uri }} style={styles.fotoImagen} />
              <TouchableOpacity
                style={styles.fotoEliminar}
                onPress={() => eliminarFoto(index)}
              >
                <Text style={styles.fotoEliminarTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.fotoAgregar} onPress={seleccionarFoto}>
            <Text style={styles.fotoPlus}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Text style={styles.fotoHint}>Toca + para agregar fotos. Ayudan al fletero a prepararse mejor.</Text>

      {/* Descripción */}
      <Text style={styles.sectionTitle}>Descripción adicional</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Ej. Sofá de 3 plazas + comedor"
        value={detalle}
        onChangeText={setDetalle}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, (enviando || !tipoCarga || !pesoAprox) && { opacity: 0.6 }]}
        onPress={enviarSolicitud}
        disabled={enviando || !tipoCarga || !pesoAprox}
      >
        {enviando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Siguiente: elegir ruta</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  stepActive: { backgroundColor: '#FF6B00' },
  stepPending: { backgroundColor: '#E5E7EB' },
  stepActiveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepPendingText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  stepsLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  stepLabelActive: { fontSize: 11, color: '#FF6B00', fontWeight: '600' },
  stepLabelPending: { fontSize: 11, color: '#9CA3AF' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionSelected: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  optionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  optionTextSelected: { color: '#fff', fontWeight: '700' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillSelected: { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' },
  pillText: { fontSize: 13, color: '#374151' },
  pillTextSelected: { color: '#fff', fontWeight: '600' },
  fotosScroll: { marginTop: 4 },
  fotosRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  fotoBox: {
    width: 80, height: 80, borderRadius: 10,
    overflow: 'hidden', position: 'relative',
  },
  fotoImagen: { width: 80, height: 80 },
  fotoEliminar: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  fotoEliminarTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  fotoAgregar: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  fotoPlus: { fontSize: 28, color: '#9CA3AF', lineHeight: 32 },
  fotoHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1A1A2E', backgroundColor: '#F9FAFB',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#1e2d4a', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: {
    marginBottom: 8,
    alignSelf: 'flex-start',
    padding: 4,
  },
  backArrow: {
    fontSize: 32,
    color: '#1A1A2E',
    lineHeight: 36,
  },
});