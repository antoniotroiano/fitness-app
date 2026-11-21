import type { Equipment, Exercise, MuscleId, Pattern } from '../types'

type Row = [string, string, MuscleId[], MuscleId[], Equipment, Pattern, boolean]

const rows: Row[] = [
  // Brust
  ['bb-bench', 'Bankdrücken (Langhantel)', ['chest'], ['triceps', 'frontDelts'], 'barbell', 'horizontalPush', true],
  ['bb-incline', 'Schrägbankdrücken (Langhantel)', ['chest'], ['frontDelts', 'triceps'], 'barbell', 'horizontalPush', true],
  ['db-bench', 'Bankdrücken (Kurzhantel)', ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['db-incline', 'Schrägbankdrücken (Kurzhantel)', ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['smith-bench', 'Bankdrücken (Smith)', ['chest'], ['triceps', 'frontDelts'], 'smith', 'horizontalPush', true],
  ['smith-incline', 'Schrägbankdrücken (Smith)', ['chest'], ['frontDelts', 'triceps'], 'smith', 'horizontalPush', true],
  ['machine-chest', 'Brustpresse (Maschine)', ['chest'], ['triceps', 'frontDelts'], 'machine', 'horizontalPush', true],
  ['machine-incline-chest', 'Schrägbrustpresse (Maschine)', ['chest'], ['frontDelts', 'triceps'], 'machine', 'horizontalPush', true],
  ['pec-deck', 'Pec-Deck-Fly (Butterfly)', ['chest'], [], 'machine', 'isolation', false],
  ['cable-fly', 'Kabel-Fly (horizontal)', ['chest'], [], 'cable', 'isolation', false],
  ['cable-fly-low', 'Kabel-Fly von unten', ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['db-fly', 'Fliegende (Kurzhantel)', ['chest'], [], 'dumbbell', 'isolation', false],
  ['pushup', 'Liegestütze', ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['dips-chest', 'Dips (Brust)', ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  // Schultern
  ['bb-ohp', 'Schulterdrücken stehend (Langhantel)', ['frontDelts', 'sideDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['db-ohp', 'Schulterdrücken (Kurzhantel)', ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['machine-ohp', 'Schulterpresse (Maschine)', ['frontDelts', 'sideDelts'], ['triceps'], 'machine', 'verticalPush', true],
  ['smith-ohp', 'Schulterdrücken (Smith)', ['frontDelts', 'sideDelts'], ['triceps'], 'smith', 'verticalPush', true],
  ['bb-ohp-close', 'Schulterdrücken (Langhantel, enger Griff)', ['frontDelts', 'sideDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['bb-ohp-wide', 'Schulterdrücken (Langhantel, weiter Griff)', ['sideDelts', 'frontDelts'], ['triceps'], 'barbell', 'verticalPush', true],
  ['db-lateral', 'Seitheben (Kurzhantel)', ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-lateral', 'Seitheben (Kabel)', ['sideDelts'], [], 'cable', 'isolation', false],
  ['machine-lateral', 'Seitheben (Maschine)', ['sideDelts'], [], 'machine', 'isolation', false],
  ['reverse-pec-deck', 'Reverse Butterfly', ['rearDelts'], ['upperBack'], 'machine', 'isolation', false],
  ['face-pull', 'Face Pulls (Kabel)', ['rearDelts'], ['upperBack', 'traps'], 'cable', 'isolation', false],
  ['db-rear-delt', 'Reverse Fly (Kurzhantel)', ['rearDelts'], ['upperBack'], 'dumbbell', 'isolation', false],
  // Rücken
  ['pullup', 'Klimmzüge', ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['chinup', 'Chin-ups', ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['lat-pulldown', 'Latzug', ['lats'], ['biceps', 'upperBack'], 'cable', 'verticalPull', true],
  ['lat-pulldown-neutral', 'Latzug (enger neutraler Griff)', ['lats'], ['biceps'], 'cable', 'verticalPull', true],
  ['machine-pulldown', 'Latzug (Maschine)', ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['assisted-pullup', 'Klimmzüge (assistiert)', ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['bb-row', 'Langhantelrudern', ['upperBack', 'lats'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['db-row', 'Einarmiges Kurzhantelrudern', ['lats', 'upperBack'], ['biceps'], 'dumbbell', 'horizontalPull', true],
  ['cable-row', 'Kabelrudern (sitzend)', ['upperBack', 'lats'], ['biceps'], 'cable', 'horizontalPull', true],
  ['machine-row', 'Rudermaschine', ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['chest-supported-row', 'Rudern (brustgestützt)', ['upperBack'], ['lats', 'biceps'], 'machine', 'horizontalPull', true],
  ['smith-row', 'Rudern (Smith)', ['upperBack', 'lats'], ['biceps'], 'smith', 'horizontalPull', true],
  ['straight-arm-pulldown', 'Latzug mit geraden Armen (Kabel)', ['lats'], [], 'cable', 'isolation', false],
  ['db-shrug', 'Shrugs (Kurzhantel)', ['traps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['bb-shrug', 'Shrugs (Langhantel)', ['traps'], ['forearms'], 'barbell', 'isolation', false],
  ['machine-shrug', 'Shrugs (Maschine)', ['traps'], [], 'machine', 'isolation', false],
  ['back-extension', 'Rückenstrecker', ['lowerBack'], ['glutes', 'hamstrings'], 'bodyweight', 'hinge', false],
  // Bizeps
  ['bb-curl', 'Langhantel-Curl', ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['db-curl', 'Kurzhantel-Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['incline-db-curl', 'Schrägbank-Curl', ['biceps'], [], 'dumbbell', 'isolation', false],
  ['hammer-curl', 'Hammer-Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['cable-curl', 'Kabel-Curl', ['biceps'], [], 'cable', 'isolation', false],
  ['preacher-curl', 'Preacher Curl (Maschine)', ['biceps'], [], 'machine', 'isolation', false],
  ['bayesian-curl', 'Bayesian Curl (Kabel)', ['biceps'], [], 'cable', 'isolation', false],
  // Trizeps
  ['cable-pushdown', 'Trizepsdrücken (Stange, Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['rope-pushdown', 'Trizepsdrücken (Seilgriff, Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['overhead-cable-ext', 'Overhead-Extension (Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['db-overhead-ext', 'Overhead-Extension (Kurzhantel)', ['triceps'], [], 'dumbbell', 'isolation', false],
  ['skullcrusher', 'Skullcrusher', ['triceps'], [], 'barbell', 'isolation', false],
  ['dips-tri', 'Dips (Trizeps)', ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'verticalPush', true],
  ['close-grip-bench', 'Enges Bankdrücken', ['triceps'], ['chest', 'frontDelts'], 'barbell', 'horizontalPush', true],
  ['machine-tri', 'Trizepsmaschine', ['triceps'], [], 'machine', 'isolation', false],
  // Unterarme
  ['wrist-curl', 'Handgelenk-Curl', ['forearms'], [], 'dumbbell', 'isolation', false],
  ['reverse-curl', 'Reverse-Curl', ['forearms'], ['biceps'], 'barbell', 'isolation', false],
  // Beine
  ['bb-squat', 'Kniebeuge (Langhantel)', ['quads', 'glutes'], ['adductors', 'abs'], 'barbell', 'squat', true],
  ['front-squat', 'Frontkniebeuge', ['quads'], ['glutes', 'abs'], 'barbell', 'squat', true],
  ['smith-squat', 'Kniebeuge (Smith)', ['quads', 'glutes'], ['adductors'], 'smith', 'squat', true],
  ['hack-squat', 'Hackenschmidt-Kniebeuge', ['quads'], ['glutes'], 'machine', 'squat', true],
  ['leg-press', 'Beinpresse', ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['goblet-squat', 'Goblet Squat', ['quads'], ['glutes'], 'dumbbell', 'squat', true],
  ['bulgarian', 'Bulgarian Split Squat', ['quads', 'glutes'], ['adductors'], 'dumbbell', 'lunge', true],
  ['walking-lunge', 'Ausfallschritte (Kurzhantel)', ['quads', 'glutes'], ['adductors'], 'dumbbell', 'lunge', true],
  ['leg-ext', 'Beinstrecker', ['quads'], [], 'machine', 'isolation', false],
  ['rdl', 'Rumänisches Kreuzheben', ['hamstrings', 'glutes'], ['lowerBack'], 'barbell', 'hinge', true],
  ['db-rdl', 'Rumänisches Kreuzheben (Kurzhantel)', ['hamstrings', 'glutes'], ['lowerBack'], 'dumbbell', 'hinge', true],
  ['deadlift', 'Kreuzheben', ['hamstrings', 'glutes', 'upperBack'], ['traps', 'forearms', 'quads', 'lowerBack'], 'barbell', 'hinge', true],
  ['lying-leg-curl', 'Beinbeuger (liegend)', ['hamstrings'], [], 'machine', 'isolation', false],
  ['seated-leg-curl', 'Beinbeuger (sitzend)', ['hamstrings'], [], 'machine', 'isolation', false],
  ['hip-thrust', 'Hip Thrust (Langhantel)', ['glutes'], ['hamstrings'], 'barbell', 'hinge', true],
  ['machine-hip-thrust', 'Hip Thrust (Maschine, Gewichtsscheiben)', ['glutes'], ['hamstrings'], 'machine', 'hinge', true],
  ['cable-kickback', 'Glute Kickback (Kabel)', ['glutes'], [], 'cable', 'isolation', false],
  ['hip-abduction', 'Abduktoren-Maschine', ['abductors'], ['glutes'], 'machine', 'isolation', false],
  ['hip-adduction', 'Adduktoren-Maschine', ['adductors'], [], 'machine', 'isolation', false],
  ['standing-calf', 'Wadenheben (stehend)', ['calves'], [], 'machine', 'isolation', false],
  ['seated-calf', 'Wadenheben (sitzend)', ['calves'], [], 'machine', 'isolation', false],
  ['leg-press-calf', 'Wadenheben (Beinpresse)', ['calves'], [], 'machine', 'isolation', false],
  ['smith-calf', 'Wadenheben (Smith)', ['calves'], [], 'smith', 'isolation', false],
  // Core
  ['cable-crunch', 'Kabel-Crunch', ['abs'], [], 'cable', 'core', false],
  ['hanging-leg-raise', 'Beinheben (hängend)', ['abs'], ['forearms'], 'bodyweight', 'core', false],
  ['ab-wheel', 'Ab Wheel', ['abs'], [], 'bodyweight', 'core', false],
  ['machine-crunch', 'Crunch-Maschine', ['abs'], [], 'machine', 'core', false],
  ['plank', 'Plank', ['abs'], [], 'bodyweight', 'core', false],

  // --- Erweiterung: Brust
  ['low-incline-db', 'Flaches Schrägbankdrücken (Kurzhantel)', ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['decline-bb', 'Negativbankdrücken (Langhantel)', ['chest'], ['triceps'], 'barbell', 'horizontalPush', true],
  ['decline-machine', 'Negativpresse (Maschine)', ['chest'], ['triceps'], 'machine', 'horizontalPush', true],
  ['cable-crossover-high', 'Kabelzug Crossover (oben)', ['chest'], [], 'cable', 'isolation', false],
  ['incline-cable-fly', 'Schräg-Fly (Kabel)', ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['db-pullover', 'Pullover (Kurzhantel)', ['chest', 'lats'], ['triceps'], 'dumbbell', 'isolation', false],
  ['band-pushup', 'Liegestütze (Band)', ['chest'], ['triceps', 'frontDelts'], 'band', 'horizontalPush', true],
  ['band-chest-fly', 'Brust-Fly (Band)', ['chest'], [], 'band', 'isolation', false],
  ['kb-floor-press', 'Floor Press (Kettlebell)', ['chest'], ['triceps'], 'kettlebell', 'horizontalPush', true],
  ['svend-press', 'Svend Press', ['chest'], [], 'dumbbell', 'isolation', false],
  // Schultern
  ['arnold-press', 'Arnold Press', ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['seated-db-ohp', 'Schulterdrücken sitzend (Kurzhantel)', ['frontDelts', 'sideDelts'], ['triceps'], 'dumbbell', 'verticalPush', true],
  ['landmine-press', 'Landmine Press', ['frontDelts', 'sideDelts'], ['chest', 'triceps'], 'barbell', 'verticalPush', true],
  ['push-press', 'Push Press', ['frontDelts', 'sideDelts'], ['triceps', 'quads'], 'barbell', 'verticalPush', true],
  ['kb-ohp', 'Schulterdrücken (Kettlebell)', ['frontDelts', 'sideDelts'], ['triceps', 'abs'], 'kettlebell', 'verticalPush', true],
  ['band-lateral', 'Seitheben (Band)', ['sideDelts'], [], 'band', 'isolation', false],
  ['cable-front-raise', 'Frontheben (Kabel)', ['frontDelts'], [], 'cable', 'isolation', false],
  ['db-front-raise', 'Frontheben (Kurzhantel)', ['frontDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-rear-delt', 'Reverse Fly (Kabel)', ['rearDelts'], ['upperBack'], 'cable', 'isolation', false],
  ['band-pull-apart', 'Band Pull-Apart', ['rearDelts'], ['upperBack'], 'band', 'isolation', false],
  ['upright-row', 'Aufrechtes Rudern (Kabel)', ['sideDelts'], ['traps', 'biceps'], 'cable', 'verticalPull', false],
  ['pike-pushup', 'Pike-Liegestütze', ['frontDelts', 'sideDelts'], ['triceps'], 'bodyweight', 'verticalPush', true],
  // Rücken
  ['t-bar-row', 'T-Bar-Rudern', ['upperBack', 'lats'], ['biceps'], 'barbell', 'horizontalPull', true],
  ['pendlay-row', 'Pendlay Row', ['upperBack', 'lats'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['seal-row', 'Seal Row', ['upperBack'], ['lats', 'biceps'], 'barbell', 'horizontalPull', true],
  ['chest-supported-db-row', 'Rudern brustgestützt (Kurzhantel)', ['upperBack'], ['lats', 'biceps'], 'dumbbell', 'horizontalPull', true],
  ['single-arm-cable-row', 'Einarmiges Kabelrudern', ['lats', 'upperBack'], ['biceps'], 'cable', 'horizontalPull', true],
  ['high-row-machine', 'High Row (Maschine)', ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['single-arm-pulldown', 'Einarmiger Latzug (Kabel)', ['lats'], ['biceps'], 'cable', 'verticalPull', true],
  ['wide-grip-pullup', 'Klimmzüge (weiter Griff)', ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['neutral-pullup', 'Klimmzüge (neutraler Griff)', ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['inverted-row', 'Australian Pull-ups', ['upperBack', 'lats'], ['biceps'], 'bodyweight', 'horizontalPull', true],
  ['band-row', 'Rudern (Band)', ['upperBack', 'lats'], ['biceps'], 'band', 'horizontalPull', true],
  ['band-pulldown', 'Latzug (Band)', ['lats'], ['biceps'], 'band', 'verticalPull', true],
  ['kb-row', 'Rudern (Kettlebell)', ['lats', 'upperBack'], ['biceps'], 'kettlebell', 'horizontalPull', true],
  ['cable-shrug', 'Shrugs (Kabel)', ['traps'], [], 'cable', 'isolation', false],
  ['smith-shrug', 'Shrugs (Smith)', ['traps'], ['forearms'], 'smith', 'isolation', false],
  ['rack-pull', 'Rack Pull', ['upperBack', 'traps'], ['glutes', 'hamstrings', 'forearms', 'lowerBack'], 'barbell', 'hinge', true],
  ['reverse-hyper', 'Reverse Hyperextension', ['glutes'], ['hamstrings', 'lowerBack'], 'machine', 'hinge', false],
  ['machine-back-ext', 'Rückenstrecker (Maschine)', ['lowerBack'], ['glutes'], 'machine', 'hinge', false],
  // Bizeps
  ['ez-curl', 'SZ-Stangen-Curl', ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['spider-curl', 'Spider Curl', ['biceps'], [], 'dumbbell', 'isolation', false],
  ['concentration-curl', 'Konzentrations-Curl', ['biceps'], [], 'dumbbell', 'isolation', false],
  ['cable-hammer-curl', 'Hammer-Curl (Kabel-Seil)', ['biceps'], ['forearms'], 'cable', 'isolation', false],
  ['cable-preacher', 'Preacher Curl (Kabel)', ['biceps'], [], 'cable', 'isolation', false],
  ['band-curl', 'Curl (Band)', ['biceps'], [], 'band', 'isolation', false],
  ['kb-curl', 'Curl (Kettlebell)', ['biceps'], ['forearms'], 'kettlebell', 'isolation', false],
  ['zottman-curl', 'Zottman Curl', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  // Trizeps
  ['ez-skullcrusher', 'Skullcrusher (SZ-Stange)', ['triceps'], [], 'barbell', 'isolation', false],
  ['db-skullcrusher', 'Skullcrusher (Kurzhantel)', ['triceps'], [], 'dumbbell', 'isolation', false],
  ['cable-kickback-tri', 'Trizeps-Kickback (Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['db-kickback', 'Trizeps-Kickback (Kurzhantel)', ['triceps'], [], 'dumbbell', 'isolation', false],
  ['single-arm-pushdown', 'Einarmiges Trizepsdrücken (Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['band-pushdown', 'Trizepsdrücken (Band)', ['triceps'], [], 'band', 'isolation', false],
  ['smith-close-grip', 'Enges Bankdrücken (Smith)', ['triceps'], ['chest', 'frontDelts'], 'smith', 'horizontalPush', true],
  ['diamond-pushup', 'Diamond-Liegestütze', ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['bench-dip', 'Bankdrücken Dips (Bank)', ['triceps'], ['chest', 'frontDelts'], 'bodyweight', 'verticalPush', false],
  // Unterarme
  ['reverse-wrist-curl', 'Reverse Wrist Curl', ['forearms'], [], 'dumbbell', 'isolation', false],
  ['farmers-carry', 'Farmer\'s Walk', ['forearms'], ['traps', 'abs'], 'dumbbell', 'isolation', false],
  ['cable-wrist-curl', 'Handgelenk-Curl (Kabel)', ['forearms'], [], 'cable', 'isolation', false],
  ['dead-hang', 'Dead Hang', ['forearms'], ['lats'], 'bodyweight', 'isolation', false],
  // Beine
  ['box-squat', 'Box Squat', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'barbell', 'squat', true],
  ['pause-squat', 'Kniebeuge mit Pause', ['quads', 'glutes'], ['adductors', 'abs'], 'barbell', 'squat', true],
  ['sumo-deadlift', 'Sumo-Kreuzheben', ['glutes', 'adductors', 'hamstrings'], ['quads', 'lowerBack'], 'barbell', 'hinge', true],
  ['trap-bar-deadlift', 'Trap-Bar-Kreuzheben', ['quads', 'glutes', 'hamstrings'], ['traps', 'lowerBack'], 'barbell', 'hinge', true],
  ['good-morning', 'Good Morning', ['lowerBack', 'hamstrings', 'glutes'], [], 'barbell', 'hinge', true],
  ['smith-rdl', 'Rumänisches Kreuzheben (Smith)', ['hamstrings', 'glutes'], ['lowerBack'], 'smith', 'hinge', true],
  ['stiff-leg-deadlift', 'Gestrecktes Kreuzheben', ['hamstrings'], ['glutes', 'lowerBack'], 'barbell', 'hinge', true],
  ['nordic-curl', 'Nordic Curl', ['hamstrings'], [], 'bodyweight', 'isolation', false],
  ['standing-leg-curl', 'Beinbeuger (stehend, Maschine)', ['hamstrings'], [], 'machine', 'isolation', false],
  ['cable-leg-curl', 'Beinbeuger (Kabel)', ['hamstrings'], [], 'cable', 'isolation', false],
  ['band-leg-curl', 'Beinbeuger (Band)', ['hamstrings'], [], 'band', 'isolation', false],
  ['pendulum-squat', 'Pendulum Squat', ['quads'], ['glutes'], 'machine', 'squat', true],
  ['belt-squat', 'Belt Squat', ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['sissy-squat', 'Sissy Squat', ['quads'], [], 'bodyweight', 'squat', false],
  ['step-up', 'Step-ups (Kurzhantel)', ['quads', 'glutes'], [], 'dumbbell', 'lunge', true],
  ['reverse-lunge', 'Reverse Lunge (Langhantel)', ['quads', 'glutes'], ['adductors'], 'barbell', 'lunge', true],
  ['smith-split-squat', 'Split Squat (Smith)', ['quads', 'glutes'], ['adductors'], 'smith', 'lunge', true],
  ['cossack-squat', 'Cossack Squat', ['adductors', 'quads'], ['glutes'], 'bodyweight', 'lunge', false],
  ['kb-goblet-squat', 'Goblet Squat (Kettlebell)', ['quads'], ['glutes', 'abs'], 'kettlebell', 'squat', true],
  ['kb-swing', 'Kettlebell Swing', ['glutes', 'hamstrings'], ['abs', 'forearms'], 'kettlebell', 'hinge', true],
  ['single-leg-rdl', 'Einbeiniges Rumänisches Kreuzheben', ['hamstrings', 'glutes'], ['abs'], 'dumbbell', 'hinge', true],
  ['glute-bridge', 'Glute Bridge', ['glutes'], ['hamstrings'], 'bodyweight', 'hinge', false],
  ['db-hip-thrust', 'Hip Thrust (Kurzhantel)', ['glutes'], ['hamstrings'], 'dumbbell', 'hinge', true],
  ['smith-hip-thrust', 'Hip Thrust (Smith)', ['glutes'], ['hamstrings'], 'smith', 'hinge', true],
  ['band-hip-thrust', 'Hip Thrust (Band)', ['glutes'], [], 'band', 'hinge', false],
  ['cable-pull-through', 'Pull-Through (Kabel)', ['glutes', 'hamstrings'], [], 'cable', 'hinge', false],
  ['machine-glute-kickback', 'Glute Kickback (Maschine)', ['glutes'], [], 'machine', 'isolation', false],
  ['band-abduction', 'Abduktion (Band)', ['abductors'], ['glutes'], 'band', 'isolation', false],
  ['cable-hip-abduction', 'Hüftabduktion (Kabel)', ['abductors'], ['glutes'], 'cable', 'isolation', false],
  ['cable-hip-adduction', 'Hüftadduktion (Kabel)', ['adductors'], [], 'cable', 'isolation', false],
  ['copenhagen-plank', 'Copenhagen Plank', ['adductors'], ['obliques'], 'bodyweight', 'core', false],
  ['db-calf-raise', 'Wadenheben einbeinig (Kurzhantel)', ['calves'], [], 'dumbbell', 'isolation', false],
  ['bodyweight-calf', 'Wadenheben (Körpergewicht)', ['calves'], [], 'bodyweight', 'isolation', false],
  ['donkey-calf', 'Donkey Calf Raise', ['calves'], [], 'machine', 'isolation', false],
  // Core
  ['cable-woodchop', 'Woodchopper (Kabel)', ['obliques'], ['abs'], 'cable', 'core', false],
  ['pallof-press', 'Pallof Press', ['obliques'], ['abs'], 'cable', 'core', false],
  ['decline-situp', 'Sit-ups (Negativbank)', ['abs'], [], 'bodyweight', 'core', false],
  ['captains-chair', 'Beinheben (Captain\'s Chair)', ['abs'], [], 'machine', 'core', false],
  ['dead-bug', 'Dead Bug', ['abs'], [], 'bodyweight', 'core', false],
  ['side-plank', 'Seitstütz', ['obliques'], ['abductors'], 'bodyweight', 'core', false],
  ['russian-twist', 'Russian Twist', ['obliques'], ['abs'], 'dumbbell', 'core', false],
  ['band-crunch', 'Crunch (Band)', ['abs'], [], 'band', 'core', false],
  ['kb-windmill', 'Windmill (Kettlebell)', ['obliques'], ['sideDelts', 'glutes'], 'kettlebell', 'core', false],
  ['suitcase-carry', 'Suitcase Carry', ['obliques'], ['forearms', 'traps'], 'kettlebell', 'core', false],
  // Erweiterung: feinere Muskelgruppen
  ['superman', 'Superman', ['lowerBack'], ['glutes'], 'bodyweight', 'hinge', false],
  ['weighted-hyperextension', 'Rückenstrecker (Kurzhantel)', ['lowerBack'], ['glutes', 'hamstrings'], 'dumbbell', 'hinge', false],
  ['neck-curl-plate', 'Nackenbeugen (Hantelscheibe)', ['neck'], [], 'dumbbell', 'isolation', false],
  ['neck-extension-machine', 'Nackenstrecker (Maschine)', ['neck'], ['traps'], 'machine', 'isolation', false],
  ['neck-band-extension', 'Nackenstrecken (Band)', ['neck'], [], 'band', 'isolation', false],
  ['neck-lateral-band', 'Seitliche Nackenbeugen (Band)', ['neck'], [], 'band', 'isolation', false],
  ['scapular-pushup', 'Scapular Push-ups', ['serratus'], ['chest'], 'bodyweight', 'isolation', false],
  ['cable-serratus-punch', 'Serratus Punch (Kabel)', ['serratus'], ['frontDelts'], 'cable', 'isolation', false],
  ['band-serratus-punch', 'Serratus Punch (Band)', ['serratus'], ['frontDelts'], 'band', 'isolation', false],
  ['db-serratus-press', 'Serratus Press (Kurzhantel)', ['serratus'], ['chest', 'frontDelts'], 'dumbbell', 'isolation', false],
  ['wall-slide', 'Wall Slides', ['serratus'], ['rearDelts'], 'bodyweight', 'isolation', false],
  ['tibialis-raise', 'Tibialis Raise (Körpergewicht)', ['tibialis'], [], 'bodyweight', 'isolation', false],
  ['tibialis-machine', 'Schienbeinheben (Maschine)', ['tibialis'], [], 'machine', 'isolation', false],
  ['db-tibialis-raise', 'Schienbeinheben (Kurzhantel)', ['tibialis'], [], 'dumbbell', 'isolation', false],
  ['band-tibialis', 'Schienbeinheben (Band)', ['tibialis'], [], 'band', 'isolation', false],
  ['cable-side-bend', 'Seitbeugen (Kabel)', ['obliques'], ['abs'], 'cable', 'core', false],
  ['db-side-bend', 'Seitbeugen (Kurzhantel)', ['obliques'], ['abs'], 'dumbbell', 'core', false],
  ['bicycle-crunch', 'Fahrrad-Crunch', ['obliques'], ['abs'], 'bodyweight', 'core', false],
  // Ergänzt aus free-exercise-db-with-videos (ID = Repo-Slug, Bilder siehe data/media)
  ['decline-dumbbell-bench-press-45-degree', 'Negativ-Bankdrücken (Kurzhantel)', ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-decline-fly-45-degree-1', 'Negativ-Fliegende (Kurzhantel)', ['chest'], ['frontDelts'], 'dumbbell', 'isolation', false],
  ['dumbbell-incline-fly', 'Schräg-Fliegende (Kurzhantel)', ['chest'], ['frontDelts'], 'dumbbell', 'isolation', false],
  ['dumbbell-lying-hammer-press', 'Hammer-Bankdrücken (Kurzhantel)', ['chest'], ['triceps', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-incline-hammer-press', 'Schräges Hammerdrücken (Kurzhantel)', ['chest'], ['frontDelts', 'triceps'], 'dumbbell', 'horizontalPush', true],
  ['cable-lying-fly-flat-bench-cable-fly', 'Kabel-Fly (Flachbank)', ['chest'], ['frontDelts'], 'cable', 'isolation', false],
  ['incline-push-ups', 'Schräge Liegestütze (Hände erhöht)', ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['deep-push-ups', 'Tiefe Liegestütze', ['chest'], ['triceps', 'frontDelts'], 'bodyweight', 'horizontalPush', true],
  ['dumbbell-seated-lateral-raise', 'Seitheben sitzend (Kurzhantel)', ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-one-arm-lateral-raise', 'Einarmiges Seitheben (Kurzhantel)', ['sideDelts'], [], 'dumbbell', 'isolation', false],
  ['cable-one-arm-lateral-raise', 'Einarmiges Seitheben (Kabel)', ['sideDelts'], [], 'cable', 'isolation', false],
  ['dumbbell-seated-front-raise', 'Frontheben sitzend (Kurzhantel)', ['frontDelts'], [], 'dumbbell', 'isolation', false],
  ['barbell-front-raise', 'Frontheben (Langhantel)', ['frontDelts'], [], 'barbell', 'isolation', false],
  ['dumbbell-upright-row', 'Aufrechtes Rudern (Kurzhantel)', ['sideDelts'], ['traps', 'biceps'], 'dumbbell', 'verticalPull', true],
  ['dumbbell-rear-delt-row', 'Rudern für hintere Schulter (Kurzhantel)', ['rearDelts'], ['upperBack', 'traps'], 'dumbbell', 'horizontalPull', true],
  ['barbell-underhand-bent-over-row', 'Langhantelrudern (Untergriff)', ['lats', 'upperBack'], ['biceps', 'traps'], 'barbell', 'horizontalPull', true],
  ['cable-seated-row-wide-grip', 'Rudern am Kabel (weiter Griff)', ['upperBack'], ['rearDelts', 'biceps', 'lats'], 'cable', 'horizontalPull', true],
  ['cable-seated-high-row-v-bar', 'Hohes Rudern am Kabel (V-Griff)', ['lats', 'upperBack'], ['biceps', 'rearDelts'], 'cable', 'horizontalPull', true],
  ['cable-bar-lateral-pulldown-reverse-grip', 'Latzug (Untergriff)', ['lats'], ['biceps', 'upperBack'], 'cable', 'verticalPull', true],
  ['reverse-grip-machine-lat-pulldown', 'Latzug (Maschine, Untergriff)', ['lats'], ['biceps'], 'machine', 'verticalPull', true],
  ['reverse-grip-pull-up', 'Klimmzüge (Untergriff)', ['lats'], ['biceps', 'upperBack'], 'bodyweight', 'verticalPull', true],
  ['chin-ups-narrow-parallel-grip', 'Klimmzüge (enger Parallelgriff)', ['lats'], ['biceps'], 'bodyweight', 'verticalPull', true],
  ['dumbbell-incline-row', 'Schrägbank-Rudern (Kurzhantel)', ['upperBack'], ['biceps', 'rearDelts'], 'dumbbell', 'horizontalPull', true],
  ['lever-reverse-t-bar-row', 'T-Bar-Rudern (Maschine, Untergriff)', ['upperBack', 'lats'], ['biceps'], 'machine', 'horizontalPull', true],
  ['dumbbell-incline-shrug', 'Schulterheben Schrägbank (Kurzhantel)', ['traps'], [], 'dumbbell', 'isolation', false],
  ['barbell-drag-curl', 'Drag-Curl (Langhantel)', ['biceps'], ['forearms'], 'barbell', 'isolation', false],
  ['cable-one-arm-curl', 'Einarmiger Kabel-Curl', ['biceps'], ['forearms'], 'cable', 'isolation', false],
  ['dumbbell-incline-hammer-curl', 'Schräg-Hammer-Curl (Kurzhantel)', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-alternate-seated-biceps-curl', 'Wechselnder Curl sitzend (Kurzhantel)', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-seated-preacher-curl', 'Preacher-Curl (Kurzhantel)', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['dumbbell-prone-incline-curl', 'Curl in Bauchlage auf Schrägbank (Kurzhantel)', ['biceps'], ['forearms'], 'dumbbell', 'isolation', false],
  ['cable-lying-triceps-extension', 'Trizepsstrecken liegend (Kabel)', ['triceps'], [], 'cable', 'isolation', false],
  ['dumbbell-incline-triceps-extension', 'Trizepsstrecken Schrägbank (Kurzhantel)', ['triceps'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-one-arm-triceps-extension', 'Einarmiges Trizepsstrecken (Kurzhantel)', ['triceps'], [], 'dumbbell', 'isolation', false],
  ['band-overhead-triceps-extension', 'Trizepsstrecken über Kopf (Band)', ['triceps'], [], 'band', 'isolation', false],
  ['lever-seated-dips', 'Dips (Maschine, sitzend)', ['triceps'], ['chest', 'frontDelts'], 'machine', 'verticalPush', true],
  ['dumbbell-close-grip-press', 'Enges Drücken (Kurzhantel)', ['triceps'], ['chest', 'frontDelts'], 'dumbbell', 'horizontalPush', true],
  ['dumbbell-squat', 'Kniebeuge (Kurzhantel)', ['quads', 'glutes'], ['hamstrings'], 'dumbbell', 'squat', true],
  ['dumbbell-bar-grip-sumo-squat', 'Sumo-Kniebeuge (Kurzhantel)', ['quads', 'glutes'], ['adductors'], 'dumbbell', 'squat', true],
  ['dumbbell-single-leg-squat', 'Einbeinige Kniebeuge (Kurzhantel)', ['quads', 'glutes'], ['hamstrings'], 'dumbbell', 'squat', true],
  ['squat', 'Kniebeuge (Körpergewicht)', ['quads', 'glutes'], ['hamstrings'], 'bodyweight', 'squat', true],
  ['close-feet-leg-press', 'Beinpresse (enger Stand)', ['quads'], ['glutes'], 'machine', 'squat', true],
  ['sled-45-degree-leg-wide-press', 'Beinpresse 45° (weiter Stand)', ['quads', 'glutes'], ['adductors'], 'machine', 'squat', true],
  ['barbell-lunge', 'Ausfallschritte (Langhantel)', ['quads', 'glutes'], ['hamstrings'], 'barbell', 'lunge', true],
  ['dumbbell-deadlift', 'Kreuzheben (Kurzhantel)', ['glutes', 'hamstrings'], ['lowerBack'], 'dumbbell', 'hinge', true],
  ['kettlebell-deadlift', 'Kreuzheben (Kettlebell)', ['glutes', 'hamstrings'], ['lowerBack'], 'kettlebell', 'hinge', true],
  ['dumbbell-lying-femoral', 'Beincurl liegend (Kurzhantel)', ['hamstrings'], ['calves'], 'dumbbell', 'isolation', false],
  ['lever-kneeling-leg-curl', 'Beincurl kniend (Maschine)', ['hamstrings'], [], 'machine', 'isolation', false],
  ['lever-standing-hip-extension', 'Hüftstrecken stehend (Maschine)', ['glutes'], ['hamstrings'], 'machine', 'isolation', false],
  ['band-pull-through', 'Pull-Through (Band)', ['glutes'], ['hamstrings', 'lowerBack'], 'band', 'hinge', true],
  ['band-hip-adduction', 'Adduktion (Band)', ['adductors'], [], 'band', 'isolation', false],
  ['dumbbell-seated-calf-raise', 'Wadenheben sitzend (Kurzhantel)', ['calves'], [], 'dumbbell', 'isolation', false],
  ['dumbbell-single-leg-calf-raise', 'Einbeiniges Wadenheben (Kurzhantel)', ['calves'], [], 'dumbbell', 'isolation', false],
  ['sit-ups', 'Sit-ups', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['v-up', 'V-Ups', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['lying-floor-leg-raise', 'Beinheben liegend', ['abs'], [], 'bodyweight', 'core', false],
  ['vertical-leg-raise-on-parallel-bars', 'Beinheben am Barren', ['abs'], [], 'bodyweight', 'core', false],
  ['hanging-leg-hip-raise', 'Hängendes Beinheben mit Hüftbeuge', ['abs'], [], 'bodyweight', 'core', false],
  ['twisting-crunch', 'Crunch mit Drehung', ['obliques'], ['abs'], 'bodyweight', 'core', false],
  ['crunch-on-bench', 'Bankcrunch', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['sit-up-on-exercise-ball', 'Sit-ups auf dem Gymnastikball', ['abs'], ['obliques'], 'bodyweight', 'core', false],
  ['cable-standing-crunch', 'Cable Crunch stehend', ['abs'], ['obliques'], 'cable', 'core', false],
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

const loadOf = (id: string, equipment: Equipment): Exercise['load'] => {
  if (equipment === 'dumbbell') return LOAD_SINGLE.has(id) ? 'single' : 'perSide'
  if (equipment === 'kettlebell') return LOAD_PER_SIDE.has(id) ? 'perSide' : 'single'
  return undefined
}

export const EXERCISES: Exercise[] = rows.map(([id, name, primary, secondary, equipment, pattern, compound]) => {
  const load = loadOf(id, equipment)
  return { id, name, primary, secondary, equipment, pattern, compound, ...(ASSISTED.has(id) ? { assisted: true } : {}), ...(load ? { load } : {}), ...(TIME_BASED.has(id) ? { metric: 'time' as const } : {}), ...(BODYWEIGHT_SHARE[id] ? { bodyweight: BODYWEIGHT_SHARE[id] } : {}) }
})

const cardio = (id: string, name: string): Exercise => ({
  id, name, primary: [], secondary: [], equipment: 'cardio', pattern: 'cardio', compound: false, cardio: true,
})

export const CARDIO: Exercise[] = [
  cardio('c-treadmill', 'Laufband'),
  cardio('c-bike', 'Ergometer / Fahrrad'),
  cardio('c-elliptical', 'Crosstrainer'),
  cardio('c-rower', 'Rudergerät'),
  cardio('c-stairs', 'Stairmaster'),
  cardio('c-run', 'Laufen (draußen)'),
  cardio('c-walk', 'Gehen'),
  cardio('c-swim', 'Schwimmen'),
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
  barbell: 'Langhantel', dumbbell: 'Kurzhantel', cable: 'Kabel', machine: 'Maschine',
  bodyweight: 'Körpergewicht', smith: 'Smith', band: 'Band', kettlebell: 'Kettlebell', cardio: 'Cardio',
}
