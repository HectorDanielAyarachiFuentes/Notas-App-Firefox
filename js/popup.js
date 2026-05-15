import browserAPI from './browser-api.js';
import {
  getNotes, saveNotes, getLocalProfile, saveLocalProfile
} from './storage-manager.js';

// Detección de Panel Lateral vs Popup
function detectSidePanel() {
  const isSide = window.innerWidth > 200; 
  document.body.classList.toggle('is-side-panel', isSide);
}

detectSidePanel();
window.addEventListener('resize', detectSidePanel);

// Elementos UI
const titleEl = document.getElementById('title');
const contentEl = document.getElementById('content');
const charCounterEl = document.getElementById('char-counter');
const saveBtn = document.getElementById('saveBtn');
const editorTitleEl = document.getElementById('editor-title');
const newBtn = document.getElementById('newBtn');
const notesList = document.getElementById('notesList');
const statusEl = document.getElementById('status');

const tabs = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const searchInput = document.getElementById('search-input');
const settingsBtn = document.getElementById('settings-btn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const settingsDropdown = document.getElementById('settings-dropdown');
const versionSpan = document.getElementById('extension-version');
const themeSelector = document.getElementById('theme-selector');
const psmSelector = document.getElementById('psm-selector');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');
const pinBtn = document.getElementById('pin-btn');
const ocrBtn = document.getElementById('ocr-btn');

// Local profile
const localProfileIcon   = document.getElementById('local-profile-icon');
const localProfileName   = document.getElementById('local-profile-name');
const localNameInput     = document.getElementById('local-name-input');
const editLocalNameBtn   = document.getElementById('edit-local-name-btn');
const localIconTrigger   = document.getElementById('local-icon-picker-trigger');
const emojiPicker        = document.getElementById('emoji-picker');
const emojiGrid          = document.getElementById('emoji-grid');
const localHeaderIcon    = document.getElementById('local-header-icon');
const localHeaderName    = document.getElementById('local-header-name');

let editingId = null;
let statusTimeout = null;
let autoSaveTimeout = null;
let currentProfile = { name: 'Mi Espacio', icon: '📝' };

// ─── Emojis disponibles ───
const EMOJI_LIST = [
  '📝','📓','📔','📒','📕','📗','📘','📙',
  '🗒️','📋','📄','📃','🗂️','🗃️','📁','🗄️',
  '✏️','🖊️','🖋️','🔏','🔐','🔑','💡','⭐',
  '🌟','🔥','💎','🎯','🚀','🌈','🦋','🐾',
  '🍀','🌺','🌸','🎨','🎭','🏆','❤️','💜',
  '💙','💚','🧡','🤍','🌙','☀️','⚡','🌊'
];

// --- Navegación ---
function switchTab(targetTab) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === targetTab));
  tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${targetTab}`));
  
  const activePanel = document.getElementById(`tab-${targetTab}`);
  if (activePanel) {
    activePanel.style.animation = 'none';
    activePanel.offsetHeight; // trigger reflow
    activePanel.style.animation = 'fadeIn 0.4s ease-out';
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    switchTab(targetTab);
  });
});

// --- Gestión de Notas ---
function createNoteListItem(note) {
  const openNoteForEditing = () => {
    editingId = note.id;
    titleEl.value = note.title;
    contentEl.value = note.content;
    editorTitleEl.textContent = 'Editar nota';
    
    newBtn.textContent = '';
    const cancelIconSvg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`, 'image/svg+xml').documentElement;
    const cancelSpan = document.createElement('span');
    cancelSpan.textContent = 'Cancelar';
    newBtn.appendChild(cancelIconSvg);
    newBtn.appendChild(cancelSpan);
    newBtn.classList.add('danger-text');
    status('Editando nota...', 'info', -1);
    switchTab('create');
    titleEl.focus();
    updateCharCount(); 
    renderNotes(); 
  };

  const li = document.createElement('li');
  li.className = `noteItem ${note.id === editingId ? 'editing' : ''}`;
  
  const title = document.createElement('div');
  title.className = 'noteTitle';
  title.textContent = note.title || '(Sin título)';

  const text = document.createElement('div');
  text.className = 'noteText';
  text.textContent = note.content || '';

  const dateEl = document.createElement('div');
  dateEl.className = 'noteDate';
  const date = new Date(note.updatedAt);
  dateEl.textContent = date.toLocaleString();

  title.addEventListener('click', openNoteForEditing);
  text.addEventListener('click', openNoteForEditing);
  dateEl.addEventListener('click', openNoteForEditing);
  
  const controls = document.createElement('div');
  controls.className = 'noteControls';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn-icon';
  openBtn.title = 'Editar nota';
  const openIconSvg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`, 'image/svg+xml').documentElement;
  openBtn.appendChild(openIconSvg);
  openBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    openNoteForEditing();
  });
  
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon delete';
  delBtn.title = 'Eliminar nota';
  const delIconSvg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`, 'image/svg+xml').documentElement;
  delBtn.appendChild(delIconSvg);
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta nota?')) return;
    const notes = await getNotes();
    const filtered = notes.filter(x => x.id !== note.id);
    await saveNotes(filtered);
    renderNotes();
    if (editingId === note.id) clearEditor();
    status('Nota eliminada.', 'danger');
  });

  controls.appendChild(openBtn);
  controls.appendChild(delBtn);

  li.appendChild(title);
  li.appendChild(text);
  li.appendChild(dateEl);
  li.appendChild(controls);

  return li;
}

