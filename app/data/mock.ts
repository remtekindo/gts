import { GENERATED_QUESTIONS } from './generated'

/**
 * MOCK DATA — all questions, passages, and copy below are ORIGINAL sample
 * content written for the GTS demo. They are simplified (18 items) and do
 * not reproduce any third-party test material. Audio is a placeholder.
 */

export type Skill = 'listening' | 'reading' | 'speaking' | 'writing'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type PaperStatus = 'not-started' | 'in-progress' | 'completed'
export type MaterialStatus = 'owned' | 'coming-soon'

export interface AnswerOption {
  letter: string
  text: string
}

export interface Material {
  slug: string
  name: string
  tagline: string
  description: string
  /** Short badge shown on the material card, e.g. 'EN'. */
  badge: string
  status: MaterialStatus
}

export interface Question {
  materialSlug: string
  number: number
  part: number
  skill: Skill
  /** Passage / memo / email text shown above the stem (Parts 6–7). */
  context?: string
  /** Shown for listening items: there is no real recording in this demo. */
  audioNote?: string
  stem: string
  options: AnswerOption[]
  correctLetter: string
  explanation: string
}

export interface Paper {
  id: string
  materialSlug: string
  title: string
  category: 'Full Simulation' | 'Drill Pack'
  skillsLabel: string
  /** Time limit for the attempt, in minutes. */
  durationMinutes: number
  difficulty: Difficulty
}

export interface PartInfo {
  materialSlug: string
  part: number
  skill: Skill
  label: string
  description: string
}

export const MATERIALS: Material[] = [
  {
    slug: 'toeic-lr',
    name: 'TOEIC Listening & Reading',
    tagline: 'Know your level. Own your score.',
    description: 'Full simulations and drill packs for TOEIC Listening & Reading, with instant predicted scores and per-part breakdowns.',
    badge: 'EN',
    status: 'owned',
  },
  {
    slug: 'toeic-sw',
    name: 'TOEIC Speaking & Writing',
    tagline: 'Say it. Write it. Score it.',
    description: 'Speaking response drills and writing tasks with sample answers and self-check rubrics.',
    badge: 'EN',
    status: 'owned',
  },
  {
    slug: 'toefl-ibt',
    name: 'TOEFL iBT',
    tagline: 'Four skills, one adaptive test.',
    description: 'Reading, Listening, Speaking, and Writing simulations for TOEFL iBT.',
    badge: 'EN',
    status: 'owned',
  },
  {
    slug: 'ielts-academic',
    name: 'IELTS Academic',
    tagline: 'Four sections, bands 1–9.',
    description: 'Academic Reading, Listening, Writing, and Speaking practice for IELTS.',
    badge: 'EN',
    status: 'owned',
  }
]

export function getMaterial(slug: string): Material | undefined {
  return MATERIALS.find(m => m.slug === slug)
}

export function getMaterialOrFallback(slug: string): Material {
  return getMaterial(slug) ?? (MATERIALS[0] as Material)
}

export function ownedMaterials(): Material[] {
  return MATERIALS.filter(m => m.status === 'owned')
}

export const PARTS: PartInfo[] = [
  { materialSlug: 'toeic-lr', part: 1, skill: 'listening', label: 'Photographs', description: 'Look at each photograph and choose the statement that best describes what you see.' },
  { materialSlug: 'toeic-lr', part: 2, skill: 'listening', label: 'Question–Response', description: 'Listen to a question, then choose the most appropriate response.' },
  { materialSlug: 'toeic-lr', part: 3, skill: 'listening', label: 'Conversations', description: 'Listen to a short conversation, then answer the question about it.' },
  { materialSlug: 'toeic-lr', part: 4, skill: 'listening', label: 'Short Talks', description: 'Listen to a short talk or announcement, then answer the question about it.' },
  { materialSlug: 'toeic-lr', part: 5, skill: 'reading', label: 'Incomplete Sentences', description: 'Choose the word or phrase that best completes each sentence.' },
  { materialSlug: 'toeic-lr', part: 6, skill: 'reading', label: 'Text Completion', description: 'Read the passage and choose the best word or phrase for each blank.' },
  { materialSlug: 'toeic-lr', part: 7, skill: 'reading', label: 'Reading Comprehension', description: 'Read the passage and choose the best answer to each question.' },
  { materialSlug: 'toeic-sw', part: 1, skill: 'speaking', label: 'Respond to Questions', description: 'Choose the most natural spoken response to each question.' },
  { materialSlug: 'toeic-sw', part: 2, skill: 'writing', label: 'Sentence Choice', description: 'Choose the best sentence for each writing task.' },
  { materialSlug: 'toefl-ibt', part: 1, skill: 'reading', label: 'Reading', description: 'Complete the Words, Read in Daily Life, and Read an Academic Passage.' },
  { materialSlug: 'toefl-ibt', part: 2, skill: 'listening', label: 'Listening', description: 'Listen and choose a response: conversations, announcements, and academic talks.' },
  { materialSlug: 'toefl-ibt', part: 3, skill: 'speaking', label: 'Speaking', description: 'Listen and Repeat, then Take an Interview.' },
  { materialSlug: 'toefl-ibt', part: 4, skill: 'writing', label: 'Writing', description: 'Build a Sentence, Write an Email, and Write for an Academic Discussion.' },
  { materialSlug: 'ielts-academic', part: 1, skill: 'listening', label: 'Listening', description: '4 parts, 40 questions — each recording plays once.' },
  { materialSlug: 'ielts-academic', part: 2, skill: 'reading', label: 'Reading', description: '3 academic passages, 40 questions.' },
  { materialSlug: 'ielts-academic', part: 3, skill: 'writing', label: 'Writing', description: 'Task 1: describe a chart or diagram (150+ words). Task 2: essay (250+ words).' },
  { materialSlug: 'ielts-academic', part: 4, skill: 'speaking', label: 'Speaking', description: '3-part interview with an examiner, 11–14 minutes.' }
]

