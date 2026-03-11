---
name: "event-app-expert"
description: "Szakértői szemlélet és technikai útmutatások a My Event App (Next.js + Supabase) karbantartásához és fejlesztéséhez."
---

# My Event App - Fejlesztési Szakértői Útmutató (SKILL)

Ez a Skill biztosítja, hogy minden új funkció, javítás vagy módosítás hű maradjon a projekt eredeti architektúrájához, vizuális világához és biztonsági elveihez.

## 1. Vizuális Identitás & Design System (Skins)

A projekt egy modern, **Glassmorphism** alapú felületet használ, amely **több választható bőrrel (Skin)** rendelkezik. SOHA ne használj égetett (hardcoded) színeket, mindig a `globals.css`-ben definiált változókat alkalmazd!

### 1.1 Elérhető Skin-ek (data-theme):
-   **Default (Alapértelmezett):** Sötétkék/Arany/Lila kombináció.
-   **green (Sötétzöld):** Smaragd és menta zöld tónusok.
-   **gong (Gong Akadémia):** Mély bordó és elegáns homok/arany.
-   **rezgesekhaza (Rezgések Háza):** Meleg barnás-narancsos-vöröses földszínek.
-   **cyberpunk (Modern Cyberpunk):** Neon rózsaszín, neon kék és lila.

### 1.2 Használandó CSS Változók:
Fejlesztés során ezeket a Tailwind osztályokat/változókat használd, hogy a Skin váltás működjön:
-   Háttér: `var(--background)`
-   Szöveg: `var(--foreground)`
-   Arany/Kiemelés: `var(--color-brand-gold)` (Tailwind: `gold`)
-   Szakértői kék: `var(--color-brand-blue)` (Tailwind: `brand-blue`)
-   Szakértői lila: `var(--color-brand-purple)` (Tailwind: `brand-purple`)

-   **Glow Effektek:** Használd a `glow-text` és `glow-border` CSS osztályokat. Ezek automatikusan a Skin-hez igazodnak.
-   **Kártyák & Panelek:** Mindig használj `glass-panel` és `rounded-xl/2xl` kerekítést.
-   **Betűtípus:** Tiszta, modern (Inter/Roboto), ritka betűközzel (`tracking-widest`) az uppercase címeknél.

## 2. Architektúra & Adatfolyam

### 2.1 Supabase Integráció & API Minták
-   Minden adatlekérés és -módosítás a `lib/supabase.ts`- ben definiált kliensen keresztül történjen.
-   **Storage:** Használd az `event-images` bucketet az eseményképekhez. A fájlok útvonala mindig `{user_id}/{filename}` legyen.
-   **Authentikáció:** Felhasználói adatok lekéréséhez preferáld a `supabase.auth.getUser()` metódust (vagy a `useAuth` context-et kliens oldalon).
-   **Kapcsolatok lekérése:** Az `events` és `profiles` tábla közötti idegen kulcsok miatt használd a pontosneveket: `owner:profiles!events_user_id_fkey(display_name)` a tulajdonoshoz és `modifier:profiles!events_updated_by_fkey(display_name)` a módosítóhoz.
-   **Lekérdezési minta:** Egyetlen rekord esetén használd a `.single()` metódust hibaellenőrzéssel. Lista lekérdezésnél preferáld az `order()` használatát a konzisztens sorrendért.
-   **RLS (Row Level Security):** Az Admin (`Rezgések Kapu` stb.) SQL szintű policy-kkel látja el a mások piszkozatait is. Ezt kódból ne próbáld megkerülni, inkább bízz a Supabase-ben.

### 2.2 Next.js Stratégia (Server vs Client)
-   **Server Components:** A főoldali listázáshoz és publikus adatokhoz használd ezeket (pl. `app/page.tsx`). Ekkor használj `export const revalidate = 0;`-t a friss adatokért.
-   **Client Components:** Használd interaktív elemekhez (Dashboard, Formok, Kergetés). Mindig kezdd a `"use client";` direktívával.

### 2.3 Globális Állapot & Hookok
-   **AuthContext:** Használd a `useAuth()` hook-ot a bejelentkezett felhasználó adatainak (`user`) és töltési állapotának (`isLoading`) eléréséhez.
-   **Jogosultságok:** Mindig várd meg a jogosultságok betöltését az `usePermissions()` hook-kal, mielőtt műveleteket (szerkesztés/törlés) vagy Admin-specifikus UI elemeket engedélyeznél.
-   **Szűrők megőrzése:** A Dashboard szűrőit (keresés, státusz, dátum) a `sessionStorage`-ben kell tárolni.

## 3. UI/UX Standardok & Közös Komponensek

### 3.1 Megosztott Form Komponensek
A konzisztencia érdekében használd az `app/components/FormControls.tsx` komponenseit:
-   `CustomDateInput`: Biztosítja a magyar dátumformátumot (`ÉÉÉÉ.HH.NN`) és a natív picker elérését.
-   `CustomCategorySelect`: Esztétikus, Glassmorphism stílusú legördülő menü.
-   **Választéklisták/Dropdownok:** A lenyíló panelek háttere MINDIG legyen `bg-black/80` vagy `var(--background)` alapú, erős `backdrop-blur-xl` homályosítással és vékony `border-white/10` kerettel, hogy illeszkedjen a prémium stílushoz.

### 3.2 Navigáció & Gombok
-   **Navigációs Gombok:** Az oldalak közötti visszalépéshez vagy váltáshoz használt gombok stílusa legyen egységes: `glass-panel`, `px-5 py-2.5`, `rounded-xl`, `text-[10px] uppercase tracking-widest font-bold`, hover esetén `bg-white/10`.
-   **Akció Gombok:** A fő műveletek (Mentés, Új esemény) használjanak gradienst (`from-gold to-yellow-600` vagy `from-brand-blue to-brand-purple`) és glow árnyékot.

