/* ==========================================================================
   Contenido editorial que se repite o se recorre en varias páginas.
   ========================================================================== */
import { I, ICO_TIPO } from "./iconos";

export const VALORES = [
  ['Confianza', 'Construimos relaciones transparentes y duraderas con nuestros clientes y aliados.', '<svg viewBox="0 0 24 24" class="ico"><path d="M12 3 4 6.5v5c0 4.6 3.2 8.4 8 9.5 4.8-1.1 8-4.9 8-9.5v-5L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>'],
  ['Responsabilidad', 'Asumimos cada proceso con compromiso y seriedad.', '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'],
  ['Transparencia', 'Brindamos información clara para facilitar decisiones informadas.', '<svg viewBox="0 0 24 24" class="ico"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>'],
  ['Compromiso', 'Nos involucramos en cada proceso buscando ofrecer una atención de calidad.', '<svg viewBox="0 0 24 24" class="ico"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z"/></svg>']
];

export const TIPOS = [
  ['terreno',      'Terrenos',      'Alternativas para quienes buscan construir, invertir o proyectar su próxima oportunidad inmobiliaria.'],
  ['casa',         'Casas',         'Espacios pensados para convertirse en hogares y formar parte de nuevos comienzos.'],
  ['departamento', 'Departamentos', 'Alternativas para quienes buscan un espacio para vivir o una oportunidad de inversión.'],
  ['local',        'Locales',       'Espacios orientados a actividades comerciales y empresariales.']
];

export const FRASES = [
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V4.4A1.4 1.4 0 0 1 4.4 3h8.6a2 2 0 0 1 1.4.6l6.2 6.2a2 2 0 0 1 0 2.6Z"/><circle cx="7.8" cy="7.8" r="1.4"/></svg>', 'Terrenos, casas, departamentos y locales'],
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M12 3 4 6.5v5c0 4.6 3.2 8.4 8 9.5 4.8-1.1 8-4.9 8-9.5v-5L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>', 'Más de 8 años de experiencia'],
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M3 17.5 9 11l3.5 3.5L21 6"/><path d="M15.5 6H21v5.5"/></svg>', 'Oportunidades de inversión'],
  ['<svg viewBox="0 0 24 24" class="ico"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/><path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19c0-2.4-.9-4.2-2.4-5.3"/></svg>', 'Atención personalizada'],
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/></svg>', 'Acompañamiento en todo el proceso'],
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>', 'Información clara y transparente'],
  ['<svg viewBox="0 0 24 24" class="ico"><path d="M3 21h18"/><path d="M6 21V8.5l7-4.5v17"/><path d="M13 10.5h5V21"/></svg>', 'Presencia en Lima y Huancayo'],
  ['<svg viewBox="0 0 24 24" class="ico"><circle cx="8" cy="12" r="4.5"/><path d="M12.5 12H21"/><path d="M17.5 12v3M20 12v2.5"/></svg>', 'Compra, venta y alquiler']
];

export const SERVICIOS_INICIO = [
  ['Compra tu propiedad', 'Terrenos, casas, departamentos y locales en Lima y Huancayo, filtrados a tu medida.', 'Ver propiedades', '/resultados', '/assets/img/servicio-compra.webp'],
  ['Vende tu propiedad', 'Te acompañamos desde la primera conversación hasta el cierre de la venta.', 'Quiero vender', '/vende', '/assets/img/servicio-vende.webp'],
  ['Sé un agente', 'Súmate a nuestro equipo y desarrolla tu cartera de clientes con respaldo.', 'Quiero postular', '/agente', '/assets/img/servicio-agente.webp']
];

export const JORNADA = [
  ['Conversamos contigo', 'Entendemos qué buscas: presupuesto, zona y tipo de propiedad.'],
  ['Seleccionamos alternativas', 'Filtramos el portafolio y te mostramos solo lo que se ajusta a tu búsqueda.'],
  ['Visitamos juntos', 'Coordinamos cada visita y te acompañamos, resolviendo tus dudas en el momento.'],
  ['Cerramos sin sorpresas', 'Te orientamos en la documentación hasta que la propiedad sea tuya.']
];

