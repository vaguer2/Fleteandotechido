import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';

// Configuración de cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Registra el token del dispositivo y lo guarda en Supabase
export async function registrarTokenNotificaciones(usuarioId) {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        //console.log('Permiso actual:', existingStatus);

        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        //console.log('Permiso final:', finalStatus);

        if (finalStatus !== 'granted') {
            console.log('Permiso denegado');
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '4909f413-9bcf-4e70-91ec-f46299d0fbc9',
        });

        console.log('Token generado:', tokenData.data);

        const { error } = await supabase
            .from('usuario')
            .update({ push_token: tokenData.data })
            .eq('usuario_id', usuarioId);

        console.log('Error al guardar token:', error);

        return tokenData.data;
    } catch (error) {
        console.log('Error al registrar token:', error);
        return null;
    }
}

// Envía una notificación push via Expo Push API
export async function enviarNotificacion(pushToken, titulo, mensaje) {
    if (!pushToken) {
        console.log('No hay push_token disponible');
        return;
    }

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title: titulo,
                body: mensaje,
                sound: 'default',
                priority: 'high',
            }),
        });
        const result = await response.json();
        console.log('Respuesta de Expo Push:', JSON.stringify(result));
    } catch (error) {
        console.log('Error al enviar notificación:', error);
    }
}
export async function registrarTokenFletero(fleteroId) {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return null;

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '4909f413-9bcf-4e70-91ec-f46299d0fbc9',
        });

        await supabase
            .from('fletero')
            .update({ push_token: tokenData.data })
            .eq('fletero_id', fleteroId);

        return tokenData.data;
    } catch (error) {
        console.log('Error al registrar token del fletero:', error);
        return null;
    }
}
export async function obtenerTokenFletero(solicitudId) {
    try {
        const { data: solicitud } = await supabase
            .from('solicitud')
            .select('fletero_id')
            .eq('solicitud_id', solicitudId)
            .single();

        if (!solicitud?.fletero_id) return null;

        const { data: fletero } = await supabase
            .from('fletero')
            .select('push_token')
            .eq('fletero_id', solicitud.fletero_id)
            .single();

        return fletero?.push_token ?? null;
    } catch (error) {
        console.log('Error al obtener token del fletero:', error);
        return null;
    }
}

// Obtiene el push_token del cliente de una solicitud específica
//si llega ahaber un problema con las notificaciones solo hay que descomentar los console.log que se comentaron
export async function obtenerTokenCliente(solicitudId) {
    try {
        //console.log('obtenerTokenCliente - solicitudId:', solicitudId);

        const { data: solicitud, error: errorSolicitud } = await supabase
            .from('solicitud')
            .select('usuario_id')
            .eq('solicitud_id', solicitudId)
            .single();

        //console.log('Paso 1 - solicitud:', JSON.stringify(solicitud), 'error:', JSON.stringify(errorSolicitud));

        if (errorSolicitud || !solicitud) return null;

        const { data: usuario, error: errorUsuario } = await supabase
            .from('usuario')
            .select('push_token')
            .eq('usuario_id', solicitud.usuario_id)
            .single();

        //console.log('Paso 2 - usuario:', JSON.stringify(usuario), 'error:', JSON.stringify(errorUsuario));

        if (errorUsuario || !usuario) return null;

        //console.log('Token encontrado:', usuario.push_token);
        return usuario.push_token ?? null;
    } catch (error) {
        //console.log('Error al obtener token del cliente:', error);
        return null;
    }
}