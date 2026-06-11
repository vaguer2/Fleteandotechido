import React, { createContext, useState } from 'react';

// 1. Valor por defecto para evitar undefined
export const EstadoGlobalContext = createContext({
  usuario: null,
  setUsuario: () => {},
});

export function EstadoGlobalProvider({ children }) {
  const [usuario, setUsuario] = useState(null);

  return (
    <EstadoGlobalContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </EstadoGlobalContext.Provider>
  );
}