const AUDIO_NOTE = 'No audio — no recording yet.'

type QuestionSeed = Omit<Question, 'materialSlug'>

const LR_SEEDS: QuestionSeed[] = [
  // ---------- LISTENING · Part 1 ----------
  {
    number: 1, part: 1, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'Photograph: two colleagues seated at a meeting-room table with documents.',
    options: [
      { letter: 'A', text: "They're shaking hands in a lobby." },
      { letter: 'B', text: "They're reviewing documents at a table." },
      { letter: 'C', text: "They're boarding an airplane." },
      { letter: 'D', text: "They're carrying boxes upstairs." }
    ],
    correctLetter: 'B',
    explanation: 'The photograph shows two people seated at a table looking at documents.'
  },
  {
    number: 2, part: 1, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'Photograph: a warehouse worker holding a handheld scanner near a package.',
    options: [
      { letter: 'A', text: "He's driving a forklift." },
      { letter: 'B', text: "He's scanning a barcode on a package." },
      { letter: 'C', text: "He's answering a telephone." },
      { letter: 'D', text: "He's painting a wall." }
    ],
    correctLetter: 'B',
    explanation: 'The worker is using a scanner on a package in a warehouse.'
  },
  // ---------- LISTENING · Part 2 ----------
  {
    number: 3, part: 2, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'You hear: "When does the morning shuttle leave?"',
    options: [
      { letter: 'A', text: 'From the main entrance.' },
      { letter: 'B', text: 'At seven thirty sharp.' },
      { letter: 'C', text: "It's fully booked today." }
    ],
    correctLetter: 'B',
    explanation: 'A "when" question needs a time as the answer.'
  },
  {
    number: 4, part: 2, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'You hear: "Who approved the budget increase?"',
    options: [
      { letter: 'A', text: 'Ms. Tanaka did, yesterday.' },
      { letter: 'B', text: 'In the conference room.' },
      { letter: 'C', text: 'About two million dollars.' }
    ],
    correctLetter: 'A',
    explanation: 'A "who" question needs a person as the answer.'
  },
  // ---------- LISTENING · Part 3 ----------
  {
    number: 5, part: 3, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'Conversation — W: "Did you see the email about the client visit?" M: "Yes, they arrive Thursday. Have the presentation slides been updated?" W: "Almost — I will finish them by tomorrow afternoon." Question: What will the woman do by tomorrow afternoon?',
    options: [
      { letter: 'A', text: 'Send an email to the client.' },
      { letter: 'B', text: 'Finish updating the presentation slides.' },
      { letter: 'C', text: 'Meet the client at the airport.' },
      { letter: 'D', text: 'Book a flight for Thursday.' }
    ],
    correctLetter: 'B',
    explanation: 'The woman says she will finish the slides by tomorrow afternoon.'
  },
  // ---------- LISTENING · Part 4 ----------
  {
    number: 6, part: 4, skill: 'listening', audioNote: AUDIO_NOTE,
    stem: 'Talk — "Attention, passengers: Flight 284 to Singapore is now boarding at Gate 12. Passengers in rows 20 through 35 may board now. Please have your boarding pass ready." Question: Where is this announcement most likely being made?',
    options: [
      { letter: 'A', text: 'At a train station.' },
      { letter: 'B', text: 'At an airport gate.' },
      { letter: 'C', text: 'In a hotel lobby.' },
      { letter: 'D', text: 'At a bus terminal.' }
    ],
    correctLetter: 'B',
    explanation: 'References to a flight, gate, and boarding passes indicate an airport.'
  },
  // ---------- READING · Part 5 ----------
  {
    number: 7, part: 5, skill: 'reading',
    stem: 'The quarterly financial report will be ___ at Friday’s board meeting.',
    options: [
      { letter: 'A', text: 'present' },
      { letter: 'B', text: 'presented' },
      { letter: 'C', text: 'presenting' },
      { letter: 'D', text: 'presentation' }
    ],
    correctLetter: 'B',
    explanation: 'The passive construction "will be ___" requires the past participle.'
  },
  {
    number: 8, part: 5, skill: 'reading',
    stem: 'Ms. Alvarez has worked in supply-chain management for ___ ten years.',
    options: [
      { letter: 'A', text: 'over' },
      { letter: 'B', text: 'above' },
      { letter: 'C', text: 'across' },
      { letter: 'D', text: 'against' }
    ],
    correctLetter: 'A',
    explanation: '"Over ten years" is the idiomatic way to say "more than ten years".'
  },
  {
    number: 9, part: 5, skill: 'reading',
    stem: 'Please ___ the attached form and return it to Human Resources by Thursday.',
    options: [
      { letter: 'A', text: 'complete' },
      { letter: 'B', text: 'completion' },
      { letter: 'C', text: 'completed' },
      { letter: 'D', text: 'completing' }
    ],
    correctLetter: 'A',
    explanation: 'An imperative sentence needs the base form of the verb.'
  },
  {
    number: 10, part: 5, skill: 'reading',
    stem: 'The company’s new distribution center is located ___ the outskirts of the city.',
    options: [
      { letter: 'A', text: 'on' },
      { letter: 'B', text: 'at' },
      { letter: 'C', text: 'in' },
      { letter: 'D', text: 'to' }
    ],
    correctLetter: 'A',
    explanation: '"On the outskirts" is the correct fixed prepositional phrase.'
  },
  // ---------- READING · Part 6 ----------
  {
    number: 11, part: 6, skill: 'reading',
    context: 'MEMO — To: All Department Heads / From: Operations / Date: June 2 / Subject: Updated travel policy. Effective July 1, all business trips must be approved ___ a department head at least two weeks in advance. Travel requests submitted ___ the deadline will be returned without review. Employees should book flights ___ the company’s approved travel portal to receive the corporate discount. Reimbursement claims must be filed within ten days of ___ to the office.',
    stem: 'Choose the best word for blank (1): "must be approved ___ a department head".',
    options: [
      { letter: 'A', text: 'by' },
      { letter: 'B', text: 'with' },
      { letter: 'C', text: 'from' },
      { letter: 'D', text: 'of' }
    ],
    correctLetter: 'A',
    explanation: 'In the passive voice, the agent is introduced with "by".'
  },
  {
    number: 12, part: 6, skill: 'reading',
    context: 'MEMO — To: All Department Heads / From: Operations / Date: June 2 / Subject: Updated travel policy. Effective July 1, all business trips must be approved by a department head at least two weeks in advance. Travel requests submitted ___ the deadline will be returned without review. Employees should book flights ___ the company’s approved travel portal to receive the corporate discount. Reimbursement claims must be filed within ten days of ___ to the office.',
    stem: 'Choose the best word for blank (2): "submitted ___ the deadline".',
    options: [
      { letter: 'A', text: 'after' },
      { letter: 'B', text: 'before' },
      { letter: 'C', text: 'during' },
      { letter: 'D', text: 'under' }
    ],
    correctLetter: 'A',
    explanation: 'Requests that arrive after the deadline are returned, so "after" fits the warning.'
  },
  {
    number: 13, part: 6, skill: 'reading',
    context: 'MEMO — To: All Department Heads / From: Operations / Date: June 2 / Subject: Updated travel policy. Effective July 1, all business trips must be approved by a department head at least two weeks in advance. Travel requests submitted after the deadline will be returned without review. Employees should book flights ___ the company’s approved travel portal to receive the corporate discount. Reimbursement claims must be filed within ten days of ___ to the office.',
    stem: 'Choose the best word for blank (3): "book flights ___ the company’s approved travel portal".',
    options: [
      { letter: 'A', text: 'across' },
      { letter: 'B', text: 'through' },
      { letter: 'C', text: 'along' },
      { letter: 'D', text: 'toward' }
    ],
    correctLetter: 'B',
    explanation: '"Through the portal" is the idiomatic phrase for using a system or website.'
  },
  {
    number: 14, part: 6, skill: 'reading',
    context: 'MEMO — To: All Department Heads / From: Operations / Date: June 2 / Subject: Updated travel policy. Effective July 1, all business trips must be approved by a department head at least two weeks in advance. Travel requests submitted after the deadline will be returned without review. Employees should book flights through the company’s approved travel portal to receive the corporate discount. Reimbursement claims must be filed within ten days of ___ to the office.',
    stem: 'Choose the best word for blank (4): "within ten days of ___ to the office".',
    options: [
      { letter: 'A', text: 'return' },
      { letter: 'B', text: 'returned' },
      { letter: 'C', text: 'returning' },
      { letter: 'D', text: 'returns' }
    ],
    correctLetter: 'C',
    explanation: 'A preposition ("of") must be followed by a gerund: "of returning".'
  },
  // ---------- READING · Part 7 ----------
  {
    number: 15, part: 7, skill: 'reading',
    context: 'NOTICE — The employee cafeteria on the 3rd floor will be closed for renovation from March 3 through March 14. During this period, boxed lunches will be available for pickup at the reception desk between 11:30 a.m. and 1:00 p.m. Lunch vouchers will be accepted at the Riverside Café, located across the street, for the duration of the renovation. We appreciate your patience.',
    stem: 'According to the notice, where can employees pick up boxed lunches?',
    options: [
      { letter: 'A', text: 'The 3rd-floor cafeteria.' },
      { letter: 'B', text: 'The reception desk.' },
      { letter: 'C', text: 'The Riverside Café.' },
      { letter: 'D', text: 'The first-floor lobby.' }
    ],
    correctLetter: 'B',
    explanation: 'The notice states boxed lunches are available for pickup at the reception desk.'
  },
  {
    number: 16, part: 7, skill: 'reading',
    context: 'NOTICE — The employee cafeteria on the 3rd floor will be closed for renovation from March 3 through March 14. During this period, boxed lunches will be available for pickup at the reception desk between 11:30 a.m. and 1:00 p.m. Lunch vouchers will be accepted at the Riverside Café, located across the street, for the duration of the renovation. We appreciate your patience.',
    stem: 'What will most likely happen on March 15?',
    options: [
      { letter: 'A', text: 'The renovation will begin.' },
      { letter: 'B', text: 'The cafeteria will reopen.' },
      { letter: 'C', text: 'The lunch vouchers will expire.' },
      { letter: 'D', text: 'The Riverside Café will close.' }
    ],
    correctLetter: 'B',
    explanation: 'The closure runs "through March 14", so the cafeteria should reopen on March 15.'
  },
  {
    number: 17, part: 7, skill: 'reading',
    context: 'EMAIL — Dear Mr. Okafor, I am writing regarding order #48210, which was originally scheduled for delivery on April 2. Due to an unexpected customs inspection, the shipment has been delayed and is now expected to arrive on April 9. A 5% discount has been applied to your invoice as compensation for the inconvenience. Please contact me directly if you have any questions. Sincerely, Lena Park, Customer Service.',
    stem: 'Why was the delivery delayed?',
    options: [
      { letter: 'A', text: 'The order was cancelled.' },
      { letter: 'B', text: 'A customs inspection occurred.' },
      { letter: 'C', text: 'The warehouse was closed.' },
      { letter: 'D', text: 'The payment arrived late.' }
    ],
    correctLetter: 'B',
    explanation: 'The email attributes the delay to an unexpected customs inspection.'
  },
  {
    number: 18, part: 7, skill: 'reading',
    context: 'EMAIL — Dear Mr. Okafor, I am writing regarding order #48210, which was originally scheduled for delivery on April 2. Due to an unexpected customs inspection, the shipment has been delayed and is now expected to arrive on April 9. A 5% discount has been applied to your invoice as compensation for the inconvenience. Please contact me directly if you have any questions. Sincerely, Lena Park, Customer Service.',
    stem: 'What has Ms. Park done to address the delay?',
    options: [
      { letter: 'A', text: 'She cancelled the order.' },
      { letter: 'B', text: 'She offered a replacement shipment.' },
      { letter: 'C', text: 'She applied a 5% discount to the invoice.' },
      { letter: 'D', text: 'She arranged express shipping.' }
    ],
    correctLetter: 'C',
    explanation: 'The email states a 5% discount was applied as compensation.'
  }
]

