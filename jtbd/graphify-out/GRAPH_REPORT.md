# Graph Report - .  (2026-05-19)

## Corpus Check
- Corpus is ~11,180 words - fits in a single context window. You may not need a graph.

## Summary
- 140 nodes · 242 edges · 14 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.82)
- Token cost: 48,970 input · 12,242 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Synthetic Research & Analyst Pipeline|Synthetic Research & Analyst Pipeline]]
- [[_COMMUNITY_Landing Page Section Assembly|Landing Page Section Assembly]]
- [[_COMMUNITY_Competitor Analysis Pipeline|Competitor Analysis Pipeline]]
- [[_COMMUNITY_Ad Platform Scripts|Ad Platform Scripts]]
- [[_COMMUNITY_Copywriter & Job Layers|Copywriter & Job Layers]]
- [[_COMMUNITY_Habit Force & Do-Nothing|Habit Force & Do-Nothing]]
- [[_COMMUNITY_Pull Force & Review Signals|Pull Force & Review Signals]]
- [[_COMMUNITY_Interview Language Patterns|Interview Language Patterns]]
- [[_COMMUNITY_Ad Angles & Problem Frame|Ad Angles & Problem Frame]]
- [[_COMMUNITY_Hook Formulas|Hook Formulas]]
- [[_COMMUNITY_Repo Conventions|Repo Conventions]]
- [[_COMMUNITY_Direct & Adjacent Competitors|Direct & Adjacent Competitors]]
- [[_COMMUNITY_Anxiety Force & FAQSocial Proof|Anxiety Force & FAQ/Social Proof]]
- [[_COMMUNITY_Skill Entry Point|Skill Entry Point]]

## God Nodes (most connected - your core abstractions)
1. `JTBD Megaskill` - 19 edges
2. `Anxiety force` - 18 edges
3. `#forces anchor` - 18 edges
4. `JTBD Megaskill (SKILL.md)` - 16 edges
5. `Push force` - 16 edges
6. `Habit force` - 16 edges
7. `Pull force` - 14 edges
8. `Four Forces of Progress` - 11 edges
9. `JTBD Scriptwriter Agent` - 10 edges
10. `Interview Transcript Analysis Guide` - 10 edges

## Surprising Connections (you probably didn't know these)
- `RESEARCHER agent` --semantically_similar_to--> `jtbd-researcher (RESEARCHER) agent prompt`  [INFERRED] [semantically similar]
  README.md → agents/jtbd-researcher/AGENT.md
- `ANALYST agent` --semantically_similar_to--> `jtbd-analyst (ANALYST) agent prompt`  [INFERRED] [semantically similar]
  README.md → agents/jtbd-analyst/AGENT.md
- `SCOUT agent` --semantically_similar_to--> `jtbd-scout (SCOUT) agent prompt`  [INFERRED] [semantically similar]
  README.md → agents/jtbd-scout/AGENT.md
