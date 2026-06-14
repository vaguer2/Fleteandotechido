import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PASOS = ['Ruta', 'Carga', 'Fecha', 'Confirmar'];

export default function ScreenFechaPedido() {
    const router = useRouter();
    const [transportistaSeleccionado, setTransportistaSeleccionado] = useState(null);

    // TODO: reemplazar con datos de la base de datos
    const transportistas = [];
    const resumen = {
        origen: '',
        destino: '',
        distancia: '',
        carga: '',
        fecha: '',
        tiempoEst: '',
    };

    const renderEstrellas = (cantidad = 0) =>
        '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

          
            <View style={styles.stepperRow}>
                {PASOS.map((paso, index) => {
                    const num = index + 1;
                    const activo = num === 3;
                    const completado = num < 3;
                    return (
                        <View key={paso} style={styles.stepWrapper}>
                            <TouchableOpacity
                                style={styles.stepItem}
                                onPress={() => {
                                    if (num === 1) router.push('/Screen/Home/ScreenHomeUser');
                                    if (num === 2) router.back();
                                }}
                            >
                                <View style={[
                                    styles.stepCircle,
                                    completado && styles.stepDone,
                                    activo && styles.stepActive,
                                ]}>
                                    <Text style={[styles.stepNum, (completado || activo) && styles.stepNumActive]}>
                                        {num}
                                    </Text>
                                </View>
                                <Text style={[styles.stepLabel, activo && styles.stepLabelActive]}>
                                    {paso}
                                </Text>
                            </TouchableOpacity>
                            {index < PASOS.length - 1 && (
                                <View style={[styles.lineaConector, completado && styles.lineaActiva]} />
                            )}
                        </View>
                    );
                })}
            </View>

            
            <Text style={styles.titulo}>Elige tu transportista</Text>
            <Text style={styles.subtitulo}>{transportistas.length} opciones disponibles</Text>

          
            <View style={styles.card}>
                <View style={styles.rutaRow}>
                    <View style={styles.dotVerde} />
                    <Text style={styles.rutaTexto}>{resumen.origen}</Text>
                </View>
                <View style={styles.lineaVertical} />
                <View style={styles.rutaRow}>
                    <View style={styles.dotNaranja} />
                    <Text style={styles.rutaTexto}>{resumen.destino}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Distancia</Text>
                        <Text style={styles.infoValor}>{resumen.distancia}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Carga</Text>
                        <Text style={styles.infoValor}>{resumen.carga}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Fecha</Text>
                        <Text style={styles.infoValor}>{resumen.fecha}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Tiempo est.</Text>
                        <Text style={styles.infoValor}>{resumen.tiempoEst}</Text>
                    </View>
                </View>
            </View>

            
            {transportistas.map((t) => {
                const seleccionado = transportistaSeleccionado === t.id;
                return (
                    <TouchableOpacity key={t.id} style={[styles.cardTransportista, seleccionado && styles.cardSeleccionado]}
                        onPress={() => setTransportistaSeleccionado(t.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.avatar, { backgroundColor: t.color }]}>
                            <Text style={styles.avatarText}>{t.iniciales}</Text>
                        </View>
                        <View style={styles.transportistaInfo}>
                            <Text style={styles.transportistaNombre}>{t.nombre}</Text>
                            <Text style={[styles.estrellas, { color: '#F97316' }]}>
                                {renderEstrellas(t.estrellas)}
                            </Text>
                            <Text style={styles.transportistaDetalle}>
                                {t.vehiculo} • Llega en {t.llegaEn}
                            </Text>
                        </View>
                        <View style={styles.precioBox}>
                            <Text style={styles.precio}>${t.precio}</Text>
                            <Text style={styles.etiqueta}>{t.etiqueta}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

           
            <TouchableOpacity
                style={[styles.boton, !transportistaSeleccionado && styles.botonDeshabilitado]}
                onPress={() => {
                    if (transportistaSeleccionado) {
                        router.push('/Screen/Pedido/ScreenConfirmarPedido');
                    }
                }}
                activeOpacity={0.85}
            >
                <Text style={styles.botonTexto}>Confirmar transportista </Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F8FAFC' 
    },
    content: { 
        padding: 16, 
        paddingBottom: 32 
    },

    // Stepper
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stepItem: {
        alignItems: 'center',
        gap: 4,
    },
    lineaConector: {
        flex: 1,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginBottom: 18,
    },
    lineaActiva: { 
        backgroundColor: '#1E293B' 
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDone: { 
        backgroundColor: '#1E293B' 
    },
    stepActive: { 
        backgroundColor: '#F97316' 
    },
    stepNum: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: '#94A3B8' 
    },
    stepNumActive: { 
        color: '#FFFFFF' 
    },
    stepLabel: { 
        fontSize: 11, 
        color: '#94A3B8' 
    },
    stepLabelActive: { 
        color: '#F97316', 
        fontWeight: '600' 
    },

    // Título
    titulo: { 
        fontSize: 22, 
        fontWeight: '700', 
        color: '#0F172A', 
        textAlign: 'center', 
        marginBottom: 4 
    },
    subtitulo: { 
        fontSize: 13, 
        color: '#64748B', 
        textAlign: 'center', 
        marginBottom: 16 
    },

    // Card resumen
    card: {
        backgroundColor: '#FFFFFF', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 12,
        shadowColor: '#000', 
        shadowOpacity: 0.06, 
        shadowRadius: 8,
        shadowOffset: { 
            width: 0, 
            height: 2 
        }, 
        elevation: 2,
    },
    rutaRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 2 
    },
    dotVerde: { 
        width: 10, 
        height: 10,
        borderRadius: 5, 
        backgroundColor: '#22C55E' 
    },
    dotNaranja: { width: 10, 
        height: 10, 
        borderRadius: 5, 
        backgroundColor: '#F97316' 
    },
    lineaVertical: { width: 2, 
        height: 10, 
        backgroundColor: '#E2E8F0', 
        marginLeft: 4, 
        marginVertical: 2 
    },
    rutaTexto: { fontSize: 14, 
        color: '#0F172A', 
        fontWeight: '500' 
    },
    separator: { height: 1, 
        backgroundColor: '#F1F5F9', 
        marginVertical: 12 
    },
    infoGrid: { flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 12 
    },
    infoItem: { 
        width: '45%' 
    },
    infoLabel: { 
        fontSize: 11, 
        color: '#94A3B8', 
        marginBottom: 2 
    },
    infoValor: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#0F172A' 
    },

    // Card transportista
    cardTransportista: {
        backgroundColor: '#FFFFFF', 
        borderRadius: 16, 
        padding: 14, 
        marginBottom: 10,
        flexDirection: 'row', 
        alignItems: 'center', 
        borderWidth: 2, 
        borderColor: 'transparent',
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 6,
        shadowOffset: { 
            width: 0, 
            height: 2 
        }, 
        elevation: 1,
    },
    cardSeleccionado: { 
        borderColor: '#F97316' 
    },
    avatar: { 
        width: 48, 
        height: 48, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 12 
    },
    avatarText: { 
        color: '#FFFFFF', 
        fontWeight: '700', 
        fontSize: 15 
    },
    transportistaInfo: { 
        flex: 1 
    },
    transportistaNombre: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#0F172A' 
    },
    estrellas: { 
        fontSize: 12, 
        marginVertical: 2 
    },
    transportistaDetalle: { 
        fontSize: 12, 
        color: '#64748B' 
    },
    precioBox: { 
        alignItems: 'flex-end' 
    },
    precio: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#0F172A' 
    },
    etiqueta: { 
        fontSize: 11, 
        color: '#64748B', 
        marginTop: 2 
    },

    // Botón
    boton: { 
        backgroundColor: '#0F172A', 
        borderRadius: 14, 
        paddingVertical: 16, 
        alignItems: 'center', 
        marginTop: 8 
    },
    botonDeshabilitado: { 
        backgroundColor: '#94A3B8' 
    },
    botonTexto: { 
        color: '#FFFFFF', 
        fontSize: 16, 
        fontWeight: '700' 
    },
});