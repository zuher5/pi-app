# Product

> **Superseded 2026-10-23.** Pi-App is now pi-web's own UI in the phone browser (QR pairing, small touch fixes, Catppuccin Mocha + Lime themes). See README. This document describes the archived Android app (branch `archive/svelte`).

<!-- impeccable:product-schema 1 -->

## Platform

android

## Stack
Delegated by the user ("the lightest and most stable"): Capacitor 7 + Svelte 5 + Vite + TypeScript. The UI renders in Android's system WebView, but its design language is native Android (Material 3 structure, navigation, Back gesture, insets). Server: the pi-web Next.js server, unchanged apart from the pairing-token bridge.

## Users
One person, the owner (personal use, not distributed). A developer who runs the pi coding agent on their PC and wants the phone to be a full front end to it: continue sessions started at the desk, and do real coding work from the phone, like using a remote Linux environment, while the PC (or Termux on the same phone) stays the backend that holds the files, git, shell, and models.

## Product Purpose
Pi-App is an Android front end for pi. Everything pi-web can do through its server, Pi-App can do from a phone: chat with the agent and watch it stream, steer or stop it, branch and fork sessions, browse and edit files, read git diffs, use worktrees, run a terminal, pick models and thinking level, manage API keys, MCP servers, skills, plugins, subagents and tools. Success: the owner can leave the desk mid-task and keep working from the phone without losing anything, and can start and finish real work there.

## Positioning
Not a chat app with an agent behind it: it is the same live pi session that runs on the PC, reached from the phone, with the full workstation (files, diff, terminal) one tap away. The bridge is pi-web's own server, so behaviour matches the desktop exactly.

## Operating Context
- Backend is either the PC (phone on the same Wi-Fi or over Tailscale) or Termux on the phone itself (127.0.0.1).
- Pairing by scanning a QR the `pi-app` command prints, or typing address + token.
- Sessions often run for minutes; the owner switches away and comes back, so reconnecting and "is it still running / waiting for me" must be obvious.
- Typing on a phone keyboard: code, paths, slash-commands, terminal keys (Esc, Tab, Ctrl, arrows).
- Mixed lighting, one-handed use common.

## Capabilities and Constraints
- Feature parity with pi-web's backend API (agent, sessions, branching/tree, files incl. upload, git status/diff, worktrees, terminal, models + models-config, auth/API keys, MCP incl. sign-in, skills, plugins, subagents, tools settings, project trust, provider usage, push).
- UI language: English and Bahasa Indonesia, user-selectable.
- Client reuses pi-web's client-side protocol modules unchanged; all `/api` calls carry the pairing token.
- Plain HTTP on LAN; Tailscale recommended outside home.
- Android only. No iOS.

## Brand Commitments
Name: "Pi-App". No logo or brand assets yet.

## Evidence on Hand
None beyond the pi-web codebase in `server/`. No screenshots, testimonials, or metrics exist; do not invent any.

## Product Principles
1. The PC is the source of truth; the phone never loses or forks state silently.
2. Running state is always visible: idle, streaming, waiting for input, disconnected.
3. Parity first: every server capability is reachable, even if tucked one level deeper on a phone.
4. Thumb-first: primary actions within reach, keyboard-aware layouts, 48dp targets.
5. Fast on mid-range Android: light bundle, no jank while streaming.

## Accessibility & Inclusion
Follow Android system font scale and dark/light setting; 48dp touch targets; WCAG AA contrast.
