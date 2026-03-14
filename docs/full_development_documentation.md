# My Event App - Fejlesztési Dokumentáció v1.2

Ez a dokumentum összefoglalja a „My Event App” eseménykezelő rendszer eddigi fejlesztési eredményeit, technikai alapjait és architektúráját. A dokumentum célja, hogy kiindulópontként szolgáljon a jövőbeni fejlesztésekhez és hasonló rendszerek alapkövének tekinthető.

---

## 1. Technológiai Stack

A projekt a legmodernebb webes technológiákra épül:

-   **Frontend:** Next.js 16.1.6 (App Router architektúra), React 19.
-   **Nyelv:** TypeScript a típusbiztonságért és a karbantarthatóságért.
-   **Stílus és Design:** Tailwind CSS 4, egyedi Glassmorphism és Cyberpunk-hatású vizuális elemekkel (glow effektek, neon színek).
-   **Backend & Adatbázis:** Supabase (PostgreSQL), Auth, Storage (képek feltöltéséhez).
-   **Rich Text Editor:** React Quill a formázott eseményleírásokhoz.
-   **Állapotkezelés:** React Hooks (useState, useEffect, useMemo) és Session Storage a szűrők megőrzéséhez.

---

## 2. Rendszerarchitektúra és Adatmodell

### 2.1 Adatbázis Táblák (Public Schema)

A rendszer alapja egy relációs adatbázis, amely a következő fő táblákból áll:

1.  **`events`**: Az események központi tárolója (cím, leírás, dátum, helyszín, kategória, státusz, kép-URL, létrehozó/módosító azonosítója).
2.  **`profiles`**: Felhasználói profilok (megjelenítési név, avatar stb.), amely a Supabase Auth-hoz kapcsolódik.
3.  **`categories`**: Az események kategóriáinak kezelése.
4.  **`event_attendees`**: Kapcsolótábla a résztvevők és események között (ki hova iratkozott fel).
5.  **`roles` & `permissions`**: Szerepkör alapú hozzáférés-szabályozás (RBAC) törzstáblái.
6.  **`user_roles` & `role_permissions`**: Kapcsolótáblák, amik összekötik a felhasználókat a szerepkörökkel és az engedélyekkel.
7.  **`scrape_sources`**: Külső adatforrások (URL, parser típus, státusz) technikai táblája.
8.  **`soundbath_events`**: Begyűjtött (scraped) eseményadatok tárolója, amelyek még nem kerültek át a végleges `events` táblába.
9.  **`sync_locations`**: Külső szinkronizációs célpontok (pl. WordPress API-k).
10. **`sync_tasks`**: Aktuális szinkronizációs feladatok és állapotuk.
11. **`profile_default_sync_locations`**: Szervezőnkénti alapértelmezett szinkronizációs célpontok.

### 2.2 Szerepkörök és Jogosultságok (RBAC)

A rendszer három fő szintet különböztet meg:

-   **Adminisztrátor (Admin):** Teljes hozzáférés. Látja mindenki összes eseményét (piszkozatot, töröltet is), bármit szerkeszthet, törölhet és kategóriákat/jogokat kezelhet.
-   **Szervező (Organizer):** Létrehozhat saját eseményeket, szerkesztheti azokat. Csak a saját piszkozatait látja, a másokét nem.
-   **Regisztrált Felhasználó:** Megtekintheti a publikált eseményeket, és jelentkezhet rájuk.

**Dinamikus Jogosultságkezelés:**
A rendszer támogatja a granuláris jogosultságokat, melyek a „Szerepkör-mátrix” felületen keresztül dinamikusan rendelhetők hozzá bármely szerepkörhöz.
Újonnan bevezetett jogok:
-   `view_uploaded_events`: Hozzáférés a „Feltöltött események” oldalhoz.
-   `manage_uploaded_events`: Szerkesztési és törlési jog az adatok felett.
-   `view_sync_rules` & `manage_sync_rules`: Szinkronizációs helyszínek és feladatok kezelése.

