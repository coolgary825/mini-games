// 게임보이처럼 네모파(사각파)·삼각파·잡음으로 만드는 8비트 소리. 음악은 모두 새로 지은 곡이에요.
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * 2 ** ((NOTE[m[1]] + (m[2] - 4) * 12 - 9) / 12) : 0; };
// "E5:2 G5:2 R:4" → [[주파수, 16분음표 칸 수], ...]
const parse = s => s.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return [n === 'R' ? 0 : freq(n), +d || 1]; });
const drum = s => s.trim().split(/\s+/).map(t => { const [n, d] = t.split(':'); return [n, +d || 1]; });

const TRACKS = {
  title: { bpm: 132, lead: 'C5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2 F5:2 A5:2 C6:4 A5:2 G5:4 E5:2 F5:2 G5:2 A5:2 G5:2 E5:2 C5:2 D5:2 E5:4 D5:4 C5:8 R:8',
    bass: 'C3:4 G3:4 C3:4 G3:4 F3:4 C4:4 F3:4 C4:4 C3:4 G3:4 A2:4 E3:4 G2:4 D3:4 C3:8', drums: 'k:4 h:4 s:4 h:4' },
  park: { bpm: 150, lead: 'E5:2 G5:2 C6:2 G5:2 A5:4 G5:4 E5:2 D5:2 C5:2 D5:2 E5:4 R:4 F5:2 A5:2 C6:2 A5:2 B5:4 A5:4 G5:2 F5:2 E5:2 D5:2 C5:4 R:4 E5:2 E5:2 G5:2 E5:2 D5:2 C5:2 D5:4 G4:2 A4:2 C5:2 E5:2 D5:4 R:4 F5:2 E5:2 D5:2 C5:2 A4:2 C5:2 D5:4 E5:2 D5:2 C5:2 B4:2 C5:4 R:4',
    bass: 'C3:4 G3:4 C3:4 G3:4 C3:4 G3:4 C3:4 G3:4 F3:4 C4:4 F3:4 C4:4 G3:4 D4:4 C3:4 R:4 C3:4 E3:4 G3:4 E3:4 D3:4 A3:4 G3:4 R:4 F3:4 A3:4 D3:4 F3:4 G3:4 B3:4 C3:4 R:4', drums: 'k:4 h:2 h:2 s:4 h:4' },
  park2: { bpm: 160, lead: 'G5:2 R:2 G5:2 A5:2 G5:2 E5:2 C5:4 D5:2 E5:2 F5:2 E5:2 D5:4 R:4 G5:2 R:2 G5:2 A5:2 C6:2 A5:2 G5:4 F5:2 E5:2 D5:2 E5:2 C5:4 R:4',
    bass: 'C3:2 C3:2 G3:2 C3:2 C3:2 C3:2 G3:2 C3:2 G2:2 G2:2 D3:2 G2:2 G2:2 G2:2 B2:2 D3:2 A2:2 A2:2 E3:2 A2:2 F2:2 F2:2 C3:2 F2:2 G2:2 G2:2 D3:2 G2:2 C3:4 R:4', drums: 'k:2 h:2 s:2 h:2' },
  sewer: { bpm: 120, lead: 'C5:2 R:2 D#5:2 R:2 F5:2 R:2 F#5:2 G5:2 R:4 A#4:2 R:2 C5:8 R:8 C5:2 R:2 D#5:2 R:2 F5:2 R:2 G5:2 A#5:2 R:4 G5:2 R:2 F5:8 R:8',
    bass: 'C3:2 C4:2 C3:2 C4:2 A#2:2 A#3:2 A#2:2 A#3:2 G#2:2 G#3:2 G#2:2 G#3:2 G2:2 G3:2 G2:2 G3:2 C3:2 C4:2 C3:2 C4:2 A#2:2 A#3:2 A#2:2 A#3:2 G#2:2 G#3:2 G2:2 G3:2 C3:8', drums: 'k:4 h:4' },
  roof: { bpm: 140, lead: 'A4:2 C5:2 E5:2 A5:4 G5:2 E5:2 D5:2 E5:4 C5:2 D5:4 R:4 F5:2 E5:2 D5:2 C5:4 D5:2 E5:2 B4:4 G4:2 A4:4 R:4 A4:2 C5:2 E5:2 A5:4 B5:2 C6:2 B5:2 A5:4 G5:2 E5:4 R:4 F5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:2 B4:2 A4:8 R:8',
    bass: 'A2:4 E3:4 A2:4 E3:4 F2:4 C3:4 G2:4 D3:4 A2:4 E3:4 D3:4 A3:4 E2:4 B2:4 A2:4 R:4 A2:4 E3:4 A2:4 E3:4 F2:4 C3:4 C3:4 G3:4 D3:4 A3:4 E3:4 B3:4 A2:8 R:8', drums: 'k:4 h:2 k:2 s:4 h:4' },
  roof2: { bpm: 168, lead: 'E5:2 E5:2 R:2 E5:2 R:2 C5:2 E5:4 G5:4 R:4 G4:4 R:4 C5:4 G4:2 R:2 E4:4 A4:2 B4:2 A#4:2 A4:4 G4:2 E5:2 G5:2 A5:4 F5:2 G5:2 R:2 E5:2 C5:2 D5:2 B4:4',
    bass: 'C3:2 C3:2 R:2 C3:2 R:2 C3:2 C3:4 G3:4 R:4 G2:4 R:4 C3:4 G2:2 R:2 E2:4 A2:2 B2:2 A#2:2 A2:4 G2:2 E3:2 G3:2 A3:4 F3:2 G3:2 R:2 E3:2 C3:2 D3:2 B2:4', drums: 'k:2 h:2 s:2 h:2' },
  sky: { bpm: 126, lead: 'G5:4 E5:2 C5:2 D5:4 G4:4 C5:2 E5:2 G5:2 C6:2 B5:4 A5:4 G5:4 E5:2 C5:2 D5:4 B4:4 C5:8 R:8 E5:4 F5:2 G5:2 A5:4 G5:4 F5:2 E5:2 D5:2 C5:2 D5:8 E5:4 D5:2 C5:2 B4:4 D5:4 C5:8 R:8',
    bass: 'C3:8 G2:8 C3:8 G2:8 A2:8 G2:8 C3:8 R:8 F2:8 C3:8 G2:8 G2:8 E2:8 G2:8 C3:8 R:8', drums: 'h:4 h:4 s:4 h:4' },
  sky2: { bpm: 144, lead: 'C6:2 G5:2 E5:2 G5:2 A5:2 G5:2 E5:2 C5:2 D5:2 E5:2 F5:2 G5:2 A5:4 G5:4 C6:2 G5:2 E5:2 G5:2 A5:2 B5:2 C6:2 D6:2 E6:2 D6:2 C6:2 B5:2 C6:8',
    bass: 'C3:4 E3:4 F3:4 E3:4 D3:4 F3:4 G3:4 G2:4 C3:4 E3:4 F3:4 G3:4 C3:4 G2:4 C3:8', drums: 'k:4 h:4 s:4 h:2 h:2' },
  factory: { bpm: 136, lead: 'D5:2 D5:2 A4:2 D5:2 F5:2 E5:2 D5:2 C5:2 A#4:2 A#4:2 F4:2 A#4:2 D5:2 C5:2 A#4:2 A4:2 G4:2 A4:2 A#4:2 C5:2 D5:2 E5:2 F5:2 G5:2 A5:4 G5:4 F5:4 E5:4',
    bass: 'D3:2 D3:2 A2:2 D3:2 D3:2 D3:2 A2:2 D3:2 A#2:2 A#2:2 F2:2 A#2:2 A#2:2 A#2:2 F2:2 A#2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 A2:4 A2:4 A2:4 A2:4', drums: 'k:2 h:2 s:2 k:2 k:2 h:2 s:2 h:2' },
  castle: { bpm: 120, lead: 'D5:4 F5:4 G#5:4 A5:4 G#5:2 F5:2 D5:4 C#5:4 R:4 D5:4 F5:4 G#5:4 A5:4 C6:2 A5:2 G#5:4 A5:4 R:4',
    bass: 'D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 C#2:2 C#3:2 C#2:2 C#3:2 A1:2 A2:2 A1:2 A2:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 F2:2 F3:2 E2:2 E3:2 A1:2 A2:2 A1:2 A2:2', drums: 'k:4 h:4 k:4 s:4' },
  boss: { bpm: 176, lead: 'E5:2 E5:2 D#5:2 E5:2 G5:2 E5:2 B4:2 E5:2 C5:2 C5:2 B4:2 C5:2 E5:2 C5:2 A4:2 C5:2 D5:2 D5:2 C#5:2 D5:2 F#5:2 D5:2 A4:2 D5:2 B4:2 D#5:2 F#5:2 A5:2 G5:2 F#5:2 E5:4',
    bass: 'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 B1:2 B2:2 B1:2 B2:2 B1:2 B2:2 E2:4', drums: 'k:2 h:2 s:2 h:2' },
  star: { bpm: 190, lead: 'C5:2 C5:2 C5:2 R:1 D5:1 C5:2 C5:2 C5:2 R:2 D5:2 D5:2 D5:2 R:1 E5:1 D5:2 D5:2 D5:2 R:2',
    bass: 'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 D3:2 A3:2 D3:2 A3:2 D3:2 A3:2 D3:2 A3:2', drums: 'k:2 h:2 s:2 h:2' },
  volcano: { bpm: 150, lead: 'A4:2 A4:2 C5:2 A4:2 D5:2 C5:2 A4:2 G4:2 A4:2 A4:2 C5:2 E5:2 D5:4 C5:4 F5:2 F5:2 E5:2 D5:2 E5:2 D5:2 C5:2 B4:2 C5:2 B4:2 A4:2 G#4:2 A4:8',
    bass: 'A2:2 A2:2 E3:2 A2:2 A2:2 A2:2 E3:2 A2:2 A2:2 A2:2 E3:2 A2:2 D3:4 C3:4 F2:2 F2:2 C3:2 F2:2 G2:2 G2:2 D3:2 G2:2 E2:2 E2:2 B2:2 E2:2 A2:8', drums: 'k:2 h:2 s:2 h:2' },
  volcano2: { bpm: 132, lead: 'E5:4 D#5:2 E5:2 B4:4 R:4 C5:4 B4:2 C5:2 G4:4 R:4 A4:2 C5:2 E5:2 A5:2 G#5:4 E5:4 F5:2 E5:2 D#5:2 E5:2 B4:8',
    bass: 'E2:4 E3:4 E2:4 E3:4 C2:4 C3:4 C2:4 C3:4 A1:4 A2:4 E2:4 E3:4 D2:4 D3:4 E2:8', drums: 'k:4 h:4 k:2 k:2 s:4' },
  dragon: { bpm: 144, lead: 'D5:2 F#5:2 A5:4 G5:2 F#5:2 E5:4 D5:2 E5:2 F#5:2 G5:2 A5:8 B5:2 A5:2 G5:4 F#5:2 E5:2 D5:4 E5:2 F#5:2 G5:2 E5:2 D5:8',
    bass: 'D3:4 A2:4 D3:4 A2:4 G2:4 D3:4 A2:4 A2:4 G2:4 D3:4 D3:4 A2:4 E2:4 A2:4 D3:8', drums: 'k:4 h:2 h:2 s:4 h:4' },
  dragonBoss: { bpm: 184, lead: 'D5:2 D5:2 F5:2 D5:2 G#5:2 G5:2 F5:2 D5:2 C#5:2 C#5:2 E5:2 C#5:2 A5:2 G#5:2 G5:2 E5:2 D5:2 F5:2 A5:2 D6:2 C#6:2 A5:2 F5:2 E5:2 D5:4 A4:4 D5:8',
    bass: 'D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 A#1:2 A#2:2 A#1:2 A#2:2 A1:2 A2:2 A1:2 A2:2 D2:4 A1:4 D2:8', drums: 'k:2 h:2 s:2 k:2' },
  // 4부: 사탕 나라·정글·유령의 집·우주와 아포가토
  candy: { bpm: 144, lead: 'G5:2 E5:2 C6:2 E5:2 G5:2 E5:2 D5:4 F5:2 D5:2 B5:2 D5:2 F5:2 D5:2 C5:4 E5:2 G5:2 C6:2 D6:2 E6:4 D6:2 C6:2 A5:2 B5:2 C6:2 G5:2 E5:4 C5:4',
    bass: 'C3:4 G2:4 C3:4 G2:4 G2:4 D3:4 G2:4 C3:4 A2:4 E2:4 F2:4 G2:4 C3:8', drums: 'k:4 h:2 h:2 s:4 h:2 h:2' },
  candy2: { bpm: 128, lead: 'E5:2 G5:2 A5:4 G5:2 E5:2 C5:4 D5:2 E5:2 G5:4 E5:4 R:4 A5:2 C6:2 D6:4 C6:2 A5:2 G5:4 E5:2 D5:2 C5:8',
    bass: 'C3:8 A2:8 F2:8 G2:8 A2:8 F2:8 G2:8 C3:8', drums: 'h:4 h:4 s:4 h:4' },
  jungle: { bpm: 150, lead: 'A4:2 C5:2 D5:2 E5:2 G5:4 E5:2 D5:2 E5:4 A4:4 R:4 C5:2 D5:2 E5:2 G5:2 A5:4 G5:2 E5:2 D5:2 C5:2 A4:8',
    bass: 'A2:2 A2:2 E3:2 A2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 A2:4 R:4 F2:2 F2:2 C3:2 F2:2 G2:2 G2:2 D3:2 G2:2 A2:8', drums: 'k:2 k:2 s:2 h:2 k:2 h:2 s:2 s:2' },
  jungle2: { bpm: 138, lead: 'D5:2 F5:2 G5:2 A5:2 C6:4 A5:2 G5:2 F5:4 D5:4 R:4 C5:2 D5:2 F5:2 G5:2 A5:4 G5:2 F5:2 D5:8',
    bass: 'D2:4 A2:4 D2:4 A2:4 A#1:4 F2:4 C2:4 G2:4 D2:4 A2:4 D2:8', drums: 'k:4 s:2 k:2 k:4 s:4' },
  ghost: { bpm: 108, lead: 'E5:4 G5:2 F#5:2 E5:4 B4:4 C5:4 D#5:2 E5:2 B4:8 R:4 A4:2 C5:2 E5:4 D#5:4 E5:2 F#5:2 G5:4 F#5:2 D#5:2 E5:8',
    bass: 'E2:8 E2:8 A1:8 B1:8 C2:8 A1:8 B1:8 E2:8', drums: 'k:8 h:8' },
  ghost2: { bpm: 120, lead: 'B4:2 R:2 B4:2 C5:2 B4:2 R:2 G4:2 A#4:2 B4:4 R:4 E5:2 D#5:2 E5:2 G5:2 F#5:4 D#5:4 E5:8 R:8',
    bass: 'E2:4 B1:4 E2:4 B1:4 C2:4 G1:4 B1:8 E2:4 B1:4 C2:4 B1:4 E2:8', drums: 'k:4 h:4 s:4 h:4' },
  space: { bpm: 116, lead: 'C5:4 G5:4 E5:2 D5:2 C5:4 D5:4 A5:4 F5:2 E5:2 D5:4 E5:4 B5:4 G5:2 F5:2 E5:4 F5:2 E5:2 D5:2 B4:2 C5:8',
    bass: 'C3:8 G2:8 D3:8 A2:8 E3:8 B2:8 F2:8 G2:4 C3:4', drums: 'h:4 h:4 h:4 s:4' },
  space2: { bpm: 140, lead: 'E5:2 B5:2 G5:2 E5:2 F#5:2 A5:2 D6:4 C6:2 B5:2 A5:2 G5:2 F#5:4 E5:4 G5:2 B5:2 E6:4 D6:2 B5:2 G5:2 A5:2 B5:8',
    bass: 'E2:4 E3:4 D2:4 D3:4 C2:4 C3:4 B1:4 B2:4 E2:4 E3:4 D2:4 D3:4 B1:8', drums: 'k:2 h:2 s:2 h:2' },
  ufoBoss: { bpm: 196, lead: 'C5:2 D#5:2 G5:2 C6:2 B5:2 G5:2 D#5:2 D5:2 C5:2 D#5:2 G#5:2 C6:2 A#5:2 G#5:2 G5:2 F5:2 D#5:2 G5:2 A#5:2 D#6:2 D6:2 A#5:2 G5:2 F5:2 G5:4 D5:4 C5:8',
    bass: 'C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2 D#2:2 D#3:2 D#2:2 D#3:2 A#1:2 A#2:2 A#1:2 A#2:2 G1:4 G1:4 C2:8', drums: 'k:2 h:2 s:2 k:2 k:2 h:2 s:2 h:2' },
  // 3부: 사막·바닷가·얼음 나라와 더 센 보스들
  desert: { bpm: 138, lead: 'D5:2 E5:2 F5:2 G#5:2 A5:4 G#5:2 F5:2 E5:4 D5:2 E5:2 F5:4 E5:4 D5:2 C#5:2 D5:2 E5:2 F5:2 G#5:2 A5:2 B5:2 C6:4 B5:2 A5:2 G#5:4 F5:2 E5:2 D5:8',
    bass: 'D3:4 A2:4 D3:4 A2:4 A#2:4 F2:4 A2:4 E2:4 D3:4 A2:4 D3:4 A2:4 A#2:4 A2:4 D3:8', drums: 'k:4 h:2 k:2 s:4 h:4' },
  desert2: { bpm: 150, lead: 'A4:2 C#5:2 D5:2 E5:2 F5:2 E5:2 D5:2 C#5:2 D5:4 A4:4 R:4 F5:2 G#5:2 A5:4 G#5:2 F5:2 E5:2 D5:2 C#5:2 D5:2 E5:8',
    bass: 'D2:2 D3:2 D2:2 D3:2 A1:2 A2:2 A1:2 A2:2 D2:2 D3:2 D2:2 D3:2 A#1:2 A#2:2 A1:2 A2:2 D2:8', drums: 'k:2 h:2 s:2 h:2' },
  tomb: { bpm: 112, lead: 'E5:4 R:2 F5:2 E5:2 R:2 D#5:2 E5:2 B4:4 R:4 C5:2 B4:2 A4:2 G#4:2 A4:4 R:4 E5:4 R:2 G5:2 F5:2 E5:2 D#5:2 E5:2 B4:8 R:8',
    bass: 'E2:4 R:4 E2:4 R:4 A1:4 R:4 A1:4 R:4 E2:4 R:4 E2:4 R:4 B1:4 R:4 E2:8', drums: 'k:8 h:4 h:4' },
  beach: { bpm: 140, lead: 'C5:2 E5:2 G5:2 A5:2 G5:4 E5:2 C5:2 D5:2 F5:2 A5:2 G5:4 R:4 E5:2 G5:2 C6:2 B5:2 A5:2 G5:2 E5:2 G5:2 F5:2 E5:2 D5:2 E5:2 C5:8',
    bass: 'C3:4 G2:4 C3:4 G2:4 F2:4 C3:4 G2:4 D3:4 C3:4 G2:4 A2:4 E2:4 F2:4 G2:4 C3:8', drums: 'k:4 h:2 h:2 s:4 h:2 h:2' },
  beach2: { bpm: 126, lead: 'A4:2 E5:2 A5:4 G5:2 E5:2 D5:4 C5:2 D5:2 E5:4 A4:4 R:4 G4:2 B4:2 D5:2 G5:4 F#5:2 E5:2 D5:2 B4:2 A4:8',
    bass: 'A2:4 E2:4 A2:4 E2:4 F2:4 C3:4 G2:4 D2:4 A2:4 E2:4 A2:8', drums: 'k:4 h:4 s:4 h:4' },
  ice: { bpm: 120, lead: 'E6:2 B5:2 G5:2 E5:2 F#5:4 B5:4 E6:2 D6:2 B5:2 A5:2 G5:4 R:4 D6:2 A5:2 F#5:2 D5:2 E5:4 A5:4 C6:2 B5:2 A5:2 F#5:2 E5:8',
    bass: 'E3:8 D3:8 C3:8 B2:8 A2:8 D3:8 E3:8 B2:8', drums: 'h:4 h:4 k:4 h:4' },
  ice2: { bpm: 136, lead: 'B4:2 E5:2 G5:2 B5:2 A5:2 G5:2 F#5:2 E5:2 D#5:4 F#5:4 B4:4 R:4 C5:2 E5:2 G5:2 C6:2 B5:2 A5:2 G5:2 F#5:2 E5:8',
    bass: 'E2:4 B2:4 E2:4 B2:4 B1:4 F#2:4 B1:4 F#2:4 C2:4 G2:4 C2:4 G2:4 B1:4 B2:4 E2:8', drums: 'k:4 h:2 h:2 s:4 h:4' },
  bigBoss: { bpm: 180, lead: 'A4:2 A4:2 C5:2 A4:2 D#5:2 D5:2 C5:2 A4:2 G4:2 G4:2 A#4:2 G4:2 D5:2 C#5:2 C5:2 A#4:2 A4:2 C5:2 E5:2 A5:2 G#5:2 E5:2 C5:2 B4:2 A4:4 E4:4 A4:8',
    bass: 'A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 G1:2 G2:2 G1:2 G2:2 G1:2 G2:2 G1:2 G2:2 F1:2 F2:2 F1:2 F2:2 E1:2 E2:2 E1:2 E2:2 A1:4 E1:4 A1:8', drums: 'k:2 h:2 s:2 k:2' },
  finalBoss: { bpm: 192, lead: 'E5:2 G5:2 B5:2 E6:2 D#6:2 B5:2 G5:2 F#5:2 E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 B5:2 A5:2 F#5:2 A5:2 C6:2 D#6:2 E6:2 D#6:2 C6:2 A5:2 B5:4 F#5:4 E5:8',
    bass: 'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 A1:2 A2:2 A1:2 A2:2 B1:2 B2:2 B1:2 B2:2 E2:4 B1:4 E2:8', drums: 'k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2' },
  ending: { bpm: 112, lead: 'G4:4 C5:4 E5:4 G5:6 E5:2 F5:4 A5:4 G5:8 E5:4 C5:4 D5:4 E5:6 D5:2 C5:12 R:4 A4:4 C5:4 F5:4 A5:6 G5:2 F5:4 E5:4 D5:8 E5:4 G5:4 C6:4 B5:4 C6:12 R:4',
    bass: 'C3:8 E3:8 F3:8 C3:8 A2:8 G2:8 C3:8 G2:8 F2:8 A2:8 D3:8 G2:8 C3:8 G2:8 C3:16', drums: 'h:4 h:4 h:4 h:4' },
};
const JINGLES = {
  clear: { bpm: 180, lead: 'G4:2 C5:2 E5:2 G5:2 C6:2 E6:2 G6:6 E6:6 G#4:2 C5:2 D#5:2 G#5:2 C6:2 D#6:2 G#6:6 D#6:6 A#4:2 D5:2 F5:2 A#5:2 D6:2 F6:2 A#6:6 A#6:2 A#6:2 A#6:2 C7:12', bass: 'C3:18 G#2:18 A#2:18 C3:12' },
  die: { bpm: 150, lead: 'B4:2 F5:4 F5:2 F5:3 E5:3 D5:3 C5:2 E4:2 E4:2 C4:6', bass: 'G2:6 G2:3 G2:3 G2:3 C2:9' },
  gameover: { bpm: 110, lead: 'C5:4 G4:4 E4:4 A4:3 B4:3 A4:3 G#4:3 A#4:3 G#4:3 G4:2 F4:2 G4:8', bass: 'C3:12 F2:9 E2:9 C2:12' },
  course: { bpm: 170, lead: 'C5:2 D5:2 E5:2 G5:2 E5:2 G5:2 C6:8', bass: 'C3:6 G2:6 C3:8' },
};

