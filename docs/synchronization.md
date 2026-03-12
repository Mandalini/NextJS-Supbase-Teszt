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
| `secret_key` | TEXT | Hitelesítéshez szükséges API kulcs vagy token |

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
A Dashboard hamburger menüjéből érhető el a teljes lista, ahol minden szinkronizációs feladat kezelhető.

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
- **Dátumok:** A módosítás dátuma és ideje (óra:perc) az utolsó oszlopban jelenjen meg.

## n8n Integráció (Tervezett)

Az n8n számára az alábbi lekérdezés javasolt a feladatok kezeléséhez:
```sql
SELECT t.*, l.url, l.secret_key 
FROM sync_tasks t
JOIN sync_locations l ON t.sync_location_id = l.id
WHERE t.status IN ('új', 'módosítandó');
```
A feldolgozás után az n8n frissíti a `status` mezőt `szinkronizált`-ra és beírja az `external_id` értékét.
