---
name: "wordpress-rest-api-expert"
description: "Szakértői útmutató a WordPress REST API és n8n integrációjához, CRUD műveletekhez és ACF támogatáshoz."
---

# WordPress REST API Szakértői Útmutató (SKILL)

Ez a Skill standardizált referenciát nyújt a WordPress REST API használatához, kifejezetten n8n HTTP Request csomópontokra és automatizálási folyamatokra optimalizálva.

## 1. Globális Beállítások & Hitelesítés
- **Alap URL:** `https://{{domain}}/wp-json/wp/v2`
- **Hitelesítés (n8n):** Használd a **"Predefined Credential Type"** opciót és azon belül a **"Wordpress API"**-t.
- **Manuális hitelesítés:** Basic Auth (Felhasználónév + Application Password).
- **Biztonság:** SOHA ne a sima felhasználói jelszót használd! Generálj egyet a WP-ben: *Felhasználók -> Profil -> Alkalmazásjelszavak*.
- **Fejlécek:** `Content-Type: application/json`

## 2. Végpontok és Műveletek

### 2.1 Post (Bejegyzés) Kezelés
- **Létrehozás (CREATE):** `POST /posts`
- **Frissítés (UPDATE):** `POST /posts/{{id}}`
- **Olvasás (READ):** `GET /posts`
- **Törlés (DELETE):** `DELETE /posts/{{id}}?force=true`

**Optimalizált Payload (Slug generálással):**
```json
{
  "title": "={{ $json.query.title }}",
  "slug": "={{ $json.query.title.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 200) }}",
  "status": "publish",
  "content": "HTML tartalom",
  "acf": {
    "mezo_kulcs": "érték"
  }
}
```

### 2.2 ACF (Advanced Custom Fields)
**Kritikus:** Az ACF mezőcsoportnál a "Show in REST API" legyen bekapcsolva!
- Az adatok küldése MINDIG a `acf` objektumban történjen.
- **Dátumok:** Az ACF MySQL-kompatibilis formátumot vár (pl. `YYYY-MM-DD HH:mm:ss`), ügyelj a konverzióra!

### 2.3 Média feltöltés (Complex Workflow)
1. **Lépés (Upload):** `POST /media`
   - Header: `Content-Disposition: attachment; filename='kep.jpg'`
   - Header: `Content-Type: image/jpeg`
   - Body: Bináris adat küldése.
2. **Lépés (Link):** A kapott `{{id}}`-t használd a post `featured_media` mezőjében.

## 3. Custom Post Types (CPT)
Egyedi tartalomtípusoknál (pl. `esemenyek`) az URL kiegészül:
- **Példa:** `https://{{domain}}/wp-json/wp/v2/esemenyek`
- **Fontos:** A CPT regisztrációnál a `show_in_rest` paraméternek `true`-nak kell lennie.

## 4. n8n Specifikus Tippek & Szintaxis
- **Kifejezések:** Modern n8n verziókban használd az `={{ $json... }}` szintaxist a régi `{{ ... }}` helyett.
- **HTTP Request:** "Send Body" -> True, "Specify Body" -> "JSON".
- **Hibaellenőrzés:** Állítsd be az `onError: continueRegularOutput` opciót, hogy a 4xx/5xx hibákat is tudd kezelni egy rákövetkező IF node-dal.
- **ID Tárolás:** A visszakapott WP ID-t érdemes azonnal elmenteni a forrás adatbázisba (pl. Supabase) a későbbi frissítésekhez.

## 5. Hibakezelés (Status Codes)
- **400:** Bad Request (hibás mezőnév vagy típus).
- **401/403:** Hitelesítési hiba vagy hiányzó jogosultság.
- **404:** A megadott végpont vagy ID nem létezik.

## 7. Automation Blueprint (for AI/MCP)

Amikor az AI-t arra kéred, hogy hozzon létre egy WP szinkron csomópontot, használja az alábbi fix értékeket:

- **Referencia Workflow:** `c:\Users\krayg\OneDrive\Dokumentumok\AI\Antigravity\Next-Supabase-teszt\my-event-app\docs\n8n_prompt_gyujtemeny.md`
- **Credential ID:** `i2Cx3GUeuf5p0cba`
- **Base Domain:** `https://test.rezgesekhaza.hu/wp68/`
- **Node Type:** `n8n-nodes-base.httpRequest` (v4.3+)
- **Slug Logika:** `={{ $json.query.title.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 200) }}`
- **Hibaellenőrzés:** `onError: continueRegularOutput` (Mindig legyen bekapcsolva).

