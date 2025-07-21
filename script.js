/**
 * Contador de Visitantes Moderno con Detección de Países por IP
 * Utiliza localStorage para persistencia y tu propio Backend API para el conteo global
 */

class VisitorCounter {
    constructor() {
        this.storageKey = 'semp_visitor_data';
        this.apiBaseUrl = 'https://ipapi.co/json/'; // Esto se mantiene, es para la API de IP externa
        this.currentVisitorData = null;
        this.totalVisitors = 0;
        this.countryStats = {};
        
        // ¡ESTA ES LA URL DE TU BACKEND DE RENDER!
        this.backendUrl = 'https://home-semp.onrender.com'; // <<< ASEGÚRATE DE QUE ESTA URL SEA CORRECTA

        this.init();
    }

    /**
     * Inicializa el contador de visitantes global
     */
    async init() {
        try {
            // Detectar ubicación del visitante actual
            await this.detectVisitorLocation();
            
            // Cargar estadísticas globales desde tu Backend API
            await this.loadGlobalStats();
            
            // Verificar si es una visita única (usando IP + fecha)
            const visitKey = this.generateVisitKey();
            const isNewVisit = !this.hasVisitedToday(visitKey);
            
            if (isNewVisit) {
                // Registrar nueva visita en tu Backend API (contador global)
                await this.registerGlobalVisit();
                
                // Marcar como visitado hoy
                this.markVisitedToday(visitKey);
            }
            
            // Actualizar la interfaz con datos globales
            this.updateUI();
            
            // Guardar backup local
            this.saveData();
            
        } catch (error) {
            console.error('Error inicializando contador de visitantes:', error);
            this.handleError('Error al inicializar el contador de visitantes');
        }
    }

    /**
     * Genera una clave única para la visita basada en IP y fecha
     */
    generateVisitKey() {
        const today = new Date().toDateString();
        const ip = this.currentVisitorData?.ip || 'unknown';
        return `visit_${btoa(ip + today)}`;
    }

    /**
     * Verifica si ya visitó hoy
     */
    hasVisitedToday(visitKey) {
        return localStorage.getItem(visitKey) !== null;
    }

    /**
     * Marca como visitado hoy
     */
    markVisitedToday(visitKey) {
        localStorage.setItem(visitKey, new Date().toISOString());
    }

