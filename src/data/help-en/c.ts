import type { HelpTr } from './a'

export const EN_INTRO = 'All help articles and frequently asked questions about the app. Scroll to see the full list.'

/** English category titles and descriptions. */
export const EN_CATS: Record<string, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Rings, records, body map and how to customize the home page' },
  programme: { title: 'Programs', desc: 'Create, switch, adjust, share and finish' },
  logging: { title: 'Workout Logging', desc: 'Start a workout, enter sets, rests and set types' },
  uebungen: { title: 'Exercises', desc: 'Library, custom exercises, swapping and machine weights' },
  verlauf: { title: 'History and Insights', desc: 'View and correct workouts, understand statistics' },
  koerper: { title: 'Body Metrics', desc: 'Weight, measurements and import from other apps' },
  einstellungen: { title: 'Other Settings and Miscellaneous', desc: 'Units, language, backup, import and export' },
  faq: { title: 'Frequently Asked Questions', desc: 'Short answers to questions that come up often' },
}

/** English articles: history, body metrics, settings and FAQ. */
export const EN_C: Record<string, HelpTr> = {
  'verlauf-ansehen': {
    title: 'Viewing past workouts',
    blocks: [
      { steps: ['Open **More** › **Feature settings** › **History**, or on the **Workouts** page the **Workouts menu** (⋯) › **View and edit history**.', 'The list is sorted by date. Tap a workout to see all its sets.'] },
    ],
  },
  'verlauf-bearbeiten': {
    title: 'Editing a past workout',
    blocks: [
      { steps: ['Open the **History** and tap the workout.', 'Change sets, add exercises with **Add exercise** or remove them.', 'If needed change **Date**, **Start time**, **Duration (minutes, empty = unknown)** and **Program week**.', 'Tap **Save changes**. With **Discard changes?** you go back without saving.'] },
      'If the date changes, start and end move along with the same time of day. Rows without reps are discarded on saving, a workout without sets can only be deleted.',
      'If a date or week change moves a workout out of the current week, its slot in the weekly plan becomes free again, and vice versa. Earlier weeks stay unchanged. Progression, 1RM and plateau detection are calculated live from the workouts, so a correction takes effect everywhere immediately.',
    ],
  },
  'verlauf-loeschen': {
    title: 'Deleting a past workout',
    blocks: [
      { steps: ['Open the workout in the **History**.', 'Tap **Delete workout**.', 'Choose **Delete, free the day again** (the training day is open again in that week) or **Delete, day stays done**.', 'Confirm with **Delete permanently**.'] },
      'Progression, 1RM and statistics are then calculated without this workout. Deleting cannot be undone.',
    ],
  },
  'verlauf-uebung': {
    title: 'Tracking the progress of an exercise',
    blocks: [
      { steps: ['Open the **Dashboard** and tap the exercise tile among the records. The statistics page opens.', 'Choose a metric and period (**Daily**, **Weekly**, **Monthly**).', 'With **Chart smoothing** you set how strongly the curve is averaged.', 'A simple list of your workouts with this exercise is in the **History** tab of the info sheet (**Exercises** › exercise › **Info**).'] },
      ['Estimated 1RM by Epley (dampened above 12 reps)', 'Heaviest weight and best set', 'Total volume, total reps, total sets'],
      'A best value becomes a record when you beat the previous maximum. Cardio and warm-up sets are not included.',
    ],
  },
  'verlauf-muskel': {
    title: 'Viewing sets and volume per muscle',
    blocks: [
      { steps: ['Open the **Dashboard** › **Volume** › body map.', 'In the list tap a muscle and then **View history**.'] },
      'The muscle statistics show how many sets you trained for the muscle over the weeks. Primary muscles count fully, secondary muscles with a factor of 0.5. As a rough guide, about 10 to 20 hard sets per muscle per week are used for muscle growth. This is a guideline, not a law.',
    ],
  },
  'verlauf-vorschlag': {
    title: 'Why does the app suggest these values?',
    blocks: [
      'Below each exercise in the workout and in the preview is the line **Why this suggestion?**. Tap it to read the reasoning. The title names the reason, the text shows the last workout, the suggestion and the rule behind it.',
      'Possible reasons:',
      ['**One more rep**: the weight stays until all sets reach the upper bound', '**Upper bound reached**: all sets were at the top, the weight goes up, the reps go back down', '**Slightly heavier / Slightly lighter**: from your last performance (estimated 1RM) a different weight fits the target range and target RIR', '**Same load**: the next step would be too big a jump', '**First added weight**: for bodyweight exercises at the upper bound', '**Time goes up**: for time or distance exercises +5 per workout', '**Large weight step**: first more reps above the target range, then more weight', '**Weight limit**: with the available weights the target range cannot be reached cleanly', '**Plateau reset**: stagnation over several workouts, the weight drops by about 5 %', '**After a training break**: after a break of more than three weeks the suggestion starts lower'],
      'For larger changes (over 10 % weight or more than 3 reps) it says **Please check the suggestion**. Then check whether the value fits how you feel today. For new exercises without history there is no suggestion.',
    ],
  },

  'koerper-gewicht': {
    title: 'Logging body weight',
    blocks: [
      { steps: ['Tap **＋** › **Log weight**, or open **More** › **Data** › **Bodyweight**.', 'Enter your weight.', 'Tap **Log**.'] },
      'One entry per day is enough. Weigh yourself under the same conditions if possible, for example in the morning after getting up. The page shows measurements as dots and the trend as a line. Values are always stored in kilograms, the display follows your unit.',
    ],
  },
  'koerper-masse': {
    title: 'Logging body measurements',
    blocks: [
      { steps: ['Tap **＋** › **Log measurements**, or open **More** › **Data** › **Body measurements**.', 'Choose the metric (e.g. **Waist**, **Chest**, **Left biceps**).', 'Enter the value and tap **Log**.'] },
      'You do not need to log everything every week; an interval of 2 to 4 weeks is enough. For comparable values: same time of day, stand relaxed, tape snug but not digging in, always at the same spot. Values are stored internally in cm.',
    ],
  },
  'koerper-vergleich': {
    title: 'Comparing changes over time',
    blocks: [
      { steps: ['Open **More** › **Data** › **Body measurements**.', 'Scroll to the **Comparison** card.', 'Choose **4 weeks**, **3 months**, **1 year** or **All time**.'] },
      'The starting value is the last entry on or before the start of the period, otherwise the first entry within it. It is compared with the newest one. A value needs at least two entries on different days.',
    ],
  },
  'koerper-import': {
    title: 'Importing weight data',
    blocks: [
      'As a web app, the app has no direct access to Apple Health or Health Connect. You import a file instead.',
      { steps: ['In the Health app export your data (**export.xml**) or create a CSV file with date and kg per row.', 'Open **More** › **Data**.', 'Tap **Import weight data** and choose the file.'] },
      'The app reports how many weight values were imported.',
    ],
  },

  'einstellungen-ueberblick': {
    title: 'The settings at a glance',
    blocks: [
      'The **More** menu is divided into:',
      ['**General**: profile, units, language', '**Feature settings**: dashboard, workouts, history, exercises', '**Theme**: light, dark or system', '**Data**: bodyweight, body measurements, period, backup and import', '**Support**: knowledge base', '**Other**: about'],
      'Under **More** › **Workouts** you find **Rest**, **Warm-up**, **Progression**, **Barbell** and **Display**.',
    ],
  },
  'einstellungen-einheiten': {
    title: 'Changing units',
    blocks: [
      { steps: ['Open **More** › **Units**.', 'Choose **Weight** (kg or lb), **Length** (cm or in / ft), **Distance** (km or mi) and **Time format** (24 h or 12 h).'] },
      'Internally the app always stores metric. A change therefore only affects display and input; nothing is lost and nothing is converted twice.',
    ],
  },
  'einstellungen-sprache-design': {
    title: 'Changing language and theme',
    blocks: [
      { steps: ['Open **More**.', '**Language**: in the **General** section tap **DE** or **EN** next to **Language**. The app reloads.', '**Theme**: in the **Theme** section choose one of the three tiles (System, Light, Dark).'] },
      'Stored texts such as program names and notes keep the language in which you created them.',
    ],
  },
  'einstellungen-progression': {
    title: 'Setting up progression',
    blocks: [
      { steps: ['Open **More** › **Workouts**.', 'Go to the **Progression** section.'] },
      ['**Target after an increase**: **Middle of the range** (smaller jumps, default) or **Lower bound** (classic double progression)', '**Weight Match** (only with “Middle of the range”): keep the weight as long as the reps stay in range', '**Hard set first**: the first working set goes 1 RIR closer to failure', '**Extend range**: with a weight jump that is too big, more reps first', '**Pre-fill sets in workout**: **Suggestion** or **Last values**'],
    ],
  },
  'einstellungen-display': {
    title: 'Setting up the workout display',
    blocks: [
      { steps: ['Open **More** › **Workouts**.', 'Go to the **Display** section.'] },
      ['**Automatically go to next exercise**: after the last set it jumps to the next open exercise (supersets always alternate)', '**Sound at end of rest**', '**Keep screen on**: the screen stays on during a workout', '**Hide completed warm-up sets**'],
    ],
  },
  'einstellungen-backup': {
    title: 'Creating and restoring a backup',
    blocks: [
      'All data lives only on your device. The app has no account and no server. That is why a regular backup is important, especially before changing devices.',
      { steps: ['Open **More** › **Data**.', 'Tap **Export backup (JSON)** and store the file safely (e.g. in iCloud Drive).', 'To restore: **Import backup** and choose the file. This replaces all current data, and the app asks first.'] },
    ],
  },
  'einstellungen-export': {
    title: 'Exporting workout data as CSV',
    blocks: [
      { steps: ['Open **More** › **Data**.', 'Optionally choose a period with **From** and **To**.', 'Optionally pick a single exercise with **Export one exercise only**. **Remove exercise filter** undoes it.', 'Tap **Export workouts (CSV)**.'] },
      'The file has one row per set. The format matches that of the workout import, so an export can be read in again.',
    ],
  },
  'einstellungen-import': {
    title: 'Importing workout history',
    blocks: [
      'If you have data from another app, import it as CSV (one row per set with date, exercise, weight, reps, RIR).',
      { steps: ['Open **More** › **Data**.', 'Tap **Import workout history (CSV)** and choose the file.', 'Check the suggestions under **Match exercises**. For exercises **without a match** choose a fitting exercise or **Skip**.', 'Tap **Import … workouts**.'] },
      'The app matches English exercise names automatically. Imported workouts appear as free workouts in the history and feed into statistics and suggestions. Exercises already logged on a day are skipped, so repeating an import is harmless. For distance exercises the distance goes in the “Reps” column.',
    ],
  },
  'einstellungen-zuruecksetzen': {
    title: 'Resetting data or settings',
    blocks: [
      { steps: ['**Delete all data**: **More** › **Data** › **Reset all data**. The app offers **Create a backup first**, then **Delete permanently**.', '**Settings only**: **More** › **About** › **Reset settings**. Programs and workouts are kept.'] },
      'Deleting all data is permanent. Programs, workouts, body weight, measurements, custom exercises and settings disappear from the device.',
    ],
  },

  'faq-rir': {
    title: 'What is RIR and how do I use it?',
    blocks: [
      'RIR (reps in reserve) says how many reps you could still have done at the end of the set. RIR 2: two more clean reps would have been possible.',
      'At the beginning people often estimate too optimistically. It helps to take sets close to failure occasionally to build a feel for it. The **Hard set first** option exists for this too. An honest RIR matters more than a perfect one.',
    ],
  },
  'faq-vorschlag': {
    title: 'How does the app calculate the next suggestion?',
    blocks: [
      'The basis is double progression: if you reach the upper bound of the rep range in all working sets, the weight goes up and the reps start again at the bottom (or in the middle, depending on the setting). Otherwise one more rep is suggested.',
      'If you log something different, the app recalculates from your estimated 1RM (Epley) and chooses weight and reps for the target RIR. The weights fit your equipment weights. After a break of more than three weeks it lowers the suggestion a little; after a drop in performance, plateau detection restarts.',
      'You see the reasoning for each suggestion via **Why this suggestion?**.',
    ],
  },
  'faq-folgesaetze': {
    title: 'How are following sets adjusted?',
    blocks: [
      'If you check off a set that clearly deviates from the plan (more than 1 RIR), the app adjusts the remaining sets so they fit how you feel today. Weight and reps are converted from that set, with a small deduction per set for fatigue.',
      'The weight changes at most once, later sets then only lose reps. If you changed a row by hand, it stays as you entered it.',
    ],
  },
  'faq-deload': {
    title: 'What is a deload?',
    blocks: [
      'A recovery week with about half the set volume and more reserve so the body can recover. It comes at the end (or start) of each block of 3 to 8 weeks. You can switch it off in the program.',
    ],
  },
  'faq-pause': {
    title: 'What happens if I miss workouts?',
    blocks: [
      'The weekly plan is not a calendar with fixed days. You tick off workouts by finishing them. If you miss a day, it stays open until you train it or skip it. Only when all days are done does the next week begin.',
      'After more than three weeks without training, the app lowers the suggested weights step by step (1.5 % per week, at most 15 %) so you ease back in gently.',
    ],
  },
  'faq-wochenzyklus': {
    title: 'How does the weekly cycle work?',
    blocks: [
      'A program week has seven slots for training and rest days. Completed days are checked off; you check off a rest day yourself on the **Workouts** page. When all seven are done, the week counts up and the targets for the new week are calculated.',
    ],
  },
  'faq-satztypen': {
    title: 'What are myo-rep, drop and failure sets?',
    blocks: [
      'These are intensity techniques. The failure set goes to RIR 0. With a drop set you reduce the weight straight afterwards and keep going; with a myo-rep segment another short series with the same weight follows after a short rest.',
      'They help when time is short, but are also demanding. Use them sparingly, ideally on isolation exercises. How to log them is described under “Set types: logging failure, drop and myo-rep sets”.',
    ],
  },
  'faq-nicht-moeglich': {
    title: 'I cannot do an exercise. What now?',
    blocks: [
      'Swap it with **Swap**. The app suggests alternatives for the same muscle. If the exercise only does not work today, switch off **Apply to program** so your plan stays unchanged. If the exercise is missing from the library, create your own.',
    ],
  },
  'faq-startgewicht': {
    title: 'What weight do I start with?',
    blocks: [
      'For new exercises without history the app does not suggest a weight. Choose a weight with which you can do the rep range at about 2 to 3 RIR. Better to start too light. The first set then calibrates the following sets: if your RIR deviates clearly, the app adjusts the later sets.',
    ],
  },
  'faq-weiter-wdh': {
    title: 'Why are so many reps suggested?',
    blocks: [
      'If the next weight step of your equipment is so large that you would not even reach the lower bound of the range with it, the weight stays the same and the reps rise above the upper bound, at most to the upper bound plus 2 (or 25 %). After that the app jumps to the next step with the achievable reps.',
      'If you have smaller weight steps (e.g. micro plates), enter them under **Machine weights**. The **Extend range** function can be switched off.',
    ],
  },
  'faq-bearbeiten': {
    title: 'Can I change logged sets afterwards?',
    blocks: [
      'Yes. Open the workout in the **History** and change or delete sets. All statistics and suggestions are recalculated immediately.',
    ],
  },
  'faq-daten': {
    title: 'Where is my data stored?',
    blocks: [
      'Only locally on your device, in your browser’s database. There is no account, no server and no network calls. This protects your privacy, but it also means: if you delete the app data in the browser or change devices, the data is gone without a backup. So create a backup regularly.',
    ],
  },
  'faq-health': {
    title: 'Can it connect to Apple Health?',
    blocks: [
      'Direct access is not technically possible in a web app. Import the Health export (export.xml) or a CSV file instead. An automatic connection would only be possible with a native wrapper.',
    ],
  },
}
