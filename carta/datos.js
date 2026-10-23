/* ============================================================
   BRIGADA · LA CARTA — datos del local
   Completa los campos entre comillas. Lo que quede vacío se oculta
   o muestra un aviso. Para varios locales, copia el bloque { ... }
   dentro de "locales" y cambia el "id".
   Link de cada local:  carta/index.html?local=ID
   ============================================================ */
window.CARTA = {
  locales: [
    {
      id: "local-1",          // sin espacios, va en el link del QR
      nombre: "",             // ej: "Restaurant Centro"
      descripcion: "",        // una frase corta bajo el nombre
      logo: "",               // ruta a una imagen, ej: "img/logo.png"

      // Contacto
      whatsapp: "",           // solo números con código de país, ej: "56912345678"
      telefono: "",           // como quieres que se vea, ej: "+56 2 2345 6789"
      email: "",
      instagram: "",          // sin @, ej: "turestaurant"

      // Dirección
      direccion: "",          // ej: "Av. Siempre Viva 742"
      comuna: "",             // ej: "Providencia, Santiago"

      // Horario de atención (24 h). Deja abre y cierra vacíos si ese día está cerrado.
      horarios: [
        { dia: "Lunes",     abre: "", cierra: "" },
        { dia: "Martes",    abre: "", cierra: "" },
        { dia: "Miércoles", abre: "", cierra: "" },
        { dia: "Jueves",    abre: "", cierra: "" },
        { dia: "Viernes",   abre: "", cierra: "" },
        { dia: "Sábado",    abre: "", cierra: "" },
        { dia: "Domingo",   abre: "", cierra: "" }
      ],

      // Reservas: la solicitud se envía al WhatsApp del local
      reservas: { activo: true, maxPersonas: 10 },

      // Menú: agrega categorías y platos.
      // Plato: { nombre: "", descripcion: "", precio: 0, agotado: false, foto: "" }
      menu: [
        { categoria: "Entradas", platos: [] },
        { categoria: "Platos de fondo", platos: [] },
        { categoria: "Postres", platos: [] },
        { categoria: "Bebidas", platos: [] }
      ],

      // Reseñas
      resenasUrl: "",         // link de Google para dejar una reseña
      resenas: []             // { autor: "", estrellas: 5, texto: "" }  (reseñas reales de tus clientes)
    }
  ]
};
