# Ruta Segura · Videojuego de seguridad vial urbana (Arequipa)

Proyecto de Interacción Humano-Computador · Escuela Profesional de Ingeniería de Sistemas · UNSA

## Estructura del proyecto

```
RutaSegura/
├── index.html          Pantallas e interfaz (C-01 a C-06, HUD, modales)
├── css/
│   └── estilos.css     Paleta, tipografía y diseño de cada pantalla
├── js/
│   └── juego.js        Niveles, tráfico, reglas, retroalimentación y métricas IHC
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

## Controles

| Acción | PC | Celular / tablet |
|---|---|---|
| Moverse | W A S D o flechas | Flechas en pantalla |
| Guardar / mirar el celular | Q / E | Botones de la notificación |
| Pausa | ESC | Botón de pausa |
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
| Logros | `js/juego.js` | `const LOGROS` |
| Duración del semáforo | `js/juego.js` | `CYCLE`, `T_GREEN`, `T_AMBER` |
| Colores de la interfaz | `css/estilos.css` | `:root` |

## Notas

- La tipografía Lexend se descarga de Google Fonts; sin internet el juego funciona igual con una fuente del sistema.
- Las normas citadas provienen del TUO del Reglamento Nacional de Tránsito (D.S. N.° 016-2009-MTC): Art. 57, 68, 70 y 77.