async function renderNotes(filterText = '') {
  const notes = await getNotes();
  notesList.textContent = '';
  
  const lowerCaseFilter = filterText.toLowerCase();
  const filteredNotes = notes.filter(note => 
    (note.title || '').toLowerCase().includes(lowerCaseFilter) || 
    (note.content || '').toLowerCase().includes(lowerCaseFilter)
  );

  if (filteredNotes.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.textAlign = 'center';
    emptyState.style.padding = '40px';
    emptyState.style.opacity = '0.5';
    
    const emptyIcon = new DOMParser().parseFromString(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="9" y1="13" x2="15" y2="13"></line>
        <line x1="9" y1="17" x2="15" y2="17"></line>
        <line x1="9" y1="9" x2="10" y2="9"></line>
      </svg>
    `, 'image/svg+xml').documentElement;
    
    const emptyText = document.createElement('p');
    emptyText.textContent = 'No se encontraron notas';
    
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    notesList.appendChild(emptyState);
    return;
  }
  filteredNotes.sort((a, b) => b.updatedAt - a.updatedAt);
  for (const note of filteredNotes) {
    notesList.appendChild(createNoteListItem(note));
  }
}

function status(text, type = 'info', timeout = 2000) {
  clearTimeout(statusTimeout);
  if (text) {
    statusEl.textContent = text;
    statusEl.className = `status ${type} show`;
  } else {
    statusEl.className = 'status';
  }
  
  if (timeout !== -1 && text) {
    statusTimeout = setTimeout(() => {
      statusEl.className = 'status';
    }, timeout);
  }
}

function clearEditor() {
  editingId = null;
  titleEl.value = '';
  contentEl.value = '';
  editorTitleEl.textContent = 'Nueva Nota';
  
  newBtn.textContent = '';
  const clearIconSvg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`, 'image/svg+xml').documentElement;
  const clearSpan = document.createElement('span');
  clearSpan.textContent = 'Limpiar';
  newBtn.appendChild(clearIconSvg);
  newBtn.appendChild(clearSpan);
  newBtn.classList.remove('danger-text');
  titleEl.classList.remove('invalid');
  contentEl.classList.remove('invalid');
  status('Editor limpio.', 'info');
  updateCharCount(); 
  browserAPI.storage.local.remove(['editorDraft', 'editingIdDraft'], () => {
    if (browserAPI.runtime.lastError) { /* Ignorar */ }
  }); 
  renderNotes(); 
}

function updateCharCount() {
  const length = contentEl.value.length;
  charCounterEl.textContent = `${length} caracteres`;
}

async function performSave(isAutoSave = false) {
  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  
  if (!isAutoSave) {
    titleEl.classList.remove('invalid');
    contentEl.classList.remove('invalid');
    if (title && !content && !title) {
       // logic
    }
    if (!title && !content) {
      titleEl.classList.add('invalid');
      contentEl.classList.add('invalid');
      status('La nota está vacía. Escribe algo.', 'danger');
      return;
    }
  }

  const notes = await getNotes();
  const now = Date.now();

  if (editingId) {
    const noteToUpdate = notes.find(n => n.id === editingId);
    if (noteToUpdate) {
      if (noteToUpdate.title === title && noteToUpdate.content === content) {
        return;
      }
      noteToUpdate.title = title;
      noteToUpdate.content = content;
      noteToUpdate.updatedAt = now;
    }
  } else if (!isAutoSave) {
    notes.push({
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: now,
      updatedAt: now
    });
  } else {
    await new Promise(resolve => {
      browserAPI.storage.local.set({ 
        editorDraft: { title, content },
        editingIdDraft: editingId 
      }, () => {
        resolve();
      });
    });
    return;
  }

  try {
    await saveNotes(notes);
    renderNotes();
    
    if (!isAutoSave) {
      status('Nota guardada.', 'success');
      await browserAPI.storage.local.remove(['editorDraft', 'editingIdDraft']);
      clearEditor();
      switchTab('history');
    }
  } catch (error) {
    if (!isAutoSave) status('Error al guardar: ' + error.message, 'danger');
  }
}

saveBtn.addEventListener('click', () => performSave(false));

function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    performSave(true);
  }, 1000); 
}

