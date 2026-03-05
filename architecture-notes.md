# Orizen Hiring Workflow Notes

This file explains the stages used in the diagram from `architecture.md`.

## 1) Job Posted

Recruiter creates and publishes a role with requirements like skills, experience, location, and job type.

## 2) Candidates Apply

Candidates submit applications through the job page. Typical input includes resume, contact details, links, and short answers.

## 3) Data Collection (CV + Profile + Answers)

The system standardizes incoming data so all candidates can be compared consistently:

- Resume text and structure
- Profile fields (experience, skills, location)
- Screening answers

## 4) Scraping & Enrichment

Additional public signals are gathered (if enabled) to enrich candidate context:

- Portfolio/GitHub/LinkedIn or shared links
- Public project/work evidence
- Missing metadata completion (skills, timeline consistency)

## 5) Playwright-Based Validation

Playwright is used where browser automation is needed:

- Opens dynamic pages that require JavaScript rendering
- Extracts structured fields from candidate-provided links
- Verifies links are reachable and content is valid
- Captures deterministic data before scoring

## 6) AI Evaluation

AI analyzes candidate-job fit based on defined criteria:

- Skill match relevance
- Experience depth and role alignment
- Evidence quality from resume + enriched sources
- Red flags/inconsistencies

## 7) Candidate Ranking

Candidates are sorted by evaluation score and confidence level, producing a prioritized shortlist for hiring teams.

## 8) Interview Selection

Recruiters select top-ranked candidates for interviews, usually with scorecards and reasons to support decision clarity.
