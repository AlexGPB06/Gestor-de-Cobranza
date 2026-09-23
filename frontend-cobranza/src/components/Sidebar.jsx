import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-slate-800 text-white flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-slate-700">Ocupia Workspace</div>
      <nav className="flex-1 p-4 space-y-2">
        {/* Visible para todos los gestores */}
        <Link to="/agenda" className="block p-2 hover:bg-slate-700 rounded">Mi Agenda</Link>
        <Link to="/cartera" className="block p-2 hover:bg-slate-700 rounded">Consultar Cartera</Link>
        
        {/* Solo visible para administradores */}
        {user?.rol === 'ADMINISTRADOR' && (
          <>
            <div className="pt-4 mt-4 border-t border-slate-700 text-sm text-slate-400">Configuración</div>
            <Link to="/catalogos" className="block p-2 hover:bg-slate-700 rounded">Catálogos Operativos</Link>
            <Link to="/auditoria" className="block p-2 hover:bg-slate-700 rounded">Bitácora de Auditoría</Link>
            <Link to="/asignaciones" className="block p-2 hover:bg-slate-700 rounded">Reparto de Asignaciones</Link>
          </>
        )}
      </nav>
      <button onClick={handleLogout} className="p-4 bg-red-600 hover:bg-red-700 w-full text-left">
        Cerrar Sesión
      </button>
    </div>
  );
};