const SW_SEEDS: QuestionSeed[] = [
  {
    number: 1, part: 1, skill: 'speaking',
    stem: 'Choose the most natural spoken response to: "What do you usually do on weekends?"',
    options: [
      { letter: 'A', text: 'I usually go hiking with friends or visit my family.' },
      { letter: 'B', text: 'Weekend is Saturday Sunday.' },
      { letter: 'C', text: 'I don’t know.' },
      { letter: 'D', text: 'Yes, weekend.' }
    ],
    correctLetter: 'A',
    explanation: 'A is the only complete, natural-sounding response.'
  },
  {
    number: 2, part: 1, skill: 'speaking',
    stem: 'Choose the most natural spoken response to: "Could you describe your hometown?"',
    options: [
      { letter: 'A', text: 'It big city.' },
      { letter: 'B', text: 'My hometown is a small coastal town known for its seafood market.' },
      { letter: 'C', text: 'Hometown yes.' },
      { letter: 'D', text: 'I from there.' }
    ],
    correctLetter: 'B',
    explanation: 'B gives a clear, grammatical description with a detail.'
  },
  {
    number: 3, part: 1, skill: 'speaking',
    stem: 'Choose the most natural spoken response to: "Why do you want to improve your English?"',
    options: [
      { letter: 'A', text: 'Because job need.' },
      { letter: 'B', text: 'English important.' },
      { letter: 'C', text: 'I need it for client meetings and to read technical documentation.' },
      { letter: 'D', text: 'For good.' }
    ],
    correctLetter: 'C',
    explanation: 'C states a specific, work-related reason in full sentences.'
  },
  {
    number: 4, part: 2, skill: 'writing',
    stem: 'Choose the best sentence to reply to a client email: "Please confirm receipt of the attached invoice."',
    options: [
      { letter: 'A', text: 'Received.' },
      { letter: 'B', text: 'Thank you — I confirm receipt of the invoice attached to your email.' },
      { letter: 'C', text: 'OK I see it.' },
      { letter: 'D', text: 'Invoice yes got.' }
    ],
    correctLetter: 'B',
    explanation: 'B is polite, complete, and business-appropriate.'
  },
  {
    number: 5, part: 2, skill: 'writing',
    stem: 'Choose the best sentence to request a meeting reschedule.',
    options: [
      { letter: 'A', text: 'I can’t come tomorrow, another day?' },
      { letter: 'B', text: 'Would it be possible to move tomorrow’s meeting to Thursday morning?' },
      { letter: 'C', text: 'Meeting cancel.' },
      { letter: 'D', text: 'Tomorrow no.' }
    ],
    correctLetter: 'B',
    explanation: 'B is a polite, specific rescheduling request.'
  },
  {
    number: 6, part: 2, skill: 'writing',
    stem: 'Choose the best sentence to describe a chart showing rising sales.',
    options: [
      { letter: 'A', text: 'Sales go up.' },
      { letter: 'B', text: 'The chart shows that sales increased steadily over the quarter.' },
      { letter: 'C', text: 'Up sales very.' },
      { letter: 'D', text: 'Chart good.' }
    ],
    correctLetter: 'B',
    explanation: 'B describes the trend accurately in a full sentence.'
  }
]

