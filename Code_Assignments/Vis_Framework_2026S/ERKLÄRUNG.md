# Wieso das Ganze? Wie geht das?

## Was muss ich tun?

Die Aufgabe ist: Ein Programm schreiben, das 3D Volumedaten sichtbar macht.

Volumedaten = Millionen von Voxeln (3D Pixel) mit unterschiedlichen Werten (z.B. Helligkeit).

Das sieht so aus: Kopf, Lobster, oder Käfer - als Punkt-Wolke, wobei jeder Punkt eine Intensität hat.


## Wie funktioniert das Programm?

1. User lädt eine .dat Datei (z.B. head_128x128x112.dat)
2. Computer liest die Daten
3. Für jeden Pixel am Bildschirm:
   - Schießt einen Strahl von der Kamera durch die Szene
   - Der Strahl geht durch das Volume
   - Alle Voxel am Strahl werden gesammelt
   - Die Farben werden kombiniert
   - Das Ergebnis wird am Pixel angezeigt
4. Fertig = 3D Bild


## Wo arbeite ich?

Das Projekt hat diese Struktur:

```
Vis_Framework_2026S/
  index.html              (nur Namen eintragen)
  
  js/                     (hier schreibe ich JavaScript)
    visvu.js              (ÄNDERN - Main Programm)
    volumeShader.js       (NEU - Shader Einstellungen)
    transferFunction.js   (NEU - Farb-Editor)
    
  shaders/                (hier schreibe ich GPU Code)
    volume_vert.essl      (NEU - GPU vorbereitung)
    volume_frag.essl      (NEU - GPU Raycasting)
```


## Was passiert wo?

JavaScript (visvu.js):
- Volume laden
- Histogram berechnen (zeigt Verteilung der Werte)
- Transfer Function Editor starten (user setzt Farben)
- Shader im GPU starten

GPU Shaders (.essl):
- Vertex Shader: Vorbereitung der Bounding Box
- Fragment Shader: Raycasting Loop (Schleife durch Volume)


## Die Transfer Function - was ist das?

Eine Transfer Function ist eine Tabelle:
- Input: Voxel-Intensität (0 = dunkel, 1 = hell)
- Output: Farbe und Transparenz

Beispiel:
- Intensität 0.0 -> transparent (sehen wir nicht)
- Intensität 0.5 -> grau halb sichtbar
- Intensität 1.0 -> weiß und voll sichtbar

Der User kann diese Tabelle mit einem Editor anpassen.


## Wie starte ich das?

1. Terminal öffnen
2. In den Ordner gehen:
   cd c:\university\6_Semester\Visualisierung\Code_Assignments\Vis_Framework_2026S

3. Server starten:
   python -m http.server 8000

4. Browser: http://localhost:8000

5. Datei laden -> gelber Würfel (das ist der Test)

Das ist aktuell noch ein TEST. Das muss ich dann durch echtes Volume Rendering replace.


## Was muss ich programmieren?

Minimum (23 Punkte):
1. volume_frag.essl: Die Raycasting Logik
2. volume_vert.essl: GPU Vorbereitung
3. volumeShader.js: Verbindung zwischen JavaScript und GPU
4. visvu.js ändern: Histogram berechnen
5. Histogram visualisieren mit d3.js

Bonus (weitere 23 Punkte):
1. Transfer Function Editor (Benutzer klickt und setzt Farben)
2. First-Hit Compositing (nur die erste Farbe nehmen)
3. Gradient und Shading (bessere Visualisierung)
4. Interaktive UI


## Praktischer Ablauf pro Sitzung

1. Server läuft: python -m http.server 8000
2. Ich ändere eine Datei (z.B. volume_frag.essl)
3. Browser Refresh (Ctrl+Shift+R - wichtig!)
4. Schaue ob es funktioniert
5. In Browser DevTools Console (Ctrl+Shift+I) auf Fehler prüfen
6. Wiederhole von Punkt 2


## Die Punkte erklärt

Wenn ich alles mache, bekomme ich 46 Punkte.

Die 14 Punkte für Raycasting sind die Schwierigkeit - da muss ich verstehen wie Raycasting im GPU Code funktioniert.

Die anderen Sachen sind eher sauberer Code und UI.
