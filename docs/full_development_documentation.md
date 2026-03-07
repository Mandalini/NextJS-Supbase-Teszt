# My Event App - Fejlesztési Dokumentáció v1.0

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

### 2.2 Szerepkörök és Jogosultságok (RBAC)

A rendszer három fő szintet különböztet meg:

-   **Adminisztrátor (Admin):** Teljes hozzáférés. Látja mindenki összes eseményét (piszkozatot, töröltet is), bármit szerkeszthet, törölhet és kategóriákat/jogokat kezelhet.
-   **Szervező (Organizer):** Létrehozhat saját eseményeket, szerkesztheti azokat. Csak a saját piszkozatait látja, a másokét nem.
-   **Regisztrált Felhasználó:** Megtekintheti a publikált eseményeket, és jelentkezhet rájuk.

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

---

## 4. Biztonság és Adatvédelem

### 4.1 Row Level Security (RLS)

Az adatbázis szintjén kényszerítjük ki a jogosultságokat. Fontosabb SQL szabályok (Policies):
-   Mindenki látja a `published` státuszú eseményeket.
-   A tulajdonos látja a saját összes eseményét.
-   **Admin Bypass:** Külön policy-k biztosítják, hogy az Admin fiók látja a mások titkos (piszkozat) adatait is és engedélyezik a módosítást.

### 4.2 Auth Middleware

A Next.js middleware és a Supabase Auth integrációja gondoskodik a nem védett oldalak (pl. Dashboard) elérésének korlátozásáról nem bejelentkezett felhasználók számára.

---

## 5. Legutóbbi Optimalizációk

-   **Responsivity:** A táblázat oszlopszélességei precízen be lettek állítva (30% Cím, 12% Műveletek stb.), hogy hosszú szövegeknél is megmaradjon az elrendezés (`truncate` és `max-w-0` technikák).
-   **Z-index Fixek:** A dátumválasztó és kategória választó panelek mindenhol az elemek felett jelennek meg, nem vágja le őket a táblázat kerete.
-   **Admin Élmény:** Az Admin táblázatban a címek linkszerűen működnek, közvetlenül a szerkesztési oldalra visznek a gyors munkavégzés érdekében.

---

## 6. Jövőbeni Fejlesztési Irányok

Ez az alaprendszer készen áll a bővítésre a következőkkel:
1.  **Értesítések:** Automatikus e-mail visszaigazolás jelentkezéskor.
2.  **QR-kód:** Beléptető kód generálása a jelentkezőknek.
3.  **Statisztika:** Dashboard grafikonok a rendezvények népszerűségéről.
4.  **Publikus Oldal:** Egy látványosabb, SEO-barát landing page az események listázásához.

---

**Lezárva:** 2026. március 7.
**Készítette:** Antigravity AI Coding Assistant
**Téma:** Eseményvezérelt App-keretrendszer Alapkő letétel
