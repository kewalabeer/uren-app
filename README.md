# Uren

Kleine PWA om uren bij te houden per opdrachtgever/project, als vervanging van het whiteboard-fotoritueel. Geen build-stap: platte HTML/CSS/JS met native ES modules. Alle data (opdrachtgevers, projecten, uren) staat lokaal in IndexedDB op je telefoon — er is geen server en geen account.

## Lokaal draaien

Vanuit deze map, start een simpele statische server (nodig omdat service workers geen `file://` ondersteunen):

```
npx serve .
```

Open de getoonde URL in Chrome (desktop of Android).

## Deployen naar GitHub Pages

1. Init een git-repo in deze map en push naar GitHub (publieke repo op een gratis account).
2. Zet in de repo-instellingen "Pages" aan, bron: branch `main`, map `/ (root)`.
3. Open de Pages-URL op je Android-telefoon in Chrome → menu → "Toevoegen aan startscherm" om de PWA te installeren.

De site bevat alleen app-code (HTML/CSS/JS) en is dus publiek benaderbaar via de URL — er staat nooit urendata op de server, die blijft in IndexedDB op je toestel.

## Gebruik

- **Header**: logo links van de titel, en rechtsboven het totaal aantal gelogde uren **deze week** (maandag t/m zondag), over alle opdrachtgevers/projecten heen.
- **Hoofdoverzicht**: opdrachtgevers, ingeklapt met de uren van **vandaag** als subtitel; uitgeklapt toont dezelfde subtitel het totaal **deze maand** in plaats daarvan. Uitklappen laat de projecten zien met uren en (indien van toepassing) een voortgangsbalk t.o.v. het vaste aantal uren. Elk project heeft drie snelknoppen:
  - **+** : direct handmatig uren toevoegen voor dát project (uren + minuten), zonder eerst een project te hoeven kiezen.
  - **▶ / ■** : timer direct starten/stoppen voor dát project. Er kan maar één timer tegelijk lopen — starten van een andere stopt de vorige automatisch. Een lopende timer staat ook altijd zichtbaar bovenaan (sticky balkje) met een eigen Stop-knop. Loopt een timer langer dan 4 uur, dan vraagt de app bij het stoppen om de duur te bevestigen (en zo nodig aan te passen) voordat 'm als regel wordt opgeslagen — vangt "timer vergeten te stoppen" op.
  - **⋯** : project afronden/archiveren. Vraagt om bevestiging; het project verdwijnt daarna uit het overzicht en telt niet meer mee bij een import (de gelogde uren blijven gewoon bewaard en tellen mee in exports).
- **Projectnaam aantikken**: opent een lijst met alle gelogde regels voor dat project, elk met een wijzig- (✎) en verwijderknop (🗑) — zo corrigeer je een verkeerd ingevoerde of per ongeluk te lang doorgelopen timer-regel achteraf.
- **+ knop (zwevend, rechtsonder)**: hetzelfde uren loggen, maar met een schuifknop Timer/Handmatig en een project-kiezer — handig voor een project dat niet in de "recent gebruikt"-lijst staat.
- **+ nieuw project** (onder elke opdrachtgever, of via de lege-staat-knop): projectnaam, optioneel vast aantal uren, en zo nodig een nieuwe opdrachtgever inline.
- **Exporteren-tab**: laat niet-geëxporteerde regels zien; "Exporteer" bouwt een JSON-bestand van alleen die nieuwe regels en opent het deelmenu van je telefoon. Kies daar **Google Drive** om het bestand op te slaan in de map die gekoppeld is aan je Claude-project — Claude leest het bestand vandaar in plaats van de whiteboard-foto en werkt de Excel-sheet bij.
- Kwam een export niet aan? Gebruik "Her-exporteer laatste 30 dagen" als herstel-optie.
- **Importeren** (onderaan de Exporteren-tab): eenmalig een JSON-bestand met opdrachtgevers en projecten inladen, bijv. vanuit een bestaand Excel-overzicht. Bestaande namen (op opdrachtgever + project) worden overgeslagen, dus opnieuw importeren is veilig. Bestandsformaat:
  ```json
  { "clients": [ { "name": "Opdrachtgever", "projects": ["Project A", "Project B"] } ] }
  ```

## Huisstijl

Kleuren, logo en fonts volgen de Bureau Spruit huisstijlgids: primary/accent `#E6A420` (oker), teal `#2F6E73`, light `#A7D8E4`, tekst `#2B2B2B`, achtergrond wit. Koppen in Montserrat (bold), subkoppen in Poppins (semi-bold), lopende tekst in Lato — zelf gehost als `.woff2` in `fonts/` zodat de app ook offline correct rendert. Het app-icoon (`icons/`) is de "SPR/UIT"-beeldmerk uit het logopakket, herkleurd naar oker-op-teal.
