export const CONFIG = {
  denominaciones: [
    { valor: 100000, nombre: '100,000' },
    { valor: 50000, nombre: '50,000' },
    { valor: 20000, nombre: '20,000' },
    { valor: 10000, nombre: '10,000' },
    { valor: 5000, nombre: '5,000' },
    { valor: 2000, nombre: '2,000' },
    { valor: 1000, nombre: '1,000' },
    { valor: 500, nombre: '500' },
    { valor: 100, nombre: '100' },
    { valor: 50, nombre: '50' }
  ],
  monedas: {
    gs: 'Guaraníes',
    usd: 'Dólares',
    brl: 'Reales',
    ars: 'Pesos'
  }
};

export const SERVICIOS_DEFAULT = [
  "Aca Puedo",
  "Aqui Pago",
  "Pago Express",
  "Wepa",
  "Pasaje NSA",
  "Encomienda NSA",
  "Apostala"
];

export const SERVICIOS_CATALOGO = [
  { key: 'apLote', label: 'Aca Puedo' },
  { key: 'aquiPago', label: 'Aqui Pago' },
  { key: 'expressLote', label: 'Pago Express' },
  { key: 'wepa', label: 'Wepa' },
  { key: 'pasajeNsa', label: 'Pasaje NSA' },
  { key: 'encomiendaNsa', label: 'Encomienda NSA' },
  { key: 'apostala', label: 'Apostala' }
]

export const getServicioLabel = (key) => {
  const found = SERVICIOS_CATALOGO.find(s => s.key === key)
  return found ? found.label : key
}

export const getServicios = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('serviciosPagos');
    if (saved) return JSON.parse(saved);
  }
  return SERVICIOS_DEFAULT;
};
