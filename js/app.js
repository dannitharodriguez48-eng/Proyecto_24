// Tiempo que dura una historia: 24 horas.
const DURACION_HISTORIA = 24 * 60 * 60 * 1000;

// Para probar la eliminación rápida, cambia temporalmente la línea anterior por:
// const DURACION_HISTORIA = 15 * 1000; // 15 segundos

// Cada historia se muestra durante 3 segundos.
const DURACION_VISOR = 3000;
const CLAVE_HISTORIAS = "historias_proyecto_24";

// Elementos del HTML.
const btnAgregar = document.getElementById("btnAgregar");
const archivoImagen = document.getElementById("archivoImagen");
const listaHistorias = document.getElementById("listaHistorias");
const mensajeVacio = document.getElementById("mensajeVacio");
const cantidadHistorias = document.getElementById("cantidadHistorias");

const visor = document.getElementById("visor");
const imagenHistoria = document.getElementById("imagenHistoria");
const barrasProgreso = document.getElementById("barrasProgreso");
const horaHistoria = document.getElementById("horaHistoria");
const btnCerrar = document.getElementById("btnCerrar");
const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");

let historias = [];
let indiceActual = 0;
let temporizadorHistoria = null;
let temporizadorLimpieza = null;
let inicioDeslizar = 0;

// Guardar las historias en el almacenamiento local.
function guardarHistorias() {
    try {
        localStorage.setItem(CLAVE_HISTORIAS, JSON.stringify(historias));
        return true;
    } catch (error) {
        alert("No hay suficiente espacio en el navegador. Elimina alguna historia e intenta de nuevo.");
        return false;
    }
}

// Cargar historias y quitar las que ya cumplieron 24 horas.
function cargarHistorias() {
    try {
        const guardadas = JSON.parse(localStorage.getItem(CLAVE_HISTORIAS)) || [];
        const ahora = Date.now();

        historias = guardadas.filter(function (historia) {
            return historia.imagen &&
                historia.fecha &&
                ahora - historia.fecha < DURACION_HISTORIA;
        });

        guardarHistorias();
    } catch (error) {
        historias = [];
    }

    mostrarHistorias();
    programarLimpieza();
}

// Dibujar los círculos de las historias.
function mostrarHistorias() {
    listaHistorias.innerHTML = "";

    historias.forEach(function (historia, indice) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "historia";
        boton.setAttribute("aria-label", "Ver historia " + (indice + 1));

        const imagen = document.createElement("img");
        imagen.className = "historia-imagen";
        imagen.src = historia.imagen;
        imagen.alt = "Imagen de historia";

        const nombre = document.createElement("span");
        nombre.className = "historia-nombre";
        nombre.textContent = "Historia " + (indice + 1);

        boton.appendChild(imagen);
        boton.appendChild(nombre);

        boton.addEventListener("click", function () {
            abrirHistoria(indice);
        });

        listaHistorias.appendChild(boton);
    });

    const total = historias.length;
    cantidadHistorias.textContent = total + (total === 1 ? " historia" : " historias");
    mensajeVacio.classList.toggle("oculto", total > 0);
}

// Abrir el selector de imágenes.
btnAgregar.addEventListener("click", function () {
    archivoImagen.click();
});

// Leer y preparar la imagen que eligió el usuario.
archivoImagen.addEventListener("change", function () {
    const archivo = archivoImagen.files[0];

    if (!archivo) {
        return;
    }

    if (!archivo.type.startsWith("image/")) {
        alert("Selecciona un archivo de imagen.");
        archivoImagen.value = "";
        return;
    }

    reducirImagen(archivo);
});

// Reducir la imagen para que no supere 1080 x 1920 píxeles.
function reducirImagen(archivo) {
    const lector = new FileReader();

    lector.onload = function (evento) {
        const imagen = new Image();

        imagen.onload = function () {
            const anchoOriginal = imagen.width;
            const altoOriginal = imagen.height;

            const escala = Math.min(
                1,
                1080 / anchoOriginal,
                1920 / altoOriginal
            );

            const anchoNuevo = Math.round(anchoOriginal * escala);
            const altoNuevo = Math.round(altoOriginal * escala);

            const canvas = document.createElement("canvas");
            canvas.width = anchoNuevo;
            canvas.height = altoNuevo;

            const contexto = canvas.getContext("2d");
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, anchoNuevo, altoNuevo);
            contexto.drawImage(imagen, 0, 0, anchoNuevo, altoNuevo);

            // Convertir a JPEG para reducir el espacio que ocupa en localStorage.
            const imagenBase64 = canvas.toDataURL("image/jpeg", 0.82);
            agregarHistoria(imagenBase64);

            archivoImagen.value = "";
        };

        imagen.onerror = function () {
            alert("No se pudo abrir esta imagen. Prueba con otra.");
            archivoImagen.value = "";
        };

        imagen.src = evento.target.result;
    };

    lector.onerror = function () {
        alert("No se pudo leer el archivo.");
        archivoImagen.value = "";
    };

    lector.readAsDataURL(archivo);
}

