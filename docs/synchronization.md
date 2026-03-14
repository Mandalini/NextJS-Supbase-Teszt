# Szinkronizációs Modul Dokumentáció

Ez a modul lehetővé teszi az alkalmazásban tárolt adatok (szervezők, események) külső webhelyekre történő kiszinkronizálását, n8n munkafolyamatok segítségével.

## Áttekintés

A rendszer egy központi vezérlő táblát (`sync_locations`) használ, amely meghatározza a szinkronizálási célpontokat. Az n8n ebből a táblából olvassa ki, hogy melyik adatot hova kell továbbítani.

## Adatbázis Struktúra (`sync_locations`)

| Mező | Típus | Leírás |
| :--- | :--- | :--- |
| `id` | UUID | Elsődleges kulcs |
| `name` | TEXT | A szinkronizációs hely megnevezése |
| `url` | TEXT | A külső végpont URL címe |
| `status` | TEXT | Állapot: `active` (Aktív) vagy `inactive` (Inaktív) |
| `target_type` | TEXT | Szűrés: `Szervező`, `Esemény` vagy `all` |
| `description` | TEXT | Megjegyzés vagy belső leírás |
| `wp_user` | TEXT | WordPress felhasználónév a hitelesítéshez |
| `secret_key` | TEXT | WordPress alkalmazás jelszó (n8n kódolja majd) |

## Jogosultságok

A modul két szintű jogosultságot kezel:
- **`view_sync_rules`**: Feladata a szinkronizációs folyamatok és helyszínek megtekintése. A felületen az adatok megjelennek, de a módosítás, törlés és új feladat hozzáadása tiltott (Read-only mód).
- **`manage_sync_rules`**: Teljes írási, törlési és kezelési jog a szinkronizációs helyszínekhez és feladatokhoz.

Alapértelmezés szerint a `manage_sync_rules` az **Admin** szerepkörhöz van rendelve, míg a `view_sync_rules` kiosztható alacsonyabb szintű adminisztrátori vagy operátori szerepkörökhöz.

## Kezelőfelület

A szinkronizációs helyek a Dashboard hamburger menüjéből érhetők el. A felületen lehetőség van:
- Új helyszínek hozzáadására a **"+ Új sor"** gombbal.
- Adatok helyben (inline) történő szerkesztésére.
- Oszlopok átméretezésére és sorrendjének módosítására (drag & drop).

## Adatbázis Struktúra (`sync_tasks`)

Ez a tábla köti össze a szervezőket/eseményeket a konkrét szinkronizációs helyszínekkel.

| Mező | Típus | Leírás |
| :--- | :--- | :--- |
| `id` | UUID | Elsődleges kulcs |
| `target_type` | TEXT | `Szervező` vagy `Esemény` |
| `target_id` | UUID | A szervező vagy esemény belső azonosítója |
| `sync_location_id` | UUID | Idegen kulcs a `sync_locations` táblára |
| `external_id` | TEXT | Az adat azonosítója a külső rendszerben (az n8n írja vissza) |
| `status` | TEXT | Állapot: `új`, `módosítandó`, `szinkronizált`, `szinkron hiba`, `törölt` |
| `description` | TEXT | Hibaüzenet vagy megjegyzés |
| `updated_at` | TIMESTAMPTZ | Utolsó módosítás időpontja |

## Kezelőfelület

### Szinkronizálás vezérlő (Összesített nézet)
A Dashboard hamburger menüjéből érhető el a teljes lista. Az áttekinthetőség érdekében az adatok két külön csoportra (táblázatra) vannak bontva:
- **SZERVEZŐK SZINKRONIZÁLÁSA**: Csak a profilokhoz tartozó feladatok.
- **ESEMÉNYEK SZINKRONIZÁLÁSA**: Csak az eseményekhez tartozó feladatok. Ebben a nézetben egy extra **"Szervező neve"** oszlop is segít azonosítani az esemény tulajdonosát.

Minden táblázat saját "+ Új szinkron feladat" gombbal rendelkezik, amely automatikusan beállítja a cél-típust.

### Beágyazott kezelő
A szervezők (Profil szerkesztése) és események (Esemény szerkesztése) adatlapjának alján található egy kontextus-érzékeny táblázat. 
- A panel csak akkor látható, ha a felhasználónak van legalább megtekintési (`view_sync_rules`) joga.
- A táblázat automatikusan csak az adott elemhez (Szervező vagy Esemény) tartozó feladatokat mutatja.
- A szerkeszthetőség dinamikus: ha a felhasználónak nincs `manage_sync_rules` jogosultsága, a táblázat `readonly` módban jelenik meg.

