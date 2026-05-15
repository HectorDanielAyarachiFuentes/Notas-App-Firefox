// storage-manager.js - Capa de abstracción de almacenamiento (Solo Local)
import browserAPI from './browser-api.js';

const NOTES_LOCAL_KEY = 'notes';               
const PROFILE_KEY     = 'local_user_profile';  

/**
 * Obtiene las notas del almacenamiento local.
 * @returns {Promise<Array>}
 */
export async function getNotes() {
  const { [NOTES_LOCAL_KEY]: notes = [] } = await browserAPI.storage.local.get({ [NOTES_LOCAL_KEY]: [] });
  return notes;
}

/**
 * Guarda las notas en el almacenamiento local.
 * @param {Array} notes
 */
export async function saveNotes(notes) {
  await new Promise(resolve => {
    browserAPI.storage.local.set({ [NOTES_LOCAL_KEY]: notes }, () => {
      if (browserAPI.runtime.lastError) { /* Ignorar */ }
      resolve();
    });
  });
}

/**
 * Devuelve el perfil de usuario local personalizado.
 * @returns {Promise<{name: string, icon: string}>}
 */
export async function getLocalProfile() {
  const { [PROFILE_KEY]: profile } = await browserAPI.storage.local.get({
    [PROFILE_KEY]: { name: 'Mi Espacio', icon: '📝' }
  });
  return profile;
}

/**
 * Guarda el perfil de usuario local.
 * @param {{ name: string, icon: string }} profile
 */
export async function saveLocalProfile(profile) {
  await new Promise(resolve => {
    browserAPI.storage.local.set({ [PROFILE_KEY]: profile }, () => {
      if (browserAPI.runtime.lastError) { /* Ignorar */ }
      resolve();
    });
  });
}
