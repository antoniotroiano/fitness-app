import type { HelpTr } from './a'

/** English articles: logging and exercises. */
export const EN_B: Record<string, HelpTr> = {
  'logging-starten': {
    title: 'Starting a workout',
    blocks: [
      { steps: ['Open the **Workouts** page.', 'Tap the workout you want to train. You see the preview with exercises, targets and suggestions.', 'Tap **Start workout**.'] },
      'A running workout survives reloading and closing the app. On the **Workouts** page **A workout is running** appears with a **Resume** button.',
      'You start a free workout without a plan via **＋** › **Create single workout**.',
    ],
  },
  'logging-sets': {
    title: 'Entering and checking off sets',
    blocks: [
      'Each exercise shows a table of sets. The values are pre-filled with the app’s suggestion.',
      { steps: ['Select the exercise in the exercise bar at the top.', 'In the row tap **Weight** or **Reps**, enter the value on the number pad and tap **Confirm**.', 'Tap **Check off set**. The rest timer starts automatically.', 'Use **Add set** to add another set.'] },
      'If you deviate from the plan, the app adjusts the following sets (see “How are following sets adjusted?”). Values you changed by hand stay untouched. Instead of the suggestion you can pre-fill the values of your last workout: **More** › **Workouts** › **Pre-fill sets in workout**.',
    ],
  },
  'logging-rir': {
    title: 'Entering and changing RIR',
    blocks: [
      'RIR means “reps in reserve”: how many clean reps could you still have done at the end of the set? RIR 0 means failure, RIR 2 means two more reps were possible.',
      { steps: ['Tap the **RIR** field in the set row.', 'On the number pad choose the value you felt after the set and tap **Confirm**.'] },
      'RIR feeds into the suggestions and the estimated 1RM. If it is missing, the app assumes RIR 2. The **target RIR** is shown in the row and comes from the program. You change it permanently in the preview via **Targets**.',
    ],
  },
  'logging-aufwaermen': {
    title: 'Switching warm-up sets on or off or changing them',
    blocks: [
      { steps: ['In the workout tap **Warm-up** on the exercise.', 'In the **Warm-up mode** sheet choose the mode: **Smart**, **Scheme** or off.', '**Reset to default** puts the exercise back to the general setting.'] },
      'Smart calculates the sets from how heavy the working weight is and how fresh the muscle is. If the muscle is already warm from an earlier exercise, the warm-up is smaller. **Scheme** uses one of the five category schemes.',
      'To set it permanently per exercise, use the exercise detail page: **Exercises** › open exercise › **Warm-up automation**, **Warm-up scheme**. General schemes and rests are under **More** › **Workouts** › **Warm-up**.',
      'Warm-up sets never count toward volume, sets, 1RM, progression or weekly progress. Completed warm-up sets collapse into one row (“done · show”). You can switch that off under **More** › **Workouts** › **Display**.',
    ],
  },
  'logging-pausen': {
    title: 'Setting up the rest timer',
    blocks: [
      'After every checked-off set a rest timer starts. The clock in the header shows the remaining time. Tapping it opens a menu with ±15 seconds, stop and custom timers.',
      { steps: ['General rests: **More** › **Workouts** › **Rest**. You set the time per exercise type.', 'For one exercise only: **Exercises** › open exercise › **Rest timer** › **Edit**. **Back to default** undoes it.', 'Switch the sound on or off: **More** › **Workouts** › **Display** › **Sound at end of rest**.'] },
      'The sound only plays if the app is in the foreground and the device is not muted. In the background or with a locked screen it stays silent; with a web app this is technically not possible otherwise.',
    ],
  },
  'logging-satztypen': {
    title: 'Set types: logging failure, drop and myo-rep sets',
    blocks: [
      { steps: ['In the set row tap the **Change set type** icon.', 'In the **Set type** sheet choose: **Standard set**, **Warm-up set**, **Failure set**, **Drop set** or **Myo-rep set**.', 'For drop and myo-rep sets you can append more with **Another segment**. You remove a segment by swiping the row to the left.'] },
      ['**Failure set (F)**: RIR 0, until nothing is left', '**Drop set (D)**: continue straight away with about 20 % less weight', '**Myo-rep set (M)**: short rest (10 to 20 s), then a mini set with the same weight'],
      'Drop and myo-rep segments belong to the working set before them: reps and volume count, but they are not a set of their own and do not count toward 1RM, best performance, progression or weekly progress.',
    ],
  },
  'logging-teilwdh': {
    title: 'Logging partial reps',
    blocks: [
      { steps: ['In the set row tap **Reps**, the number pad opens.', 'Use the **V|T** button (**Type of reps**) to switch between **Full reps** and **Partial reps**.', 'Enter the full reps first, then the partial reps, and tap **Confirm**.'] },
      'The reps field then shows “full | partial”. Only the full reps count toward rep count and volume. For progression and 1RM a set with partial reps counts as RIR 0.',
    ],
  },
  'logging-supersatz': {
    title: 'Creating or unlinking a superset',
    blocks: [
      'In a superset you alternate between two or more exercises with no rest in between. The timer starts only after the last exercise of the round.',
      { steps: ['In the workout select the exercise and tap **Superset**.', 'Choose **Link with next** or **Link with previous**.', 'To unlink: **Remove from superset**.'] },
      'The change also applies immediately to future workouts of this training day. The button only appears if the workout has more than one exercise. An exercise skipped for the week does not count toward the superset.',
    ],
  },
  'logging-seiten': {
    title: 'Logging left and right separately',
    blocks: [
      { steps: ['In the workout tap **Left/Right** on the exercise. The button is then highlighted.', 'Enter weight and reps per side.', 'Check off each side separately with **Check off side …**. Only when both sides are done is the set complete.'] },
      'A set remains one set. For progression, 1RM and plateau detection the weaker side always counts. Volume is the sum of both sides. After one side a short side rest starts (default 15 s, adjustable, 0 = off).',
      'For unilateral exercises the feature is on by default. Switching it off keeps the weaker side. Dumbbell and kettlebell weights count per side, so volume is doubled.',
    ],
  },
  'logging-scheiben': {
    title: 'Using and setting up the plate calculator',
    blocks: [
      { steps: ['Open **More** › **Workouts** › **Barbell**.', 'Choose the weight of your **Bar** (10, 15 or 20 kg).', 'Under **Available plates** choose which plates you have.'] },
      'For barbell exercises the number pad in the weight field shows the plates **Per side**, heaviest first. If a weight cannot be loaded, the app states the remainder. For a weight that is too light, “Lighter than the bar” appears.',
    ],
  },
  'logging-koerpergewicht': {
    title: 'Bodyweight and assisted exercises',
    blocks: [
      'For exercises like pull-ups or dips you only enter the **added weight**. Internally the app calculates with the total load: share of body weight plus added weight. For this it needs a weight entry (**More** › **Data** › **Bodyweight**). It uses the trend.',
      'Without added weight, progression comes from reps. At the upper bound the app suggests the first small added weight and adjusts the reps.',
      'For assisted exercises (weight = assistance) it is the other way round: progress means less assistance. There is no 1RM or volume there.',
    ],
  },
  'logging-zeit-distanz': {
    title: 'Time and distance exercises',
    blocks: [
      'Planks, farmer’s walks and similar exercises measure seconds or meters instead of reps. The value goes in the **Reps** field, the column header shows Sec. or m.',
      'Progression increases by 5 seconds or 5 meters. At the upper bound with added load, the next weight step follows at the lower bound. There is no warm-up, no 1RM and no failure set.',
      'You create custom time or distance exercises under **Measure**. For distance you choose meters or yards under **Distance unit**; nothing is ever converted.',
    ],
  },
  'logging-notizen': {
    title: 'Adding notes to an exercise or workout',
    blocks: [
      { steps: ['In the workout tap **Note** on the exercise.', 'Write the text and choose what it applies to: this workout only or permanently for the exercise.', 'Tap **Save**.'] },
      'Exercise notes stay with the exercise and reappear next time, for example seat settings or a sore spot. You can also see and edit them under **Exercises** › open exercise › **Exercise note**.',
    ],
  },
  'logging-ueberspringen': {
    title: 'Skipping a workout or exercise',
    blocks: [
      'If you cannot train today, skip the workout.',
      { steps: ['On the **Workouts** page open the workout.', 'In the preview tap **Skip**.', 'To undo: **Stop skipping**.'] },
      'The day counts as done for the week without creating a workout, so there is no progression and no statistics from it. Once the last open day is done or skipped, the next week starts. The week list shows **Skipped**.',
      'You skip a single exercise for one week without removing it: preview › **Targets** › **Skip this week**.',
    ],
  },
  'logging-pausieren-beenden': {
    title: 'Pausing, finishing or discarding a workout',
    blocks: [
      { steps: ['At the top of the workout tap the **Workout menu**.', '**Pause workout** stops the workout clock, **Resume workout** starts it again.', '**Finish workout** saves the workout. The sheet asks whether to **Save checked-off sets only** or **Save all sets**, or whether to continue with **Back to workout**.', '**Discard workout** deletes everything. You have to confirm it once.'] },
      'The workout clock is timestamp-based, so it keeps running correctly even while the app is closed. After finishing, the day is marked as done in the weekly plan.',
    ],
  },
  'logging-nachtragen': {
    title: 'Adding a past workout',
    blocks: [
      { steps: ['Open **More** › **Feature settings** › **History**, or on the **Workouts** page the **Workouts menu** (⋯) › **View and edit history**.', 'Tap **Add past** at the top right.', 'Choose **Program**, **Program week** and **Date** and tap **Log**.', 'Enter the sets as in a normal workout.'] },
      'The app only suggests values from workouts up to that date. It is saved with the chosen date, 12:00 and no duration. The weekly state does not change.',
      'You import larger histories as CSV, see “Importing workout history”.',
    ],
  },

  'uebungen-bibliothek': {
    title: 'Searching and viewing exercises',
    blocks: [
      { steps: ['Tap **Exercises** at the bottom.', 'Search by name, muscle or alternative name in the search field, or browse the groups.', 'Tap an exercise to see details.'] },
      'The exercise page shows **Info** (instructions, details, history), your **Exercise note** and exercise-specific settings.',
    ],
  },
  'uebungen-info': {
    title: 'Viewing exercise information and statistics',
    blocks: [
      { steps: ['In a workout: tap **Info** on the exercise. Otherwise: **Exercises** › open exercise › **Info**.', 'In the sheet switch between the tabs **Instructions**, **Details** and **History**.'] },
      '**Instructions** shows steps and tips, **Details** the muscles worked (**Primary**, **Secondary**) and the **Never recommend** switch, **History** your previous values.',
      'The **History** tab lists your previous workouts with this exercise. Charts with personal bests are on the statistics page of the exercise, see “Tracking the progress of an exercise”.',
    ],
  },
  'uebungen-eigene': {
    title: 'Creating a custom exercise',
    blocks: [
      { steps: ['Tap **Exercises** at the bottom, then **+**.', 'Enter a unique name under **Exercise name**.', 'Choose **Equipment**, **Type** (**Compound** or **Isolation**) and **Measure** (**Reps**, **Time (seconds)** or **Distance**).', 'Tap the muscles: once for **Primary muscle**, again for **Secondary muscle** (counts half), again for **not involved**. At least one primary muscle is required.', 'Optional: **Description** (one line per step) and **Choose image**.', 'Tap **Create exercise**.'] },
      'For dumbbell or kettlebell equipment, **Per side** decides whether the weight counts per hand (volume doubled). With **Unilateral** you log left and right separately. For bodyweight equipment, **Bodyweight share** sets which share of your weight is moved (push-up about 64 %, pull-up about 95 %).',
      'The “Cardio” equipment creates a cardio exercise (minutes and kilometers, never counts in muscle statistics, is never planned automatically). **Assisted** means the weight is the assistance. The image is shrunk on the device and stored only there.',
    ],
  },
  'uebungen-bearbeiten': {
    title: 'Editing, duplicating or deleting an exercise',
    blocks: [
      { steps: ['Open **Exercises** and tap the exercise.', '**Edit**: for custom exercises, tap **Edit** in the **Custom exercise** section.', '**Duplicate**: tap **Duplicate** (**As a new custom exercise**). This also works for standard exercises, giving you an adjusted variant.', '**Delete**: for custom exercises, tap **Delete** and confirm.'] },
      'Deleting only works if the exercise appears in no logged workout. If it is only planned in programs, the app asks and removes it there. Exception: if a training day would end up empty, the exercise stays. You correct logged workouts in the history.',
    ],
  },
  'uebungen-tauschen': {
    title: 'Swapping an exercise',
    blocks: [
      { steps: ['In the workout tap **Swap** on the exercise. The program preview has the same button.', 'Use the **Apply to program** switch to decide whether the swap is permanent. Off means: this workout only.', 'Tap **Swap exercise** and choose an alternative. Matching exercises for the same muscle are at the top, free selection below.'] },
      'The new exercise starts without history. In a running workout the checked sets of the old exercise are lost, and the app points this out. If you swap to a different type, weekly targets are discarded.',
    ],
  },
  'uebungen-hinzufuegen': {
    title: 'Adding an exercise in a running workout',
    blocks: [
      { steps: ['In the workout tap **+** (**Add exercise**) in the exercise bar at the top.', 'Choose the exercise from the library.'] },
      'The exercise is appended for this workout and starts with three sets. You add new exercises to the program when creating it, or by replacing an existing one with **Swap**.',
    ],
  },
  'uebungen-entfernen': {
    title: 'Removing an exercise or skipping it for a week',
    blocks: [
      { steps: ['In the workout tap **Swap** on the exercise.', 'Choose **Remove exercise** and confirm with **Really remove?**.'] },
      'Depending on the **Apply to program** switch, it affects the program permanently or only this workout. The last exercise of a workout cannot be removed. To skip it for one week only: preview › **Targets** › **Skip this week**.',
    ],
  },
  'uebungen-nie-empfehlen': {
    title: 'Never recommending an exercise',
    blocks: [
      { steps: ['Open the exercise (**Exercises** › exercise, or **Info** in a workout).', 'In the sheet switch to the **Details** tab.', 'Switch on **Never recommend**.'] },
      'The exercise then appears neither in automatically created programs nor in swap suggestions. It stays visible in free selection, and existing programs do not change.',
    ],
  },
  'uebungen-geraetestufen': {
    title: 'Setting available machine weights',
    blocks: [
      'Not every weight is available: dumbbells may go up in 2 kg steps, machines in fixed stacks. So that the app only suggests weights you can set, you define them.',
      { steps: ['Open **Exercises** and tap the exercise.', 'In the **Exercise-specific** section tap **Edit** next to **Machine weights**.', 'Define one or more ranges: **Range start**, **Range end** and **Step size**. Optionally add a micro step (e.g. a small add-on weight on the machine).', 'Tap **Save**.'] },
      'The values appear with two decimals. Progression rounds to the next available step. If the next jump is too big for the reps, the reps rise above the upper bound first (**Extend range**, adjustable under **More** › **Workouts** › **Progression**).',
    ],
  },
}
