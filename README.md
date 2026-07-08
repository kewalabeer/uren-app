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

- **Hoofdoverzicht**: opdrachtgevers, uitklapbaar naar projecten met uren en (indien van toepassing) een voortgangsbalk t.o.v. het vaste aantal uren.
- **+ knop**: uren loggen, met een schuifknop boven in het invoerscherm:
  - *Timer*: kies een project om een timer te starten (loopt door, ook na herstarten van de app); een lopende timer staat altijd zichtbaar bovenaan met een Stop-knop.
  - *Handmatig*: kies een project en vul uren + minuten in.
- **+ nieuw project** (onder elke opdrachtgever, of via de lege-staat-knop): projectnaam, optioneel vast aantal uren, en zo nodig een nieuwe opdrachtgever inline.
- **Exporteren-tab**: laat niet-geëxporteerde regels zien; "Exporteer" bouwt een JSON-bestand van alleen die nieuwe regels en opent het deelmenu van je telefoon. Kies daar **Google Drive** om het bestand op te slaan in de map die gekoppeld is aan je Claude-project — Claude leest het bestand vandaar in plaats van de whiteboard-foto en werkt de Excel-sheet bij.
- Kwam een export niet aan? Gebruik "Her-exporteer laatste 30 dagen" als herstel-optie.

## Huisstijl

Kleuren, logo en fonts volgen de Bureau Spruit huisstijlgids: primary/accent `#E6A420` (oker), teal `#2F6E73`, light `#A7D8E4`, tekst `#2B2B2B`, achtergrond wit. Koppen in Montserrat (bold), subkoppen in Poppins (semi-bold), lopende tekst in Lato — zelf gehost als `.woff2` in `fonts/` zodat de app ook offline correct rendert. Het app-icoon (`icons/`) is de "SPR/UIT"-beeldmerk uit het logopakket, herkleurd naar oker-op-teal.
