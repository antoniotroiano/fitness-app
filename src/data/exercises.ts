import type { Equipment, Exercise, MuscleId, Pattern } from '../types'
import { t } from '../i18n'

type Row = [string, string, MuscleId[], MuscleId[], Equipment, Pattern, boolean]

const rows: Row[] = [
  // Brust
  ['bb-bench', t('Bankdrücken (Langhantel)'), ['chest'], ['triceps', 'frontDelts'], 'barbell', 'horizontalPush', true],
  ['bb-incline', t('Schrägbankdrücken (Langhantel)'), ['chest'], ['frontDelts', 'triceps'], 'barbell', 'horizontalPush', true],
  ['db-bench', t('Bankdrücken (Kurzhantel)'), ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['db-incline', t('Schrägbankdrücken (Kurzhantel)'), ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['smith-bench', t('Bankdrücken (Smith)'), ['chest'], ['triceps', 'frontDelts'], 'smith', 'horizontalPush', true],
  ['smith-incline', t('Schrägbankdrücken (Smith)'), ['chest'], ['frontDelts', 'triceps'], 'smith', 'horizontalPush', true],
  ['machine-chest', t('Brustpresse (Maschine)'), ['chest'], ['triceps', 'frontDelts'], 'machine', 'horizontalPush', true],
  ['machine-incline-chest', t('Schrägbrustpresse (Maschine)'), ['chest'], ['frontDelts', 'triceps'], 'machine', 'horizontalPush', true],
  ['pec-deck', t('Pec-Deck-Fly (Butterfly)'), ['chest'], [], 'machine', 'isolation', false],
  ['cable-fly', t('Kabel-Fly (horizontal)'), ['chest'], [], 'cable', 'isolation', false],
  ['cable-fly-low', t('Kabel-Fly von unten'), ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['db-fly', t('Fliegende (Kurzhantel)'), ['chest'], [], 'dumbbell', 'isolation', false],
  ['pushup', t('Liegestütze'), ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['dips-chest', t('Dips (Brust)'), ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  // Schultern
  ['bb-ohp', t('Schulterdrücken stehend (Langhantel)'), ['frontDelts', 'sideDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['db-ohp', t('Schulterdrücken (Kurzhantel)'), ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['machine-ohp', t('Schulterpresse (Maschine)'), ['frontDelts', 'sideDelts'], ['triceps'], 'machine', 'verticalPush', true],
  ['smith-ohp', t('Schulterdrücken (Smith)'), ['frontDelts', 'sideDelts'], ['triceps'], 'smith', 'verticalPush', true],
  ['bb-ohp-close', t('Schulterdrücken (Langhantel, enger Griff)'), ['frontDelts', 'sideDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['bb-ohp-wide', t('Schulterdrücken (Langhantel, weiter Griff)'), ['sideDelts', 'frontDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['db-lateral', t('Seitheben (Kurzhantel)'), ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-lateral', t('Seitheben (Kabel)'), ['sideDelts'], [], 'cable', 'isolation', false],
  ['machine-lateral', t('Seitheben (Maschine)'), ['sideDelts'], [], 'machine', 'isolation', false],
  ['reverse-pec-deck', t('Reverse Butterfly'), ['rearDelts'], ['upperBack'], 'machine', 'isolation', false],
  ['face-pull', t('Face Pulls (Kabel)'), ['rearDelts'], ['upperBack', 'traps'], 'cable', 'isolation', false],
  ['db-rear-delt', t('Reverse Fly (Kurzhantel)'), ['rearDelts'], ['upperBack'], 'dumbbell', 'isolation', false],
  // Rücken
  ['pullup', t('Klimmzüge'), ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['chinup', 'Chin-ups', ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['lat-pulldown', t('Latzug'), ['lats'], ['biceps', 'upperBack'], 'cable', 'verticalPull', true],
  ['lat-pulldown-neutral', t('Latzug (enger neutraler Griff)'), ['lats'], ['biceps'], 'cable', 'verticalPull', true],
  ['machine-pulldown', t('Latzug (Maschine)'), ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['assisted-pullup', t('Klimmzüge (assistiert)'), ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['bb-row', t('Langhantelrudern'), ['upperBack', 'lats'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['db-row', t('Einarmiges Kurzhantelrudern'), ['lats', 'upperBack'], ['biceps'], 'dumbbell', 'horizontalPull', true],
  ['cable-row', t('Kabelrudern (sitzend)'), ['upperBack', 'lats'], ['biceps'], 'cable', 'horizontalPull', true],
  ['machine-row', t('Rudermaschine'), ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['chest-supported-row', t('Rudern (brustgestützt)'), ['upperBack'], ['lats', 'biceps'], 'machine', 'horizontalPull', true],
  ['smith-row', t('Rudern (Smith)'), ['upperBack', 'lats'], ['biceps'], 'smith', 'horizontalPull', true],
  ['straight-arm-pulldown', t('Latzug mit geraden Armen (Kabel)'), ['lats'], [], 'cable', 'isolation', false],
  ['db-shrug', t('Shrugs (Kurzhantel)'), ['traps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['bb-shrug', t('Shrugs (Langhantel)'), ['traps'], ['forearms'], 'barbell', 'isolation', false],
  ['machine-shrug', t('Shrugs (Maschine)'), ['traps'], [], 'machine', 'isolation', false],
  ['back-extension', t('Rückenstrecker'), ['lowerBack'], ['glutes', 'hamstrings'], 'bodyweight', 'hinge', false],
  // Bizeps
  ['bb-curl', 'Langhantel-Curl', ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['db-curl', 'Kurzhantel-Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['incline-db-curl', t('Schrägbank-Curl'), ['biceps'], [], 'dumbbell', 'isolation', false],
  ['hammer-curl', 'Hammer-Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['cable-curl', 'Kabel-Curl', ['biceps'], [], 'cable', 'isolation', false],
  ['preacher-curl', t('Preacher Curl (Maschine)'), ['biceps'], [], 'machine', 'isolation', false],
  ['bayesian-curl', t('Bayesian Curl (Kabel)'), ['biceps'], [], 'cable', 'isolation', false],
  // Trizeps
  ['cable-pushdown', t('Trizepsdrücken (Stange, Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['rope-pushdown', t('Trizepsdrücken (Seilgriff, Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['overhead-cable-ext', t('Overhead-Extension (Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['db-overhead-ext', t('Overhead-Extension (Kurzhantel)'), ['triceps'], [], 'dumbbell', 'isolation', false],
  ['skullcrusher', 'Skullcrusher', ['triceps'], [], 'barbell', 'isolation', false],
  ['dips-tri', t('Dips (Trizeps)'), ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'verticalPush', true],
  ['close-grip-bench', t('Enges Bankdrücken'), ['triceps'], ['chest', 'frontDelts'], 'barbell', 'horizontalPush', true],
  ['machine-tri', t('Trizepsmaschine'), ['triceps'], [], 'machine', 'isolation', false],
  // Unterarme
  ['wrist-curl', 'Handgelenk-Curl', ['forearms'], [], 'dumbbell', 'isolation', false],
  ['reverse-curl', 'Reverse-Curl', ['forearms'], ['biceps'], 'barbell', 'isolation', false],
  // Beine
  ['bb-squat', t('Kniebeuge (Langhantel)'), ['quads', 'glutes'], ['adductors', 'abs'], 'barbell', 'squat', true],
  ['front-squat', t('Frontkniebeuge'), ['quads'], ['glutes', 'abs'], 'barbell', 'squat', true],
  ['smith-squat', t('Kniebeuge (Smith)'), ['quads', 'glutes'], ['adductors'], 'smith', 'squat', true],
  ['hack-squat', 'Hackenschmidt-Kniebeuge', ['quads'], ['glutes'], 'machine', 'squat', true],
  ['leg-press', t('Beinpresse'), ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['goblet-squat', 'Goblet Squat', ['quads'], ['glutes'], 'dumbbell', 'squat', true],
  ['bulgarian', 'Bulgarian Split Squat', ['quads', 'glutes'], ['adductors'], 'dumbbell', 'lunge', true],
  ['walking-lunge', t('Ausfallschritte (Kurzhantel)'), ['quads', 'glutes'], ['adductors'], 'dumbbell', 'lunge', true],
  ['leg-ext', t('Beinstrecker'), ['quads'], [], 'machine', 'isolation', false],
  ['rdl', t('Rumänisches Kreuzheben'), ['hamstrings', 'glutes'], ['lowerBack'], 'barbell', 'hinge', true],
  ['db-rdl', t('Rumänisches Kreuzheben (Kurzhantel)'), ['hamstrings', 'glutes'], ['lowerBack'], 'dumbbell', 'hinge', true],
  ['deadlift', t('Kreuzheben'), ['hamstrings', 'glutes', 'upperBack'], ['traps', 'forearms', 'quads', 'lowerBack'], 'barbell', 'hinge', true],
  ['lying-leg-curl', t('Beinbeuger (liegend)'), ['hamstrings'], [], 'machine', 'isolation', false],
  ['seated-leg-curl', t('Beinbeuger (sitzend)'), ['hamstrings'], [], 'machine', 'isolation', false],
  ['hip-thrust', t('Hip Thrust (Langhantel)'), ['glutes'], ['hamstrings'], 'barbell', 'hinge', true],
  ['machine-hip-thrust', t('Hip Thrust (Maschine, Gewichtsscheiben)'), ['glutes'], ['hamstrings'], 'machine', 'hinge', true],
  ['cable-kickback', t('Glute Kickback (Kabel)'), ['glutes'], [], 'cable', 'isolation', false],
  ['hip-abduction', 'Abduktoren-Maschine', ['abductors'], ['glutes'], 'machine', 'isolation', false],
  ['hip-adduction', 'Adduktoren-Maschine', ['adductors'], [], 'machine', 'isolation', false],
  ['standing-calf', t('Wadenheben (stehend)'), ['calves'], [], 'machine', 'isolation', false],
  ['seated-calf', t('Wadenheben (sitzend)'), ['calves'], [], 'machine', 'isolation', false],
  ['leg-press-calf', t('Wadenheben (Beinpresse)'), ['calves'], [], 'machine', 'isolation', false],
  ['smith-calf', t('Wadenheben (Smith)'), ['calves'], [], 'smith', 'isolation', false],
  // Core
  ['cable-crunch', 'Kabel-Crunch', ['abs'], [], 'cable', 'core', false],
  ['hanging-leg-raise', t('Beinheben (hängend)'), ['abs'], ['forearms'], 'bodyweight', 'core', false],
  ['ab-wheel', 'Ab Wheel', ['abs'], [], 'bodyweight', 'core', false],
  ['machine-crunch', 'Crunch-Maschine', ['abs'], [], 'machine', 'core', false],
  ['plank', 'Plank', ['abs'], [], 'bodyweight', 'core', false],

  // --- Erweiterung: Brust
  ['low-incline-db', t('Flaches Schrägbankdrücken (Kurzhantel)'), ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['decline-bb', t('Negativbankdrücken (Langhantel)'), ['chest'], ['triceps'], 'barbell', 'horizontalPush', true],
  ['decline-machine', t('Negativpresse (Maschine)'), ['chest'], ['triceps'], 'machine', 'horizontalPush', true],
  ['cable-crossover-high', t('Kabelzug Crossover (oben)'), ['chest'], [], 'cable', 'isolation', false],
  ['incline-cable-fly', t('Schräg-Fly (Kabel)'), ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['db-pullover', t('Pullover (Kurzhantel)'), ['chest', 'lats'], ['triceps'], 'dumbbell', 'isolation', false],
  ['band-pushup', t('Liegestütze (Band)'), ['chest'], ['triceps', 'frontDelts'], 'band', 'horizontalPush', true],
  ['band-chest-fly', t('Brust-Fly (Band)'), ['chest'], [], 'band', 'isolation', false],
  ['kb-floor-press', 'Floor Press (Kettlebell)', ['chest'], ['triceps'], 'kettlebell', 'horizontalPush', true],
  ['svend-press', 'Svend Press', ['chest'], [], 'dumbbell', 'isolation', false],
  // Schultern
  ['arnold-press', 'Arnold Press', ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['seated-db-ohp', t('Schulterdrücken sitzend (Kurzhantel)'), ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['landmine-press', 'Landmine Press', ['frontDelts', 'sideDelts'], ['chest', 'triceps'], 'barbell', 'verticalPush', true],
  ['push-press', 'Push Press', ['frontDelts', 'sideDelts'], ['triceps', 'quads'], 'barbell', 'verticalPush', true],
  ['kb-ohp', t('Schulterdrücken (Kettlebell)'), ['frontDelts', 'sideDelts'], ['triceps', 'abs'], 'kettlebell', 'verticalPush', true],
  ['band-lateral', t('Seitheben (Band)'), ['sideDelts'], [], 'band', 'isolation', false],
  ['cable-front-raise', t('Frontheben (Kabel)'), ['frontDelts'], [], 'cable', 'isolation', false],
  ['db-front-raise', t('Frontheben (Kurzhantel)'), ['frontDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-rear-delt', t('Reverse Fly (Kabel)'), ['rearDelts'], ['upperBack'], 'cable', 'isolation', false],
  ['band-pull-apart', 'Band Pull-Apart', ['rearDelts'], ['upperBack'], 'band', 'isolation', false],
  ['upright-row', t('Aufrechtes Rudern (Kabel)'), ['sideDelts'], ['traps', 'biceps'], 'cable', 'verticalPull', false],
  ['pike-pushup', t('Pike-Liegestütze'), ['frontDelts', 'sideDelts'], ['triceps'], 'bodyweight', 'verticalPush', true],
  // Rücken
  ['t-bar-row', 'T-Bar-Rudern', ['upperBack', 'lats'], ['biceps'], 'barbell', 'horizontalPull', true],
  ['pendlay-row', 'Pendlay Row', ['upperBack', 'lats'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['seal-row', 'Seal Row', ['upperBack'], ['lats', 'biceps'], 'barbell', 'horizontalPull', true],
  ['chest-supported-db-row', t('Rudern brustgestützt (Kurzhantel)'), ['upperBack'], ['lats', 'biceps'], 'dumbbell', 'horizontalPull', true],
  ['single-arm-cable-row', t('Einarmiges Kabelrudern'), ['lats', 'upperBack'], ['biceps'], 'cable', 'horizontalPull', true],
  ['high-row-machine', t('High Row (Maschine)'), ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['single-arm-pulldown', t('Einarmiger Latzug (Kabel)'), ['lats'], ['biceps'], 'cable', 'verticalPull', true],
  ['wide-grip-pullup', t('Klimmzüge (weiter Griff)'), ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['neutral-pullup', t('Klimmzüge (neutraler Griff)'), ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['inverted-row', 'Australian Pull-ups', ['upperBack', 'lats'], ['biceps'], 'bodyweight', 'horizontalPull', true],
  ['band-row', t('Rudern (Band)'), ['upperBack', 'lats'], ['biceps'], 'band', 'horizontalPull', true],
  ['band-pulldown', t('Latzug (Band)'), ['lats'], ['biceps'], 'band', 'verticalPull', true],
  ['kb-row', t('Rudern (Kettlebell)'), ['lats', 'upperBack'], ['biceps'], 'kettlebell', 'horizontalPull', true],
  ['cable-shrug', t('Shrugs (Kabel)'), ['traps'], [], 'cable', 'isolation', false],
  ['smith-shrug', 'Shrugs (Smith)', ['traps'], ['forearms'], 'smith', 'isolation', false],
  ['rack-pull', 'Rack Pull', ['upperBack', 'traps'], ['glutes', 'hamstrings', 'forearms', 'lowerBack'], 'barbell', 'hinge', true],
  ['reverse-hyper', 'Reverse Hyperextension', ['glutes'], ['hamstrings', 'lowerBack'], 'machine', 'hinge', false],
  ['machine-back-ext', t('Rückenstrecker (Maschine)'), ['lowerBack'], ['glutes'], 'machine', 'hinge', false],
  // Bizeps
  ['ez-curl', 'SZ-Stangen-Curl', ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['spider-curl', 'Spider Curl', ['biceps'], [], 'dumbbell', 'isolation', false],
  ['concentration-curl', 'Konzentrations-Curl', ['biceps'], [], 'dumbbell', 'isolation', false],
  ['cable-hammer-curl', t('Hammer-Curl (Kabel-Seil)'), ['biceps'], ['forearms'], 'cable', 'isolation', false],
  ['cable-preacher', t('Preacher Curl (Kabel)'), ['biceps'], [], 'cable', 'isolation', false],
  ['band-curl', 'Curl (Band)', ['biceps'], [], 'band', 'isolation', false],
  ['kb-curl', 'Curl (Kettlebell)', ['biceps'], ['forearms'], 'kettlebell', 'isolation', false],
  ['zottman-curl', 'Zottman Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  // Trizeps
  ['ez-skullcrusher', t('Skullcrusher (SZ-Stange)'), ['triceps'], [], 'barbell', 'isolation', false],
  ['db-skullcrusher', t('Skullcrusher (Kurzhantel)'), ['triceps'], [], 'dumbbell', 'isolation', false],
  ['cable-kickback-tri', t('Trizeps-Kickback (Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['db-kickback', t('Trizeps-Kickback (Kurzhantel)'), ['triceps'], [], 'dumbbell', 'isolation', false],
  ['single-arm-pushdown', t('Einarmiges Trizepsdrücken (Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['band-pushdown', t('Trizepsdrücken (Band)'), ['triceps'], [], 'band', 'isolation', false],
  ['smith-close-grip', t('Enges Bankdrücken (Smith)'), ['triceps'], ['chest', 'frontDelts'], 'smith', 'horizontalPush', true],
  ['diamond-pushup', t('Diamond-Liegestütze'), ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['bench-dip', t('Bankdrücken Dips (Bank)'), ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'verticalPush', false],
  // Unterarme
  ['reverse-wrist-curl', 'Reverse Wrist Curl', ['forearms'], [], 'dumbbell', 'isolation', false],
  ['farmers-carry', 'Farmer\'s Walk', ['forearms'], ['traps', 'abs'], 'dumbbell', 'isolation', false],
  ['cable-wrist-curl', t('Handgelenk-Curl (Kabel)'), ['forearms'], [], 'cable', 'isolation', false],
  ['dead-hang', 'Dead Hang', ['forearms'], ['lats'], 'bodyweight', 'isolation', false],
  // Beine
  ['box-squat', 'Box Squat', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'barbell', 'squat', true],
  ['pause-squat', t('Kniebeuge mit Pause'), ['quads', 'glutes'], ['adductors', 'abs'], 'barbell', 'squat', true],
  ['sumo-deadlift', 'Sumo-Kreuzheben', ['glutes', 'adductors', 'hamstrings'], ['quads', 'lowerBack'], 'barbell', 'hinge', true],
  ['trap-bar-deadlift', 'Trap-Bar-Kreuzheben', ['quads', 'glutes', 'hamstrings'], ['traps', 'lowerBack'], 'barbell', 'hinge', true],
  ['good-morning', 'Good Morning', ['lowerBack', 'hamstrings', 'glutes'], [], 'barbell', 'hinge', true],
  ['smith-rdl', t('Rumänisches Kreuzheben (Smith)'), ['hamstrings', 'glutes'], ['lowerBack'], 'smith', 'hinge', true],
  ['stiff-leg-deadlift', t('Gestrecktes Kreuzheben'), ['hamstrings'], ['glutes', 'lowerBack'], 'barbell', 'hinge', true],
  ['nordic-curl', 'Nordic Curl', ['hamstrings'], [], 'bodyweight', 'isolation', false],
  ['standing-leg-curl', t('Beinbeuger (stehend, Maschine)'), ['hamstrings'], [], 'machine', 'isolation', false],
  ['cable-leg-curl', t('Beinbeuger (Kabel)'), ['hamstrings'], [], 'cable', 'isolation', false],
  ['band-leg-curl', t('Beinbeuger (Band)'), ['hamstrings'], [], 'band', 'isolation', false],
  ['pendulum-squat', 'Pendulum Squat', ['quads'], ['glutes'], 'machine', 'squat', true],
  ['belt-squat', 'Belt Squat', ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['sissy-squat', 'Sissy Squat', ['quads'], [], 'bodyweight', 'squat', false],
  ['step-up', t('Step-ups (Kurzhantel)'), ['quads', 'glutes'], [], 'dumbbell', 'lunge', true],
  ['reverse-lunge', t('Reverse Lunge (Langhantel)'), ['quads', 'glutes'], ['adductors'], 'barbell', 'lunge', true],
  ['smith-split-squat', 'Split Squat (Smith)', ['quads', 'glutes'], ['adductors'], 'smith', 'lunge', true],
  ['cossack-squat', 'Cossack Squat', ['adductors', 'quads'], ['glutes'], 'bodyweight', 'lunge', false],
  ['kb-goblet-squat', 'Goblet Squat (Kettlebell)', ['quads'], ['glutes', 'abs'], 'kettlebell', 'squat', true],
  ['kb-swing', 'Kettlebell Swing', ['glutes', 'hamstrings'], ['abs', 'forearms'], 'kettlebell', 'hinge', true],
  ['single-leg-rdl', t('Einbeiniges Rumänisches Kreuzheben'), ['hamstrings', 'glutes'], ['abs'], 'dumbbell', 'hinge', true],
  ['glute-bridge', 'Glute Bridge', ['glutes'], ['hamstrings'], 'bodyweight', 'hinge', false],
  ['db-hip-thrust', t('Hip Thrust (Kurzhantel)'), ['glutes'], ['hamstrings'], 'dumbbell', 'hinge', true],
  ['smith-hip-thrust', 'Hip Thrust (Smith)', ['glutes'], ['hamstrings'], 'smith', 'hinge', true],
  ['band-hip-thrust', 'Hip Thrust (Band)', ['glutes'], [], 'band', 'hinge', false],
  ['cable-pull-through', t('Pull-Through (Kabel)'), ['glutes', 'hamstrings'], [], 'cable', 'hinge', false],
  ['machine-glute-kickback', t('Glute Kickback (Maschine)'), ['glutes'], [], 'machine', 'isolation', false],
  ['band-abduction', t('Abduktion (Band)'), ['abductors'], ['glutes'], 'band', 'isolation', false],
  ['cable-hip-abduction', t('Hüftabduktion (Kabel)'), ['abductors'], ['glutes'], 'cable', 'isolation', false],
  ['cable-hip-adduction', t('Hüftadduktion (Kabel)'), ['adductors'], [], 'cable', 'isolation', false],
  ['copenhagen-plank', 'Copenhagen Plank', ['adductors'], ['obliques'], 'bodyweight', 'core', false],
  ['db-calf-raise', t('Wadenheben einbeinig (Kurzhantel)'), ['calves'], [], 'dumbbell', 'isolation', false],
  ['bodyweight-calf', t('Wadenheben (Körpergewicht)'), ['calves'], [], 'bodyweight', 'isolation', false],
  ['donkey-calf', 'Donkey Calf Raise', ['calves'], [], 'machine', 'isolation', false],
  // Core
  ['cable-woodchop', t('Woodchopper (Kabel)'), ['obliques'], ['abs'], 'cable', 'core', false],
  ['pallof-press', 'Pallof Press', ['obliques'], ['abs'], 'cable', 'core', false],
  ['decline-situp', t('Sit-ups (Negativbank)'), ['abs'], [], 'bodyweight', 'core', false],
  ['captains-chair', t('Beinheben (Captain\'s Chair)'), ['abs'], [], 'machine', 'core', false],
  ['dead-bug', 'Dead Bug', ['abs'], [], 'bodyweight', 'core', false],
  ['side-plank', t('Seitstütz'), ['obliques'], ['abductors'], 'bodyweight', 'core', false],
  ['russian-twist', 'Russian Twist', ['obliques'], ['abs'], 'dumbbell', 'core', false],
  ['band-crunch', 'Crunch (Band)', ['abs'], [], 'band', 'core', false],
  ['kb-windmill', 'Windmill (Kettlebell)', ['obliques'], ['sideDelts', 'glutes'], 'kettlebell', 'core', false],
  ['suitcase-carry', 'Suitcase Carry', ['obliques'], ['forearms', 'traps'], 'kettlebell', 'core', false],
  // Erweiterung: feinere Muskelgruppen
  ['superman', 'Superman', ['lowerBack'], ['glutes'], 'bodyweight', 'hinge', false],
  ['weighted-hyperextension', t('Rückenstrecker (Kurzhantel)'), ['lowerBack'], ['glutes', 'hamstrings'], 'dumbbell', 'hinge', false],
  ['neck-curl-plate', t('Nackenbeugen (Hantelscheibe)'), ['neck'], [], 'dumbbell', 'isolation', false],
  ['neck-extension-machine', t('Nackenstrecker (Maschine)'), ['neck'], ['traps'], 'machine', 'isolation', false],
  ['neck-band-extension', t('Nackenstrecken (Band)'), ['neck'], [], 'band', 'isolation', false],
  ['neck-lateral-band', t('Seitliche Nackenbeugen (Band)'), ['neck'], [], 'band', 'isolation', false],
  ['scapular-pushup', 'Scapular Push-ups', ['serratus'], ['chest'], 'bodyweight', 'isolation', false],
  ['cable-serratus-punch', t('Serratus Punch (Kabel)'), ['serratus'], ['frontDelts'], 'cable', 'isolation', false],
  ['band-serratus-punch', 'Serratus Punch (Band)', ['serratus'], ['frontDelts'], 'band', 'isolation', false],
  ['db-serratus-press', t('Serratus Press (Kurzhantel)'), ['serratus'], ['chest', 'frontDelts'], 'dumbbell', 'isolation', false],
  ['wall-slide', 'Wall Slides', ['serratus'], ['rearDelts'], 'bodyweight', 'isolation', false],
  ['tibialis-raise', t('Tibialis Raise (Körpergewicht)'), ['tibialis'], [], 'bodyweight', 'isolation', false],
  ['tibialis-machine', t('Schienbeinheben (Maschine)'), ['tibialis'], [], 'machine', 'isolation', false],
  ['db-tibialis-raise', t('Schienbeinheben (Kurzhantel)'), ['tibialis'], [], 'dumbbell', 'isolation', false],
  ['band-tibialis', t('Schienbeinheben (Band)'), ['tibialis'], [], 'band', 'isolation', false],
  ['cable-side-bend', t('Seitbeugen (Kabel)'), ['obliques'], ['abs'], 'cable', 'core', false],
  ['db-side-bend', t('Seitbeugen (Kurzhantel)'), ['obliques'], ['abs'], 'dumbbell', 'core', false],
  ['bicycle-crunch', 'Fahrrad-Crunch', ['obliques'], ['abs'], 'bodyweight', 'core', false],
  // Ergänzt aus free-exercise-db-with-videos (ID = Repo-Slug, Bilder siehe data/media)
  ['decline-dumbbell-bench-press-45-degree', t('Negativ-Bankdrücken (Kurzhantel)'), ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-decline-fly-45-degree-1', t('Negativ-Fliegende (Kurzhantel)'), ['chest'], ['frontDelts'], 'dumbbell', 'isolation', false],
  ['dumbbell-incline-fly', t('Schräg-Fliegende (Kurzhantel)'), ['chest'], ['frontDelts'], 'dumbbell', 'isolation', false],
  ['dumbbell-lying-hammer-press', t('Hammer-Bankdrücken (Kurzhantel)'), ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-incline-hammer-press', t('Schräges Hammerdrücken (Kurzhantel)'), ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['cable-lying-fly-flat-bench-cable-fly', t('Kabel-Fly (Flachbank)'), ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['incline-push-ups', t('Schräge Liegestütze (Hände erhöht)'), ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['deep-push-ups', t('Tiefe Liegestütze'), ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['dumbbell-seated-lateral-raise', t('Seitheben sitzend (Kurzhantel)'), ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-one-arm-lateral-raise', t('Einarmiges Seitheben (Kurzhantel)'), ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-one-arm-lateral-raise', t('Einarmiges Seitheben (Kabel)'), ['sideDelts'], [], 'cable', 'isolation', false],
  ['dumbbell-seated-front-raise', t('Frontheben sitzend (Kurzhantel)'), ['frontDelts'], [], 'dumbbell', 'isolation', false],
  ['barbell-front-raise', t('Frontheben (Langhantel)'), ['frontDelts'], [], 'barbell', 'isolation', false],
  ['dumbbell-upright-row', t('Aufrechtes Rudern (Kurzhantel)'), ['sideDelts'], ['traps', 'biceps'], 'dumbbell', 'verticalPull', true],
  ['dumbbell-rear-delt-row', t('Rudern für hintere Schulter (Kurzhantel)'), ['rearDelts'], ['upperBack', 'traps'], 'dumbbell', 'horizontalPull', true],
  ['barbell-underhand-bent-over-row', t('Langhantelrudern (Untergriff)'), ['lats', 'upperBack'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['cable-seated-row-wide-grip', t('Rudern am Kabel (weiter Griff)'), ['upperBack'], ['rearDelts', 'biceps', 'lats'], 'cable', 'horizontalPull', true],
  ['cable-seated-high-row-v-bar', t('Hohes Rudern am Kabel (V-Griff)'), ['lats', 'upperBack'], ['biceps', 'rearDelts'], 'cable', 'horizontalPull', true],
  ['cable-bar-lateral-pulldown-reverse-grip', t('Latzug (Untergriff)'), ['lats'], ['biceps', 'upperBack'], 'cable', 'verticalPull', true],
  ['reverse-grip-machine-lat-pulldown', t('Latzug (Maschine, Untergriff)'), ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['reverse-grip-pull-up', t('Klimmzüge (Untergriff)'), ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['chin-ups-narrow-parallel-grip', t('Klimmzüge (enger Parallelgriff)'), ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['dumbbell-incline-row', t('Schrägbank-Rudern (Kurzhantel)'), ['upperBack'], ['biceps', 'rearDelts'], 'dumbbell', 'horizontalPull', true],
  ['lever-reverse-t-bar-row', t('T-Bar-Rudern (Maschine, Untergriff)'), ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['dumbbell-incline-shrug', t('Schulterheben Schrägbank (Kurzhantel)'), ['traps'], [], 'dumbbell', 'isolation', false],
  ['barbell-drag-curl', t('Drag-Curl (Langhantel)'), ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['cable-one-arm-curl', t('Einarmiger Kabel-Curl'), ['biceps'], ['forearms'], 'cable', 'isolation', false],
  ['dumbbell-incline-hammer-curl', t('Schräg-Hammer-Curl (Kurzhantel)'), ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-alternate-seated-biceps-curl', t('Wechselnder Curl sitzend (Kurzhantel)'), ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-seated-preacher-curl', t('Preacher-Curl (Kurzhantel)'), ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-prone-incline-curl', t('Curl in Bauchlage auf Schrägbank (Kurzhantel)'), ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['cable-lying-triceps-extension', t('Trizepsstrecken liegend (Kabel)'), ['triceps'], [], 'cable', 'isolation', false],
  ['dumbbell-incline-triceps-extension', t('Trizepsstrecken Schrägbank (Kurzhantel)'), ['triceps'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-one-arm-triceps-extension', t('Einarmiges Trizepsstrecken (Kurzhantel)'), ['triceps'], [], 'dumbbell', 'isolation', false],
  ['band-overhead-triceps-extension', t('Trizepsstrecken über Kopf (Band)'), ['triceps'], [], 'band', 'isolation', false],
  ['lever-seated-dips', t('Dips (Maschine, sitzend)'), ['triceps'], ['chest', 'frontDelts'], 'machine', 'verticalPush', true],
  ['dumbbell-close-grip-press', t('Enges Drücken (Kurzhantel)'), ['triceps'], ['chest', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-squat', t('Kniebeuge (Kurzhantel)'), ['quads', 'glutes'], ['hamstrings'], 'dumbbell', 'squat', true],
  ['dumbbell-bar-grip-sumo-squat', t('Sumo-Kniebeuge (Kurzhantel)'), ['quads', 'glutes'], ['adductors'], 'dumbbell', 'squat', true],
  ['dumbbell-single-leg-squat', t('Einbeinige Kniebeuge (Kurzhantel)'), ['quads', 'glutes'], ['hamstrings'], 'dumbbell', 'squat', true],
  ['squat', t('Kniebeuge (Körpergewicht)'), ['quads', 'glutes'], ['hamstrings'], 'bodyweight', 'squat', true],
  ['close-feet-leg-press', t('Beinpresse (enger Stand)'), ['quads'], ['glutes'], 'machine', 'squat', true],
  ['sled-45-degree-leg-wide-press', t('Beinpresse 45° (weiter Stand)'), ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['barbell-lunge', t('Ausfallschritte (Langhantel)'), ['quads', 'glutes'], ['hamstrings'], 'barbell', 'lunge', true],
  ['dumbbell-deadlift', t('Kreuzheben (Kurzhantel)'), ['glutes', 'hamstrings'], ['lowerBack'], 'dumbbell', 'hinge', true],
  ['kettlebell-deadlift', t('Kreuzheben (Kettlebell)'), ['glutes', 'hamstrings'], ['lowerBack'], 'kettlebell', 'hinge', true],
  ['dumbbell-lying-femoral', t('Beincurl liegend (Kurzhantel)'), ['hamstrings'], ['calves'], 'dumbbell', 'isolation', false],
  ['lever-kneeling-leg-curl', t('Beincurl kniend (Maschine)'), ['hamstrings'], [], 'machine', 'isolation', false],
  ['lever-standing-hip-extension', t('Hüftstrecken stehend (Maschine)'), ['glutes'], ['hamstrings'], 'machine', 'isolation', false],
  ['band-pull-through', 'Pull-Through (Band)', ['glutes'], ['hamstrings', 'lowerBack'], 'band', 'hinge', true],
  ['band-hip-adduction', t('Adduktion (Band)'), ['adductors'], [], 'band', 'isolation', false],
  ['dumbbell-seated-calf-raise', t('Wadenheben sitzend (Kurzhantel)'), ['calves'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-single-leg-calf-raise', t('Einbeiniges Wadenheben (Kurzhantel)'), ['calves'], [], 'dumbbell', 'isolation', false],
  ['sit-ups', 'Sit-ups', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['v-up', 'V-Ups', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['lying-floor-leg-raise', t('Beinheben liegend'), ['abs'], [], 'bodyweight', 'core', false],
  ['vertical-leg-raise-on-parallel-bars', t('Beinheben am Barren'), ['abs'], [], 'bodyweight', 'core', false],
  ['hanging-leg-hip-raise', t('Hängendes Beinheben mit Hüftbeuge'), ['abs'], [], 'bodyweight', 'core', false],
  ['twisting-crunch', t('Crunch mit Drehung'), ['obliques'], ['abs'], 'bodyweight', 'core', false],
  ['crunch-on-bench', t('Bankcrunch'), ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['sit-up-on-exercise-ball', t('Sit-ups auf dem Gymnastikball'), ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['cable-standing-crunch', t('Cable Crunch stehend'), ['abs'], ['obliques'], 'cable', 'core', false],
]

/** Übungen, bei denen das eingetragene Gewicht eine Unterstützung ist (weniger Gewicht = schwerer). */
const ASSISTED = new Set(['assisted-pullup'])

/**
 * Körpergewichtsanteil je Übung (bewegter Anteil des Körpergewichts). Eigene Heuristiken: Liegestütz ≈ 64 % in der
 * oberen Position (Ebben et al. 2011, Bodenreaktionskraft), Hände erhöht weniger; Klimmzug/Dip: ganzer Körper ohne
 * Unterarme und Hände (anthropometrische Segmentanteile nach Dempster/Winter); Kniebeuge/Ausfallschritt ohne
 * Unterschenkel und Füße; Rückenstrecker/Nordic Curl nur der Oberkörper bzw. Körper oberhalb der Knie.
 * Rumpfübungen (außer hängendem Beinheben) bleiben bei reiner Wiederholungs-Progression.
 */
export const BODYWEIGHT_SHARE: Record<string, number> = {
  pushup: 0.64, 'diamond-pushup': 0.64, 'deep-push-ups': 0.66, 'incline-push-ups': 0.45, 'pike-pushup': 0.7,
  'dips-chest': 0.95, 'dips-tri': 0.95, 'bench-dip': 0.55,
  pullup: 0.95, chinup: 0.95, 'wide-grip-pullup': 0.95, 'neutral-pullup': 0.95, 'reverse-grip-pull-up': 0.95,
  'chin-ups-narrow-parallel-grip': 0.95, 'inverted-row': 0.6,
  squat: 0.85, 'sissy-squat': 0.85, 'cossack-squat': 0.85,
  'back-extension': 0.6, 'nordic-curl': 0.7, 'glute-bridge': 0.5, 'bodyweight-calf': 0.95,
  'hanging-leg-raise': 0.35,
}

/** Zeitbasierte Übungen (Halten/Tragen): kein Wiederholungs-Range, der Generator plant sie nur auf ausdrücklichen Wunsch ein. */
export const TIME_BASED = new Set(['plank', 'side-plank', 'copenhagen-plank', 'dead-hang', 'suitcase-carry', 'farmers-carry'])

/**
 * Lastart bei Kurzhantel und Kettlebell. Default aus dem Equipment: Kurzhantel = je Seite (zwei Hanteln bzw. beide Seiten),
 * Kettlebell = ein Gerät. Ausnahmen stehen hier ausdrücklich (ein Gerät mit beiden Händen bzw. Kettlebell einarmig je Seite).
 */
const LOAD_SINGLE = new Set([
  'goblet-squat', 'db-overhead-ext', 'db-pullover', 'svend-press', 'neck-curl-plate', 'russian-twist', 'db-side-bend',
  'db-hip-thrust', 'dumbbell-bar-grip-sumo-squat', 'dumbbell-lying-femoral', 'db-tibialis-raise', 'dumbbell-seated-calf-raise',
])
const LOAD_PER_SIDE = new Set(['kb-floor-press', 'kb-ohp', 'kb-row', 'kb-curl', 'kb-windmill', 'suitcase-carry'])

/** Einseitige Übungen (eine Seite nach der anderen): links/rechts standardmäßig getrennt erfassen. Wechselnde Ausfallschritte nicht. */
export const UNILATERAL = new Set([
  'db-row', 'single-arm-cable-row', 'single-arm-pulldown', 'concentration-curl', 'cable-one-arm-curl', 'single-arm-pushdown',
  'cable-kickback-tri', 'dumbbell-one-arm-triceps-extension', 'dumbbell-one-arm-lateral-raise', 'cable-one-arm-lateral-raise',
  'bulgarian', 'smith-split-squat', 'step-up', 'single-leg-rdl', 'dumbbell-single-leg-squat', 'db-calf-raise',
  'dumbbell-single-leg-calf-raise', 'cable-kickback', 'machine-glute-kickback', 'side-plank', 'copenhagen-plank',
  'suitcase-carry', 'kb-windmill',
])

const loadOf = (id: string, equipment: Equipment): Exercise['load'] => {
  if (equipment === 'dumbbell') return LOAD_SINGLE.has(id) ? 'single' : 'perSide'
  if (equipment === 'kettlebell') return LOAD_PER_SIDE.has(id) ? 'perSide' : 'single'
  return undefined
}

export const EXERCISES: Exercise[] = rows.map(([id, name, primary, secondary, equipment, pattern, compound]) => {
  const load = loadOf(id, equipment)
  return { id, name, primary, secondary, equipment, pattern, compound, ...(ASSISTED.has(id) ? { assisted: true } : {}), ...(load ? { load } : {}), ...(TIME_BASED.has(id) ? { metric: 'time' as const } : {}), ...(BODYWEIGHT_SHARE[id] ? { bodyweight: BODYWEIGHT_SHARE[id] } : {}), ...(UNILATERAL.has(id) ? { unilateral: true } : {}) }
})

const cardio = (id: string, name: string): Exercise => ({
  id, name, primary: [], secondary: [], equipment: 'cardio', pattern: 'cardio', compound: false, cardio: true,
})

export const CARDIO: Exercise[] = [
  cardio('c-treadmill', t('Laufband')),
  cardio('c-bike', t('Ergometer / Fahrrad')),
  cardio('c-elliptical', t('Crosstrainer')),
  cardio('c-rower', t('Rudergerät')),
  cardio('c-stairs', t('Stairmaster')),
  cardio('c-run', t('Laufen (draußen)')),
  cardio('c-walk', t('Gehen')),
  cardio('c-swim', t('Schwimmen')),
]

export const ALL_EXERCISES: Exercise[] = [...EXERCISES, ...CARDIO]

/** Zusätzliche Suchbegriffe (Alltagsnamen und Varianten), damit Übungen auch unter anderen Bezeichnungen gefunden werden. */
const SEARCH_ALIASES: Record<string, string> = {
  'cable-fly': 'kabelzug fly horizontal brusthöhe crossover brust',
  'pec-deck': 'fly butterfly brustmaschine brust maschine',
  'reverse-pec-deck': 'reverse fly butterfly hintere schulter maschine',
  'straight-arm-pulldown': 'latzug gerade arme gestreckte arme stange straight arm pulldown',
  'single-arm-pushdown': 'trizepsdrücken pushdown einarmig kabelzug',
  'band-pushdown': 'trizepsdrücken pushdown band',
  'rope-pushdown': 'trizepsdrücken seilgriff seil pushdown trizeps kabelzug',
  'cable-pushdown': 'trizepsdrücken stange pushdown trizeps kabelzug',
  'machine-hip-thrust': 'hip thrust gewichtsscheiben scheiben plate loaded maschine hüftheben',
  'bb-ohp': 'schulterdrücken langhantel military press überkopfdrücken',
  'bb-ohp-close': 'schulterdrücken langhantel enger griff schmaler griff',
  'bb-ohp-wide': 'schulterdrücken langhantel breiter griff weiter griff',
}

/** Text, in dem die Suche nach einer Übung sucht: Name plus Alias-Begriffe (klein geschrieben). */
export const searchText = (e: { id: string; name: string }) => `${e.name} ${SEARCH_ALIASES[e.id] ?? ''}`.toLowerCase()

export const exerciseById = (id: string, custom: Exercise[] = []) =>
  ALL_EXERCISES.find((e) => e.id === id) ?? custom.find((e) => e.id === id)

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: t('Langhantel'), dumbbell: t('Kurzhantel'), cable: t('Kabel'), machine: t('Maschine'),
  bodyweight: t('Körpergewicht'), smith: t('Smith'), band: 'Band', kettlebell: 'Kettlebell', cardio: 'Cardio',
}
