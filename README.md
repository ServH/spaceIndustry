# Space Conquest - Real-Time Strategy Game

## 🎮 Descripción

Juego de estrategia en tiempo real desarrollado en HTML5, CSS3 y JavaScript vanilla. El jugador compite contra una IA para conquistar planetas en el espacio, enviando naves entre planetas para expandir su imperio.

## 🎯 Características del Juego

- **Estrategia en tiempo real** entre jugador y IA
- **6-8 planetas** con diferentes capacidades
- **Sistema de conquista** por arrastre de naves
- **Generación automática** de naves en planetas controlados
- **IA inteligente** que compite por la conquista
- **Gráficos vectoriales** (SVG) para rendimiento óptimo
- **Interfaz responsiva** y minimalista

## 🕹️ Cómo Jugar

1. **Objetivo**: Conquistar todos los planetas del mapa
2. **Movimiento**: Arrastra desde tu planeta hacia otro planeta para enviar naves
3. **Conquista**: Los planetas neutros se conquistan enviando naves
4. **Combate**: Los planetas enemigos se disputan en batalla
5. **Generación**: Los planetas controlados generan naves automáticamente

## 🏗️ Estructura del Proyecto

```
spaceIndustry/
├── index.html              # Página principal del juego
├── README.md              # Documentación del proyecto
├── css/
│   ├── main.css           # Estilos principales
│   ├── ui.css             # Estilos de interfaz
│   └── animations.css     # Animaciones y efectos
├── js/
│   ├── main.js            # Punto de entrada principal
│   ├── config.js          # Configuración del juego
│   ├── gameEngine.js      # Motor principal del juego
│   ├── planet.js          # Lógica de planetas
│   ├── fleet.js           # Lógica de flotas en tránsito
│   ├── ai.js              # Inteligencia artificial
│   ├── ui.js              # Gestión de interfaz
│   └── utils.js           # Utilidades generales
└── assets/
    └── (futuros recursos)
```

## 🚀 Instalación y Ejecución

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ServH/spaceIndustry.git
   cd spaceIndustry
   ```

2. Abre `index.html` en tu navegador web o usa un servidor local:
   ```bash
   # Con Python 3
   python -m http.server 8000
   
   # Con Node.js (si tienes http-server instalado)
   npx http-server
   ```

3. Navega a `http://localhost:8000` para jugar

## ⚙️ Configuración

El archivo `js/config.js` contiene todas las configuraciones del juego:

- Capacidades de planetas
- Velocidades de generación de naves
- Tiempos de conquista y batalla
- Comportamiento de la IA
- Velocidad de las naves

## 🎯 Roadmap

- [x] Mecánicas básicas de juego
- [x] Sistema de conquista y combate
- [x] IA básica
- [ ] Efectos visuales avanzados
- [ ] Sistema de sonido
- [ ] Múltiples niveles de dificultad
- [ ] Estadísticas de partida
- [ ] Modo multijugador

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🔧 Tecnologías Utilizadas

- **HTML5** - Estructura
- **CSS3** - Estilos y animaciones
- **JavaScript ES6+** - Lógica del juego
- **SVG** - Gráficos vectoriales

## 📊 Estado del Proyecto

- ✅ **Funcional**: Juego completamente jugable
- ✅ **Modular**: Código bien estructurado
- ✅ **Extensible**: Fácil de modificar y expandir
- ✅ **Documentado**: Código comentado y documentación completa