# Contributing to Tikied

Thank you for your interest in contributing to **Tikied**! We welcome community contributions, bug fixes, feature proposals, and reverse-engineering findings.

---

## 1. Development & Build Setup

Before submitting code changes, please ensure your local environment builds cleanly:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Build:**
   ```bash
   npm run build:dev
   ```

3. **Type Checking:**
   ```bash
   npm run typecheck
   ```

4. **Production Build:**
   ```bash
   npm run build
   ```

---

## 2. Licensing Terms & Dual-Licensing Agreement

By contributing to this repository, you agree that your contributions will be licensed under the project's primary license (**GNU Affero General Public License v3 (AGPLv3)**).

### Library Extraction & Permissive Dual-Licensing Clause
Core utility modules, format decoders, and archive parsing logic (such as `pjm_archive.ts`, texture decoders, and related game data structures) may eventually be extracted from this repository into a standalone, reusable software library released under a permissive open-source license (**MIT License** or **Apache License 2.0**).

To facilitate community reuse of these low-level parsing utilities across other non-GUI scripts, CLI tools, and modding utilities:

> **By submitting a pull request or contribution to this repository, you grant the project maintainer non-exclusive permission to dual-license, re-license, or publish your contributions under the MIT License and/or Apache License 2.0 if and when those underlying parser/utility modules are extracted into separate libraries.**

This clause applies exclusively to core file format / data structures and does not affect the AGPLv3 protection of the Tikied web application itself.

---

## 3. Code Guidelines

- Keep TypeScript code clean, strictly typed, and free of unnecessary external dependencies.
- Ensure all visual changes adhere to the warm, earthy theme palette defined in `theme.ts` and `styles.css`.
- Respect game copyright disclaimers: do not include copyrighted game assets (textures, audio, or game binaries) directly in pull requests or repository commits.