titleEl.addEventListener('input', triggerAutoSave);
contentEl.addEventListener('input', () => {
  updateCharCount();
  triggerAutoSave();
});

newBtn.addEventListener('click', () => {
  if (editingId) {
    clearEditor();
  } else {
    clearEditor();
    switchTab('create');
    titleEl.focus();
  }
});

searchInput.addEventListener('input', (e) => {
  renderNotes(e.target.value);
});

if (deleteAllBtn) {
  deleteAllBtn.addEventListener('click', async () => {
    const notes = await getNotes();
    if (notes.length === 0) {
      status('No hay notas para borrar.', 'info');
      return;
    }
    if (!confirm('¿Estás seguro de que quieres borrar TODAS las notas? Esta acción no se puede deshacer.')) return;
    
    await saveNotes([]);
    renderNotes();
    clearEditor();
    status('Todas las notas han sido eliminadas.', 'success');
  });
}

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = settingsDropdown.style.display === 'none';
  settingsDropdown.style.display = isHidden ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (settingsDropdown && settingsBtn && 
      !settingsDropdown.contains(e.target) && 
      !settingsBtn.contains(e.target)) {
    settingsDropdown.style.display = 'none';
  }
});

themeSelector.addEventListener('change', (e) => {
  const selectedTheme = e.target.value;
  applyTheme(selectedTheme);
  browserAPI.storage.sync.set({ theme: selectedTheme }, () => {
    if (browserAPI.runtime.lastError) {
      browserAPI.storage.local.set({ theme: selectedTheme });
    }
  });
});

if (psmSelector) {
  psmSelector.addEventListener('change', (e) => {
    browserAPI.storage.sync.set({ psmMode: e.target.value }, () => {
      if (browserAPI.runtime.lastError) {
        browserAPI.storage.local.set({ psmMode: e.target.value });
      }
    });
  });
}

function applyTheme(theme) {
  const docEl = document.documentElement;
  docEl.classList.remove('theme-light', 'theme-dark', 'theme-system');
  if (theme === 'light') {
    docEl.classList.add('theme-light');
  } else if (theme === 'dark') {
    docEl.classList.add('theme-dark');
  } else {
    docEl.classList.add('theme-system');
  }
}

