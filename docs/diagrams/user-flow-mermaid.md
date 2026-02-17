flowchart TD
  A[Open SwoleAI PWA] --> B{Authenticated?}
  B -- No --> H[Public Homepage]
  H --> I[Login]
  H --> J[Signup]
  I --> F[Forgot Password]
  I --> K{Auth success?}
  J --> K
  K -- No --> I
  K -- Yes --> L{Onboarding complete?}

  L -- No --> OB[Onboarding Wizard]
  OB --> OB1[Profile: goal / days-week / session mins / level]
  OB1 --> OB2[Constraints: equipment / injuries / avoid + must-have]
  OB2 --> OB3{Programming setup}
  OB3 -- Import routine text --> OB4[AI converts -> Review/Edit]
  OB3 -- Build with AI --> OB5[AI proposes split + days -> Review/Edit]
  OB3 -- Manual setup --> OB6[Routine Studio: create split + day templates]
  OB4 --> D
  OB5 --> D
  OB6 --> D

  L -- Yes --> D[Dashboard]

  %% Dashboard primary actions
  D --> WS[Start Workout]
  D --> CW[Continue Workout]
  D --> NSP[Coach: Next Session Plan]
  D --> WC[Coach: Weekly Check-in]
  D --> PL[Coach: Diagnose Plateau]
  D --> GR[Goals & Guardrails]
  D --> RS[Routine Studio]
  D --> HI[History]
  D --> IN[Insights]
  D --> ST[Settings]

  %% Routine Studio
  RS --> SPL[Splits: create/edit/activate schedule]
  RS --> DAY[Saved Workout Days: fixed or slot-based]
  RS --> FAV[Favorites Bank: by muscle/pattern]
  DAY --> GEN{Generate Day?}
  GEN -- From Favorites --> G1[Fill slots deterministically using favorites + recency]
  G1 --> G2[AI fills gaps from catalog within constraints]
  G2 --> G3[Preview proposal -> Accept/Edit/Reject]
  G3 -- Accept --> DAY
  G3 -- Reject --> DAY
  DAY --> VER[Program Blocks + Routine Versioning]
  VER --> CHG[Changelog + Compare versions]
  VER --> ROL[Rollback to previous version]

  %% Workout start
  WS --> PICK{Pick session type}
  PICK -- Scheduled (Active Split) --> WM[Workout Mode]
  PICK -- Choose Day Template --> WM
  PICK -- Freestyle --> WM

  %% Workout mode core UX
  WM --> LOG[Log sets: big controls, prefill, offline-first]
  LOG --> UX1[Edit set / Undo / Delete set]
  LOG --> UX2[Reorder exercises / Add exercise mid-session]
  LOG --> UX3[Flag set: warmup/backoff/drop/failure]
  LOG --> RT[Rest timer: auto-start + quick adjust]
  LOG --> SWAP{Need swap?}
  SWAP -- Yes --> SUB1[Deterministic substitutions list]
  SUB1 --> SUB2[Optional AI suggestion within allowed candidates]
  SUB2 --> WM
  SWAP -- No --> WM

  WM --> END[End Workout Summary]
  END --> PR[PR detection + highlights]
  END --> SAVE{Save as template day?}
  SAVE -- Yes --> DAY
  SAVE -- No --> NSP

  %% Next session plan
  NSP --> NSP1[AI returns structured plan + targets + rationale]
  NSP1 --> NSP2{Accept/Edit/Reject}
  NSP2 -- Accept --> D
  NSP2 -- Edit --> WM
  NSP2 -- Reject --> D

  %% Weekly check-in
  WC --> WC1[Review 7-14 days: adherence, fatigue, volume balance]
  WC1 --> WC2[Patch proposals: sets/rep ranges/swaps/deload/block changes]
  WC2 --> WC3{Apply patches?}
  WC3 -- Accept --> VER
  WC3 -- Edit --> VER
  WC3 -- Reject --> D

  %% Plateau
  PL --> PL1[Deterministic plateau detection]
  PL1 --> PL2[Interventions: deload, rep range, variation, backoff, rest]
  PL2 --> PL3{Apply patch?}
  PL3 -- Accept --> VER
  PL3 -- Reject --> D

  %% Goals + guardrails
  GR --> GR1[Set goals + timeline]
  GR1 --> GR2[Guardrails: load rules, recovery rules]
  GR2 --> D

  %% Settings / data
  ST --> DATA[Export JSON/CSV + Import JSON]
  ST --> PRIV[Download my data + Delete account/data]
  ST --> SYNC[Sync expectations + status]
  ST --> OUT[Logout]
