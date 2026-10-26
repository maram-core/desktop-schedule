# Ethereal Schedule & Task Manager

A calm, responsive daily planner built with React and TypeScript. Frosted-glass panels, pastel glows, and a week strip keep your plans in one personal workspace.

## Features

- Navigate any day using the week strip, day arrows, Today button, or keyboard-accessible calendar modal.
- Add daily schedule slots with start/end times and Focus, Personal, Wellbeing, or Meeting categories. Mark them complete or delete them. Slots sort by start time; overlapping plans are allowed. Slots must end after they start on the same day.
- Create nested checklists (up to four subtask levels). Completing a parent completes its descendants; child completion updates the parent. Delete a task to remove its entire branch.
- See daily completion across checklist items (including parents and subtasks) and schedule slots.
- Write a separate reflection for each day.
- Automatically save your plans in this browser's local storage. No account or backend is required. Data does not sync between devices or browsers; clearing site storage removes it. A warning appears if the browser cannot save.

## Development

Node.js 24.19.0 and npm 11.9.0 were used for validation.

```sh
npm ci
npm start
```

The development server uses port 3000. To run without opening a browser:

```sh
CI=true BROWSER=none HOST=127.0.0.1 PORT=3000 npm start
```

## Validation and production

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

The tests cover nested completion, local persistence, daily isolation, calendar navigation, time validation, deletion, and invalid-storage recovery. Production output is written to `build/` and can be hosted by a static web server. Google Fonts are optional; system sans-serif fonts provide a fallback.
