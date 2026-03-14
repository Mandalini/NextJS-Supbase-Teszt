# n8n + WordPress Automatizációs Prompt Gyűjtemény

Ez a fájl tartalmazza azokat a bevált parancsokat (promptokat), amikkel az AI-t (Antigravity-t) utasíthatod új munkafolyamatok vagy csomópontok létrehozására.

## 🚀 Gyors Parancsok (Csak másold ki és illeszd be a chatbe)

### 1. Új Esemény Szinkronizálása
> "Hozz létre egy n8n node-ot az 'MCP oldal teszt' workflow-ba, ami a Supabase 'events' táblájából szinkronizálja az eseményeket a WP-be a 'wordpress-rest-api-expert' skill alapján."

### 2. Szervező Adatlap Létrehozása
> "Készíts egy új n8n munkafolyamatot, ami a Supabase 'profiles' táblájából létrehozza a szervezők adatlapját a WordPress-ben ACF mezőkkel."

### 3. Média (Kép) Feltöltése
> "Egészítsd ki a WP szinkronizációt egy képfeltöltő modullal, ami az esemény borítóképét is beállítja a WordPress-ben."

### 4. Állapot Ellenőrzés (Health Check)
> "Hozz létre egy n8n workflow-t, ami 10 percenként ellenőrzi a 'https://gongakademia.hu' elérhetőségét, és Down állapot esetén küldjön értesítést."

---

## 🛠️ Mit csinál az AI, ha ezeket a parancsokat használod?

A háttérben az AI a `.agent/skills/wordpress-rest-api-expert/SKILL.md` fájlban tárolt technikai adatokat használja:
- **Credential ID:** `i2Cx3GUeuf5p0cba`
- **Domain:** `test.rezgesekhaza.hu`
- **Logika:** Automatikus ékezetmentesítés (Slug), ACF mezők kezelése, és hibaellenőrzés.

## 💡 Tipp
Ha egy teljesen új típusú szinkronizációt szeretnél, csak mondd:
*"Mentsd el ezt a promptot is a prompt gyűjteménybe!"* – és én frissítem ezt a listát.
