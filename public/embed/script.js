/* public/embed/script.js */

// Configuration
const SUPABASE_URL = 'https://krehiptongtcrofkdhxh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X5CoI9656Pze7t-H16UJrQ_IL8crd5s';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let events = [];

/**
 * Initialize the application
 */
async function init() {
    // 1. Handle URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Skin: default is 'gong' (as requested 'gongakademia')
    const skin = urlParams.get('skin') || 'gong';
    document.body.setAttribute('data-theme', skin);
    
    // Organizer: default is 'all'
    const organizerFilter = urlParams.get('szervező') || urlParams.get('organizer') || null;

    // 2. Fetch Data
    await fetchEvents(organizerFilter);

    // 3. Render
    renderEvents();
}

/**
 * Fetch events from Supabase
 */
async function fetchEvents(organizer) {
    try {
        let query = supabaseClient
            .from('events')
            .order('date', { ascending: true });

        // Apply organizer filter if provided
        if (organizer && organizer.toLowerCase() !== 'all') {
            query = query
                .select('*, profile:profiles!events_user_id_fkey!inner(display_name)')
                .eq('status', 'published')
                .filter('profile.display_name', 'eq', organizer);
        } else {
            query = query
                .select('*, profile:profiles!events_user_id_fkey(display_name)')
                .eq('status', 'published');
        }

        const { data, error } = await query;

        if (error) throw error;
        events = data || [];
        
    } catch (error) {
        console.error('Hiba az események lekérdezésekor:', error);
        showError('Nem sikerült betölteni az eseményeket. Próbáld meg később!');
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

// Start
init();