## Design Standardok az új oldalakhoz
Minden új adminisztrációs oldalnak (pl. Szinkronizálás vezérlő) követnie kell az alábbi stílust:
- **Visszalépés gomb:** A bal felső sarokban `Link` komponenssel, `glass-panel` stílusban.
- **Címsor:** `text-4xl font-extralight tracking-wider` stílusú H1, arany vagy kék kiemeléssel.
- **Táblázat:** `EditableTable` használata, ahol a **Műveletek** oszlop az első (`actionsPosition="start"`), az **Állapot** pedig közvetlenül utána következik.
- Dátumok: A módosítás dátuma és ideje (óra:perc) az utolsó oszlopban jelenjen meg.

## Szervezői Alapértelmezett Szinkronizálás (`profile_default_sync_locations`)

Az új funkció lehetővé teszi, hogy minden szervezőhöz ("Profil") előre beállítsuk, melyik külső helyszínekre kell az eseményeinek automatikusan szinkronizálódniuk.

- **Működés:** Amikor egy új esemény létrejön (vagy egy meglévőt klónoznak), egy adatbázis trigger automatikusan létrehozza a megfelelő feladatokat a `sync_tasks` táblában a szervező alapbeállításai alapján.
- **Kezelőfelület:**
    - **Globális:** A Dashboard hamburger menüjéből ("Szinkron alapértelmezések") érhető el az összes szervező központi listája.
    - **Profil-specifikus:** A Profil szerkesztése oldalon ("Külső Szinkronizálás Célpontjai" blokk) csak az adott szervező alapértelmezései kezelhetők.

## Adatbázis Függvények (Stored Procedures)

A szinkronizációs logikát és a rendszerműködést az alábbi PostgreSQL függvények támogatják:

| Függvény neve | Leírás |
| :--- | :--- |
| `fn_auto_create_sync_tasks()` | **Esemény szinkron trigger:** Automatikusan lefut minden új esemény beszúrásakor. Lekéri a szervező (`user_id`) alapértelmezett helyszíneit, és bejegyzi őket a `sync_tasks` táblába "Esemény" típussal és az esemény címével. |
| `get_pending_organizer_syncs()` | **n8n segédfüggvény (Szervező):** Listázza a várakozó szervezőket, WP mezőnevekkel, `wp_user`-rel és minden szükséges ACF adattal. |
| `get_pending_event_syncs()` | **n8n segédfüggvény (Esemény):** Listázza a várakozó eseményeket, WP mezőnevekkel, `wp_user`-rel és minden szükséges ACF adattal. |
| `update_sync_task_status()` | **Állapotkezelő:** Lehetővé teszi a szinkronizációs feladatok állapotának frissítését, az `external_id` (külső azonosító) visszaírását és hibaüzenetek rögzítését. |
| `handle_new_user()` | **Profil inicializáló:** Automatikusan létrehozza a nyilvános `profiles` rekordot és hozzárendeli az alapértelmezett "Tag" szerepkört minden új regisztrációkor. |
| `log_event_publish()` | **Publikálás figyelő:** Naplózza a `publish_event_hooks` táblába, ha egy esemény státusza 'published' vagy 'cancelled' értékre változik. |
| `deactivate_missing_events()` | **Scraper takarító:** Hatástalanítja (`is_active = false`) azokat a begépelt eseményeket, amik egy megadott idő óta nem jelentek meg a forrásoldalon. |
| `get_next_run_id()` | **Művelet azonosító:** Generál egy új egyedi futtatási azonosítót a külső adatok begyűjtéséhez (scraping). |
| `handle_updated_at_sync_locations()` | Automatikusan frissíti az `updated_at` időbélyeget a szinkronizációs helyszíneknél. |
| `set_updated_at_sync_tasks()` | Automatikusan frissíti az `updated_at` időbélyeget a szinkronizációs feladatoknál. |

## n8n Integráció (Aktuális - v2 Pattern)

Az n8n oldalon a **"Szervező Szinkronizáció (HTTP API) v2"** nevű munkafolyamat az alapminta az integrációhoz.

### Kritikus Tanulságok és Megoldások:

