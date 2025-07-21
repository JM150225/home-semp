/**
 * Contador de Visitantes Moderno con Detección de Países por IP
 * Utiliza localStorage para persistencia y API externa para geolocalización
 */

class VisitorCounter {
    constructor() {
        this.storageKey = 'semp_visitor_data';
        this.apiBaseUrl = 'https://ipapi.co/json/';
        this.currentVisitorData = null;
        this.totalVisitors = 0;
        this.countryStats = {};

        // ¡AÑADE ESTA LÍNEA O MODIFICALA SI YA LA TIENES!
        this.backendUrl = 'https://home-semp.onrender.com'; // <<< ¡USA TU URL REAL DE RENDER AQUÍ!
        
        this.init();
    }

    /**
     * Inicializa el contador de visitantes global
     */
    async init() {
        try {
            // Detectar ubicación del visitante actual
            await this.detectVisitorLocation();
            
            // Cargar estadísticas globales desde Firebase
            await this.loadGlobalStats();
            
            // Verificar si es una visita única (usando IP + fecha)
            const visitKey = this.generateVisitKey();
            const isNewVisit = !this.hasVisitedToday(visitKey);
            
            if (isNewVisit) {
                // Registrar nueva visita en Firebase (contador global)
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
     * Carga los datos almacenados en localStorage
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
     * Registra visita en Firebase (contador global real)
     */
    async registerGlobalVisit() {
        try {
            // URL del servicio de contador global (REST API)
            const firebaseUrl = 'https://semp-counter-default-rtdb.firebaseio.com/';
            
            // Obtener contador actual
            const currentResponse = await fetch(`${firebaseUrl}counter.json`);
            let currentCount = 0;
            
            if (currentResponse.ok) {
                const data = await currentResponse.json();
                currentCount = data?.total || 0;
            }
            
            // Incrementar contador
            const newCount = currentCount + 1;
            
            // Actualizar contador en Firebase
            await fetch(`${firebaseUrl}counter.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    total: newCount,
                    lastUpdate: new Date().toISOString()
                })
            });
            
            // Registrar país si existe
            if (this.currentVisitorData && this.currentVisitorData.country) {
                await this.registerCountryStats();
            }
            
            this.totalVisitors = newCount;
            console.log('✅ Contador global actualizado:', newCount);
            
        } catch (error) {
            console.error('Error actualizando contador global:', error);
            // Fallback a localStorage si Firebase falla
            this.incrementVisitorCount();
        }
    }

    /**
     * Registra estadísticas por país en Firebase
     */
    async registerCountryStats() {
        try {
            const firebaseUrl = 'https://semp-counter-default-rtdb.firebaseio.com/';
            const country = this.currentVisitorData.country;
            const countryCode = this.currentVisitorData.countryCode;
            
            // Obtener estadísticas actuales del país
            const countryResponse = await fetch(`${firebaseUrl}countries/${country}.json`);
            let countryCount = 0;
            
            if (countryResponse.ok) {
                const data = await countryResponse.json();
                countryCount = data?.count || 0;
            }
            
            // Incrementar contador del país
            await fetch(`${firebaseUrl}countries/${country}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    count: countryCount + 1,
                    countryCode: countryCode,
                    lastUpdate: new Date().toISOString()
                })
            });
            
        } catch (error) {
            console.error('Error registrando estadísticas de país:', error);
        }
    }

    /**
     * Carga estadísticas globales de Firebase
     */
    async loadGlobalStats() {
        try {
            const firebaseUrl = 'https://semp-counter-default-rtdb.firebaseio.com/';
            
            // Cargar contador total
            const counterResponse = await fetch(`${firebaseUrl}counter.json`);
            if (counterResponse.ok) {
                const counterData = await counterResponse.json();
                this.totalVisitors = counterData?.total || 0;
            }
            
            // Cargar estadísticas por país
            const countriesResponse = await fetch(`${firebaseUrl}countries.json`);
            if (countriesResponse.ok) {
                const countriesData = await countriesResponse.json();
                if (countriesData) {
                    this.countryStats = {};
                    Object.entries(countriesData).forEach(([country, data]) => {
                        this.countryStats[country] = {
                            count: data.count,
                            countryCode: data.countryCode,
                            lastVisit: data.lastUpdate
                        };
                    });
                }
            }
            
            console.log('📊 Estadísticas globales cargadas desde Firebase');
            
        } catch (error) {
            console.error('Error cargando estadísticas globales:', error);
            // Fallback a localStorage
            this.loadStoredData();
        }
    }

    /**
     * Guarda los datos en localStorage (backup)
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
     */
    resetAllData() {
        if (confirm('¿Estás seguro de que quieres reiniciar todos los datos del contador?')) {
            localStorage.removeItem(this.storageKey);
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
        console.log('- resetVisitorData(): Reinicia todos los datos');
        console.log('- exportVisitorData(): Exporta los datos como JSON');
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
✓ Animaciones CSS activas
✓ Diseño responsive activado

Desarrollado con HTML5, CSS3 y JavaScript vanilla
`);
