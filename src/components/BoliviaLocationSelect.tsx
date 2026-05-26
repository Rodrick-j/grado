import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

const BOLIVIA_GEOGRAPHY = {
  "Chuquisaca": ["Sucre", "Camargo", "Camataqui (Villa Abecia)", "Culpina", "El Villar", "Huacaya", "Icla", "Las Carreras", "Padilla", "Poroma", "Presto", "San Lucas", "San Pablo de Huacareta", "Sopachuy", "Tarabuco", "Tarvita", "Tomina", "Uncía", "Villa Alcalá", "Villa Azurduy", "Villa Charcas", "Villa Mojocoya", "Villa Serrano", "Villa Vaca Guzmán", "Villa Zudáñez", "Yotala", "Yamparáez", "Macharetí"],
  "La Paz": ["La Paz", "El Alto", "Achacachi", "Achocalla", "Alto Beni", "Ancoraimes", "Andrés de Machaca", "Apolo", "Asunta", "Aucapata", "Ayata", "Batallas", "Cairoma", "Cajuata", "Calacoto", "Calamarca", "Caquiaviri", "Caranavi", "Catacora", "Chacarilla", "Charaña", "Chulumani", "Chuma", "Chua Cocani", "Collana", "Colquencha", "Colquiri", "Comanche", "Combaya", "Copacabana", "Coripata", "Coro Coro", "Coroico", "Curva", "Desaguadero", "Escoma", "General Juan José Pérez", "Guanay", "Guarina", "Huajchilla", "Huatajata", "Humanata", "Ichoca", "Inquisivi", "Irupana", "Ixiamas", "Jesús de Machaca", "Laja", "Licoma Pampa", "Luribay", "Malla", "Mapiri", "Mocomoco", "Nazacara de Pacajes", "Palca", "Palos Blancos", "Papel Pampa", "Patacamaya", "Pelechuco", "Pucarani", "Puerto Acosta", "Puerto Carabuco", "Puerto Pérez", "Quiabaya", "Quime", "San Andrés de Machaca", "San Buenaventura", "San Pedro de Curahuara", "San Pedro de Tiquina", "Santiago de Callapa", "Santiago de Huata", "Santiago de Machaca", "Sapahaqui", "Sica Sica", "Sorata", "Teoponte", "Tiahuanaco", "Tipuani", "Tito Yupanqui", "Umala", "Viacha", "Waldo Ballivián", "Yanacachi", "Yaco"],
  "Cochabamba": ["Cochabamba", "Aiquile", "Alalay", "Anzaldo", "Arani", "Arbieto", "Arque", "Bolívar", "Capinota", "Chimoré", "Cliza", "Cocapata", "Colcapirhua", "Colomi", "Cuchumuela", "Entre Ríos", "Independencia", "Mizque", "Morochata", "Omereque", "Pasorapa", "Pocona", "Pojo", "Puerto Villarroel", "Punata", "Quillacollo", "Sacaba", "Sacabamba", "San Benito", "Santiváñez", "Shinahota", "Sicaya", "Sipe Sipe", "Tapacarí", "Tacopaya", "Tarata", "Tiraque", "Tiquipaya", "Totora", "Tolata", "Vacas", "Vila Vila", "Villa Rivero", "Villa Tunari", "Vinto"],
  "Oruro": ["Oruro", "Andamarca", "Antequera", "Belén de Andamarca", "Caracollo", "Carangas", "Challapata", "Chipaya", "Choquecota", "Coipasa", "Cruz de Machacamarca", "Curahuara de Carangas", "El Choro", "Escara", "Esmeralda", "Huachacalla", "Huanuni", "La Rivera", "Machacamarca", "Pampa Aullagas", "Pazña", "Poopó", "Sabaya", "Salinas de Garci Mendoza", "San Pedro de Totora", "Santiago de Huari", "Santuario de Quillacas", "Soracachi", "Toledo", "Turco", "Yunguyo de del Litoral", "Villa Vitalina", "Todos Santos"],
  "Potosí": ["Potosí", "Acasio", "Arampampa", "Atocha", "Betanzos", "Caiza \"D\"", "Calcha", "Caripuyo", "Chaquí", "Chayanta", "Chuquihuta", "Ckochas", "Colcha \"K\"", "Colquechaca", "Cotagaita", "Llallagua", "Llica", "Mojinete", "Ocurí", "Puna", "Porco", "Ravelo", "Sacaca", "San Agustín", "San Antonio de Esmoruco", "San Pablo de Lípez", "San Pedro", "San Pedro de Buena Vista", "San Pedro de Macha", "Tupiza", "Tomave", "Toro Toro", "Uncía", "Uyuni", "Vitichi", "Villazón", "Villa de Yocalla", "Tahua", "Tinguipaya", "Urmiri"],
  "Santa Cruz": ["Santa Cruz de la Sierra", "Abapó", "Ascensión de Guarayos", "Buena Vista", "Boyuibe", "Camiri", "Carmen Rivero Tórrez", "Charagua", "Comarapa", "Concepción", "Cotoca", "Cuatro Cañadas", "El Carmen", "El Puente", "El Torno", "Fernández Alonso", "General Saavedra", "Mineros", "Montero", "Moro Moro", "Okinawa Uno", "Pailón", "Pampa Grande", "Porongo", "Portachuelo", "Postrervalle", "Puerto Quijarro", "Puerto Suárez", "Pucará", "Roboré", "Saipina", "Samaipata", "San Antonio de Lomerío", "San Carlos", "San Ignacio de Velasco", "San Javier", "San José de Chiquitos", "San Juan de Yapacaní", "San Julián", "San Matías", "San Miguel de Velasco", "San Pedro", "San Rafael", "San Ramón", "Santa Rosa del Sara", "Trigal", "Urubichá", "Vallegrande", "Warnes", "Yapacaní", "Gutiérrez", "Lagunillas"],
  "Tarija": ["Tarija", "Bermejo", "Caraparí", "El Puente", "Entre Ríos", "Padcaya", "San Lorenzo", "Villamontes", "Yacuiba", "Yunchará", "Uriondo"],
  "Beni": ["Trinidad", "Baure", "Exaltación", "Guayaramerín", "Huacaraje", "Loreto", "Magdalena", "Riberalta", "Reyes", "Rurrenabaque", "San Andrés", "San Borja", "San Ignacio de Moxos", "San Javier", "San Joaquín", "San Ramón", "Santa Ana del Yacuma", "Santa Rosa del Yacuma"],
  "Pando": ["Cobija", "Bella Flor", "Blanca Flor", "Bolpebra", "El Porvenir", "Filadelfia", "Ingavi", "Nueva Esperanza", "Puerto Gonzalo Moreno", "Puerto Rico", "San Pedro", "Santa Rosa del Abuná", "Santos Mercado", "Sena", "Villa Nueva"]
};