### 3.3 Táblázatos Nézet & EditableTable
- **Alapvető fix arányok (ha nem EditableTable-t használsz):**
    - Cím: `w-[30%] max-w-0 truncate`
    - Szervező: `w-[12%] max-w-0 truncate`
    - Dátum/Kategória/Helyszín: `w-[10%]`
    - Műveletek: `w-[12%] min-w-[120px] text-right`
- **Dinamikus Táblázatok:** Bonyolultabb admin funkciókhoz használd az `EditableTable` komponenst.

### 3.6 EditableTable Komponens
Az `app/components/EditableTable.tsx` egy univerzális eszköz a CRUD műveletek és az adatkezelés megkönnyítésére.

**Főbb Interakciók:**
- **Rendezés:** Kattints bármelyik oszlop fejlécére a rendezéshez (Növekvő -> Csökkenő -> Eredeti). Az aktív rendezést arany szín és nyíl jelzi.
- **Oszlopok mozgatása:** A fejléceket megfogva és áthúzva (Drag & Drop) tetszőlegesen módosítható az oszlopok sorrendje.
- **Átméretezés:** Az oszlopok jobb szélén található fogantyúval módosítható a szélesség. A rendszer pixel-pontos méretezést használ: a táblázat összélessége az oszlopok összegéből adódik, így vízszintes görgetés mellett is stabil marad a layout.
- **Keskeny oszlopok (Truncate):** Az oszlopok tetszőlegesen keskenyre húzhatók, a tartalom ilyenkor `truncate` (három pont) segítségével lesz levágva.
- **Gyors Navigáció:** A `title` kulcsú oszlop intelligens linkként működik: ha van `event_url` vagy `source_url`, rákattintva az új ablakban nyílik meg. Minden `_url` végződésű kulcs automatikusan kattintható linkké válik.
- **Reset Layout:** A táblázat jobb felső sarkában található gombbal bármikor törölhető a mentett elrendezés (szélesség és sorrend) a `localStorage`-ból.
- **Perzisztencia:** Minden layout módosítás (szélesség, sorrend) automatikusan mentődik a `localStorage`-ba a megadott `storageKey` alapján.

**Használat (Props):**
- `data`: Megjelenítendő adatok tömbje.
- `columns`: Oszlopdefiníciók (`key`, `label`, `width`, `editable`, `type`).
- `idField`: Ez az egyedi azonosító a táblában (pl. 'id').
- `storageKey`: Egyedi kulcs a táblázat beállításainak mentéséhez.
- `onSave`: Callback függvény a mentéshez (`(row) => Promise<void>`).
- `onDelete`: Callback függvény a törléshez.
- `actionsPosition`: A műveletek oszlop helye (`start` vagy `end`).

**Adatformátumok & Megjelenítés (Standardok):**
- **Dátumformátum:** `YYYY.MM.DD` (vagy a Supabase-ból érkező `YYYY-MM-DD`).
- **Időformátum:** `HH:mm` (a másodperceket el kell rejteni a UI-on, használd a `type: 'time'` beállítást).
- **Boolean megjelenítés:** `✅` az igaz, `❌` a hamis értékekhez.
- **Kiemelés:** Ha a sor objektumban `highlight: true` szerepel, a sor szövege arany és félkövér lesz.

### 3.4 Látványelemek & Reszponzivitás
-   **Background Glow:** Használj `blur-[150px] opacity-20 mix-blend-screen` stílusú köröket a háttérben a cyberpunk hangulathoz.
-   **Loading States:** Használj `animate-pulse bg-white/5` stílusú skeletonokat a betöltés alatt.
-   **Reszponzivitás:** Adaptáld a tartalmat a képernyőmérethez (pl. `hidden sm:block`, `hidden lg:inline-block` a hosszú nevekhez).

## 3.5 Adatformátumok & Megjelenítés
- **Linkek & Címek:** A táblázatokban (és máshol is) a kattintható címek alapszíne fehér (`text-white`), hover esetén arany (`hover:text-gold`), és használjanak `transition-colors` effektet a sima átmenetért. Ne használj kék színt a linkekhez.
- **Dátumformátum:** `YYYY.MM.DD` (vagy a Supabase-ból érkező `YYYY-MM-DD`).
- **Időformátum:** `HH:mm` (a másodperceket a legtöbb helyen el kell rejteni a UI-on).
- **Boolean megjelenítés:** `✅` az igaz, `❌` a hamis értékekhez.
- **Táblázat adatok:** Ha az adat hiányzik, használj `-` jelet.
- **Kiemelés:** A táblázatokban a `highlight: true` tulajdonságú sorok használják a `text-gold font-bold` stílust.

1.  **SOHA** ne használj hardcoded hex színeket! Mindig a `var(...)` változókat használd (lásd 1. fejezet).
2.  **MINDIG** ellenőrizd a hover effekteket (`transition-all duration-300`).
3.  **Hibaüzenetek:** Adatbázis hiba esetén írj értelmes hibaüzenetet a konzolra `JSON.stringify(error)` formátumban.
4.  **Komponens-újrafelhasználás:** Használd a meglévő form vezérlőket és **navigációs gomb stílusokat**.
5.  **Clean Code:** Használj TypeScript interfészeket a Supabase válaszokhoz (pl. `UserRole`, `UserPermission`).
6.  **Frissítés:** Auth műveletek (belépés/kilépés) után mindig hívj `router.refresh()`-t a szerver oldali állapot szinkronizálásához.