- `JTBD lens (Forces + Job Layers)` --semantically_similar_to--> `Three job types (Functional/Emotional/Social)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `JTBD lens (Forces + Job Layers)` --semantically_similar_to--> `Four Forces of Progress`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md

## Hyperedges (group relationships)
- **Four Forces compose progress equation** — readme_push_force, readme_pull_force, readme_habit_force, readme_anxiety_force, readme_progress_equation [EXTRACTED 1.00]
- **Full Landing Page (7 sections)** — hero_section, problem_section, value_prop_section, social_proof_section, how_it_works_section, faq_section, final_cta_section [EXTRACTED 1.00]
- **Platform-Native Ad Pattern (4 platforms)** — tiktok_platform, instagram_reel_platform, youtube_shorts_platform, threads_platform [EXTRACTED 1.00]
- **Four competitor tiers researched by SCOUT** — mode_2b_competitors_tier_direct, mode_2b_competitors_tier_adjacent, mode_2b_competitors_tier_workarounds, mode_2b_competitors_tier_do_nothing, agent_jtbd_scout [EXTRACTED 1.00]
- **Four Forces of Progress** — push_force, pull_force, habit_force, anxiety_force [EXTRACTED 1.00]
- **Three Job Layers** — functional_job_layer, emotional_job_layer, social_job_layer [EXTRACTED 1.00]
- **Landing Page Sections** — hero_section, problem_section, value_prop_section, how_it_works_section, social_proof_section, faq_section, final_cta_section [EXTRACTED 1.00]
- **Competitor Tiers** — direct_competitor_tier, adjacent_competitor_tier, workarounds_competitor_tier, do_nothing_competitor_tier [EXTRACTED 1.00]

## Communities (14 total, 1 thin omitted)

### Community 0 - "Synthetic Research & Analyst Pipeline"
Cohesion: 0.09
Nodes (29): jtbd-analyst (ANALYST) agent prompt, jtbd-scout (SCOUT) agent prompt, JTBD lens (Forces + Job Layers), Focus job statement, HYPOTHESIS-ONLY label, Interview guide, MODE 0 — Synthetic JTBD Research, Opportunity score (+21 more)

### Community 1 - "Landing Page Section Assembly"
Cohesion: 0.12
Nodes (18): Landing page consistency check, FAQ section (COPY-6), Final CTA section (COPY-7), Hero section (COPY-1), How It Works section (COPY-5), MODE 3 — Landing Page Copy, Problem section (COPY-2), Social Proof section (COPY-4) (+10 more)

### Community 2 - "Competitor Analysis Pipeline"
Cohesion: 0.13
Nodes (15): jtbd-researcher (RESEARCHER) agent prompt, Four-tier alternatives map, Differentiation matrix, MODE 2B — Competitor Analysis, Positioning statement, Tier 2 Adjacent (SCOUT-2), Tier 1 Direct (SCOUT-1), Tier 4 Do-nothing (SCOUT-4) (+7 more)

### Community 3 - "Ad Platform Scripts"
Cohesion: 0.21
Nodes (12): Instagram Reel Platform, Instagram Reel Script Guide, MODE 4 (Ad Scripts), 2-second Hook Test, JTBD Scriptwriter Agent, Sound-off Test, Threads Platform, Threads Post Guide (+4 more)

### Community 4 - "Copywriter & Job Layers"
Cohesion: 0.23
Nodes (12): JTBD Copywriter Agent, Emotional job layer, Final CTA section, Functional job layer, Hero Section Guide, Hero section, MODE 3 (Landing Page), Progress equation (Push force + Pull force > Habit force + Anxiety force) (+4 more)

### Community 5 - "Habit Force & Do-Nothing"
Cohesion: 0.33
Nodes (10): Do-Nothing competitor tier, Do-Nothing Analysis Guide, #forces anchor, Habit force, How It Works Section Guide, How It Works section, Category Pain Points Research Guide, RESEARCHER agent (+2 more)

### Community 6 - "Pull Force & Review Signals"
Cohesion: 0.32
Nodes (8): Final CTA Section Guide, Pull force, 1-2 star review signal, 3 star review signal, 4-5 star review signal, App Store / Review Site Analysis Guide, Value Proposition Section Guide, Value Proposition section

### Community 7 - "Interview Language Patterns"
Cohesion: 0.29
Nodes (7): ANALYST agent, Interview Transcript Analysis Guide, Anxiety-force interview language pattern, Habit-force interview language pattern, Pull-force interview language pattern, Push-force interview language pattern, Support Ticket / Chat Log Analysis Guide

### Community 8 - "Ad Angles & Problem Frame"
Cohesion: 0.38
Nodes (7): Ad Angle Guide, Outcome angle, Pain angle, Problem Section Guide, Problem section, Proof angle, Push force

### Community 9 - "Hook Formulas"
Cohesion: 0.33
Nodes (6): Hook Formulas Reference, Identity hook, Outcome hook, Pain hook, Pattern interrupt hook, Proof hook

### Community 10 - "Repo Conventions"
Cohesion: 0.4
Nodes (5): Agent contract: load one reference, write one artifact, Chain checkpoint (mandatory after every mode), Export protocol (jtbd-[slug]-mode[N]-[YYYY-MM-DD].md), JTBD repo CLAUDE.md, Rigid output header (━━━ [SECTION] ━━━) convention

### Community 11 - "Direct & Adjacent Competitors"
Cohesion: 0.4
Nodes (5): Adjacent competitor tier, Adjacent Tools Research Guide, Direct competitor tier, Direct Competitor Research Guide, SCOUT agent

### Community 12 - "Anxiety Force & FAQ/Social Proof"
Cohesion: 0.6
Nodes (5): Anxiety force, FAQ Section Guide, FAQ section, Social Proof Section Guide, Social Proof section

## Knowledge Gaps
- **48 isolated node(s):** `COPYWRITER agent`, `SCRIPTWRITER agent`, `Habit force`, `Progress equation (Push+Pull > Habit+Anxiety)`, `Clayton Christensen — Competing Against Luck (2016)` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JTBD Megaskill` connect `Synthetic Research & Analyst Pipeline` to `Landing Page Section Assembly`, `Competitor Analysis Pipeline`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `JTBD Megaskill (SKILL.md)` connect `Copywriter & Job Layers` to `Ad Platform Scripts`, `Habit Force & Do-Nothing`, `Pull Force & Review Signals`, `Interview Language Patterns`, `Ad Angles & Problem Frame`, `Direct & Adjacent Competitors`, `Anxiety Force & FAQ/Social Proof`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `JTBD Scriptwriter Agent` connect `Ad Platform Scripts` to `Ad Angles & Problem Frame`, `Hook Formulas`, `Copywriter & Job Layers`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Anxiety force` (e.g. with `Proof hook` and `Proof angle`) actually correct?**
  _`Anxiety force` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `COPYWRITER agent`, `SCRIPTWRITER agent`, `Habit force` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Synthetic Research & Analyst Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Landing Page Section Assembly` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._