**Kulcsfontosságú modul:** `app/hooks/usePermissions.ts` – Egy egyedi hook, amely lekéri a bejelentkezett felhasználó jogait, és biztosítja a `hasPermission()` funkciót a UI elemek (gombok, menük) elrejtéséhez/megjelenítéséhez.

---

## 3. Főbb Funkciók és Felhasználói Felület (UI/UX)

### 3.1 Vezérlőpult (Dashboard)

A rendszer szíve, ahol két nézet között lehet váltani:
-   **Kártyás nézet:** Esztétikus, képekkel és leírás-kivonatokkal ellátott modern rács elrendezés.
-   **Táblázatos nézet:** Professzionális, adatvezérelt elrendezés.
    -   *Kiemelt featúra:* Dinamikus rendezés (Cím, Szervező, Dátum szerint).
    -   *Admin mód:* Adminként „Minden Esemény” nézet érhető el, szervező szerinti szűréssel és minden állapotú (piszkozat/törölt) esemény megjelenítésével.

### 3.2 Eseménykezelés (CRUD)

-   **Létrehozás/Szerkesztés:** Formázott leírás (Quill), egyedi dátumválasztó és kategória választó modul.
-   **Másolás (Duplicate):** Meglévő esemény klónozása piszkozatként, egyetlen kattintással.
-   **Törlés:** Biztonsági megerősítéssel és (RLS szinten) adminisztrátori felülbírálattal.
-   **Audit Trail:** Minden eseménynél rögzítjük és kijelezzük:
    -   Ki és mikor hozta létre.
    -   Ki és mikor végezte az utolsó módosítást.

### 3.3 Kifinomult Szűrés

A rendszer képes egyidejűleg kezelni több szempontot:
-   Szöveges keresés (Címben).
-   Dátum-intervallum szűrés (Ettől - Eddig).
-   Státusz szerinti szűrés (Publikált, Piszkozat, Törölt).
-   Szervező szerinti szűrés (csak Adminoknak).
-   *Fontos:* A szűrők állapota megmarad az oldalról való elnavigálás (pl. szerkesztés) után is (`Session Storage`).

### 3.4 Feltöltött Események és Adatkezelés
Egy speciális adminisztrációs felület (`/dashboard/feltoltott-esemenyek`) a külső adatforrások és a begyűjtött események kezelésére.
-   **Csoportosított Megjelenítés:** Az események forráskulcs (`source_key`) és státusz (Aktív/Inaktív) szerint bontva jelennek meg.
-   **EditableTable Komponens:** Egy univerzális, újrafelhasználható táblázat modul, amely az alábbiakat biztosítja:
    -   *Helybeni szerkesztés:* Excel-szerű gyors adatbevitel.
    -   *Oszlopok testreszabása:* Draggable sorrend és javított, resizable szélesség kezelés (stale closure bug fix), ami felhasználónként elmentődik (`localStorage`).
    -   *Reset Funkció:* Az elrendezés bármikor alaphelyzetbe állítható egy dedikált gomb segítségével, ami törli a mentett beállításokat.
    -   *Gyors Navigáció:* A „Cím” (title) oszlop intelligens linkként működik: automatikusan megnyitja az esemény forrását (`event_url`) egy új ablakban. Hasonlóan, minden URL típusú mező közvetlenül kattintható.
    -   *Jogosultság-érzékenység:* Automatikusan elrejti a módosító funkciókat, ha hiányzik a `manage_uploaded_events` jog.
    -   *Formázás:* Intelligens típuskezelés (Checkboxok, Dátumválasztók, Időformátum `HH:mm`).

### 3.5 Szinkronizációs Rendszer (ÚJ)

