import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

const COUNTRY_CODES = [
  { code: '+591', country: 'Bolivia', iso: 'bo', format: '#### ####' },
  { code: '+1', country: 'EE.UU. / Canadá', iso: 'us', format: '(###) ###-####' },
  { code: '+51', country: 'Perú', iso: 'pe', format: '### ### ###' },
  { code: '+52', country: 'México', iso: 'mx', format: '## #### ####' },
  { code: '+53', country: 'Cuba', iso: 'cu', format: '#### ####' },
  { code: '+54', country: 'Argentina', iso: 'ar', format: '## ####-####' },
  { code: '+55', country: 'Brasil', iso: 'br', format: '## #####-####' },
  { code: '+56', country: 'Chile', iso: 'cl', format: '# #### ####' },
  { code: '+57', country: 'Colombia', iso: 'co', format: '### ### ####' },
  { code: '+58', country: 'Venezuela', iso: 've', format: '### ###-####' },
  { code: '+502', country: 'Guatemala', iso: 'gt', format: '#### ####' },
  { code: '+503', country: 'El Salvador', iso: 'sv', format: '#### ####' },
  { code: '+504', country: 'Honduras', iso: 'hn', format: '#### ####' },
  { code: '+505', country: 'Nicaragua', iso: 'ni', format: '#### ####' },
  { code: '+506', country: 'Costa Rica', iso: 'cr', format: '#### ####' },
  { code: '+507', country: 'Panamá', iso: 'pa', format: '#### ####' },
  { code: '+593', country: 'Ecuador', iso: 'ec', format: '## ### ####' },
  { code: '+595', country: 'Paraguay', iso: 'py', format: '### ######' },
  { code: '+598', country: 'Uruguay', iso: 'uy', format: '# ### ####' },
  { code: '+33', country: 'Francia', iso: 'fr', format: '# ## ## ## ##' },
  { code: '+34', country: 'España', iso: 'es', format: '### ### ###' },
  { code: '+39', country: 'Italia', iso: 'it', format: '### ### ####' },
  { code: '+44', country: 'Reino Unido', iso: 'gb', format: '#### ######' },
  { code: '+49', country: 'Alemania', iso: 'de', format: '#### #######' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function PhoneInput({ value, onChange, required }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Parse initial value (e.g. "+591 1234 5678")
  // El Regex debe atrapar el código, y todo lo demás es el número formateado
  const splitMatch = value.match(/^(\+\d{1,4})\s?(.*)$/);
  const currentPrefix = splitMatch ? splitMatch[1] : '+591';
  const currentNumber = splitMatch ? splitMatch[2] : value;
  
  const currentCountry = COUNTRY_CODES.find(c => c.code === currentPrefix) || COUNTRY_CODES[0];

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Extraer solo los números introducidos
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
    
    // 2. Aplicar la máscara del formato
    const format = currentCountry.format;
    let formatted = '';
    let digitIndex = 0;
    
    for (let i = 0; i < format.length; i++) {
      if (digitIndex >= digitsOnly.length) break;
      
      if (format[i] === '#') {
        formatted += digitsOnly[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }
    
    onChange(`${currentPrefix} ${formatted}`);
  };

  const handlePrefixSelect = (prefix: string) => {
    onChange(`${prefix} ${currentNumber}`);
    setIsOpen(false);
    setSearch('');
  };

  const filteredCountries = COUNTRY_CODES.filter(c => 
    c.country.toLowerCase().includes(search.toLowerCase()) || 
    c.code.includes(search)
  );

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8 }} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
          borderRadius: 12, cursor: 'pointer', minWidth: 100, flexShrink: 0,
          color: 'var(--text-primary)', fontSize: 13, fontWeight: 500
        }}
      >
        <img src={`https://flagcdn.com/w20/${currentCountry.iso}.png`} alt={currentCountry.country} style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }} />
        <span>{currentCountry.code}</span>
        <Icon name="ChevronDown" size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
      </div>

      <input 
        className="input-field" 
        style={{ flex: 1 }}
        placeholder={currentCountry.format.replace(/#/g, 'X')}
        value={currentNumber}
        onChange={handleNumberChange}
        required={required}
      />

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
          borderRadius: 12, width: 280, maxHeight: 300, overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 50,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--border-secondary)', position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icon name="Search" size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
              <input 
                autoFocus
                placeholder="Buscar país o prefijo..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: '100%', padding: '8px 10px 8px 32px', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 13,
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
          </div>
          <div style={{ padding: 6 }}>
            {filteredCountries.map(c => (
              <div 
                key={c.code}
                onClick={() => handlePrefixSelect(c.code)}
                style={{
                  padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
                  background: currentPrefix === c.code ? 'rgba(30,136,229,0.1)' : 'transparent'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseOut={e => e.currentTarget.style.background = currentPrefix === c.code ? 'rgba(30,136,229,0.1)' : 'transparent'}
              >
                <img src={`https://flagcdn.com/w20/${c.iso}.png`} alt={c.country} style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }} />
                <span style={{ fontWeight: 600, width: 45 }}>{c.code}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.country}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No se encontraron países
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