async function exportNotes() {
  try {
    const notes = await getNotes();
    const notesJSON = JSON.stringify(notes, null, 2);
    const blob = new Blob([notesJSON], { type: 'application/json' });
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `notas-export-${date}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    status('Notas exportadas con éxito.', 'success');
  } catch (error) {
    status('Error al exportar: ' + error.message, 'danger');
  }
}

const profileExportBtn = document.getElementById('profile-export-btn');
const profileImportBtn = document.getElementById('profile-import-btn');

if (profileExportBtn) profileExportBtn.addEventListener('click', exportNotes);
if (profileImportBtn) profileImportBtn.addEventListener('click', () => importFileInput.click());

exportBtn.addEventListener('click', exportNotes);

importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importedNotes = JSON.parse(event.target.result);
      if (!Array.isArray(importedNotes)) {
        throw new Error('El archivo no contiene un array de notas válido.');
      }

      const localNotes = await getNotes();
      const notesMap = new Map();

      [...localNotes, ...importedNotes].forEach(note => {
        if (!note.id || !note.updatedAt) return; 
        const existing = notesMap.get(note.id);
        if (!existing || note.updatedAt > existing.updatedAt) {
          notesMap.set(note.id, note);
        }
      });

      const mergedNotes = Array.from(notesMap.values());
      await saveNotes(mergedNotes);
      await renderNotes();
      status(`${importedNotes.length} notas importadas y fusionadas.`, 'success');
      switchTab('history');

    } catch (error) {
      status(`Error al importar: ${error.message}`, 'danger', 5000);
    }
  };
  reader.readAsText(file);
});

// --- OCR y Extras ---
if (ocrBtn) {
  ocrBtn.addEventListener('click', async () => {
    try {
      const tabs = await browserAPI.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0];
      
      if (!tab || !tab.url || tab.url.startsWith('about:')) {
        status('El navegador no permite el uso de OCR en esta página.', 'danger', 5000);
        return;
      }

      const container = document.querySelector('.container');
      if (container) container.classList.add('ocr-processing');
      status('Iniciando escáner...', 'info');

      browserAPI.runtime.sendMessage({ action: 'performBackgroundOCR', tab });
      
      setTimeout(() => window.close(), 600);
    } catch (e) {
      status('Error: ' + e.message, 'danger');
    }
  });
}

if (pinBtn) {
  pinBtn.addEventListener('click', async () => {
    if (browserAPI.sidebarAction && typeof browserAPI.sidebarAction.open === 'function') {
      browserAPI.sidebarAction.open();
      window.close();
    } else {
      await chrome.windows.create({ url: 'popup.html', type: 'popup', width: 450, height: 750 });
      window.close();
    }
  });
}

// --- Perfil Local ---
async function initLocalProfile() {
  currentProfile = await getLocalProfile();
  updateProfileUI();
  
  // Renderizar grid de emojis
  emojiGrid.textContent = '';
  EMOJI_LIST.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.className = 'emoji-item';
    span.addEventListener('click', async () => {
      currentProfile.icon = emoji;
      await saveLocalProfile(currentProfile);
      updateProfileUI();
      emojiPicker.style.display = 'none';
    });
    emojiGrid.appendChild(span);
  });
}

function updateProfileUI() {
  localProfileIcon.textContent = currentProfile.icon;
  localProfileName.textContent = currentProfile.name;
  localHeaderIcon.textContent = currentProfile.icon;
  localHeaderName.textContent = currentProfile.name;
}

editLocalNameBtn.addEventListener('click', () => {
  localProfileName.style.display = 'none';
  localNameInput.style.display = 'block';
  localNameInput.value = currentProfile.name;
  localNameInput.focus();
});

localNameInput.addEventListener('blur', async () => {
  const newName = localNameInput.value.trim() || 'Mi Espacio';
  currentProfile.name = newName;
  await saveLocalProfile(currentProfile);
  localNameInput.style.display = 'none';
  localProfileName.style.display = 'block';
  updateProfileUI();
});

localNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') localNameInput.blur();
});

localIconTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = emojiPicker.style.display === 'none';
  emojiPicker.style.display = isHidden ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (emojiPicker && !emojiPicker.contains(e.target) && !localIconTrigger.contains(e.target)) {
    emojiPicker.style.display = 'none';
  }
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
  detectSidePanel();
  await initLocalProfile();
  await renderNotes();
  
  const { theme, psmMode } = await browserAPI.storage.sync.get(['theme', 'psmMode']);
  if (theme) applyTheme(theme);
  if (psmMode && psmSelector) psmSelector.value = psmMode;
  
  const { editorDraft } = await browserAPI.storage.local.get('editorDraft');
  if (editorDraft && !editingId) {
    titleEl.value = editorDraft.title || '';
    contentEl.value = editorDraft.content || '';
    updateCharCount();
  }
  
  browserAPI.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'ocrResult') {
      if (msg.text) {
        contentEl.value += (contentEl.value ? '\n\n' : '') + msg.text;
        updateCharCount();
        status('Texto extraído con éxito.', 'success');
        switchTab('create');
      } else {
        status('No se encontró texto en la imagen.', 'info');
      }
    }
  });
});