1.  **Supabase RPC hívás:**
    - Az URL-nek tartalmaznia kell az `/rpc/` útvonalat: `https://.../rest/v1/rpc/function_name`.
    - A metódusnak mindig **POST**-nak kell lennie.
    - Fejlécekben az `apikey` és az `Authorization` (Bearer token) kötelező.

2.  **Iteráció (Split In Batches v3):**
    - **Fontos:** A v3-as csomópontnál az **alsó kimenet (Index 1)** a "Loop" ág, ide kell kötni az adatfeldolgozást! A felső kimenet (Index 0) a "Done" ág.

3.  **Adatok elérése a cikluson belül:**
    - Mivel a feldolgozás során az objektumstruktúra változhat, a feladat azonosítóját (`task_id`) mindig közvetlenül a Loop node-tól kérjük el:
      `$node["Loop Over Items"].json.task_id`.
    - A külső rendszer válaszát (szimulált vagy valós ID) a legutolsó node-tól vesszük: `$json.id`.

4.  **Hibaüzenetek elkerülése:**
    - A fejléc JSON-nál kerülni kell a felesleges kifejezés-prefixeket (`=`), ha a JSON statikus.
    - A Code node-oknak mindig tömböt kell visszaadniuk: `return [{ json: { ... } }];`.

5.  **Hitelesítési Minta (Automata Basic Auth):**
    - Mivel az n8n sandbox letiltja a `Buffer`-t a Headers mezőben, egy külön **Code Node**-ot használunk az adatok beküldése előtt:
    ```javascript
    for (const item of $input.all()) {
      item.json.auth_header = 'Basic ' + Buffer.from(item.json.wp_user + ':' + item.json.api_key).toString('base64');
    }
    return $input.all();
    ```
    - A HTTP Request node-ban a fejléc hivatkozása: `{{ $json.auth_header }}`.

### Mezőleképezések (Field Mapping) a WordPress felé:

Az n8n munkafolyamat az alábbi struktúrában küldi az adatokat a WordPress REST API felé.

#### 1. Szervezők (Szervezok CPT)
| WordPress / ACF Mező | Supabase / n8n Mező | Típus | Leírás |
| :--- | :--- | :--- | :--- |
| `title` | `wp_title` | Text | Szervező neve |
| `content` | `wp_content` | HTML/Text | Bemutatkozás |
| `acf.display_name` | `acf_display_name` | Text | Megjelenítendő név |
| `acf.szlogen` | `acf_szlogen` | Text | Szervező szlogenje |
| `acf.phone` | `acf_phone` | Text | Telefonszám |
| `acf.email` | `acf_email` | Text | Kapcsolati email |
| `acf.website` | `acf_website` | URL | Weboldal |
| `acf.facebook` | `acf_facebook` | URL | Facebook link |
| `acf.instagram` | `acf_instagram` | URL | Instagram link |
| `acf.kep_link` | `acf_kep_link` | URL | Profilkép URL |
| `acf.organizer_id` | `acf_organizer_id` | UUID | Eredeti Profil ID |
| `acf.task_id` | `acf_task_id` | UUID | Feladat ID |

#### 2. Események (Esemenyek CPT)
| WordPress / ACF Mező | Supabase / n8n Mező | Típus | Leírás |
| :--- | :--- | :--- | :--- |
| `title` | `wp_title` | Text | Esemény neve |
| `content` | `wp_content` | HTML/Text | Leírás |
| `acf.event_date` | `acf_event_date` | Date | Dátum (YYYY-MM-DD) |
| `acf.event_time` | `acf_event_time` | Time | Időpont (HH:mm) |
| `acf.location` | `acf_location` | Text | Helyszín |
| `acf.price` | `acf_price` | Numeric | Részvételi díj |
| `acf.capacity` | `acf_capacity` | Integer | Max. létszám |
| `acf.category` | `acf_category` | Text | Kategória |
| `acf.image_url` | `acf_image_url` | URL | Kiemelt kép linkje |
| `acf.event_id` | `acf_event_id` | UUID | Eredeti Esemény ID |
| `acf.organizer_id` | `acf_organizer_id` | UUID | Szervező ID |
| `acf.task_id` | `acf_task_id` | UUID | Feladat ID |

### Példa a státusz frissítés (UpdateStatusNode) JSON body-jára:
```javascript
={{
  JSON.stringify({
    "p_task_id": $node["Loop Over Items"].json.task_id,
    "p_status": "szinkronizált",
    "p_external_id": $json.id || $json.uuid || ""
  })
}}
```
