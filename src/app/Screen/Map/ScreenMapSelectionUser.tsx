import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAvt9AnpvHfi3GKapnoSUKRqLTNR9tAaWo';

type Coordenada = {
    latitude: number;
    longitude: number;
};

type Fase = 'origen' | 'destino';

export default function ScreenMapSelectionUser() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const solicitudId = params.solicitudId;

    const [fase, setFase] = useState<Fase>('origen');
    const [origen, setOrigen] = useState<Coordenada | null>(null);
    const [destino, setDestino] = useState<Coordenada | null>(null);
    const [direccionOrigen, setDireccionOrigen] = useState<string>('');
    const [direccionDestino, setDireccionDestino] = useState<string>('');
    const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
    const [buscandoDireccion, setBuscandoDireccion] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Función reutilizable de geocoding inverso para CUALQUIER coordenada
    const obtenerDireccion = async (coordenada: Coordenada): Promise<string> => {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordenada.latitude},${coordenada.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            const response = await fetch(url);
            const json = await response.json();

            // Log de depuración para ver exactamente qué responde Google
            console.log('Geocoding status:', json.status);
            console.log('Geocoding results length:', json.results?.length);

            if (json.status === 'OK' && json.results && json.results.length > 0) {
                return json.results[0].formatted_address;
            }

            // Si Google no encuentra nada, mostramos el status real para depurar
            console.log('Geocoding fallo completo:', JSON.stringify(json));
            return `Sin dirección (${json.status})`;

        } catch (error) {
            console.log('Error al obtener dirección:', error);
            return 'No se pudo obtener la dirección';
        }
    };

    useEffect(() => {
        async function obtenerUbicacionActual() {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para definir el punto de origen.');
                setCargandoUbicacion(false);
                return;
            }

            const ubicacion = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const coordenadaOrigen = {
                latitude: ubicacion.coords.latitude,
                longitude: ubicacion.coords.longitude,
            };

            setOrigen(coordenadaOrigen);

            // Obtenemos la dirección real del origen también
            const direccion = await obtenerDireccion(coordenadaOrigen);
            setDireccionOrigen(direccion);

            setCargandoUbicacion(false);
        }

        obtenerUbicacionActual();
    }, []);

    // Mientras está en fase "origen", tocar el mapa también mueve el origen
    const tocarMapa = async (coordenada: Coordenada) => {
        if (fase === 'origen') {
            setOrigen(coordenada);
            const direccion = await obtenerDireccion(coordenada);
            setDireccionOrigen(direccion);
        } else {
            seleccionarDestino(coordenada);
        }
    };

    // Arrastrar el marcador de origen actualiza su posición y su dirección
    const arrastrarOrigen = async (coordenada: Coordenada) => {
        setOrigen(coordenada);
        const direccion = await obtenerDireccion(coordenada);
        setDireccionOrigen(direccion);
    };

    const confirmarOrigen = () => {
        if (!origen) {
            Alert.alert('Falta tu ubicación', 'Espera a que se detecte tu ubicación o tócala en el mapa.');
            return;
        }
        setFase('destino');
    };

    const seleccionarDestino = async (coordenada: Coordenada) => {
        setDestino(coordenada);
        setBuscandoDireccion(true);

        const direccion = await obtenerDireccion(coordenada);
        setDireccionDestino(direccion);

        setBuscandoDireccion(false);
    };

    const calcularDistanciaKm = async (origenCoord: Coordenada, destinoCoord: Coordenada) => {
        try {
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origenCoord.latitude},${origenCoord.longitude}&destination=${destinoCoord.latitude},${destinoCoord.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            const response = await fetch(url);
            const json = await response.json();

            if (json.routes && json.routes.length > 0) {
                const metros = json.routes[0].legs[0].distance.value;
                return metros / 1000;
            }
            return null;
        } catch (error) {
            console.log('Error al calcular distancia:', error);
            return null;
        }
    };

    const confirmarRuta = async () => {
        if (!origen) {
            Alert.alert('Falta tu ubicación', 'No se pudo detectar tu ubicación de origen.');
            return;
        }
        if (!destino) {
            Alert.alert('Falta el destino', 'Toca el mapa para seleccionar a dónde quieres tu entrega.');
            return;
        }
        if (!solicitudId) {
            Alert.alert('Error', 'No se encontró la solicitud activa.');
            return;
        }

        setGuardando(true);
        try {
            const { error: errorPuntoRuta } = await supabase.from('punto_ruta').insert([
                {
                    solicitud_id: solicitudId,
                    tipo: 'origen',
                    latitud: origen.latitude,
                    longitud: origen.longitude,
                    direccion_texto: direccionOrigen || 'Ubicación actual',
                },
                {
                    solicitud_id: solicitudId,
                    tipo: 'destino',
                    latitud: destino.latitude,
                    longitud: destino.longitude,
                    direccion_texto: direccionDestino || 'Sin dirección',
                },
            ]);

            if (errorPuntoRuta) {
                console.log('Error al guardar punto_ruta:', errorPuntoRuta);
                Alert.alert('Error', 'No se pudo guardar la ruta. Intenta de nuevo.');
                return;
            }

            const distanciaCalculada = await calcularDistanciaKm(origen, destino);

            if (distanciaCalculada !== null) {
                const { error: errorDistancia } = await supabase
                    .from('solicitud')
                    .update({ distancia_km: distanciaCalculada })
                    .eq('solicitud_id', solicitudId);

                if (errorDistancia) {
                    console.log('Error al actualizar distancia_km:', errorDistancia);
                }
            }

            router.push({
                pathname: '/Screen/Pedido/ScreenFechaPedido',
                params: { solicitudId },
            });

        } catch (error) {
            console.log('Error general:', error);
            Alert.alert('Error', 'Ocurrió un problema al guardar la ruta.');
        } finally {
            setGuardando(false);
        }
    };

    if (cargandoUbicacion) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator color="#FF7A1A" size="large" />
                <Text style={styles.textoCargando}>Obteniendo tu ubicación...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapa}
                initialRegion={{
                    latitude: origen?.latitude ?? 20.6296,
                    longitude: origen?.longitude ?? -87.0739,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                onPress={(e) => tocarMapa(e.nativeEvent.coordinate)}
            >
                {origen && (
                    <Marker
                        coordinate={origen}
                        title="Tu ubicación"
                        draggable={fase === 'origen'}
                        onDragEnd={(e) => arrastrarOrigen(e.nativeEvent.coordinate)}
                    >
                        <View style={styles.markerOrigen} />
                    </Marker>
                )}

                {destino && (
                    <Marker coordinate={destino} title="Destino">
                        <View style={styles.markerDestino} />
                    </Marker>
                )}
            </MapView>

            <View style={styles.tarjetaInferior}>
                {fase === 'origen' ? (
                    <>
                        <Text style={styles.instruccion}>Confirma tu ubicación de origen</Text>
                        <Text style={styles.subInstruccion}>
                            Arrastra el punto azul o toca el mapa para ajustarlo
                        </Text>

                        {direccionOrigen && (
                            <Text style={styles.direccionTexto}>{direccionOrigen}</Text>
                        )}

                        <TouchableOpacity
                            style={styles.botonConfirmar}
                            onPress={confirmarOrigen}
                        >
                            <Text style={styles.textoBotonConfirmar}>Confirmar origen</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.instruccion}>
                            {destino ? 'Destino seleccionado' : 'Toca el mapa para elegir tu destino'}
                        </Text>

                        {buscandoDireccion && (
                            <ActivityIndicator color="#FF7A1A" style={{ marginVertical: 8 }} />
                        )}

                        {direccionDestino && !buscandoDireccion && (
                            <Text style={styles.direccionTexto}>{direccionDestino}</Text>
                        )}

                        <View style={styles.filaBotones}>
                            <TouchableOpacity
                                style={styles.botonVolver}
                                onPress={() => setFase('origen')}
                            >
                                <Text style={styles.textoBotonVolver}>Cambiar origen</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.botonConfirmar, styles.botonConfirmarFlex, (!destino || guardando) && styles.botonDeshabilitado]}
                                onPress={confirmarRuta}
                                disabled={!destino || guardando}
                            >
                                {guardando ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.textoBotonConfirmar}>Confirmar ruta</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapa: { flex: 1 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
    textoCargando: { marginTop: 12, color: '#8A8FA8', fontSize: 14 },
    markerOrigen: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#0A2348', borderWidth: 3, borderColor: '#FFFFFF' },
    markerDestino: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF7A1A', borderWidth: 3, borderColor: '#FFFFFF' },
    tarjetaInferior: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
    },
    instruccion: { fontSize: 15, fontWeight: '700', color: '#0A2348', marginBottom: 4 },
    subInstruccion: { fontSize: 13, color: '#8A8FA8', marginBottom: 16 },
    direccionTexto: { fontSize: 13, color: '#8A8FA8', marginBottom: 16 },
    botonConfirmar: { backgroundColor: '#FF7A1A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    botonConfirmarFlex: { flex: 1 },
    botonDeshabilitado: { backgroundColor: '#FFD4AD' },
    textoBotonConfirmar: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    filaBotones: { flexDirection: 'row', gap: 10 },
    botonVolver: {
        borderWidth: 1.5, borderColor: '#0A2348', borderRadius: 14,
        paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center',
    },
    textoBotonVolver: { color: '#0A2348', fontWeight: '700', fontSize: 14 },
});