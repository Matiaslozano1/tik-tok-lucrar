# ⚔️ TikTok Lucrar — Sistema de Batalla de Países en LIVE

Overlay en tiempo real para TikTok LIVE que enfrenta países entre sí. Los espectadores eligen su país escribiendo un número en el chat, dan likes para sumar puntos, y el país con más puntos al terminar el tiempo gana. Diseñado para **monetizar y retener audiencia** en TikTok LIVE.

---

## 🎯 ¿Qué hace?

- **Batalla entre 31 países** — cada espectador elige su país escribiendo su número en el chat
- **Puntos en tiempo real** — los likes suman puntos al país del usuario
- **Overlay para OBS** — pantalla visual que se ve en el LIVE con ranking animado, timer y efectos explosivos
- **Panel de administración** — controla el timer, conecta TikTok, agrega puntos manualmente
- **Pantalla final épica** — muestra el país ganador con su bandera real y el top 5 de jugadores con foto y nombre
- **Efectos visuales PRO** — combo system, partículas, screen shake, like storm, gift shoutout, VS bar estilo Street Fighter
- **Voz de bienvenida** — anuncia en voz femenina cuando alguien nuevo entra y dice el número de su país

---

## 🗂️ Estructura del proyecto

```
tiktok-battle/
├── server.js          # Servidor Node.js — lógica del juego + eventos TikTok
├── countries.js       # Lista de 31 países con número, nombre, bandera y color
├── public/
│   ├── overlay.html   # Pantalla del juego (Browser Source en OBS)
│   └── panel.html     # Panel de administración (se abre en el navegador)
├── data/
│   ├── scores.json    # Puntuaciones guardadas entre reinicios
│   └── users.json     # Usuarios registrados y su país asignado
└── package.json
```

---

## 🚀 Instalación

### Requisitos
- [Node.js](https://nodejs.org/) v16 o superior

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor
node server.js
```

El servidor arranca en `http://localhost:8080`

---

## 🖥️ URLs

| URL | Descripción |
|-----|-------------|
| `http://localhost:8080/overlay` | Pantalla del juego → agregar en OBS como Browser Source |
| `http://localhost:8080/panel`   | Panel de administración |

---

## ⚙️ Configuración en OBS

1. Agregar fuente → **Browser Source**
2. URL: `http://localhost:8080/overlay`
3. Ancho: `680` — Alto: `900`
4. ✅ Activar "Shutdown source when not visible"
5. ✅ Activar "Refresh browser when scene becomes active"

---

## 🎛️ Panel de Administración

Abrir `http://localhost:8080/panel` en el navegador.

| Función | Descripción |
|---------|-------------|
| **Conectar TikTok** | Escribe el usuario del LIVE (sin @) y conecta |
| **Duración del timer** | Elige cuántos minutos dura la ronda y aplica con un click |
| **Iniciar / Pausar / Resetear timer** | Control total del cronómetro |
| **Agregar puntos manuales** | Selecciona país y cantidad de puntos |
| **Reset total** | Borra todo y reinicia la batalla |
| **Ranking en vivo** | Top 10 países en tiempo real |
| **Log de eventos** | Registro de gifts, joins y conexiones |

---

## 🌍 Países disponibles

| # | País | # | País | # | País |
|---|------|---|------|---|------|
| 1 | 🇲🇽 México | 12 | 🇩🇴 R. Dominicana | 23 | 🇬🇧 Reino Unido |
| 2 | 🇧🇷 Brasil | 13 | 🇭🇳 Honduras | 24 | 🇫🇷 Francia |
| 3 | 🇨🇴 Colombia | 14 | 🇵🇾 Paraguay | 25 | 🇪🇸 España |
| 4 | 🇦🇷 Argentina | 15 | 🇸🇻 El Salvador | 26 | 🇮🇹 Italia |
| 5 | 🇨🇱 Chile | 16 | 🇳🇮 Nicaragua | 27 | 🇷🇺 Rusia |
| 6 | 🇵🇪 Perú | 17 | 🇨🇷 Costa Rica | 28 | 🇯🇵 Japón |
| 7 | 🇻🇪 Venezuela | 18 | 🇵🇦 Panamá | 29 | 🇰🇷 Corea |
| 8 | 🇪🇨 Ecuador | 19 | 🇺🇸 USA | 30 | 🇨🇦 Canadá |
| 9 | 🇬🇹 Guatemala | 20 | 🇮🇳 India | 31 | 🇦🇺 Australia |
| 10 | 🇨🇺 Cuba | 21 | 🇨🇳 China | | |
| 11 | 🇧🇴 Bolivia | 22 | 🇩🇪 Alemania | | |

---

## 🎁 Sistema de puntos

| Acción | Puntos |
|--------|--------|
| Escribir número en chat (unirse) | +1 |
| Like | +1 por like × multiplicador activo |
| Tick pasivo | +1 por segundo a TODOS los países |
| Gift pequeño (< 500 💎) | diamantes × 10 + 100 bonus + x2 por 60s |
| Gift mediano (500–2999 💎) | diamantes × 10 + 400 bonus + x3 por 60s |
| Gift grande (≥ 3000 💎) | diamantes × 10 + 700 bonus + x4 por 60s |
| 🌌 Gift Galaxy | **Victoria instantánea para ese país** |

---

## 🏆 Pantalla final

Al terminar el tiempo o recibir un Galaxy:
- País ganador con bandera real, nombre y puntaje total
- Top 5 jugadores con foto de perfil, nombre y likes aportados
- Confeti animado y efectos de sonido
- Reinicio automático en 10 segundos

---

## 🔑 Admin Key

Por defecto: `battle2024`. Para cambiarla:

```bash
ADMIN_KEY=miClaveSegura node server.js
```

---

## 🔧 API Endpoints

```
GET /connect?username=tucuenta&key=battle2024    # Conectar al LIVE
GET /add?iso=MX&points=500&key=battle2024         # Agregar puntos
GET /reset?key=battle2024                          # Reset total
GET /timer/start?key=battle2024                   # Iniciar timer
GET /timer/stop?key=battle2024                    # Pausar timer
GET /timer/reset?key=battle2024                   # Resetear timer
GET /timer/duration?minutes=5&key=battle2024      # Cambiar duración
GET /state                                         # Ver estado actual
GET /test-end?key=battle2024                      # Simular pantalla final
```

---

## 🛠️ Tecnologías

- **Backend:** Node.js, Express, Socket.IO
- **TikTok:** [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector)
- **Frontend:** HTML5, CSS3, Canvas API, Web Speech API
- **Banderas:** [flagcdn.com](https://flagcdn.com)