export const TESTIMONIOS = [
  ['RV', 'Nos ayudaron a encontrar el terreno ideal en Huancayo. El acompañamiento durante todo el proceso nos dio mucha tranquilidad.', 'R. Vásquez', 'Compró un terreno en Huancayo'],
  ['JQ', 'El equipo fue muy claro con la documentación y los tiempos. Todo el proceso fue transparente de principio a fin.', 'J. Quispe', 'Compró un departamento en Huancayo'],
  ['MT', 'Vendimos nuestra propiedad más rápido de lo que esperábamos, con muy buena asesoría en cada paso.', 'M. Torres', 'Vendió una casa en El Tambo'],
  ['LF', 'Encontramos un local comercial en muy buena ubicación. La asesoría legal nos dio mucha seguridad para cerrar el trato.', 'L. Fernández', 'Compró un local comercial en Huancayo'],
  ['AP', 'Buscábamos un terreno para invertir y nos mostraron varias opciones que se ajustaban al presupuesto. Muy buena atención.', 'A. Paredes', 'Compró un terreno en Orcotuna']
];

export const QUE_HACEMOS = [
  'Publicamos tu propiedad en nuestro portafolio web, con ficha, fotografías y ubicación.',
  'La difundimos en nuestras redes, donde ya seguimos a compradores activos.',
  'La presentamos a la cartera de clientes que hoy buscan en Lima y Huancayo.',
  'Coordinamos las visitas y acompañamos a cada interesado en persona.',
  'Te orientamos en la documentación hasta el cierre de la operación.'
];

export const PASOS = [
  ['Cuéntanos sobre tu propiedad', 'Completa el formulario con los datos básicos del inmueble. Toma menos de dos minutos.'],
  ['Nos ponemos en contacto', 'Revisamos la información y te escribimos para resolver dudas y conocer tus expectativas.'],
  ['Conocemos la propiedad', 'Coordinamos una visita para tomar fotografías y registrar las características reales del inmueble.'],
  ['Publicamos y comercializamos', 'Tu propiedad entra al portafolio y empieza a difundirse. Te mantenemos al tanto de cada interesado.']
];

export const DIFUSION = [
  ['Portafolio web', 'Ficha propia con fotografías, características y ubicación en el mapa.', 'lupa', '/compra'],
  ['Facebook', 'Publicaciones hacia la comunidad que ya nos sigue.', 'fb', 'https://www.facebook.com/share/1EvrLJMWR9/?mibextid=wwXIfr'],
  ['TikTok', 'Recorridos y contenido en video para llegar a nuevos compradores.', 'tt', 'https://www.tiktok.com/@inmobiliariagoldenhome?is_from_webapp=1&sender_device=pc'],
  ['Cartera de clientes', 'Contacto directo con quienes ya nos dijeron qué están buscando.', 'personas', '']
];

export const SERVICIOS = [
  ['compra',    'Compra de propiedades', 'Te ayudamos a encontrar alternativas inmobiliarias según tus necesidades.<br><em>Terrenos · Casas · Departamentos · Locales</em>', 'Ver propiedades', '/compra', '', 'lupa'],
  ['venta',     'Venta de propiedades', 'Acompañamos a propietarios que buscan comercializar sus inmuebles, conectándolos con potenciales compradores.', 'Quiero vender', '/vende', '', 'etiqueta'],
  ['alquiler',  'Alquiler de propiedades', 'Facilitamos la búsqueda de alternativas inmobiliarias disponibles para alquiler.', 'Consultar propiedades', '/resultados?operacion=alquiler', '', 'llave'],
  ['asesoria',  'Asesoría inmobiliaria', 'Brindamos orientación durante el proceso inmobiliario, buscando que nuestros clientes cuenten con información clara para tomar sus decisiones.', 'Hablar con un asesor', '#', 'wa', 'personas'],
  ['inversion', 'Oportunidades de inversión', 'Presentamos alternativas inmobiliarias que pueden responder a diferentes objetivos de inversión.', 'Conocer alternativas', '/resultados?tipo=terreno', '', 'grafico']
];

export const BENEFICIOS = [
  ['+8 años de experiencia', 'Forma parte de una empresa con trayectoria en el sector inmobiliario.', 'reloj'],
  ['Diversidad de propiedades', 'Trabaja con terrenos, casas, departamentos y locales.', 'etiqueta'],
  ['Acompañamiento', 'Cuenta con orientación y respaldo durante tu desarrollo.', 'personas'],
  ['Oportunidades comerciales', 'Desarrolla nuevas oportunidades y amplía tu cartera de clientes.', 'grafico']
];

export const PERFIL = [
  ['escudo', 'Comprometidas y responsables'],
  ['personas', 'Orientadas al servicio'],
  ['etiqueta', 'Con interés en el sector inmobiliario'],
  ['grafico', 'Con actitud comercial'],
  ['estrella', 'Con ganas de aprender y crecer'],
  ['reloj', 'Con disponibilidad para acompañar a sus clientes']
];
