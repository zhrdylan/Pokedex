/**
 * GAME-STATE.JS - Estado central de la aplicación y progreso del entrenador
 */
import { getStorage, setStorage, clearAppStorage } from '../storage/local-storage.js';

class GameStateManager {
  constructor() {
    this.state = {
      discoveredPokemon: [],
      capturedPokemon: [],
      playerTeam: [],
      activePokemonIndex: 0,
      victories: 0,
      unlockedDifficulty: 'beginner', // 'beginner' | 'intermediate' | 'advanced' | 'boss'
      onboardingCompleted: false
    };
    this.init();
  }

  /**
   * Inicializa cargando datos persistidos
   */
  init() {
    const saved = getStorage('trainer_state', null);
    if (saved) {
      this.state = { ...this.state, ...saved };
    }
    this.notify();
  }

  /**
   * Guarda el estado actual en LocalStorage
   */
  save() {
    setStorage('trainer_state', this.state);
    this.notify();
  }

  /**
   * Notifica cambios a la interfaz mediante eventos
   */
  notify() {
    window.dispatchEvent(new CustomEvent('gamestate:change', { detail: this.state }));
  }

  /**
   * Marca un Pokémon como descubierto
   * @param {number} id 
   */
  discoverPokemon(id) {
    if (!this.state.discoveredPokemon.includes(id)) {
      this.state.discoveredPokemon.push(id);
      this.save();
    }
  }

  /**
   * Agrega un Pokémon capturado
   * @param {Object} pokemon 
   * @returns {boolean} true si se agregó, false si ya estaba capturado
   */
  capturePokemon(pokemon) {
    const alreadyCaptured = this.state.capturedPokemon.some(p => p.id === pokemon.id);
    if (alreadyCaptured) {
      return false;
    }

    this.state.capturedPokemon.push(pokemon);
    this.discoverPokemon(pokemon.id);

    // Si el equipo tiene espacio (< 6), agregar automáticamente
    if (this.state.playerTeam.length < 6) {
      this.state.playerTeam.push(pokemon);
    }

    this.save();
    return true;
  }

  /**
   * Verifica si un Pokémon ya fue capturado
   * @param {number} id 
   */
  isCaptured(id) {
    return this.state.capturedPokemon.some(p => p.id === id);
  }

  /**
   * Agrega un Pokémon existente en colección al equipo (máx 6)
   * @param {Object} pokemon 
   * @returns {Object} { success, message }
   */
  addToTeam(pokemon) {
    if (this.state.playerTeam.length >= 6) {
      return { success: false, message: 'Tu equipo ya tiene el límite de 6 Pokémon.' };
    }
    if (this.state.playerTeam.some(p => p.id === pokemon.id)) {
      return { success: false, message: `${pokemon.name} ya está en tu equipo.` };
    }
    this.state.playerTeam.push(pokemon);
    this.save();
    return { success: true, message: `${pokemon.name} se unió al equipo.` };
  }

  /**
   * Elimina un Pokémon del equipo
   * @param {number} pokemonId 
   */
  removeFromTeam(pokemonId) {
    this.state.playerTeam = this.state.playerTeam.filter(p => p.id !== pokemonId);
    if (this.state.activePokemonIndex >= this.state.playerTeam.length) {
      this.state.activePokemonIndex = Math.max(0, this.state.playerTeam.length - 1);
    }
    this.save();
  }

  /**
   * Designa el Pokémon líder/activo del equipo
   * @param {number} index 
   */
  setActiveLeader(index) {
    if (index >= 0 && index < this.state.playerTeam.length) {
      this.state.activePokemonIndex = index;
      this.save();
    }
  }

  /**
   * Reordena un miembro del equipo (subir/bajar posición).
   * @param {number} pokemonId
   * @param {number} direction -1 (subir) | +1 (bajar)
   * @returns {boolean} true si se movió
   */
  moveTeamMember(pokemonId, direction) {
    const idx = this.state.playerTeam.findIndex(p => p.id === pokemonId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= this.state.playerTeam.length) return false;
    const leaderId = this.state.playerTeam[this.state.activePokemonIndex]?.id;
    const [member] = this.state.playerTeam.splice(idx, 1);
    this.state.playerTeam.splice(target, 0, member);
    // Mantener el líder apuntando al mismo Pokémon
    const leaderIdx = this.state.playerTeam.findIndex(p => p.id === leaderId);
    this.state.activePokemonIndex = leaderIdx >= 0 ? leaderIdx : 0;
    this.save();
    return true;
  }

  /**
   * Retorna el Pokémon activo actual del jugador
   */
  getActivePokemon() {
    if (this.state.playerTeam.length === 0) return null;
    return this.state.playerTeam[this.state.activePokemonIndex] || this.state.playerTeam[0];
  }

  /**
   * Registra una victoria y desbloquea el siguiente nivel de dificultad
   * @param {string} currentDifficulty 
   */
  recordVictory(currentDifficulty) {
    this.state.victories += 1;
    let unlocked = this.state.unlockedDifficulty;

    if (currentDifficulty === 'beginner' && unlocked === 'beginner') {
      unlocked = 'intermediate';
    } else if (currentDifficulty === 'intermediate' && unlocked === 'intermediate') {
      unlocked = 'advanced';
    } else if (currentDifficulty === 'advanced' && unlocked === 'advanced') {
      unlocked = 'boss';
    }

    this.state.unlockedDifficulty = unlocked;
    this.save();
    return unlocked;
  }

  /**
   * Marca el tutorial onboarding como visto
   */
  completeOnboarding() {
    this.state.onboardingCompleted = true;
    this.save();
  }

  /**
   * Reinicia el progreso completo
   */
  resetGame() {
    clearAppStorage();
    this.state = {
      discoveredPokemon: [],
      capturedPokemon: [],
      playerTeam: [],
      activePokemonIndex: 0,
      victories: 0,
      unlockedDifficulty: 'beginner',
      onboardingCompleted: false
    };
    this.save();
  }
}

export const gameState = new GameStateManager();