    /**
     * Carga los datos almacenados en localStorage (solo como fallback)
     */
    loadStoredData() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (storedData) {
                const data = JSON.parse(storedData);
                this.totalVisitors = data.totalVisitors || 0;
                this.countryStats = data.countryStats || {};
            }
        } catch (error) {
            console.error('Error cargando datos almacenados:', error);
            // Inicializar con datos por defecto si hay error
            this.totalVisitors = 0;
            this.countryStats = {};
        }
    }

    /**
     * Detecta la ubicación del visitante usando su IP
     */
    async detectVisitorLocation() {
        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.reason || 'Error en la API de geolocalización');
            }

            this.currentVisitorData = {
                ip: data.ip || 'Desconocida',
                country: data.country_name || 'Desconocido',
                countryCode: data.country_code || 'XX',
                region: data.region || 'Desconocida',
                city: data.city || 'Desconocida',
                timezone: data.timezone || 'Desconocida',
                org: data.org || 'Desconocida',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error detectando ubicación:', error);
            
            // Datos por defecto si la API falla
            this.currentVisitorData = {
                ip: 'No disponible',
                country: 'Desconocido',
                countryCode: 'XX',
                region: 'No disponible',
                city: 'No disponible',
                timezone: 'No disponible',
                org: 'No disponible',
                timestamp: new Date().toISOString(),
                error: true
            };
        }
    }

    /**
     * Incrementa el contador de visitantes y actualiza estadísticas por país
     * (Esta función es ahora un auxiliar local, la lógica principal está en el backend)
     */
    incrementVisitorCount() {
        this.totalVisitors++;
        
        if (this.currentVisitorData && this.currentVisitorData.country) {
            const country = this.currentVisitorData.country;
            const countryCode = this.currentVisitorData.countryCode;
            
            if (!this.countryStats[country]) {
                this.countryStats[country] = {
                    count: 0,
                    countryCode: countryCode,
                    lastVisit: null
                };
            }
            
            this.countryStats[country].count++;
            this.countryStats[country].lastVisit = this.currentVisitorData.timestamp;
        }
    }

    /**
     * Actualiza toda la interfaz de usuario
     */
    updateUI() {
        this.updateVisitorCounter();
        this.updateCurrentVisitorInfo();
        this.updateCountryStats();
        
        // Agregar animaciones
        this.addAnimations();
    }

    /**
     * Actualiza el contador principal con animación
     */
    updateVisitorCounter() {
        const counterElement = document.getElementById('visitorCount');
        const countValueElement = counterElement.querySelector('.count-value');
        
        if (countValueElement) {
            // Animar el cambio de número
            countValueElement.classList.add('animate');
            
            // Actualizar el número con efecto de contador
            this.animateCounter(countValueElement, this.totalVisitors);
            
            // Remover la clase de animación después de un tiempo
            setTimeout(() => {
                countValueElement.classList.remove('animate');
            }, 600);
        }
    }

    /**
     * Anima el contador con efecto de incremento
     */
    animateCounter(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - startValue) / 30);
        const duration = 1000; // 1 segundo
        const stepTime = duration / 30;
        
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            
            element.textContent = currentValue.toLocaleString();
        }, stepTime);
    }

    /**
     * Actualiza la información del visitante actual
     */
    updateCurrentVisitorInfo() {
        const currentVisitorElement = document.getElementById('currentVisitor');
        
        if (!this.currentVisitorData) {
            currentVisitorElement.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>No se pudo obtener información de ubicación</span>
                </div>
            `;
            return;
        }

        if (this.currentVisitorData.error) {
            currentVisitorElement.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error al detectar ubicación</span>
                </div>
            `;
            return;
        }

        const countryFlag = this.getCountryFlag(this.currentVisitorData.countryCode);
        
        currentVisitorElement.innerHTML = `
            <div class="visitor-detail fade-in-up">
                <i class="fas fa-flag"></i>
                <span>${countryFlag} ${this.currentVisitorData.country}</span>
            </div>
            <div class="visitor-detail fade-in-up">
                <i class="fas fa-map-marker-alt"></i>
                <span>${this.currentVisitorData.city}, ${this.currentVisitorData.region}</span>
            </div>
            <div class="visitor-detail fade-in-up">
                <i class="fas fa-clock"></i>
                <span>${this.currentVisitorData.timezone}</span>
            </div>
            <div class="visitor-detail fade-in-up">
                <i class="fas fa-network-wired"></i>
                <span>${this.currentVisitorData.ip}</span>
            </div>
        `;
    }

    /**
     * Actualiza las estadísticas por país
     */
    updateCountryStats() {
        const statsContainer = document.getElementById('countryStats');
        
        if (!this.countryStats || Object.keys(this.countryStats).length === 0) {
            statsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <h4>No hay estadísticas disponibles</h4>
                    <p>Las estadísticas aparecerán conforme lleguen más visitantes</p>
                </div>
            `;
            return;
        }

        // Ordenar países por número de visitas (descendente)
        const sortedCountries = Object.entries(this.countryStats)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10); // Mostrar solo los top 10

        const statsHTML = sortedCountries.map(([country, data], index) => {
            const flag = this.getCountryFlag(data.countryCode);
            const percentage = ((data.count / this.totalVisitors) * 100).toFixed(1);
            
            return `
                <div class="country-item slide-in-right" style="animation-delay: ${index * 0.1}s">
                    <div class="country-info">
                        <span class="country-flag">${flag}</span>
                        <span class="country-name">${country}</span>
                        <span class="country-percentage">(${percentage}%)</span>
                    </div>
                    <div class="country-count">${data.count}</div>
                </div>
            `;
        }).join('');

        statsContainer.innerHTML = statsHTML;
    }

    /**
     * Obtiene la bandera emoji para un código de país
     */
    getCountryFlag(countryCode) {
        if (!countryCode || countryCode === 'XX') {
            return '🌍';
        }
        
        // Convertir código de país a emoji de bandera
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        
        return String.fromCodePoint(...codePoints);
    }

    /**
     * Agrega animaciones a los elementos
     */
    addAnimations() {
        // Agregar clase de animación a elementos que aparecen
        const animatedElements = document.querySelectorAll('.fade-in-up, .slide-in-right');
        
        animatedElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.1}s`;
        });
    }

    /**
     * Registra visita en el Backend API (contador global real)
     */
    async registerGlobalVisit() {
        try {
            // Envía los datos del visitante al backend para que registre la visita
            const response = await fetch(`${this.backendUrl}/api/visit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.currentVisitorData) // Envía todos los datos del visitante
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Actualiza los contadores locales con la respuesta del backend
            this.totalVisitors = data.totalVisitors;
            this.countryStats = data.countryStats;
            
            console.log('✅ Contador global actualizado por el backend:', this.totalVisitors);
            
        } catch (error) {
            console.error('Error registrando visita global en el backend:', error);
            // Fallback a localStorage si el backend falla o hay un error de red
            this.incrementVisitorCount(); // Incrementa localmente para al menos tener una idea
        }
    }

    /**
     * Carga estadísticas globales desde el Backend API
     */
    async loadGlobalStats() {
        try {
            // Cargar estadísticas desde tu API de Render
            const response = await fetch(`${this.backendUrl}/api/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Asigna los datos recibidos del backend
            this.totalVisitors = data.totalVisitors || 0;
            
            // Convierte el array de countryStats a un objeto para fácil acceso
            this.countryStats = data.countryStats.reduce((acc, current) => {
                acc[current.country] = {
                    count: current.totalVisitors,
                    countryCode: current.countryCode,
                    lastVisit: current.lastUpdate // Asume que backend devuelve last_update
                };
                return acc;
            }, {});
            
            console.log('📊 Estadísticas globales cargadas desde tu Backend API');
            
        } catch (error) {
            console.error('Error cargando estadísticas globales desde el backend:', error);
            // Fallback a localStorage si el backend falla o hay un error de red
            this.loadStoredData();
        }
    }

    /**
     * Guarda los datos en localStorage (backup y para estado inicial antes de API)
     */
    saveData() {
        try {
            const dataToSave = {
                totalVisitors: this.totalVisitors,
                countryStats: this.countryStats,
                lastUpdate: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error guardando datos:', error);
        }
    }

    /**
     * Maneja errores y los muestra en la interfaz
     */
    handleError(message) {
        console.error(message);
        
        // Mostrar error en el contador principal si es necesario
        const counterElement = document.getElementById('visitorCount');
        if (counterElement) {
            counterElement.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error cargando contador</span>
                </div>
            `;
        }
    }

    /**
     * Reinicia todos los datos (método auxiliar para desarrollo)
     * NOTA: Este método solo limpia el localStorage local. Para resetear el backend,
     * necesitarías una llamada API /api/reset si la implementaste y la activas.
     */
    resetAllData() {
        if (confirm('¿Estás seguro de que quieres reiniciar todos los datos del contador (solo localmente)?')) {
            localStorage.removeItem(this.storageKey);
            // Si quieres resetear el backend también, necesitarías una llamada fetch aquí:
            // fetch(`${this.backendUrl}/api/reset`, { method: 'POST' }).then(() => location.reload());
            location.reload();
        }
    }

    /**
     * Exporta los datos como JSON (método auxiliar)
     */
    exportData() {
        const data = {
            totalVisitors: this.totalVisitors,
            countryStats: this.countryStats,
            currentVisitor: this.currentVisitorData,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `semp-visitor-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inicializar el contador cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global del contador
    window.visitorCounter = new VisitorCounter();
    
    // Agregar métodos de desarrollo al objeto window para debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.resetVisitorData = () => window.visitorCounter.resetAllData();
        window.exportVisitorData = () => window.visitorCounter.exportData();
        
        console.log('🔧 Métodos de desarrollo disponibles:');
        console.log('- resetVisitorData(): Reinicia todos los datos (solo local)');
        console.log('- exportVisitorData(): Exporta los datos como JSON (solo local)');
        // Si tienes /api/reset en tu backend y quieres usarlo desde el frontend en desarrollo
        // window.resetBackendData = () => {
        //     if (confirm('¿Estás seguro de que quieres resetear los datos en el backend?')) {
        //         fetch(window.visitorCounter.backendUrl + '/api/reset', { method: 'POST' })
        //             .then(res => res.json())
        //             .then(data => { console.log('Backend reset:', data); location.reload(); })
        //             .catch(err => console.error('Error reseteando backend:', err));
        //     }
        // };
    }
});

// Manejar visibilidad de la página para actualizaciones en tiempo real
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.visitorCounter) {
        // Refrescar datos cuando la página vuelve a ser visible
        setTimeout(() => {
            window.visitorCounter.updateUI();
        }, 1000);
    }
});

// Función para mostrar información adicional en consola
console.log(`
🌍 SEMP Contador de Visitantes Iniciado
═══════════════════════════════════════
✓ Detección de ubicación por IP habilitada
✓ Persistencia local configurada
✓ Conectado a tu Backend API de Render
✓ Animaciones CSS activas
✓ Diseño responsive activado

Desarrollado con HTML5, CSS3 y JavaScript vanilla
`);
