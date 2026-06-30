import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export function useRastreoFletero(solicitudId, activo) {
    const { usuario } = useAuth();
    const [error, setError] = useState(null);
    const suscripcionRef = useRef(null);

    useEffect(() => {
        console.log('=== useRastreoFletero ejecutado ===');
        console.log('activo:', activo);
        console.log('solicitudId:', solicitudId);
        console.log('usuario?.fletero_id:', usuario?.fletero_id);

        async function iniciarRastreo() {
            if (!activo || !solicitudId || !usuario?.fletero_id) {
                console.log('Rastreo NO iniciado — condiciones no cumplidas');
                return;
            }

            console.log('Solicitando permisos de ubicación...');
            const { status } = await Location.requestForegroundPermissionsAsync();
            console.log('Estado del permiso:', status);

            if (status !== 'granted') {
                setError('Permiso de ubicación denegado');
                console.log('Permiso DENEGADO, deteniendo rastreo');
                return;
            }

            console.log('Iniciando watchPositionAsync...');
            suscripcionRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 8000,
                    distanceInterval: 15,
                },
                async (ubicacion) => {
                    console.log('Nueva ubicación detectada:', ubicacion.coords.latitude, ubicacion.coords.longitude);

                    const { error: errorInsert } = await supabase
                        .from('ubicacion_fletero')
                        .insert({
                            fletero_id: usuario.fletero_id,
                            solicitud_id: solicitudId,
                            latitud: ubicacion.coords.latitude,
                            longitud: ubicacion.coords.longitude,
                        });

                    if (errorInsert) {
                        console.log('Error al subir ubicación:', JSON.stringify(errorInsert));
                    } else {
                        console.log('Ubicación subida exitosamente');
                    }
                }
            );

            console.log('watchPositionAsync configurado correctamente');
        }

        iniciarRastreo();

        return () => {
            if (suscripcionRef.current) {
                suscripcionRef.current.remove();
                suscripcionRef.current = null;
                console.log('Rastreo detenido — componente desmontado');
            }
        };
    }, [activo, solicitudId, usuario]);

    return { error };
}