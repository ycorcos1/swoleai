flowchart LR
  subgraph Public
    H[Homepage / Landing]
    I[Login]
    J[Signup]
    F[Forgot Password]
    H --> I
    H --> J
    I --> F
  end

  subgraph Onboarding
    OB[Onboarding Wizard]
    OB1[Profile]
    OB2[Constraints]
    OB3[Programming Setup]
    OB --> OB1 --> OB2 --> OB3
  end

  subgraph App[Authenticated App (Mobile-first)]
    D[Dashboard]

    subgraph Workout[Workout]
      WS[Start / Select Session]
      WM[Workout Mode]
      SUM[Summary + PRs]
      WS --> WM --> SUM
    end

    subgraph Routine[Routine Studio]
      SPL[Splits]
      DAY[Saved Workout Days]
      FAV[Favorites Bank]
      VER[Program Blocks + Versions]
      SPL --- DAY --- FAV --- VER
      GEN[Generate Day from Favorites]
      DAY --> GEN
      GEN --> DAY
      VER --> CMP[Compare/Changelog]
      VER --> ROL[Rollback]
    end

    subgraph Coach[Coach Center]
      NSP[Next Session Plan]
      WC[Weekly Check-in]
      PL[Plateau Diagnose]
      PRO[Proposal Inbox (Accepted/Rejected)]
      NSP --> PRO
      WC --> PRO
      PL --> PRO
    end

    subgraph Insights[Insights]
      IN[Overview]
      VOL[Volume Balance]
      PRF[PR Feed]
      PLT[Plateau Alerts]
    end

    subgraph History[History]
      HI[Sessions]
      EX[Exercise Detail]
    end

    subgraph Goals[Goals & Guardrails]
      GO[Goals]
      GR[Guardrails]
    end

    subgraph Settings[Settings]
      ACC[Profile + Preferences]
      DATA[Export/Import + Download Data]
      PRIV[Delete account/data]
      SYNC[Sync status]
      OUT[Logout]
    end

    D --> WS
    D --> Routine
    D --> Coach
    D --> Insights
    D --> History
    D --> Goals
    D --> Settings
    SUM --> NSP
  end

  J --> OB
  I --> OB
  OB --> D
