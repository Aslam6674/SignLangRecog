/**
 * isl-data.js
 * ISL Sign Language reference data
 * Each entry: { id, glyph, english, hindi, category, handshape, tips }
 */

const ISL_SIGNS = [

  // ── ALPHABET A–Z ──────────────────────────────────────────
  { id:'A', glyph:'A', english:'A', hindi:'ए',      category:'alphabet', handshape:'Closed fist, thumb rests on side', tips:'Keep all fingers tight together' },
  { id:'B', glyph:'B', english:'B', hindi:'बी',     category:'alphabet', handshape:'Flat hand, fingers together, thumb tucked in', tips:'Palm faces forward, thumb folded across palm' },
  { id:'C', glyph:'C', english:'C', hindi:'सी',     category:'alphabet', handshape:'Curved open hand forming a C shape', tips:'Thumb and fingers curve toward each other' },
  { id:'D', glyph:'D', english:'D', hindi:'डी',     category:'alphabet', handshape:'Index up, other fingers form circle with thumb', tips:'Index finger points straight up' },
  { id:'E', glyph:'E', english:'E', hindi:'ई',      category:'alphabet', handshape:'All fingers bent, thumb tucked under', tips:'Like a loose claw or bent fingers' },
  { id:'F', glyph:'F', english:'F', hindi:'एफ',     category:'alphabet', handshape:'Index-thumb circle, other three fingers extended', tips:'Three fingers spread wide outward' },
  { id:'G', glyph:'G', english:'G', hindi:'जी',     category:'alphabet', handshape:'Index and thumb point sideways, parallel', tips:'Like pointing sideways with two fingers' },
  { id:'H', glyph:'H', english:'H', hindi:'एच',     category:'alphabet', handshape:'Index and middle extended horizontal together', tips:'Two fingers point sideways flat' },
  { id:'I', glyph:'I', english:'I', hindi:'आई',     category:'alphabet', handshape:'Pinky finger up, all others closed', tips:'Only little finger extended upward' },
  { id:'J', glyph:'J', english:'J', hindi:'जे',     category:'alphabet', handshape:'Pinky up, trace letter J in air', tips:'Draw the curve of J starting from top' },
  { id:'K', glyph:'K', english:'K', hindi:'के',     category:'alphabet', handshape:'Index up, middle angled out, thumb between', tips:'V shape with thumb inserted between' },
  { id:'L', glyph:'L', english:'L', hindi:'एल',     category:'alphabet', handshape:'Index finger up, thumb pointing out at 90°', tips:'Classic L-shape, like a gun pointing left' },
  { id:'M', glyph:'M', english:'M', hindi:'एम',     category:'alphabet', handshape:'Three fingers folded over tucked thumb', tips:'Thumb under index, middle, ring fingers' },
  { id:'N', glyph:'N', english:'N', hindi:'एन',     category:'alphabet', handshape:'Two fingers folded over tucked thumb', tips:'Thumb under index and middle fingers only' },
  { id:'O', glyph:'O', english:'O', hindi:'ओ',      category:'alphabet', handshape:'All fingers and thumb form a round O', tips:'Fingertips touch thumb to make circle' },
  { id:'P', glyph:'P', english:'P', hindi:'पी',     category:'alphabet', handshape:'Like K but rotated to point downward', tips:'K handshape tilted so index points down' },
  { id:'Q', glyph:'Q', english:'Q', hindi:'क्यू',   category:'alphabet', handshape:'Like G but rotated to point downward', tips:'G handshape tilted downward' },
  { id:'R', glyph:'R', english:'R', hindi:'आर',     category:'alphabet', handshape:'Index and middle fingers crossed', tips:'Cross the two fingers over each other' },
  { id:'S', glyph:'S', english:'S', hindi:'एस',     category:'alphabet', handshape:'Closed fist, thumb crosses over fingers', tips:'Tight fist with thumb over the knuckles' },
  { id:'T', glyph:'T', english:'T', hindi:'टी',     category:'alphabet', handshape:'Thumb inserted between index and middle', tips:'Fist with thumb poking between fingers' },
  { id:'U', glyph:'U', english:'U', hindi:'यू',     category:'alphabet', handshape:'Index and middle extended upward together', tips:'Two fingers up, held close together' },
  { id:'V', glyph:'V', english:'V', hindi:'वी',     category:'alphabet', handshape:'Index and middle spread in V shape', tips:'Classic victory/peace sign' },
  { id:'W', glyph:'W', english:'W', hindi:'डब्लू',  category:'alphabet', handshape:'Index, middle, and ring fingers spread open', tips:'Three fingers spread like a W' },
  { id:'X', glyph:'X', english:'X', hindi:'एक्स',   category:'alphabet', handshape:'Index finger bent or hooked inward', tips:'Index curves into a hook shape' },
  { id:'Y', glyph:'Y', english:'Y', hindi:'वाई',    category:'alphabet', handshape:'Pinky and thumb extended, others closed', tips:'Hang ten / shaka sign' },
  { id:'Z', glyph:'Z', english:'Z', hindi:'ज़ेड',    category:'alphabet', handshape:'Index finger traces letter Z in air', tips:'Draw the Z shape in front of you' },

  // ── NUMBERS 0–10 ─────────────────────────────────────────
  { id:'0',  glyph:'0',  english:'Zero',  hindi:'शून्य', category:'number', handshape:'All fingers and thumb form O shape',           tips:'Like the letter O' },
  { id:'1',  glyph:'1',  english:'One',   hindi:'एक',    category:'number', handshape:'Index finger points straight up',               tips:'All others closed' },
  { id:'2',  glyph:'2',  english:'Two',   hindi:'दो',    category:'number', handshape:'Index and middle up, spread slightly',          tips:'Peace sign' },
  { id:'3',  glyph:'3',  english:'Three', hindi:'तीन',   category:'number', handshape:'Thumb, index, middle extended',                 tips:'Three from thumb side' },
  { id:'4',  glyph:'4',  english:'Four',  hindi:'चार',   category:'number', handshape:'Four fingers up, thumb tucked in',             tips:'All except thumb extended' },
  { id:'5',  glyph:'5',  english:'Five',  hindi:'पाँच',  category:'number', handshape:'All five fingers spread open wide',             tips:'Open palm, fingers spread' },
  { id:'6',  glyph:'6',  english:'Six',   hindi:'छः',    category:'number', handshape:'Pinky and thumb touch, others extended',        tips:'Standard hand counting system' },
  { id:'7',  glyph:'7',  english:'Seven', hindi:'सात',   category:'number', handshape:'Ring finger and thumb touch, others extended',  tips:'Standard hand counting system' },
  { id:'8',  glyph:'8',  english:'Eight', hindi:'आठ',    category:'number', handshape:'Middle finger and thumb touch, others extended', tips:'Standard hand counting system' },
  { id:'9',  glyph:'9',  english:'Nine',  hindi:'नौ',    category:'number', handshape:'Index and thumb form circle, others up',        tips:'Like number 9 hand pose' },
  { id:'10', glyph:'10', english:'Ten',   hindi:'दस',    category:'number', handshape:'Closed fist with thumb up or shake fist',       tips:'Thumbs up or shake closed fist' },

  // ── GREETINGS ────────────────────────────────────────────
  { id:'namaste',  glyph:'🙏', english:'Namaste',    hindi:'नमस्ते',   category:'greeting', handshape:'Both palms pressed together at chest',         tips:'Prayer hands, bow slightly' },
  { id:'hello',    glyph:'👋', english:'Hello',      hindi:'हैलो',     category:'greeting', handshape:'Open hand waves from forehead outward',        tips:'Like a salute, wave forward' },
  { id:'bye',      glyph:'✋', english:'Goodbye',    hindi:'अलविदा',   category:'greeting', handshape:'Open hand waves side to side near shoulder',   tips:'Relaxed wave, palm outward' },
  { id:'thanks',   glyph:'🤲', english:'Thank You',  hindi:'धन्यवाद',  category:'greeting', handshape:'Flat hand moves from chin forward and down',   tips:'Touch chin, push hand outward' },
  { id:'please',   glyph:'🙏', english:'Please',     hindi:'कृपया',   category:'greeting', handshape:'Flat hand makes circular motion on chest',     tips:'Slow clockwise circle on chest' },
  { id:'sorry',    glyph:'✊', english:'Sorry',       hindi:'माफ करना', category:'greeting', handshape:'Fist makes slow circular motion over heart',  tips:'Gentle circles, sincere expression' },
  { id:'yes',      glyph:'✅', english:'Yes',         hindi:'हाँ',      category:'greeting', handshape:'Fist nods up and down like a head nodding',    tips:'Closed fist bobs yes motion' },
  { id:'no',       glyph:'❌', english:'No',          hindi:'नहीं',    category:'greeting', handshape:'Index and middle snap shut to thumb twice',     tips:'Like scissors snapping closed' },

  // ── COMMON WORDS ─────────────────────────────────────────
  { id:'water',   glyph:'💧', english:'Water',     hindi:'पानी',     category:'common', handshape:'W hand, index taps lips twice',                  tips:'W shape then touch lips' },
  { id:'food',    glyph:'🍚', english:'Food / Eat', hindi:'खाना',    category:'common', handshape:'Flat fingers brought to mouth repeatedly',       tips:'Fingers bunched, tap mouth' },
  { id:'help',    glyph:'🆘', english:'Help',       hindi:'मदद',     category:'common', handshape:'Fist placed on flat palm, both rise upward',    tips:'Lift both hands together' },
  { id:'home',    glyph:'🏠', english:'Home',       hindi:'घर',      category:'common', handshape:'Flat hand taps cheek then moves to chin',       tips:'Touch cheek, then chin area' },
  { id:'good',    glyph:'👍', english:'Good',       hindi:'अच्छा',   category:'common', handshape:'Flat hand moves from chin forward and down',    tips:'Touch chin, push forward' },
  { id:'bad',     glyph:'👎', english:'Bad',        hindi:'बुरा',    category:'common', handshape:'Fingers at mouth flick sharply downward',       tips:'Fingers flick down from chin' },
  { id:'love',    glyph:'❤️', english:'Love',       hindi:'प्यार',   category:'common', handshape:'Both arms crossed over chest, hug yourself',    tips:'Arms crossed at chest, squeeze' },
  { id:'friend',  glyph:'🤝', english:'Friend',     hindi:'दोस्त',   category:'common', handshape:'Index fingers hooked together and shake',       tips:'Link index fingers, shake slightly' },
  { id:'doctor',  glyph:'⚕️', english:'Doctor',     hindi:'डॉक्टर', category:'common', handshape:'D hand taps inside of opposite wrist',          tips:'Fingerspell D then tap wrist' },
  { id:'school',  glyph:'🏫', english:'School',     hindi:'स्कूल',   category:'common', handshape:'Clap flat hands together twice',                tips:'Two firm flat claps' },
  { id:'work',    glyph:'💼', english:'Work',       hindi:'काम',     category:'common', handshape:'Wrist taps side of opposite closed fist twice',  tips:'Tap fist on fist twice' },
  { id:'time',    glyph:'⏰', english:'Time',       hindi:'समय',     category:'common', handshape:'Index finger taps wrist like checking a watch',  tips:'Point to wrist, tap twice' },
  { id:'name',    glyph:'🏷️', english:'Name',       hindi:'नाम',     category:'common', handshape:'H hand taps opposite H hand twice',             tips:'Two fingers tap two fingers' },
  { id:'family',  glyph:'👨‍👩‍👧', english:'Family',   hindi:'परिवार',  category:'common', handshape:'F hands start together and circle outward',    tips:'Both F hands make outward circle' },
];

const ISL_MAP = {};
ISL_SIGNS.forEach(s => { ISL_MAP[s.id] = s; });

const TIPS = [
  'Hold your hand 30–60 cm from the camera',
  'Use a plain, uncluttered background',
  'Ensure good lighting — avoid harsh shadows on your hand',
  'Move slowly and hold each sign for 1–2 seconds',
  'Face your palm toward the camera for clearest detection',
  'ISL has regional dialects — signs may vary by state',
  'The ISLRTC is the official body for ISL standardisation',
  'Keep your elbow slightly bent for natural hand posture',
];

window.ISL_SIGNS = ISL_SIGNS;
window.ISL_MAP   = ISL_MAP;
window.TIPS      = TIPS;