A rendszer támogatja az adatok automatikus és manuális továbbítását külső webhelyekre (pl. WordPress).
-   **Szervezői Alapértelmezések:** Minden szervezőhöz beállíthatók alapértelmezett szinkronizációs célok.
-   **Automatizmus:** Új esemény létrehozásakor vagy klónozásakor egy adatbázis trigger automatikusan legenerálja a szinkronizációs feladatokat a `sync_tasks` táblába.
-   **Globális Vezérlő:** A Dashboard menüjéből elérhető önálló felületek az alapértelmezések és az aktuális feladatok kezeléséhez.

---

## 4. Biztonság és Adatvédelem

### 4.1 Row Level Security (RLS)

Az adatbázis szintjén kényszerítjük ki a jogosultságokat. Fontosabb SQL szabályok (Policies):
-   Mindenki látja a `published` státuszú eseményeket.
-   A tulajdonos látja a saját összes eseményét.
-   **Admin Bypass:** Külön policy-k biztosítják, hogy az Admin fiók látja a mások titkos (piszkozat) adatait is és engedélyezik a módosítást.

### 4.2 Auth Middleware

A Next.js middleware és a Supabase Auth integrációja gondoskodik a nem védett oldalak (pl. Dashboard) elérésének korlátozásáról nem bejelentkezett felhasználók számára.
### 4.3 Adatbázis Függvények (Stored Procedures)

A rendszer üzleti logikáját az alábbi tárolt eljárások támogatják:
- `fn_auto_create_sync_tasks()`: Esemény szinkron trigger (magyar nyelvű típusokkal és névvel).
- `get_pending_organizer_syncs()`: Lekérdezés n8n számára a függő szervezőkhöz.
- `get_pending_event_syncs()`: Lekérdezés az n8n számára a függőben lévő esemény szinkronokhoz.
- `update_sync_task_status()`: Állapot- és external_id frissítő függvény.
- `handle_new_user()`: Automatikus profil és szerepkör létrehozó.
---

## 5. Legutóbbi Optimalizációk

-   **Responsivity & Table Management:** Bevezetésre került egy pixel-pontos oszlopszélesség kezelés az `EditableTable` komponensben. A táblázat szélessége az oszlopok összegéből adódik, lehetővé téve a stabil vízszintes görgetést. Használható a `truncate` technika, így az oszlopok bármilyen keskenyre összeszűkíthetők a tartalomtól függetlenül.
-   **Reset Layout:** A felhasználók egyetlen kattintással alaphelyzetbe állíthatják a táblázat elmentett elrendezését (szélesség, sorrend).
-   **Mobil Optimalizáció:** A vezérlőpult hamburger menüje át lett alakítva tisztán állapot-alapú (`useState`) működésre a korábbi „hover” megoldás helyett, biztosítva a hibátlan működést érintőképernyőkön is. Implementálásra került egy globális kattintás-figyelő is, amely automatikusan bezárja a nyitott menüket a képernyő üres területére bökve.
-   **Z-index Fixek:** A dátumválasztó és kategória választó panelek mindenhol az elemek felett jelennek meg, nem vágja le őket a táblázat kerete.
-   **Intelligens Linkek:** Az `EditableTable`-ben a `title` és az URL típusú mezők automatikusan külső hivatkozássá válnak, megkönnyítve az adatok ellenőrzését és a forrásoldalak elérését.
-   **Univerzális Táblázat:** Az `EditableTable` komponens bevezetésével az adatok kezelése gyorsabbá és átláthatóbbá vált, csökkentve a redundáns kódot.

---

## 6. Jövőbeni Fejlesztési Irányok

Ez az alaprendszer készen áll a bővítésre a következőkkel:
1.  **Értesítések:** Automatikus e-mail visszaigazolás jelentkezéskor.
2.  **QR-kód:** Beléptető kód generálása a jelentkezőknek.
3.  **Statisztika:** Dashboard grafikonok a rendezvények népszerűségéről.
4.  **Publikus Oldal:** SEO-barát landing page az események listázásához.

---

**Frissítve:** 2026. március 14.
**Készítette:** Antigravity AI Coding Assistant
**Téma:** Eseményvezérelt App-keretrendszer - Jogosultságok és Adatkezelés bővítése
