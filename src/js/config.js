// Configuración global del sistema
const CONFIG = {
    denominaciones: [
        { valor: 100000, nombre: '100,000' },
        { valor: 50000, nombre: '50,000' },
        { valor: 20000, nombre: '20,000' },
        { valor: 10000, nombre: '10,000' },
        { valor: 5000, nombre: '5,000' },
        { valor: 2000, nombre: '2,000' },
        { valor: 1000, nombre: '1,000' },
        { valor: 500, nombre: '500' }
    ],
    monedas: {
        gs: 'Guaraníes',
        usd: 'Dólares',
        brl: 'Reales',
        ars: 'Pesos'
    }
};

const SERVICIOS_DEFAULT = [
    "Aca Puedo",
    "Aqui Pago",
    "Pago Express",
    "Wepa",
    "Pasaje NSA",
    "Encomienda NSA",
    "Apostala"
];

// Inicialización de servicios de pagos desde localStorage o default
let SERVICIOS_PAGOS = JSON.parse(localStorage.getItem('serviciosPagos')) || SERVICIOS_DEFAULT;
