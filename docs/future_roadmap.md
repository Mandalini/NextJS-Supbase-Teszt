# További fejlesztési lehetőségek

Ez a dokumentum a rendszer jövőbeli bővítési lehetőségeit és az érintett területek technikai javaslatait tartalmazza.

## 1. Szervező-szintű Szinkronizációs Öröklődés (Inheritance Policy)

Jelenleg a szinkronizációs feladatokat (`sync_tasks`) manuálisan vagy egyedi triggerrel kell létrehozni minden egyes eseményhez. Egy hatékonyabb megközelítés a szervező szintű szabályrendszer bevezetése.

### Koncepció
A Szervező (Profile) adatlapján megadhatóak lennének globális szinkronizációs szabályok. Például: *"Ennek a szervezőnek minden 'Publikus' státuszú eseménye szinkronizálódjon a Jegy.hu-ra és a Facebook-ra."*

### Technikai megvalósítás javaslata
1.  **Szabálytábla (`sync_policies`)**:
    *   `id`, `profile_id`, `sync_location_id`, `is_active`, `conditions` (JSONB).
    *   A `conditions` tartalmazhatna szűrőket (pl. `status: 'published'`, `category: 'zene'`).
2.  **Automatizálás (Database Trigger)**:
    *   Egy `AFTER INSERT OR UPDATE ON events` trigger figyelné az események változását.
    *   Ha egy esemény megfelel a szervezője egyik szabályának, a trigger automatikusan beírna egy új sort a `sync_tasks` táblába.
3.  **Kivételek kezelése**:
    *   Az `events` táblába bevezethető egy `sync_disabled_locations` (array) mező.
    *   Ha egy eseménynél egyedi tiltást állítunk be, az automatizmus figyelembe veszi, és nem hozza létre a feladatot.

### Előnyök
*   **Adminisztrációs teher csökkentése**: Nem kell minden eseménynél külön beállítani a célpontokat.
*   **Konzisztencia**: Biztosítja, hogy egy szervező összes eseménye megjelenjen a kívánt külső platformokon.

---

## 2. Esemény Másolás és Szinkronizáció

Jelenleg az események másolásakor a szinkronizációs adatok nem másolódnak.

### Javaslat
*   A másolási funkció bővítése egy opcióval: *"Szinkronizációs beállítások másolása"*.
*   Ha be van jelölve, az új esemény ID-jével létrejönnek az eredeti esemény `sync_tasks` bejegyzései (de 'új' státusszal).
*   **Megjegyzés**: Ha az 1. pontban leírt öröklődési modell megvalósul, a másolás szinkronizációs része automatikusan megoldódik a szabályok alapján.

---

## 3. n8n Visszacsatolási Hurok Finomhangolása

### Koncepció
Az n8n jelenleg kimenti a külső rendszerekből kapott ID-kat. Ezt tovább lehetne fejleszteni:
*   **Naplózás**: A `sync_tasks` tábla bővítése egy `last_error` vagy `sync_log` JSON mezővel, ahol az n8n tárolhatná a teljes hibaüzenetet sikertelen próbálkozás esetén.
*   **Webhook trigger**: Az n8n jelezhetné a rendszernek, ha egy szinkronizált eseményt a külső rendszerben módosítottak, így a változás visszafelé is megtörténhetne.

---

## 4. Jogosultságok granulálása

A bevezetett `view_sync_rules` és `manage_sync_rules` után felmerülhet az igény:
*   **`audit_sync_logs`**: Csak a naplók és a módosítási dátumok nézegetése, a konkrét külső ID-k és technikai részletek nélkül.
*   **Telephely-alapú korlátozás**: Egy admin csak bizonyos szinkronizálási helyeket (`sync_locations`) kezelhessen.