interface BoliviaLocationSelectProps {
  department: string;
  municipality: string;
  onChange: (dept: string, muni: string) => void;
}

export function BoliviaLocationSelect({ department, municipality, onChange }: BoliviaLocationSelectProps) {
  const [openDept, setOpenDept] = useState(false);
  const [openMuni, setOpenMuni] = useState(false);
  const [searchDept, setSearchDept] = useState('');
  const [searchMuni, setSearchMuni] = useState('');

  const refDept = useRef<HTMLDivElement>(null);
  const refMuni = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (refDept.current && !refDept.current.contains(e.target as Node)) setOpenDept(false);
      if (refMuni.current && !refMuni.current.contains(e.target as Node)) setOpenMuni(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const departments = Object.keys(BOLIVIA_GEOGRAPHY);
  const filteredDepts = departments.filter(d => d.toLowerCase().includes(searchDept.toLowerCase()));
  
  const municipalities = department ? (BOLIVIA_GEOGRAPHY as any)[department] || [] : [];
  const filteredMunis = municipalities.filter((m: string) => m.toLowerCase().includes(searchMuni.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Departamento */}
      <div style={{ flex: 1, position: 'relative' }} ref={refDept}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Departamento</label>
        <div 
          className="input-field"
          onClick={() => setOpenDept(!openDept)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', minHeight: 40 }}
        >
          <span style={{ color: department ? 'var(--text-primary)' : 'var(--text-muted)' }}>{department || 'Seleccionar...'}</span>
          <Icon name="ChevronDown" size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
        
        {openDept && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
            borderRadius: 12, maxHeight: 250, display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: 8, borderBottom: '1px solid var(--border-secondary)' }}>
              <input 
                autoFocus placeholder="Buscar..." 
                value={searchDept} onChange={e => setSearchDept(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ overflowY: 'auto', padding: 4 }}>
              {filteredDepts.map(d => (
                <div 
                  key={d} onClick={() => { onChange(d, ''); setOpenDept(false); setSearchDept(''); }}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 13, background: department === d ? 'rgba(30,136,229,0.1)' : 'transparent', color: 'var(--text-primary)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseOut={e => e.currentTarget.style.background = department === d ? 'rgba(30,136,229,0.1)' : 'transparent'}
                >
                  {d}
                </div>
              ))}
              {filteredDepts.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No encontrado</div>}
            </div>
          </div>
        )}
      </div>

      {/* Municipio */}
      <div style={{ flex: 1, position: 'relative' }} ref={refMuni}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Municipio / Ciudad</label>
        <div 
          className="input-field"
          onClick={() => { if (department) setOpenMuni(!openMuni); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: department ? 'pointer' : 'not-allowed', opacity: department ? 1 : 0.6, minHeight: 40 }}
        >
          <span style={{ color: municipality ? 'var(--text-primary)' : 'var(--text-muted)' }}>{municipality || 'Seleccionar...'}</span>
          <Icon name="ChevronDown" size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
        
        {openMuni && department && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
            borderRadius: 12, maxHeight: 250, display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: 8, borderBottom: '1px solid var(--border-secondary)' }}>
              <input 
                autoFocus placeholder="Buscar..." 
                value={searchMuni} onChange={e => setSearchMuni(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ overflowY: 'auto', padding: 4 }}>
              {filteredMunis.map((m: string) => (
                <div 
                  key={m} onClick={() => { onChange(department, m); setOpenMuni(false); setSearchMuni(''); }}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 13, background: municipality === m ? 'rgba(30,136,229,0.1)' : 'transparent', color: 'var(--text-primary)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseOut={e => e.currentTarget.style.background = municipality === m ? 'rgba(30,136,229,0.1)' : 'transparent'}
                >
                  {m}
                </div>
              ))}
              {filteredMunis.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No encontrado</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
