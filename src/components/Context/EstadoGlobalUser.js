import React, { createContext, useState } from 'react';

// 1. Valor por defecto para evitar undefined
export const EstadoGlobalContext = createContext({
  usuario: null,
  setUsuario: () => {},
});

export function EstadoGlobalProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [login, setLogin] = useState(false);
  const [transportista, setTransportista] = useState(false);
  const [authReady, setAuthReady] = useState(true);

  return (
    <EstadoGlobalContext.Provider value={{login,setLogin, usuario, setUsuario, transportista, setTransportista, authReady,setAuthReady }}>
      {children}
    </EstadoGlobalContext.Provider>
  );
}