// Speaks a line with a voice and prints the caption timing: npx tsx --env-file=.env.local scripts/speech-test.mts <voiceKey> "<line>" [niqqud]
import { speak, type VoiceKey } from "../src/lib/video/audio";
import { prepareSpeech } from "../src/lib/video/speech";

const [voice, line, niq] = process.argv.slice(2);
const spoken = niq ? (await prepareSpeech([line]))[0] : line;
console.log("spoken:", spoken);
const r = await speak(spoken, line, voice as VoiceKey, `lab/${Date.now()}-${voice}.mp3`);
console.log(r.url, r.seconds.toFixed(2));
console.log(r.words.map((w) => `${w.text}@${w.start.toFixed(2)}`).join(" "));
