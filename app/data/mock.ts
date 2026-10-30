/**
 * MOCK DATA — all questions, passages, and copy below are ORIGINAL sample
 * content written for the GTS demo. They are simplified (18 items) and do
 * not reproduce any third-party test material. Audio is a placeholder.
 */

export type Skill = 'listening' | 'reading'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type PaperStatus = 'not-started' | 'in-progress' | 'completed'

export interface AnswerOption {
  letter: string
  text: string
}

export interface Question {
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
  title: string
  category: 'Full Simulation' | 'Drill Pack'
  skillsLabel: string
  durationMinutes: number
  totalQuestions: number
  difficulty: Difficulty
  enrolled: number
  status: PaperStatus
  creditsRequired: number
}

export interface PartInfo {
  part: number
  skill: Skill
  label: string
  description: string
}

export const PARTS: PartInfo[] = [
  { part: 1, skill: 'listening', label: 'Photographs', description: 'Look at each photograph and choose the statement that best describes what you see.' },
  { part: 2, skill: 'listening', label: 'Question–Response', description: 'Listen to a question, then choose the most appropriate response.' },
  { part: 3, skill: 'listening', label: 'Conversations', description: 'Listen to a short conversation, then answer the question about it.' },
  { part: 4, skill: 'listening', label: 'Short Talks', description: 'Listen to a short talk or announcement, then answer the question about it.' },
  { part: 5, skill: 'reading', label: 'Incomplete Sentences', description: 'Choose the word or phrase that best completes each sentence.' },
  { part: 6, skill: 'reading', label: 'Text Completion', description: 'Read the passage and choose the best word or phrase for each blank.' },
  { part: 7, skill: 'reading', label: 'Reading Comprehension', description: 'Read the passage and choose the best answer to each question.' }
]

const AUDIO_NOTE = 'Audio placeholder — no recording in this demo build.'

export const QUESTIONS: Question[] = [
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

export const PAPERS: Paper[] = [
  {
    id: 'toeic-lr-sim-01',
    title: 'TOEIC Listening & Reading — Full Simulation 01',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    totalQuestions: 200,
    difficulty: 'Intermediate',
    enrolled: 1284,
    status: 'in-progress',
    creditsRequired: 2
  },
  {
    id: 'toeic-lr-sim-02',
    title: 'TOEIC Listening & Reading — Full Simulation 02',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    totalQuestions: 200,
    difficulty: 'Advanced',
    enrolled: 986,
    status: 'not-started',
    creditsRequired: 2
  },
  {
    id: 'toeic-lr-sim-03',
    title: 'TOEIC Listening & Reading — Full Simulation 03',
    category: 'Full Simulation',
    skillsLabel: 'Listening & Reading',
    durationMinutes: 120,
    totalQuestions: 200,
    difficulty: 'Beginner',
    enrolled: 2103,
    status: 'completed',
    creditsRequired: 2
  },
  {
    id: 'toeic-reading-drill',
    title: 'Reading Drill Pack — Parts 5 to 7',
    category: 'Drill Pack',
    skillsLabel: 'Reading',
    durationMinutes: 45,
    totalQuestions: 60,
    difficulty: 'Intermediate',
    enrolled: 764,
    status: 'not-started',
    creditsRequired: 1
  },
  {
    id: 'toeic-listening-drill',
    title: 'Listening Drill Pack — Parts 1 to 4',
    category: 'Drill Pack',
    skillsLabel: 'Listening',
    durationMinutes: 45,
    totalQuestions: 60,
    difficulty: 'Intermediate',
    enrolled: 692,
    status: 'not-started',
    creditsRequired: 1
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

/** Demo-only: the take interface renders this question set for every paper. */
export const DEMO_NOTE = 'Demo build: every paper renders the same 18-question mock set.'
