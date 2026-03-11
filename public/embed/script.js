/* public/embed/script.js */

// Configuration
const SUPABASE_URL = 'https://krehiptongtcrofkdhxh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X5CoI9656Pze7t-H16UJrQ_IL8crd5s';

// State
let supabaseClient = null;
let events = [];

/**
 * Initialize the application
 */
async function init() {
    console.log('Embed module inicializálása [v5]...');
    
    // 1. Initialize Supabase Client if not already done
    if (!supabaseClient) {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library nem található!');
            showError('Hiba: Az adatbázis könyvtár nem töltődött be.');
            return;
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // 2. Handle URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Skin: default is 'gong'
    const skin = urlParams.get('skin') || 'gong';
    document.body.setAttribute('data-theme', skin);
    
    // Organizer: default is 'all'
    const organizerFilter = urlParams.get('szervező') || urlParams.get('organizer') || null;

    // 3. Fetch Data
    await fetchEvents(organizerFilter);

    // 4. Render
    renderEvents();
}

/**
 * Fetch events from Supabase
 */
async function fetchEvents(organizer) {
    try {
        if (!supabaseClient) return;

        // Építsük fel a lekérdezést lépésenként
        let query;
        const isFilteringOrganizer = organizer && organizer.toLowerCase() !== 'all';

        // Select meghatározása az inner join alapján
        if (isFilteringOrganizer) {
            query = supabaseClient
                .from('events')
                .select('*, profile:profiles!events_user_id_fkey!inner(display_name)')
                .eq('status', 'published')
                .eq('profile.display_name', organizer);
        } else {
            query = supabaseClient
                .from('events')
                .select('*, profile:profiles!events_user_id_fkey(display_name)')
                .eq('status', 'published');
        }

        // Rendezés
        console.log('Lekérdezés indítása...', { organizer, isFilteringOrganizer });
        const { data, error } = await query.order('date', { ascending: true });

        if (error) throw error;
        events = data || [];
        console.log('Sikeres lekérdezés:', events.length, 'esemény');
        
    } catch (error) {
        console.error('Lekérdezési hiba:', error);
        showError('Hiba történt az adatok betöltésekor. Frissítsd az oldalt!');
    }
}

/**
 * Render events to the table
 */
function renderEvents() {
    const loader = document.getElementById('loader');
    const content = document.getElementById('content');
    const eventsBody = document.getElementById('events-body');
    const emptyState = document.getElementById('empty-state');
    const tableWrapper = document.querySelector('.table-wrapper');

    loader.classList.add('hidden');
    content.classList.remove('hidden');

    if (events.length === 0) {
        tableWrapper.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    tableWrapper.classList.remove('hidden');
    emptyState.classList.add('hidden');

    eventsBody.innerHTML = events.map(event => `
        <tr onclick="window.open('/event/${event.id}', '_blank')">
            <td>
                <div class="event-title">${event.title}</div>
            </td>
            <td>
                <div class="event-date">${new Date(event.date).toLocaleDateString('hu-HU')}</div>
            </td>
            <td>
                <span class="category-tag">${event.category || '-'}</span>
            </td>
            <td>
                <div class="event-location">${event.location || '-'}</div>
            </td>
            <td class="text-right">
                <a href="/event/${event.id}" class="btn-details" target="_blank" onclick="event.stopPropagation()">Részletek &rarr;</a>
            </td>
        </tr>
    `).join('');
}

/**
 * Show error message
 */
function showError(message) {
    const loader = document.getElementById('loader');
    const errorContainer = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    loader.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorText.textContent = message;
}

// Ensure the page and libraries are loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