export const QUESTIONS: Question[] = [
  ...LR_SEEDS.map(q => ({ ...q, materialSlug: 'toeic-lr' })),
  ...SW_SEEDS.map(q => ({ ...q, materialSlug: 'toeic-sw' })),
  ...GENERATED_QUESTIONS
]

export function questionsForMaterial(slug: string): Question[] {
  return QUESTIONS.filter(q => q.materialSlug === slug)
}

/**
 * True when the bank holds at least one question for the material.
 * Checkout offers only materials with questions — a material with
 * an empty bank is never sold, and it becomes purchasable
 * automatically the moment its first questions land (no code change).
 */
export function hasQuestions(slug: string): boolean {
  return questionsForMaterial(slug).length > 0
}

export function partsForMaterial(slug: string): PartInfo[] {
  return PARTS.filter(p => p.materialSlug === slug)
}

export const PAPERS: Paper[] = [
  {
    id: 'toeic-lr-sim-01',
    materialSlug: 'toeic-lr',
    title: 'TOEIC Listening & Reading — Simulasi 01',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    difficulty: 'Intermediate',
  },
  {
    id: 'toeic-lr-sim-02',
    materialSlug: 'toeic-lr',
    title: 'TOEIC Listening & Reading — Simulasi 02',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    difficulty: 'Advanced',
  },
  {
    id: 'toeic-lr-sim-03',
    materialSlug: 'toeic-lr',
    title: 'TOEIC Listening & Reading — Simulasi 03',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    difficulty: 'Beginner',
  },
  {
    id: 'toeic-reading-drill',
    materialSlug: 'toeic-lr',
    title: 'Latihan Reading — Part 5–7',
    category: 'Drill Pack',
    skillsLabel: 'Reading',
    durationMinutes: 45,
    difficulty: 'Intermediate',
  },
  {
    id: 'toeic-listening-drill',
    materialSlug: 'toeic-lr',
    title: 'Latihan Listening — Part 1–4',
    category: 'Drill Pack',
    skillsLabel: 'Listening',
    durationMinutes: 45,
    difficulty: 'Intermediate',
  },
  {
    id: 'toeic-sw-drill-01',
    materialSlug: 'toeic-sw',
    title: 'TOEIC Speaking & Writing — Latihan Respons 01',
    category: 'Drill Pack',
    skillsLabel: 'Speaking & Writing',
    durationMinutes: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'toeic-sw-drill-02',
    materialSlug: 'toeic-sw',
    title: 'TOEIC Speaking & Writing — Latihan Respons 02',
    category: 'Drill Pack',
    skillsLabel: 'Speaking & Writing',
    durationMinutes: 30,
    difficulty: 'Beginner',
  },
  {
    id: 'toefl-ibt-sim-01',
    materialSlug: 'toefl-ibt',
    title: 'TOEFL iBT — Simulasi 01',
    category: 'Full Simulation',
    skillsLabel: 'Reading & Listening',
    durationMinutes: 59,
    difficulty: 'Intermediate',
  },
  {
    id: 'toefl-reading-drill',
    materialSlug: 'toefl-ibt',
    title: 'Latihan Reading',
    category: 'Drill Pack',
    skillsLabel: 'Reading',
    durationMinutes: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'toefl-listening-drill',
    materialSlug: 'toefl-ibt',
    title: 'Latihan Listening',
    category: 'Drill Pack',
    skillsLabel: 'Listening',
    durationMinutes: 29,
    difficulty: 'Intermediate',
  },
  {
    id: 'toefl-writing-paper',
    materialSlug: 'toefl-ibt',
    title: 'Latihan Writing',
    category: 'Drill Pack',
    skillsLabel: 'Writing',
    durationMinutes: 23,
    difficulty: 'Intermediate',
  },
  {
    id: 'toefl-speaking-paper',
    materialSlug: 'toefl-ibt',
    title: 'Latihan Speaking',
    category: 'Drill Pack',
    skillsLabel: 'Speaking',
    durationMinutes: 8,
    difficulty: 'Intermediate',
  },
  {
    id: 'ielts-academic-sim-01',
    materialSlug: 'ielts-academic',
    title: 'IELTS Academic — Simulasi 01',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 90,
    difficulty: 'Intermediate',
  },
  {
    id: 'ielts-listening-drill',
    materialSlug: 'ielts-academic',
    title: 'Latihan Listening',
    category: 'Drill Pack',
    skillsLabel: 'Listening',
    durationMinutes: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'ielts-reading-drill',
    materialSlug: 'ielts-academic',
    title: 'Latihan Reading',
    category: 'Drill Pack',
    skillsLabel: 'Reading',
    durationMinutes: 60,
    difficulty: 'Intermediate',
  },
  {
    id: 'ielts-writing-paper',
    materialSlug: 'ielts-academic',
    title: 'Latihan Writing',
    category: 'Drill Pack',
    skillsLabel: 'Writing',
    durationMinutes: 60,
    difficulty: 'Intermediate',
  },
  {
    id: 'ielts-speaking-paper',
    materialSlug: 'ielts-academic',
    title: 'Latihan Speaking',
    category: 'Drill Pack',
    skillsLabel: 'Speaking',
    durationMinutes: 14,
    difficulty: 'Intermediate',
  }
]

