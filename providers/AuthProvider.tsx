import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
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
                    setUsuario(usuarioData);
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
                        // No existe en ninguna tabla, cerrar sesión
                        await supabase.auth.signOut();
                        router.replace('./Screen/Login/ScreenStart');  //aqui cambie
                    }
                }
            } else {
                router.replace('./Screen/Login/ScreenStart');  // aqui cambie
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
                        // No existe en ninguna tabla, cerrar sesión
                        await supabase.auth.signOut();
                        router.replace('./Screen/Login/ScreenStart'); //aqui cambie
                    }
                }
            } else {
                setLogin(false);
                setUsuario(null);
                setEsTransportista(false);
                router.replace('./Screen/Login/ScreenStart'); //aqui cambie
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

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