export class Chip {
  constructor() { this.ctx = null; this.muted = false; this.track = null; this.timer = null; this.noiseBuf = null; }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (!this.master) {
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : .5; this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .55; this.musicBus.connect(this.master);
        const len = this.ctx.sampleRate * .5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      }
    } catch { this.ctx = null; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : .5; }
  tone(f, t, dur, { type = 'square', vol = .12, slide = 0, bus = this.master, duty } = {}) {
    if (!this.ctx || !f) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    if (duty && type === 'square') o.setPeriodicWave(this.pulse(duty)); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .02);
  }
  pulse(duty) {
    this.waves ??= {};
    if (!this.waves[duty]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
      this.waves[duty] = this.ctx.createPeriodicWave(re, im);
    }
    return this.waves[duty];
  }
  noise(t, dur, vol = .1, bus = this.master, hp = 1000) {
    if (!this.ctx || !this.noiseBuf) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + .02);
  }

  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + .005, T = (f, d, o) => this.tone(f, t + (o?.at || 0), d, o);
    switch (name) {
      case 'jump': T(300, .14, { slide: 2.6, vol: .08, duty: .25 }); break;
      case 'jumpBig': T(220, .16, { slide: 2.4, vol: .08, duty: .25 }); break;
      case 'bone': T(988, .05, { vol: .07 }); T(1319, .18, { vol: .07, at: .05 }); break;
      case 'stomp': T(420, .09, { slide: .4, vol: .1 }); T(620, .07, { at: .06, vol: .07 }); break;
      case 'kick': T(200, .06, { vol: .1 }); this.noise(t, .06, .06); break;
      case 'bump': T(130, .08, { vol: .12, type: 'triangle' }); break;
      case 'break': this.noise(t, .25, .14, this.master, 400); T(150, .12, { slide: .4, vol: .08 }); break;
      case 'item': [392, 523, 659, 784, 1047].forEach((f, i) => T(f, .06, { at: i * .045, vol: .06, duty: .125 })); break;
      case 'power': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, .06, { at: i * .05, vol: .07 })); break;
      case 'oneup': [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => T(f, .08, { at: i * .08, vol: .07 })); break;
      case 'hurt': T(600, .3, { slide: .25, vol: .1 }); break;
      case 'die': break;
      case 'bark': T(170, .06, { vol: .16, duty: .5 }); T(140, .1, { at: .05, slide: .7, vol: .14, duty: .5 }); this.noise(t, .08, .05, this.master, 2000); T(180, .05, { at: .2, vol: .13, duty: .5 }); T(150, .09, { at: .24, slide: .7, vol: .12, duty: .5 }); break;
      case 'throw': T(900, .06, { slide: .5, vol: .07, duty: .25 }); break;
      case 'check': [784, 988, 1175].forEach((f, i) => T(f, .08, { at: i * .07, vol: .07 })); this.noise(t + .2, .3, .04, this.master, 3000); break;
      case 'pole': T(300, .6, { slide: 3, vol: .08 }); break;
      case 'clear': break;
      case 'tick': T(1760, .025, { vol: .04 }); break;
      case 'hurry': [880, 880, 880].forEach((f, i) => T(f, .08, { at: i * .14, vol: .07 })); break;
      case 'spit': T(700, .08, { slide: .4, vol: .05, type: 'triangle' }); break;
      case 'bossHit': T(200, .25, { slide: .3, vol: .14 }); this.noise(t, .15, .08); break;
      case 'bossJump': T(120, .2, { slide: 1.8, vol: .08, type: 'triangle' }); break;
      case 'bossDown': [392, 330, 262, 196].forEach((f, i) => T(f, .12, { at: i * .12, vol: .1 })); break;
      case 'select': T(1047, .04, { vol: .06 }); break;
      case 'gold': [784, 988, 1175, 1568, 1319, 1568, 2093].forEach((f, i) => T(f, .07, { at: i * .055, vol: .07, duty: .25 })); break;
      case 'jump2': T(420, .12, { slide: 2.2, vol: .07, duty: .125 }); break;
      case 'dash': T(900, .18, { slide: .3, vol: .08, duty: .25 }); this.noise(t, .15, .06, this.master, 3000); T(700, .1, { at: .02, slide: 1.4, vol: .06, duty: .25 }); break;
      case 'crumble': this.noise(t, .3, .1, this.master, 300); T(90, .2, { slide: .5, vol: .08, type: 'triangle' }); break;
      case 'fire': this.noise(t, .25, .08, this.master, 800); T(300, .2, { slide: .5, vol: .05, duty: .5 }); break;
      case 'roar': T(110, .5, { slide: .6, vol: .14, duty: .5 }); this.noise(t, .5, .12, this.master, 200); T(160, .4, { at: .05, slide: .5, vol: .1, duty: .25 }); break;
      case 'heart': T(1175, .06, { vol: .06, duty: .25 }); T(1568, .1, { at: .05, slide: 1.3, vol: .06, duty: .25 }); break;
      case 'pop': [0, .06, .12].forEach((d, i) => { this.noise(t + d, .05, .08, this.master, 2500); T(700 + i * 200, .05, { at: d, vol: .05, duty: .25 }); }); break;
      case 'boing': T(260, .25, { slide: 3, vol: .08, type: 'triangle' }); T(520, .12, { at: .08, slide: .6, vol: .05, duty: .25 }); break;
      case 'meow': T(620, .12, { slide: 1.5, vol: .07, duty: .25 }); T(930, .22, { at: .12, slide: .55, vol: .07, duty: .25 }); break;
      case 'pause': [1319, 988, 1319, 988].forEach((f, i) => T(f, .05, { at: i * .06, vol: .06 })); break;
    }
  }

  // 배경 음악: 멜로디(네모파) + 베이스(삼각파) + 드럼(잡음)
  play(name, { loop = true } = {}) {
    if (this.trackName === name && loop) return;
    this.stop();
    this.trackName = name;
    const tr = TRACKS[name] || JINGLES[name];
    if (!tr || !this.ctx) return;
    const step = 60 / tr.bpm / 4, parts = [
      { notes: parse(tr.lead), fn: (f, t, d) => this.tone(f, t, d * .92, { vol: .075, duty: .5, bus: this.musicBus }) },
      { notes: parse(tr.bass), fn: (f, t, d) => this.tone(f, t, d * .9, { type: 'triangle', vol: .16, bus: this.musicBus }) },
    ];
    if (tr.drums) parts.push({ notes: drum(tr.drums), fn: (n, t) => n === 'k' ? this.tone(110, t, .08, { slide: .4, type: 'triangle', vol: .22, bus: this.musicBus }) : n === 's' ? this.noise(t, .1, .07, this.musicBus, 1500) : this.noise(t, .03, .03, this.musicBus, 6000), drums: true });
    const total = Math.max(...parts.filter(p => !p.drums).map(p => p.notes.reduce((a, n) => a + n[1], 0)));
    for (const p of parts) { p.i = 0; p.at = 0; }
    let start = this.ctx.currentTime + .06;
    const tick = () => {
      const horizon = this.ctx.currentTime + .25;
      for (const p of parts) {
        while (start + p.at * step < horizon) {
          if (p.at >= total) break;
          const [n, d] = p.notes[p.i % p.notes.length];
          p.fn(n, start + p.at * step, d * step);
          p.at += d; p.i++;
        }
      }
      if (parts.every(p => p.at >= total)) {
        if (!loop) { this.timer = null; this.trackName = null; return; }
        start += total * step; for (const p of parts) { p.at = 0; p.i = 0; }
      }
      this.timer = setTimeout(tick, 60);
    };
    tick();
  }
  jingle(name) { this.play(name, { loop: false }); }
  stop() { clearTimeout(this.timer); this.timer = null; this.trackName = null; if (this.musicBus && this.ctx) { this.musicBus.disconnect(); this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = .55; this.musicBus.connect(this.master); } }
}
