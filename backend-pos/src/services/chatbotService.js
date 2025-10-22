class ChatbotService {
  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD") // Separar tildes
      .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
      .trim();
  }

  initializeKnowledgeBase() {
    return {
      // ==================== SALUDOS Y AYUDA GENERAL ====================
      saludo: {
        patterns: [
          "hola",
          "buenos días",
          "buenas tardes",
          "hey",
          "hi",
          "qué tal",
        ],
        response:
          "¡Hola! Soy tu asistente virtual del sistema POS. ¿En qué puedo ayudarte? Puedo explicarte sobre ventas, productos, usuarios o reportes.",
        roles: ["cajero", "admin", "gerente", "dueno"], // Todos los roles
      },
      ayuda: {
        patterns: [
          "qué puedes hacer",
          "ayuda",
          "funciones",
          "para qué sirves",
          "qué sabes hacer",
        ],
        response:
          "Puedo ayudarte con:\n• Procesos de venta y cobro\n• Gestión de productos e inventario\n• Configuración de usuarios y roles\n• Generación de reportes\n• Solución de problemas comunes\n\n¿Sobre qué tema necesitas ayuda?",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== VENTAS Y COBROS ====================
      proceso_venta: {
        patterns: [
          "cómo vender",
          "hacer una venta",
          "proceso de venta",
          "vender producto",
          "cobrar",
        ],
        response:
          '**Proceso de venta completo:**\n1. Ve al Dashboard Empleado\n2. Agrega productos al carrito (click o escanear código)\n3. Revisa los totales en el carrito\n4. Presiona "Finalizar venta"\n5. Selecciona forma de pago (efectivo/tarjeta)\n6. Confirma la venta\n\nEl sistema automáticamente descuenta el stock y genera el comprobante.',
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      formas_pago: {
        patterns: [
          "formas de pago",
          "métodos de pago",
          "pago con efectivo",
          "pago con tarjeta",
        ],
        response:
          "**Formas de pago disponibles:**\n• Efectivo\n• Tarjeta (si está configurado)\n\nEl sistema calcula automáticamente el cambio cuando es pago en efectivo.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      cancelar_venta: {
        patterns: [
          "cancelar venta",
          "eliminar venta",
          "revertir venta",
          "anular venta",
        ],
        response:
          "Para cancelar una venta:\n1. Solo administradores pueden cancelar ventas\n2. El sistema revierte automáticamente el stock\n3. Se registra en el historial de inventario\n4. Contacta a un administrador si necesitas cancelar una venta",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== PRODUCTOS E INVENTARIO ====================
      agregar_producto: {
        patterns: [
          "agregar producto",
          "nuevo producto",
          "crear producto",
          "registrar producto",
        ],
        response:
          '**Para agregar un producto:**\n1. Ve a "Gestión de Productos" (solo admin/gerente)\n2. Completa: nombre, código de barras, precios de compra/venta\n3. Opcional: categoría, proveedor, fecha de caducidad\n4. Puedes subir una imagen\n5. El sistema valida automáticamente los datos',
        roles: ["admin", "gerente", "dueno"], // Cajeros NO pueden ver esto
      },
      consultar_stock: {
        patterns: [
          "consultar stock",
          "ver inventario",
          "stock de producto",
          "hay existencias",
          "cantidad disponible",
        ],
        response:
          '**Para consultar stock:**\n1. Ve a la sección "Productos"\n2. Usa el buscador por nombre o código de barras\n3. Filtra por categoría o proveedor\n4. Los productos con stock bajo se marcan en rojo\n5. Puedes ver productos próximos a caducar',
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      stock_bajo: {
        patterns: [
          "stock bajo",
          "reponer producto",
          "productos agotados",
          "sin existencias",
        ],
        response:
          '**Alertas de stock bajo:**\n• El sistema marca productos con stock mínimo\n• Los administradores reciben notificaciones\n• Revisa la sección "Alertas" en el dashboard\n• Contacta al proveedor para reposición',
        roles: ["admin", "gerente", "dueno"], // Cajeros NO
      },

      // ==================== USUARIOS Y ROLES ====================
      roles_sistema: {
        patterns: [
          "qué roles hay",
          "tipos de usuario",
          "permisos",
          "qué puede hacer cada rol",
        ],
        response:
          "**Roles del sistema:**\n• **Dueño:** Acceso total a todo el sistema\n• **Admin:** Gestión completa excepto configuraciones dueño\n• **Gerente:** Supervisión y reportes avanzados\n• **Cajero:** Solo ventas y consultas básicas\n\nCada rol tiene permisos específicos.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      cambiar_contraseña: {
        patterns: [
          "cambiar contraseña",
          "modificar password",
          "actualizar contraseña",
        ],
        response:
          '**Para cambiar tu contraseña:**\n1. Ve a tu perfil de usuario\n2. Haz click en "Cambiar contraseña"\n3. Ingresa tu contraseña actual\n4. Ingresa la nueva contraseña (mínimo 6 caracteres)\n5. Confirma los cambios',
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      crear_usuario: {
        patterns: [
          "crear usuario",
          "nuevo empleado",
          "registrar usuario",
          "agregar empleado",
        ],
        response:
          '**Para crear un usuario:**\n1. Solo administradores y dueños pueden crear usuarios\n2. Ve a "Gestión de Usuarios"\n3. Completa: nombre, correo, contraseña, rol\n4. El sistema envía credenciales al correo\n5. El usuario debe cambiar su contraseña en el primer login',
        roles: ["admin", "dueno"], // Solo admin y dueño
      },

      // ==================== REPORTES Y ESTADÍSTICAS ====================
      reportes_ventas: {
        patterns: [
          "reportes de ventas",
          "estadísticas ventas",
          "ver ventas del día",
          "reporte diario",
        ],
        response:
          '**Reportes disponibles:**\n• **Ventas del día:** Total vendido hoy\n• **Top productos:** Productos más vendidos\n• **Ventas por fecha:** Filtra por rango de fechas\n• **Estadísticas generales:** Promedios y tendencias\n\nVe a "Reportes" en el dashboard para ver esta información.',
        roles: ["admin", "gerente", "dueno"], // Cajeros NO
      },
      dashboard_roles: {
        patterns: [
          "qué veo en mi dashboard",
          "mi panel de control",
          "vista principal",
          "pantalla inicio",
        ],
        response:
          "**Según tu rol ves:**\n• **Cajero:** Ventas rápidas y productos\n• **Gerente:** Métricas diarias y alertas\n• **Admin:** Gestión completa y reportes\n• **Dueño:** Todas las funcionalidades\n\nTu dashboard está personalizado para tus responsabilidades.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== PROBLEMAS COMUNES ====================
      error_stock: {
        patterns: [
          "error stock",
          "no hay suficiente stock",
          "producto agotado",
          "no se puede vender",
        ],
        response:
          "**Si hay error de stock:**\n1. Verifica que el producto esté activo\n2. Revisa la cantidad disponible\n3. Si el stock es 0, no se puede vender\n4. Contacta al administrador para reposición\n5. El sistema previene ventas con stock insuficiente",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
      problema_login: {
        patterns: [
          "no puedo entrar",
          "error de login",
          "contraseña incorrecta",
          "olvidé mi contraseña",
        ],
        response:
          '**Problemas de acceso:**\n1. Verifica que tu usuario esté activo\n2. Usa "Olvidé mi contraseña" para recuperarla\n3. Contacta al administrador si tu cuenta está desactivada\n4. Asegúrate de usar el correo correcto',
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== RESPUESTAS DE SEGURIDAD ====================
      acceso_denegado: {
        patterns: [],
        response:
          "🔒 **Acceso restringido**\n\nLo siento, no tienes permisos para acceder a esta información. Esta funcionalidad está limitada a roles específicos.\n\nSi necesitas realizar esta acción, contacta a un administrador o gerente.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== NUEVAS CATEGORÍAS ====================
      general_sistema: {
        patterns: [
          "qué es este sistema",
          "para qué sirve",
          "qué hace el sistema",
          "acerca del sistema",
          "qué es pos",
        ],
        response:
          "🤖 **Sistema de Punto de Venta (POS)**\n\nEste sistema permite gestionar tu negocio de forma completa:\n\n• 🛒 **Ventas y Cobros**: Procesos rápidos de venta\n• 📦 **Inventario**: Control de stock y alertas\n• 👥 **Usuarios**: Roles y permisos personalizados\n• 📊 **Reportes**: Métricas y estadísticas del negocio\n• 🔔 **Alertas**: Notificaciones automáticas\n\nEstoy aquí para ayudarte a usar todas estas funcionalidades.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      soporte_avanzado: {
        patterns: [
          "no funciona",
          "error del sistema",
          "problema técnico",
          "necesito ayuda técnica",
          "contactar soporte",
          "bug",
          "fallo",
        ],
        response:
          "🔧 **Soporte Técnico**\n\nSi encuentras un error del sistema:\n\n1. **Reinicia la aplicación**\n2. **Verifica tu conexión a internet**\n3. **Contacta al administrador del sistema**\n4. **Proporciona detalles del error**\n\nPara problemas persistentes, el administrador puede revisar los logs del sistema en Render.",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      informacion_despliegue: {
        patterns: [
          "dónde está alojado",
          "en qué servidor",
          "dónde se ejecuta",
          "render",
          "producción",
        ],
        response:
          "🌐 **Información de Despliegue**\n\nEl sistema está desplegado en:\n• **Backend**: Render.com\n• **Base de Datos**: PostgreSQL\n• **Frontend**: Flutter (Web/Mobile/Desktop)\n\nPara issues técnicos, contacta al administrador responsable del despliegue.",
        roles: ["admin", "dueno"], // Solo roles elevados
      },

      // ==================== CREAR USUARIO MEJORADO ====================
      crear_usuario: {
        patterns: [
          "crear usuario",
          "nuevo empleado",
          "registrar usuario",
          "agregar empleado",
          "como crear usuario",
          "crear un usuario",
          "agregar usuario",
          "registrar empleado",
          "nuevo usuario",
          "alta de usuario",
          "crear cuenta",
          "nueva cuenta",
          "dar de alta usuario",
        ],
        response:
          '**Para crear un usuario:**\n\n1. **Ve a "Gestión de Usuarios"** (solo admin/dueno)\n2. **Completa los datos:**\n   • Nombre completo\n   • Correo electrónico\n   • Contraseña temporal\n   • Rol (cajero, gerente, admin)\n3. **El sistema:**\n   • Valida que el correo no exista\n   • Envía credenciales al correo\n   • Requiere cambio de contraseña en primer login\n\n**Roles permitidos para crear usuarios:** Admin y Dueño solamente.',
        roles: ["admin", "dueno"],
      },

      // ==================== NUEVAS CATEGORÍAS AVANZADAS ====================
      productos_populares: {
        patterns: [
          "productos más vendidos",
          "top productos",
          "qué productos venden más",
          "productos populares",
          "más vendidos",
          "best sellers",
        ],
        response:
          '**Productos más vendidos:**\n\nPuedes ver el top de productos en:\n1. **Dashboard Gerente/Admin** → Sección "Métricas"\n2. **Reportes** → "Top Productos por Ventas"\n3. **Filtra por:**\n   • Fecha específica\n   • Rango de fechas\n   • Categoría de producto\n\nLos datos se actualizan automáticamente con cada venta.',
        roles: ["admin", "gerente", "dueno"],
      },

      alertas_sistema: {
        patterns: [
          "alertas",
          "notificaciones",
          "qué alertas hay",
          "stock bajo alerta",
          "productos por caducar",
          "alertas del sistema",
          "avisos importantes",
        ],
        response:
          "**🔔 Sistema de Alertas:**\n\n**Tipos de alertas automáticas:**\n• 📦 **Stock bajo**: Productos cerca del mínimo\n• 📅 **Caducidad**: Productos próximos a vencer\n• 💰 **Ventas bajas**: Productos con poca rotación\n• 👥 **Rendimiento**: Métricas de empleados\n\n**Dónde verlas:**\n• Dashboard Admin/Gerente → Sección Alertas\n• Panel principal → Icono de campana\n• Reportes específicos por tipo de alerta",
        roles: ["admin", "gerente", "dueno"],
      },

      // ==================== PROCESOS AVANZADOS ====================
      inventario_detallado: {
        patterns: [
          "historial inventario",
          "movimientos stock",
          "cambios en inventario",
          "registro inventario",
          "tracking stock",
          "seguimiento inventario",
        ],
        response:
          "**📊 Historial de Inventario:**\n\nEl sistema registra automáticamente:\n\n**Cada movimiento genera registro:**\n• ➕ **Entradas**: Compras, ajustes positivos\n• ➖ **Salidas**: Ventas, ajustes negativos\n• 🔄 **Ajustes**: Correcciones manuales\n\n**Información registrada:**\n• Producto y cantidad\n• Fecha y hora exacta\n• Usuario que realizó la acción\n• Motivo del movimiento\n\n**Acceso:** Gestión de Inventario → Historial",
        roles: ["admin", "gerente", "dueno"],
      },

      // ==================== SOLUCIÓN DE PROBLEMAS AVANZADOS ====================
      problemas_avanzados: {
        patterns: [
          "no imprime ticket",
          "error de impresión",
          "problema con impresora",
          "ticket no sale",
          "falla impresión",
          "configurar impresora",
        ],
        response:
          "**🖨️ Solución de Problemas de Impresión:**\n\n**Pasos a seguir:**\n1. ✅ Verificar que la impresora esté encendida y con papel\n2. 🔌 Revisar conexión USB/red con el equipo\n3. ⚙️ Comprobar configuración de impresora en el sistema\n4. 🔄 Reiniciar el servicio de impresión\n5. 📋 Probar impresión de ticket de prueba\n\n**Si persiste el problema:**\n• Contactar al administrador del sistema\n• Verificar logs de error en el dashboard\n• Revisar configuración de formato de ticket",
        roles: ["cajero", "admin", "gerente", "dueno"],
      },

      // ==================== CONFIGURACIÓN Y MANTENIMIENTO ====================
      configuracion_sistema: {
        patterns: [
          "configurar sistema",
          "ajustes generales",
          "configuración pos",
          "parametros sistema",
          "opciones configuración",
          "personalizar sistema",
        ],
        response:
          "**⚙️ Configuración del Sistema:**\n\n**Configuraciones disponibles:**\n• **Empresa**: Nombre, logo, información fiscal\n• **Ventas**: IVA, formas de pago, impuestos\n• **Inventario**: Stock mínimo, alertas automáticas\n• **Seguridad**: Roles, permisos, políticas de contraseñas\n• **Backup**: Copias de seguridad automáticas\n\n**Acceso:** Solo Administrador y Dueño → Menú Configuración",
        roles: ["admin", "dueno"],
      },

      // ==================== REPORTES AVANZADOS ====================
      reportes_avanzados: {
        patterns: [
          "reporte financiero",
          "estadísticas avanzadas",
          "métricas detalladas",
          "análisis ventas",
          "reporte gerencial",
          "dashboard avanzado",
        ],
        response:
          "**📈 Reportes Avanzados:**\n\n**Reportes disponibles para Gerente/Admin:**\n\n**📊 Ventas y Finanzas:**\n• Tendencia de ventas por período\n• Análisis de margen de ganancia\n• Comparativo mes a mes\n• Rentabilidad por producto/categoría\n\n**👥 Desempeño:**\n• Ventas por empleado\n• Eficiencia por turno/hora\n• Métricas de productividad\n\n**📦 Inventario:**\n• Rotación de productos\n• Análisis ABC de inventario\n• Proyección de reposición\n\n**Acceso:** Dashboard → Reportes Avanzados",
        roles: ["admin", "gerente", "dueno"],
      },

      // ==================== FALLBACK MEJORADO ====================
      fallback: {
        patterns: [],
        response: `🤖 **Asistente Virtual POS**

Parece que tu pregunta está fuera del alcance de mi conocimiento actual.

**Puedo ayudarte específicamente con:**
• 🛒 **Ventas**: procesos de venta, cobros, cancelaciones
• 📦 **Productos**: gestión, stock, alertas de inventario  
• 👥 **Usuarios**: roles, permisos, configuración
• 📊 **Reportes**: estadísticas, métricas del negocio
• 🔧 **Problemas**: solución de errores comunes
• 🌐 **Sistema**: información general del POS

¿En cuál de estas áreas necesitas ayuda?`,
        roles: ["cajero", "admin", "gerente", "dueno"],
      },
    };
  }

  getResponse(userMessage, userRole) {
    const cleanMessage = this.normalizeText(userMessage); // ✅ USAR NORMALIZACIÓN

    // Validar rol del usuario
    const rolesValidos = ["cajero", "admin", "gerente", "dueno"];
    if (!rolesValidos.includes(userRole)) {
      return this.knowledgeBase.acceso_denegado.response;
    }

    // Buscar coincidencia más específica primero
    let bestMatch = null;
    let maxMatches = 0;

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      if (category === "fallback" || category === "acceso_denegado") continue;

      const matchCount = data.patterns.filter(
        (pattern) => cleanMessage.includes(this.normalizeText(pattern)) // ✅ NORMALIZAR PATRONES TAMBIÉN
      ).length;

      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = category;
      }
    }

    // Verificar permisos si hay coincidencia
    if (bestMatch && maxMatches > 0) {
      const categoryData = this.knowledgeBase[bestMatch];

      if (categoryData.roles.includes(userRole)) {
        return categoryData.response;
      } else {
        return this.knowledgeBase.acceso_denegado.response;
      }
    }

    return this.knowledgeBase.fallback.response;
  }
}

module.exports = new ChatbotService();
