import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { useLocalSearchParams } from 'expo-router'

//  Luis solo llena estos tipos con los campos de Supabase
export type RastreoParams = {
  fletero_id: string
  fletero_nombre: string
  fletero_rating: string
  fletero_lat: string
  fletero_lng: string
  destino_lat: string
  destino_lng: string
  eta_minutos: string
}

export default function ScreenRastroMap() {
  // Datos que vienen de la pantalla anterior al navegar
  const params = useLocalSearchParams<RastreoParams>()

  // Valores con fallback para no romper si faltan datos
  const driver = {
    nombre: params.fletero_nombre ?? 'Fletero',
    rating: parseFloat(params.fletero_rating ?? '0'),
    latitude: parseFloat(params.fletero_lat ?? '20.6597'),
    longitude: parseFloat(params.fletero_lng ?? '-103.3496'),
  }

  const destino = {
    latitude: parseFloat(params.destino_lat ?? '20.6650'),
    longitude: parseFloat(params.destino_lng ?? '-103.3550'),
  }

  const eta = params.eta_minutos ?? '...'

  // Iniciales del fletero para el avatar
  const iniciales = driver.nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <View style={styles.container}>

      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Rastreo en tiempo real</Text>
          <Text style={styles.headerSub}>
            {driver.nombre} está en camino · {eta} min
          </Text>
        </View>
      </View>

      
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: driver.latitude,
          longitude: driver.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        
        <Marker
          coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
          title={driver.nombre}
          description="Fletero en camino"
        />

        
        <Marker
          coordinate={destino}
          title="Tu ubicación"
          pinColor="orange"
        />
      </MapView>

      
      <View style={styles.card}>
        <View style={styles.driverRow}>

          
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{driver.nombre}</Text>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(driver.rating))} {driver.rating}
            </Text>
          </View>

          {/* Botones — Luis conecta las acciones */}
          <TouchableOpacity style={styles.actionBtn}>
            <Text>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text>💬</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Llegada estimada</Text>
          <Text style={styles.etaValue}>~{eta} min</Text>
        </View>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
},
  header: {
    backgroundColor: '#1e2d4a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { 
    color: 'white', 
    fontSize: 24, 
    lineHeight: 28 
},
  headerTitle: { 
    color: 'white', 
    fontSize: 15, 
    fontWeight: '500' 
},
  headerSub: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 12, 
    marginTop: 2 
},
  map: { 
    flex: 1 
},
  card: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { 
    fontWeight: '500', 
    fontSize: 13, 
    color: '#1e2d4a' 
},
  driverName: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#1a1a1a' 
},
  stars: { 
    fontSize: 12, 
    color: '#f0a030', 
    marginTop: 2 
},
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f4f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff8f0',
    borderRadius: 8,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#f0d0a0',
  },
  etaLabel: { 
    fontSize: 13, 
    color: '#666' 
},
  etaValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#e07030' 
},
})