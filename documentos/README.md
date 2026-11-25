# Ruta Segura · Videojuego de seguridad vial urbana (Arequipa)

Proyecto de Interacción Humano-Computador · Escuela Profesional de Ingeniería de Sistemas · UNSA

## Estructura del proyecto

```
RutaSegura/
├── index.html          Pantallas e interfaz (C-01 a C-06, HUD, modales)
├── css/
│   └── estilos.css     Paleta, tipografía y diseño de cada pantalla
├── js/
│   ├── juego.js        Modos Peatón y Conductor, tráfico, reglas, retroalimentación y métricas IHC
│   └── examen.js       Examen de reglas tipo MTC (banco de 40 preguntas)
├── .vscode/
│   ├── extensions.json Recomienda la extensión Live Server
│   ├── settings.json   Puerto 5500 y acceso desde otros dispositivos de la red
│   └── launch.json     Ejecutar con F5 en Chrome o Edge
└── README.md
```

No necesita instalar librerías ni compilar: es HTML, CSS y JavaScript puro.

## Cómo ejecutarlo en Visual Studio Code

1. Descomprime `RutaSegura.zip`.
2. Abre VS Code → **Archivo › Abrir carpeta…** → elige la carpeta `RutaSegura`.
3. VS Code te sugerirá instalar **Live Server** (abajo a la derecha). Acepta.
   Si no aparece: pestaña **Extensiones** (Ctrl+Shift+X) → busca *Live Server* (de Ritwick Dey) → **Instalar**.
4. Abre `index.html`, haz clic derecho → **Open with Live Server**
   (o el botón **Go Live** de la barra inferior).
5. El juego se abre en el navegador en `http://127.0.0.1:5500`. Cada vez que guardes un cambio, la página se recarga sola.

**Opción sin extensiones:** pulsa **F5** y elige *Jugar Ruta Segura (Chrome)* o *(Edge)*.
También funciona con doble clic en `index.html`.

## Jugar desde el celular (misma red Wi-Fi)

1. Con Live Server encendido en la laptop, averigua su IP local:
   - Windows: abre una terminal (Ctrl+ñ en VS Code) y escribe `ipconfig` → *Dirección IPv4* (por ejemplo, 192.168.1.25).
   - macOS / Linux: `ipconfig getifaddr en0` o `hostname -I`.
2. En el celular, abre el navegador y entra a `http://192.168.1.25:5500` (usa tu IP).
3. Si no carga, permite a VS Code en el firewall de Windows (redes privadas).

## Modos de juego

- **Peatón** (5 niveles): cruza Arequipa respetando semáforos, cebras, ambulancias y policía; incluye noche y lluvia.
- **Conductor** (3 niveles, tipo examen práctico): cinturón, límites de velocidad (30 km/h en calles y zonas escolares, 50 km/h en avenidas), semáforo vehicular, ceder el paso al peatón, PARE, CEDA EL PASO, policía, ambulancia y celular. Termina con una nota: se aprueba con 80/100 y sin faltas eliminatorias.
- **Examen MTC**: 40 preguntas basadas en el Reglamento Nacional de Tránsito. Práctica de 10 con explicación o simulacro de 40 preguntas en 40 minutos (se aprueba con 35, como el examen oficial).

## Controles

| Acción | PC | Celular / tablet |
|---|---|---|
| Moverse | W A S D o flechas | Flechas en pantalla |
| Guardar / mirar el celular | Q / E | Botones de la notificación |
| Pausa | ESC | Botón de pausa |
| Conductor: acelerar / frenar | → / ← (o D / A, Espacio frena) | ▶ / ◀ en pantalla |
| Conductor: cambiar de carril | ↑ / ↓ (o W / S) | ▲ / ▼ en pantalla |
| Conductor: cinturón | C | Botón "Abróchate el cinturón" |
| Examen: responder | 1 2 3 4 y Enter | Tocar la opción |
| Empezar / continuar | Enter | Tocar el botón |

## Datos para la evaluación de usabilidad

En la pantalla de inicio, botón **Datos IHC** (abajo a la izquierda):
- Ranking, métricas de usabilidad y **descarga de partidas y eventos en CSV**.
- **Modo feria:** desbloquea todos los niveles para mostrarlos al jurado.

Los datos se guardan en el navegador de cada equipo (localStorage). Descárgalos al terminar cada jornada de la feria.

## Dónde modificar

| Quieres cambiar… | Archivo | Busca |
|---|---|---|
| Calles, destinos y dificultad de los niveles | `js/juego.js` | `const LEVELS` |
| Textos de las normas (micro-explicaciones) | `js/juego.js` | `const LESSONS` |
| Niveles del modo Conductor | `js/juego.js` | `const DLEVELS` |
| Preguntas del examen | `js/examen.js` | `const BANCO` |
| Logros | `js/juego.js` | `const LOGROS` |
| Duración del semáforo | `js/juego.js` | `CYCLE`, `T_GREEN`, `T_AMBER` |
| Colores de la interfaz | `css/estilos.css` | `:root` |

## Notas

- La tipografía Lexend se descarga de Google Fonts; sin internet el juego funciona igual con una fuente del sistema.
- Las normas citadas provienen del TUO del Reglamento Nacional de Tránsito (D.S. N.° 016-2009-MTC): Art. 49, 57, 58, 60, 63, 64, 65, 68, 70, 77 y 162 (modificado por D.S. 025-2021-MTC), e infracciones M25 y G28. El examen usa preguntas propias basadas en esas normas; para estudiar, complementar con el balotario oficial del MTC.