// Crear una historia con su fecha de publicación.
function agregarHistoria(imagenBase64) {
    const nuevaHistoria = {
        id: Date.now(),
        imagen: imagenBase64,
        fecha: Date.now()
    };

    historias.push(nuevaHistoria);

    if (!guardarHistorias()) {
        historias.pop();
        return;
    }

    mostrarHistorias();
    programarLimpieza();
}

// Abrir una historia en el visor.
function abrirHistoria(indice) {
    if (historias.length === 0) {
        return;
    }

    indiceActual = indice;
    visor.classList.remove("oculto");
    mostrarHistoriaActual();
}

// Mostrar la historia seleccionada y comenzar su tiempo.
function mostrarHistoriaActual() {
    clearTimeout(temporizadorHistoria);

    if (indiceActual >= historias.length) {
        cerrarVisor();
        return;
    }

    const historia = historias[indiceActual];

    imagenHistoria.src = historia.imagen;
    horaHistoria.textContent = new Date(historia.fecha).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

    crearBarras();

    temporizadorHistoria = setTimeout(function () {
        siguienteHistoria();
    }, DURACION_VISOR);
}

// Crear una barra de progreso por cada historia.
function crearBarras() {
    barrasProgreso.innerHTML = "";

    historias.forEach(function (historia, indice) {
        const tramo = document.createElement("div");
        tramo.className = "tramo-progreso";

        const relleno = document.createElement("span");
        tramo.appendChild(relleno);

        if (indice < indiceActual) {
            tramo.classList.add("completo");
        } else if (indice === indiceActual) {
            tramo.classList.add("activo");
        }

        barrasProgreso.appendChild(tramo);
    });
}

// Avanzar a la siguiente historia.
function siguienteHistoria() {
    if (indiceActual < historias.length - 1) {
        indiceActual++;
        mostrarHistoriaActual();
    } else {
        cerrarVisor();
    }
}

// Volver a la historia anterior.
function historiaAnterior() {
    if (indiceActual > 0) {
        indiceActual--;
        mostrarHistoriaActual();
    } else {
        mostrarHistoriaActual();
    }
}

// Cerrar el visor.
function cerrarVisor() {
    clearTimeout(temporizadorHistoria);
    visor.classList.add("oculto");
    imagenHistoria.src = "";
}

// Botones para moverse entre historias.
btnCerrar.addEventListener("click", cerrarVisor);
btnSiguiente.addEventListener("click", siguienteHistoria);
btnAnterior.addEventListener("click", historiaAnterior);

// Cerrar el visor si se presiona Escape.
document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !visor.classList.contains("oculto")) {
        cerrarVisor();
    }
});

// Detectar el movimiento del dedo para cambiar de historia.
visor.addEventListener("touchstart", function (evento) {
    inicioDeslizar = evento.changedTouches[0].clientX;
}, { passive: true });

visor.addEventListener("touchend", function (evento) {
    const finalDeslizar = evento.changedTouches[0].clientX;
    const diferencia = finalDeslizar - inicioDeslizar;

    if (Math.abs(diferencia) < 50) {
        return;
    }

    if (diferencia < 0) {
        siguienteHistoria();
    } else {
        historiaAnterior();
    }
}, { passive: true });

// Eliminar las historias que ya cumplieron su tiempo.
function limpiarHistoriasExpiradas() {
    const ahora = Date.now();
    const historiasActuales = historias.filter(function (historia) {
        return ahora - historia.fecha < DURACION_HISTORIA;
    });

    if (historiasActuales.length !== historias.length) {
        historias = historiasActuales;
        guardarHistorias();
        mostrarHistorias();

        // Si se borraron historias mientras el visor estaba abierto, cerrarlo.
        if (!visor.classList.contains("oculto")) {
            cerrarVisor();
        }
    }

    programarLimpieza();
}

// Programar la próxima eliminación según la historia que vence primero.
function programarLimpieza() {
    clearTimeout(temporizadorLimpieza);

    if (historias.length === 0) {
        return;
    }

    const vencimientoMasCercano = Math.min.apply(
        null,
        historias.map(function (historia) {
            return historia.fecha + DURACION_HISTORIA;
        })
    );

    const espera = Math.max(1000, vencimientoMasCercano - Date.now() + 100);

    temporizadorLimpieza = setTimeout(
        limpiarHistoriasExpiradas,
        espera
    );
}

// Revisar otra vez cuando se vuelve a abrir la pestaña.
document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
        limpiarHistoriasExpiradas();
    }
});

// Cargar las historias guardadas al abrir la página.
cargarHistorias();
