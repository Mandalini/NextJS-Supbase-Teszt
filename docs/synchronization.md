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

A modul kezeléséhez a `manage_sync_rules` (Szinkronizálás szabályok beállítása) jogosultság szükséges. Alapértelmezés szerint ez az **Admin** szerepkörhöz van rendelve.

## Kezelőfelület

A szinkronizációs helyek a Dashboard hamburger menüjéből érhetők el. A felületen lehetőség van:
- Új helyszínek hozzáadására a **"+ Új sor"** gombbal.
- Adatok helyben (inline) történő szerkesztésére.
- Oszlopok átméretezésére és sorrendjének módosítására (drag & drop).

## n8n Integráció (Tervezett)

Az n8n számára az alábbi lekérdezés javasolt a feladatok ütemezéséhez:
```sql
SELECT * FROM sync_locations WHERE status = 'active';
```
A kapott URL-re küldött adatok tartalmazzák a szervező vagy esemény adatait, a `secret_key` pedig a fejlécben (Authorization) küldhető.