export function getPaper(id: string): Paper | undefined {
  return PAPERS.find(p => p.id === id)
}

/**
 * The mock always ships at least one paper / question, so these fallbacks
 * keep page code free of undefined-checks without lying about real data.
 */
export const FIRST_PAPER = PAPERS[0] as Paper
export const FIRST_QUESTION = QUESTIONS[0] as Question

export function getPaperOrFallback(id: string): Paper {
  return getPaper(id) ?? FIRST_PAPER
}

export function papersForMaterial(slug: string): Paper[] {
  return PAPERS.filter(p => p.materialSlug === slug)
}

/**
 * Questions the user will actually answer for this paper: the bank
 * holds one question set per material, so every paper in a material
 * renders that material's set. The catalog used to promise 200
 * questions per simulation while the test had 21 — cards now show
 * this count, never a hardcoded number.
 */
export function realQuestionCount(paper: Paper): number {
  return questionsForMaterial(paper.materialSlug).length
}

/* ------------------------------------------------------------------ */
/* Free general-English test: 15 listening + 10 reading + 5 writing.    */
/* Original demo content. Listening items are read-and-respond (no      */
/* audio in this build); writing items are sentence-choice questions    */
/* so they can be auto-graded.                                         */
/* ------------------------------------------------------------------ */

