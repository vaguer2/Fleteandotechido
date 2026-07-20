import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../providers/AuthProvider';

const DOCUMENTOS = {
    ine: { label: 'INE / Identificación oficial', icon: 'id-card-outline' },
    licencia: { label: 'Licencia de conducir', icon: 'card-outline' },
    foto_vehiculo: { label: 'Foto del vehículo', icon: 'car-outline' },
};
const ESTADOS = {
    aprobado: { texto: 'Aprobado', color: '#15803d', fondo: '#dcfce7', borde: '#86efac', icono: 'checkmark-circle' },
    rechazado: { texto: 'Rechazado', color: '#b91c1c', fondo: '#fee2e2', borde: '#fca5a5', icono: 'close-circle' },
    pendiente: { texto: 'Pendiente', color: '#b45309', fondo: '#fef3c7', borde: '#fcd34d', icono: 'time' },
};

export default function ScreenMisDocumentosFletero() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { usuario: fletero } = useAuth();

    const [documentos, setDocumentos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [errorCarga, setErrorCarga] = useState('');

    const fleteroIdParametro = Array.isArray(params.fleteroId)
        ? params.fleteroId[0]
        : params.fleteroId;

    const fleteroId =
        fleteroIdParametro ||
        fletero?.fletero_id ||
        null;

    const cargarDocumentos = useCallback(
        async (esActualizacion = false) => {
            if (!fleteroId) {
                setDocumentos([]);
                setErrorCarga(
                    'No se pudo identificar el perfil del fletero.'
                );
                setCargando(false);
                setActualizando(false);
                return;
            }

            if (esActualizacion) {
                setActualizando(true);
            } else {
                setCargando(true);
            }

            setErrorCarga('');

            try {
                const { data, error } = await supabase
                    .from('documento_fletero')
                    .select(`
            documento_id,
            fletero_id,
            admin_id,
            tipo,
            url_archivo,
            estado,
            revisado_en,
            subido_en
          `)
                    .eq('fletero_id', fleteroId)
                    .order('subido_en', {
                        ascending: false,
                    });

                if (error) {
                    console.log(
                        'Error al consultar documento_fletero:',
                        error
                    );

                    setDocumentos([]);
                    setErrorCarga(
                        `No se pudieron cargar tus documentos: ${error.message}`
                    );
                    return;
                }

                console.log(
                    'Fletero consultado:',
                    fleteroId
                );

                console.log(
                    'Documentos encontrados:',
                    data
                );

                setDocumentos(data ?? []);
            } catch (error) {
                console.log(
                    'Error general al cargar documentos:',
                    error
                );

                setDocumentos([]);
                setErrorCarga(
                    'Ocurrió un problema al consultar los documentos.'
                );
            } finally {
                setCargando(false);
                setActualizando(false);
            }
        },
        [fleteroId]
    );

    useEffect(() => {
        cargarDocumentos();
    }, [cargarDocumentos]);

    const abrirDocumento = async documento => {
        const url = documento?.url_archivo?.trim();

        if (!url) {
            Alert.alert(
                'Archivo no disponible',
                'Este documento no tiene una URL válida.'
            );
            return;
        }

        try {
            const compatible = await Linking.canOpenURL(url);

            if (!compatible) {
                Alert.alert(
                    'No se puede abrir',
                    'El dispositivo no puede abrir este archivo.'
                );
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.log(
                'Error al abrir documento:',
                error
            );

            Alert.alert(
                'Error',
                'No se pudo abrir el documento.'
            );
        }
    };

    const formatearFecha = fecha => {
        if (!fecha) {
            return 'Fecha no disponible';
        }

        const valor = new Date(fecha);

        if (Number.isNaN(valor.getTime())) {
            return 'Fecha no disponible';
        }

        return valor.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="#0b2545"
            />

            <SafeAreaView
                style={styles.headerSafeArea}
                edges={['top']}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Regresar"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    <View style={styles.headerText}>
                        <Text
                            style={styles.headerTitle}
                            numberOfLines={1}
                        >
                            Mis documentos
                        </Text>

                        <Text
                            style={styles.headerSubtitle}
                            numberOfLines={1}
                        >
                            Documentos registrados en la plataforma
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            <SafeAreaView
                style={styles.contentSafeArea}
                edges={['bottom']}
            >
                {cargando ? (
                    <View style={styles.loading}>
                        <ActivityIndicator
                            size="large"
                            color="#f97316"
                        />

                        <Text style={styles.loadingText}>
                            Cargando documentos...
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={actualizando}
                                onRefresh={() =>
                                    cargarDocumentos(true)
                                }
                                colors={['#f97316']}
                                tintColor="#f97316"
                            />
                        }
                    >
                        <View style={styles.infoCard}>
                            <Ionicons
                                name="information-circle-outline"
                                size={21}
                                color="#1d4ed8"
                            />

                            <Text style={styles.infoText}>
                                Aquí puedes consultar los documentos que tienes
                                registrados. Para reemplazar un documento rechazado,
                                hazlo desde la pantalla de verificación.
                            </Text>
                        </View>

                        <Text style={styles.sectionTitle}>
                            Documentos subidos
                        </Text>

                        {errorCarga ? (
                            <View style={styles.errorCard}>
                                <Text style={styles.errorTitle}>
                                    No se pudieron cargar los documentos
                                </Text>

                                <Text style={styles.errorText}>
                                    {errorCarga}
                                </Text>

                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={() =>
                                        cargarDocumentos()
                                    }
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.retryButtonText}>
                                        Intentar nuevamente
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : documentos.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons
                                    name="document-text-outline"
                                    size={54}
                                    color="#94a3b8"
                                />

                                <Text style={styles.emptyTitle}>
                                    No tienes documentos subidos
                                </Text>

                                <Text style={styles.emptyText}>
                                    Cuando subas tus documentos aparecerán en esta
                                    sección.
                                </Text>
                            </View>
                        ) : (
                            documentos.map(documento => {
                                const config =
                                    DOCUMENTOS[documento.tipo] ?? {
                                        label:
                                            documento.tipo ||
                                            'Documento',
                                        icon: 'document-outline',
                                    };

                                const estado =
                                    ESTADOS[documento.estado] ?? {
                                        texto:
                                            documento.estado ||
                                            'Sin estado',
                                        color: '#475569',
                                        fondo: '#f1f5f9',
                                        borde: '#cbd5e1',
                                        icono:
                                            'help-circle-outline',
                                    };

                                return (
                                    <TouchableOpacity
                                        key={documento.documento_id}
                                        style={styles.documentCard}
                                        onPress={() =>
                                            abrirDocumento(documento)
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.documentTop}>
                                            <View style={styles.documentIcon}>
                                                <Ionicons
                                                    name={config.icon}
                                                    size={25}
                                                    color="#0b2545"
                                                />
                                            </View>

                                            <View style={styles.documentInfo}>
                                                <Text
                                                    style={styles.documentTitle}
                                                    numberOfLines={2}
                                                >
                                                    {config.label}
                                                </Text>

                                                <Text style={styles.documentDate}>
                                                    Subido:{' '}
                                                    {formatearFecha(
                                                        documento.subido_en
                                                    )}
                                                </Text>
                                            </View>

                                            <Ionicons
                                                name="open-outline"
                                                size={20}
                                                color="#64748b"
                                            />
                                        </View>

                                        <View style={styles.documentBottom}>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    {
                                                        backgroundColor:
                                                            estado.fondo,
                                                        borderColor:
                                                            estado.borde,
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={estado.icono}
                                                    size={15}
                                                    color={estado.color}
                                                />

                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        {
                                                            color:
                                                                estado.color,
                                                        },
                                                    ]}
                                                >
                                                    {estado.texto}
                                                </Text>
                                            </View>

                                            <Text style={styles.viewText}>
                                                Toca para ver
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerSafeArea: {
        backgroundColor: '#0b2545',
    },
    header: {
        minHeight: 72,
        backgroundColor: '#0b2545',
        paddingHorizontal: 18,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor:
            'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 2,
    },
    contentSafeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        flexGrow: 1,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        padding: 20,
        paddingBottom: 36,
    },
    loading: {
        flex: 1,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 12,
    },
    infoCard: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        color: '#1d4ed8',
        fontSize: 13,
        lineHeight: 19,
    },
    sectionTitle: {
        color: '#0f172a',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 14,
    },
    documentCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        marginBottom: 14,
    },
    documentTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    documentIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        backgroundColor: '#e8eef5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    documentInfo: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    documentTitle: {
        color: '#0f172a',
        fontSize: 15,
        fontWeight: '700',
    },
    documentDate: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    documentBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
            'space-between',
        marginTop: 15,
    },
    statusBadge: {
        maxWidth: '70%',
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statusText: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '700',
    },
    viewText: {
        color: '#f97316',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyCard: {
        width: '100%',
        minHeight: 260,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        color: '#0f172a',
        fontSize: 17,
        fontWeight: '700',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyText: {
        color: '#64748b',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 7,
        textAlign: 'center',
    },
    errorCard: {
        width: '100%',
        minHeight: 220,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: {
        color: '#b91c1c',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    errorText: {
        color: '#64748b',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#f97316',
        borderRadius: 11,
        paddingHorizontal: 18,
        paddingVertical: 11,
        marginTop: 18,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});