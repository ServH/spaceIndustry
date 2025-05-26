# Space Conquest - Real-Time Strategy Game

## 🎮 Descripción

Juego de estrategia en tiempo real desarrollado en HTML5, CSS3 y JavaScript vanilla. El jugador compite contra una IA para conquistar planetas en el espacio, enviando naves entre planetas para expandir su imperio.

## 🎯 Características del Juego

- **Estrategia en tiempo real** entre jugador y IA
- **6-8 planetas** con diferentes capacidades
- **Sistema de conquista** por arrastre de naves o teclado
- **Generación automática** de naves en planetas controlados
- **IA inteligente** que compite por la conquista
- **Gráficos vectoriales** (SVG) para rendimiento óptimo
- **Interfaz responsiva** y minimalista
- **Control dual**: ratón + teclado para máxima flexibilidad

## 🕹️ Cómo Jugar

### **Objetivo**
Conquistar todos los planetas del mapa para ganar la partida.

### **Controles con Ratón**
1. **Arrastre**: Haz clic y arrastra desde tu planeta (verde) hacia otro planeta
2. **Selección**: Haz clic en un planeta para seleccionarlo
3. **Conquista**: Suelta sobre el planeta objetivo para enviar naves

### **Controles con Teclado** ⌨️
1. **Selección**: Presiona la **letra** mostrada sobre cualquier planeta tuyo
2. **Ataque**: Con un planeta seleccionado, presiona la **letra del planeta objetivo**
3. **Cancelar**: Presiona **ESC** o **ESPACIO** para deseleccionar

### **Mecánicas de Juego**
- **Planetas Neutros** (grises): Se conquistan enviando 1 nave
- **Planetas Enemigos** (rojos): Requieren más naves que las que defienden
- **Planetas Aliados** (verdes): Se pueden reforzar hasta su capacidad máxima
- **Generación**: Cada planeta controlado genera naves automáticamente
- **Capacidad**: Los números entre corchetes [X] indican la capacidad máxima

## 🎯 Estrategias

- **Expansión Temprana**: Conquista planetas neutros rápidamente
- **Planetas Grandes**: Prioriza planetas con mayor capacidad (generan más naves)
- **Defensa**: Mantén siempre algunas naves en tus planetas
- **Economía**: Los planetas grandes generan naves más rápido
- **Timing**: Coordina ataques cuando la IA esté dispersa

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

1. **Clona el repositorio**:
   ```bash
   git clone https://github.com/ServH/spaceIndustry.git
   cd spaceIndustry
   ```

2. **Abre en navegador**:
   ```bash
   # Opción 1: Abrir directamente
   open index.html
   
   # Opción 2: Con servidor local (Python)
   python -m http.server 8000
   
   # Opción 3: Con Node.js
   npx http-server
   ```

3. **Navega** a `http://localhost:8000` si usas servidor local

## ⚙️ Configuración

El archivo `js/config.js` permite ajustar:

- **Capacidades de planetas**: Tamaños disponibles
- **Velocidades de generación**: Qué tan rápido se crean naves
- **Tiempos de conquista**: Duración para conquistar planetas neutros
- **Comportamiento de IA**: Agresividad y frecuencia de acciones
- **Velocidad de naves**: Qué tan rápido viajan las flotas
- **Dificultad de IA**: Tres niveles disponibles

### Ejemplo de configuración:
```javascript
CONFIG.SHIP.GENERATION_BASE = 1.0;  // Más rápido
CONFIG.AI.AGGRESSION = 0.5;         // IA menos agresiva
CONFIG.PLANET.CAPACITIES = [8, 12, 16, 20]; // Planetas más grandes
```

## 🎯 Controles Avanzados

### **Atajos de Teclado**
- **Letras A-Z**: Seleccionar/atacar planetas
- **ESC**: Cancelar selección
- **ESPACIO**: Deseleccionar todo
- **Ctrl + R**: Reiniciar juego (modo debug)
- **Ctrl + P**: Pausar/reanudar (modo debug)
- **Ctrl + D**: Activar modo debug

### **Modo Debug** 🛠️
```javascript
// En consola del navegador:
window.debugGame.win()          // Ganar instantáneamente
window.debugGame.addShips(50)   // Añadir 50 naves a tus planetas
window.debugGame.setAIDifficulty('easy')  // Cambiar dificultad IA
```

## 🎨 Características Visuales

- **Planetas con letras**: Cada planeta tiene una letra única para control por teclado
- **Indicadores visuales**: Colores claros para diferencia jugador/IA/neutral
- **Animaciones fluidas**: Conquista, batalla, y movimiento de flotas
- **Feedback inmediato**: Notificaciones de acciones y estado del juego
- **Responsive design**: Funciona en desktop y móvil

## 🤖 Inteligencia Artificial

La IA incluye:
- **Análisis estratégico**: Evalúa amenazas y oportunidades
- **Toma de decisiones**: Basada en estado actual del juego
- **Múltiples estrategias**: Agresiva, defensiva, expansión, balanceada
- **Adaptabilidad**: Cambia estrategia según el contexto
- **Tres dificultades**: Easy, Normal, Hard

## 🎯 Roadmap

- [x] **Mecánicas básicas** de juego
- [x] **Sistema de conquista** y combate
- [x] **IA estratégica** avanzada
- [x] **Control dual** ratón + teclado
- [x] **Interfaz completa** con feedback
- [ ] **Efectos de sonido** y música
- [ ] **Múltiples mapas** y escenarios
- [ ] **Sistema de puntuación** y logros
- [ ] **Modo multijugador** online
- [ ] **Campaña** con historia
- [ ] **Editor de mapas**

## 🐛 Solución de Problemas

### **El juego no carga**
- Verifica que todos los archivos estén en su lugar
- Usa un servidor HTTP local en lugar de `file://`
- Revisa la consola del navegador para errores

### **El arrastre no funciona**
- Asegúrate de arrastrar desde planetas verdes (tuyos)
- El planeta debe tener al menos 1 nave
- Usa el sistema de teclado como alternativa

### **La IA no se mueve**
- Esto es normal en los primeros segundos
- La IA actúa cada 3-4 segundos por defecto
- Revisa el modo debug para verificar el estado

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🔧 Tecnologías Utilizadas

- **HTML5** - Estructura y Canvas SVG
- **CSS3** - Estilos, animaciones y responsive design
- **JavaScript ES6+** - Lógica del juego, POO, y módulos
- **SVG** - Gráficos vectoriales escalables
- **Web APIs** - Performance, Visibility, y eventos del DOM

## 📊 Estado del Proyecto

- ✅ **100% Funcional**: Juego completamente jugable
- ✅ **Controles duales**: Ratón y teclado implementados
- ✅ **IA avanzada**: Estrategias múltiples y adaptativas
- ✅ **Bien estructurado**: Código modular y documentado
- ✅ **Extensible**: Fácil agregar nuevas características
- ✅ **Optimizado**: 60fps en navegadores modernos
- ✅ **Responsive**: Funciona en desktop y móvil

---

**¡Comienza tu conquista del universo!** 🚀🌌

El juego está optimizado para una experiencia fluida y adictiva. La combinación de controles por ratón y teclado permite diferentes estilos de juego, desde el casual hasta el competitivo.

> **Tip**: Prueba ambos sistemas de control para encontrar tu estilo preferido. ¡El sistema de teclado es especialmente rápido una vez que memorizas las letras de tus planetas!