export interface FreeSection {
  id: 'listening' | 'reading' | 'writing'
  count: number
}

export const FREE_TEST_SECTIONS: FreeSection[] = [
  { id: 'listening', count: 15 },
  { id: 'reading', count: 10 },
  { id: 'writing', count: 5 }
]

export interface FreeQuestion {
  number: number
  section: 'listening' | 'reading' | 'writing'
  stem: string
  options: AnswerOption[]
  correctLetter: string
}

type FreeSeed = Omit<FreeQuestion, 'number'>

const FREE_SEEDS: FreeSeed[] = [
  // ---- Listening: choose the best response (15) ----
  { section: 'listening', stem: 'Choose the best response to: "Good morning! How are you today?"',
    options: [{ letter: 'A', text: 'I\'m fine, thank you. And you?' }, { letter: 'B', text: 'It\'s raining.' }, { letter: 'C', text: 'See you later.' }, { letter: 'D', text: 'Good night.' }],
    correctLetter: 'A' },
  { section: 'listening', stem: 'Choose the best response to: "Could you open the window, please?"',
    options: [{ letter: 'A', text: 'Window is glass.' }, { letter: 'B', text: 'I don\'t like windows.' }, { letter: 'C', text: 'Of course, right away.' }, { letter: 'D', text: 'No, it\'s closed forever.' }],
    correctLetter: 'C' },
  { section: 'listening', stem: 'Choose the best response to: "What time does the meeting start?"',
    options: [{ letter: 'A', text: 'Start now please.' }, { letter: 'B', text: 'Time is money.' }, { letter: 'C', text: 'At 10 o\'clock in the main room.' }, { letter: 'D', text: 'I like meetings.' }],
    correctLetter: 'C' },
  { section: 'listening', stem: 'Choose the best response to: "Would you like some coffee?"',
    options: [{ letter: 'A', text: 'No coffee shop.' }, { letter: 'B', text: 'Yes, please. Black, no sugar.' }, { letter: 'C', text: 'Coffee is brown.' }, { letter: 'D', text: 'I drink every day.' }],
    correctLetter: 'B' },
  { section: 'listening', stem: 'Choose the best response to: "Where is the nearest bus stop?"',
    options: [{ letter: 'A', text: 'Stop here please.' }, { letter: 'B', text: 'I walk always.' }, { letter: 'C', text: 'Just around the corner, next to the bank.' }, { letter: 'D', text: 'Bus is big.' }],
    correctLetter: 'C' },
  { section: 'listening', stem: 'Choose the best response to: "Did you finish the report?"',
    options: [{ letter: 'A', text: 'Finish is good.' }, { letter: 'B', text: 'I like writing.' }, { letter: 'C', text: 'Report is paper.' }, { letter: 'D', text: 'Yes, I sent it to you this morning.' }],
    correctLetter: 'D' },
  { section: 'listening', stem: 'Choose the best response to: "How was your weekend?"',
    options: [{ letter: 'A', text: 'It was great — I visited my parents.' }, { letter: 'B', text: 'Weekend is two days.' }, { letter: 'C', text: 'I don\'t know weekend.' }, { letter: 'D', text: 'Good weekend yes.' }],
    correctLetter: 'A' },
  { section: 'listening', stem: 'Choose the best response to: "Can I borrow your pen?"',
    options: [{ letter: 'A', text: 'Borrow is bad.' }, { letter: 'B', text: 'Sure, here you go.' }, { letter: 'C', text: 'Pen is blue.' }, { letter: 'D', text: 'I have many pens.' }],
    correctLetter: 'B' },
  { section: 'listening', stem: 'Choose the best response to: "What do you think of the new office?"',
    options: [{ letter: 'A', text: 'New is good.' }, { letter: 'B', text: 'I think yes.' }, { letter: 'C', text: 'Office is office.' }, { letter: 'D', text: 'It\'s bright and much bigger than before.' }],
    correctLetter: 'D' },
  { section: 'listening', stem: 'Choose the best response to: "Shall we meet at 3 pm tomorrow?"',
    options: [{ letter: 'A', text: '3 pm is time.' }, { letter: 'B', text: 'That works for me. See you then.' }, { letter: 'C', text: 'Meet is nice.' }, { letter: 'D', text: 'Tomorrow maybe.' }],
    correctLetter: 'B' },
  { section: 'listening', stem: 'Choose the best response to: "Do you know how to get to the station?"',
    options: [{ letter: 'A', text: 'Go straight, then turn left at the traffic light.' }, { letter: 'B', text: 'I go by car.' }, { letter: 'C', text: 'Know nothing.' }, { letter: 'D', text: 'Station is far.' }],
    correctLetter: 'A' },
  { section: 'listening', stem: 'Choose the best response to: "I\'m sorry I\'m late."',
    options: [{ letter: 'A', text: 'Don\'t be.' }, { letter: 'B', text: 'That\'s okay, we just started.' }, { letter: 'C', text: 'Sorry too.' }, { letter: 'D', text: 'Late is bad.' }],
    correctLetter: 'B' },
  { section: 'listening', stem: 'Choose the best response to: "What did you have for lunch?"',
    options: [{ letter: 'A', text: 'Eat at noon.' }, { letter: 'B', text: 'Have lunch yes.' }, { letter: 'C', text: 'Lunch is food.' }, { letter: 'D', text: 'I had fried rice with an egg.' }],
    correctLetter: 'D' },
  { section: 'listening', stem: 'Choose the best response to: "Could you help me with this box?"',
    options: [{ letter: 'A', text: 'Of course — let\'s lift it together.' }, { letter: 'B', text: 'I am busy always.' }, { letter: 'C', text: 'Help is good.' }, { letter: 'D', text: 'Box is heavy.' }],
    correctLetter: 'A' },
  { section: 'listening', stem: 'Choose the best response to: "When will the package arrive?"',
    options: [{ letter: 'A', text: 'Package is box.' }, { letter: 'B', text: 'It should arrive by Friday.' }, { letter: 'C', text: 'Arrive soon.' }, { letter: 'D', text: 'When is when.' }],
    correctLetter: 'B' },
  // ---- Reading: choose the correct form (10) ----
  { section: 'reading', stem: 'She _____ to work by bus every day.',
    options: [{ letter: 'A', text: 'gone' }, { letter: 'B', text: 'go' }, { letter: 'C', text: 'going' }, { letter: 'D', text: 'goes' }],
    correctLetter: 'D' },
  { section: 'reading', stem: 'The meeting _____ at 9 am yesterday.',
    options: [{ letter: 'A', text: 'started' }, { letter: 'B', text: 'starting' }, { letter: 'C', text: 'start' }, { letter: 'D', text: 'starts' }],
    correctLetter: 'A' },
  { section: 'reading', stem: 'This is the _____ book I have ever read.',
    options: [{ letter: 'A', text: 'interestinger' }, { letter: 'B', text: 'most interesting' }, { letter: 'C', text: 'more interesting' }, { letter: 'D', text: 'interesting' }],
    correctLetter: 'B' },
  { section: 'reading', stem: 'If it rains tomorrow, we _____ the trip.',
    options: [{ letter: 'A', text: 'will cancel' }, { letter: 'B', text: 'cancel' }, { letter: 'C', text: 'cancelled' }, { letter: 'D', text: 'cancelling' }],
    correctLetter: 'A' },
  { section: 'reading', stem: 'He has worked here _____ 2019.',
    options: [{ letter: 'A', text: 'at' }, { letter: 'B', text: 'from' }, { letter: 'C', text: 'for' }, { letter: 'D', text: 'since' }],
    correctLetter: 'D' },
  { section: 'reading', stem: 'Neither the manager nor the staff _____ aware of the change.',
    options: [{ letter: 'A', text: 'be' }, { letter: 'B', text: 'was being' }, { letter: 'C', text: 'were' }, { letter: 'D', text: 'is' }],
    correctLetter: 'C' },
  { section: 'reading', stem: 'The keys _____ on the table this morning.',
    options: [{ letter: 'A', text: 'were' }, { letter: 'B', text: 'are' }, { letter: 'C', text: 'is' }, { letter: 'D', text: 'was' }],
    correctLetter: 'A' },
  { section: 'reading', stem: 'She is interested _____ learning Japanese.',
    options: [{ letter: 'A', text: 'on' }, { letter: 'B', text: 'in' }, { letter: 'C', text: 'for' }, { letter: 'D', text: 'at' }],
    correctLetter: 'B' },
  { section: 'reading', stem: 'The report must _____ by Friday.',
    options: [{ letter: 'A', text: 'submits' }, { letter: 'B', text: 'submit' }, { letter: 'C', text: 'submitting' }, { letter: 'D', text: 'be submitted' }],
    correctLetter: 'D' },
  { section: 'reading', stem: '_____ the bad weather, the flight was on time.',
    options: [{ letter: 'A', text: 'Despite' }, { letter: 'B', text: 'Although' }, { letter: 'C', text: 'Unless' }, { letter: 'D', text: 'Because' }],
    correctLetter: 'A' },
  // ---- Writing: choose the best sentence (5) ----
  { section: 'writing', stem: 'Choose the best sentence for a formal email opening:',
    options: [{ letter: 'A', text: 'Dear Mr. Hartono, I hope you are well.' }, { letter: 'B', text: 'Hey you there.' }, { letter: 'C', text: 'Hi dude, what\'s up?' }, { letter: 'D', text: 'Yo, listen up.' }],
    correctLetter: 'A' },
  { section: 'writing', stem: 'Choose the best sentence to apologize for a mistake:',
    options: [{ letter: 'A', text: 'Sorry not sorry.' }, { letter: 'B', text: 'My bad, whatever.' }, { letter: 'C', text: 'I apologize for the error and will fix it today.' }, { letter: 'D', text: 'Oops, not my fault.' }],
    correctLetter: 'C' },
  { section: 'writing', stem: 'Choose the best sentence to end a job application letter:',
    options: [{ letter: 'A', text: 'Call me ASAP.' }, { letter: 'B', text: 'Thank you for your consideration. I look forward to hearing from you.' }, { letter: 'C', text: 'Bye.' }, { letter: 'D', text: 'Pick me, I\'m awesome.' }],
    correctLetter: 'B' },
  { section: 'writing', stem: 'Choose the clearest instruction:',
    options: [{ letter: 'A', text: 'Make it happen somehow.' }, { letter: 'B', text: 'Do the thing with the stuff.' }, { letter: 'C', text: 'Please attach the file and click Send.' }, { letter: 'D', text: 'You know what to do.' }],
    correctLetter: 'C' },
  { section: 'writing', stem: 'Choose the best sentence to describe a graph:',
    options: [{ letter: 'A', text: 'The line rises sharply between March and June.' }, { letter: 'B', text: 'Up it goes.' }, { letter: 'C', text: 'Line go up fast.' }, { letter: 'D', text: 'Graph is nice.' }],
    correctLetter: 'A' },

]

export const FREE_TEST_QUESTIONS: FreeQuestion[] = FREE_SEEDS.map((q, i) => ({
  number: i + 1,
  section: q.section,
  stem: q.stem,
  options: q.options,
  correctLetter: q.correctLetter
}))
