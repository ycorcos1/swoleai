flowchart LR
  subgraph Client[Client: SwoleAI PWA (Next.js)]
    UI[UI Screens\nDashboard / Workout Mode / Routine Studio / Coach]
    IDB[Local Store: IndexedDB\n(workout session state + event log)]
    SW[Service Worker Cache\n(app shell + assets)]
    UI <--> IDB
    UI <--> SW
  end

  subgraph Backend[Vercel Backend (Next.js API Routes)]
    AUTH[Auth\n(session + middleware)]
    API[App API\nCRUD: splits/days/favorites/workouts/history]
    SYNC[Sync Service\n(conflict-safe upserts)]
    COACH[Coach Actions API\nnext-session / weekly / plateau / goals]
    VALID[Schema Validation\n(JSON outputs + patch validation)]
    RULES[Deterministic Rules Engine\nprogression, volume calc, plateau detect,\nsubstitution candidates, deload logic]
  end

  subgraph Data[Data Layer]
    DB[(Postgres\nUsers, Splits, Days, Favorites,\nWorkouts, Sets, Versions, Proposals)]
    OBJ[(Object Storage optional\nexports, backups)]
  end

  subgraph AI[LLM Provider]
    LLM[Model API\nstructured JSON responses]
  end

  UI <--> AUTH
  UI <--> API
  UI <--> COACH

  AUTH <--> API
  API <--> DB
  API <--> SYNC
  SYNC <--> DB

  COACH <--> RULES
  COACH <--> DB
  COACH <--> LLM
  COACH <--> VALID
  RULES <--> DB

  API -. optional .-> OBJ
