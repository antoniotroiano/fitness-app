import type { HelpBlock } from '../help'

export interface HelpTr { title: string; blocks: HelpBlock[] }

/** English articles: dashboard and programs. Same IDs and block structure as the German source. */
export const EN_A: Record<string, HelpTr> = {
  'dashboard-ueberblick': {
    title: 'The dashboard at a glance',
    blocks: [
      'The **Dashboard** is your home page (first tab at the bottom left). At the top you see the weekly rings and your latest records, below them sections for volume, body metrics and other insights.',
      'Everything is calculated live from your logged workouts, so corrections in the history take effect immediately.',
      ['**This week**: rings for muscles, sets and exercises', '**Records**: new personal bests per exercise', '**Volume**: body map with sets per muscle', '**Body metrics**: weight, body fat, measurements'],
    ],
  },
  'dashboard-ringe': {
    title: 'Understanding and switching the weekly rings',
    blocks: [
      'Three rings show your progress in the current week: **Muscles**, **Sets** and **Exercises**. The target of each ring comes from your active program.',
      'To change what is counted:',
      { steps: ['Open the **Dashboard**.', 'Under the rings tap **Program** (only workouts of your active program in the current program week) or **All workouts** (every workout in the date range of the week, including free workouts).'] },
      'Warm-up sets never count. Drop sets and myo-rep segments do not count as an additional set.',
    ],
  },
  'dashboard-koerperkarte': {
    title: 'Viewing volume and the body map',
    blocks: [
      { steps: ['Open the **Dashboard** and scroll to the **Volume** section.', 'Tap the **Volume** tile (average of the last 4 weeks).', 'Choose the period: 1, 4 or 12 weeks.', 'In the list below the map, tap a muscle to expand its exercise contributions.', 'Use **View history** to open the statistics of that muscle.'] },
      'The colors show working sets per week: under 4, 4 to 9, 10 to 20 and over 20. Primary muscles count fully, secondary muscles at half weight. A biceps curl counts as a full set for the biceps, a row only as half a set.',
      'An additional card shows the weekly volume in kg, split into weight and bodyweight share.',
    ],
  },
  'dashboard-trend': {
    title: 'Weight trend',
    blocks: [
      'Your body weight fluctuates daily because of water, food and digestion. The trend smooths this so you can see the real direction.',
      { steps: ['Open **More** › **Data** › **Bodyweight**.', 'The dots are your measurements, the line is the trend.'] },
      'Only the raw value is stored; the trend is calculated for display. The trend is also used as body weight for exercises with a bodyweight share (e.g. pull-ups), so a single heavy day does not distort the load.',
    ],
  },
  'dashboard-anpassen': {
    title: 'Customizing the dashboard and plus menu',
    blocks: [
      'You decide which sections the dashboard shows and in what order. The same goes for the quick actions in the plus menu.',
      { steps: ['On the **Dashboard** tap **Customize dashboard** (slider icon), or open **More** › **Feature settings** › **Dashboard**.', 'Switch sections **On** or **Off**.', 'Change the order with **Move up** and **Move down**.', 'Use **Reset** to restore the default.'] },
      'The rings and records at the top are always visible. New sections from app updates are appended at the end automatically.',
    ],
  },
  'dashboard-plusmenue': {
    title: 'The plus menu',
    blocks: [
      'The round **＋** button in the middle of the bottom bar opens quick actions:',
      ['**Log weight**', '**Log measurements**', '**New program**', '**Create single workout**'],
      'Which actions appear, and in what order, is set under **More** › **Feature settings** › **Dashboard** in the **Plus menu** section.',
    ],
  },
  'dashboard-periode': {
    title: 'Tracking your period',
    blocks: [
      { steps: ['Open **More** › **Profile** and switch on **Track period**. This is only available if your gender is not “Male”.', 'Open **More** › **Data** › **Period**.', 'Tap a day to mark it. Another tap removes the mark.'] },
      'From the marked days the app calculates the cycle day, the average cycle length (mean of the last 6 cycles, only 15 to 60 days) and the expected **next start**.',
      'This is display only, not medical advice. The data is not linked to training or progression and stays on your device.',
    ],
  },

  'programm-erstellen-wizard': {
    title: 'Creating a new program with the wizard',
    blocks: [
      'The wizard builds a complete program from a few questions.',
      { steps: ['Tap **＋** › **New program** (or **Create program** on the **Workouts** page as long as you have none).', 'Choose **App creates a plan** and tap **Next**.', 'Answer the questions: **Goal**, **Training days**, split, **Time per session**, **Rep ranges**, **Muscle focus**, **Block length & deload**, **Experience** and available equipment.', 'Set **Name, icon & color**.', 'Check the preview under **Your plan**. **Swap** changes exercises, **+ Add exercise** adds more.', 'Tap **Save plan**.'] },
      'The new program becomes active and appears on the **Workouts** page.',
      'The time per session limits the number of sets per day, calculated for the peak week of the block. The wizard only plans time-based exercises and cardio if you select them explicitly.',
    ],
  },
  'programm-von-hand': {
    title: 'Building a program yourself',
    blocks: [
      { steps: ['Tap **＋** › **New program**.', 'Choose **Build yourself** and tap **Next**.', 'Enter a name and add your training days with **+ Add workout** (**Workout name**).', 'Add exercises with **+ Add exercise** and set **Sets**, rep range and RIR.', 'Tap **Save**.'] },
      'A single workout without a program is created with **＋** › **Create single workout**. It sits in the program as an “unscheduled” workout and can be scheduled later.',
    ],
  },
  'programm-rep-schemata': {
    title: 'Rep schemes and periodization',
    blocks: [
      'A scheme defines how the rep range and reserve (RIR) change over the weeks of a block. You choose it in the wizard under **Rep ranges**:',
      ['**Static**: same range every week', '**Linear**: reps go down, weights go up', '**Reverse Linear**: reps go up, weights go down', '**Undulating**: weekly alternation between heavy and light', '**Rotating ranges**: three narrow zones (3 reps each) around the middle of the range, which every exercise cycles through weekly'],
      'With rotating ranges the last set in the last working week goes to failure. Heavy zones get one more rep in reserve. Compound exercises always keep at least 1 RIR. For advanced lifters the wizard suggests this variant automatically.',
      'Time and distance exercises never follow a scheme.',
    ],
  },
  'programm-blocklaenge': {
    title: 'Changing block length, deload and program end',
    blocks: [
      { steps: ['On the **Workouts** page open the **Workouts menu** (⋯ top right).', 'Under **Adjust program** tap **Edit program**.', 'Set **Training weeks per block** (3 to 8), **Deload week** (**At the end**, **At the start** or **None**) and **Program end** (**Endless** or a number of blocks).', 'Tap **Save**.'] },
      'The change applies immediately to the whole timeline. Workouts you have already logged keep their program week, only the block boundaries shift. For custom plans without periodization, block length and deload do not apply.',
      'A deload is a week with about half the set volume and more reserve. The evidence is weak: one study (Coleman et al. 2024) found no benefit for muscle size from a one-week break. Use it when you feel worn out, not out of obligation.',
    ],
  },
  'programm-aktiv': {
    title: 'Switching the active program',
    blocks: [
      'Exactly one program is active at any time. It determines the weekly plan, the dashboard targets and the suggestions in your workout.',
      { steps: ['Open the **Workouts** page and scroll to the **Workout library**.', 'Tap the program you want to activate. Its days expand.', 'Tap the program header once more to open the program page.', 'Tap **Program menu** (⋯) at the top right, then **Activate program**.'] },
      'When you switch, the app reconstructs the weekly state from your logged workouts. You lose nothing and later continue where you left off.',
    ],
  },
  'programm-duplizieren': {
    title: 'Duplicating a program',
    blocks: [
      'A copy is handy for trying out changes without touching your proven program.',
      { steps: ['Open the **Workouts** page.', 'Tap the **Workouts menu** (⋯) at the top right.', 'Under **Adjust program** tap **Duplicate program**.'] },
      'For a program other than the active one: open it from the **Workout library** (tap the header twice), then **Program menu** (⋯) › **Duplicate program**.',
      'The copy is called “… (Copy 1)”, has its own training days and stays inactive until you activate it. Give it your own name afterwards via **Edit program**.',
    ],
  },
  'programm-archiv': {
    title: 'Archiving, restoring and deleting a program',
    blocks: [
      'Archived programs are never active and disappear from the library, but they keep all their workouts.',
      { steps: ['**Archive**: **Workouts menu** (⋯) › **Archive program**. For another program: program page › **Program menu** (⋯) › **Archive program**.', '**View**: **Workouts menu** (⋯) › **Archived programs**.', '**Restore**: tap the program in the archive list, then **Program menu** (⋯) › **Restore from archive**, or **Activate** directly.', '**Delete**: program page › **Program menu** (⋯) › **Delete program** and confirm.'] },
      'If you archive the active program, the newest non-archived program becomes active automatically. When you delete a program, workouts already logged stay in the history, only the plan is gone.',
    ],
  },
  'programm-workout-umbenennen': {
    title: 'Renaming a workout',
    blocks: [
      { steps: ['Open the **Workouts** page and tap the workout you want to rename.', 'In the preview tap the menu (⋯) at the top right, then **Manage workout**.', 'Tap **Rename**, enter the new name and save.'] },
      'For a workout in another program, open the **program page** and tap **Manage workout** above the preview.',
    ],
  },
  'programm-workout-duplizieren': {
    title: 'Duplicating a workout',
    blocks: [
      { steps: ['Open the workout preview (**Workouts** page, tap the workout).', 'Tap the menu (⋯) at the top right › **Manage workout**.', 'Tap **Duplicate workout**.'] },
      'The copy is called “… (Copy 1)” and initially has no weekly slot. You find it on the **Workouts** page under **Additional workouts** and schedule it if needed.',
    ],
  },
  'programm-workout-einplanen': {
    title: 'Removing a workout from the weekly plan or scheduling it',
    blocks: [
      'A workout can sit in the weekly plan or lie in the program as an “unscheduled” workout. Nothing is lost either way.',
      { steps: ['Open the workout preview and tap the menu (⋯) › **Manage workout**.', 'To take it out: **Remove from weekly plan**. The slot becomes a rest day.', 'To schedule it: **Add to weekly plan**. The workout takes the first free rest day.'] },
      'The last scheduled workout cannot be removed. If no rest day is free, remove another workout first.',
    ],
  },
  'programm-wochenplan': {
    title: 'Arranging the weekly plan',
    blocks: [
      'You can rearrange training days and rest days in the weekly plan without changing the workouts themselves.',
      { steps: ['On the **Workouts** page open the **Workouts menu** (⋯).', 'Under **Adjust program** tap **Arrange weekly plan**.', 'Move the entries with **Move up** and **Move down**.'] },
      'For another program you find **Arrange weekly plan** in the **Program menu** (⋯) of the program page. Completed days keep their check mark and move along. Past workouts do not change.',
    ],
  },
  'programm-uebung-verschieben': {
    title: 'Moving an exercise to another workout',
    blocks: [
      { steps: ['Open the preview of the workout the exercise is in.', 'Tap **Move** on the exercise.', 'Choose the target workout. Tapping the current workout only changes the order.', 'Under **Choose position** pick the place where the exercise should go.'] },
      'The exercise history is kept. A superset is unlinked in the process, and the last exercise of a workout always stays.',
    ],
  },
  'programm-wochenziele': {
    title: 'Changing sets, reps and RIR per week',
    blocks: [
      'For individual weeks you can override the **Sets**, rep range (**reps**) and RIR of an exercise, or skip the exercise.',
      { steps: ['Open the workout preview.', 'Tap **Targets** on the exercise.', 'Under **Applies to** choose whether it applies **In every block** (same week of every block) or **This week only**. “This week only” takes precedence.', 'Fill in only the fields you want to change. **Empty fields** take the value from the weekly plan.', '**Skip this week** drops the exercise completely this week.', 'Tap **Save**.'] },
      '**Apply to all exercises of the day** copies the filled-in fields to the whole workout. **Reset** removes the target again. If you swap an exercise for another type, its weekly targets are discarded.',
    ],
  },
  'programm-teilen': {
    title: 'Sharing programs and workouts as a file',
    blocks: [
      'Programs and single workouts can be exported as a file and imported on another installation, with no account and no network.',
      { steps: ['**Export a program**: program page › **Program menu** (⋯) › **Export program**.', '**Export a workout**: workout preview › menu (⋯) › **Manage workout** › **Export workout**.', 'Pass the file on (AirDrop, message, cloud).'] },
      'To import:',
      { steps: ['**Program**: **More** › **Data** › **Import program**.', '**Workout**: **Workouts menu** (⋯) on the **Workouts** page › **Import workout**, or in **Manage workout** › **Import workout**.'] },
      'An imported program arrives as a new, inactive program with a unique name, a workout as an “unscheduled” workout. Included custom exercises are created, existing exercises are never overwritten by the import.',
    ],
  },
  'programm-ende': {
    title: 'What happens at the end of a program?',
    blocks: [
      'If you have set a limited number of blocks for a program, the card **Program end reached** appears on the **Workouts** page after the last block, with three options:',
      ['**Repeat block**: appends another block', '**Finish**: archives the program', '**Create new program**: opens the wizard without archiving the old one'],
      'Without a block limit the program runs endlessly. You set the limit under **Edit program** › **Program end**.',
    ],
  },
}
