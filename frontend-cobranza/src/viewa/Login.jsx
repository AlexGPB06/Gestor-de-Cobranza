import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/empleados/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      if (response.ok) {
        const data = await response.json();
        login(data.token, data.rol);
        navigate('/agenda'); // Redirigir a la cola de trabajo
      } else {
        setError('Credenciales inválidas');
      }
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Gestor de Cobranza</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        
        <label className="block mb-2 text-sm font-medium">Usuario</label>
        <input 
          type="text" 
          value={usuario} 
          onChange={(e) => setUsuario(e.target.value)}
          className="w-full border p-2 rounded mb-4" 
          required 
        />

        <label className="block mb-2 text-sm font-medium">Contraseña</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-6" 
          required 
        />

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
};