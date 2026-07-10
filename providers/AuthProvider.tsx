import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { registrarTokenNotificaciones } from '../src/hooks/useNotificaciones';
import { supabase } from '../lib/supabase';

type AuthData = {
    loading: boolean;
    session: Session | null;
    usuario: any;
    setUsuario: (u: any) => void;
    esTransportista: boolean;
    setEsTransportista: (v: boolean) => void;
    login: boolean;
    setLogin: (v: boolean) => void;
};

const AuthContext = createContext<AuthData>({
    loading: true,
    session: null,
    usuario: null,
    setUsuario: () => { },
    esTransportista: false,
    setEsTransportista: () => { },
    login: false,
    setLogin: () => { },
});

interface Props {
    children: React.ReactNode;
}

export default function AuthProvider(props: Props) {
    const [loading, setLoading] = useState<boolean>(true);
    const [session, setSession] = useState<Session | null>(null);
    const [usuario, setUsuario] = useState<any>(null);
    const [esTransportista, setEsTransportista] = useState<boolean>(false);
    const [login, setLogin] = useState<boolean>(false);

    useEffect(() => {
        async function fetchSession() {
            const { error, data } = await supabase.auth.getSession();
            if (error) throw error;

            if (data.session) {
                setSession(data.session);
                setLogin(true);

                const { data: usuarioData } = await supabase
                    .from('usuario')
                    .select('*')
                    .eq('usuario_id', data.session.user.id)
                    .single();

                if (usuarioData) {
                    console.log('*** Entrando al bloque de usuario, registrando token...');
                    setUsuario(usuarioData);
                    await registrarTokenNotificaciones(usuarioData.usuario_id);
                    router.replace('/Screen/Home/ScreenHomeUser');
                } else {
                    const { data: fleteroData } = await supabase
                        .from('fletero')
                        .select('*')
                        .eq('fletero_id', data.session.user.id)
                        .single();

                    if (fleteroData) {
                        setUsuario(fleteroData);
                        setEsTransportista(true);
                        router.replace('/Screen/Home/ScreenHomeFletero' as any);
                    } else {
                        await supabase.auth.signOut();
                        router.replace('/Screen/Login/ScreenStart');
                    }
                }
            } else {
                router.replace('/Screen/Login/ScreenStart');
            }

            setLoading(false);
        }

        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
            setSession(session);
            setLoading(false);

            if (session) {
                setLogin(true);

                const { data: usuarioData } = await supabase
                    .from('usuario')
                    .select('*')
                    .eq('usuario_id', session.user.id)
                    .single();

                if (usuarioData) {
                    setUsuario(usuarioData);
                    await registrarTokenNotificaciones(usuarioData.usuario_id);
                    router.replace('/Screen/Home/ScreenHomeUser');
                } else {
                    const { data: fleteroData } = await supabase
                        .from('fletero')
                        .select('*')
                        .eq('fletero_id', session.user.id)
                        .single();

                    if (fleteroData) {
                        setUsuario(fleteroData);
                        setEsTransportista(true);
                        router.replace('/Screen/Home/ScreenHomeFletero' as any);
                    } else {
                        await supabase.auth.signOut();
                        router.replace('/Screen/Login/ScreenStart');
                    }
                }
            } else {
                setLogin(false);
                setUsuario(null);
                setEsTransportista(false);
                router.replace('/Screen/Login/ScreenStart');
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Suscripción Realtime para actualizar datos del fletero en tiempo real
    useEffect(() => {
        if (!usuario?.fletero_id) {
            console.log('No hay fletero_id, no se suscribe');
            return;
        }

        console.log('Suscribiendo a cambios del fletero:', usuario.fletero_id);

        const canal = supabase
            .channel(`fletero_${usuario.fletero_id}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'fletero',
                    filter: `fletero_id=eq.${usuario.fletero_id}`
                },
                (payload) => {
                    console.log('Cambio detectado en fletero:', payload.new);
                    setUsuario((prev: any) => ({ ...prev, ...payload.new }));
                }
            )
            .subscribe((status) => {
                console.log('Estado de la suscripcion:', status);
            });

        return () => {
            supabase.removeChannel(canal);
        };
    }, [usuario?.fletero_id]);

    return (
        <AuthContext.Provider value={{
            loading,
            session,
            usuario,
            setUsuario,
            esTransportista,
            setEsTransportista,
            login,
            setLogin,
        }}>
            {props.children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);