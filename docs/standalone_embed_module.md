# Standalone Esemény Lekérdező Modul Dokumentáció

Ez a dokumentáció a `public/embed` könyvtárban található standalone HTML/JS modul használatát és felépítését mutatja be. A modul célja, hogy az eseménytáblázatot könnyen be lehessen építeni külső oldalakba (pl. WordPress + Elementor).

## 1. Elérhetőség és Fájlszerkezet

A modul a projekt `public` mappájában kapott helyet, így a webes elérése: `https://[domain-nev]/embed/index.html`.

**Fájlok:**
- `index.html`: Az alkalmazás váza, betölti a Supabase CDN-t és a szükséges erőforrásokat.
- `style.css`: A projekt vizuális identitását (Glassmorphism) és a skin-eket tartalmazó stíluslap.
- `script.js`: A Supabase lekérdezési logikát, a paraméterek feldolgozását és a táblázat generálását végző script.

## 2. Beépítés (Iframe)

WordPress vagy más CMS rendszerben használd az alábbi iframe kódot:

```html
<iframe 
  src="https://your-domain.com/embed/index.html?skin=gong&szervező=Név" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border:none; border-radius:15px; overflow:hidden;">
</iframe>
```

## 3. Paraméterezés

A modul viselkedése URL paraméterekkel szabályozható:

| Paraméter | Alapértelmezett | Leírás |
| :--- | :--- | :--- |
| `skin` | `gong` | A megjelenés stílusa. Választható értékek: `gong`, `default`, `green`, `rezgesekhaza`, `cyberpunk`. |
| `szervező` | (összes) | Megadható egy konkrét szervező neve (`display_name`), így csak az ő eseményei látszanak. |
| `organizer` | (összes) | A `szervező` paraméter angol nyelvű alternatívája. |

## 4. Technikai Részletek

### Supabase Csatlakozás
A modul közvetlenül a kliens oldalon kommunikál a Supabase-szel a `script.js`-ben definiált `anon_key` használatával. Ha az adatbázis URL vagy a kulcs megváltozik, ebben a fájlban kell frissíteni.

### Adatszűrés
A modul kizárólag a `status = 'published'` állapotú eseményeket listázza ki. A szervező szerinti szűrés a `profiles` tábla `display_name` mezeje alapján történik egy `inner join` segítségével.

### Design System
A modul a főalkalmazásban használt CSS változókat és osztályokat örökli (`glass-panel`, `glow-border`), így a vizuális megjelenés teljesen konzisztens marad. A `data-theme` attribútum a `body` elemen szabályozza a színeket.

---
*Utolsó frissítés: 2026.03.11.*
