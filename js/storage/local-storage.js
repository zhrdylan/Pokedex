/**
 * LOCAL-STORAGE.JS - Capa de almacenamiento y persistencia local
 */

const STORAGE_PREFIX = 'pokemon_trainer_app_';

/**
 * Guarda un elemento serializado en localStorage
 * @param {string} key 
 * @param {any} value 
 */
export function setStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
    return true;
  } catch (error) {
    console.error(`Error guardando en localStorage [${key}]:`, error);
    return false;
  }
}

/**
 * Lee un elemento deserializado de localStorage
 * @param {string} key 
 * @param {any} defaultValue 
 */
export function getStorage(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error leyendo de localStorage [${key}]:`, error);
    return defaultValue;
  }
}

/**
 * Limpia todos los datos de la aplicación
 */
export function clearAppStorage() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error al limpiar almacenamiento de la app:', error);
    return false;
  }
}
