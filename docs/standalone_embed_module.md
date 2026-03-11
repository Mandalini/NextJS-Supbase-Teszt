# Standalone Esemény Lekérdező Modul Dokumentáció

Ez a dokumentáció a `public/embed` könyvtárban található standalone HTML/JS modul használatát és felépítését mutatja be. A modul célja, hogy az eseménytáblázatot könnyen, elegáns formában lehessen beépíteni külső oldalakba (pl. WordPress + Elementor).

## 1. Elérhetőség és Fájlszerkezet

A modul a projekt `public` mappájában kapott helyet, így a webes elérése: `https://[domain-nev]/embed/index.html`.

**Fájlok:**
- `index.html`: Az alkalmazás váza, betölti a Supabase CDN-t és a szükséges erőforrásokat.
- `style.css`: A projekt vizuális identitását tükröző, **világos hátterű, elegáns** stíluslap, skin támogatással.
- `script.js`: A Supabase lekérdezési logikát, a paraméterek feldolgozását és az iframe-en belüli navigációt végző script.

## 2. Beépítés (Iframe)

WordPress vagy más CMS rendszerben használd az alábbi iframe kódot:

```html
<iframe 
  src="https://your-domain.com/embed/index.html?skin=gongakademia&szervező=Rezgések Kapu Őre" 
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
| `skin` | `gong` | A megjelenés stílusa. Választható (világosított) értékek: `gong`, `default`, `green`, `rezgesekhaza`, `cyberpunk`. |
| `szervező` | (összes) | Megadható egy konkrét szervező neve (`display_name`), így csak az ő publikus eseményei látszanak. |
| `organizer` | (összes) | A `szervező` paraméter angol nyelvű alternatívája. |

## 4. Újítások (Light Design v5)

- **Elegáns Megjelenés**: A sötét, glassmorphism alapú designt felváltotta egy letisztult, világos hátterű, finom árnyékokat és harmonikus színeket használó felület.
- **Iframe Navigáció**: A "Részletek" gombra vagy egy sorra kattintva az esemény az iframe kereten belül nyílik meg (`window.location.href`), így nem zökkenti ki a látogatót a főoldali környezetből.
- **Szervező Szűrés (Fix)**: A szűrés most már robusztus join logikát használ, így olyan speciális nevek is működnek, mint a *Rezgések Kapu Őre*.

## 5. Technikai Részletek

### Supabase Csatlakozás
A modul közvetlenül a kliens oldalon kommunikál a Supabase-szel. A lekérdezések a `published` státuszú rekordokra korlátozódnak.

### Cache Kezelés
A modul a `script.js?v=5` hivatkozást használja, hogy a böngészők mindig a legfrissebb logikát töltsék be.

---
*Utolsó frissítés: 2026.03.11. (Light Redesign)*
